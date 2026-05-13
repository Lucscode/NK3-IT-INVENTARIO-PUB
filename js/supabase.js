// ===================== SUPABASE DATABASE =====================
const SUPABASE_URL = 'https://etwciyqhrvhzffxstyyk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0d2NpeXFocnZoemZmeHN0eXlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDc1MTIsImV4cCI6MjA5MzMyMzUxMn0.F0-L9MD3jovhRRe6ZZozBkbvco5CHCZZtbB-swOFHtA';
const STORAGE_BUCKET = 'fotos-ativos';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function _uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function _now() { return new Date().toISOString(); }
function _lsGet(key) { return null; }
function _lsSet(key, val) { /* no-op */ }
function _throw(msg, err) {
  console.error(`[DB] ${msg}`, err);
  throw new Error(err?.message || msg);
}

// ─── AUTH ─────────────────────────────────────────────────────
async function dbSignIn(email, pass) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) _throw('Login falhou', error);
  return data;
}

async function dbSignOut() {
  await sb.auth.signOut();
}

async function dbGetPerfil(userId) {
  const { data, error } = await sb.from('perfis').select('*').eq('id', userId).single();
  if (error) return null;
  return data;
}

// ─── ATIVOS ──────────────────────────────────────────────────
async function dbGetAtivos() {
  const { data, error } = await sb
    .from('ativos')
    .select('*, ativo_fotos(id, url, ordem)')
    .order('created_at', { ascending: false });
  if (error) _throw('Erro ao buscar ativos', error);
  return data || [];
}

async function dbGetAtivoById(id) {
  const { data, error } = await sb
    .from('ativos')
    .select('*, ativo_fotos(id, url, storage_path, ordem)')
    .eq('id', id)
    .single();
  if (error) _throw('Erro ao buscar ativo', error);
  return data;
}

async function dbCreateAtivo(payload) {
  const { data, error } = await sb.from('ativos').insert([payload]).select().single();
  if (error) _throw('Erro ao criar ativo', error);
  return data;
}

async function dbUpdateAtivo(id, payload) {
  const { data, error } = await sb.from('ativos').update(payload).eq('id', id).select().single();
  if (error) _throw('Erro ao atualizar ativo', error);
  return data;
}

async function dbDeleteAtivo(id) {
  const { error } = await sb.from('ativos').delete().eq('id', id);
  if (error) _throw('Erro ao deletar ativo', error);
  return true;
}

// ─── FOTOS ───────────────────────────────────────────────────
async function dbGetFotos(ativoId) {
  const { data, error } = await sb
    .from('ativo_fotos').select('*').eq('ativo_id', ativoId).order('ordem', { ascending: true });
  if (error) _throw('Erro ao buscar fotos', error);
  return data || [];
}

