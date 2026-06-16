// ===================== DEVOLUÇÕES =====================
let _cacheDevolucoes = [];
let currentPageDev = 1;
const ITEMS_PER_PAGE_DEV = 10;

async function renderDevolucoes() {
  const list = await dbGetDevolucoes();
  _cacheDevolucoes = list;
  const statusOpts = ['pendente', 'concluida', 'expirada'];

  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE_DEV) || 1;
  if (currentPageDev > totalPages) currentPageDev = totalPages;
  const startIndex = (currentPageDev - 1) * ITEMS_PER_PAGE_DEV;
  const paginatedList = list.slice(startIndex, startIndex + ITEMS_PER_PAGE_DEV);

  document.getElementById('devolucoesTableBody').innerHTML = paginatedList.map(d => {
    let trStyle = '';
    if (d.status === 'expirada') trStyle = 'background-color: var(--danger-bg, #fee2e2);';
    else if (d.status === 'concluida') trStyle = 'opacity: 0.8;';

    return `<tr style="${trStyle}">
      <td><b>${d.colaborador || '—'}</b></td>
      <td>
        <span style="font-weight: 600;">${d.ativo_nome || '—'}</span>
        ${d.patrimonio ? `<br><span style="font-size:11px;color:var(--text2);">${d.patrimonio}</span>` : ''}
      </td>
      <td>
        <span class="text-mono" style="font-size:12px;color:var(--accent);">${d.codigo_devolucao || '—'}</span>
      </td>
      <td>
        ${fmtDate(d.validade) || '—'}
      </td>
      <td>
        <select onchange="updateDevStatus('${d.id}', this.value)"
          style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;font-family:var(--sans);cursor:pointer;">
          ${statusOpts.map(o => `<option value="${o}" ${d.status === o ? 'selected' : ''}>${o.charAt(0).toUpperCase() + o.slice(1)}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-sm" style="padding:4px 8px;" onclick="openDevDetalhe('${d.id}')" title="Ver Detalhes">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-danger btn-sm" style="padding:4px 8px;" onclick="deleteDevolucao('${d.id}')" title="Excluir">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text2);">Nenhuma devolução registrada</td></tr>`;

  const pagContainer = document.getElementById('devPagination');
  if (pagContainer) {
    if (list.length > ITEMS_PER_PAGE_DEV) {
      pagContainer.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="changePageDev(currentPageDev - 1)" ${currentPageDev === 1 ? 'disabled' : ''}>Anterior</button>
        <span style="display:flex;align-items:center;font-size:12px;color:var(--text2);">Página ${currentPageDev} de ${totalPages}</span>
        <button class="btn btn-ghost btn-sm" onclick="changePageDev(currentPageDev + 1)" ${currentPageDev === totalPages ? 'disabled' : ''}>Próxima</button>
      `;
    } else {
      pagContainer.innerHTML = '';
    }
  }
}

function changePageDev(page) {
  currentPageDev = page;
  renderDevolucoes();
}

function openDevDetalhe(id) {
  const d = _cacheDevolucoes.find(x => x.id === id);
  if (!d) return;
  alert(`Devolução (Status: ${d.status})

[ COLABORADOR ]
Nome: ${d.colaborador || '—'}

[ MÁQUINA ]
Nome: ${d.ativo_nome || '—'}
Patrimônio: ${d.patrimonio || '—'}

[ DETALHES ]
Motivo: ${d.motivo || '—'}
Código Correios/Logística: ${d.codigo_devolucao || '—'}
Geração do Código: ${fmtDate(d.data_geracao) || '—'}
Validade: ${fmtDate(d.validade) || '—'}

[ OBSERVAÇÕES ]
${d.obs || '—'}`);
}

async function updateDevStatus(id, status) {
  await dbUpdateDevolucao(id, { status });
  notify('Status da devolução atualizado!');
  renderDevolucoes();
}

async function deleteDevolucao(id) {
  if (!confirm('Tem certeza que deseja excluir este registro de devolução?')) return;
  await dbDeleteDevolucao(id);
  notify('Devolução excluída!');
  renderDevolucoes();
}

// ─── MODAL NOVA DEVOLUÇÃO ───

function openNovaDevolucao() {
  document.getElementById('devColaborador').value = '';
  document.getElementById('devMaquina').value = '';
  document.getElementById('devMotivo').value = '';
  document.getElementById('devCodigo').value = '';
  document.getElementById('devObs').value = '';
  
  // Calcular +15 dias úteis para a validade
  const date = new Date();
  let addedDays = 0;
  while (addedDays < 15) {
    date.setDate(date.getDate() + 1);
    // 0 = Domingo, 6 = Sábado
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      addedDays++;
    }
  }
  document.getElementById('devValidade').value = date.toISOString().split('T')[0];

  // Preencher datalist de ativos
  const datalist = document.getElementById('devAtivosList');
  if (datalist && window._cacheAtivos) {
    datalist.innerHTML = window._cacheAtivos
      .filter(a => a.status === 'em uso') // Preferencialmente máquinas em uso
      .map(a => `<option value="${a.nome} (${a.patrimonio})">`)
      .join('');
  }

  openModal('modalNovaDevolucao');
}

async function saveDevolucao() {
  const colab = document.getElementById('devColaborador').value.trim();
  const maquinaRaw = document.getElementById('devMaquina').value.trim();
  const motivo = document.getElementById('devMotivo').value.trim();
  const codigo = document.getElementById('devCodigo').value.trim();
  const validade = document.getElementById('devValidade').value;
  const obs = document.getElementById('devObs').value.trim();

  if (!colab || !maquinaRaw) {
    notify('Preencha os campos obrigatórios (*)', 'error');
    return;
  }

  // Tentar extrair o nome e o patrimônio do formato "Nome (Patrimônio)"
  let nomeMaquina = maquinaRaw;
  let patrimonio = '';
  const match = maquinaRaw.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    nomeMaquina = match[1].trim();
    patrimonio = match[2].trim();
  }

  // Tentar achar o ativo ID se existir na base
  let ativo_id = null;
  if (window._cacheAtivos) {
    const ativoObj = window._cacheAtivos.find(a => a.patrimonio === patrimonio || a.nome === nomeMaquina);
    if (ativoObj) ativo_id = ativoObj.id;
  }

  const payload = {
    colaborador: colab,
    ativo_id: ativo_id,
    ativo_nome: nomeMaquina,
    patrimonio: patrimonio,
    motivo: motivo,
    codigo_devolucao: codigo,
    data_geracao: new Date().toISOString().split('T')[0],
    validade: validade || null,
    obs: obs,
    status: 'pendente'
  };

  await dbCreateDevolucao(payload);
  notify('Devolução registrada com sucesso!');
  closeModal('modalNovaDevolucao');
  renderDevolucoes();
}
