(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const names = {
    SUAVE: { label: "🟢 SUAVE" },
    VIP: { label: "🟣 VIP" },
    ELITE: { label: "🔵 ELITE" },
    FURIA: { label: "🟠 FÚRIA" },
    APOCALIPSE: { label: "🔴 APOCALIPSE" }
  };
  const milestones = [1, 5, 20, 50];
  let client;
  let channel;
  let state = null;
  let realtime = false;
  const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const duration = (seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };
  function draw() {
    if (!state) return;
    const levelKey = String(state.nivel || "SUAVE").toUpperCase();
    const level = names[levelKey] || names.SUAVE;
    const total = Math.max(0, Number(state.total_rodada || 0));
    const maxUnlocked = names[String(state.maior_nivel_desbloqueado || "SUAVE").toUpperCase()] || names.SUAVE;
    const updated = state.atualizado_em ? Date.parse(state.atualizado_em) : Date.now();
    const elapsed = Math.max(0, (Date.now() - (Number.isFinite(updated) ? updated : Date.now())) / 1000);
    const levelTime = levelKey === "SUAVE" ? 0 : Math.max(0, Number(state.tempo_restante || 0) - elapsed);
    const end = state.fim_janela ? Date.parse(state.fim_janela) : NaN;
    const roundTime = Number.isFinite(end) ? Math.max(0, (end - Date.now()) / 1000) : 0;
    $("lvlupMeter").dataset.level = levelKey;
    $("lvlupTotal").textContent = money(total) + " / R$ 50,00";
    $("lvlupTimer").textContent = levelKey === "SUAVE" ? "⏱️ ∞" : "⏱️ " + duration(levelTime);
    $("lvlupRoundTimer").textContent = state.fim_janela
      ? "Rodada coletiva: " + duration(roundTime) + " restantes · Maior nível: " + maxUnlocked.label
      : "Rodada coletiva: aguardando primeira doação";
    $("lvlupProgressFill").style.width = Math.max(0, Math.min(100, (total / 50) * 100)) + "%";
    const track = document.querySelector(".lvlup-progress-track");
    if (track) track.setAttribute("aria-valuenow", String(Math.min(50, total)));
    document.querySelectorAll(".lvlup-markers .marker").forEach((marker, index) => {
      marker.classList.toggle("reached", total >= milestones[index]);
    });
  }
  async function load() {
    const { data, error } = await client.from("lvlup_estado")
      .select("id,nivel,tempo_restante,total_rodada,inicio_rodada,fim_janela,atualizado_em,maior_nivel_desbloqueado")
      .eq("id", 1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("Estado do Lvl Up ainda não foi inicializado.");
    state = data;
    draw();
  }
  async function start() {
    try {
      if (!window.supabase || !window.SB_CONFIG) throw new Error("Configuração não carregou");
      client = window.supabase.createClient(window.SB_CONFIG.SUPABASE_URL, window.SB_CONFIG.SUPABASE_ANON_KEY);
      await load();
      channel = client.channel("soundboard-lvlup-meter")
        .on("postgres_changes", { event: "*", schema: "public", table: "lvlup_estado", filter: "id=eq.1" }, (payload) => {
          if (payload.new && Number(payload.new.id) === 1) {
            state = payload.new;
            draw();
          }
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            realtime = true;
            draw();
            load().catch((error) => console.error("[LVLUP METER]", error));
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            realtime = false;
            draw();
          }
        });
      window.setInterval(() => load().catch((error) => {
        console.error("[LVLUP METER]", error);
      }), 15000);
      window.setInterval(draw, 250);
      window.addEventListener("beforeunload", () => {
        if (channel && client) client.removeChannel(channel);
      });
    } catch (error) {
      console.error("[LVLUP METER]", error);
    }
  }
  start();
})();