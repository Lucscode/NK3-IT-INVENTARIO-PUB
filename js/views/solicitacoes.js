// ===================== SOLICITAÇÕES =====================
async function renderSolicitacoes() {
  const list = await dbGetSolicitacoes();
  _cacheSolicitacoes = list;
  const statusOpts = ['pendente','em andamento','enviado','cancelado'];
  document.getElementById('solTableBody').innerHTML = list.map(s=>`<tr>
    <td><b>${s.nome||s.colaborador||s.colab||'—'}</b><br><span style="font-size:11px;color:var(--text2);">${s.email||''}</span></td>
    <td>${s.cpf||'—'}</td>
    <td>${fmtDate(s.inicio)}</td>
    <td>${s.kit ? '<span class="badge badge-green">Sim</span>' : '<span class="badge badge-gray">Não</span>'}</td>
    <td>
      <select onchange="updateSolStatus('${s.id}',this.value)"
        style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;font-family:var(--sans);cursor:pointer;">
        ${statusOpts.map(o=>`<option value="${o}" ${s.status===o?'selected':''}>${o.charAt(0).toUpperCase()+o.slice(1)}</option>`).join('')}
      </select>
    </td>
    <td>
      <input type="text" value="${s.rastreio||''}" placeholder="Código..." 
        onblur="updateSolRastreio('${s.id}',this.value)"
        style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;font-family:var(--sans);width:100px;">
    </td>
    <td style="display:flex;gap:4px;">
      <button class="btn btn-ghost btn-sm" onclick="openSolDetalhe('${s.id}')">Ver</button>
      ${s.status === 'cancelado' ? `<button class="btn btn-danger btn-sm" onclick="deleteSol('${s.id}')" title="Excluir Solicitação">🗑</button>` : ''}
    </td>
  </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text2);">Nenhuma solicitação</td></tr>`;
}

async function updateSolStatus(id, status) {
  await dbUpdateSolStatus(id, status);
  updatePendBadge();
  notify('Status atualizado!');
  renderSolicitacoes();
}

async function updateSolRastreio(id, rastreio) {
  await dbUpdateSolRastreio(id, rastreio);
  notify('Rastreio atualizado!');
  // Update cache instead of full render to avoid losing focus if user is typing fast, but onblur is fine to re-render
  renderSolicitacoes();
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
