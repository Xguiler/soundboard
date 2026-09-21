const CATEGORIAS = [
  {
    key: "suave",
    label: "🟢 SUAVE",
    level: 0,
    sons: [
      "!peido","!peido2","!peido3","!peidofunk","!madeira","!cavalo",
      "!undaia","!elegosta","!ui","!tome","!fart","!raze","!defuse",
      "!plant","!chamber","!gekko","!dancagatinho","!qissomeufilho",
      "!derrame","!pare","!fah","!vineboom","!rizz","!among","!aiqdlc",
      "!bigfa","!brbr","!calado","!pix"
    ]
  },
  {
    key: "vip",
    label: "🟣 VIP",
    level: 1,
    sons: [
      "!brutal","!falei","!oruam","!freio","!cebolinha2","!wow2","!wow",
      "!dexter","!nemesis","!brass","!indian","!ack","!heehee","!donald",
      "!engracado","!gordo","!aura","!ego","!gripada","!moreno","!lavando",
      "!obrigado","!ui2","!movie","!sentimento","!fail"
    ]
  },
  {
    key: "elite",
    label: "🔵 ELITE",
    level: 2,
    sons: [
      "!auuu","!like","!cooked","!wnd","!rapazes","!kiko","!motivacional",
      "!cr7","!gay","!problema","!escolhido","!cachorro","!pain","!tmp",
      "!spider","!file","!heroi","!naosobrou","!chuva","!monark","!fart2",
      "!pablo","!velhos","!ferrei"
    ]
  },
  {
    key: "furia",
    label: "🟠 FÚRIA",
    level: 3,
    sons: [
      "!risada","!miauu","!bolso","!cebolinha","!grr","!lutador","!prowler",
      "!jojo","!porra","!heart","!caganeira","!galinha","!mendigo","!ai",
      "!tira","!longfart","!vagabunda","!tobias","!deg","!maconha",
      "!calaboca"
    ]
  },
  {
    key: "apocalipse",
    label: "🔴 APOCALIPSE",
    level: 4,
    sons: [
      "!tuntun","!zap","!rojao","!pou","!sigma","!copao","!susto","!dolly",
      "!iphone","!plantao","!corinthians","!galaxy","!mensagem","!scream",
      "!gmidao","!acorda","!vasco","!danone"
    ]
  }
];

const status = document.getElementById("status");
const grid = document.getElementById("grid");
const currentLevel = document.getElementById("currentLevel");
const currentTime = document.getElementById("currentTime");

const client = supabase.createClient(
  SB_CONFIG.SUPABASE_URL,
  SB_CONFIG.SUPABASE_ANON_KEY
);

const channel = client.channel(SB_CONFIG.ROOM_ID);

let nivelAtivo = 0;
let tempoRestante = 0;
let ultimaAtualizacao = 0;
let liveOnline = false;

function formatarTempo(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "∞";

  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h > 0) {
    return String(h).padStart(2, "0") + ":" +
           String(m).padStart(2, "0") + ":" +
           String(sec).padStart(2, "0");
  }

  return String(m).padStart(2, "0") + ":" +
         String(sec).padStart(2, "0");
}

function nomeNivel(nivel) {
  return ["SUAVE","VIP","ELITE","FÚRIA","APOCALIPSE"][nivel] || "SUAVE";
}

function atualizarCabecalho() {
  currentLevel.textContent = nomeNivel(nivelAtivo);
  currentTime.textContent =
    tempoRestante > 0 ? formatarTempo(tempoRestante) : "∞";
}

function renderizarCategorias() {
  grid.innerHTML = "";

  const visiveis = CATEGORIAS.filter(categoria =>
    categoria.level <= nivelAtivo
  );

  visiveis.forEach(categoria => {
    const section = document.createElement("section");
    section.className = "level";

    const title = document.createElement("div");
    title.className = "level-title";

    const titleText = document.createElement("span");
    titleText.textContent = categoria.label;

    title.appendChild(titleText);

    // Mostra o tempo somente no nível atualmente ativo.
    if (categoria.level === nivelAtivo && tempoRestante > 0) {
      const time = document.createElement("span");
      time.className = "level-time";
      time.textContent = formatarTempo(tempoRestante);
      title.appendChild(time);
    }

    section.appendChild(title);

    const buttons = document.createElement("div");
    buttons.className = "buttons";

    categoria.sons.forEach(command => {
      const button = document.createElement("button");
      button.textContent = command;

      button.onclick = async () => {
        button.disabled = true;

        const result = await channel.send({
          type: "broadcast",
          event: "sound",
          payload: { command }
        });

        if (result !== "ok") {
          status.textContent = "🔴 Erro ao enviar";
          status.className = "status offline";
        }

        setTimeout(() => {
          button.disabled = false;
        }, 500);
      };

      buttons.appendChild(button);
    });

    section.appendChild(buttons);
    grid.appendChild(section);
  });
}

function aplicarEstado(payload) {
  if (!payload) return;

  nivelAtivo = Number.isFinite(Number(payload.nivelAtivo))
    ? Number(payload.nivelAtivo)
    : 0;

  tempoRestante = Math.max(
    0,
    Number(payload.tempoRestante) || 0
  );

  ultimaAtualizacao = Date.now();
  liveOnline = true;

  status.textContent = "🟢 Conectado";
  status.className = "status online";

  atualizarCabecalho();
  renderizarCategorias();
}

channel
  .on("broadcast", { event: "state" }, ({ payload }) => {
    aplicarEstado(payload);
  })
  .subscribe(async state => {
    if (state === "SUBSCRIBED") {
      status.textContent = "🟡 Aguardando live...";
      status.className = "status waiting";

      await channel.send({
        type: "broadcast",
        event: "state_request",
        payload: {}
      });
    } else {
      liveOnline = false;
      status.textContent = "🔴 Offline";
      status.className = "status offline";
    }
  });

setInterval(() => {
  if (!liveOnline) return;

  if (tempoRestante > 0) {
    tempoRestante--;
    atualizarCabecalho();
    renderizarCategorias();
  }
}, 1000);

// Se a live parar de responder, marca o painel como offline.
setInterval(() => {
  if (Date.now() - ultimaAtualizacao > 12000) {
    liveOnline = false;
    status.textContent = "🔴 Offline";
    status.className = "status offline";
  }
}, 2000);

atualizarCabecalho();
renderizarCategorias();
