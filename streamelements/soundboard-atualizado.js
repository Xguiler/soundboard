// ============================
// CONFIG GERAL
// ============================
const audio = new Audio();

let tempoRestante = 0;
let nivelAtivo = 0;
let timer = null;

// R$1 = +300 segundos
let segundosPorReal = 300;

// seu nick
const ADMIN_NICK = "xguiler";

// níveis
const nivelNumero = {
  suave: 0,
  vip: 1,
  elite: 2,
  furia: 3,
  apocalipse: 4
};

// ============================
// COOLDOWN GLOBAL
// ============================
//
// O cooldown depende do nível ATUAL.
// Depois que um som toca, qualquer outro
// som fica bloqueado até o cooldown acabar.
//
// SUAVE       = 15s
// VIP         = 10s
// ELITE       = 8s
// FÚRIA       = 7s
// APOCALIPSE  = 3s
//
const cooldownPorNivel = {
  suave: 15,
  vip: 10,
  elite: 8,
  furia: 7,
  apocalipse: 3
};

// Momento exato em que o cooldown termina
let cooldownAte = 0;

// Timer exclusivo da HUD/cooldown
let cooldownHUDTimer = null;
// Canal Supabase usado pelo painel remoto
let remoteChannel = null;
// ============================
// COOLDOWN ATUAL
// ============================

function getCooldownAtual() {
  const nomesNivel = [
    "suave",
    "vip",
    "elite",
    "furia",
    "apocalipse"
  ];

  const nome = nomesNivel[nivelAtivo] || "suave";

  return cooldownPorNivel[nome] ?? 15;
}


function getCooldownRestante() {
  return Math.max(
    0,
    Math.ceil((cooldownAte - Date.now()) / 1000)
  );
}


function cooldownAtivo() {
  return Date.now() < cooldownAte;
}


// ============================
// ATUALIZAÇÃO DO COOLDOWN DA HUD
// ============================

function iniciarCooldownHUD() {

  if (cooldownHUDTimer) return;

  cooldownHUDTimer = setInterval(() => {

    atualizarHUD();
    enviarEstadoPainel();

    // Quando acabar, para o timer
    if (getCooldownRestante() <= 0) {

      clearInterval(cooldownHUDTimer);
      cooldownHUDTimer = null;

      atualizarHUD();
      enviarEstadoPainel();
    }

  }, 1000);
}



// ============================
// HUD
// ============================



function atualizarHUD() {
  const el = document.getElementById("statusHUD");
  if (!el) return;

  const cooldown = getCooldownRestante();

  const statusCooldown =
    cooldown > 0
      ? `⏳ Próximo som em ${cooldown}s`
      : `🔊 PRONTO PARA TOCAR`;

  const statusClass =
    cooldown > 0 ? "cooldown-ativo" : "pronto";

  const niveisHUD = [
    { nome: "SUAVE", emoji: "🟢", classe: "nivel-suave" },
    { nome: "VIP", emoji: "🔵", classe: "nivel-vip" },
    { nome: "ELITE", emoji: "🟣", classe: "nivel-elite" },
    { nome: "FÚRIA", emoji: "🔥", classe: "nivel-furia" },
    { nome: "APOCALIPSE", emoji: "☠️", classe: "nivel-apocalipse" }
  ];

  const nivel = niveisHUD[nivelAtivo] || niveisHUD[0];

  el.innerHTML = `
    <div class="mini-player">
      <div class="player-header">
      <span class="player-title">
  ♫ !som
  <span class="player-nivel ${nivel.classe}">
    ${nivel.emoji} ${nivel.nome}
  </span>
</span>
      </div>

      <div class="player-tempo">
        <span class="tempo-label">TEMPO DISPONÍVEL</span>
        <span class="tempo-valor">
          ${tempoRestante === 0 ? "♾️♾️♾️" : tempoRestante + "s"}
        </span>
      </div>

      <div class="player-status ${statusClass}">
        ${statusCooldown}
      </div>
    </div>
  `;
}



