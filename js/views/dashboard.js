// ===================== DASHBOARD =====================
async function renderDashboard() {
  // Stats
  const stats = await dbGetStats();
  document.getElementById('statTotal').textContent = stats.total      ?? 0;
  document.getElementById('statDisp').textContent  = stats.disponiveis ?? 0;
  document.getElementById('statUso').textContent   = stats.emUso       ?? 0;
  document.getElementById('statMan').textContent   = stats.manutencao  ?? 0;

  // Subtítulo dinâmico
  const sub = document.getElementById('pageSub');
  if (sub) sub.textContent = `${stats.total ?? 0} equipamentos cadastrados no sistema`;

  // Ativos recentes — grid de cards com foto (6 últimos)
  const ativos = await dbGetAtivos();
  _cacheAtivos = ativos;
  const recentes = ativos.slice(0, 6);
  const fotosMap  = {};
  await Promise.all(recentes.map(async a => { fotosMap[a.id] = await dbGetFotos(a.id); }));

  document.getElementById('dashRecentAssets').innerHTML = recentes.length
    ? `<div class="asset-grid" style="grid-template-columns:repeat(3,1fr);">${recentes.map(a => {
        const foto = fotosMap[a.id]?.[0];
        const fotoHtml = foto
          ? `<img src="${foto.url}" alt="foto" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="asset-emoji-fallback" style="display:none;"><i class="bi bi-${a.emoji||'laptop'}"></i></div>`
          : `<div class="asset-emoji-fallback"><i class="bi bi-${a.emoji||'laptop'}"></i></div>`;
        return `<div class="asset-card" onclick="goTo('ativos');setTimeout(()=>openDetalhe('${a.id}'),300)" style="cursor:pointer;">
          <div class="asset-card-img">${fotoHtml}<div class="badge-overlay">${statusBadge(a.status)}</div></div>
          <div class="asset-card-body">
            <div class="asset-card-meta">
              <span class="asset-card-patrimonio">${a.patrimonio}</span>
              <span class="asset-card-tipo">${a.tipo||''}</span>
            </div>
            <div class="asset-card-name">${a.nome}</div>
            <div class="asset-card-info">
              ${a.colab ? `<div class="asset-card-info-row"><i class="bi bi-person"></i> <span>${a.colab}</span></div>` : ''}
              ${a.localizacao ? `<div class="asset-card-info-row"><i class="bi bi-geo-alt"></i> <span>${a.localizacao}</span></div>` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}</div>`
    : `<div class="empty" style="padding:40px;"><div class="empty-icon"><i class="bi bi-laptop"></i></div><div class="empty-title">Nenhum ativo cadastrado</div></div>`;

  // Atividade Recente — feed do histórico
  const hist = await dbGetHistorico();
  _cacheHistorico = hist;
  const atividadeEl = document.getElementById('dashActivity');
  if (atividadeEl) {
    atividadeEl.innerHTML = hist.slice(0, 8).map(h => {
      const tipo  = h.devolvido ? 'Devolução' : h.atribuido ? 'Atribuição' : 'Cadastro';
      const cor   = tipo === 'Devolução' ? '#10b981' : tipo === 'Atribuição' ? '#3b82f6' : '#6366f1';
      const initials = (h.colab || 'S')
        .split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
      return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text2);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px;flex-wrap:wrap;">
            <span style="background:${cor}1a;color:${cor};font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;">${tipo}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text2);">${h.ativo_nome?.split('(')[1]?.replace(')','') || ''}</span>
          </div>
          <div style="font-size:12px;color:var(--text);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.ativo_nome||'—'}</div>
          ${h.colab ? `<div style="font-size:11px;color:var(--text2);margin-top:2px;">Colaborador: ${h.colab}</div>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text2);white-space:nowrap;margin-top:2px;">${fmtDate(h.atribuido||h.created_at)}</div>
      </div>`;
    }).join('') || `<div style="padding:24px;text-align:center;color:var(--text2);font-size:13px;">Nenhuma atividade registrada</div>`;
  }

  // Alertas de garantia
  const hoje = new Date();
  const em90 = new Date(); em90.setDate(em90.getDate() + 90);
  const alertasGarantia = ativos.filter(a => a.garantia && new Date(a.garantia) < em90);
  const alertsEl = document.getElementById('dashAlerts');
  if (alertsEl) {
    alertsEl.innerHTML = alertasGarantia.length
      ? alertasGarantia.map(a => {
          const exp = new Date(a.garantia) < hoje;
          const alertIcon = exp ? 'bi-exclamation-triangle-fill' : 'bi-calendar-event';
          return `<div class="alert ${exp ? 'alert-warn' : 'alert-info'}" style="margin-bottom:8px;">
            <i class="bi ${alertIcon}"></i> <b>${a.nome}</b>
            <span style="font-size:11px;opacity:.7;">(${a.patrimonio})</span>:
            garantia ${exp ? 'expirada' : 'expira'} em ${fmtDate(a.garantia)}
          </div>`;
        }).join('')
      : `<div style="color:var(--text2);font-size:13px;padding:12px 0;">Nenhum alerta de garantia.</div>`;
  }
}

async function updateStats() {
  const stats = await dbGetStats();
  document.getElementById('statTotal').textContent = stats.total      ?? 0;
  document.getElementById('statDisp').textContent  = stats.disponiveis ?? 0;
  document.getElementById('statUso').textContent   = stats.emUso       ?? 0;
  document.getElementById('statMan').textContent   = stats.manutencao  ?? 0;
}

async function updatePendBadge() {
  const list  = _lsGet('solicitacoes') || [];
  const count = list.filter(s => s.status === 'pendente').length;
  const el    = document.getElementById('pendBadge');
  if (el) { el.textContent = count || 0; el.style.display = count ? '' : 'none'; }
}

function refreshColabDatalist() {
  ['colabList','colabList2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = _cacheColabs.map(c => `<option value="${c.nome}">`).join('');
  });
}
