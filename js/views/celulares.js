// ===================== CELULARES =====================
let currentCelularFilter = 'todos';
let editingCelularId = null;

async function renderCelulares() {
  document.getElementById('celularesContainer').innerHTML = `<div style="padding:40px;text-align:center;color:var(--text2);">Carregando...</div>`;
  let ativos = await dbGetAtivos();
  let list = ativos.filter(a => a.tipo === 'Celular');

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

  document.getElementById('celularesContainer').innerHTML = `<div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Celular</th><th>Patrimônio</th><th>Status</th><th>Número</th><th>Colaborador</th><th>Ações</th></tr></thead>
    <tbody>${list.map(a => `<tr>
      <td><span style="margin-right:8px;font-size:16px;color:var(--accent);"><i class="bi bi-phone"></i></span><b>${a.nome}</b></td>
      <td><span class="text-mono" style="font-size:11px;color:var(--text2);">${a.patrimonio}</span></td>
      <td>${statusBadge(a.status)}</td>
      <td><span class="text-mono" style="font-size:12px;">${a.numero_linha || '—'}</span></td>
      <td><span style="font-size:12px;">${a.colab || '—'}</span></td>
      <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetalheCelular('${a.id}')">Ver</button></td>
    </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text2);">Nenhum celular encontrado</td></tr>`}</tbody>
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
  ['celNome', 'celPatrimonio', 'celMarca', 'celModelo', 'celSerie', 'celProc', 'celDisco', 'celRam', 'celNumeroLinha', 'celImei1', 'celImei2', 'celColab', 'celLocalizacao', 'celObs'].forEach(i => {
    const el = document.getElementById(i); if (el) el.value = '';
  });
  document.getElementById('celStatus').value = 'disponivel';

  if (id) {
    const a = await dbGetAtivoById(id);
    if (!a) return;
    const fields = {
      Nome: 'nome', Patrimonio: 'patrimonio', Marca: 'marca', Modelo: 'modelo',
      Serie: 'serie', Proc: 'proc', Disco: 'disco', Ram: 'ram', NumeroLinha: 'numero_linha',
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
  const patri = document.getElementById('celPatrimonio').value.trim();
  if (!nome || !patri) { notify('Preencha nome e patrimônio', 'error'); return; }

  const payload = {
    nome, patrimonio: patri,
    marca: document.getElementById('celMarca').value,
    modelo: document.getElementById('celModelo').value,
    serie: document.getElementById('celSerie').value,
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
          ativo_nome: `${updated.nome} (${updated.patrimonio})`,
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
          ativo_id: created.id, ativo_nome: `${created.nome} (${created.patrimonio})`,
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
          ${a.patrimonio} • Celular${a.marca ? ` • ${a.marca}` : ''}${a.modelo ? ` ${a.modelo}` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${statusBadge(a.status)}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:20px;">
      <div class="detail-item"><div class="detail-label">Número (Linha)</div><div class="detail-value text-mono">${a.numero_linha || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Armazenamento / RAM</div><div class="detail-value">${a.disco || '—'} / ${a.ram || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Processador</div><div class="detail-value">${a.proc || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Nº de Série</div><div class="detail-value text-mono">${a.serie || '—'}</div></div>
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
        ativo_nome: `${a.nome} (${a.patrimonio})`,
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