// ============================
// LISTA DE SONS
// ============================
const sons = {

  // ============================
  // SUAVE
  // ============================
  "!peido": { url: "https://www.myinstants.com/media/sounds/audio2_1.mp3", level: "suave" },
  "!peido2": { url: "https://www.myinstants.com/media/sounds/perfect-fart_Qosxm1J.mp3", level: "suave" },
  "!peido3": { url: "https://www.myinstants.com/media/sounds/sans-titre_yiwhxtj.mp3", level: "suave" },
  "!peidofunk": { url: "https://www.myinstants.com/media/sounds/peido-funk-som.mp3", level: "suave" },
  "!madeira": { url: "https://www.myinstants.com/media/sounds/do-you-want-wood.mp3", level: "suave" },
  "!cavalo": { url: "https://www.myinstants.com/media/sounds/cavalo.mp3", level: "suave" },
  "!undaia": { url: "https://www.myinstants.com/media/sounds/undaia-meme.mp3", level: "suave" },
  "!elegosta": { url: "https://www.myinstants.com/media/sounds/tmpd9mca4be.mp3", level: "suave" },
  "!ui": { url: "https://www.myinstants.com/media/sounds/ui-rodrigo-faro.mp3", level: "suave" },
  "!tome": { url: "https://www.myinstants.com/media/sounds/tome-rodrigo-faro_xDXKGwq.mp3", level: "suave" },
  "!fart": { url: "https://www.myinstants.com/media/sounds/dry-fart.mp3", level: "suave" },
  "!raze": { url: "https://www.myinstants.com/media/sounds/raze-inimiga-ultando-pt-br.mp3", level: "suave" },
  "!defuse": { url: "https://www.myinstants.com/media/sounds/defuse-spike_CHnp9Gz.mp3", level: "suave" },
  "!plant": { url: "https://www.myinstants.com/media/sounds/valorant-spike-plant.mp3", level: "suave" },
  "!chamber": { url: "https://www.myinstants.com/media/sounds/chamber-querem-brincar.mp3", level: "suave" },
  "!gekko": { url: "https://www.myinstants.com/media/sounds/gekko-ult-br.mp3", level: "suave" },
  "!dancagatinho": { url: "https://www.myinstants.com/media/sounds/y2mate_rLgMJTu.mp3", level: "suave" },
  "!qissomeufilho": { url: "https://www.myinstants.com/media/sounds/que-isso-meu-filho-calma-vai-dar-namoro.mp3", level: "suave" },
  "!derrame": { url: "https://www.myinstants.com/media/sounds/som-inentendivel-rodrigo-faro.mp3", level: "suave" },
  "!pare": { url: "https://www.myinstants.com/media/sounds/pare.mp3", level: "suave" },
  "!fah": { url: "https://www.myinstants.com/media/sounds/fahhh_KcgAXfs.mp3", level: "suave" },
  "!vineboom": { url: "https://www.myinstants.com/media/sounds/vine-boom.mp3", level: "suave" },
  "!rizz": { url: "https://www.myinstants.com/media/sounds/rizz-sound-effect.mp3", level: "suave" },
  "!among": { url: "https://www.myinstants.com/media/sounds/among-us-role-reveal-sound.mp3", level: "suave" },
  "!aiqdlc": { url: "https://www.myinstants.com/media/sounds/ai-que-delicia-mickey.mp3", level: "suave" },
  "!bigfa": { url: "https://www.myinstants.com/media/sounds/afinal-eu-sou-seu-maior-fa-syndrome.mp3", level: "suave" },
  "!brbr": { url: "https://www.myinstants.com/media/sounds/efeitos-sonoros-brasil-sil-sil-rede-globo.mp3", level: "suave" },
  "!calado": { url: "https://www.myinstants.com/media/sounds/e-quem-ficar-calado.mp3", level: "suave" },
  "!pix": { url: "https://www.myinstants.com/media/sounds/cade-meu-pix.mp3", level: "suave" },
  "!faah": { url: "https://www.myinstants.com/media/sounds/faaah.mp3", level: "suave" },
  "!finalmeme": { url: "https://www.myinstants.com/media/sounds/meme-de-creditos-finales.mp3", level: "suave" },
  "!iamthestorm": { url: "https://www.myinstants.com/media/sounds/dmc5-storm-no-sound.mp3", level: "suave" },
  "!estoycansado": { url: "https://www.myinstants.com/media/sounds/estoy-cansado-jefe.mp3", level: "suave" },
  "!minhasforças": { url: "https://www.myinstants.com/media/sounds/sentindo-minhas-forcas-indo-embora.mp3", level: "suave" },
  "!letsgetdown": { url: "https://www.myinstants.com/media/sounds/buziness1.mp3", level: "suave" },
  "!agrfu": { url: "https://www.myinstants.com/media/sounds/agora-fudeu-musica.mp3", level: "suave" },
  "!estilonemarra": { url: "https://www.myinstants.com/media/sounds/estilo-nao-e-marra.mp3", level: "suave" },
  "!sampley": { url: "https://www.myinstants.com/media/sounds/osampley.mp3", level: "suave" },
  "!business": { url: "https://www.myinstants.com/media/sounds/business_ZSrY3Vq.mp3", level: "suave" },
  "!aipai": { url: "https://www.myinstants.com/media/sounds/ai-pai-para-hihi.mp3", level: "suave" },
  "!berrante": { url: "https://www.myinstants.com/media/sounds/toque-de-berrante-para-celular.mp3", level: "suave" },
  "!bobmarley": { url: "https://www.myinstants.com/media/sounds/bobmarleyshort.mp3", level: "suave" },
  "!bobmarley2": { url: "https://www.myinstants.com/media/sounds/three-vkli.mp3", level: "suave" },
  "!calmaaipaizao": { url: "https://www.myinstants.com/media/sounds/calma-ai-paizao.mp3", level: "suave" },
  "!calmamix": { url: "https://www.myinstants.com/media/sounds/auto_tune_desculpa_de_bg-vebado_mp3cut.mp3", level: "suave" },
  "!eufinjo": { url: "https://www.myinstants.com/media/sounds/eu-finjo-que-nao-percebo-completo.mp3", level: "suave" },
  "!elefezdnv": { url: "https://www.myinstants.com/media/sounds/ele-fez-dnv-mas-uma-vez.mp3", level: "suave" },

  // ============================
  // VIP
  // ============================
  "!brutal": { url: "https://www.myinstants.com/media/sounds/brutal-nao-sobrou-nada-pro-betinha.mp3", level: "vip" },
  "!falei": { url: "https://www.myinstants.com/media/sounds/falei-falei-meme.mp3", level: "vip" },
  "!oruam": { url: "https://www.myinstants.com/media/sounds/oruam-antes-de-pensar-em-matar.mp3", level: "vip" },
  "!freio": { url: "https://www.myinstants.com/media/sounds/se-eu-largar-o-freio-oficial.mp3", level: "vip" },
  "!cebolinha2": { url: "https://www.myinstants.com/media/sounds/cebolinha-elogios.mp3", level: "vip" },
  "!wow2": { url: "https://www.myinstants.com/media/sounds/wow_8.mp3", level: "vip" },
  "!wow": { url: "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3", level: "vip" },
  "!dexter": { url: "https://www.myinstants.com/media/sounds/dexter-meme.mp3", level: "vip" },
  "!nemesis": { url: "https://www.myinstants.com/media/sounds/tf_nemesis.mp3", level: "vip" },
  "!brass": { url: "https://www.myinstants.com/media/sounds/dun-dun-dun-sound-effect-brass_8nFBccR.mp3", level: "vip" },
  "!indian": { url: "https://www.myinstants.com/media/sounds/indian-song.mp3", level: "vip" },
  "!ack": { url: "https://www.myinstants.com/media/sounds/ack.mp3", level: "vip" },
  "!heehee": { url: "https://www.myinstants.com/media/sounds/michael-jackson-hee-hee.mp3", level: "vip" },
  "!donald": { url: "https://www.myinstants.com/media/sounds/pato-donald-6.mp3", level: "vip" },
  "!engracado": { url: "https://www.myinstants.com/media/sounds/que-cara-mais-engracado.mp3", level: "vip" },
  "!gordo": { url: "https://www.myinstants.com/media/sounds/e-engracado-porque-ele-e-gordo.mp3", level: "vip" },
  "!aura": { url: "https://www.myinstants.com/media/sounds/voce-nao-tem-aura.mp3", level: "vip" },
  "!ego": { url: "https://www.myinstants.com/media/sounds/aura-ego.mp3", level: "vip" },
  "!gripada": { url: "https://www.myinstants.com/media/sounds/e-q-eu-to-meio-gripadinha.mp3", level: "vip" },
  "!moreno": { url: "https://www.myinstants.com/media/sounds/que-isso-moreno.mp3", level: "vip" },
  "!lavando": { url: "https://www.myinstants.com/media/sounds/la-vai-ela-lavando.mp3", level: "vip" },
  "!obrigado": { url: "https://www.myinstants.com/media/sounds/obrigado-amigo.mp3", level: "vip" },
  "!ui2": { url: "https://www.myinstants.com/media/sounds/y2mate-mp3cut_UiukPeR.mp3", level: "vip" },
  "!movie": { url: "https://www.myinstants.com/media/sounds/movie_1.mp3", level: "vip" },
  "!sentimento": { url: "https://www.myinstants.com/media/sounds/ta-bom-quanto-sentimento.mp3", level: "vip" },
  "!fail": { url: "https://www.myinstants.com/media/sounds/bob-esponja-fail-sound.mp3", level: "vip" },

  // ============================
  // ELITE
  // ============================
  "!auuu": { url: "https://www.myinstants.com/media/sounds/animals-auuuuuuuuuu.mp3", level: "elite" },
  "!like": { url: "https://www.myinstants.com/media/sounds/like-a-prayer.mp3", level: "elite" },
  "!cooked": { url: "https://www.myinstants.com/media/sounds/cooked-dog-meme.mp3", level: "elite" },
  "!wnd": { url: "https://www.myinstants.com/media/sounds/wndzp.mp3", level: "elite" },
  "!rapazes": { url: "https://www.myinstants.com/media/sounds/sua-mae-sabe-que-voce-gosta-de-rapazes.mp3", level: "elite" },
  "!kiko": { url: "https://www.myinstants.com/media/sounds/a-risada-do-kiko.mp3", level: "elite" },
  "!motivacional": { url: "https://www.myinstants.com/media/sounds/bom-dia-motivacional.mp3", level: "elite" },
  "!cr7": { url: "https://www.myinstants.com/media/sounds/cr7-bom-dia.mp3", level: "elite" },
  "!gay": { url: "https://www.myinstants.com/media/sounds/eai-gay.mp3", level: "elite" },
  "!problema": { url: "https://www.myinstants.com/media/sounds/e-quem-disse-que-isso-e-problema-meu_Gm6JrGL.mp3", level: "elite" },
  "!escolhido": { url: "https://www.myinstants.com/media/sounds/voce-era-o-escolhido_HNzKCcc.mp3", level: "elite" },
  "!cachorro": { url: "https://www.myinstants.com/media/sounds/eu-conheco-esse-cachorro.mp3", level: "elite" },
  "!pain": { url: "https://www.myinstants.com/media/sounds/pain-2.mp3", level: "elite" },
  "!tmp": { url: "https://www.myinstants.com/media/sounds/tmpod05oao0.mp3", level: "elite" },
  "!spider": { url: "https://www.myinstants.com/media/sounds/miguel-oharris-spider-man-2099.mp3", level: "elite" },
  "!file": { url: "https://www.myinstants.com/media/sounds/file_235431.mp3", level: "elite" },
  "!heroi": { url: "https://www.myinstants.com/media/sounds/um-heroi.mp3", level: "elite" },
  "!naosobrou": { url: "https://www.myinstants.com/media/sounds/nao-sobrou-nada_fZprXSC.mp3", level: "elite" },
  "!chuva": { url: "https://www.myinstants.com/media/sounds/ta-chovendo-ai-aqui-ta-chovendo-download-na-descricao.mp3", level: "elite" },
  "!monark": { url: "https://www.myinstants.com/media/sounds/acorda-monark.mp3", level: "elite" },
  "!fart2": { url: "https://www.myinstants.com/media/sounds/fartmeme.mp3", level: "elite" },
  "!pablo": { url: "https://www.myinstants.com/media/sounds/pablo-chora-nao-bebe-desculpe-ai-audio-oficial.mp3", level: "elite" },
  "!velhos": { url: "https://www.myinstants.com/media/sounds/velhos-brigando-arreia.mp3", level: "elite" },
  "!ferrei": { url: "https://www.myinstants.com/media/sounds/me-ferrei-amigos-estevao.mp3", level: "elite" },

  // ============================
  // FÚRIA
  // ============================
  "!risada": { url: "https://www.myinstants.com/media/sounds/neg_cio_de_risada_pra_mim_original_source_-1.mp3", level: "furia" },
  "!miauu": { url: "https://www.myinstants.com/media/sounds/miauuuuuuuu.mp3", level: "furia" },
  "!bolso": { url: "https://www.myinstants.com/media/sounds/bolsonaro-porcaria-bosta-bosta.mp3", level: "furia" },
  "!cebolinha": { url: "https://www.myinstants.com/media/sounds/28-cebolinha-xinga.mp3", level: "furia" },
  "!grr": { url: "https://www.myinstants.com/media/sounds/dame-un-grr-troll.mp3", level: "furia" },
  "!lutador": { url: "https://www.myinstants.com/media/sounds/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-e-lutador.mp3", level: "furia" },
  "!prowler": { url: "https://www.myinstants.com/media/sounds/prowler-sound-effect_6bXErot.mp3", level: "furia" },
  "!jojo": { url: "https://www.myinstants.com/media/sounds/jojos-bizarre-adventure-ay-ay-ay-ay-_-sound-effect.mp3", level: "furia" },
  "!porra": { url: "https://www.myinstants.com/media/sounds/porra-3.mp3", level: "furia" },
  "!heart": { url: "https://www.myinstants.com/media/sounds/can-you-feel-my-heart-a.mp3", level: "furia" },
  "!caganeira": { url: "https://www.myinstants.com/media/sounds/caganeira-gordurosa.mp3", level: "furia" },
  "!galinha": { url: "https://www.myinstants.com/media/sounds/galinha-gritando-no-telhado.mp3", level: "furia" },
  "!mendigo": { url: "https://www.myinstants.com/media/sounds/aqui-e-papo-de-mendigo.mp3", level: "furia" },
  "!ai": { url: "https://www.myinstants.com/media/sounds/ai-meu-c.mp3", level: "furia" },
  "!tira": { url: "https://www.myinstants.com/media/sounds/para-tira.mp3", level: "furia" },
  "!longfart": { url: "https://www.myinstants.com/media/sounds/long-brain-fart.mp3", level: "furia" },
  "!vagabunda": { url: "https://www.myinstants.com/media/sounds/chora-nao-vagabunda-meme.mp3", level: "furia" },
  "!tobias": { url: "https://www.myinstants.com/media/sounds/tu-da-muito-o-teu-tobias.mp3", level: "furia" },
  "!deg": { url: "https://www.myinstants.com/media/sounds/deg-deg_4M6Cojn.mp3", level: "furia" },
  "!maconha": { url: "https://www.myinstants.com/media/sounds/olha-a-maconhaa.mp3", level: "furia" },
  "!calaboca": { url: "https://www.myinstants.com/media/sounds/ai-que-nao-sei-oque-cala-boca.mp3", level: "furia" },

  // ============================
  // APOCALIPSE
  // ============================
  "!tuntun": { url: "https://www.myinstants.com/media/sounds/tun-tun-forro.mp3", level: "apocalipse" },
  "!zap": { url: "https://www.myinstants.com/media/sounds/som-do-zap-zap-estourado.mp3", level: "apocalipse" },
  "!rojao": { url: "https://www.myinstants.com/media/sounds/rojao-super-estourado.mp3", level: "apocalipse" },
  "!pou": { url: "https://www.myinstants.com/media/sounds/pou-estourado_zIWCpMy.mp3", level: "apocalipse" },
  "!sigma": { url: "https://www.myinstants.com/media/sounds/musica-de-sigma-estourado.mp3", level: "apocalipse" },
  "!copao": { url: "https://www.myinstants.com/media/sounds/de-copao-na-mao-estourado.mp3", level: "apocalipse" },
  "!susto": { url: "https://www.myinstants.com/media/sounds/susto-funk-estourado.mp3", level: "apocalipse" },
  "!dolly": { url: "https://www.myinstants.com/media/sounds/dolly-estourado.mp3", level: "apocalipse" },
  "!iphone": { url: "https://www.myinstants.com/media/sounds/toque-do-iphone-estourado.mp3", level: "apocalipse" },
  "!plantao": { url: "https://www.myinstants.com/media/sounds/musica-do-plantao-da-globo-estourado.mp3", level: "apocalipse" },
  "!corinthians": { url: "https://www.myinstants.com/media/sounds/vai-corinthians-estouradasso.mp3", level: "apocalipse" },
  "!galaxy": { url: "https://www.myinstants.com/media/sounds/galaxy-meme.mp3", level: "apocalipse" },
  "!mensagem": { url: "https://www.myinstants.com/media/sounds/olha-a-mensagem-b_Rp09o17.mp3", level: "apocalipse" },
  "!scream": { url: "https://www.myinstants.com/media/sounds/exorcist-scary-scream.mp3", level: "apocalipse" },
  "!gmidao": { url: "https://www.myinstants.com/media/sounds/gmidao-do-zap.mp3", level: "apocalipse" },
  "!acorda": { url: "https://www.myinstants.com/media/sounds/acorda-estouradao.mp3", level: "apocalipse" },
  "!vasco": { url: "https://www.myinstants.com/media/sounds/vasco-da-gama.mp3", level: "apocalipse" },
  "!danone": { url: "https://www.myinstants.com/media/sounds/olha-o-carro-do-danone-em-estourado.mp3", level: "apocalipse" }

};


