// ===================== UTILITIES =====================
function notify(msg, type = 'success') {
  const div = document.createElement('div');
  div.className = `notif ${type}`;
  const icon = type === 'success' ? 'bi-check-circle-fill' : 'bi-x-circle-fill';
  div.innerHTML = `<i class="bi ${icon}"></i> ${msg}`;
  document.getElementById('notifStack').appendChild(div);
  setTimeout(() => div.remove(), 3000);
}
function fmtDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR'); }
function statusBadge(s) {
  const map = { 'disponivel': 'badge-green', 'em uso': 'badge-blue', 'manutencao': 'badge-yellow', 'estoque': 'badge-gray', 'descartado': 'badge-red', 'quebrado': 'badge-red', 'ativo': 'badge-green', 'inativo': 'badge-gray', 'pendente': 'badge-yellow', 'em preparacao': 'badge-blue', 'em andamento': 'badge-blue', 'enviado': 'badge-purple', 'entregue': 'badge-green', 'cancelado': 'badge-red' };
  const labels = { 'disponivel': 'Disponível', 'em uso': 'Em Uso', 'manutencao': 'Manutenção', 'estoque': 'Estoque', 'descartado': 'Descartado', 'quebrado': 'Quebrado', 'ativo': 'Ativo', 'inativo': 'Inativo', 'pendente': 'Pendente', 'em preparacao': 'Em Preparação', 'em andamento': 'Em Andamento', 'enviado': 'Enviado', 'entregue': 'Entregue', 'cancelado': 'Cancelado' };
  return `<span class="badge ${map[s] || 'badge-gray'}"><span class="dot"></span>${labels[s] || s}</span>`;
}
// Retorna badge correto para um registro de kit_historico
// Usa o campo `status` se existir (nova coluna); senão usa o campo `cancelado` como fallback
function kitStatusBadge(h) {
  if (h.cancelado) return '<span class="badge badge-red"><span class="dot"></span>Cancelado</span>';
  const s = h.status || 'pendente';
  const map = {
    'pendente':      { cls: 'badge-yellow',  label: 'Pendente' },
    'em preparacao': { cls: 'badge-blue',    label: 'Em Preparação' },
    'enviado':       { cls: 'badge-purple',  label: 'Enviado' },
    'entregue':      { cls: 'badge-green',   label: 'Entregue' },
  };
  const { cls, label } = map[s] || { cls: 'badge-gray', label: s };
  return `<span class="badge ${cls}"><span class="dot"></span>${label}</span>`;
}
function saudeBadge(s) {
  if (s === 'bom') return '<span class="health-good"><i class="bi bi-circle-fill"></i> Bom</span>';
  if (s === 'regular') return '<span class="health-warn"><i class="bi bi-circle-fill"></i> Regular</span>';
  return '<span class="health-bad"><i class="bi bi-circle-fill"></i> Ruim</span>';
}
function garantiaBadge(d) {
  if (!d) return '<span class="badge badge-gray">Sem garantia</span>';
  const exp = new Date(d) < new Date();
  return exp ? '<span class="badge badge-red"><i class="bi bi-exclamation-triangle"></i> Expirada</span>' : '<span class="badge badge-green"><i class="bi bi-check-lg"></i> Válida</span>';
}


// ===================== MODAL HELPERS =====================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
function openExportModal() { openModal('modalExport'); }
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
});


// ===================== GLOBAL SEARCH =====================
function handleSearch(val) {
  const page = document.querySelector('.page.active').id.replace('page-', '');
  if (page === 'dashboard') renderDashboard();
  if (page === 'ativos') renderAtivos();
  if (page === 'monitores') renderMonitores();
  if (page === 'celulares') renderCelulares();
  if (page === 'colaboradores') renderColabs();
}
