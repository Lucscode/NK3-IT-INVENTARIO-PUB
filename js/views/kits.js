// ===================== KITS =====================
async function renderKitTab() {
  const c = document.getElementById('kitTabContent');
  const ITEMS = [
    { key: 'mochila', icon: 'backpack', name: 'Mochila' },
    { key: 'squeeze', icon: 'cup-straw', name: 'Squeeze' },
    { key: 'caderno', icon: 'journal-text', name: 'Caderno' },
    { key: 'caneta', icon: 'pen', name: 'Caneta' },
    { key: 'mousepad', icon: 'mouse2', name: 'Mousepad' },
  ];

  try {
    const [kits, hist] = await Promise.all([dbGetKitEstoque(), dbGetKitHistorico()]);
    _cacheKitEstoque = kits;
    _cacheKitHistorico = hist;
    const completos = ITEMS.length ? Math.min(...ITEMS.map(i => kits[i.key] || 0)) : 0;

    const statusOpts = [
      { v: 'pendente', l: 'Pendente' },
      { v: 'em andamento', l: 'Em Andamento' },
      { v: 'enviado', l: 'Enviado' },
      { v: 'cancelado', l: 'Cancelado' },
    ];

    c.innerHTML = `
      <div class="alert alert-success"><i class="bi bi-gift"></i> <b>${completos}</b> kits completos disponíveis</div>
      <div class="kit-items">${ITEMS.map(i => `
        <div class="kit-item">
          <div class="kit-item-icon"><i class="bi bi-${i.icon}"></i></div>
          <div class="kit-item-name">${i.name}</div>
          <div class="kit-item-count">${kits[i.key] || 0}</div>
        </div>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-bottom:24px;">
        <button class="btn btn-primary" onclick="openModal('modalKitSaida')"><i class="bi bi-box-arrow-up"></i> Registrar Saída</button>
        <button class="btn btn-ghost" onclick="openKitEstoque()"><i class="bi bi-plus-lg"></i> Adicionar Estoque</button>
      </div>

      <div class="card">
        <div class="section-header" style="padding:16px 16px 12px;">
          <div class="section-title"><i class="bi bi-clock-history"></i> Histórico de Saídas</div>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Colaborador</th><th>Qtd Kits</th><th>Data</th><th>Obs</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>${hist.length === 0
        ? `<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:24px;">Nenhuma saída registrada ainda.</td></tr>`
        : hist.map(h => `<tr>
            <td>${h.colab || '—'}</td>
            <td><span class="badge badge-blue">${h.quantidade}</span></td>
            <td>${fmtDate(h.data)}</td>
            <td style="font-size:12px;color:var(--text2);">${h.obs || '—'}</td>
            <td>
              ${h.cancelado
            ? '<span class="badge badge-red"><span class="dot"></span>Cancelado</span>'
            : `<select onchange="updateKitStatus('${h.id}',this.value)"
                    style="background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text);font-size:12px;font-family:var(--sans);cursor:pointer;">
                    ${statusOpts.map(o => `<option value="${o.v}" ${(h.status || 'pendente') === o.v ? 'selected' : ''}>${o.l}</option>`).join('')}
                  </select>`
          }
            </td>
            <td>${!h.cancelado ? `<button class="btn btn-danger btn-sm" onclick="cancelarKit('${h.id}',${h.quantidade})">Cancelar</button>` : '—'}</td>
          </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`;

  } catch (err) {
    console.error('[Kits] Erro ao carregar:', err);
    c.innerHTML = `
      <div class="alert" style="background:var(--danger-bg,#2d1a1a);border:1px solid var(--danger,#e55);color:var(--danger,#e55);border-radius:8px;padding:16px;display:flex;gap:10px;align-items:center;">
        <i class="bi bi-exclamation-triangle-fill" style="font-size:20px;"></i>
        <div>
          <b>Erro ao carregar Kits</b><br>
          <span style="font-size:12px;opacity:0.8;">${err.message}</span><br>
          <span style="font-size:11px;opacity:0.6;margin-top:4px;display:block;">Verifique se a migration <code>migration_kit_status.sql</code> foi executada no Supabase.</span>
        </div>
      </div>`;
  }
}


async function registrarSaidaKit() {
  const colab = document.getElementById('kitColabSaida').value.trim();
  const qtd = parseInt(document.getElementById('kitQtdSaida').value) || 1;
  const data = document.getElementById('kitDataSaida').value || new Date().toISOString().split('T')[0];
  const obs = document.getElementById('kitObsSaida').value;
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
  renderKitTab();
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
  renderKitTab();
}

async function updateKitStatus(id, status) {
  const { error } = await sb.from('kit_historico').update({ status }).eq('id', id);
  if (error) { notify('Erro ao atualizar status', 'error'); return; }
  notify('Status atualizado!');
  renderKitTab();
}

async function openKitEstoque() {
  const kits = await dbGetKitEstoque();
  const ITEMS = [
    { key: 'mochila', icon: 'backpack', name: 'Mochila' },
    { key: 'squeeze', icon: 'cup-straw', name: 'Squeeze' },
    { key: 'caderno', icon: 'journal-text', name: 'Caderno' },
    { key: 'caneta', icon: 'pen', name: 'Caneta' },
    { key: 'mousepad', icon: 'mouse2', name: 'Mousepad' },
  ];
  document.getElementById('kitStockForm').innerHTML = `<div class="form-grid">${ITEMS.map(i => `
    <div class="form-group">
      <label><i class="bi bi-${i.icon}"></i> ${i.name} (atual: ${kits[i.key] || 0})</label>
      <input type="number" id="kitAdd_${i.key}" value="0" min="0">
    </div>`).join('')}</div>`;
  openModal('modalKitEstoque');
}

async function saveKitStock() {
  const kits = await dbGetKitEstoque();
  for (const k of ['mochila', 'squeeze', 'caderno', 'caneta', 'mousepad']) {
    const v = parseInt(document.getElementById('kitAdd_' + k)?.value) || 0;
    if (v > 0) await dbUpdateKitItem(k, (kits[k] || 0) + v);
  }
  notify('Estoque atualizado!');
  closeModal('modalKitEstoque');
  renderKitTab();
}

async function updateKitStatus(id, status) {
  try {
    await dbUpdateKitStatus(id, status);
    notify('Status atualizado!');
    renderKitTab();
  } catch (e) {
    notify('Erro ao atualizar status', 'error');
  }
}