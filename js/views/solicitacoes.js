// ===================== SOLICITAÇÕES =====================
async function renderSolicitacoes() {
  const list = await dbGetSolicitacoes();
  _cacheSolicitacoes = list;
  const statusOpts = ['pendente', 'em andamento', 'enviado', 'cancelado'];

  document.getElementById('solTableBody').innerHTML = list.map(s => `<tr>
    <td><b>${s.nome || s.colaborador || s.colab || '—'}</b><br><span style="font-size:11px;color:var(--text2);">${s.email || ''}</span></td>
    <td>${s.cpf || '—'}</td>
    <td>${fmtDate(s.inicio)}</td>
    <td>${s.kit ? '<span class="badge badge-green">Sim</span>' : '<span class="badge badge-gray">Não</span>'}</td>
    <td>
      <select onchange="updateSolStatus('${s.id}',this.value)"
        style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;font-family:var(--sans);cursor:pointer;">
        ${statusOpts.map(o => `<option value="${o}" ${s.status === o ? 'selected' : ''}>${o.charAt(0).toUpperCase() + o.slice(1)}</option>`).join('')}
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
        ${s.status === 'cancelado'
      ? `<button class="btn btn-danger btn-sm" style="padding:4px 8px;"
               onclick="deleteSol('${s.id}')" title="Excluir">
               <i class="bi bi-trash"></i>
             </button>`
      : ''}
      </div>
    </td>
  </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text2);">Nenhuma solicitação</td></tr>`;

  // Carrega badges de rastreio de forma assíncrona
  list.forEach(s => {
    if (s.rastreio) loadRastreioBadge(s.id, s.rastreio);
  });
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
  if (!confirm('Tem certeza que deseja excluir esta solicitação cancelada?')) return;
  await dbDeleteSolicitacao(id);
  notify('Solicitação excluída!');
  renderSolicitacoes();
}