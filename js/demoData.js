window.demoDB = {
  ativos: [
    {
      id: 'demo-ativo-1',
      patrimonio: 'NK3-0001',
      nome: 'Dell Latitude 3420',
      tipo: 'Notebook',
      marca: 'Dell',
      modelo: 'Latitude 3420',
      serie: '1A2B3C4',
      status: 'em uso',
      saude: 'excelente',
      colab: 'Carlos Silva',
      localizacao: 'São Paulo - Matriz',
      proc: 'Intel Core i5 11ª',
      ram: '16GB',
      disco: '256GB SSD',
      tela: '14"',
      so: 'Windows 11 Pro',
      rmm_disk_percent: '45',
      rmm_mem_percent: '60',
      rmm_last_sync: new Date().toISOString(),
      garantia: '2028-12-31',
      emoji: 'laptop',
      ativo_fotos: []
    },
    {
      id: 'demo-ativo-2',
      patrimonio: 'NK3-0002',
      nome: 'Monitor Dell P2422H',
      tipo: 'Monitor',
      marca: 'Dell',
      modelo: 'P2422H',
      serie: 'XYZ987',
      status: 'disponivel',
      saude: 'bom',
      colab: '',
      localizacao: 'Estoque Central',
      proc: '', ram: '', disco: '', tela: '24"', so: '',
      rmm_disk_percent: '', rmm_mem_percent: '',
      garantia: '2025-05-10',
      emoji: 'display',
      ativo_fotos: []
    },
    {
      id: 'demo-ativo-3',
      patrimonio: 'NK3-0003',
      nome: 'iPhone 13 128GB',
      tipo: 'Smartphone',
      marca: 'Apple',
      modelo: 'iPhone 13',
      serie: 'IPH12345',
      status: 'manutencao',
      saude: 'ruim',
      colab: 'Maria Eduarda',
      localizacao: 'Assistência Técnica',
      proc: 'A15 Bionic', ram: '4GB', disco: '128GB', tela: '6.1"', so: 'iOS 17',
      rmm_disk_percent: '', rmm_mem_percent: '',
      garantia: '2024-01-01',
      emoji: 'phone',
      ativo_fotos: []
    },
    {
      id: 'demo-ativo-4',
      patrimonio: 'NK3-0004',
      nome: 'MacBook Air M1',
      tipo: 'Notebook',
      marca: 'Apple',
      modelo: 'Air M1 2020',
      serie: 'MAC999',
      status: 'em uso',
      saude: 'excelente',
      colab: 'João Silva',
      localizacao: 'Rio de Janeiro - Filial',
      proc: 'Apple M1', ram: '8GB', disco: '256GB SSD', tela: '13.3"', so: 'macOS Sonoma',
      rmm_disk_percent: '80', rmm_mem_percent: '92',
      rmm_last_sync: new Date(Date.now() - 3600000 * 24 * 45).toISOString(), // 45 dias atrás -> offline
      garantia: '2026-10-15',
      emoji: 'laptop',
      ativo_fotos: []
    },
    {
      id: 'demo-ativo-5',
      patrimonio: 'NK3-0005',
      nome: 'Servidor ProLiant DL380',
      tipo: 'Servidor',
      marca: 'HP',
      modelo: 'Gen10',
      serie: 'SRV001',
      status: 'em uso',
      saude: 'atencao',
      colab: '',
      localizacao: 'Datacenter',
      proc: '2x Intel Xeon Gold', ram: '128GB', disco: '4TB SSD RAID 5', tela: '', so: 'Windows Server 2022',
      rmm_disk_percent: '96', // alerta de disco
      rmm_mem_percent: '40',
      rmm_last_sync: new Date().toISOString(),
      garantia: '2027-02-28',
      emoji: 'server',
      ativo_fotos: []
    }
  ],
  colaboradores: [
    { id: 'colab-1', nome: 'Carlos Silva', email: 'carlos@nk3it.com', cargo: 'CEO', departamento: 'Diretoria' },
    { id: 'colab-2', nome: 'Maria Eduarda', email: 'maria@nk3it.com', cargo: 'Desenvolvedora', departamento: 'Tecnologia' },
    { id: 'colab-3', nome: 'João Silva', email: 'joao@nk3it.com', cargo: 'Analista de Suporte', departamento: 'TI' }
  ],
  historico: [
    { id: 'hist-1', ativo_nome: 'Dell Latitude 3420 (NK3-0001)', colab: 'Carlos Silva', obs: 'Atribuído novo notebook', atribuido: new Date().toISOString() },
    { id: 'hist-2', ativo_nome: 'iPhone 13 128GB (NK3-0003)', colab: 'Maria Eduarda', obs: 'Enviado para conserto - Tela quebrada', devolvido: null, created_at: new Date(Date.now() - 86400000 * 2).toISOString() }
  ],
  kit_estoque: {
    mochila: 15,
    squeeze: 20,
    caderno: 30,
    caneta: 50,
    mousepad: 25
  },
  kit_historico: [],
  solicitacoes: [
    { id: 'sol-1', colaborador: 'Novo Funcionário', email: 'novo@nk3it.com', status: 'pendente', kit: true, obs: 'Solicitação de equipamento para onboarding' }
  ],
  devolucoes: []
};

