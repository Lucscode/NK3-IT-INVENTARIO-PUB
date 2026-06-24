// ===================== SOLICITAÇÕES =====================
let currentPageSol = 1;
const ITEMS_PER_PAGE_SOL = 10;

async function renderSolicitacoes() {
  const list = await dbGetSolicitacoes();
  _cacheSolicitacoes = list;
  const statusOpts = ['pendente', 'em andamento', 'enviado', 'entregue', 'cancelado'];

  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE_SOL) || 1;
  if (currentPageSol > totalPages) currentPageSol = totalPages;
  const startIndex = (currentPageSol - 1) * ITEMS_PER_PAGE_SOL;
  const paginatedList = list.slice(startIndex, startIndex + ITEMS_PER_PAGE_SOL);

  document.getElementById('solTableBody').innerHTML = paginatedList.map(s => `<tr>
    <td><b>${s.nome || s.colaborador || s.colab || '—'}</b><br><span style="font-size:11px;color:var(--text2);">${s.email || ''}</span>
      ${s.obs && s.obs.includes('[TROCA DE MÁQUINA]') ? '<br><span class="badge" style="background:#8b5cf6;color:white;font-size:10px;padding:2px 4px;margin-top:4px;display:inline-block;">Troca de Máquina</span>' : ''}
    </td>
    <td>${s.cpf || '—'}</td>
    <td>${fmtDate(s.inicio)}</td>
    <td>${s.kit ? '<span class="badge badge-green">Sim</span>' : '<span class="badge badge-gray">Não</span>'}</td>
    <td>
      <select onchange="updateSolStatus('${s.id}',this.value)"
        style="${
          s.status === 'entregue' ? 'background:#dcfce7;color:#16a34a;border:1px solid #bbf7d0;' :
          s.status === 'enviado' ? 'background:#fef9c3;color:#ca8a04;border:1px solid #fde047;' :
          s.status === 'pendente' ? 'background:#f3f4f6;color:#6b7280;border:1px solid #e5e7eb;' :
          s.status === 'em andamento' ? 'background:#dbeafe;color:#2563eb;border:1px solid #bfdbfe;' :
          s.status === 'cancelado' ? 'background:#fee2e2;color:#dc2626;border:1px solid #fecaca;' :
          'background:var(--bg3);color:var(--text);border:1px solid var(--border);'
        }border-radius:6px;padding:4px 8px;font-size:12px;font-family:var(--sans);cursor:pointer;font-weight:600;">
        ${statusOpts.map(o => `<option value="${o}" ${s.status === o ? 'selected' : ''} style="background:#fff;color:#333;font-weight:normal;">${o.charAt(0).toUpperCase() + o.slice(1)}</option>`).join('')}
      </select>
    </td>
    <td>
      <div style="display:flex;align-items:center;gap:6px;">
        <input type="text" value="${s.rastreio || ''}" placeholder="Código..."
          onblur="updateSolRastreio('${s.id}',this.value)"
          style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;font-family:var(--sans);width:110px;">
        ${s.rastreio
      ? `<a href="https://www.linkcorreios.com.br/${s.rastreio}" target="_blank"
               title="Rastrear nos Correios"
               style="color:var(--accent);font-size:16px;text-decoration:none;">
               <i class="bi bi-box-seam"></i>
             </a>`
      : ''}
      </div>
      ${s.rastreio
      ? `<div id="badge-rastreio-${s.id}"
               style="margin-top:6px;font-size:10px;font-weight:700;padding:2px 6px;
                      border-radius:4px;background:var(--bg3);color:var(--text2);display:inline-block;">
             Verificando...
           </div>`
      : ''}
    </td>
    <td>
      <div style="display:flex;gap:4px;">
        <button class="btn btn-ghost btn-sm" style="padding:4px 8px;"
          onclick="openSolDetalhe('${s.id}')" title="Ver Detalhes">
          <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-danger btn-sm" style="padding:4px 8px;"
          onclick="deleteSol('${s.id}')" title="Excluir">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </td>
  </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text2);">Nenhuma solicitação</td></tr>`;

  const pagContainer = document.getElementById('solPagination');
  if (pagContainer) {
    if (list.length > ITEMS_PER_PAGE_SOL) {
      pagContainer.innerHTML = `
        <button class="btn btn-ghost btn-sm" onclick="changePageSol(currentPageSol - 1)" ${currentPageSol === 1 ? 'disabled' : ''}>Anterior</button>
        <span style="display:flex;align-items:center;font-size:12px;color:var(--text2);">Página ${currentPageSol} de ${totalPages}</span>
        <button class="btn btn-ghost btn-sm" onclick="changePageSol(currentPageSol + 1)" ${currentPageSol === totalPages ? 'disabled' : ''}>Próxima</button>
      `;
    } else {
      pagContainer.innerHTML = '';
    }
  }

  // Carrega badges de rastreio de forma assíncrona
  paginatedList.forEach(s => {
    if (s.rastreio) loadRastreioBadge(s.id, s.rastreio);
  });
}

