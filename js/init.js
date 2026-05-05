// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  // Fechar modais ao clicar no overlay
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });

  // Tenta restaurar sessão existente (evita re-login ao recarregar)
  const restored = await tryRestoreSession();

  if (restored) {
    try {
      await updatePendBadge();
      _cacheColabs = await dbGetColabs();
      refreshColabDatalist();
    } catch (e) {
      console.warn('[Init] Erro pós-sessão:', e.message);
    }
  }
});
