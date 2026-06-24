// ===================== ATIVOS =====================
let currentAtivoTipoFilter = 'todos';
let currentPageAtivos = 1;
const ATIVOS_PER_PAGE = 20;
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

  // Usar fotos já embutidas no retorno (ativo_fotos vem junto no select)
  const fotosMap = {};
  list.forEach(a => { fotosMap[a.id] = a.ativo_fotos || []; });

  // Atualizar contagens nos botões de filtro
  _updateAtivoFilterCounts(list);

  const _normS = s => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

  if (currentAtivoTipoFilter !== 'todos' && currentAtivoTipoFilter !== 'todos_geral') {
    list = list.filter(a => _normS(a.tipo) === _normS(currentAtivoTipoFilter));
  } else if (currentAtivoTipoFilter === 'todos') {
    const tiposDedicados = ['celular', 'monitor'];
    list = list.filter(a => !tiposDedicados.includes(_normS(a.tipo)));
  }

  if (currentAtivoFilter !== 'todos') {
    if (currentAtivoFilter === 'offline') {
      list = list.filter(a => getOfflineStatus(a) !== null);
    } else if (currentAtivoFilter === 'ram_upgrade') {
      list = list.filter(a => {
        const status = (a.status || '').toLowerCase();
        if (status !== 'estoque' && status !== 'em uso') return false;
        const mem = parseInt(a.rmm_mem_percent) || 0;
        let ramValue = 999;
        const match = (a.ram || '').match(/(\d+)/);
        if (match) ramValue = parseInt(match[1]);
        return mem >= 90 || (ramValue > 0 && ramValue < 16);
      });
    } else if (currentAtivoFilter === 'hd_cheio') {
      list = list.filter(a => (parseInt(a.rmm_disk_percent) || 0) >= 90);
    } else {
      list = list.filter(a => _normS(a.status) === _normS(currentAtivoFilter));
    }
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

  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / ATIVOS_PER_PAGE) || 1;
  if (currentPageAtivos > totalPages) currentPageAtivos = totalPages;
  const startIdx = (currentPageAtivos - 1) * ATIVOS_PER_PAGE;
  const pagedList = list.slice(startIdx, startIdx + ATIVOS_PER_PAGE);

  let html = '';
  if (currentView === 'grid') {
    html = `<div class="asset-grid">${pagedList.map(a => {
        const off = getOfflineStatus(a);
        return `
        <div class="asset-card" onclick="openDetalhe('${a.id}')">
          <div class="asset-card-img">
            ${_assetPhoto(fotosMap[a.id], a.emoji)}
            <div class="badge-overlay" style="display:flex; flex-direction:column; gap:4px; align-items:flex-end;">
              ${statusBadge(a.status)}
              ${off ? `<span class="badge" style="background:${off.color};color:#fff;font-size:10px;padding:2px 6px;box-shadow:0 2px 4px rgba(0,0,0,0.2);"><i class="bi bi-wifi-off"></i> ${off.label}</span>` : ''}
            </div>
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
        </div>`;
      }).join('')
      || '<div class="empty" style="grid-column:1/-1;"><div class="empty-icon"><i class="bi bi-laptop"></i></div><div class="empty-title">Nenhum ativo encontrado</div></div>'}
    </div>`;
  } else {
    html = `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Ativo</th><th>Patrimônio</th><th>Tipo</th><th>Status</th><th>Saúde</th><th>Colaborador</th><th>Garantia</th><th>Ações</th></tr></thead>
      <tbody>${pagedList.map(a => {
        const off = getOfflineStatus(a);
        return `<tr>
        <td><span style="margin-right:8px;font-size:16px;color:var(--accent);"><i class="bi bi-${a.emoji || 'laptop'}"></i></span><b>${a.nome}</b></td>
        <td><span class="text-mono" style="font-size:11px;color:var(--text2);">${a.patrimonio}</span></td>
        <td><span style="font-size:12px;">${a.tipo || ''}</span></td>
        <td>
          ${statusBadge(a.status)}
          ${off ? `<div style="margin-top:4px;"><span class="badge" style="background:${off.color};color:#fff;font-size:10px;padding:2px 6px;"><i class="bi bi-wifi-off"></i> ${off.label}</span></div>` : ''}
        </td>
        <td>${saudeBadge(a.saude)}</td>
        <td><span style="font-size:12px;">${a.colab || '—'}</span></td>
        <td>${garantiaBadge(a.garantia)}</td>
        <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openDetalhe('${a.id}')">Ver</button></td>
      </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
  }

  if (totalPages > 1) {
    html += `
      <div style="display:flex; justify-content:center; align-items:center; gap:16px; margin-top:24px;">
        <button class="btn btn-ghost" onclick="changePageAtivos(${currentPageAtivos - 1})" ${currentPageAtivos === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Anterior</button>
        <span style="font-size:13px; color:var(--text2); font-weight:600;">Página ${currentPageAtivos} de ${totalPages}</span>
        <button class="btn btn-ghost" onclick="changePageAtivos(${currentPageAtivos + 1})" ${currentPageAtivos === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Próxima</button>
      </div>
    `;
  }

  document.getElementById('ativosContainer').innerHTML = html;
}