// ============================
// ENVIAR ESTADO PARA O PAINEL
// ============================

function enviarEstadoPainel() {

  if (
    typeof remoteChannel === "undefined" ||
    !remoteChannel
  ) {
    return;
  }

  const estado = {
    nivelAtivo: nivelAtivo,

    tempoRestante: tempoRestante,

    cooldownAte: cooldownAte,

    cooldownRestante: getCooldownRestante(),

    timestamp: Date.now()
  };

  remoteChannel.send({
    type: "broadcast",
    event: "state",
    payload: estado
  });
}


// ============================
// TIMER DO NÍVEL
// ============================

function iniciarTimer() {

  if (timer) return;

  timer = setInterval(() => {

    tempoRestante--;

    if (tempoRestante <= 0) {

      clearInterval(timer);
      timer = null;

      tempoRestante = 0;
      nivelAtivo = 0;

      // acabou o nível → limpa cooldown
      cooldownAte = 0;
    }

    atualizarHUD();
    enviarEstadoPainel();

  }, 1000);
}


// ============================
// TOAST (desativado)
// ============================

function showDonateToast(text) {
  // toast desativado
}


// ============================
// AGRUPADOR DE DOAÇÕES
// ============================

let donateQueueValor = 0;
let donateQueueCount = 0;
let donateQueueMaxNivel = 0;
let donateFlushTimer = null;