async function dbUploadFoto(ativoId, file, ordem) {
  const ext = file.name.split('.').pop();
  const path = `${ativoId}/${_uuid()}.${ext}`;
  const { error: upErr } = await sb.storage.from(STORAGE_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (upErr) _throw('Erro no upload da foto', upErr);
  const { data: { publicUrl } } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const { data, error } = await sb.from('ativo_fotos').insert([{ ativo_id: ativoId, url: publicUrl, storage_path: path, ordem }]).select().single();
  if (error) _throw('Erro ao salvar foto no banco', error);
  return data;
}

async function dbDeleteFoto(fotoId) {
  const { data: foto } = await sb.from('ativo_fotos').select('storage_path').eq('id', fotoId).single();
  if (foto?.storage_path) await sb.storage.from(STORAGE_BUCKET).remove([foto.storage_path]);
  const { error } = await sb.from('ativo_fotos').delete().eq('id', fotoId);
  if (error) _throw('Erro ao deletar foto', error);
  return true;
}

// ─── COLABORADORES ────────────────────────────────────────────
async function dbGetColabs() {
  const { data, error } = await sb.from('colaboradores').select('*').order('nome', { ascending: true });
  if (error) _throw('Erro ao buscar colaboradores', error);
  return data || [];
}

async function dbCreateColab(payload) {
  const { data, error } = await sb.from('colaboradores').insert([payload]).select().single();
  if (error) _throw('Erro ao criar colaborador', error);
  return data;
}

async function dbUpdateColab(id, payload) {
  const { data, error } = await sb.from('colaboradores').update(payload).eq('id', id).select().single();
  if (error) _throw('Erro ao atualizar colaborador', error);
  return data;
}

async function dbDeleteColab(id) {
  const { error } = await sb.from('colaboradores').delete().eq('id', id);
  if (error) _throw('Erro ao deletar colaborador', error);
  return true;
}

// ─── HISTÓRICO ────────────────────────────────────────────────
async function dbGetHistorico() {
  const { data, error } = await sb.from('historico').select('*').order('created_at', { ascending: false });
  if (error) _throw('Erro ao buscar histórico', error);
  return data || [];
}

async function dbAddHistorico(payload) {
  const { error } = await sb.from('historico').insert([payload]);
  if (error) _throw('Erro ao registrar histórico', error);
}

// ─── KITS ─────────────────────────────────────────────────────
async function dbGetKitEstoque() {
  const { data, error } = await sb.from('kit_estoque').select('*');
  if (error) _throw('Erro ao buscar kit_estoque', error);
  const obj = {};
  (data || []).forEach(r => { obj[r.item] = r.quantidade; });
  return obj;
}

async function dbUpdateKitItem(item, quantidade) {
  const { error } = await sb.from('kit_estoque').update({ quantidade }).eq('item', item);
  if (error) _throw('Erro ao atualizar kit_estoque', error);
}

async function dbGetKitHistorico() {
  const { data, error } = await sb.from('kit_historico').select('*').order('created_at', { ascending: false });
  if (error) _throw('Erro ao buscar kit_historico', error);
  return data || [];
}

async function dbAddKitHistorico(payload) {
  const { data, error } = await sb.from('kit_historico').insert([payload]).select().single();
  if (error) _throw('Erro ao registrar saída de kit', error);
  return data;
}

async function dbUpdateKitHistoricoStatus(id, cancelado) {
  const { error } = await sb.from('kit_historico').update({ cancelado }).eq('id', id);
  if (error) _throw('Erro ao atualizar status do kit', error);
}

// ─── SOLICITAÇÕES ─────────────────────────────────────────────
async function dbGetSolicitacoes() {
  const { data, error } = await sb.from('solicitacoes').select('*').order('created_at', { ascending: false });
  if (error) _throw('Erro ao buscar solicitações', error);
  return data || [];
}

async function dbCreateSolicitacao(payload) {
  const { data, error } = await sb.from('solicitacoes').insert([payload]).select().single();
  if (error) _throw('Erro ao criar solicitação', error);
  return data;
}

async function dbUpdateSolStatus(id, status) {
  const { error } = await sb.from('solicitacoes').update({ status }).eq('id', id);
  if (error) _throw('Erro ao atualizar solicitação', error);
}

async function dbUpdateSolRastreio(id, rastreio) {
  const { error } = await sb.from('solicitacoes').update({ rastreio }).eq('id', id);
  if (error) _throw('Erro ao atualizar rastreio da solicitação', error);
}

async function dbDeleteSolicitacao(id) {
  const { error } = await sb.from('solicitacoes').delete().eq('id', id);
  if (error) _throw('Erro ao deletar solicitação', error);
  return true;
}

// ─── DASHBOARD STATS ──────────────────────────────────────────
async function dbGetStats() {
  const { data, error } = await sb.from('ativos').select('status');
  if (error) _throw('Erro ao buscar stats', error);
  const ativos = data || [];
  return {
    total: ativos.length,
    disponiveis: ativos.filter(a => a.status === 'disponivel').length,
    emUso: ativos.filter(a => a.status === 'em uso').length,
    manutencao: ativos.filter(a => a.status === 'manutencao').length,
  };
}

// ─── UTILITÁRIOS ──────────────────────────────────────────────
async function updatePendBadge() {
  const { count } = await sb
    .from('solicitacoes')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pendente');
  const el = document.getElementById('pendBadge');
  if (el) { el.textContent = count || 0; el.style.display = count ? '' : 'none'; }
}

async function exportBackup() {
  try {
    const [ativos, colabs, hist, kitEst, kitHist, sols] = await Promise.all([
      dbGetAtivos(), dbGetColabs(), dbGetHistorico(),
      dbGetKitEstoque(), dbGetKitHistorico(), dbGetSolicitacoes()
    ]);
    const backup = { exportedAt: _now(), ativos, colaboradores: colabs, historico: hist, kit_estoque: kitEst, kit_historico: kitHist, solicitacoes: sols };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `techstock_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    notify('Backup completo exportado!');
  } catch (ex) {
    notify(`Erro no backup: ${ex.message}`, 'error');
  }
}

async function importBackup(file) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      notify('Restaurando backup... aguarde.', 'success');
      if (data.ativos?.length) await sb.from('ativos').upsert(data.ativos, { onConflict: 'id' });
      if (data.colaboradores?.length) await sb.from('colaboradores').upsert(data.colaboradores, { onConflict: 'id' });
      if (data.historico?.length) await sb.from('historico').upsert(data.historico, { onConflict: 'id' });
      if (data.kit_historico?.length) await sb.from('kit_historico').upsert(data.kit_historico, { onConflict: 'id' });
      if (data.solicitacoes?.length) await sb.from('solicitacoes').upsert(data.solicitacoes, { onConflict: 'id' });
      if (data.kit_estoque) {
        for (const [item, quantidade] of Object.entries(data.kit_estoque)) {
          await dbUpdateKitItem(item, quantidade);
        }
      }
      notify(`Backup restaurado! ${data.ativos?.length || 0} ativos importados.`);
      setTimeout(() => location.reload(), 1500);
    } catch (ex) {
      notify(`Arquivo inválido: ${ex.message}`, 'error');
    }
  };
  reader.readAsText(file);
}