function changePageAtivos(p) {
  currentPageAtivos = p;
  renderAtivos();
}

function filterAtivos(f) {
  currentAtivoFilter = f;
  currentPageAtivos = 1;
  renderAtivos();
}

function filterAtivoTipo(tipo) {
  currentAtivoTipoFilter = tipo;
  currentPageAtivos = 1;
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
      <div style="display:flex;gap:8px;">
        <label style="width:80px;height:80px;border:2px dashed var(--border);border-radius:8px;
                      display:flex;flex-direction:column;align-items:center;justify-content:center;
                      cursor:pointer;color:var(--text3);font-size:11px;gap:4px;transition:.15s;"
               onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">
          <span style="font-size:24px;"><i class="bi bi-camera"></i></span>Câmera
          <input type="file" accept="image/*" capture="environment" style="display:none;" onchange="uploadFotos(this)">
        </label>
        <label style="width:80px;height:80px;border:2px dashed var(--border);border-radius:8px;
                      display:flex;flex-direction:column;align-items:center;justify-content:center;
                      cursor:pointer;color:var(--text3);font-size:11px;gap:4px;transition:.15s;"
               onmouseover="this.style.borderColor='var(--accent)';this.style.color='var(--accent)'"
               onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">
          <span style="font-size:24px;"><i class="bi bi-images"></i></span>Galeria
          <input type="file" accept="image/*" multiple style="display:none;" onchange="uploadFotos(this)">
        </label>
      </div>` : '');
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
        ${fotos.map(f => `<img src="${f.url}" style="width:90px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;" onclick="openLightbox('${f.url}')">`).join('')}
       </div>`
    : `<div style="width:90px;height:70px;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:16px;color:var(--text3);"><i class="bi bi-${a.emoji || 'laptop'}"></i></div>`;

  document.getElementById('modalDetalheBody').innerHTML = `
    <!-- Cabeçalho Principal -->
    <div style="display:flex;gap:20px;margin-bottom:24px;align-items:flex-start;padding-bottom:20px;border-bottom:1px solid var(--border);">
      ${fotoHtml}
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:20px;font-weight:800;margin-bottom:4px;display:flex;align-items:center;gap:8px;">
              ${a.nome} <span style="font-family:var(--mono);font-size:12px;font-weight:normal;color:var(--text3);background:var(--bg3);padding:2px 6px;border-radius:4px;">${a.patrimonio}</span>
            </div>
            <div style="font-size:13px;color:var(--text2);margin-bottom:12px;display:flex;align-items:center;gap:6px;">
              <i class="bi bi-${a.emoji || 'laptop'}"></i> ${a.marca || ''} ${a.modelo || ''} 
              ${a.so ? `<span style="margin:0 6px;color:var(--border);">|</span><i class="bi ${
                a.so.toLowerCase().includes('mac') || a.so.toLowerCase().includes('apple') || a.so.toLowerCase().includes('ios') ? 'bi-apple' :
                a.so.toLowerCase().includes('linux') || a.so.toLowerCase().includes('ubuntu') || a.so.toLowerCase().includes('debian') ? 'bi-ubuntu' :
                a.so.toLowerCase().includes('android') ? 'bi-android2' : 'bi-windows'
              }"></i> ${a.so}` : ''}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:300px;">
            ${a.rmm_status ? `<span class="badge" style="background:${a.rmm_status === 'online' ? 'var(--success)' : 'var(--danger)'};color:#fff;"><i class="bi ${a.rmm_status === 'online' ? 'bi-check-circle' : 'bi-x-circle'}"></i> RMM: ${a.rmm_status.toUpperCase()}</span>` : ''}
            ${statusBadge(a.status)} ${saudeBadge(a.saude)} ${garantiaBadge(a.garantia)}
          </div>
        </div>
      </div>
    </div>

    <!-- Corpo com Duas Colunas -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:24px;margin-bottom:20px;">
      
      <!-- Coluna Esquerda: Hardware Details -->
      <div style="background:var(--bg2);padding:16px;border-radius:8px;border:1px solid var(--border);">
        <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);margin-bottom:16px;margin-top:0;">Detalhes de Hardware</h3>
        
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-cpu"></i></div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Processador</div>
              <div style="font-size:13px;font-weight:500;color:var(--text);">${a.proc || '—'}</div>
            </div>
          </div>
          
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-memory"></i></div>
            <div style="flex:1;">
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Memória RAM</div>
              <div style="font-size:13px;font-weight:500;color:var(--text);">${a.ram || '—'}</div>
              ${a.rmm_mem_percent ? `
              <div style="margin-top:6px;background:var(--bg3);height:6px;border-radius:3px;overflow:hidden;width:100%;max-width:200px;">
                <div style="height:100%;background:${parseInt(a.rmm_mem_percent) > 85 ? 'var(--danger)' : parseInt(a.rmm_mem_percent) > 70 ? 'var(--warning)' : 'var(--success)'};width:${a.rmm_mem_percent}%;"></div>
              </div>
              <div style="font-size:10px;color:var(--text3);margin-top:2px;">Uso atual: ${a.rmm_mem_percent}%</div>
              ` : ''}
            </div>
          </div>
          
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-device-hdd"></i></div>
            <div style="flex:1;">
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Armazenamento</div>
              <div style="font-size:13px;font-weight:500;color:var(--text);">${a.disco || '—'}</div>
              ${a.rmm_disk_percent ? `
              <div style="margin-top:6px;background:var(--bg3);height:6px;border-radius:3px;overflow:hidden;width:100%;max-width:200px;">
                <div style="height:100%;background:${parseInt(a.rmm_disk_percent) > 90 ? 'var(--danger)' : parseInt(a.rmm_disk_percent) > 75 ? 'var(--warning)' : 'var(--success)'};width:${a.rmm_disk_percent}%;"></div>
              </div>
              <div style="font-size:10px;color:var(--text3);margin-top:2px;">Uso atual: ${a.rmm_disk_percent}%</div>
              ` : ''}
            </div>
          </div>
          
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-upc-scan"></i></div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Número de Série</div>
              <div style="font-family:var(--mono);font-size:13px;font-weight:500;color:var(--text);">${a.serie || '—'}</div>
            </div>
          </div>
          
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-shield-check"></i></div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Garantia</div>
              <div style="font-size:13px;font-weight:500;color:var(--text);">${fmtDate(a.garantia) || 'Sem garantia'}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Coluna Direita: Informações de Inventário -->
      <div style="background:var(--bg2);padding:16px;border-radius:8px;border:1px solid var(--border);">
        <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text3);margin-bottom:16px;margin-top:0;">Inventário</h3>
        
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-person"></i></div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Colaborador Vinculado</div>
              <div style="font-size:13px;font-weight:500;color:var(--text);">${a.colab || 'Nenhum (Disponível)'}</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-geo-alt"></i></div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Localização</div>
              <div style="font-size:13px;font-weight:500;color:var(--text);">${a.localizacao || '—'}</div>
            </div>
          </div>

          <div style="display:flex;gap:12px;align-items:flex-start;">
            <div style="font-size:18px;color:var(--text2);width:24px;text-align:center;"><i class="bi bi-tag"></i></div>
            <div>
              <div style="font-size:11px;color:var(--text3);text-transform:uppercase;">Tipo de Equipamento</div>
              <div style="font-size:13px;font-weight:500;color:var(--text);">${a.tipo || '—'}</div>
            </div>
          </div>

          ${a.obs ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--border);">
            <div style="font-size:11px;color:var(--text3);text-transform:uppercase;margin-bottom:4px;"><i class="bi bi-sticky" style="margin-right:4px;"></i> Observações</div>
            <div style="font-size:12px;color:var(--text2);">${a.obs}</div>
          </div>` : ''}

          ${a.anexo ? `
          <div style="margin-top:12px;">
            <a href="${a.anexo.startsWith('http') ? a.anexo : 'https://' + a.anexo}" target="_blank" class="btn btn-ghost btn-sm" style="border:1px solid var(--border);width:100%;justify-content:center;">
              <i class="bi bi-file-earmark-text" style="margin-right:6px;"></i> Ver Nota Fiscal / Anexo
            </a>
          </div>` : ''}
        </div>
      </div>

    </div>
  `;
  const btnEdit = document.getElementById('btnEditAtivo');
  if (btnEdit) { btnEdit.style.display = ''; btnEdit.onclick = () => { closeModal('modalDetalheAtivo'); openNovoAtivo(id); }; }
  const btnDelete = document.getElementById('btnDeleteAtivo');
  if (btnDelete) { btnDelete.style.display = ''; btnDelete.onclick = () => deleteAtivo(id); }
  
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