function changePageSol(page) {
  currentPageSol = page;
  renderSolicitacoes();
}

async function loadRastreioBadge(id, codigo) {
  const badge = document.getElementById(`badge-rastreio-${id}`);
  if (!badge) return;

  try {
    // Usa a API pública dos Correios via rastreamento direto
    const url = `https://linketrack.com/track/json?user=teste&token=1abcd00b2731640e886fb41a8a9671ad1434c599dbaa0a0de9a5aa619f29a83f&codigo=${codigo}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

    if (!res.ok) throw new Error('API indisponível');
    const data = await res.json();

    if (!data || !data.eventos || data.eventos.length === 0) {
      badge.textContent = 'Sem info';
      badge.style.background = '#f3f4f6';
      badge.style.color = '#6b7280';
      return;
    }

    const status = (data.eventos[0].status || '').toLowerCase();
    let texto = 'Em Trânsito';
    let bg = '#3b82f6';

    if (status.includes('entregue')) { texto = 'Entregue'; bg = '#10b981'; }
    else if (status.includes('saiu')) { texto = 'Saiu p/ Entrega'; bg = '#8b5cf6'; }
    else if (status.includes('postado')) { texto = 'Postado'; bg = '#f59e0b'; }
    else if (status.includes('aguardando')) { texto = 'Aguardando'; bg = '#eab308'; }
    else if (status.includes('devolvido')) { texto = 'Devolvido'; bg = '#ef4444'; }

    badge.textContent = texto;
    badge.style.background = bg;
    badge.style.color = '#fff';

  } catch (e) {
    // Silencia o erro — só mostra link do rastreio
    badge.textContent = 'Ver nos Correios';
    badge.style.background = '#eff6ff';
    badge.style.color = '#2563eb';
    badge.style.cursor = 'pointer';
    badge.onclick = () => window.open(`https://www.linkcorreios.com.br/${codigo}`, '_blank');
  }
}

async function updateSolStatus(id, status) {
  await dbUpdateSolStatus(id, status);
  updatePendBadge();
  notify('Status atualizado!');
  renderSolicitacoes();
}

async function updateSolRastreio(id, rastreio) {
  try {
    await dbUpdateSolRastreio(id, rastreio);
    notify('Rastreio atualizado!');
    renderSolicitacoes();
  } catch (e) {
    notify('Erro ao salvar rastreio', 'error');
  }
}

function openSolDetalhe(id) {
  const s = _cacheSolicitacoes.find(x => x.id === id);
  if (!s) return;
  alert(`Solicitação #${s.id.split('-')[0]}

[ COLABORADOR ]
Nome: ${s.nome || s.colaborador || s.colab || '—'}
CPF: ${s.cpf || '—'}
E-mail: ${s.email || '—'}
Início: ${fmtDate(s.inicio)}

[ ENDEREÇO DE ENTREGA ]
CEP: ${s.cep || '—'}
Rua: ${s.rua || '—'}, Nº ${s.numero || '—'}
Bairro: ${s.bairro || '—'}
Complemento: ${s.complemento || '—'}

[ PEDIDO ]
Kit Boas-Vindas: ${s.kit ? 'Sim' : 'Não'}
Rastreio: ${s.rastreio || '—'}
Observações: ${s.obs || '—'}`);
}

async function deleteSol(id) {
  if (!confirm('Tem certeza que deseja excluir esta solicitação?')) return;
  await dbDeleteSolicitacao(id);
  notify('Solicitação excluída!');
  renderSolicitacoes();
}

function openNovaSolicitacao() {
  document.getElementById('adminSolNome').value = '';
  document.getElementById('adminSolCpf').value = '';
  document.getElementById('adminSolEmail').value = '';
  document.getElementById('adminSolInicio').value = '';
  document.getElementById('adminSolCep').value = '';
  document.getElementById('adminSolBairro').value = '';
  document.getElementById('adminSolCidade').value = '';
  document.getElementById('adminSolUf').value = '';
  document.getElementById('adminSolRua').value = '';
  document.getElementById('adminSolNumero').value = '';
  document.getElementById('adminSolComplemento').value = '';
  document.getElementById('adminSolKit').checked = false;
  if(document.getElementById('adminSolTroca')) document.getElementById('adminSolTroca').checked = false;
  document.querySelectorAll('.adminSolAcessorio').forEach(el => el.checked = false);
  document.getElementById('adminSolObs').value = '';

  openModal('modalNovaSolicitacao');
}