// ============================
// ANTI-DUPLICAÇÃO DE DONATE
// ============================

let lastTipKey = null;


// ============================
// HELPERS
// ============================

function parseValor(rawAmount) {

  // aceita:
  // 1
  // 1.50
  // 1,50
  // R$ 1,50

  const s = String(rawAmount)
    .replace("R$", "")
    .replace(/\s/g, "")
    .replace(",", ".");

  const v = parseFloat(s);

  return Number.isFinite(v) ? v : NaN;
}


function nivelPorFaixa(valor) {

  // R$1–4,99   = VIP
  // R$5–24,99  = ELITE
  // R$25–49,99 = FÚRIA
  // R$50+      = APOCALIPSE

  if (valor >= 50) return 4;
  if (valor >= 25) return 3;
  if (valor >= 5) return 2;
  if (valor >= 1) return 1;

  return 0;
}


// ============================
// EVENTOS STREAM ELEMENTS
// ============================

window.addEventListener("onEventReceived", function (obj) {

  const listener = obj?.detail?.listener;

  // ============================
  // DOAÇÃO
  // ============================

  if (listener === "tip-latest") {

    const ev = obj.detail.event || {};

    const valor = parseValor(ev.amount);

    if (isNaN(valor)) return;


    // ============================
    // ANTI-DUPLICAÇÃO
    // ============================

    const bucket = Math.floor(Date.now() / 3000);

    const tipKey =
      ev._id ||
      ev.id ||
      ev.transactionId ||
      ev.createdAt ||
      `${valor}:${ev.name || ev.username || ""}:${bucket}`;

    if (tipKey && tipKey === lastTipKey) {
      return;
    }

    lastTipKey = tipKey;


    // ============================
    // CALCULA NÍVEL
    // ============================

    const nivelNovo = nivelPorFaixa(valor);


    // ============================
    // CALCULA TEMPO
    // ============================

    const tempoExtra =
      Math.floor(valor * segundosPorReal);


    // ============================
    // ACUMULA TEMPO
    // ============================

    tempoRestante += tempoExtra;


    // ============================
    // SOBE O NÍVEL SE NECESSÁRIO
    // ============================

    if (nivelNovo > nivelAtivo) {
      nivelAtivo = nivelNovo;
    }


    // ============================
    // INICIA O TIMER
    // ============================

    iniciarTimer();


    // ============================
    // ATUALIZA HUD + PAINEL
    // ============================

    atualizarHUD();
    enviarEstadoPainel();


    // ============================
    // AGRUPADOR DE DOAÇÕES
    // ============================

    donateQueueValor += valor;
    donateQueueCount += 1;

    donateQueueMaxNivel =
      Math.max(
        donateQueueMaxNivel,
        nivelNovo
      );


    if (donateFlushTimer) {
      clearTimeout(donateFlushTimer);
    }


    donateFlushTimer = setTimeout(() => {

      const txt =
        `💸 +R$${donateQueueValor.toFixed(2)} ` +
        `| ${donateQueueCount} donate(s) ` +
        `| +${Math.floor(
          donateQueueValor * segundosPorReal
        )}s ` +
        `| nível ${donateQueueMaxNivel}`;


      // Toast desativado
      // showDonateToast(txt);


      donateQueueValor = 0;
      donateQueueCount = 0;
      donateQueueMaxNivel = 0;

      donateFlushTimer = null;

    }, 5000);


    console.log("[TIP DEBUG]", {
      amountRaw: ev.amount,
      valorParsed: valor,
      segundosPorReal,
      tempoExtra,
      tempoRestante,
      nivelAtivo
    });

  }
});


