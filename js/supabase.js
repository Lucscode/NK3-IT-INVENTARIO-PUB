// ===================== LOCAL STORAGE DATABASE =====================
// Substitui o Supabase — todos os dados são persistidos no localStorage do navegador.
// Mesmas assinaturas de função para compatibilidade total com os demais arquivos.

const STORAGE_BUCKET = 'fotos-ativos'; // mantido para compatibilidade (fotos via URL)

// ─── Helpers ─────────────────────────────────────────────────
function _lsGet(key) {
  try { return JSON.parse(localStorage.getItem('techstock_' + key) || 'null'); } catch { return null; }
}
function _lsSet(key, val) {
  try { localStorage.setItem('techstock_' + key, JSON.stringify(val)); } catch(e) {
    console.error('[LocalDB] Erro ao salvar:', e);
    notify('Armazenamento cheio! Exporte dados e limpe o cache.', 'error');
  }
}
function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function _now() { return new Date().toISOString(); }

// ─── Inicializar estruturas se não existirem ──────────────────
(function _init() {
  if (!_lsGet('ativos'))       _lsSet('ativos', []);
  if (!_lsGet('ativo_fotos'))  _lsSet('ativo_fotos', []);
  if (!_lsGet('colaboradores'))_lsSet('colaboradores', []);
  if (!_lsGet('historico'))    _lsSet('historico', []);
  if (!_lsGet('kit_historico'))_lsSet('kit_historico', []);
  if (!_lsGet('solicitacoes')) _lsSet('solicitacoes', []);
  if (!_lsGet('kit_estoque'))  _lsSet('kit_estoque', {
    mochila: 0, squeeze: 0, caderno: 0, caneta: 0, mousepad: 0
  });
})();

// ─── Stub do cliente Supabase (para compatibilidade) ─────────
const sb = null; // não usado mais — mantido para não quebrar checagens de typeof

// ─── ATIVOS ──────────────────────────────────────────────────
async function dbGetAtivos() {
  const list = _lsGet('ativos') || [];
  return list.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0);
}

async function dbGetAtivoById(id) {
  const list  = _lsGet('ativos') || [];
  const ativo = list.find(a => a.id === id);
  if (!ativo) return null;
  const fotos = (_lsGet('ativo_fotos') || []).filter(f => f.ativo_id === id);
  return { ...ativo, ativo_fotos: fotos };
}

async function dbCreateAtivo(payload) {
  const list = _lsGet('ativos') || [];
  const novo = { ...payload, id: _uuid(), created_at: _now() };
  list.unshift(novo);
  _lsSet('ativos', list);
  return novo;
}

async function dbUpdateAtivo(id, payload) {
  const list = _lsGet('ativos') || [];
  const idx  = list.findIndex(a => a.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...payload };
  _lsSet('ativos', list);
  return list[idx];
}

async function dbDeleteAtivo(id) {
  const list  = (_lsGet('ativos') || []).filter(a => a.id !== id);
  const fotos = (_lsGet('ativo_fotos') || []).filter(f => f.ativo_id !== id);
  _lsSet('ativos', list);
  _lsSet('ativo_fotos', fotos);
  return true;
}

// ─── FOTOS (armazenadas como base64 ou URL) ───────────────────
async function dbGetFotos(ativoId) {
  const all = _lsGet('ativo_fotos') || [];
  return all.filter(f => f.ativo_id === ativoId).sort((a, b) => a.ordem - b.ordem);
}