async function enviarSolicitacaoAdmin() {
  const nome  = document.getElementById('adminSolNome').value.trim();
  const cpf   = document.getElementById('adminSolCpf').value.trim();
  const email = document.getElementById('adminSolEmail').value.trim();
  const inicio = document.getElementById('adminSolInicio').value;
  const cep = document.getElementById('adminSolCep').value.trim();
  const bairro = document.getElementById('adminSolBairro').value.trim();
  const cidade = document.getElementById('adminSolCidade').value.trim();
  const uf = document.getElementById('adminSolUf').value.trim();
  const rua = document.getElementById('adminSolRua').value.trim();
  const numero = document.getElementById('adminSolNumero').value.trim();
  
  if (!nome || !cpf || !cep || !bairro || !cidade || !uf || !rua || !numero) { 
    notify('Preencha os campos obrigatórios (*)', 'error'); return; 
  }

  const comp = document.getElementById('adminSolComplemento').value.trim();
  const complementoStr = comp ? `${comp} (${cidade}/${uf.toUpperCase()})` : `${cidade}/${uf.toUpperCase()}`;

  const acessoriosEls = document.querySelectorAll('.adminSolAcessorio:checked');
  const acessorios = Array.from(acessoriosEls).map(el => el.value);
  let finalObs = document.getElementById('adminSolObs').value.trim();
  if (acessorios.length > 0) {
    finalObs = `[Acessórios: ${acessorios.join(', ')}]\n\n` + finalObs;
  }
  const isTroca = document.getElementById('adminSolTroca') && document.getElementById('adminSolTroca').checked;
  if (isTroca) {
    finalObs = `[TROCA DE MÁQUINA]\n\n` + finalObs;
  }

  const isKit = document.getElementById('adminSolKit').checked;

  await dbCreateSolicitacao({
    colaborador: nome,
    cpf,
    email,
    inicio: inicio || null,
    cep,
    bairro,
    rua,
    numero,
    complemento: complementoStr,
    kit: isKit,
    obs: finalObs,
    status: 'pendente'
  });
  
  // Automação de Baixa de Kit
  if (isKit) {
    try {
      // 1. Debita 1 de cada item do estoque de kits
      const estoque = await dbGetKitEstoque();
      for (const item of Object.keys(estoque)) {
        const atual = parseInt(estoque[item], 10) || 0;
        await dbUpdateKitItem(item, Math.max(0, atual - 1));
      }
      // 2. Adiciona o registro no Histórico de Kits
      await dbAddKitHistorico({
        colab: nome,
        quantidade: 1,
        obs: 'Gerado automaticamente via Nova Solicitação',
        data: inicio || new Date().toISOString().split('T')[0],
        status: 'pendente'
      });
    } catch (e) {
      console.error('Erro na automação do kit:', e);
    }
  }
  
  // ─── DISPARO DE EMAIL (EmailJS) ──────────────────────────
  try {
    const SERVICE_ID = 'service_4cvr6ms';
    const TEMPLATE_ID = 'template_z2641sb';
    
    // Dispara o e-mail em background sem travar a tela
    emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      colaborador: nome,
      cpf: cpf,
      email: email,
      inicio: inicio,
      endereco: `${rua}, ${numero} - ${bairro}, ${cidade}/${uf.toUpperCase()} (CEP: ${cep}) - ${comp}`,
      kit: document.getElementById('adminSolKit').checked ? 'Sim' : 'Não',
      obs: finalObs
    }, 'xE5RrvIe6hERi2CTp').then(() => {
      console.log('E-mail de notificação enviado para o suporte!');
    }).catch(err => {
      console.error('Erro ao enviar e-mail via EmailJS:', err);
      alert('Ocorreu um erro no disparo de E-mail (EmailJS). Detalhe: ' + (err.text || err.message || JSON.stringify(err)));
    });
  } catch (err) {
    console.error('Erro ao inicializar EmailJS:', err);
  }
  // ───────────────────────────────────────────────────────

  if (typeof updatePendBadge === 'function') await updatePendBadge();
  notify('Solicitação criada com sucesso!');
  closeModal('modalNovaSolicitacao');
  renderSolicitacoes();
}

async function buscarCepAdmin(cep) {
  const raw = cep.replace(/\D/g, '');
  if (raw.length !== 8) return;

  const spinner = document.getElementById('adminCepSpinner');
  const erro    = document.getElementById('adminCepErro');
  if (spinner) { spinner.style.display = ''; erro.style.display = 'none'; }

  try {
    const res  = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
    const data = await res.json();

    if (data.erro) {
      if (spinner) spinner.style.display = 'none';
      if (erro)    erro.style.display = '';
      return;
    }

    if (spinner) spinner.style.display = 'none';

    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('adminSolBairro', data.bairro);
    set('adminSolCidade', data.localidade);
    set('adminSolUf',     data.uf);
    set('adminSolRua',    data.logradouro);

    const numEl = document.getElementById('adminSolNumero');
    if (numEl) numEl.focus();

  } catch (e) {
    if (spinner) spinner.style.display = 'none';
    if (erro)    erro.style.display = '';
  }
}