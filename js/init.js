// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', async () => {
  // Fechar modais ao clicar no overlay
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
  // Badge inicial — silencioso se banco ainda não estiver acessível
  try {
    await updatePendBadge();
    _cacheColabs = await dbGetColabs();
    refreshColabDatalist();
  } catch(e) {
    console.warn('[Init] Supabase não disponível ainda:', e.message);
  }
});
