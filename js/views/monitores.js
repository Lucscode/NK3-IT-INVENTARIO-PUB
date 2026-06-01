// ===================== MONITORES =====================
let currentMonitorFilter = 'todos';
let currentPageMonitores = 1;
const MONITORES_PER_PAGE = 20;
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
    { label: 'Todos os Status', value: 'todos' },
    { label: 'Em Uso', value: 'em uso' },
    { label: 'Estoque', value: 'estoque' },
    { label: 'Quebrado', value: 'quebrado' },
  ];
  const monContainer = document.getElementById('monitorFilters');
  if (monContainer) {
    monContainer.innerHTML = monFilters.map(f => {
      const n = f.value === 'todos' ? fullMonList.length : fullMonList.filter(a => _nm(a.status) === _nm(f.value)).length;
      const selected = currentMonitorFilter === f.value ? ' selected' : '';
      return `<option value="${f.value}"${selected}>${f.label} (${n})</option>`;
    }).join('');
  }

  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / MONITORES_PER_PAGE) || 1;
  if (currentPageMonitores > totalPages) currentPageMonitores = totalPages;
  const startIdx = (currentPageMonitores - 1) * MONITORES_PER_PAGE;
  const pagedList = list.slice(startIdx, startIdx + MONITORES_PER_PAGE);

  let html = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Status</th><th>Colaborador</th><th>Marca</th><th>Modelo</th><th>Local</th><th>Tamanho de Tela</th><th>S/N</th><th>Ações</th></tr></thead>
    <tbody>${pagedList.map(a => `<tr>
      <td>${statusBadge(a.status)}</td>
      <td><span style="font-size:12px;">${a.colab || '—'}</span></td>
      <td><span style="margin-right:8px;font-size:14px;color:var(--accent);"><i class="bi bi-display"></i></span><span style="font-size:12px;font-weight:bold;">${a.marca || '—'}</span></td>
      <td><span style="font-size:12px;">${a.modelo || '—'}</span></td>
      <td><span style="font-size:12px;">${a.localizacao || '—'}</span></td>
      <td><span style="font-size:12px;">${a.tela || '—'}</span></td>
      <td><span class="text-mono" style="font-size:11px;">${a.serie || '—'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetalheMonitor('${a.id}')">Ver</button></td>
    </tr>`).join('') || `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text2);">Nenhum monitor encontrado</td></tr>`}</tbody>
  </table></div></div>`;

  if (totalPages > 1) {
    html += `
      <div style="display:flex; justify-content:center; align-items:center; gap:16px; margin-top:24px;">
        <button class="btn btn-ghost" onclick="changePageMonitores(${currentPageMonitores - 1})" ${currentPageMonitores === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Anterior</button>
        <span style="font-size:13px; color:var(--text2); font-weight:600;">Página ${currentPageMonitores} de ${totalPages}</span>
        <button class="btn btn-ghost" onclick="changePageMonitores(${currentPageMonitores + 1})" ${currentPageMonitores === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Próxima</button>
      </div>
    `;
  }

  document.getElementById('monitoresContainer').innerHTML = html;
}

function changePageMonitores(p) {
  currentPageMonitores = p;
  renderMonitores();
}

function filterMonitores(f) {
  currentMonitorFilter = f;
  currentPageMonitores = 1;
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
  
  const btnEdit = document.getElementById('btnEditAtivo');
  if (btnEdit) { btnEdit.style.display = ''; btnEdit.onclick = () => { closeModal('modalDetalheAtivo'); openNovoMonitor(id); }; }
  const btnDelete = document.getElementById('btnDeleteAtivo');
  if (btnDelete) { btnDelete.style.display = ''; btnDelete.onclick = () => deleteMonitor(id); }
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

// ===================== IMPORTAR CSV MONITORES =====================

let _monitorCsvData = [];

function openImportMonitorModal() {
  _monitorCsvData = [];
  document.getElementById('monCsvFile').value = '';
  document.getElementById('monCsvPreview').innerHTML = '';
  document.getElementById('btnImportMonitorConfirm').style.display = 'none';
  document.getElementById('monCsvUploadZone').style.display = '';
  openModal('modalImportMonitor');
}

function _normalizeMonHeader(h) {
  return h.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function _mapMonitorRow(headers, values) {
  const get = (...keys) => {
    for (const k of keys) {
      const idx = headers.indexOf(_normalizeMonHeader(k));
      if (idx !== -1) return (values[idx] || '').trim();
    }
    return '';
  };

  const statusRaw = get('Status', 'status').toLowerCase();
  const statusMap = {
    'disponivel': 'estoque', 'disponível': 'estoque', 'estoque': 'estoque',
    'em uso': 'em uso', 'uso': 'em uso',
    'manutencao': 'manutencao', 'manutenção': 'manutencao', 'manutençao': 'manutencao',
    'quebrado/defeito': 'quebrado', 'quebrado': 'quebrado', 'defeito': 'quebrado'
  };
  const status = statusMap[statusRaw] || 'estoque';

  const colab = get('Colaborador', 'colaborador');
  const marca = get('Marca', 'marca');
  const modelo = get('Modelo', 'modelo');
  const localizacao = get('Local', 'localização', 'localizacao', 'local');
  const tela = get('Tamanho de Tela', 'tamanho de tela', 'tela');
  const serie = get('S/N', 's/n', 'sn', 'serie', 'série');
  const obs = get('Observação', 'observacao', 'observações', 'obs');

  // Nome e Patrimônio gerados dinamicamente baseados na planilha
  const nome = (marca && modelo) ? `Monitor ${marca} ${modelo}` : (marca ? `Monitor ${marca}` : 'Monitor Genérico');
  const patrimonio = serie || `MON-${Math.floor(10000 + Math.random() * 90000)}`;

  if (!marca && !modelo && !serie) return null; // Linha inválida

  return {
    nome, patrimonio, marca, modelo, serie, tela, colab, status, localizacao, obs,
    tipo: 'Monitor', emoji: 'display'
  };
}

function _parseMonitorCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const delim = lines[0].includes(';') ? ';' : ',';

  const parseRow = line => {
    const result = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === delim && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = parseRow(lines[0]).map(_normalizeMonHeader);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const obj = _mapMonitorRow(rawHeaders, values);
    if (obj) rows.push(obj);
  }
  return { headers: rawHeaders, rows };
}

function handleMonitorCSV(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const { rows } = _parseMonitorCSV(e.target.result);
    _monitorCsvData = rows;

    const preview = document.getElementById('monCsvPreview');
    const confirm = document.getElementById('btnImportMonitorConfirm');

    if (!rows.length) {
      preview.innerHTML = `<div class="alert" style="background:var(--danger-bg,#3a1a1a);color:#f87171;border:1px solid #7f1d1d;">
        <i class="bi bi-exclamation-triangle-fill"></i> Nenhuma linha válida encontrada. Certifique-se de que o CSV tem as colunas corretas.
      </div>`;
      confirm.style.display = 'none';
      return;
    }

    document.getElementById('monCsvUploadZone').style.display = 'none';

    preview.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-weight:700;font-size:15px;"><i class="bi bi-check-circle-fill" style="color:var(--success,#4ade80);margin-right:6px;"></i>${rows.length} monitor(es) prontos para importar</span>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('monCsvUploadZone').style.display='';document.getElementById('monCsvPreview').innerHTML='';document.getElementById('btnImportMonitorConfirm').style.display='none';document.getElementById('monCsvFile').value='';">
          <i class="bi bi-arrow-counterclockwise"></i> Trocar arquivo
        </button>
      </div>
      <div class="table-wrap" style="max-height:280px;overflow-y:auto;">
        <table>
          <thead><tr><th>Status</th><th>Colaborador</th><th>Marca</th><th>Modelo</th><th>Local</th><th>Tela</th><th>S/N</th></tr></thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td>${statusBadge(r.status)}</td>
              <td>${r.colab || '—'}</td>
              <td>${r.marca || '—'}</td>
              <td>${r.modelo || '—'}</td>
              <td>${r.localizacao || '—'}</td>
              <td>${r.tela || '—'}</td>
              <td class="text-mono" style="font-size:11px;">${r.serie || '—'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    confirm.style.display = '';
  };
  reader.readAsText(file, 'UTF-8');
}

async function confirmMonitorImport() {
  if (!_monitorCsvData.length) return;

  const btn = document.getElementById('btnImportMonitorConfirm');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Importando...';

  let ok = 0, err = 0;
  for (const payload of _monitorCsvData) {
    try {
      const created = await dbCreateAtivo(payload);
      if (created) {
        ok++;
        if (payload.colab && payload.status === 'em uso') {
          await dbAddHistorico({
            ativo_id: created.id, ativo_nome: created.nome,
            colab: payload.colab, atribuido: new Date().toISOString().split('T')[0]
          });
        }
      } else { err++; }
    } catch (e) { err++; console.error('Erro ao importar monitor:', e); }
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-cloud-upload"></i> Importar Monitores';

  closeModal('modalImportMonitor');
  notify(`${ok} monitor(es) importado(s)${err ? ` • ${err} erro(s)` : ''}`, err ? 'error' : 'success');
  renderMonitores();
  updateStats();
}
