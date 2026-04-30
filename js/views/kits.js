// ===================== KITS =====================
function kitTab(tab, el) {
  currentKitTab = tab;
  document.querySelectorAll('#page-kits .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderKitTab(tab);
}

async function renderKitTab(tab) {
  const c = document.getElementById('kitTabContent');
  const ITEMS = [
    { key:'mochila', icon:'backpack', name:'Mochila' },
    { key:'squeeze', icon:'cup-straw', name:'Squeeze' },
    { key:'caderno', icon:'journal-text', name:'Caderno' },
    { key:'caneta',  icon:'pen', name:'Caneta'  },
    { key:'mousepad',icon:'mouse2', name:'Mousepad'},
  ];

  if (tab === 'estoque') {
    const kits = await dbGetKitEstoque();
    _cacheKitEstoque = kits;
    const completos = ITEMS.length ? Math.min(...ITEMS.map(i => kits[i.key]||0)) : 0;
    c.innerHTML = `
      <div class="alert alert-success"><i class="bi bi-gift"></i> <b>${completos}</b> kits completos disponíveis</div>
      <div class="kit-items">${ITEMS.map(i=>`
        <div class="kit-item">
          <div class="kit-item-icon"><i class="bi bi-${i.icon}"></i></div>
          <div class="kit-item-name">${i.name}</div>
          <div class="kit-item-count">${kits[i.key]||0}</div>
        </div>`).join('')}</div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" onclick="openModal('modalKitSaida')"><i class="bi bi-box-arrow-up"></i> Registrar Saída</button>
        <button class="btn btn-ghost" onclick="openKitEstoque()"><i class="bi bi-plus-lg"></i> Adicionar Estoque</button>
      </div>`;

  } else if (tab === 'saida') {
    openModal('modalKitSaida');
    renderKitTab('estoque');

  } else if (tab === 'historico') {
    const hist = await dbGetKitHistorico();
    _cacheKitHistorico = hist;
    c.innerHTML = `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Colaborador</th><th>Qtd Kits</th><th>Data</th><th>Obs</th><th>Status</th><th>Ações</th></tr></thead>
      <tbody>${hist.map(h=>`<tr>
        <td>${h.colab||'—'}</td>
        <td><span class="badge badge-blue">${h.quantidade}</span></td>
        <td>${fmtDate(h.data)}</td>
        <td style="font-size:12px;color:var(--text2);">${h.obs||'—'}</td>
        <td>${h.cancelado ? '<span class="badge badge-red">Cancelado</span>' : '<span class="badge badge-green">Entregue</span>'}</td>
        <td>${!h.cancelado ? `<button class="btn btn-danger btn-sm" onclick="cancelarKit('${h.id}',${h.quantidade})">Cancelar</button>` : '—'}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  }
}

async function registrarSaidaKit() {
  const colab = document.getElementById('kitColabSaida').value.trim();
  const qtd   = parseInt(document.getElementById('kitQtdSaida').value) || 1;
  const data  = document.getElementById('kitDataSaida').value || new Date().toISOString().split('T')[0];
  const obs   = document.getElementById('kitObsSaida').value;
  if (!colab) { notify('Informe o colaborador', 'error'); return; }
  const kits = await dbGetKitEstoque();
  const min = Math.min(...Object.values(kits));
  if (qtd > min) { notify(`Estoque insuficiente para ${qtd} kit(s)!`, 'error'); return; }
  // Debitar cada item
  for (const key of Object.keys(kits)) {
    await dbUpdateKitItem(key, kits[key] - qtd);
  }
  await dbAddKitHistorico({ colab, quantidade: qtd, data, obs, cancelado: false });
  notify(`Kit entregue para ${colab}!`);
  closeModal('modalKitSaida');
  renderKitTab('estoque');
}

async function cancelarKit(id, qtd) {
  if (!confirm('Cancelar esta saída e devolver ao estoque?')) return;
  await dbUpdateKitHistoricoStatus(id, true);
  // Devolver estoque
  const kits = await dbGetKitEstoque();
  for (const key of Object.keys(kits)) {
    await dbUpdateKitItem(key, kits[key] + qtd);
  }
  notify('Saída cancelada e estoque devolvido');
  renderKitTab('historico');
}

async function openKitEstoque() {
  const kits = await dbGetKitEstoque();
  const ITEMS = [
    { key:'mochila', icon:'backpack', name:'Mochila' },
    { key:'squeeze', icon:'cup-straw', name:'Squeeze' },
    { key:'caderno', icon:'journal-text', name:'Caderno' },
    { key:'caneta',  icon:'pen', name:'Caneta'  },
    { key:'mousepad',icon:'mouse2', name:'Mousepad'},
  ];
  document.getElementById('kitStockForm').innerHTML = `<div class="form-grid">${ITEMS.map(i=>`
    <div class="form-group">
      <label><i class="bi bi-${i.icon}"></i> ${i.name} (atual: ${kits[i.key]||0})</label>
      <input type="number" id="kitAdd_${i.key}" value="0" min="0">
    </div>`).join('')}</div>`;
  openModal('modalKitEstoque');
}

async function saveKitStock() {
  const kits = await dbGetKitEstoque();
  for (const k of ['mochila','squeeze','caderno','caneta','mousepad']) {
    const v = parseInt(document.getElementById('kitAdd_'+k)?.value) || 0;
    if (v > 0) await dbUpdateKitItem(k, (kits[k]||0) + v);
  }
  notify('Estoque atualizado!');
  closeModal('modalKitEstoque');
  renderKitTab('estoque');
}
