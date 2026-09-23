const CATEGORIAS = [
  { key:"suave", label:"🟢 SUAVE", level:0, sons:["!peido","!peido2","!peido3","!peidofunk","!madeira","!cavalo","!undaia","!elegosta","!ui","!tome","!fart","!raze","!defuse","!plant","!chamber","!gekko","!dancagatinho","!qissomeufilho","!derrame","!pare","!fah","!vineboom","!rizz","!among","!aiqdlc","!bigfa","!brbr","!calado","!pix"] },
  { key:"vip", label:"🟣 VIP", level:1, sons:["!brutal","!falei","!oruam","!freio","!cebolinha2","!wow2","!wow","!dexter","!nemesis","!brass","!indian","!ack","!heehee","!donald","!engracado","!gordo","!aura","!ego","!gripada","!moreno","!lavando","!obrigado","!ui2","!movie","!sentimento","!fail"] },
  { key:"elite", label:"🔵 ELITE", level:2, sons:["!auuu","!like","!cooked","!wnd","!rapazes","!kiko","!motivacional","!cr7","!gay","!problema","!escolhido","!cachorro","!pain","!tmp","!spider","!file","!heroi","!naosobrou","!chuva","!monark","!fart2","!pablo","!velhos","!ferrei"] },
  { key:"furia", label:"🟠 FÚRIA", level:3, sons:["!risada","!miauu","!bolso","!cebolinha","!grr","!lutador","!prowler","!jojo","!porra","!heart","!caganeira","!galinha","!mendigo","!ai","!tira","!longfart","!vagabunda","!tobias","!deg","!maconha","!calaboca"] },
  { key:"apocalipse", label:"🔴 APOCALIPSE", level:4, sons:["!tuntun","!zap","!rojao","!pou","!sigma","!copao","!susto","!dolly","!iphone","!plantao","!corinthians","!galaxy","!mensagem","!scream","!gmidao","!acorda","!vasco","!danone"] }
];

const COOLDOWN_POR_NIVEL = [15,10,8,7,3];

const status = document.getElementById("status");
const grid = document.getElementById("grid");
const currentLevel = document.getElementById("currentLevel");
const currentTime = document.getElementById("currentTime");
const cooldownDisplay = document.getElementById("cooldownDisplay");
const infoToggle = document.getElementById("infoToggle");
const info = document.getElementById("info");

const client = supabase.createClient(SB_CONFIG.SUPABASE_URL, SB_CONFIG.SUPABASE_ANON_KEY);
const channel = client.channel(SB_CONFIG.ROOM_ID);

let nivelAtivo = 0;
let tempoRestante = 0;
let cooldownRestante = 0;
let cooldownAte = 0;
let ultimaAtualizacao = 0;
let liveOnline = false;
let ultimoEstadoTimestamp = 0;

function formatarTempo(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "∞";
  const s=Math.max(0,Math.floor(segundos));
  const h=Math.floor(s/3600);
  const m=Math.floor((s%3600)/60);
  const sec=s%60;
  if(h>0) return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
  return String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
}

function nomeNivel(nivel) {
  return ["SUAVE","VIP","ELITE","FÚRIA","APOCALIPSE"][nivel] || "SUAVE";
}

function cooldownDoNivel() {
  return COOLDOWN_POR_NIVEL[nivelAtivo] ?? 15;
}

function atualizarCabecalho() {
  currentLevel.textContent=nomeNivel(nivelAtivo);
  currentTime.textContent=tempoRestante>0 ? formatarTempo(tempoRestante) : "∞";

  const restante=Math.max(0,Math.ceil((cooldownAte-Date.now())/1000));
  cooldownRestante=restante;

  if(cooldownDisplay){
    cooldownDisplay.textContent=restante>0 ? "⏳ Próximo som em "+restante+"s" : "🔊 PRONTO PARA TOCAR";
    cooldownDisplay.className=restante>0 ? "cooldown active" : "cooldown ready";
  }
}

