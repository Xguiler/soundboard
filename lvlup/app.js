(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const levelNames = {
    SUAVE: { label: "🟢 SUAVE", css: "suave", rank: 0 },
    VIP: { label: "🟣 VIP", css: "vip", rank: 1 },
    ELITE: { label: "🔵 ELITE", css: "elite", rank: 2 },
    FURIA: { label: "🟠 FÚRIA", css: "furia", rank: 3 },
    APOCALIPSE: { label: "🔴 APOCALIPSE", css: "apocalipse", rank: 4 }
  };
  let currentState = null;
  let channel = null;
  let lastError = "";
  const money = (value) => Number(value || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL"
  });
  const duration = (seconds) => {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0")
      : String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  };
  function setStatus(message, type = "") {
    const el = $("connectionStatus");
    if (!el) return;
    el.textContent = message;
    el.className = "status" + (type ? " " + type : "");
  }
  function render() {
    if (!currentState) return;
    const rawLevel = String(currentState.nivel || "SUAVE").toUpperCase();
    const level = levelNames[rawLevel] || levelNames.SUAVE;
    const updatedAt = currentState.atualizado_em ? Date.parse(currentState.atualizado_em) : Date.now();
    const elapsed = Math.max(0, (Date.now() - (Number.isFinite(updatedAt) ? updatedAt : Date.now())) / 1000);
    const timerSeconds = rawLevel === "SUAVE" ? 0 : Math.max(0, Number(currentState.tempo_restante || 0) - elapsed);
    const windowEnd = currentState.fim_janela ? Date.parse(currentState.fim_janela) : NaN;
    const windowSeconds = Number.isFinite(windowEnd) ? Math.max(0, (windowEnd - Date.now()) / 1000) : 0;

    const levelEl = $("currentLevel");
    levelEl.textContent = level.label;
    levelEl.className = "level " + level.css;
    $("levelTimer").textContent = rawLevel === "SUAVE" ? "00:00" : duration(timerSeconds);
    $("roundTotal").textContent = money(currentState.total_rodada);
    $("roundTimer").textContent = currentState.fim_janela ? duration(windowSeconds) : "Aguardando doação";
    const highest = levelNames[String(currentState.maior_nivel_desbloqueado || "SUAVE").toUpperCase()] || levelNames.SUAVE;
    $("highestLevel").textContent = highest.label;
    const pct = currentState.fim_janela ? Math.max(0, Math.min(100, (windowSeconds / 900) * 100)) : 0;
    $("windowProgress").style.width = pct + "%";
  }
  async function loadState() {
    try {
      if (!window.supabase || !window.SB_CONFIG) throw new Error("Configuração do Supabase não carregou.");
      const { data, error } = await window.supabase
        .createClient(window.SB_CONFIG.SUPABASE_URL, window.SB_CONFIG.SUPABASE_ANON_KEY)
        .from("lvlup_estado")
        .select("id,nivel,tempo_restante,total_rodada,inicio_rodada,fim_janela,atualizado_em,maior_nivel_desbloqueado")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Estado do Lvl Up ainda não foi inicializado.");
      currentState = data;
      lastError = "";
      render();
      setStatus("🟢 Conectado ao Supabase", "ok");
    } catch (error) {
      lastError = error?.message || String(error);
      setStatus("🔴 Não foi possível carregar o Lvl Up: " + lastError, "err");
      console.error("[LVLUP]", error);
    }
  }
  async function start() {
    if (!window.supabase || !window.SB_CONFIG) {
      setStatus("🔴 Configuração do Supabase não carregou.", "err");
      return;
    }
    const client = window.supabase.createClient(window.SB_CONFIG.SUPABASE_URL, window.SB_CONFIG.SUPABASE_ANON_KEY);
    await loadState();
    channel = client.channel("lvlup-display-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "lvlup_estado", filter: "id=eq.1" }, (payload) => {
        if (payload.new && payload.new.id === 1) {
          currentState = payload.new;
          lastError = "";
          render();
          setStatus("🟢 Atualizado em tempo real", "ok");
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (!lastError) setStatus("🟢 Atualizado em tempo real", "ok");
          loadState();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setStatus("🟡 Realtime instável; tentando atualizar pela consulta periódica.", "");
        }
      });
    // Fallback caso a conexão Realtime caia; consulta somente a linha pública de estado.
    window.setInterval(loadState, 15000);
    window.setInterval(render, 250);
    window.addEventListener("beforeunload", () => {
      if (channel) client.removeChannel(channel);
    });
  }
  start();
})();