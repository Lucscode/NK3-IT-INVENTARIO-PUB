// ===================== ÁREA DO CLIENTE =====================
function clientTab(tab, el) {
  document.querySelectorAll('#page-area-cliente .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderClientTab(tab);
}

async function renderClientTab(tab) {
  const c = document.getElementById('clientTabContent');

  if (tab === 'solicitar') {
    c.innerHTML = `
      <div class="card" style="max-width:600px;">
        <h3 style="margin-bottom:20px;font-size:16px;"><i class="bi bi-clipboard-plus"></i> Nova Solicitação de Máquina</h3>
        <div class="form-grid">
          <div class="form-group"><label>Nome Completo *</label><input type="text" id="solNome" placeholder="Nome do colaborador"></div>
          <div class="form-group"><label>Departamento *</label><input type="text" id="solDept" placeholder="Departamento"></div>
          <div class="form-group"><label>Email *</label><input type="email" id="solEmail" placeholder="email@empresa.com"></div>
          <div class="form-group"><label>Telefone</label><input type="text" id="solTel" placeholder="(11) 99999-9999"></div>
          <div class="form-group span2"><label>Endereço de Entrega</label><input type="text" id="solEnd" placeholder="Rua, número, cidade"></div>
          <div class="form-group"><label>Data de Início</label><input type="date" id="solInicio"></div>
          <div class="form-group" style="align-self:center;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:20px;">
              <input type="checkbox" id="solKit" style="width:auto;accent-color:var(--accent)"> Incluir Kit Boas-Vindas
            </label>
          </div>
          <div class="form-group span2"><label>Observações</label><textarea id="solObs" placeholder="Informações adicionais..."></textarea></div>
        </div>
        <div style="margin-top:20px;">
          <button class="btn btn-primary" onclick="enviarSolicitacao()"><i class="bi bi-send"></i> Enviar Solicitação</button>
        </div>
      </div>`;

  } else if (tab === 'kits') {
    const kits = await dbGetKitEstoque();
    const hist  = await dbGetKitHistorico();
    const ITEMS = [
      { key:'mochila', icon:'backpack', name:'Mochila' }, { key:'squeeze', icon:'cup-straw', name:'Squeeze' },
      { key:'caderno', icon:'journal-text', name:'Caderno' }, { key:'caneta', icon:'pen', name:'Caneta' },
      { key:'mousepad',icon:'mouse2', name:'Mousepad'},
    ];
    const min = ITEMS.length ? Math.min(...ITEMS.map(i => kits[i.key]||0)) : 0;
    c.innerHTML = `
      <div class="alert alert-info"><i class="bi bi-gift"></i> <b>${min}</b> kits completos disponíveis no estoque</div>
      <div class="kit-items" style="margin-bottom:24px;">${ITEMS.map(i=>`
        <div class="kit-item"><div class="kit-item-icon"><i class="bi bi-${i.icon}"></i></div><div class="kit-item-name">${i.name}</div><div class="kit-item-count">${kits[i.key]||0}</div></div>`).join('')}</div>
      <div class="card">
        <div class="section-title" style="margin-bottom:14px;">Histórico de Kits</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Colaborador</th><th>Qtd</th><th>Data</th><th>Status</th></tr></thead>
          <tbody>${hist.map(h=>`<tr>
            <td>${h.colab||'—'}</td><td>${h.quantidade}</td><td>${fmtDate(h.data)}</td>
            <td>${h.cancelado?'<span class="badge badge-red">Cancelado</span>':'<span class="badge badge-green">Entregue</span>'}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;

  } else if (tab === 'maquinas') {
    const ativos = await dbGetAtivos();
    const visiveis = ativos.filter(a => a.status !== 'descartado');
    c.innerHTML = `<div class="asset-grid">${visiveis.map(a=>`
      <div class="asset-card" style="cursor:default;">
        <div class="asset-card-img"><div class="asset-emoji-fallback"><i class="bi bi-${a.emoji||'laptop'}"></i></div>
          <div class="badge-overlay">${statusBadge(a.status)}</div>
        </div>
        <div class="asset-card-body">
          <div class="asset-card-meta"><span class="asset-card-patrimonio">${a.patrimonio}</span><span class="asset-card-tipo">${a.tipo||''}</span></div>
          <div class="asset-card-name">${a.nome}</div>
          <div class="asset-card-info">
            <div class="asset-card-info-row"><i class="bi bi-person"></i> <span>${a.colab||'Disponível'}</span></div>
          </div>
        </div>
      </div>`).join('') || '<div class="empty"><div class="empty-icon"><i class="bi bi-laptop"></i></div><div class="empty-title">Nenhum ativo disponível</div></div>'}
    </div>`;
  }
}

async function enviarSolicitacao() {
  const nome  = document.getElementById('solNome').value.trim();
  const dept  = document.getElementById('solDept').value.trim();
  const email = document.getElementById('solEmail').value.trim();
  if (!nome || !dept || !email) { notify('Preencha os campos obrigatórios', 'error'); return; }
  await dbCreateSolicitacao({
    colab: nome, dept, email,
    tel:     document.getElementById('solTel').value,
    inicio:  document.getElementById('solInicio').value || null,
    kit:     document.getElementById('solKit').checked,
    obs:     document.getElementById('solObs').value,
    status:  'pendente',
    endereco:document.getElementById('solEnd').value,
  });
  await updatePendBadge();
  notify('Solicitação enviada com sucesso!');
  renderClientTab('solicitar');
}
