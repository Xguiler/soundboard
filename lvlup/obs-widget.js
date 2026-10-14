(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const milestones = [1, 5, 20, 50];
  const levels = {
    SUAVE: { label: "SUAVE", emoji: "🟢" },
    VIP: { label: "VIP", emoji: "🟣" },
    ELITE: { label: "ELITE", emoji: "🔵" },
    FURIA: { label: "FÚRIA", emoji: "🟠" },
    APOCALIPSE: { label: "APOCALIPSE", emoji: "🔴" }
  };

  let client = null;
  let channel = null;
  let state = null;

  const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

  const duration = (seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" +
      String(s % 60).padStart(2, "0");
  };

  function draw() {
    if (!state) return;

    const total = Math.max(0, Number(state.total_rodada || 0));
    const levelKey = String(state.nivel || "SUAVE").toUpperCase();
    const level = levels[levelKey] || levels.SUAVE;
    const updatedAt = state.atualizado_em ? Date.parse(state.atualizado_em) : Date.now();
    const elapsed = Math.max(0, (Date.now() - (Number.isFinite(updatedAt) ? updatedAt : Date.now())) / 1000);
    const levelSeconds = levelKey === "SUAVE"
      ? 0
      : Math.max(0, Number(state.tempo_restante || 0) - elapsed);
    const endAt = state.fim_janela ? Date.parse(state.fim_janela) : NaN;
    const roundSeconds = Number.isFinite(endAt) ? Math.max(0, (endAt - Date.now()) / 1000) : 0;

    $("lvlupObsLevel").textContent = level.emoji + " " + level.label;
    $("lvlupObsTotal").textContent = money(total) + " / R$ 50,00";
    $("lvlupObsTimer").textContent = levelKey === "SUAVE" ? "⏱️ ∞" : "⏱️ " + duration(levelSeconds);
    $("lvlupObsRound").textContent = state.fim_janela
      ? "Rodada coletiva: " + duration(roundSeconds) + " restantes"
      : "Rodada coletiva: aguardando primeira doação";

    $("lvlupObsFill").style.width = Math.min(100, Math.max(0, total / 50 * 100)) + "%";
    const track = $("lvlupObsTrack");
    if (track) track.setAttribute("aria-valuenow", String(Math.min(50, total)));

    document.querySelectorAll("#lvlupObsBar .lvlup-obs-marker").forEach((marker, index) => {
      marker.classList.toggle("reached", total >= milestones[index]);
    });
  }

  async function loadState() {
    const { data, error } = await client
      .from("lvlup_estado")
      .select("id,nivel,tempo_restante,total_rodada,inicio_rodada,fim_janela,atualizado_em,maior_nivel_desbloqueado")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("A linha id=1 não foi encontrada em lvlup_estado.");
    state = data;
    draw();
  }

  async function start() {
    try {
      if (!window.supabase || !window.SB_CONFIG) {
        throw new Error("Supabase ou SB_CONFIG não foi carregado no HTML do widget.");
      }

      client = window.supabase.createClient(
        window.SB_CONFIG.SUPABASE_URL,
        window.SB_CONFIG.SUPABASE_ANON_KEY
      );

      await loadState();

      channel = client
        .channel("soundboard-lvlup-obs-widget")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "lvlup_estado",
          filter: "id=eq.1"
        }, (payload) => {
          if (payload.new && Number(payload.new.id) === 1) {
            state = payload.new;
            draw();
          }
        })
        .subscribe((status) => {
          const statusEl = $("lvlupObsStatus");
          if (statusEl) {
            statusEl.textContent = status === "SUBSCRIBED" ? "AO VIVO" :
              (status === "CHANNEL_ERROR" || status === "TIMED_OUT" ? "RECONECTANDO" : "CONECTANDO");
          }
          if (status === "SUBSCRIBED") {
            loadState().catch((error) => console.error("[LVLUP OBS]", error));
          }
        });

      window.setInterval(() => {
        loadState().catch((error) => console.error("[LVLUP OBS]", error));
      }, 15000);

      window.setInterval(draw, 250);
      window.addEventListener("beforeunload", () => {
        if (channel && client) client.removeChannel(channel);
      });
    } catch (error) {
      console.error("[LVLUP OBS]", error);
      const statusEl = $("lvlupObsStatus");
      if (statusEl) statusEl.textContent = "SEM CONEXÃO";
    }
  }

  start();
})();