/* Cliente Supabase Realtime simplificado para o painel da extensão Twitch. */
(function(){
  const cfg=window.SB_CONFIG;
  const handlers={broadcast:[],status:[]};
  let ws=null,ref=0,reconnectTimer=null,connected=false,joinRef=null;
  const pending=new Map();
  const api={
    connect,
    on(type,fn){(handlers[type]||(handlers[type]=[])).push(fn);return api;},
    sendBroadcast(eventName,message){return sendBroadcast(eventName,message);},
    isConnected(){return connected;}
  };
  window.SBRealtime=api;
  function nextRef(){return String(++ref)}
  function emit(type,payload){(handlers[type]||[]).slice().forEach(fn=>{try{fn(payload)}catch(e){console.error('[SBRealtime] handler:',e)}})}
  function schedule(){clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,3000)}
  const base=new URL(cfg.SUPABASE_URL);
  const wsUrl=(base.protocol==='https:'?'wss:':'ws:')+'//'+base.host+'/realtime/v1/websocket?apikey='+encodeURIComponent(cfg.SUPABASE_ANON_KEY)+'&vsn=1.0.0';
  function connect(){
    clearTimeout(reconnectTimer);
    if(ws&&(ws.readyState===WebSocket.OPEN||ws.readyState===WebSocket.CONNECTING))return;
    try{ws=new WebSocket(wsUrl)}catch(e){emit('status','ERROR');schedule();return}
    ws.onopen=()=>{
      joinRef=nextRef();
      ws.send(JSON.stringify({topic:'realtime:'+cfg.ROOM_ID,event:'phx_join',payload:{config:{broadcast:{ack:true,self:false},presence:{key:''},postgres_changes:[]},access_token:cfg.SUPABASE_ANON_KEY},ref:joinRef,join_ref:joinRef}));
    };
    ws.onmessage=(ev)=>{
      let m;try{m=JSON.parse(ev.data)}catch(e){return}
      if(m.event==='phx_reply'){
        const key=String(m.ref||'');
        const waiter=pending.get(key);
        if(waiter){pending.delete(key);clearTimeout(waiter.timer);waiter.resolve(m.payload?.status==='ok'?'ok':'error')}
        if(key===String(joinRef)){
          if(m.payload?.status==='ok'){connected=true;emit('status','SUBSCRIBED')}
          else{connected=false;emit('status','ERROR')}
        }
        return;
      }
      if(m.event==='broadcast'&&m.payload)emit('broadcast',m.payload);
      if(m.event==='phx_error'||m.event==='phx_close'){connected=false;emit('status','CLOSED');try{ws.close()}catch(e){}}
    };
    ws.onerror=()=>{connected=false;emit('status','ERROR')};
    ws.onclose=()=>{connected=false;emit('status','CLOSED');for(const [k,v] of pending){clearTimeout(v.timer);v.resolve('error');pending.delete(k)}schedule()};
  }
  function sendBroadcast(_eventName,message){
    return new Promise((resolve,reject)=>{
      if(!ws||ws.readyState!==WebSocket.OPEN||!connected){reject(new Error('A extensão ainda não está conectada ao Realtime.'));return}
      if(!message||!message.event){reject(new Error('Evento de broadcast inválido.'));return}
      const r=nextRef();
      const timer=setTimeout(()=>{pending.delete(r);resolve('error')},4000);
      pending.set(r,{resolve,timer});
      ws.send(JSON.stringify({topic:'realtime:'+cfg.ROOM_ID,event:'broadcast',payload:{event:message.event,payload:message.payload||{}},ref:r,join_ref:joinRef}));
    });
  }
})();