// ===================== ATIVOS =====================
function _assetPhoto(fotos, icon) {
  if (fotos && fotos.length > 0) {
    return `<img src="${fotos[0].url}" alt="foto" style="width:100%;height:100%;object-fit:cover;"
      onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div class="asset-emoji-fallback" style="display:none;"><i class="bi bi-${icon || 'laptop'}"></i></div>`;
  }
  return `<div class="asset-emoji-fallback"><i class="bi bi-${icon || 'laptop'}"></i></div>`;
}

async function renderAtivos() {
  document.getElementById('ativosContainer').innerHTML = `<div style="padding:40px;text-align:center;color:var(--text2);">Carregando...</div>`;
  let list = await dbGetAtivos();
  _cacheAtivos = list;

  // Carregar fotos em paralelo (só a primeira de cada para o grid)
  const fotosMap = {};
  await Promise.all(list.map(async a => {
    const fotos = await dbGetFotos(a.id);
    fotosMap[a.id] = fotos;
  }));

  if (currentAtivoFilter !== 'todos') {
    list = list.filter(a => {
      const s = (a.status || '').trim().toLowerCase().replace(/_/g, ' ');
      return s === currentAtivoFilter;
    });
  }
  const search = document.getElementById('globalSearch').value.toLowerCase();
  if (search) list = list.filter(a =>
    (a.nome || '').toLowerCase().includes(search) ||
    (a.patrimonio || '').toLowerCase().includes(search) ||
    (a.colab || '').toLowerCase().includes(search) ||
    (a.marca || '').toLowerCase().includes(search) ||
    (a.modelo || '').toLowerCase().includes(search) ||
    (a.serie || '').toLowerCase().includes(search) ||
    (a.localizacao || '').toLowerCase().includes(search) ||
    (a.proc || '').toLowerCase().includes(search) ||
    (a.so || '').toLowerCase().includes(search)
  );

  if (currentView === 'grid') {
    document.getElementById('ativosContainer').innerHTML = `<div class="asset-grid">${list.map(a => `
        <div class="asset-card" onclick="openDetalhe('${a.id}')">
          <div class="asset-card-img">
            ${_assetPhoto(fotosMap[a.id], a.emoji)}
            <div class="badge-overlay">${statusBadge(a.status)}</div>
          </div>
          <div class="asset-card-body">
            <div class="asset-card-meta">
              <span class="asset-card-patrimonio">${a.patrimonio}</span>
              <span class="asset-card-tipo">${a.tipo || ''}</span>
            </div>
            <div class="asset-card-name">${a.nome}</div>
            <div class="asset-card-info">
              ${a.colab ? `<div class="asset-card-info-row"><i class="bi bi-person"></i> <span>${a.colab}</span></div>` : ''}
              <div class="asset-card-info-row">${saudeBadge(a.saude)}</div>
            </div>
          </div>
        </div>`).join('')
      || '<div class="empty"><div class="empty-icon"><i class="bi bi-laptop"></i></div><div class="empty-title">Nenhum ativo encontrado</div></div>'}
    </div>`;
  } else {
    document.getElementById('ativosContainer').innerHTML = `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Ativo</th><th>Patrimônio</th><th>Tipo</th><th>Status</th><th>Saúde</th><th>Colaborador</th><th>Garantia</th><th>Ações</th></tr></thead>
      <tbody>${list.map(a => `<tr>
        <td><span style="margin-right:8px;font-size:16px;color:var(--accent);"><i class="bi bi-${a.emoji || 'laptop'}"></i></span><b>${a.nome}</b></td>
        <td><span class="text-mono" style="font-size:11px;color:var(--text2);">${a.patrimonio}</span></td>
        <td><span style="font-size:12px;">${a.tipo || ''}</span></td>
        <td>${statusBadge(a.status)}</td>
        <td>${saudeBadge(a.saude)}</td>
        <td><span style="font-size:12px;">${a.colab || '—'}</span></td>
        <td>${garantiaBadge(a.garantia)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetalhe('${a.id}')">Ver</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  }
}

function filterAtivos(f, btn) {
  currentAtivoFilter = f;
  document.querySelectorAll('#ativoFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAtivos();
}

function setView(v) {
  currentView = v;
  document.getElementById('viewGrid').classList.toggle('active', v === 'grid');
  document.getElementById('viewList').classList.toggle('active', v === 'list');
  renderAtivos();
}

function openCreateModal() {
  const page = document.querySelector('.page.active').id.replace('page-', '');
  if (page === 'ativos') openNovoAtivo();
  else if (page === 'colaboradores') openNovoColab();
  else if (page === 'monitores') openNovoMonitor();
  else if (page === 'celulares') openNovoCelular();
}

async function openNovoAtivo(id = null) {
  editingAtivoId = id;
  document.getElementById('modalAtivoTitle').textContent = id ? 'Editar Ativo' : 'Novo Ativo';

  // Reset form
  ['ativoNome', 'ativoPatrimonio', 'ativoMarca', 'ativoModelo', 'ativoSerie',
    'ativoProc', 'ativoRam', 'ativoDisco', 'ativoSO', 'ativoColab', 'ativoLocalizacao', 'ativoObs', 'ativoFotoUrl', 'ativoAnexo'].forEach(i => {
      const el = document.getElementById(i); if (el) el.value = '';
    });
  document.getElementById('ativoStatus').value = 'disponivel';
  document.getElementById('ativoSaude').value = 'bom';
  document.getElementById('ativoTipo').value = 'Notebook';
  document.getElementById('ativoEmoji').value = 'laptop';
  document.getElementById('ativoGarantia').value = '';
  _renderFotoGallery([]);

  if (id) {
    const a = await dbGetAtivoById(id);
    if (!a) return;
    const fields = {
      Nome: 'nome', Patrimonio: 'patrimonio', Marca: 'marca', Modelo: 'modelo',
      Serie: 'serie', Proc: 'proc', Ram: 'ram', Disco: 'disco', SO: 'so',
      Colab: 'colab', Localizacao: 'localizacao', Obs: 'obs', Anexo: 'anexo'
    };
    Object.entries(fields).forEach(([fId, key]) => {
      const el = document.getElementById('ativo' + fId); if (el) el.value = a[key] || '';
    });
    document.getElementById('ativoTipo').value = a.tipo || 'Notebook';
    document.getElementById('ativoStatus').value = a.status || 'disponivel';
    document.getElementById('ativoSaude').value = a.saude || 'bom';
    document.getElementById('ativoEmoji').value = a.emoji || '💻';
    document.getElementById('ativoGarantia').value = a.garantia || '';
    const fotos = await dbGetFotos(id);
    _cacheAtivFotos[id] = fotos;
    _renderFotoGallery(fotos);
  }

  refreshColabDatalist();
  document.getElementById('modalNovoAtivo').classList.add('open');
}

// ─── Galeria de Fotos ─────────────────────────────────────
function _renderFotoGallery(fotos) {
  const container = document.getElementById('fotoGallery');
  if (!container) return;
  const MAX = 5;
  container.innerHTML = fotos.map((f, i) => `
    <div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);">
      <img src="${f.url}" style="width:100%;height:100%;object-fit:cover;">
      <button onclick="deletarFoto('${f.id}','${f.url}')"
        style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);border:none;color:#fff;
               border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;line-height:20px;text-align:center;">×</button>
    </div>`).join('') +
    (fotos.length < MAX ? `
      <label style="width:80px;height:80px;border:2px dashed var(--border);border-radius:8px;
                    display:flex;flex-direction:column;align-items:center;justify-content:center;
                    cursor:pointer;color:var(--text3);font-size:11px;gap:4px;transition:.15s;"
             onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
             onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">
        <span style="font-size:24px;"><i class="bi bi-camera"></i></span>Upload
        <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadFotos(this)">
      </label>` : '');
}

async function uploadFotos(input) {
  if (!editingAtivoId) {
    notify('Salve o ativo primeiro antes de adicionar fotos', 'error');
    return;
  }
  const fotos = _cacheAtivFotos[editingAtivoId] || [];
  const MAX = 5;
  const remaining = MAX - fotos.length;
  const files = Array.from(input.files).slice(0, remaining);
  if (!files.length) return;
  notify('Enviando fotos...');
  for (let i = 0; i < files.length; i++) {
    const nova = await dbUploadFoto(editingAtivoId, files[i], fotos.length + i);
    if (nova) fotos.push(nova);
  }
  _cacheAtivFotos[editingAtivoId] = fotos;
  _renderFotoGallery(fotos);
  notify('Fotos salvas!');
}

async function deletarFoto(fotoId, url) {
  if (!confirm('Excluir esta foto?')) return;
  await dbDeleteFoto(fotoId, url);
  if (editingAtivoId) {
    const fotos = await dbGetFotos(editingAtivoId);
    _cacheAtivFotos[editingAtivoId] = fotos;
    _renderFotoGallery(fotos);
  }
}

// ─── Salvar Ativo ─────────────────────────────────────────
async function saveAtivo() {
  const nome = document.getElementById('ativoNome').value.trim();
  const patri = document.getElementById('ativoPatrimonio').value.trim();
  if (!nome || !patri) { notify('Preencha nome e patrimônio', 'error'); return; }

  const payload = {
    nome, patrimonio: patri,
    marca: document.getElementById('ativoMarca')?.value || '',
    modelo: document.getElementById('ativoModelo')?.value || '',
    serie: document.getElementById('ativoSerie').value,
    tipo: document.getElementById('ativoTipo').value,
    proc: document.getElementById('ativoProc').value,
    ram: document.getElementById('ativoRam').value,
    disco: document.getElementById('ativoDisco').value,
    so: document.getElementById('ativoSO').value,
    status: document.getElementById('ativoStatus').value,
    saude: document.getElementById('ativoSaude').value,
    colab: document.getElementById('ativoColab').value,
    localizacao: document.getElementById('ativoLocalizacao')?.value || '',
    garantia: document.getElementById('ativoGarantia').value || null,
    obs: document.getElementById('ativoObs').value,
    emoji: document.getElementById('ativoEmoji').value,
    anexo: document.getElementById('ativoAnexo') ? document.getElementById('ativoAnexo').value : '',
  };

  if (editingAtivoId) {
    const old = await dbGetAtivoById(editingAtivoId);
    const updated = await dbUpdateAtivo(editingAtivoId, payload);
    if (updated) {
      notify('Ativo atualizado!');
      if (old && old.obs !== payload.obs) {
        await dbAddHistorico({
          ativo_id: editingAtivoId,
          ativo_nome: `${updated.nome} (${updated.patrimonio})`,
          colab: payload.colab || 'Sistema',
          obs: `Anotação alterada: ${payload.obs || '(removida)'}`
        });
      }
    }
  } else {
    const created = await dbCreateAtivo(payload);
    if (created) {
      editingAtivoId = created.id;
      notify('Ativo criado! Agora você pode adicionar fotos.');
      if (payload.colab) {
        await dbAddHistorico({
          ativo_id: created.id, ativo_nome: `${created.nome} (${created.patrimonio})`,
          colab: payload.colab, atribuido: new Date().toISOString().split('T')[0]
        });
      }
      // Abre novamente para permitir upload de fotos
      closeModal('modalNovoAtivo');
      await openNovoAtivo(created.id);
      return;
    }
  }
  closeModal('modalNovoAtivo');
  renderAtivos();
  updateStats();
}

// ─── Detalhe ──────────────────────────────────────────────
async function openDetalhe(id) {
  const a = await dbGetAtivoById(id);
  if (!a) return;
  const fotos = await dbGetFotos(id);

  const fotoHtml = fotos.length
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        ${fotos.map(f => `<img src="${f.url}" style="width:90px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border);">`).join('')}
       </div>`
    : `<div style="width:90px;height:70px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:16px;color:var(--text3);"><i class="bi bi-${a.emoji || 'laptop'}"></i></div>`;

  document.getElementById('modalDetalheBody').innerHTML = `
    <div style="display:flex;gap:20px;margin-bottom:20px;align-items:flex-start;">
      ${fotoHtml}
      <div>
        <div style="font-size:20px;font-weight:800;margin-bottom:4px;">${a.nome}</div>
        <div style="font-family:var(--mono);font-size:12px;color:var(--text2);margin-bottom:8px;">
          ${a.patrimonio} • ${a.tipo || ''}${a.marca ? ` • ${a.marca}` : ''}${a.modelo ? ` ${a.modelo}` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${statusBadge(a.status)} ${saudeBadge(a.saude)} ${garantiaBadge(a.garantia)}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:20px;">
      <div class="detail-item"><div class="detail-label">Processador</div><div class="detail-value">${a.proc || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">RAM</div><div class="detail-value">${a.ram || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Armazenamento</div><div class="detail-value">${a.disco || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Sistema Operacional</div><div class="detail-value">${a.so || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Nº de Série</div><div class="detail-value text-mono">${a.serie || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Garantia até</div><div class="detail-value">${fmtDate(a.garantia) || 'Sem garantia'}</div></div>
      <div class="detail-item"><div class="detail-label">Colaborador</div><div class="detail-value">${a.colab || '—'}</div></div>
      <div class="detail-item"><div class="detail-label">Localização</div><div class="detail-value">${a.localizacao || '—'}</div></div>
    </div>
    ${a.anexo ? `<div style="margin-bottom:12px;"><a href="${a.anexo.startsWith('http') ? a.anexo : 'https://' + a.anexo}" target="_blank" class="btn btn-ghost btn-sm" style="border:1px solid var(--border);"><i class="bi bi-link-45deg" style="margin-right:6px;"></i> Acessar Nota Fiscal / Anexo</a></div>` : ''}
    ${a.obs ? `<div class="alert alert-info"><i class="bi bi-sticky" style="margin-right:6px;"></i> ${a.obs}</div>` : ''}`;
  document.getElementById('btnEditAtivo').onclick = () => { closeModal('modalDetalheAtivo'); openNovoAtivo(id); };
  document.getElementById('btnDeleteAtivo').onclick = () => deleteAtivo(id);
  document.getElementById('modalDetalheAtivo').classList.add('open');
}

async function deleteAtivo(id) {
  if (!confirm('Tem certeza que deseja excluir este ativo?')) return;
  try {
    const a = await dbGetAtivoById(id);
    if (a) {
      await dbAddHistorico({
        ativo_nome: `${a.nome} (${a.patrimonio})`,
        colab: 'Sistema',
        obs: 'Exclusão de Ativo'
      });
    }
  } catch (e) {
    console.error('Erro ao registrar exclusão no histórico', e);
  }
  await dbDeleteAtivo(id);
  notify('Ativo excluído');
  closeModal('modalDetalheAtivo');
  renderAtivos();
  updateStats();
}