async function dbUploadFoto(ativoId, file, ordem) {
  return new Promise((resolve) => {
    const fotos = _lsGet('ativo_fotos') || [];
    if (fotos.filter(f => f.ativo_id === ativoId).length >= 5) {
      notify('Limite de 5 fotos por ativo', 'error');
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const nova = {
        id: _uuid(),
        ativo_id: ativoId,
        url: e.target.result, // base64
        ordem,
        created_at: _now(),
      };
      fotos.push(nova);
      try {
        _lsSet('ativo_fotos', fotos);
        resolve(nova);
      } catch {
        notify('Foto muito grande para armazenamento local. Use uma imagem menor (max ~1MB).', 'error');
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

async function dbDeleteFoto(fotoId) {
  const fotos = (_lsGet('ativo_fotos') || []).filter(f => f.id !== fotoId);
  _lsSet('ativo_fotos', fotos);
  return true;
}

// ─── COLABORADORES ────────────────────────────────────────────
async function dbGetColabs() {
  const list = _lsGet('colaboradores') || [];
  return list.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
}

async function dbCreateColab(payload) {
  const list = _lsGet('colaboradores') || [];
  const novo = { ...payload, id: _uuid(), created_at: _now() };
  list.push(novo);
  _lsSet('colaboradores', list);
  return novo;
}

async function dbUpdateColab(id, payload) {
  const list = _lsGet('colaboradores') || [];
  const idx  = list.findIndex(c => c.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...payload };
  _lsSet('colaboradores', list);
  return list[idx];
}

async function dbDeleteColab(id) {
  const list = (_lsGet('colaboradores') || []).filter(c => c.id !== id);
  _lsSet('colaboradores', list);
  return true;
}

// ─── HISTÓRICO ────────────────────────────────────────────────
async function dbGetHistorico() {
  const list = _lsGet('historico') || [];
  return list.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0);
}

async function dbAddHistorico(payload) {
  const list = _lsGet('historico') || [];
  list.unshift({ ...payload, id: _uuid(), created_at: _now() });
  _lsSet('historico', list);
}

// ─── KITS ─────────────────────────────────────────────────────
async function dbGetKitEstoque() {
  return _lsGet('kit_estoque') || { mochila: 0, squeeze: 0, caderno: 0, caneta: 0, mousepad: 0 };
}

async function dbUpdateKitItem(item, quantidade) {
  const kits = await dbGetKitEstoque();
  kits[item] = quantidade;
  _lsSet('kit_estoque', kits);
}

async function dbGetKitHistorico() {
  const list = _lsGet('kit_historico') || [];
  return list.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0);
}

async function dbAddKitHistorico(payload) {
  const list = _lsGet('kit_historico') || [];
  const novo = { ...payload, id: _uuid(), created_at: _now() };
  list.unshift(novo);
  _lsSet('kit_historico', list);
  return novo;
}

async function dbUpdateKitHistoricoStatus(id, cancelado) {
  const list = _lsGet('kit_historico') || [];
  const idx  = list.findIndex(h => h.id === id);
  if (idx !== -1) { list[idx].cancelado = cancelado; _lsSet('kit_historico', list); }
}

// ─── SOLICITAÇÕES ─────────────────────────────────────────────
async function dbGetSolicitacoes() {
  const list = _lsGet('solicitacoes') || [];
  return list.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0);
}

async function dbCreateSolicitacao(payload) {
  const list = _lsGet('solicitacoes') || [];
  const nova = { ...payload, id: _uuid(), created_at: _now() };
  list.unshift(nova);
  _lsSet('solicitacoes', list);
  return nova;
}

async function dbUpdateSolStatus(id, status) {
  const list = _lsGet('solicitacoes') || [];
  const idx  = list.findIndex(s => s.id === id);
  if (idx !== -1) { list[idx].status = status; _lsSet('solicitacoes', list); }
}

async function dbDeleteSolicitacao(id) {
  const list = (_lsGet('solicitacoes') || []).filter(s => s.id !== id);
  _lsSet('solicitacoes', list);
  return true;
}

// ─── DASHBOARD STATS ──────────────────────────────────────────
async function dbGetStats() {
  const ativos = _lsGet('ativos') || [];
  return {
    total:       ativos.length,
    disponiveis: ativos.filter(a => a.status === 'disponivel').length,
    emUso:       ativos.filter(a => a.status === 'em uso').length,
    manutencao:  ativos.filter(a => a.status === 'manutencao').length,
  };
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────
async function updatePendBadge() {
  const list  = _lsGet('solicitacoes') || [];
  const count = list.filter(s => s.status === 'pendente').length;
  const el    = document.getElementById('pendBadge');
  if (el) { el.textContent = count || 0; el.style.display = count ? '' : 'none'; }
}

// Exportar backup completo
function exportBackup() {
  const backup = {
    exportedAt:   _now(),
    ativos:       _lsGet('ativos') || [],
    ativo_fotos:  _lsGet('ativo_fotos') || [],
    colaboradores:_lsGet('colaboradores') || [],
    historico:    _lsGet('historico') || [],
    kit_estoque:  _lsGet('kit_estoque') || {},
    kit_historico:_lsGet('kit_historico') || [],
    solicitacoes: _lsGet('solicitacoes') || [],
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `techstock_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  notify('Backup completo exportado!');
}

// Importar backup JSON
function importBackup(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.ativos)        _lsSet('ativos', data.ativos);
      if (data.ativo_fotos)   _lsSet('ativo_fotos', data.ativo_fotos);
      if (data.colaboradores) _lsSet('colaboradores', data.colaboradores);
      if (data.historico)     _lsSet('historico', data.historico);
      if (data.kit_estoque)   _lsSet('kit_estoque', data.kit_estoque);
      if (data.kit_historico) _lsSet('kit_historico', data.kit_historico);
      if (data.solicitacoes)  _lsSet('solicitacoes', data.solicitacoes);
      notify(`Backup restaurado com sucesso! ${data.ativos?.length || 0} ativos importados.`);
      setTimeout(() => location.reload(), 1500);
    } catch {
      notify('Arquivo de backup inválido', 'error');
    }
  };
  reader.readAsText(file);
}
