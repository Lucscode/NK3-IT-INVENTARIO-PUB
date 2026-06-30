// ===================== COLABORADORES =====================
let currentPageColab = 1;
const COLAB_PER_PAGE = 20;

async function openNovoColab(id = null) {
  editingColabId = id;
  document.getElementById('modalColabTitle').textContent = id ? 'Editar Colaborador' : 'Novo Colaborador';
  ['colabNome','colabEmail','colabDept','colabCargo','colabTel'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('colabStatus').value = 'ativo';

  if (id) {
    const c = _cacheColabs.find(x => x.id === id);
    if (!c) return;
    document.getElementById('colabNome').value   = c.nome;
    document.getElementById('colabEmail').value  = c.email || '';
    document.getElementById('colabDept').value   = c.dept  || '';
    document.getElementById('colabCargo').value  = c.cargo || '';
    document.getElementById('colabTel').value    = c.tel   || '';
    document.getElementById('colabStatus').value = c.status;
  }
  document.getElementById('modalNovoColab').classList.add('open');
}

async function saveColab() {
  const nome  = document.getElementById('colabNome').value.trim();
  const email = document.getElementById('colabEmail').value.trim();
  if (!nome || !email) { notify('Preencha nome e email', 'error'); return; }
  const payload = {
    nome, email,
    dept:   document.getElementById('colabDept').value,
    cargo:  document.getElementById('colabCargo').value,
    tel:    document.getElementById('colabTel').value,
    status: document.getElementById('colabStatus').value,
  };
  if (editingColabId) {
    await dbUpdateColab(editingColabId, payload);
    notify('Colaborador atualizado!');
  } else {
    await dbCreateColab(payload);
    notify('Colaborador criado!');
  }
  closeModal('modalNovoColab');
  await renderColabs();
  refreshColabDatalist();
}

async function deleteColab(id) {
  if (!confirm('Excluir este colaborador?')) return;
  await dbDeleteColab(id);
  notify('Colaborador excluído');
  await renderColabs();
  refreshColabDatalist();
}

async function renderColabs() {
  const colabs = await dbGetColabs();
  _cacheColabs = colabs;
  const search = document.getElementById('globalSearch').value.toLowerCase().trim();
  let list = colabs;
  if (search) {
    const _n = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const terms = _n(search).split(/\s+/);
    list = list.filter(c => {
      const fullText = _n([c.nome, c.email, c.dept].join(' '));
      return terms.every(t => fullText.includes(t));
    });
  }

  // Subtítulo
  const sub = document.getElementById('pageSub');
  if (sub) sub.textContent = `${colabs.length} colaboradores cadastrados`;

  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / COLAB_PER_PAGE) || 1;
  if (currentPageColab > totalPages) currentPageColab = totalPages;
  const startIdx = (currentPageColab - 1) * COLAB_PER_PAGE;
  const pagedList = list.slice(startIdx, startIdx + COLAB_PER_PAGE);

  document.getElementById('colabTableBody').innerHTML = pagedList.map(c => {
    const ativos = _cacheAtivos.filter(a => a.colab === c.nome).length;
    const deptColor = c.dept ? '#3b82f6' : 'var(--text3)';
    return `<tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--text2);flex-shrink:0;">
            ${c.nome.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600;font-size:13px;color:var(--accent);cursor:pointer;" onclick="openNovoColab('${c.id}')">${c.nome}</div>
            ${c.tel ? `<div style="font-size:11px;color:var(--text2);">${c.tel}</div>` : ''}
          </div>
        </div>
      </td>
      <td><a href="mailto:${c.email||''}" style="color:var(--accent);font-size:12px;text-decoration:none;">${c.email||'—'}</a></td>
      <td>
        ${c.dept
          ? `<span style="background:${deptColor}1a;color:${deptColor};font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;">${c.dept}</span>`
          : `<span style="color:var(--text3);font-size:12px;">—</span>`}
      </td>
      <td><span style="font-size:12px;color:var(--text2);">${c.cargo||'—'}</span></td>
      <td><span class="badge badge-blue" style="font-size:11px;">${ativos}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button onclick="openNovoColab('${c.id}')"
            style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--text2);font-size:16px;transition:.15s;"
            title="Editar" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--text2)'">✏️</button>
          <button onclick="deleteColab('${c.id}')"
            style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--text2);font-size:16px;transition:.15s;"
            title="Excluir" onmouseover="this.style.color='#ef4444'" onmouseout="this.style.color='var(--text2)'">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text2);">Nenhum colaborador encontrado</td></tr>`;

  // Adicionar paginação abaixo da tabela (temos que injetar fora do tbody ou dentro do container, mas a função injeta direto no tbody)
  // Vou usar o parentNode do table ou adicionar uma linha especial
  if (totalPages > 1) {
    document.getElementById('colabTableBody').insertAdjacentHTML('beforeend', `
      <tr>
        <td colspan="6" style="padding: 16px 0; border-bottom: none;">
          <div style="display:flex; justify-content:center; align-items:center; gap:16px;">
            <button class="btn btn-ghost" onclick="changePageColab(${currentPageColab - 1})" ${currentPageColab === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Anterior</button>
            <span style="font-size:13px; color:var(--text2); font-weight:600;">Página ${currentPageColab} de ${totalPages}</span>
            <button class="btn btn-ghost" onclick="changePageColab(${currentPageColab + 1})" ${currentPageColab === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Próxima</button>
          </div>
        </td>
      </tr>
    `);
  }
}

function changePageColab(p) {
  currentPageColab = p;
  renderColabs();
}
