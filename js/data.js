// ===================== DATA STORE =====================
// Estado de UI apenas — dados reais vêm do Supabase
let currentUser = { name: 'Admin Silva', role: 'admin', initials: 'AS' };
let loginRole = 'admin';
let currentView = 'grid';
let currentAtivoFilter = 'todos';
let editingAtivoId = null;
let editingColabId = null;
let currentKitTab = 'estoque';
let importTarget = '';
let pendingCSVData = [];

// Cache local para uso durante a sessão
let _cacheAtivos = [];
let _cacheColabs = [];
let _cacheHistorico = [];
let _cacheKitEstoque = {};
let _cacheKitHistorico = [];
let _cacheSolicitacoes = [];
let _cacheAtivFotos = {}; // { ativoId: [fotos] }
