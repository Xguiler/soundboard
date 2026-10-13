import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getLivePixToken(clientId: string, clientSecret: string) {
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "wallet:read webhooks",
  });

  const response = await fetch("https://oauth.livepix.gg/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!response.ok) {
    throw new Error(`LivePix OAuth falhou: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.access_token) throw new Error("LivePix não retornou access_token");

  cachedToken = data.access_token;
  cachedTokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
  return cachedToken;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Método não permitido" }, 405);
  }

  const webhookSecret = Deno.env.get("LIVEPIX_WEBHOOK_SECRET");
  const clientId = Deno.env.get("LIVEPIX_CLIENT_ID");
  const clientSecret = Deno.env.get("LIVEPIX_CLIENT_SECRET");
  const expectedUserId = Deno.env.get("LIVEPIX_USER_ID");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const roomId = Deno.env.get("SOUNDBOARD_ROOM_ID") || "xguiler-soundboard-caos-control";

  if (!webhookSecret || !clientId || !clientSecret || !expectedUserId || !supabaseUrl || !serviceRoleKey) {
    console.error("[LIVEPIX] Secrets obrigatórios ausentes");
    return jsonResponse({ error: "Webhook não configurado" }, 500);
  }

  const url = new URL(req.url);
  if (url.searchParams.get("key") !== webhookSecret) {
    return jsonResponse({ error: "Não autorizado" }, 401);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "JSON inválido" }, 400);
  }

  // A API LivePix informa pagamentos recebidos como event=new/type=payment.
  // Outros eventos não alteram a progressão.
  if (payload?.event !== "new" || payload?.resource?.type !== "payment") {
    return jsonResponse({ ok: true, ignored: true });
  }

  if (payload.clientId !== clientId || payload.userId !== expectedUserId) {
    return jsonResponse({ error: "Origem LivePix não corresponde à configuração" }, 401);
  }

  const paymentId = String(payload?.resource?.id || "").trim();
  if (!paymentId) return jsonResponse({ error: "ID do pagamento ausente" }, 400);

  try {
    const accessToken = await getLivePixToken(clientId, clientSecret);
    const verifyResponse = await fetch(
      "https://api.livepix.gg/v2/payments/" + encodeURIComponent(paymentId),
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } },
    );

    if (!verifyResponse.ok) {
      // Retorna erro para que o LivePix possa tentar entregar o webhook novamente.
      throw new Error(`Consulta do pagamento falhou: HTTP ${verifyResponse.status}`);
    }

    const verifyJson = await verifyResponse.json();
    const payment = verifyJson?.data ?? verifyJson;

    if (String(payment?.id || "") !== paymentId) {
      throw new Error("ID retornado pela API LivePix não corresponde ao webhook");
    }
    if (String(payment?.currency || "").toUpperCase() !== "BRL") {
      return jsonResponse({ ok: true, ignored: true, reason: "Moeda diferente de BRL" });
    }

    const amountCents = Number(payment?.amount);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      throw new Error("Valor do pagamento inválido na API LivePix");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: state, error } = await supabase.rpc("process_livepix_donation", {
      p_payment_id: paymentId,
      p_reference: payment?.reference ? String(payment.reference) : null,
      p_amount_cents: amountCents,
      p_currency: "BRL",
      p_received_at: payment?.createdAt || new Date().toISOString(),
    });

    if (error) throw new Error("Supabase não processou a doação: " + error.message);

    const channel = supabase.channel(roomId);
    const sendResult = await channel.send({
      type: "broadcast",
      event: "state",
      payload: state,
    });
    await channel.unsubscribe();

    if (sendResult !== "ok") {
      // A gravação já foi feita de forma idempotente; o próximo webhook/reenvio
      // não duplicará a doação. O estado também pode ser consultado pelo OBS.
      console.error("[LIVEPIX] Estado salvo, mas broadcast falhou:", sendResult);
    }

    return jsonResponse({ ok: true, processed: true, state });
  } catch (error) {
    console.error("[LIVEPIX] Erro no webhook:", error);
    return jsonResponse({ error: "Falha ao processar webhook" }, 500);
  }
});
