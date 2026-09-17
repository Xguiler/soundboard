// ============================
// CONTROLE REMOTO - SOUNDBOARD
// ============================
// Este arquivo conecta o soundboard do OBS ao painel online.
// Deve ser carregado DEPOIS de soundboard.js.

(function iniciarControleRemoto() {
  if (!window.supabase || !window.SB_CONFIG) {
    console.error('[REMOTE] Supabase/config não encontrados.');
    return;
  }

  const client = window.supabase.createClient(
    window.SB_CONFIG.SUPABASE_URL,
    window.SB_CONFIG.SUPABASE_ANON_KEY
  );

  const channel = client.channel(window.SB_CONFIG.ROOM_ID);

  channel
    .on('broadcast', { event: 'sound' }, ({ payload }) => {
      const command = payload?.command;
      console.log('[REMOTE] comando recebido:', command);

      if (!command || !sons[command]) {
        console.warn('[REMOTE] comando inexistente:', command);
        return;
      }

      const som = sons[command];
      const nivelNecessario = nivelNumero[som.level];

      if (nivelAtivo < nivelNecessario) {
        console.log('[REMOTE] nível bloqueado:', command);
        return;
      }

      const agora = Date.now();
      const cooldown = (som.cooldown ?? cooldownPorNivel[som.level] ?? 3) * 1000;
      const ultimo = lastPlay.byLevel[som.level] || 0;

      if (agora - ultimo < cooldown) {
        console.log('[REMOTE] cooldown:', command);
        return;
      }

      lastPlay.byLevel[som.level] = agora;

      audio.pause();
      audio.currentTime = 0;
      audio.src = som.url;

      audio.play()
        .then(() => console.log('[REMOTE] tocando:', command))
        .catch(err => console.error('[REMOTE] erro ao tocar:', err));
    })
    .subscribe(status => {
      console.log('[REMOTE] conexão:', status);
    });
})();
