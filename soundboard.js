// ============================
// CONFIG GERAL
// ============================
const audio = new Audio();

let tempoRestante = 0;
let nivelAtivo = 0;
let timer = null;

// cotação dinâmica (mude com !setreal 60)
let segundosPorReal = 300;

// seu nick (lowercase)
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
// COOLDOWN POR NÍVEL
// ============================
const cooldownPorNivel = {
  suave: 3,
  vip: 3,
  elite: 3,
  furia: 3,
  apocalipse: 3
};

const lastPlay = { byLevel: {} };

// ============================
// HUD
// ============================
function atualizarHUD() {
  const el = document.getElementById("statusHUD");
  if (!el) return;
  const nomesNivel = ["SUAVE", "VIP", "ELITE", "FÚRIA", "APOCALIPSE"];
  const nome = nomesNivel[nivelAtivo] || "SUAVE";
  el.innerHTML = `<center><span class="titulo">🔊 Soundboard 🔊</span><span class="divisor">│</span><span class="nivel"> ⌨️ !Som ⌨️</span><span class="divisor">│</span><span class="comando"> 𝑳𝐕𝑳 ⌨️ !${nome.toLowerCase()}</span><span class="divisor">│</span><span class="tempo">⏱ ${tempoRestante === 0 ? "♾️♾️♾️♾️" : tempoRestante + "s"}</span></center>`;
}

