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
      <div class="card" style="max-width:700px; padding: 32px;">
        <!-- DADOS DO COLABORADOR -->
        <h3 style="font-size:16px; margin-bottom:4px; color:var(--text);">Dados do Colaborador</h3>
        <p style="font-size:13px; color:var(--text2); margin-bottom:24px;">Preencha as informações do novo colaborador que receberá o equipamento.</p>
        
        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group span2"><label>Nome completo *</label><input type="text" id="solNome" placeholder="Nome do colaborador"></div>
          <div class="form-group"><label>CPF *</label><input type="text" id="solCpf" placeholder="000.000.000-00"></div>
          <div class="form-group"><label>E-mail *</label><input type="email" id="solEmail" placeholder="colaborador@empresa.com"></div>
          <div class="form-group"><label>Data de início *</label><input type="date" id="solInicio"></div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 32px 0;">

        <!-- ENDEREÇO DE ENTREGA -->
        <h3 style="font-size:16px; margin-bottom:24px; color:var(--text);">Endereço de Entrega</h3>
        
        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group"><label>CEP *</label><input type="text" id="solCep" placeholder="00000-000"></div>
          <div class="form-group"><label>Bairro *</label><input type="text" id="solBairro" placeholder="Bairro"></div>
          <div class="form-group span2"><label>Rua *</label><input type="text" id="solRua" placeholder="Rua / Avenida"></div>
          <div class="form-group"><label>Número *</label><input type="text" id="solNumero" placeholder="123"></div>
          <div class="form-group"><label>Complemento</label><input type="text" id="solComplemento" placeholder="Apto, bloco, etc."></div>
        </div>

        <div style="margin-top: 32px; display: flex; align-items: flex-start; gap: 12px;">
          <input type="checkbox" id="solKit" style="width: 18px; height: 18px; accent-color: var(--accent); margin-top: 2px; cursor: pointer;">
          <div>
            <label for="solKit" style="font-weight: 600; color: var(--text); cursor: pointer; display: block; margin-bottom: 2px;">Incluir kit boas-vindas</label>
            <span style="font-size: 13px; color: var(--text2);">Mochila, squeeze, lapiseira, caderno e mousepad</span>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 32px 0;">

        <div class="form-group">
          <label>Observações</label>
          <textarea id="solObs" placeholder="Alguma informação adicional sobre o pedido?" style="height: 100px; resize: vertical;"></textarea>
        </div>

        <div style="margin-top:24px;">
          <button class="btn btn-primary" onclick="enviarSolicitacao()" style="width: 100%; justify-content: center; padding: 12px; font-size: 14px; border-radius: 8px;">Enviar Solicitação</button>
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
            <td>${kitStatusBadge(h)}</td>
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
  const cpf   = document.getElementById('solCpf').value.trim();
  const email = document.getElementById('solEmail').value.trim();
  const inicio = document.getElementById('solInicio').value;
  const cep = document.getElementById('solCep').value.trim();
  const bairro = document.getElementById('solBairro').value.trim();
  const rua = document.getElementById('solRua').value.trim();
  const numero = document.getElementById('solNumero').value.trim();
  
  if (!nome || !cpf || !email || !inicio || !cep || !bairro || !rua || !numero) { 
    notify('Preencha os campos obrigatórios (*)', 'error'); return; 
  }

  await dbCreateSolicitacao({
    colaborador: nome,
    cpf,
    email,
    inicio: inicio || null,
    cep,
    bairro,
    rua,
    numero,
    complemento: document.getElementById('solComplemento').value.trim(),
    kit: document.getElementById('solKit').checked,
    obs: document.getElementById('solObs').value.trim(),
    status: 'pendente'
  });
  
  await updatePendBadge();
  notify('Solicitação enviada com sucesso!');
  renderClientTab('solicitar');
}
