// ===================== CELULARES =====================
let currentCelularFilter = 'todos';
let editingCelularId = null;

async function renderCelulares() {
  document.getElementById('celularesContainer').innerHTML = `<div style="padding:40px;text-align:center;color:var(--text2);">Carregando...</div>`;
  let ativos = await dbGetAtivos();
  let list = ativos.filter(a => a.tipo === 'Celular');
  const fullCelList = [...list]; // cópia antes de filtrar

  if (currentCelularFilter !== 'todos') {
    list = list.filter(a => (a.status || '').toLowerCase() === currentCelularFilter);
  }

  const search = document.getElementById('globalSearch')?.value.toLowerCase() || '';
  if (search) list = list.filter(a =>
    (a.nome || '').toLowerCase().includes(search) ||
    (a.patrimonio || '').toLowerCase().includes(search) ||
    (a.colab || '').toLowerCase().includes(search) ||
    (a.marca || '').toLowerCase().includes(search) ||
    (a.modelo || '').toLowerCase().includes(search) ||
    (a.serie || '').toLowerCase().includes(search) ||
    (a.numero_linha || '').toLowerCase().includes(search) ||
    (a.imei1 || '').toLowerCase().includes(search)
  );

  // Atualizar badges de contagem nos filtros
  const _nc = s => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const celFilters = [
    { label: 'Todos', value: 'todos' },
    { label: 'Disponível', value: 'disponivel' },
    { label: 'Em Uso', value: 'em uso' },
    { label: 'Manutenção', value: 'manutencao' },
  ];
  const celFContainer = document.getElementById('celularFilters');
  if (celFContainer) {
    celFContainer.innerHTML = celFilters.map(f => {
      const n = f.value === 'todos' ? fullCelList.length : fullCelList.filter(a => _nc(a.status) === _nc(f.value)).length;
      const active = currentCelularFilter === f.value ? ' active' : '';
      return `<button class="filter-btn${active}" onclick="filterCelulares('${f.value}',this)">${f.label}<span class="filter-count">${n}</span></button>`;
    }).join('');
  }

  document.getElementById('celularesContainer').innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Celular</th><th>Status</th><th>Número</th><th>Colaborador</th><th>Ações</th></tr></thead>
    <tbody>${list.map(a => `<tr>
      <td><span style="margin-right:8px;font-size:16px;color:var(--accent);"><i class="bi bi-phone"></i></span><b>${a.nome}</b></td>
      <td>${statusBadge(a.status)}</td>
      <td><span class="text-mono" style="font-size:12px;">${a.numero_linha || '—'}</span></td>
      <td><span style="font-size:12px;">${a.colab || '—'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetalheCelular('${a.id}')">Ver</button></td>
    </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text2);">Nenhum celular encontrado</td></tr>`}</tbody>
  </table></div></div>`;
}

function filterCelulares(f, btn) {
  currentCelularFilter = f;
  document.querySelectorAll('#celularFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderCelulares();
}

async function openNovoCelular(id = null) {
  editingCelularId = id;
  document.getElementById('modalCelularTitle').textContent = id ? 'Editar Celular' : 'Novo Celular';

  // Reset form
  ['celNome', 'celMarca', 'celModelo', 'celProc', 'celDisco', 'celRam', 'celNumeroLinha', 'celImei1', 'celImei2', 'celColab', 'celLocalizacao', 'celObs'].forEach(i => {
    const el = document.getElementById(i); if (el) el.value = '';
  });
  document.getElementById('celStatus').value = 'disponivel';

  if (id) {
    const a = await dbGetAtivoById(id);
    if (!a) return;
    const fields = {
      Nome: 'nome', Marca: 'marca', Modelo: 'modelo',
      Proc: 'proc', Disco: 'disco', Ram: 'ram', NumeroLinha: 'numero_linha',
      Imei1: 'imei1', Imei2: 'imei2', Colab: 'colab', Localizacao: 'localizacao', Obs: 'obs'
    };
    Object.entries(fields).forEach(([fId, key]) => {
      const el = document.getElementById('cel' + fId); if (el) el.value = a[key] || '';
    });
    document.getElementById('celStatus').value = a.status || 'disponivel';
  }

  // Populate datalist
  const colabList = document.getElementById('colabListCel');
  if (colabList && window._cacheColabs) {
    colabList.innerHTML = _cacheColabs.map(c => `<option value="${c.nome}">`).join('');
  }

  openModal('modalNovoCelular');
}

async function saveCelular() {
  const nome = document.getElementById('celNome').value.trim();
  if (!nome) { notify('Preencha o nome do celular', 'error'); return; }

  const payload = {
    nome, patrimonio: nome,
    marca: document.getElementById('celMarca').value,
    modelo: document.getElementById('celModelo').value,
    proc: document.getElementById('celProc').value,
    disco: document.getElementById('celDisco').value,
    ram: document.getElementById('celRam').value,
    numero_linha: document.getElementById('celNumeroLinha').value,
    imei1: document.getElementById('celImei1').value,
    imei2: document.getElementById('celImei2').value,
    tipo: 'Celular',
    status: document.getElementById('celStatus').value,
    colab: document.getElementById('celColab').value,
    localizacao: document.getElementById('celLocalizacao').value,
    obs: document.getElementById('celObs').value,
    emoji: 'phone'
  };

  if (editingCelularId) {
    const old = await dbGetAtivoById(editingCelularId);
    const updated = await dbUpdateAtivo(editingCelularId, payload);
    if (updated) {
      notify('Celular atualizado!');
      if (old && old.obs !== payload.obs) {
        await dbAddHistorico({
          ativo_id: editingCelularId,
          ativo_nome: updated.nome,
          colab: payload.colab || 'Sistema',
          obs: `Anotação alterada: ${payload.obs || '(removida)'}`
        });
      }
    }
  } else {
    const created = await dbCreateAtivo(payload);
    if (created) {
      notify('Celular cadastrado!');
      if (payload.colab) {
        await dbAddHistorico({
          ativo_id: created.id, ativo_nome: created.nome,
          colab: payload.colab, atribuido: new Date().toISOString().split('T')[0]
        });
      }
    }
  }
  closeModal('modalNovoCelular');
  renderCelulares();
  updateStats();
}

async function openDetalheCelular(id) {
  const a = await dbGetAtivoById(id);
  if (!a) return;

  document.getElementById('modalDetalheBody').innerHTML = `
    <div style="display:flex;gap:20px;margin-bottom:20px;align-items:flex-start;">
      <div style="width:70px;height:70px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:32px;color:var(--text3);"><i class="bi bi-phone"></i></div>
      <div>
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;">${a.nome}</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--text2);margin-bottom:8px;">
          Celular${a.marca ? ` • ${a.marca}` : ''}${a.modelo ? ` ${a.modelo}` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${statusBadge(a.status)}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:20px;">
      <div class="detail-item"><div class="detail-label">Número (Linha)</div><div class="detail-value text-mono">${a.numero_linha || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Armazenamento / RAM</div><div class="detail-value">${a.disco || '—'} / ${a.ram || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Processador</div><div class="detail-value">${a.proc || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">IMEI 1</div><div class="detail-value text-mono">${a.imei1 || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">IMEI 2</div><div class="detail-value text-mono">${a.imei2 || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Colaborador</div><div class="detail-value">${a.colab || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Localização</div><div class="detail-value">${a.localizacao || '—'}</div></div>
    </div>
    ${a.obs ? `<div class="alert alert-info"><i class="bi bi-sticky" style="margin-right:6px;"></i> ${a.obs}</div>` : ''}`;
  
  document.getElementById('btnEditAtivo').onclick = () => { closeModal('modalDetalheAtivo'); openNovoCelular(id); };
  document.getElementById('btnDeleteAtivo').onclick = () => deleteCelular(id);
  openModal('modalDetalheAtivo');
}

async function deleteCelular(id) {
  if (!confirm('Tem certeza que deseja excluir este celular?')) return;
  try {
    const a = await dbGetAtivoById(id);
    if (a) {
      await dbAddHistorico({
        ativo_nome: a.nome,
        colab: 'Sistema',
        obs: 'Exclusão de Celular'
      });
    }
  } catch (e) {
    console.error('Erro ao registrar exclusão no histórico', e);
  }
  await dbDeleteAtivo(id);
  notify('Celular excluído');
  closeModal('modalDetalheAtivo');
  renderCelulares();
  updateStats();
}

// ===================== IMPORTAR CSV CELULARES =====================

let _celularCsvData = [];

function openImportCelularModal() {
  _celularCsvData = [];
  document.getElementById('celCsvFile').value = '';
  document.getElementById('celCsvPreview').innerHTML = '';
  document.getElementById('btnImportCelularConfirm').style.display = 'none';
  document.getElementById('celCsvUploadZone').style.display = '';
  openModal('modalImportCelular');
}

function _normalizeCelHeader(h) {
  return h.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // remove acentos
    .replace(/[^a-z0-9]/g, '');                          // remove não-alfanuméricos
}

function _mapCelularRow(headers, values) {
  const get = (...keys) => {
    for (const k of keys) {
      const idx = headers.indexOf(_normalizeCelHeader(k));
      if (idx !== -1) return (values[idx] || '').trim();
    }
    return '';
  };

  const nome = get('Nome do celular', 'nome', 'celular', 'nome do celular');
  if (!nome) return null; // linha sem nome é inválida

  const statusRaw = get('Status', 'status').toLowerCase();
  const statusMap = {
    'disponivel': 'disponivel', 'disponível': 'disponivel',
    'em uso': 'em uso', 'uso': 'em uso',
    'manutencao': 'manutencao', 'manutenção': 'manutencao', 'manutençao': 'manutencao',
    'quebrado': 'quebrado'
  };
  const status = statusMap[statusRaw] || 'disponivel';

  return {
    nome,
    patrimonio: nome,
    marca:        get('Marca', 'marca'),
    modelo:       get('Modelo', 'modelo'),
    proc:         get('Processador', 'processador', 'proc'),
    disco:        get('Armazenamento', 'armazenamento', 'disco'),
    ram:          get('Memória', 'memoria', 'memoria ram', 'ram'),
    numero_linha: get('Numero', 'número', 'numero', 'numero do celular', 'número do celular'),
    imei1:        get('IMEI CHIP1', 'imei chip1', 'imei chip 1', 'imei1'),
    imei2:        get('IMEI CHIP2', 'imei chip2', 'imei chip 2', 'imei2'),
    colab:        get('Colaborador', 'colaborador'),
    status,
    localizacao:  get('Local', 'localização', 'localizacao', 'local'),
    obs:          get('Observações', 'observacoes', 'obs', 'observacao'),
    tipo:         'Celular',
    emoji:        'phone'
  };
}

function _parseCelularCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  // Detecta delimitador (vírgula ou ponto-e-vírgula)
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

  const rawHeaders = parseRow(lines[0]).map(_normalizeCelHeader);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const obj = _mapCelularRow(rawHeaders, values);
    if (obj) rows.push(obj);
  }
  return { headers: rawHeaders, rows };
}

function handleCelularCSV(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    const { rows } = _parseCelularCSV(e.target.result);
    _celularCsvData = rows;

    const preview = document.getElementById('celCsvPreview');
    const confirm = document.getElementById('btnImportCelularConfirm');

    if (!rows.length) {
      preview.innerHTML = `<div class="alert" style="background:var(--danger-bg,#3a1a1a);color:#f87171;border:1px solid #7f1d1d;">
        <i class="bi bi-exclamation-triangle-fill"></i> Nenhuma linha válida encontrada. Verifique se o CSV possui a coluna <b>Nome do celular</b>.
      </div>`;
      confirm.style.display = 'none';
      return;
    }

    // Esconde zona de upload para dar espaço ao preview
    document.getElementById('celCsvUploadZone').style.display = 'none';

    // Resumo
    preview.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <span style="font-weight:700;font-size:15px;"><i class="bi bi-check-circle-fill" style="color:var(--success,#4ade80);margin-right:6px;"></i>${rows.length} celular(es) prontos para importar</span>
        <button class="btn btn-ghost btn-sm" onclick="document.getElementById('celCsvUploadZone').style.display='';document.getElementById('celCsvPreview').innerHTML='';document.getElementById('btnImportCelularConfirm').style.display='none';document.getElementById('celCsvFile').value='';">
          <i class="bi bi-arrow-counterclockwise"></i> Trocar arquivo
        </button>
      </div>
      <div class="table-wrap" style="max-height:280px;overflow-y:auto;">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Nome</th><th>Marca</th><th>Modelo</th>
              <th>Número</th><th>IMEI 1</th><th>Colaborador</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `<tr>
              <td style="color:var(--text2);font-size:11px;">${i + 1}</td>
              <td><b>${r.nome}</b></td>
              <td>${r.marca || '—'}</td>
              <td>${r.modelo || '—'}</td>
              <td class="text-mono" style="font-size:11px;">${r.numero_linha || '—'}</td>
              <td class="text-mono" style="font-size:11px;">${r.imei1 || '—'}</td>
              <td>${r.colab || '—'}</td>
              <td>${statusBadge(r.status)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    confirm.style.display = '';
  };
  reader.readAsText(file, 'UTF-8');
}

async function confirmCelularImport() {
  if (!_celularCsvData.length) return;

  const btn = document.getElementById('btnImportCelularConfirm');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Importando...';

  let ok = 0, err = 0;
  for (const payload of _celularCsvData) {
    try {
      const created = await dbCreateAtivo(payload);
      if (created) {
        ok++;
        if (payload.colab) {
          await dbAddHistorico({
            ativo_id: created.id, ativo_nome: created.nome,
            colab: payload.colab, atribuido: new Date().toISOString().split('T')[0]
          });
        }
      } else { err++; }
    } catch (e) { err++; console.error('Erro ao importar celular:', e); }
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-cloud-upload"></i> Importar Celulares';

  closeModal('modalImportCelular');
  notify(`${ok} celular(es) importado(s)${err ? ` • ${err} erro(s)` : ''}`, err ? 'error' : 'success');
  renderCelulares();
  updateStats();
}