function renderizarCategorias() {
  grid.innerHTML="";
  CATEGORIAS.filter(categoria=>categoria.level<=nivelAtivo).forEach(categoria=>{
    const section=document.createElement("section");
    section.className="level";

    const title=document.createElement("div");
    title.className="level-title";

    const titleText=document.createElement("span");
    titleText.textContent=categoria.label;
    title.appendChild(titleText);

    if(categoria.level===nivelAtivo && tempoRestante>0){
      const time=document.createElement("span");
      time.className="level-time";
      time.textContent="~ "+formatarTempo(tempoRestante);
      title.appendChild(time);
    }

    section.appendChild(title);

    const buttons=document.createElement("div");
    buttons.className="buttons";

    categoria.sons.forEach(command=>{
      const button=document.createElement("button");
      button.textContent=command;

      button.onclick=async()=>{
        if(Date.now()<cooldownAte){
          atualizarCabecalho();
          renderizarCategorias();
          return;
        }

        button.disabled=true;

        const result=await channel.send({
          type:"broadcast",
          event:"sound",
          payload:{command}
        });

        if(result!=="ok"){
          status.textContent="🔴 Erro ao enviar";
          status.className="status offline";
          button.disabled=false;
          return;
        }

        setTimeout(()=>renderizarCategorias(),150);
      };

      buttons.appendChild(button);
    });

    section.appendChild(buttons);
    grid.appendChild(section);
  });

  if(cooldownRestante>0){
    grid.classList.add("cooldown-active");
  }else{
    grid.classList.remove("cooldown-active");
  }
}

function aplicarEstado(payload) {
  if(!payload)return;

  const ts=Number(payload.timestamp)||0;
  if(ts && ts<ultimoEstadoTimestamp)return;
  if(ts)ultimoEstadoTimestamp=ts;

  nivelAtivo=Math.min(4,Math.max(0,Number(payload.nivelAtivo)||0));
  tempoRestante=Math.max(0,Number(payload.tempoRestante)||0);
  cooldownAte=Math.max(0,Number(payload.cooldownAte)||0);

  // Compatibilidade com estados antigos.
  if(!cooldownAte && Number(payload.cooldownRestante)>0){
    cooldownAte=Date.now()+Number(payload.cooldownRestante)*1000;
  }

  ultimaAtualizacao=Date.now();
  liveOnline=true;
  status.textContent="🟢 Conectado";
  status.className="status online";

  atualizarCabecalho();
  renderizarCategorias();
}

channel
  .on("broadcast",{event:"state"},({payload})=>aplicarEstado(payload))
  .subscribe(async state=>{
    if(state==="SUBSCRIBED"){
      status.textContent="🟡 Aguardando live...";
      status.className="status waiting";
      await channel.send({type:"broadcast",event:"state_request",payload:{}});
    }else{
      liveOnline=false;
      status.textContent="🔴 Offline";
      status.className="status offline";
    }
  });
if(infoToggle){
  infoToggle.addEventListener("click",()=>{
    const aberto=info.classList.toggle("open");
    infoToggle.textContent=aberto ? "ℹ️ OCULTAR COMO FUNCIONA" : "ℹ️ COMO FUNCIONA";
  });
}

setInterval(()=>{
  if(!liveOnline)return;

  if(tempoRestante>0){
    tempoRestante=Math.max(0,tempoRestante-1);
  }

  atualizarCabecalho();
  renderizarCategorias();
},1000);

setInterval(()=>{
  if(Date.now()-ultimaAtualizacao>12000){
    liveOnline=false;
    status.textContent="🔴 Offline";
    status.className="status offline";
  }
},2000);

atualizarCabecalho();
renderizarCategorias();

.on(
  "broadcast",
  { event: "state" },
  ({ payload }) => {
      // atualizar nível
      // atualizar tempo
      // liberar/bloquear sons
  }
)
