let CATEGORIAS = [];
const NIVEIS = [
  { key:"suave", label:"🟢 SUAVE", level:0 },
  { key:"vip", label:"🟣 VIP", level:1 },
  { key:"elite", label:"🔵 ELITE", level:2 },
  { key:"furia", label:"🟠 FÚRIA", level:3 },
  { key:"apocalipse", label:"🔴 APOCALIPSE", level:4 }
];

async function carregarCatalogo() {
  try {
    const resposta = await fetch("https://xguiler.github.io/soundboard/sons.json?v=" + Date.now());
    if (!resposta.ok) throw new Error("HTTP " + resposta.status);

    const catalogo = await resposta.json();

    CATEGORIAS = NIVEIS.map(nivel => ({
      ...nivel,
      sons: Object.entries(catalogo)
        .filter(([command, som]) => som && som.level === nivel.key)
        .map(([command]) => command)
    })).filter(categoria => categoria.sons.length);

    renderizarCategorias();
  } catch (erro) {
    console.error("[CATALOGO] erro ao carregar sons.json:", erro);
    status.textContent = "🔴 Erro no catálogo";
    status.className = "status offline";
  }
}



const COOLDOWN_POR_NIVEL = [15,10,8,7,3];

const status = document.getElementById("status");
const grid = document.getElementById("grid");
const infoToggle = document.getElementById("infoToggle");
const info = document.getElementById("info");
const totalVisitsEl = document.getElementById("totalVisits");
const onlineNowEl = document.getElementById("onlineNow");
const peakOnlineEl = document.getElementById("peakOnline");
const randomButton = document.getElementById("randomButton");

const client = supabase.createClient(SB_CONFIG.SUPABASE_URL, SB_CONFIG.SUPABASE_ANON_KEY);
const channel = client.channel(SB_CONFIG.ROOM_ID);

let nivelAtivo = 0;
let tempoRestante = 0;
let cooldownRestante = 0;
let cooldownAte = 0;
let ultimaAtualizacao = 0;
let liveOnline = false;
let ultimoEstadoTimestamp = 0;

const VISITOR_ID_KEY = "xguiler_soundboard_visitor_id";

function obterVisitorId() {
  let id = localStorage.getItem(VISITOR_ID_KEY);

  if(!id){
    if(window.crypto && crypto.randomUUID){
      id=crypto.randomUUID();
    }else{
      id="v-"+Date.now()+"-"+Math.random().toString(36).slice(2);
    }

    localStorage.setItem(VISITOR_ID_KEY,id);
  }

  return id;
}

function atualizarStatsUI(stats) {
  if(!stats)return;

  if(totalVisitsEl) totalVisitsEl.textContent=Number(stats.total_visits||0).toLocaleString("pt-BR");
  if(onlineNowEl) onlineNowEl.textContent=Number(stats.online||0).toLocaleString("pt-BR");
  if(peakOnlineEl) peakOnlineEl.textContent=Number(stats.peak_online||0).toLocaleString("pt-BR");
}

async function registrarVisita() {
  try{
    const visitorId=obterVisitorId();

    const {data,error}=await client.rpc("register_site_visit",{
      p_visitor_id:visitorId
    });

    if(error) throw error;

    atualizarStatsUI(data);
  }catch(error){
    console.error("Erro ao registrar visita:",error);
  }
}

async function enviarHeartbeat() {
  try{
    const visitorId=obterVisitorId();

    const {data,error}=await client.rpc("heartbeat_site_visitor",{
      p_visitor_id:visitorId
    });

    if(error) throw error;

    atualizarStatsUI(data);
  }catch(error){
    console.error("Erro no heartbeat:",error);
  }
}

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
  const restante=Math.max(0,Math.ceil((cooldownAte-Date.now())/1000));
  cooldownRestante=restante;
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

    // O tempo e o cooldown são globais da Soundboard,
    // então aparecem em todos os níveis visíveis.
    const time=document.createElement("span");
    time.className="level-time";
    time.textContent="~ "+formatarTempo(tempoRestante);
    title.appendChild(time);

    const cooldown=document.createElement("span");
    const restante=Math.max(0,Math.ceil((cooldownAte-Date.now())/1000));
    cooldown.className=restante>0 ? "level-cooldown active" : "level-cooldown ready";
    cooldown.textContent=restante>0 ? "⏳ "+restante+"s" : "🔊 PRONTO";
    title.appendChild(cooldown);

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

        try {
          const result=await channel.send({
            type:"broadcast",
            event:"sound",
            payload:{command}
          });

          if(result!=="ok"){
            console.error("[SOUNDBOARD] channel.send retornou:", result);
            status.textContent="🔴 Erro: "+(typeof result==="string" ? result : JSON.stringify(result));
            status.className="status offline";
            button.disabled=false;
            return;
          }
        } catch(error) {
          console.error("[SOUNDBOARD] erro no envio:", error);
          status.textContent="🔴 Erro: "+(error?.message || String(error));
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

async function tocarRandom() {
  if(Date.now()<cooldownAte){
    atualizarCabecalho();
    renderizarCategorias();
    return;
  }

  const sonsDisponiveis=CATEGORIAS
    .filter(categoria=>categoria.level<=nivelAtivo)
    .flatMap(categoria=>categoria.sons);

  if(!sonsDisponiveis.length)return;

  const command=sonsDisponiveis[
    Math.floor(Math.random()*sonsDisponiveis.length)
  ];

  randomButton.disabled=true;

  try {
    const result=await channel.send({
      type:"broadcast",
      event:"sound",
      payload:{command}
    });

    if(result!=="ok"){
      console.error("[SOUNDBOARD] random channel.send retornou:", result);
      status.textContent="🔴 Erro: "+(typeof result==="string" ? result : JSON.stringify(result));
      status.className="status offline";
      randomButton.disabled=false;
      return;
    }
  } catch(error) {
    console.error("[SOUNDBOARD] erro no random:", error);
    status.textContent="🔴 Erro: "+(error?.message || String(error));
    status.className="status offline";
    randomButton.disabled=false;
    return;
  }

  setTimeout(()=>{
    randomButton.disabled=false;
    renderizarCategorias();
  },150);
}

if(randomButton){
  randomButton.addEventListener("click",tocarRandom);
}

function aplicarEstado(payload) {
  if(!payload)return;

  const ts=Number(payload.timestamp)||0;
  if(ts && ts<ultimoEstadoTimestamp)return;
  if(ts)ultimoEstadoTimestamp=ts;

  nivelAtivo=Math.min(4,Math.max(0,Number(payload.nivelAtivo)||0));
  tempoRestante=Math.max(0,Number(payload.tempoRestante)||0);
  cooldownAte=Math.max(0,Number(payload.cooldownAte)||0);

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

registrarVisita();
enviarHeartbeat();
setInterval(enviarHeartbeat,10000);

atualizarCabecalho();
carregarCatalogo();