// ============================
// CHAT + ADMIN
// ============================

window.addEventListener("onEventReceived", function (obj) {

  const listener = obj?.detail?.listener;

  if (listener !== "message") return;

  const msg =
    obj.detail.event.data.text
      .trim()
      .toLowerCase();

  const user =
    obj.detail.event.data.nick
      .trim()
      .toLowerCase();


  // ============================
  // ADMIN
  // ============================

  if (user === ADMIN_NICK) {


    // ============================
    // ALTERAR VALOR POR REAL
    // !setreal 300
    // ============================

    if (msg.startsWith("!setreal ")) {

      const novoValor =
        parseInt(
          msg.split(" ")[1],
          10
        );

      if (
        !isNaN(novoValor) &&
        novoValor > 0
      ) {

        segundosPorReal = novoValor;

        atualizarHUD();

        enviarEstadoPainel();

        console.log(
          "[ADMIN] segundosPorReal =",
          segundosPorReal
        );
      }

      return;
    }


    // ============================
    // STATUS
    // ============================

    if (msg === "!statusadmin") {

      atualizarHUD();

      enviarEstadoPainel();

      console.log("[STATUS]", {
        nivelAtivo,
        tempoRestante,
        segundosPorReal,
        cooldownRestante: getCooldownRestante()
      });

      return;
    }


    // ============================
    // PRESETS ADMIN
    // ============================

    const adminMap = {

      "!vipadmin": {
        nivel: 1,
        tempo: 300
      },

      "!eliteadmin": {
        nivel: 2,
        tempo: 600
      },

      "!furiaadmin": {
        nivel: 3,
        tempo: 1800
      },

      "!apocalipseadmin": {
        nivel: 4,
        tempo: 3600
      }

    };


    if (adminMap[msg]) {

      const {
        nivel,
        tempo
      } = adminMap[msg];


      // ============================
      // SETA NÍVEL + TEMPO
      // ============================

      nivelAtivo = nivel;
      tempoRestante = tempo;


      // IMPORTANTE:
      // NÃO mexemos no cooldown aqui.
      //
      // Se já estava em cooldown,
      // ele continua normalmente.

      if (timer) {

        clearInterval(timer);

        timer = null;
      }

      iniciarTimer();

      atualizarHUD();

      enviarEstadoPainel();

      console.log(
        "[ADMIN] Nível alterado:",
        nivel,
        "Tempo:",
        tempo
      );

      return;
    }


    // ============================
    // RESET ADMIN
    // ============================

    if (msg === "!resetadmin") {

      nivelAtivo = 0;
      tempoRestante = 0;

      if (timer) {

        clearInterval(timer);

        timer = null;
      }

      // Reset completo
      cooldownAte = 0;

      atualizarHUD();

      enviarEstadoPainel();

      console.log(
        "[ADMIN] Soundboard resetada"
      );

      return;
    }

  }


  // ============================
  // FUNÇÃO CENTRAL DE SOM
  // ============================

  tocarSomComando(
    msg,
    "CHAT"
  );

});