// ============================
// LISTA DE SONS
// ============================
const sons = {
  "!peido": { url: "https://www.myinstants.com/media/sounds/audio2_1.mp3", level: "suave", cooldown: 1 },
  "!peido2": { url: "https://www.myinstants.com/media/sounds/perfect-fart_Qosxm1J.mp3", level: "suave", cooldown: 1 },
  "!peido3": { url: "https://www.myinstants.com/media/sounds/sans-titre_yiwhxtj.mp3", level: "suave", cooldown: 1 },
  "!peidofunk": { url: "https://www.myinstants.com/media/sounds/peido-funk-som.mp3", level: "suave", cooldown: 1 },
  "!madeira": { url: "https://www.myinstants.com/media/sounds/tu-quer-madeira.mp3", level: "suave", cooldown: 10 },
  "!cavalo": { url: "https://www.myinstants.com/media/sounds/cavalo.mp3", level: "suave" },
  "!undaia": { url: "https://www.myinstants.com/media/sounds/undaia-meme.mp3", level: "suave", cooldown: 10 },
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
  "!calado": { url: "https://www.myinstants.com/media/sounds/e-quem-ficar-calado.mp3", level: "suave", cooldown: 10 },
  "!pix": { url: "https://www.myinstants.com/media/sounds/cade-meu-pix.mp3", level: "suave", cooldown: 10 },
  "!brutal": { url: "https://www.myinstants.com/media/sounds/brutal-nao-sobrou-nada-pro-betinha.mp3", level: "vip" },
  "!falei": { url: "https://www.myinstants.com/media/sounds/falei-falei-meme.mp3", level: "vip" },
  "!oruam": { url: "https://www.myinstants.com/media/sounds/oruam-antes-de-pensar-em-matar.mp3", level: "vip" },
  "!freio": { url: "https://www.myinstants.com/media/sounds/se-eu-largar-o-freio-oficial.mp3", level: "vip", cooldown: 10 },
  "!cebolinha2": { url: "https://www.myinstants.com/media/sounds/cebolinha-elogios.mp3", level: "vip" },
  "!wow2": { url: "https://www.myinstants.com/media/sounds/wow_8.mp3", level: "vip" },
  "!wow": { url: "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3", level: "vip", cooldown: 10 },
  "!dexter": { url: "https://www.myinstants.com/media/sounds/dexter-meme.mp3", level: "vip" },
  "!nemesis": { url: "https://www.myinstants.com/media/sounds/tf_nemesis.mp3", level: "vip", cooldown: 10 },
  "!brass": { url: "https://www.myinstants.com/media/sounds/dun-dun-dun-sound-effect-brass_8nFBccR.mp3", level: "vip" },
  "!indian": { url: "https://www.myinstants.com/media/sounds/indian-song.mp3", level: "vip" },
  "!ack": { url: "https://www.myinstants.com/media/sounds/ack.mp3", level: "vip" },
  "!heehee": { url: "https://www.myinstants.com/media/sounds/michael-jackson-hee-hee.mp3", level: "vip" },
  "!donald": { url: "https://www.myinstants.com/media/sounds/pato-donald-6.mp3", level: "vip" },
  "!engracado": { url: "https://www.myinstants.com/media/sounds/que-cara-mais-engracado.mp3", level: "vip" },
  "!gordo": { url: "https://www.myinstants.com/media/sounds/e-engracado-porque-ele-e-gordo.mp3", level: "vip" },
  "!aura": { url: "https://www.myinstants.com/media/sounds/voce-nao-tem-aura.mp3", level: "vip", cooldown: 10 },
  "!ego": { url: "https://www.myinstants.com/media/sounds/aura-ego.mp3", level: "vip" },
  "!gripada": { url: "https://www.myinstants.com/media/sounds/e-q-eu-to-meio-gripadinha.mp3", level: "vip" },
  "!moreno": { url: "https://www.myinstants.com/media/sounds/que-isso-moreno.mp3", level: "vip" },
  "!lavando": { url: "https://www.myinstants.com/media/sounds/la-vai-ela-lavando.mp3", level: "vip", cooldown: 10 },
  "!obrigado": { url: "https://www.myinstants.com/media/sounds/obrigado-amigo.mp3", level: "vip" },
  "!ui2": { url: "https://www.myinstants.com/media/sounds/y2mate-mp3cut_UiukPeR.mp3", level: "vip" },
  "!movie": { url: "https://www.myinstants.com/media/sounds/movie_1.mp3", level: "vip" },
  "!sentimento": { url: "https://www.myinstants.com/media/sounds/ta-bom-quanto-sentimento.mp3", level: "vip" },
  "!fail": { url: "https://www.myinstants.com/media/sounds/bob-esponja-fail-sound.mp3", level: "vip" },
  "!auuu": { url: "https://www.myinstants.com/media/sounds/animals-auuuuuuuuuu.mp3", level: "elite", cooldown: 10 },
  "!like": { url: "https://www.myinstants.com/media/sounds/like-a-prayer.mp3", level: "elite", cooldown: 10 },
  "!cooked": { url: "https://www.myinstants.com/media/sounds/cooked-dog-meme.mp3", level: "elite", cooldown: 10 },
  "!wnd": { url: "https://www.myinstants.com/media/sounds/wndzp.mp3", level: "elite", cooldown: 10 },
  "!rapazes": { url: "https://www.myinstants.com/media/sounds/sua-mae-sabe-que-voce-gosta-de-rapazes.mp3", level: "elite", cooldown: 10 },
  "!kiko": { url: "https://www.myinstants.com/media/sounds/a-risada-do-kiko.mp3", level: "elite", cooldown: 10 },
  "!motivacional": { url: "https://www.myinstants.com/media/sounds/bom-dia-motivacional.mp3", level: "elite", cooldown: 10 },
  "!cr7": { url: "https://www.myinstants.com/media/sounds/cr7-bom-dia.mp3", level: "elite", cooldown: 10 },
  "!gay": { url: "https://www.myinstants.com/media/sounds/eai-gay.mp3", level: "elite", cooldown: 10 },
  "!problema": { url: "https://www.myinstants.com/media/sounds/e-quem-disse-que-isso-e-problema-meu_Gm6JrGL.mp3", level: "elite", cooldown: 10 },
  "!escolhido": { url: "https://www.myinstants.com/media/sounds/voce-era-o-escolhido_HNzKCcc.mp3", level: "elite", cooldown: 10 },
  "!cachorro": { url: "https://www.myinstants.com/media/sounds/eu-conheco-esse-cachorro.mp3", level: "elite", cooldown: 10 },
  "!pain": { url: "https://www.myinstants.com/media/sounds/pain-2.mp3", level: "elite", cooldown: 10 },
  "!tmp": { url: "https://www.myinstants.com/media/sounds/tmpod05oao0.mp3", level: "elite", cooldown: 10 },
  "!spider": { url: "https://www.myinstants.com/media/sounds/miguel-oharris-spider-man-2099.mp3", level: "elite", cooldown: 10 },
  "!file": { url: "https://www.myinstants.com/media/sounds/file_235431.mp3", level: "elite", cooldown: 10 },
  "!heroi": { url: "https://www.myinstants.com/media/sounds/um-heroi.mp3", level: "elite", cooldown: 10 },
  "!naosobrou": { url: "https://www.myinstants.com/media/sounds/nao-sobrou-nada_fZprXSC.mp3", level: "elite", cooldown: 10 },
  "!chuva": { url: "https://www.myinstants.com/media/sounds/ta-chovendo-ai-aqui-ta-chovendo-download-na-descricao.mp3", level: "elite", cooldown: 10 },
  "!monark": { url: "https://www.myinstants.com/media/sounds/acorda-monark.mp3", level: "elite", cooldown: 10 },
  "!fart2": { url: "https://www.myinstants.com/media/sounds/fartmeme.mp3", level: "elite", cooldown: 10 },
  "!pablo": { url: "https://www.myinstants.com/media/sounds/pablo-chora-nao-bebe-desculpe-ai-audio-oficial.mp3", level: "elite", cooldown: 10 },
  "!velhos": { url: "https://www.myinstants.com/media/sounds/velhos-brigando-arreia.mp3", level: "elite", cooldown: 10 },
  "!ferrei": { url: "https://www.myinstants.com/media/sounds/me-ferrei-amigos-estevao.mp3", level: "elite", cooldown: 10 },
  "!risada": { url: "https://www.myinstants.com/media/sounds/neg_cio_de_risada_pra_mim_original_source_-1.mp3", level: "furia", cooldown: 10 },
  "!miauu": { url: "https://www.myinstants.com/media/sounds/miauuuuuuuu.mp3", level: "furia", cooldown: 10 },
  "!bolso": { url: "https://www.myinstants.com/media/sounds/bolsonaro-porcaria-bosta-bosta.mp3", level: "furia", cooldown: 10 },
  "!cebolinha": { url: "https://www.myinstants.com/media/sounds/28-cebolinha-xinga.mp3", level: "furia", cooldown: 10 },
  "!grr": { url: "https://www.myinstants.com/media/sounds/dame-un-grr-troll.mp3", level: "furia", cooldown: 10 },
  "!lutador": { url: "https://www.myinstants.com/media/sounds/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-e-lutador.mp3", level: "furia", cooldown: 10 },
  "!prowler": { url: "https://www.myinstants.com/media/sounds/prowler-sound-effect_6bXErot.mp3", level: "furia", cooldown: 10 },
  "!jojo": { url: "https://www.myinstants.com/media/sounds/jojos-bizarre-adventure-ay-ay-ay-ay-_-sound-effect.mp3", level: "furia", cooldown: 10 },
  "!porra": { url: "https://www.myinstants.com/media/sounds/porra-3.mp3", level: "furia", cooldown: 10 },
  "!heart": { url: "https://www.myinstants.com/media/sounds/can-you-feel-my-heart-a.mp3", level: "furia", cooldown: 10 },
  "!caganeira": { url: "https://www.myinstants.com/media/sounds/caganeira-gordurosa.mp3", level: "furia", cooldown: 10 },
  "!galinha": { url: "https://www.myinstants.com/media/sounds/galinha-gritando-no-telhado.mp3", level: "furia", cooldown: 10 },
  "!mendigo": { url: "https://www.myinstants.com/media/sounds/aqui-e-papo-de-mendigo.mp3", level: "furia", cooldown: 10 },
  "!ai": { url: "https://www.myinstants.com/media/sounds/ai-meu-c.mp3", level: "furia", cooldown: 10 },
  "!tira": { url: "https://www.myinstants.com/media/sounds/para-tira.mp3", level: "furia", cooldown: 10 },
  "!longfart": { url: "https://www.myinstants.com/media/sounds/long-brain-fart.mp3", level: "furia", cooldown: 10 },
  "!vagabunda": { url: "https://www.myinstants.com/media/sounds/chora-nao-vagabunda-meme.mp3", level: "furia", cooldown: 10 },
  "!tobias": { url: "https://www.myinstants.com/media/sounds/tu-da-muito-o-teu-tobias.mp3", level: "furia", cooldown: 10 },
  "!deg": { url: "https://www.myinstants.com/media/sounds/deg-deg_4M6Cojn.mp3", level: "furia", cooldown: 10 },
  "!maconha": { url: "https://www.myinstants.com/media/sounds/olha-a-maconhaa.mp3", level: "furia", cooldown: 10 },
  "!calaboca": { url: "https://www.myinstants.com/media/sounds/ai-que-nao-sei-oque-cala-boca.mp3", level: "furia", cooldown: 10 },
  "!tuntun": { url: "https://www.myinstants.com/media/sounds/tun-tun-forro.mp3", level: "apocalipse", cooldown: 10 },
  "!zap": { url: "https://www.myinstants.com/media/sounds/som-do-zap-zap-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!rojao": { url: "https://www.myinstants.com/media/sounds/rojao-super-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!pou": { url: "https://www.myinstants.com/media/sounds/pou-estourado_zIWCpMy.mp3", level: "apocalipse", cooldown: 10 },
  "!sigma": { url: "https://www.myinstants.com/media/sounds/musica-de-sigma-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!copao": { url: "https://www.myinstants.com/media/sounds/de-copao-na-mao-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!susto": { url: "https://www.myinstants.com/media/sounds/susto-funk-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!dolly": { url: "https://www.myinstants.com/media/sounds/dolly-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!iphone": { url: "https://www.myinstants.com/media/sounds/toque-do-iphone-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!plantao": { url: "https://www.myinstants.com/media/sounds/musica-do-plantao-da-globo-estourado.mp3", level: "apocalipse", cooldown: 10 },
  "!corinthians": { url: "https://www.myinstants.com/media/sounds/vai-corinthians-estouradasso.mp3", level: "apocalipse", cooldown: 10 },
  "!galaxy": { url: "https://www.myinstants.com/media/sounds/galaxy-meme.mp3", level: "apocalipse", cooldown: 10 },
  "!mensagem": { url: "https://www.myinstants.com/media/sounds/olha-a-mensagem-b_Rp09o17.mp3", level: "apocalipse", cooldown: 10 },
  "!scream": { url: "https://www.myinstants.com/media/sounds/exorcist-scary-scream.mp3", level: "apocalipse", cooldown: 10 },
  "!gmidao": { url: "https://www.myinstants.com/media/sounds/gmidao-do-zap.mp3", level: "apocalipse", cooldown: 10 },
  "!acorda": { url: "https://www.myinstants.com/media/sounds/acorda-estouradao.mp3", level: "apocalipse", cooldown: 10 },
  "!vasco": { url: "https://www.myinstants.com/media/sounds/vasco-da-gama.mp3", level: "apocalipse", cooldown: 10 },
  "!danone": { url: "https://www.myinstants.com/media/sounds/olha-o-carro-do-danone-em-estourado.mp3", level: "apocalipse", cooldown: 10 }
};

function iniciarTimer(){if(timer)return;timer=setInterval(()=>{tempoRestante--;if(tempoRestante<=0){clearInterval(timer);timer=null;tempoRestante=0;nivelAtivo=0;atualizarHUD();enviarEstadoPainel()}},1000)}
function showDonateToast(text){}
let donateQueueValor=0,donateQueueCount=0,donateQueueMaxNivel=0,donateFlushTimer=null,lastTipKey=null;
function parseValor(rawAmount){const s=String(rawAmount).replace("R$","").replace(/\s/g,"").replace(",",".");const v=parseFloat(s);return Number.isFinite(v)?v:NaN}
function nivelPorFaixa(valor){if(valor>=50)return 4;if(valor>=25)return 3;if(valor>=5)return 2;if(valor>=1)return 1;return 0}
window.addEventListener("onEventReceived",function(obj){const listener=obj?.detail?.listener;if(listener==="tip-latest"){const ev=obj.detail.event||{};const valor=parseValor(ev.amount);if(isNaN(valor))return;const bucket=Math.floor(Date.now()/3000);const tipKey=ev._id||ev.id||ev.transactionId||ev.createdAt||`${valor}:${ev.name||ev.username||""}:${bucket}`;if(tipKey&&tipKey===lastTipKey)return;lastTipKey=tipKey;const nivelNovo=nivelPorFaixa(valor);const tempoExtra=Math.floor(valor*segundosPorReal);tempoRestante+=tempoExtra;if(nivelNovo>nivelAtivo)nivelAtivo=nivelNovo;iniciarTimer();atualizarHUD();enviarEstadoPainel();donateQueueValor+=valor;donateQueueCount+=1;donateQueueMaxNivel=Math.max(donateQueueMaxNivel,nivelNovo);if(donateFlushTimer)clearTimeout(donateFlushTimer);donateFlushTimer=setTimeout(()=>{donateQueueValor=0;donateQueueCount=0;donateQueueMaxNivel=0;donateFlushTimer=null},5000);return}
if(listener!=="message")return;const msg=obj.detail.event.data.text.trim().toLowerCase();const user=obj.detail.event.data.nick.trim().toLowerCase();if(user===ADMIN_NICK){if(msg.startsWith("!setreal ")){const novoValor=parseInt(msg.split(" ")[1],10);if(!isNaN(novoValor)&&novoValor>0){segundosPorReal=novoValor;atualizarHUD()}return}if(msg==="!statusadmin"){atualizarHUD();console.log("[STATUS]",{nivelAtivo,tempoRestante,segundosPorReal});return}const adminMap={"!vipadmin":{nivel:1,tempo:300},"!eliteadmin":{nivel:2,tempo:600},"!furiaadmin":{nivel:3,tempo:1800},"!apocalipseadmin":{nivel:4,tempo:3600}};if(adminMap[msg]){const {nivel,tempo}=adminMap[msg];nivelAtivo=nivel;tempoRestante=tempo;if(timer){clearInterval(timer);timer=null}iniciarTimer();atualizarHUD();enviarEstadoPainel();return}if(msg==="!resetadmin"){nivelAtivo=0;tempoRestante=0;if(timer){clearInterval(timer);timer=null}atualizarHUD();enviarEstadoPainel();return}}
tocarSomComando(msg)});

function tocarSomComando(msg){const som=sons[msg];if(!som)return;const nivelNecessario=nivelNumero[som.level];if(nivelAtivo<nivelNecessario)return;const now=Date.now();const cdNivel=(cooldownPorNivel[som.level]??10)*1000;const lastNivel=lastPlay.byLevel[som.level]||0;if(now-lastNivel<cdNivel)return;lastPlay.byLevel[som.level]=now;audio.pause();audio.currentTime=0;audio.src=som.url;audio.play().catch(err=>console.warn('[AUDIO]',err))}

let remoteChannel = null;
let remoteOnline = false;

function enviarEstadoPainel() {
  if (!remoteChannel || !remoteOnline) return;

  remoteChannel.send({
    type: "broadcast",
    event: "state",
    payload: {
      nivelAtivo,
      tempoRestante,
      timestamp: Date.now()
    }
  });
}

(function iniciarControleRemoto() {
  if (!window.supabase || !window.SB_CONFIG) {
    console.warn("[REMOTE] configuração ausente");
    return;
  }

  const client = window.supabase.createClient(
    SB_CONFIG.SUPABASE_URL,
    SB_CONFIG.SUPABASE_ANON_KEY
  );

  remoteChannel = client.channel(SB_CONFIG.ROOM_ID);

  remoteChannel
    .on("broadcast", { event: "sound" }, ({ payload }) => {
      const command = payload?.command;
      if (command && sons[command]) {
        tocarSomComando(command);
      }
    })
    .on("broadcast", { event: "state_request" }, () => {
      enviarEstadoPainel();
    })
    .subscribe(status => {
      console.log("[REMOTE]", status);

      remoteOnline = status === "SUBSCRIBED";

      if (remoteOnline) {
        enviarEstadoPainel();

        setInterval(() => {
          enviarEstadoPainel();
        }, 5000);
      }
    });
})();

atualizarHUD();
