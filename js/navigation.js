// ===================== NAVIGATION =====================
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-'+page);
  if(el) el.classList.add('active');
  const navEl = document.querySelector(`.nav-item[onclick="goTo('${page}')"]`);
  if(navEl) navEl.classList.add('active');

  // Close sidebar on mobile after clicking
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }

  const titles = {
    dashboard: 'Dashboard',
    ativos: 'Ativos',
    colaboradores: 'Colaboradores',
    historico: 'Histórico de Uso',
    kits: 'Kits Boas-Vindas',
    solicitacoes: 'Solicitações',
    monitores: 'Monitores',
    celulares: 'Celulares',
    'area-cliente': 'Área do Cliente'
  };
  const subs = {
    dashboard: 'Visão geral do Inventário de TI',
    ativos: 'Gerencie todos os equipamentos',
    colaboradores: 'Colaboradores e vínculos com ativos',
    historico: 'Registro completo de movimentações',
    kits: 'Controle de kits de boas-vindas',
    solicitacoes: 'Pedidos de máquinas e onboarding',
    monitores: 'Gerencie monitores e telas',
    celulares: 'Controle de aparelhos e linhas corporativas',
    'area-cliente': 'Portal do colaborador'
  };

  document.getElementById('pageTitle').textContent = titles[page] || page;
  const subEl = document.getElementById('pageSub');
  if(subEl) subEl.textContent = subs[page] || '';

  const addBtns = { ativos: true, colaboradores: true, monitores: true, celulares: true };
  const addBtn = document.getElementById('topbarAdd');
  if(addBtn) {
    addBtn.style.display = addBtns[page] ? 'flex' : 'none';
    let label = 'Novo Ativo';
    if(page === 'colaboradores') label = 'Novo Colaborador';
    if(page === 'monitores') label = 'Novo Monitor';
    if(page === 'celulares') label = 'Novo Celular';
    addBtn.innerHTML = `+ <span class="hide-mobile">${label}</span>`;
  }

  if(page === 'dashboard') renderDashboard();
  if(page === 'ativos') renderAtivos();
  if(page === 'monitores') renderMonitores();
  if(page === 'celulares') renderCelulares();
  if(page === 'colaboradores') renderColabs();
  if(page === 'historico') renderHistorico();
  if(page === 'kits') { renderKitTab(); }
  if(page === 'solicitacoes') renderSolicitacoes();
  if(page === 'area-cliente') { renderClientTab('solicitar'); }
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.toggle('open');
}
