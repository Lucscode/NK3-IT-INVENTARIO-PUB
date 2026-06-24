// ===================== DASHBOARD =====================
let currentPageAlerts = 1;
const ALERTS_PER_PAGE = 10;

let chartStatusInstance = null;
let chartTiposInstance = null;
let chartOSInstance = null;

window.changePageAlerts = function(p) {
  currentPageAlerts = p;
  renderDashboard();
};

async function renderDashboard() {
  // Stats
  const stats = await dbGetStats();
  document.getElementById('statTotal').textContent = stats.total ?? 0;
  document.getElementById('statDisp').textContent = stats.disponiveis ?? 0;
  document.getElementById('statUso').textContent = stats.emUso ?? 0;
  document.getElementById('statMan').textContent = stats.manutencao ?? 0;

  // Hero Stats
  const heroStatTotal = document.getElementById('heroStatTotal');
  if (heroStatTotal) heroStatTotal.textContent = stats.total ?? 0;
  const heroStatManutencao = document.getElementById('heroStatManutencao');
  if (heroStatManutencao) heroStatManutencao.textContent = stats.manutencao ?? 0;

  // Subtítulo dinâmico
  const sub = document.getElementById('pageSub');
  if (sub) sub.textContent = `${stats.total ?? 0} equipamentos cadastrados no sistema`;

  // Ativos recentes — grid de cards com foto (6 últimos)
  let ativos = await dbGetAtivos();
  _cacheAtivos = ativos;
  
  const offCount = ativos.filter(a => getOfflineStatus(a) !== null).length;
  const offEl = document.getElementById('statOffline');
  if (offEl) offEl.textContent = offCount;
  const heroStatOffline = document.getElementById('heroStatOffline');
  if (heroStatOffline) heroStatOffline.textContent = offCount;

  // HD Cheio e Upgrade RAM
  let hdCheioCount = 0;
  let ramUpgradeCount = 0;

  ativos.forEach(a => {
    const disk = parseInt(a.rmm_disk_percent) || 0;
    if (disk >= 90) hdCheioCount++;
    
    const mem = parseInt(a.rmm_mem_percent) || 0;
    const ramStr = a.ram || '';
    const match = ramStr.match(/(\d+)/);
    let ramValue = 999;
    if (match) ramValue = parseInt(match[1]);
    
    if (mem >= 90 || (ramValue > 0 && ramValue < 16)) {
      const status = (a.status || '').toLowerCase();
      if (status === 'estoque' || status === 'em uso') {
        ramUpgradeCount++;
      }
    }
  });

  const statHDEl = document.getElementById('statHD');
  if (statHDEl) statHDEl.textContent = hdCheioCount;

  const statRAMEl = document.getElementById('statRAM');
  if (statRAMEl) statRAMEl.textContent = ramUpgradeCount;

  const tipoFilter = document.getElementById('dashFilterTipo')?.value || '';
  const statusFilter = document.getElementById('dashFilterStatus')?.value || '';
  const search = document.getElementById('globalSearch')?.value.toLowerCase() || '';

  if (tipoFilter) ativos = ativos.filter(a => a.tipo === tipoFilter);
  if (statusFilter) ativos = ativos.filter(a => a.status === statusFilter);
  if (search) ativos = ativos.filter(a =>
    (a.nome || '').toLowerCase().includes(search) ||
    (a.patrimonio || '').toLowerCase().includes(search) ||
    (a.colab || '').toLowerCase().includes(search) ||
    (a.marca || '').toLowerCase().includes(search) ||
    (a.modelo || '').toLowerCase().includes(search) ||
    (a.serie || '').toLowerCase().includes(search)
  );

  const recentes = ativos.slice(0, 6);
  const fotosMap = {};
  await Promise.all(recentes.map(async a => { fotosMap[a.id] = await dbGetFotos(a.id); }));

  document.getElementById('dashRecentAssets').innerHTML = recentes.length
    ? `<div class="asset-grid" style="grid-template-columns:repeat(3,1fr);">${recentes.map(a => {
      const foto = fotosMap[a.id]?.[0];
      const iconName = (a.emoji === 'display') ? 'monitor' : (a.emoji === 'phone' ? 'smartphone' : (a.emoji || 'laptop'));
      const fotoHtml = foto
        ? `<img src="${foto.url}" alt="foto" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="asset-emoji-fallback" style="display:none;"><i data-lucide="${iconName}"></i></div>`
        : `<div class="asset-emoji-fallback"><i data-lucide="${iconName}"></i></div>`;
      return `<div class="asset-card" onclick="goTo('ativos');setTimeout(()=>openDetalhe('${a.id}'),300)" style="cursor:pointer;">
          <div class="asset-card-img">${fotoHtml}<div class="badge-overlay">${statusBadge(a.status)}</div></div>
          <div class="asset-card-body">
            <div class="asset-card-meta">
              <span class="asset-card-patrimonio">${a.patrimonio}</span>
              <span class="asset-card-tipo">${a.tipo || ''}</span>
            </div>
            <div class="asset-card-name">${a.nome}</div>
            <div class="asset-card-info">
              ${a.colab ? `<div class="asset-card-info-row"><i data-lucide="user" style="width:14px;height:14px;"></i> <span>${a.colab}</span></div>` : ''}
              ${a.localizacao ? `<div class="asset-card-info-row"><i data-lucide="map-pin" style="width:14px;height:14px;"></i> <span>${a.localizacao}</span></div>` : ''}
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
      let tipo, cor;
      if (h.obs?.startsWith('Exclusão')) { tipo = 'Exclusão'; cor = '#ef4444'; }
      else if (h.obs?.startsWith('Anotação alterada')) { tipo = 'Anotação'; cor = '#8b5cf6'; }
      else if (h.devolvido) { tipo = 'Devolução'; cor = '#10b981'; }
      else if (h.atribuido) { tipo = 'Atribuição'; cor = '#3b82f6'; }
      else { tipo = 'Cadastro'; cor = '#6366f1'; }
      const initials = (h.colab || 'S')
        .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
      return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--text2);flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:3px;flex-wrap:wrap;">
            <span style="background:${cor}1a;color:${cor};font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px;">${tipo}</span>
            <span style="font-family:var(--mono);font-size:10px;color:var(--text2);">${h.ativo_nome?.split('(')[1]?.replace(')', '') || ''}</span>
          </div>
          <div style="font-size:12px;color:var(--text);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${h.ativo_nome || '—'}</div>
          ${h.colab ? `<div style="font-size:11px;color:var(--text2);margin-top:2px;">Colaborador: ${h.colab}</div>` : ''}
        </div>
        <div style="font-size:11px;color:var(--text2);white-space:nowrap;margin-top:2px;">${fmtDate(h.atribuido || h.created_at)}</div>
      </div>`;
    }).join('') || `<div style="padding:24px;text-align:center;color:var(--text2);font-size:13px;">Nenhuma atividade registrada</div>`;
  }

  // Base para o painel de logística (ignora filtros dropdown de ativos recentes, mas respeita a barra de busca global)
  let baseLogistica = _cacheAtivos;
  if (search) {
    baseLogistica = baseLogistica.filter(a =>
      (a.nome || '').toLowerCase().includes(search) ||
      (a.patrimonio || '').toLowerCase().includes(search) ||
      (a.colab || '').toLowerCase().includes(search) ||
      (a.marca || '').toLowerCase().includes(search) ||
      (a.modelo || '').toLowerCase().includes(search) ||
      (a.serie || '').toLowerCase().includes(search)
    );
  }

  // Painel de Logística: Aguardando Envio
  const logAguardando = baseLogistica.filter(a => a.status === 'saindo para envio');

  const renderLogCard = (a) => {
    const iconName = (a.emoji === 'display') ? 'monitor' : (a.emoji === 'phone' ? 'smartphone' : (a.emoji || 'laptop'));
    return `
    <div style="background:var(--bg); border:1px solid var(--border); border-radius:6px; padding:10px; display:flex; gap:12px; align-items:center; cursor:pointer; transition:transform 0.2s;" onclick="goTo('ativos');setTimeout(()=>openDetalhe('${a.id}'),300)" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='none'">
      <div style="width:36px;height:36px;background:var(--bg3);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--text2);flex-shrink:0;">
        <i data-lucide="${iconName}" style="width:20px;height:20px;"></i>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text);">${a.nome}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">${a.patrimonio} ${a.colab ? `• ${a.colab}` : ''}</div>
      </div>
      <i data-lucide="chevron-right" style="color:var(--text3);width:16px;height:16px;"></i>
    </div>
  `};

  const aguardandoEl = document.getElementById('dashLogAguardando');
  if (aguardandoEl) {
    aguardandoEl.innerHTML = logAguardando.length 
      ? logAguardando.map(renderLogCard).join('') 
      : '<div style="font-size:12px;color:var(--text3);padding:10px;text-align:center;grid-column:1/-1;">Nenhum ativo aguardando envio</div>';
  }

  // Atenção Crítica (Health Checks)
  const alerts = [];
  const hoje = new Date();
  const em30 = new Date(); em30.setDate(em30.getDate() + 30);
  
  ativos.forEach(a => {
    // 1. Offline (com base no tempo)
    const offStatus = getOfflineStatus(a);
    if (offStatus) {
      alerts.push({
        id: a.id, nome: a.nome, patrimonio: a.patrimonio,
        type: offStatus.level >= 3 ? 'danger' : 'warn', 
        icon: 'wifi-off', 
        title: offStatus.title,
        msg: `Sem comunicação há mais de ${offStatus.level} mês(es).`
      });
    }
    // 2. Disco Cheio
    if (parseInt(a.rmm_disk_percent) >= 95) {
      alerts.push({
        id: a.id, nome: a.nome, patrimonio: a.patrimonio,
        type: 'danger', icon: 'hard-drive', title: 'Disco Crítico',
        msg: `${a.rmm_disk_percent}% de uso.`
      });
    }
    // 3. Memória
    if (parseInt(a.rmm_mem_percent) >= 95) {
      alerts.push({
        id: a.id, nome: a.nome, patrimonio: a.patrimonio,
        type: 'warn', icon: 'cpu', title: 'Memória Alta',
        msg: `${a.rmm_mem_percent}% de uso.`
      });
    }
    // 4. Garantia
    if (a.garantia) {
      const dataGarantia = new Date(a.garantia);
      if (dataGarantia < hoje) {
        alerts.push({
          id: a.id, nome: a.nome, patrimonio: a.patrimonio,
          type: 'danger', icon: 'alert-triangle', title: 'Garantia Vencida',
          msg: `Expirou em ${fmtDate(a.garantia)}`
        });
      } else if (dataGarantia < em30) {
        alerts.push({
          id: a.id, nome: a.nome, patrimonio: a.patrimonio,
          type: 'warn', icon: 'calendar', title: 'Garantia Próxima',
          msg: `Expira em ${fmtDate(a.garantia)}`
        });
      }
    }
  });

  // Ordenar perigosos primeiro
  alerts.sort((a, b) => a.type === 'danger' && b.type !== 'danger' ? -1 : (a.type !== 'danger' && b.type === 'danger' ? 1 : 0));

  const alertsEl = document.getElementById('dashAlerts');
  
  if (alertsEl) {
    const totalAlerts = alerts.length;
    const totalPagesAlerts = Math.ceil(totalAlerts / ALERTS_PER_PAGE) || 1;
    if (currentPageAlerts > totalPagesAlerts) currentPageAlerts = totalPagesAlerts;
    const startIdx = (currentPageAlerts - 1) * ALERTS_PER_PAGE;
    const pagedAlerts = alerts.slice(startIdx, startIdx + ALERTS_PER_PAGE);

    let html = '';
    if (pagedAlerts.length) {
      html += pagedAlerts.map(al => {
        const bgClass = al.type === 'danger' ? 'alert-warn' : 'alert-info';
        return `<div class="alert ${bgClass}" style="margin-bottom:8px; cursor:pointer; display:flex; gap:8px; align-items:flex-start;" onclick="goTo('ativos');setTimeout(()=>openDetalhe('${al.id}'),300)">
            <i data-lucide="${al.icon}" style="width:16px;height:16px;margin-top:2px;"></i>
            <div style="flex:1;">
              <div style="font-size:12px; font-weight:700;">${al.title}: ${al.nome} <span style="font-size:10px; font-weight:normal; opacity:.7;">(${al.patrimonio})</span></div>
              <div style="font-size:11px; margin-top:2px; opacity:0.9;">${al.msg}</div>
            </div>
          </div>`;
      }).join('');

      if (totalPagesAlerts > 1) {
        html += `<div style="display:flex; justify-content:center; align-items:center; gap:16px; margin-top:12px;">
          <button class="btn btn-ghost btn-sm" onclick="changePageAlerts(${currentPageAlerts - 1})" ${currentPageAlerts === 1 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>← Anterior</button>
          <span style="font-size:11px; color:var(--text2); font-weight:600;">Página ${currentPageAlerts} de ${totalPagesAlerts}</span>
          <button class="btn btn-ghost btn-sm" onclick="changePageAlerts(${currentPageAlerts + 1})" ${currentPageAlerts === totalPagesAlerts ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>Próxima →</button>
        </div>`;
      }
    } else {
      html = `<div style="color:var(--text2);font-size:13px;padding:12px 0;"><i class="bi bi-check-circle" style="color:var(--success);margin-right:6px;"></i> Nenhum alerta crítico detectado.</div>`;
    }
    alertsEl.innerHTML = html;
  }

  // Renderizar Gráficos
  renderCharts(_cacheAtivos);

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function updateStats() {
  const stats = await dbGetStats();
  document.getElementById('statTotal').textContent = stats.total ?? 0;
  document.getElementById('statDisp').textContent = stats.disponiveis ?? 0;
  document.getElementById('statUso').textContent = stats.emUso ?? 0;
  document.getElementById('statMan').textContent = stats.manutencao ?? 0;
}

async function updatePendBadge() {
  try {
    const list = await dbGetSolicitacoes();
    const count = list.filter(s => s.status === 'pendente').length;
    const el = document.getElementById('pendBadge');
    if (el) { el.textContent = count || 0; el.style.display = count ? '' : 'none'; }
  } catch (e) {
    console.warn('[Badge]', e.message);
  }
}

function refreshColabDatalist() {
  ['colabList', 'colabList2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = _cacheColabs.map(c => `<option value="${c.nome}">`).join('');
  });
}

function renderCharts(ativos) {
  // Config cores baseadas no CSS root
  const textColor = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#333';
  const gridColor = getComputedStyle(document.body).getPropertyValue('--border').trim() || '#eee';

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = 'DM Sans, sans-serif';

  // Plugin para texto central
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: function(chart) {
      if (chart.config.type !== 'doughnut') return;
      var width = chart.width, height = chart.height, ctx = chart.ctx;
      ctx.restore();
      var fontSize = (height / 114).toFixed(2);
      ctx.font = "bold " + fontSize + "em " + (getComputedStyle(document.body).getPropertyValue('--sans') || 'sans-serif');
      ctx.textBaseline = "middle";
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text').trim() || '#333';
  
      const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
      var text = total.toString(), textX = Math.round((width - ctx.measureText(text).width) / 2), textY = height / 2 - 10;
      ctx.fillText(text, textX, textY);
      
      ctx.font = "600 " + (fontSize / 2.8).toFixed(2) + "em " + (getComputedStyle(document.body).getPropertyValue('--sans') || 'sans-serif');
      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text2').trim() || '#666';
      var text2 = "Total";
      var text2X = Math.round((width - ctx.measureText(text2).width) / 2);
      ctx.fillText(text2, text2X, textY + 25);
      ctx.save();
    }
  };

  // 1. Status Chart (Doughnut)
  if (chartStatusInstance) chartStatusInstance.destroy();
  const ctxStatus = document.getElementById('chartStatus');
  if (ctxStatus) {
    const statusCounts = { 'disponivel': 0, 'em uso': 0, 'manutencao': 0, 'estoque': 0, 'outros': 0 };
    ativos.forEach(a => {
      const s = (a.status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      if (statusCounts[s] !== undefined) statusCounts[s]++;
      else statusCounts['outros']++;
    });
    
    chartStatusInstance = new Chart(ctxStatus, {
      type: 'doughnut',
      data: {
        labels: ['Disponível', 'Em Uso', 'Manutenção', 'Estoque', 'Outros'],
        datasets: [{
          data: [statusCounts['disponivel'], statusCounts['em uso'], statusCounts['manutencao'], statusCounts['estoque'], statusCounts['outros']],
          backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#3b82f6', '#64748b'],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      plugins: [centerTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
        },
        cutout: '75%',
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const label = chartStatusInstance.data.labels[index];
            const filterMap = { 'Disponível': 'disponivel', 'Em Uso': 'em uso', 'Manutenção': 'manutencao', 'Estoque': 'estoque' };
            const val = filterMap[label] || 'todos';
            
            // Garante que a view mostre todos os tipos (incluindo dedicados)
            if (typeof filterAtivoTipo === 'function') {
              filterAtivoTipo('todos_geral');
            }
            
            // Set filter in Ativos page if it's available globally or via element
            if (typeof filterAtivos === 'function') {
              filterAtivos(val);
            } else {
              const sel = document.getElementById('ativoStatusSelect');
              if (sel) sel.value = val;
            }
            goTo('ativos');
            
            setTimeout(() => {
              const sel = document.getElementById('ativoStatusSelect');
              if (sel && sel.value !== val) {
                sel.value = val;
                if (typeof filterAtivos === 'function') filterAtivos(val);
              }
            }, 100);
          }
        }
      }
    });
  }


  // 3. OS Chart (Doughnut)
  if (chartOSInstance) chartOSInstance.destroy();
  const ctxOS = document.getElementById('chartOS');
  if (ctxOS) {
    const osCounts = {};
    ativos.forEach(a => {
      let os = a.so || 'Desconhecido';
      const osLower = os.toLowerCase();
      if (osLower.includes('windows 11')) os = 'Windows 11';
      else if (osLower.includes('windows 10') || osLower.includes('win 10')) os = 'Windows 10';
      else if (osLower.includes('windows') || osLower.includes('win')) os = 'Windows (Outras Versões)';
      else if (osLower.includes('mac')) os = 'macOS';
      else if (osLower.includes('android')) os = 'Android';
      else if (osLower.includes('ios') || osLower.includes('iphone')) os = 'iOS';
      else if (osLower.includes('linux') || osLower.includes('ubuntu') || osLower.includes('debian')) os = 'Linux';
      else if (os !== 'Desconhecido') os = 'Outros';
      
      osCounts[os] = (osCounts[os] || 0) + 1;
    });

    const sortedOS = Object.entries(osCounts).sort((a,b) => b[1] - a[1]);

    chartOSInstance = new Chart(ctxOS, {
      type: 'doughnut',
      data: {
        labels: sortedOS.map(i => i[0]),
        datasets: [{
          data: sortedOS.map(i => i[1]),
          backgroundColor: ['#0ea5e9', '#8b5cf6', '#f43f5e', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#64748b', '#14b8a6', '#f97316'],
          borderWidth: 0
        }]
      },
      plugins: [centerTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 15 } }
        },
        cutout: '70%',
        onClick: (e, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            let label = chartOSInstance.data.labels[index];
            if (label === 'Outros' || label === 'Desconhecido') label = '';
            
            const searchEl = document.getElementById('globalSearch');
            if (searchEl) searchEl.value = label;
            
            if (typeof filterAtivoTipo === 'function') {
              filterAtivoTipo('todos_geral');
            }
            goTo('ativos');
            
            setTimeout(() => {
              const el = document.getElementById('globalSearch');
              if (el) el.value = label;
              if (typeof window.renderAtivos === 'function') window.renderAtivos();
            }, 100);
          }
        }
      }
    });
  }
}