// ============================
// TOCAR SOM
// ============================
//
// Essa função é usada por:
// - Chat
// - Painel remoto
//
// Portanto todos usam:
// - mesmo nível
// - mesmo cooldown
// - mesmo áudio
// ============================

function tocarSomComando(
  comando,
  origem = "CHAT"
) {

  const msg =
    String(comando)
      .trim()
      .toLowerCase();


  // ============================
  // PROCURA O SOM
  // ============================

  const som = sons[msg];

  if (!som) {

    console.log(
      `[${origem}] Som não encontrado:`,
      msg
    );

    return false;
  }


  // ============================
  // VERIFICA NÍVEL
  // ============================

  const nivelNecessario =
    nivelNumero[som.level];

  if (
    nivelAtivo < nivelNecessario
  ) {

    console.log(
      `[${origem}] Som bloqueado pelo nível:`,
      msg
    );

    return false;
  }


  // ============================
  // VERIFICA COOLDOWN GLOBAL
  // ============================

  const restante =
    getCooldownRestante();

  if (restante > 0) {

    console.log(
      `[${origem}] Cooldown ativo:`,
      restante + "s"
    );

    return false;
  }


  // ============================
  // INICIA COOLDOWN
  // ============================

  const cooldownSegundos =
    getCooldownAtual();

  cooldownAte =
    Date.now() +
    (cooldownSegundos * 1000);
iniciarCooldownHUD();

  // ============================
  // TOCA O ÁUDIO
  // ============================

  audio.pause();

  audio.currentTime = 0;

  audio.src = som.url;


  audio.play()
    .then(() => {

      console.log(
        `[${origem}] Tocando:`,
        msg,
        "| cooldown:",
        cooldownSegundos + "s"
      );

    })
    .catch((err) => {

      console.error(
        `[${origem}] Erro ao tocar:`,
        err
      );

    });


  // ============================
  // ATUALIZA HUD + PAINEL
  // ============================

  atualizarHUD();

  enviarEstadoPainel();


  return true;
}