window.initDemoMock = function() {
  window.dbGetAtivos = async () => window.demoDB.ativos.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0));
  window.dbGetAtivoById = async (id) => window.demoDB.ativos.find(a => a.id === id);
  window.dbCreateAtivo = async (payload) => { payload.id = _uuid(); payload.created_at = _now(); payload.ativo_fotos = []; window.demoDB.ativos.unshift(payload); return payload; };
  window.dbUpdateAtivo = async (id, payload) => { const a = window.demoDB.ativos.find(x=>x.id===id); if(a) Object.assign(a, payload); return a; };
  window.dbDeleteAtivo = async (id) => { window.demoDB.ativos = window.demoDB.ativos.filter(x=>x.id!==id); return true; };

  window.dbGetFotos = async (ativoId) => [];
  window.dbUploadFoto = async () => ({ id: _uuid(), url: 'https://via.placeholder.com/300' });
  window.dbDeleteFoto = async () => true;

  window.dbGetColabs = async () => window.demoDB.colaboradores;
  window.dbCreateColab = async (payload) => { payload.id = _uuid(); window.demoDB.colaboradores.push(payload); return payload; };
  window.dbUpdateColab = async (id, payload) => { const c = window.demoDB.colaboradores.find(x=>x.id===id); if(c) Object.assign(c, payload); return c; };
  window.dbDeleteColab = async (id) => { window.demoDB.colaboradores = window.demoDB.colaboradores.filter(x=>x.id!==id); return true; };

  window.dbGetHistorico = async () => window.demoDB.historico.sort((a,b) => new Date(b.created_at||a.atribuido||0) - new Date(a.created_at||a.atribuido||0));
  window.dbAddHistorico = async (payload) => { payload.id = _uuid(); payload.created_at = _now(); window.demoDB.historico.unshift(payload); };
  window.dbDeleteHistorico = async (id) => { window.demoDB.historico = window.demoDB.historico.filter(h => h.id !== id); };

  window.dbGetKitEstoque = async () => window.demoDB.kit_estoque;
  window.dbUpdateKitItem = async (item, qtd) => { window.demoDB.kit_estoque[item] = qtd; };
  window.dbGetKitHistorico = async () => window.demoDB.kit_historico;
  window.dbAddKitHistorico = async (payload) => { payload.id = _uuid(); payload.created_at = _now(); window.demoDB.kit_historico.unshift(payload); return payload; };
  window.dbUpdateKitHistoricoStatus = async (id, canc) => { const k = window.demoDB.kit_historico.find(x=>x.id===id); if(k) k.cancelado = canc; };
  window.dbUpdateKitStatus = async (id, status) => { const k = window.demoDB.kit_historico.find(x=>x.id===id); if(k) { k.status = status; k.cancelado = (status==='cancelado'); } };

  window.dbGetSolicitacoes = async () => window.demoDB.solicitacoes;
  window.dbCreateSolicitacao = async (payload) => { payload.id = _uuid(); payload.created_at = _now(); window.demoDB.solicitacoes.unshift(payload); return payload; };
  window.dbUpdateSolStatus = async (id, status) => { const s = window.demoDB.solicitacoes.find(x=>x.id===id); if(s) s.status = status; };
  window.dbDeleteSolicitacao = async (id) => { window.demoDB.solicitacoes = window.demoDB.solicitacoes.filter(x=>x.id!==id); return true; };
  window.dbUpdateSolRastreio = async (id, rastreio) => { const s = window.demoDB.solicitacoes.find(x=>x.id===id); if(s) s.rastreio = rastreio; };

  window.dbGetDevolucoes = async () => window.demoDB.devolucoes;
  window.dbCreateDevolucao = async (payload) => { payload.id = _uuid(); payload.created_at = _now(); window.demoDB.devolucoes.unshift(payload); return payload; };
  window.dbUpdateDevolucao = async (id, payload) => { const d = window.demoDB.devolucoes.find(x=>x.id===id); if(d) Object.assign(d, payload); return d; };
  window.dbDeleteDevolucao = async (id) => { window.demoDB.devolucoes = window.demoDB.devolucoes.filter(x=>x.id!==id); return true; };

  // Helper mocks for rmm and stats
  window.dbGetStats = async () => {
    const ativos = window.demoDB.ativos;
    return {
      total: ativos.length,
      disponiveis: ativos.filter(a => a.status === 'disponivel').length,
      emUso: ativos.filter(a => a.status === 'em uso').length,
      manutencao: ativos.filter(a => a.status === 'manutencao').length,
    };
  };

  window.syncFromRMM = async () => {
    const btn = document.getElementById('btnSyncRMM');
    const btn2 = document.getElementById('btnSyncRMM_mon');
    
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Sincronizando...'; }
    if (btn2) { btn2.disabled = true; btn2.innerHTML = '<i data-lucide="refresh-cw" class="spin-icon"></i> Sincronizando...'; if (typeof lucide !== 'undefined') lucide.createIcons(); }
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 1500));
    
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sincronizar com RMM'; }
    if (btn2) { btn2.disabled = false; btn2.innerHTML = '<i data-lucide="refresh-cw"></i> Sincronizar Agora'; if (typeof lucide !== 'undefined') lucide.createIcons(); }
    
    if (typeof notify !== 'undefined') {
      notify('Modo Demonstração: Sincronização fictícia concluída com sucesso!', 'success');
    }
    
    // Update dashboard UI if function exists
    if (typeof _updateSyncTimestamp === 'function') {
      localStorage.setItem('lastRMMSync', new Date().toISOString());
      _updateSyncTimestamp();
    }
  };
};
