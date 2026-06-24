// ===================== ÁREA DO CLIENTE =====================
let currentPageCliente = 1;
const CLIENTE_PER_PAGE = 20;
function clientTab(tab, el) {
  document.querySelectorAll('#page-area-cliente .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderClientTab(tab);
}

async function renderClientTab(tab) {
  const c = document.getElementById('clientTabContent');

  if (tab === 'solicitar') {
    c.innerHTML = `
      <div class="card" style="max-width:700px; margin: 0 auto; padding: 32px;">
        <!-- DADOS DO COLABORADOR -->
        <h3 style="font-size:16px; margin-bottom:4px; color:var(--text);">Dados do Colaborador</h3>
        <p style="font-size:13px; color:var(--text2); margin-bottom:24px;">Preencha as informações do novo colaborador que receberá o equipamento.</p>
        
        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group span2"><label>Nome completo *</label><input type="text" id="solNome" placeholder="Nome do colaborador"></div>
          <div class="form-group"><label>CPF *</label><input type="text" id="solCpf" placeholder="000.000.000-00"></div>
          <div class="form-group"><label>E-mail</label><input type="email" id="solEmail" placeholder="colaborador@empresa.com"></div>
          <div class="form-group"><label>Data de início</label><input type="date" id="solInicio"></div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 32px 0;">

        <!-- ENDEREÇO DE ENTREGA -->
        <h3 style="font-size:16px; margin-bottom:24px; color:var(--text);">Endereço de Entrega</h3>
        
        <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 16px;">
          <div class="form-group">
            <label>CEP *</label>
            <div style="position:relative;">
              <input type="text" id="solCep" placeholder="00000-000" maxlength="9"
                oninput="this.value=this.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').substring(0,9)"
                onblur="buscarCep(this.value)"
                style="width:100%;">
              <span id="cepSpinner" style="display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:12px;color:var(--text3);"><i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite;"></i></span>
              <span id="cepErro" style="display:none;position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:12px;color:#e55;"><i class="bi bi-x-circle"></i> CEP inválido</span>
            </div>
          </div>
          <div class="form-group"><label>Bairro *</label><input type="text" id="solBairro" placeholder="Bairro"></div>
          <div class="form-group"><label>Cidade *</label><input type="text" id="solCidade" placeholder="Cidade"></div>
          <div class="form-group"><label>UF *</label><input type="text" id="solUf" placeholder="UF" maxlength="2" style="text-transform:uppercase;"></div>
          <div class="form-group span2"><label>Rua *</label><input type="text" id="solRua" placeholder="Rua / Avenida"></div>
          <div class="form-group"><label>Número *</label><input type="text" id="solNumero" placeholder="123"></div>
          <div class="form-group"><label>Complemento</label><input type="text" id="solComplemento" placeholder="Apto, bloco, etc."></div>
        </div>

        <div style="margin-top: 32px; display: flex; align-items: flex-start; gap: 12px; flex-direction: column;">
          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <input type="checkbox" id="solTroca" style="width: 18px; height: 18px; accent-color: var(--accent); margin-top: 2px; cursor: pointer;">
            <div>
              <label for="solTroca" style="font-weight: 600; color: var(--text); cursor: pointer; display: block; margin-bottom: 2px;">É uma Troca de Máquina?</label>
              <span style="font-size: 13px; color: var(--text2);">Marque caso a solicitação seja para substituição de equipamento.</span>
            </div>
          </div>
          <div style="display: flex; align-items: flex-start; gap: 12px; margin-top: 12px;">
            <input type="checkbox" id="solKit" style="width: 18px; height: 18px; accent-color: var(--accent); margin-top: 2px; cursor: pointer;">
            <div>
              <label for="solKit" style="font-weight: 600; color: var(--text); cursor: pointer; display: block; margin-bottom: 2px;">Incluir kit boas-vindas</label>
              <span style="font-size: 13px; color: var(--text2);">Mochila, squeeze, lapiseira, caderno e mousepad</span>
            </div>
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid var(--border); margin: 32px 0;">

        <!-- ACESSÓRIOS OPCIONAIS -->
        <h3 style="font-size:16px; margin-bottom:12px; color:var(--text);">Acessórios Opcionais</h3>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 32px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Fonte"> Fonte</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Monitor"> Monitor</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Cabo HDMI"> Cabo HDMI</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Teclado"> Teclado</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Mouse"> Mouse</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Webcam"> Webcam</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Headset"> Headset</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;"><input type="checkbox" class="solAcessorio" value="Suporte de Notebook"> Suporte de Notebook</label>
        </div>

        <div class="form-group">
          <label>Observações</label>
          <textarea id="solObs" placeholder="Alguma informação adicional sobre o pedido?" style="height: 100px; resize: vertical;"></textarea>
        </div>

        <div style="margin-top:24px;">
          <button class="btn btn-primary" onclick="enviarSolicitacao()" style="width: 100%; justify-content: center; padding: 12px; font-size: 14px; border-radius: 8px;">Enviar Solicitação</button>
        </div>
      </div>`;

  } else if (tab === 'minhas_solicitacoes') {
    const list = await dbGetSolicitacoes();
    
    c.innerHTML = `
      <div class="card">
        <div class="section-title" style="margin-bottom:14px;">Acompanhamento de Solicitações</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Data Início</th>
                <th>Kit</th>
                <th>Status</th>
                <th>Rastreio</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(s => `<tr>
                <td><b>${s.nome || s.colaborador || s.colab || '—'}</b>
                  ${s.obs && s.obs.includes('[TROCA DE MÁQUINA]') ? '<br><span class="badge" style="background:#8b5cf6;color:white;font-size:10px;padding:2px 4px;margin-top:4px;display:inline-block;">Troca de Máquina</span>' : ''}
                </td>
                <td>${fmtDate(s.inicio)}</td>
                <td>${s.kit ? '<span class="badge badge-green">Sim</span>' : '<span class="badge badge-gray">Não</span>'}</td>
                <td>${statusBadge(s.status)}</td>
                <td>
                  ${s.rastreio
                    ? `<a href="https://www.linkcorreios.com.br/${s.rastreio}" target="_blank"
                        style="color:var(--accent);font-size:13px;text-decoration:underline;display:flex;align-items:center;gap:4px;">
                        <i class="bi bi-box-seam"></i> ${s.rastreio}
                       </a>`
                    : '<span style="color:var(--text3);font-size:12px;">Aguardando...</span>'}
                </td>
              </tr>`).join('') || `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text2);">Nenhuma solicitação encontrada</td></tr>`}
            </tbody>
          </table>
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

    // Listas únicas para os filtros
    const tipos   = [...new Set(visiveis.map(a => a.tipo).filter(Boolean))].sort();
    const statuses = [...new Set(visiveis.map(a => a.status).filter(Boolean))].sort();

    const statusLabel = { disponivel:'Disponível', 'em uso':'Em Uso', manutencao:'Manutenção', estoque:'Estoque' };

    c.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:20px;">
        <div style="position:relative;flex:1;min-width:180px;">
          <i class="bi bi-search" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:13px;"></i>
          <input type="text" id="clientMaqSearch" placeholder="Buscar por nome ou patrimônio..."
            oninput="filtrarMaquinasCliente(true)"
            style="width:100%;padding:8px 10px 8px 32px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-size:13px;box-sizing:border-box;">
        </div>
        <select id="clientMaqTipo" onchange="filtrarMaquinasCliente(true)"
          style="width:auto;flex:1;min-width:140px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-size:13px;cursor:pointer;">
          <option value="">Todos os Tipos</option>
          ${tipos.map(t => `<option value="${t}">${t}</option>`).join('')}
        </select>
        <select id="clientMaqStatus" onchange="filtrarMaquinasCliente(true)"
          style="width:auto;flex:1;min-width:140px;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg2);color:var(--text);font-size:13px;cursor:pointer;">
          <option value="">Qualquer Status</option>
          ${statuses.map(s => `<option value="${s}">${statusLabel[s]||s}</option>`).join('')}
        </select>
        <span id="clientMaqCount" style="font-size:12px;color:var(--text3);white-space:nowrap;">${visiveis.length} equipamentos</span>
      </div>
      <div id="clientMaqGrid" class="asset-grid"></div>`;

    // Guarda os dados no dataset para filtragem client-side
    document.getElementById('clientMaqGrid').dataset.ativos = JSON.stringify(visiveis);
    filtrarMaquinasCliente();
  }
}

function filtrarMaquinasCliente(resetPage = true) {
  if (resetPage) currentPageCliente = 1;
  const grid    = document.getElementById('clientMaqGrid');
  const search  = (document.getElementById('clientMaqSearch')?.value || '').toLowerCase();
  const tipo    = document.getElementById('clientMaqTipo')?.value || '';
  const status  = document.getElementById('clientMaqStatus')?.value || '';
  const ativos  = JSON.parse(grid.dataset.ativos || '[]');

  const filtrados = ativos.filter(a => {
    const matchSearch = !search || a.nome?.toLowerCase().includes(search) || a.patrimonio?.toLowerCase().includes(search);
    const matchTipo   = !tipo   || a.tipo === tipo;
    const matchStatus = !status || a.status === status;
    return matchSearch && matchTipo && matchStatus;
  });

  document.getElementById('clientMaqCount').textContent = `${filtrados.length} equipamento${filtrados.length !== 1 ? 's' : ''}`;

  const totalItems = filtrados.length;
  const totalPages = Math.ceil(totalItems / CLIENTE_PER_PAGE) || 1;
  if (currentPageCliente > totalPages) currentPageCliente = totalPages;
  const startIdx = (currentPageCliente - 1) * CLIENTE_PER_PAGE;
  const pagedList = filtrados.slice(startIdx, startIdx + CLIENTE_PER_PAGE);

  let html = pagedList.map(a => {
    const iconName = (a.emoji === 'display') ? 'monitor' : (a.emoji === 'phone' ? 'smartphone' : (a.emoji || 'laptop'));
    return `
    <div class="asset-card" onclick="openDetalheCliente('${a.id}')" style="cursor:pointer;">
      <div class="asset-card-img">
        ${a.ativo_fotos && a.ativo_fotos.length > 0 
           ? `<img src="${a.ativo_fotos[0].url}" alt="foto" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="asset-emoji-fallback" style="display:none;"><i data-lucide="${iconName}"></i></div>`
           : `<div class="asset-emoji-fallback"><i data-lucide="${iconName}"></i></div>`}
        <div class="badge-overlay">${statusBadge(a.status)}</div>
      </div>
      <div class="asset-card-body">
        <div class="asset-card-meta"><span class="asset-card-patrimonio">${a.patrimonio}</span><span class="asset-card-tipo">${a.tipo||''}</span></div>
        <div class="asset-card-name">${a.nome}</div>
        <div class="asset-card-info">
          <div class="asset-card-info-row"><i data-lucide="user" style="width:14px;height:14px;"></i> <span>${a.colab||'Disponível'}</span></div>
        </div>
        ${a.status === 'disponivel' ? `
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
           <button class="btn btn-primary btn-sm" style="width:100%;justify-content:center;" onclick="event.stopPropagation();abrirIndicarMaquina('${a.nome}', '${a.patrimonio}')">
             <i data-lucide="user-plus" style="width:16px;height:16px;"></i> Indicar Colaborador
           </button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('') || `
    <div class="empty" style="grid-column:1/-1;">
      <div class="empty-icon"><i data-lucide="search"></i></div>
      <div class="empty-title">Nenhum equipamento encontrado</div>
      <div class="empty-sub">Tente ajustar os filtros</div>
    </div>`;

  if (totalPages > 1) {
    html += `
      <div style="grid-column:1/-1; display:flex; justify-content:center; align-items:center; gap:16px; margin-top:24px;">
        <button class="btn btn-ghost" onclick="changePageCliente(${currentPageCliente - 1})" ${currentPageCliente === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Anterior</button>
        <span style="font-size:13px; color:var(--text2); font-weight:600;">Página ${currentPageCliente} de ${totalPages}</span>
        <button class="btn btn-ghost" onclick="changePageCliente(${currentPageCliente + 1})" ${currentPageCliente === totalPages ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Próxima</button>
      </div>
    `;
  }

  grid.innerHTML = html;
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function changePageCliente(p) {
  currentPageCliente = p;
  filtrarMaquinasCliente(false);
}

async function openDetalheCliente(id) {
  const a = await dbGetAtivoById(id);
  if (!a) return;
  const fotos = await dbGetFotos(id);

  const fotoHtml = fotos.length
    ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
        ${fotos.map(f => `<img src="${f.url}" style="width:90px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;" onclick="openLightbox('${f.url}')">`).join('')}
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
        <div style="display:flex;gap:8px;flex-wrap:wrap;">${statusBadge(a.status)}</div>
      </div>
    </div>
    <div class="detail-grid" style="margin-bottom:20px;">
      ${a.proc ? `<div class="detail-item"><div class="detail-label">Processador</div><div class="detail-value">${a.proc}</div></div>` : ''}
      ${a.ram ? `<div class="detail-item"><div class="detail-label">RAM</div><div class="detail-value">${a.ram}</div></div>` : ''}
      ${a.disco ? `<div class="detail-item"><div class="detail-label">Armazenamento</div><div class="detail-value">${a.disco}</div></div>` : ''}
      ${a.tela ? `<div class="detail-item"><div class="detail-label">Tamanho da Tela</div><div class="detail-value">${a.tela}</div></div>` : ''}
      ${a.so ? `<div class="detail-item"><div class="detail-label">Sistema Operacional</div><div class="detail-value">${a.so}</div></div>` : ''}
      ${a.serie ? `<div class="detail-item"><div class="detail-label">Nº de Série</div><div class="detail-value text-mono">${a.serie}</div></div>` : ''}
      ${a.localizacao ? `<div class="detail-item"><div class="detail-label">Localização</div><div class="detail-value">${a.localizacao}</div></div>` : ''}
      ${a.colab ? `<div class="detail-item"><div class="detail-label">Colaborador</div><div class="detail-value">${a.colab}</div></div>` : ''}
    </div>
    ${a.obs ? `<div class="alert alert-info"><i class="bi bi-sticky" style="margin-right:6px;"></i> ${a.obs}</div>` : ''}`;

  const btnEdit = document.getElementById('btnEditAtivo');
  if (btnEdit) btnEdit.style.display = 'none';
  const btnDelete = document.getElementById('btnDeleteAtivo');
  if (btnDelete) btnDelete.style.display = 'none';

  openModal('modalDetalheAtivo');
}

async function enviarSolicitacao() {
  const nome  = document.getElementById('solNome').value.trim();
  const cpf   = document.getElementById('solCpf').value.trim();
  const email = document.getElementById('solEmail').value.trim();
  const inicio = document.getElementById('solInicio').value;
  const cep = document.getElementById('solCep').value.trim();
  const bairro = document.getElementById('solBairro').value.trim();
  const cidade = document.getElementById('solCidade').value.trim();
  const uf = document.getElementById('solUf').value.trim();
  const rua = document.getElementById('solRua').value.trim();
  const numero = document.getElementById('solNumero').value.trim();
  
  if (!nome || !cpf || !cep || !bairro || !cidade || !uf || !rua || !numero) { 
    notify('Preencha os campos obrigatórios (*)', 'error'); return; 
  }

  const comp = document.getElementById('solComplemento').value.trim();
  const complementoStr = comp ? `${comp} (${cidade}/${uf.toUpperCase()})` : `${cidade}/${uf.toUpperCase()}`;

  const acessoriosEls = document.querySelectorAll('.solAcessorio:checked');
  const acessorios = Array.from(acessoriosEls).map(el => el.value);
  let finalObs = document.getElementById('solObs').value.trim();
  if (acessorios.length > 0) {
    finalObs = `[Acessórios: ${acessorios.join(', ')}]\n\n` + finalObs;
  }
  const isTroca = document.getElementById('solTroca') && document.getElementById('solTroca').checked;
  if (isTroca) {
    finalObs = `[TROCA DE MÁQUINA]\n\n` + finalObs;
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
    complemento: complementoStr,
    kit: document.getElementById('solKit').checked,
    obs: finalObs,
    status: 'pendente'
  });
  
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
      kit: document.getElementById('solKit').checked ? 'Sim' : 'Não',
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

  await updatePendBadge();
  notify('Solicitação enviada com sucesso!');
  renderClientTab('solicitar');
}

async function buscarCep(cep) {
  const raw = cep.replace(/\D/g, '');
  if (raw.length !== 8) return;

  const spinner = document.getElementById('cepSpinner');
  const erro    = document.getElementById('cepErro');
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
    set('solBairro', data.bairro);
    set('solCidade', data.localidade);
    set('solUf',     data.uf);
    set('solRua',    data.logradouro);

    // Foca no campo número após preencher
    const numEl = document.getElementById('solNumero');
    if (numEl) numEl.focus();

  } catch (e) {
    if (spinner) spinner.style.display = 'none';
    if (erro)    erro.style.display = '';
  }
}

function abrirIndicarMaquina(nome, patrimonio) {
  document.getElementById('indicarNomeMq').textContent = nome;
  document.getElementById('indicarPatriMq').textContent = patrimonio;
  document.getElementById('indicarNomeHidden').value = nome;
  document.getElementById('indicarPatrimonioHidden').value = patrimonio;
  
  document.getElementById('indicarNomeColab').value = '';
  document.getElementById('indicarDataInicio').value = '';
  document.getElementById('indicarObs').value = '';
  
  openModal('modalIndicarMaquina');
}

async function enviarIndicacaoMaquina() {
  const nomeColab = document.getElementById('indicarNomeColab').value.trim();
  const dataInicio = document.getElementById('indicarDataInicio').value;
  const obs = document.getElementById('indicarObs').value.trim();
  const nomeMq = document.getElementById('indicarNomeHidden').value;
  const patriMq = document.getElementById('indicarPatrimonioHidden').value;
  
  if (!nomeColab) {
    notify('Preencha o nome do colaborador (*)', 'error');
    return;
  }
  
  const textObs = `[INDICAÇÃO DE MÁQUINA]\nMáquina selecionada: ${nomeMq} (Patrimônio: ${patriMq})\n\n${obs}`;
  
  await dbCreateSolicitacao({
    colaborador: nomeColab,
    inicio: dataInicio || null,
    obs: textObs,
    status: 'pendente'
  });
  
  if (typeof updatePendBadge === 'function') await updatePendBadge();
  notify('Indicação enviada com sucesso!');
  closeModal('modalIndicarMaquina');
}