// ============================
// HUD INICIAL
// ============================

atualizarHUD();

// =====================================================
// CONTROLE REMOTO — SUPABASE
// =====================================================

if (
  window.supabase &&
  window.SB_CONFIG
) {

  // ============================
  // CONEXÃO SUPABASE
  // ============================

  const remoteClient =
    supabase.createClient(
      SB_CONFIG.SUPABASE_URL,
      SB_CONFIG.SUPABASE_ANON_KEY
    );


  // ============================
  // CANAL DA SALA
  // ============================

  remoteChannel =
    remoteClient.channel(
      SB_CONFIG.ROOM_ID
    );


  // ============================
  // RECEBER COMANDO DO PAINEL
  // ============================

  remoteChannel.on(
    "broadcast",
    {
      event: "sound"
    },

    ({ payload }) => {

      const command =
        payload?.command;

      if (!command) return;

      console.log(
        "[REMOTE] Comando recebido:",
        command
      );

      tocarSomComando(
        command,
        "REMOTE"
      );

    }
  );


  // ============================
  // PAINEL PEDIU O ESTADO ATUAL
  // ============================

  remoteChannel.on(
    "broadcast",
    {
      event: "state_request"
    },

    () => {

      console.log(
        "[REMOTE] Painel pediu estado atual"
      );

      enviarEstadoPainel();

    }
  );


  // ============================
  // CONECTAR
  // ============================

  remoteChannel.subscribe((status) => {

    console.log(
      "[REMOTE] Conexão Supabase:",
      status
    );


    if (status === "SUBSCRIBED") {

      console.log(
        "[REMOTE] Canal conectado!"
      );


      // Envia o estado atual para o painel
      // assim que a barra entra na sala.

      setTimeout(() => {

        console.log(
          "[REMOTE] Enviando estado inicial:",
          {
            nivelAtivo,
            tempoRestante,
            cooldownAte,
            cooldownRestante: getCooldownRestante()
          }
        );

        enviarEstadoPainel();

      }, 500);

    }

  });

}
// =====================================================
// DEBUG
// =====================================================

console.log(
  "🔥 SOUNDBOARD JS CARREGOU"
);

console.log(
  "Supabase:",
  window.supabase
);

console.log(
  "Config:",
  window.SB_CONFIG
);