// ── Contagens nos filtros ──────────────────────────────────
function _updateAtivoFilterCounts(fullList) {
  const norm = s => (s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
  const tiposDedicados = ['celular', 'monitor'];
  const semDedicados = fullList.filter(a => !tiposDedicados.includes(norm(a.tipo)));

  // ── Filtros de Tipo ──────────────────────────────────────
  const tipoFilters = [
    { label: 'Todos os Tipos',       value: 'todos' },
    { label: 'Geral (Inclui todos)', value: 'todos_geral' },
    { label: 'Notebook',  value: 'Notebook' },
    { label: 'Desktop', value: 'Desktop' },
    { label: 'Monitor',  value: 'Monitor' },
    { label: 'Celular',    value: 'Celular' },
    { label: 'Tablet',    value: 'Tablet' },
    { label: 'Periférico', value: 'Periférico' },
    { label: 'Servidor', value: 'Servidor' },
  ];

  const tipoCount = v => {
    if (v === 'todos_geral') return fullList.length;
    if (v === 'todos') return semDedicados.length;
    return fullList.filter(a => norm(a.tipo) === norm(v)).length;
  };

  const tipoContainer = document.getElementById('ativoTipoSelect');
  if (tipoContainer) {
    tipoContainer.innerHTML = tipoFilters.map(f => {
      const n = tipoCount(f.value);
      const selected = currentAtivoTipoFilter === f.value ? ' selected' : '';
      return `<option value="${f.value}"${selected}>${f.label} (${n})</option>`;
    }).join('');
  }

  // ── Filtros de Status ────────────────────────────────────
  // Contagem baseada na lista após filtro de tipo
  const listParaStatus = currentAtivoTipoFilter === 'todos_geral'
    ? fullList
    : (currentAtivoTipoFilter !== 'todos'
      ? fullList.filter(a => norm(a.tipo) === norm(currentAtivoTipoFilter))
      : semDedicados);

  const statusFilters = [
    { label: 'Qualquer Status',       value: 'todos' },
    { label: 'Disponível',  value: 'disponivel' },
    { label: 'Em Uso',      value: 'em uso' },
    { label: 'Manutenção',  value: 'manutencao' },
    { label: 'Estoque',     value: 'estoque' },
    { label: 'Descartado',  value: 'descartado' },
    { label: 'Saindo para envio',  value: 'saindo para envio' },
    { label: 'Entregue',  value: 'entregue' },
    { label: 'Não postado ainda',  value: 'nao postado ainda' },
    { label: 'Offline (RMM)',  value: 'offline' },
    { label: 'Upgrade de RAM', value: 'ram_upgrade' },
    { label: 'HD Quase Cheio', value: 'hd_cheio' }
  ];

  const statusCount = v => {
    if (v === 'todos') return listParaStatus.length;
    if (v === 'offline') return listParaStatus.filter(a => getOfflineStatus(a) !== null).length;
    if (v === 'ram_upgrade') {
      return listParaStatus.filter(a => {
        const status = (a.status || '').toLowerCase();
        if (status !== 'estoque' && status !== 'em uso') return false;
        const mem = parseInt(a.rmm_mem_percent) || 0;
        let ramValue = 999;
        const match = (a.ram || '').match(/(\d+)/);
        if (match) ramValue = parseInt(match[1]);
        return mem >= 90 || (ramValue > 0 && ramValue < 16);
      }).length;
    }
    if (v === 'hd_cheio') return listParaStatus.filter(a => (parseInt(a.rmm_disk_percent) || 0) >= 90).length;
    return listParaStatus.filter(a => norm(a.status) === norm(v)).length;
  };

  const statusContainer = document.getElementById('ativoStatusSelect');
  if (statusContainer) {
    statusContainer.innerHTML = statusFilters.map(f => {
      const n = statusCount(f.value);
      const selected = currentAtivoFilter === f.value ? ' selected' : '';
      return `<option value="${f.value}"${selected}>${f.label} (${n})</option>`;
    }).join('');
  }
}
