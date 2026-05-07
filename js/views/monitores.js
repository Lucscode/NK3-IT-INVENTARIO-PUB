// ===================== MONITORES =====================
let currentMonitorFilter = 'todos';
let editingMonitorId = null;

async function renderMonitores() {
  document.getElementById('monitoresContainer').innerHTML = `<div style="padding:40px;text-align:center;color:var(--text2);">Carregando...</div>`;
  let ativos = await dbGetAtivos();
  let list = ativos.filter(a => a.tipo === 'Monitor');
  const fullMonList = [...list]; // cópia antes de filtrar

  if (currentMonitorFilter !== 'todos') {
    list = list.filter(a => (a.status || '').toLowerCase() === currentMonitorFilter);
  }

  const search = document.getElementById('globalSearch')?.value.toLowerCase() || '';
  if (search) list = list.filter(a =>
    (a.nome || '').toLowerCase().includes(search) ||
    (a.patrimonio || '').toLowerCase().includes(search) ||
    (a.colab || '').toLowerCase().includes(search) ||
    (a.marca || '').toLowerCase().includes(search) ||
    (a.modelo || '').toLowerCase().includes(search) ||
    (a.serie || '').toLowerCase().includes(search)
  );

  // Atualizar badges de contagem nos filtros
  const _nm = s => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const monFilters = [
    { label: 'Todos', value: 'todos' },
    { label: 'Em Uso', value: 'em uso' },
    { label: 'Estoque', value: 'estoque' },
    { label: 'Quebrado', value: 'quebrado' },
  ];
  const monContainer = document.getElementById('monitorFilters');
  if (monContainer) {
    monContainer.innerHTML = monFilters.map(f => {
      const n = f.value === 'todos' ? fullMonList.length : fullMonList.filter(a => _nm(a.status) === _nm(f.value)).length;
      const active = currentMonitorFilter === f.value ? ' active' : '';
      return `<button class="filter-btn${active}" onclick="filterMonitores('${f.value}',this)">${f.label}<span class="filter-count">${n}</span></button>`;
    }).join('');
  }

  document.getElementById('monitoresContainer').innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Monitor</th><th>Patrimônio</th><th>Status</th><th>Tela</th><th>Colaborador</th><th>Localização</th><th>Ações</th></tr></thead>
    <tbody>${list.map(a => `<tr>
      <td><span style="margin-right:8px;font-size:16px;color:var(--accent);"><i class="bi bi-display"></i></span><b>${a.nome}</b></td>
      <td><span class="text-mono" style="font-size:11px;color:var(--text2);">${a.patrimonio}</span></td>
      <td>${statusBadge(a.status)}</td>
      <td><span style="font-size:12px;">${a.tela || '—'}</span></td>
      <td><span style="font-size:12px;">${a.colab || '—'}</span></td>
      <td><span style="font-size:12px;">${a.localizacao || '—'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetalheMonitor('${a.id}')">Ver</button></td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text2);">Nenhum monitor encontrado</td></tr>`}</tbody>
  </table></div></div>`;
}

function filterMonitores(f, btn) {
  currentMonitorFilter = f;
  document.querySelectorAll('#monitorFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMonitores();
}

async function openNovoMonitor(id = null) {
  editingMonitorId = id;
  document.getElementById('modalMonitorTitle').textContent = id ? 'Editar Monitor' : 'Novo Monitor';

  // Reset form
  ['monNome', 'monPatrimonio', 'monMarca', 'monModelo', 'monSerie', 'monTela', 'monColab', 'monLocalizacao', 'monObs'].forEach(i => {
    const el = document.getElementById(i); if (el) el.value = '';
  });
  document.getElementById('monStatus').value = 'estoque';

  if (id) {
    const a = await dbGetAtivoById(id);
    if (!a) return;
    const fields = {
      Nome: 'nome', Patrimonio: 'patrimonio', Marca: 'marca', Modelo: 'modelo',
      Serie: 'serie', Tela: 'tela', Colab: 'colab', Localizacao: 'localizacao', Obs: 'obs'
    };
    Object.entries(fields).forEach(([fId, key]) => {
      const el = document.getElementById('mon' + fId); if (el) el.value = a[key] || '';
    });
    document.getElementById('monStatus').value = a.status || 'estoque';
  }

  // Populate datalist
  const colabList = document.getElementById('colabListMon');
  if (colabList && window._cacheColabs) {
    colabList.innerHTML = _cacheColabs.map(c => `<option value="${c.nome}">`).join('');
  }

  openModal('modalNovoMonitor');
}

async function saveMonitor() {
  const nome = document.getElementById('monNome').value.trim();
  const patri = document.getElementById('monPatrimonio').value.trim();
  if (!nome || !patri) { notify('Preencha nome e patrimônio', 'error'); return; }

  const payload = {
    nome, patrimonio: patri,
    marca: document.getElementById('monMarca').value,
    modelo: document.getElementById('monModelo').value,
    serie: document.getElementById('monSerie').value,
    tela: document.getElementById('monTela').value,
    tipo: 'Monitor',
    status: document.getElementById('monStatus').value,
    colab: document.getElementById('monColab').value,
    localizacao: document.getElementById('monLocalizacao').value,
    obs: document.getElementById('monObs').value,
    emoji: 'display'
  };

  if (editingMonitorId) {
    const old = await dbGetAtivoById(editingMonitorId);
    const updated = await dbUpdateAtivo(editingMonitorId, payload);
    if (updated) {
      notify('Monitor atualizado!');
      if (old && old.obs !== payload.obs) {
        await dbAddHistorico({
          ativo_id: editingMonitorId,
          ativo_nome: `${updated.nome} (${updated.patrimonio})`,
          colab: payload.colab || 'Sistema',
          obs: `Anotação alterada: ${payload.obs || '(removida)'}`
        });
      }
    }
  } else {
    const created = await dbCreateAtivo(payload);
    if (created) {
      notify('Monitor cadastrado!');
      if (payload.colab) {
        await dbAddHistorico({
          ativo_id: created.id, ativo_nome: `${created.nome} (${created.patrimonio})`,
          colab: payload.colab, atribuido: new Date().toISOString().split('T')[0]
        });
      }
    }
  }
  closeModal('modalNovoMonitor');
  renderMonitores();
  updateStats();
}

async function openDetalheMonitor(id) {
  const a = await dbGetAtivoById(id);
  if (!a) return;

  document.getElementById('modalDetalheBody').innerHTML = `
    <div style="display:flex;gap:20px;margin-bottom:20px;align-items:flex-start;">
      <div style="width:70px;height:70px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--text3);"><i class="bi bi-display"></i></div>
      <div>
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;">${a.nome}</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--text2);margin-bottom:8px;">
          ${a.patrimonio} • Monitor${a.marca ? ` • ${a.marca}` : ''}${a.modelo ? ` ${a.modelo}` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${statusBadge(a.status)}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:20px;">
      <div class="detail-item"><div class="detail-label">Tamanho da Tela</div><div class="detail-value">${a.tela || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Nº de Série</div><div class="detail-value text-mono">${a.serie || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Colaborador</div><div class="detail-value">${a.colab || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Localização</div><div class="detail-value">${a.localizacao || '—'}</div></div>
    </div>
    ${a.obs ? `<div class="alert alert-info"><i class="bi bi-sticky" style="margin-right:6px;"></i> ${a.obs}</div>` : ''}`;
  
  document.getElementById('btnEditAtivo').onclick = () => { closeModal('modalDetalheAtivo'); openNovoMonitor(id); };
  document.getElementById('btnDeleteAtivo').onclick = () => deleteMonitor(id);
  openModal('modalDetalheAtivo');
}

async function deleteMonitor(id) {
  if (!confirm('Tem certeza que deseja excluir este monitor?')) return;
  try {
    const a = await dbGetAtivoById(id);
    if (a) {
      await dbAddHistorico({
        ativo_nome: `${a.nome} (${a.patrimonio})`,
        colab: 'Sistema',
        obs: 'Exclusão de Monitor'
      });
    }
  } catch (e) {
    console.error('Erro ao registrar exclusão no histórico', e);
  }
  await dbDeleteAtivo(id);
  notify('Monitor excluído');
  closeModal('modalDetalheAtivo');
  renderMonitores();
  updateStats();
}
