// ===================== TACTICAL RMM SYNC =====================
// Sincroniza dados de hardware do Tactical RMM com os ativos do inventário
// Matching: hostname (RMM) = patrimônio (inventário)

let _lastRMMSync = localStorage.getItem('lastRMMSync') || null;
let _rmmSyncInProgress = false;

// ─── Chamar a Edge Function de sincronização ─────────────────
async function syncFromRMM() {
  if (_rmmSyncInProgress) {
    notify('Sincronização já em andamento...', 'error');
    return;
  }

  _rmmSyncInProgress = true;
  const btn = document.getElementById('btnSyncRMM');
  const btn2 = document.getElementById('btnSyncRMM_mon');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Sincronizando...';
  }
  if (btn2) {
    btn2.disabled = true;
    btn2.innerHTML = '<i data-lucide="refresh-cw" class="spin-icon"></i> Sincronizando...';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  try {
    notify('Conectando ao Tactical RMM...', 'success');

    const { data, error } = await sb.functions.invoke('rmm-sync', {
      method: 'POST',
      body: {},
    });

    if (error) {
      throw new Error(error.message || 'Erro ao chamar Edge Function');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // Salvar timestamp
    _lastRMMSync = new Date().toISOString();
    localStorage.setItem('lastRMMSync', _lastRMMSync);
    _updateSyncTimestamp();

    // Mostrar resultado
    _showRMMSyncResult(data);

    // Atualizar a lista de ativos
    await renderAtivos();
    await updateStats();

  } catch (err) {
    console.error('[RMM Sync]', err);
    notify(`Erro na sincronização: ${err.message}`, 'error');
  } finally {
    _rmmSyncInProgress = false;
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-cloud-download"></i> Sincronizar RMM';
    }
    if (btn2) {
      btn2.disabled = false;
      btn2.innerHTML = '<i data-lucide="refresh-cw"></i> Sincronizar Agora';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    // Recarregar a tabela se estivermos na aba de monitoramento
    if (typeof carregarMonitoramento === 'function') carregarMonitoramento();
  }
}

// ─── Modal de Resultado ──────────────────────────────────────
function _showRMMSyncResult(result) {
  const modal = document.getElementById('modalRMMResult');
  if (!modal) return;

  const { synced = [], not_found = [], errors = [], total_agents = 0, total_synced = 0, total_not_found = 0, client_name = '', all_rmm_hostnames = [] } = result;

  let html = `
    <div style="display:flex;gap:12px;margin-bottom:20px;">
      <div style="flex:1;padding:16px;border-radius:12px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.2);text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#22c55e;">${total_synced}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">Atualizados</div>
      </div>
      <div style="flex:1;padding:16px;border-radius:12px;background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#fbbf24;">${total_not_found}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">Sem correspondência</div>
      </div>
      <div style="flex:1;padding:16px;border-radius:12px;background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2);text-align:center;">
        <div style="font-size:28px;font-weight:800;color:#6366f1;">${total_agents}</div>
        <div style="font-size:11px;color:var(--text2);margin-top:2px;">Total Agentes RMM</div>
      </div>
    </div>`;

  // Info do cliente
  if (client_name) {
    html += `<div style="margin-bottom:16px;font-size:12px;color:var(--text2);"><i class="bi bi-building"></i> Cliente RMM: <strong style="color:var(--text);">${client_name}</strong> — ${total_agents} agentes encontrados</div>`;
  }

  // Lista de atualizados
  if (synced.length > 0) {
    html += `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#22c55e;">
          <i class="bi bi-check-circle-fill"></i> Ativos Atualizados
        </div>
        <div style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
          <table style="width:100%;font-size:12px;">
            <thead><tr style="background:var(--bg2);">
              <th style="padding:8px;text-align:left;">Patrimônio</th>
              <th style="padding:8px;text-align:left;">Campos Atualizados</th>
            </tr></thead>
            <tbody>
              ${synced.map(s => `<tr style="border-top:1px solid var(--border);">
                <td style="padding:6px 8px;font-family:var(--mono);font-weight:600;">${s.patrimonio}</td>
                <td style="padding:6px 8px;">${s.fields_updated.map(f => `<span style="background:rgba(34,197,94,0.15);color:#22c55e;padding:2px 6px;border-radius:4px;font-size:10px;margin-right:4px;">${f}</span>`).join('')}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // Lista de não encontrados
  if (not_found.length > 0) {
    html += `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#fbbf24;">
          <i class="bi bi-exclamation-triangle-fill"></i> Agentes sem Correspondência no Inventário
        </div>
        <div style="font-size:11px;color:var(--text2);margin-bottom:6px;">
          Esses hostnames do RMM não correspondem a nenhum patrimônio cadastrado.
        </div>
        <div style="max-height:140px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;">
          <table style="width:100%;font-size:12px;">
            <thead><tr style="background:var(--bg2);">
              <th style="padding:8px;text-align:left;">Hostname (RMM)</th>
              <th style="padding:8px;text-align:left;">Nº Série</th>
            </tr></thead>
            <tbody>
              ${not_found.map(n => `<tr style="border-top:1px solid var(--border);">
                <td style="padding:6px 8px;font-family:var(--mono);">${n.hostname}</td>
                <td style="padding:6px 8px;font-size:11px;color:var(--text2);">${n.serial || '—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // Erros
  if (errors.length > 0) {
    html += `
      <div style="margin-bottom:16px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#ef4444;">
          <i class="bi bi-x-circle-fill"></i> Erros (${errors.length})
        </div>
        <div style="max-height:100px;overflow-y:auto;font-size:11px;color:#ef4444;background:rgba(239,68,68,0.05);padding:8px;border-radius:8px;">
          ${errors.map(e => `<div>${e.hostname}: ${e.error}</div>`).join('')}
        </div>
      </div>`;
  }

  // Debug: informações de diagnóstico
  const { debug_sample = null, debug_all_clients = [], debug_total_before_filter = 0, debug_first_agent_raw = null, debug_agent_keys = [] } = result;
  html += `
    <details style="margin-top:12px;border:1px solid var(--border);border-radius:8px;padding:8px;" open>
      <summary style="font-size:12px;color:var(--text3);cursor:pointer;user-select:none;font-weight:600;">
        <i class="bi bi-bug"></i> Debug — Diagnóstico da API
      </summary>
      <div style="margin-top:8px;font-family:var(--mono);font-size:11px;color:var(--text2);">
        <div style="margin-bottom:8px;"><strong>Total de agentes na API (antes do filtro):</strong> ${debug_total_before_filter}</div>
        <div style="margin-bottom:8px;"><strong>Clientes encontrados na API:</strong><br>${debug_all_clients.length > 0 ? debug_all_clients.map(c => `<span style="background:var(--bg3);padding:2px 6px;border-radius:4px;margin:2px;display:inline-block;">${c}</span>`).join('') : '<em>Nenhum</em>'}</div>
        ${debug_sample ? `<div style="margin-bottom:8px;"><strong>Sample do 1º agente (campos de cliente):</strong><pre style="background:var(--bg3);padding:8px;border-radius:6px;overflow-x:auto;margin-top:4px;">${JSON.stringify(debug_sample, null, 2)}</pre></div>` : ''}
        ${debug_first_agent_raw ? `<div style="margin-bottom:8px;"><strong>Dados extraídos do 1º agente:</strong><pre style="background:var(--bg3);padding:8px;border-radius:6px;overflow-x:auto;margin-top:4px;">${JSON.stringify(debug_first_agent_raw, null, 2)}</pre></div>` : ''}
        ${debug_agent_keys.length > 0 ? `<div style="margin-bottom:8px;"><strong>Todas as chaves do agente RMM (${debug_agent_keys.length}):</strong><div style="margin-top:4px;max-height:100px;overflow-y:auto;">${debug_agent_keys.map(k => `<span style="background:var(--bg3);padding:1px 4px;border-radius:3px;margin:1px;display:inline-block;font-size:10px;">${k}</span>`).join(' ')}</div></div>` : ''}
        ${all_rmm_hostnames.length > 0 ? `<div><strong>Hostnames filtrados (${all_rmm_hostnames.length}):</strong><div style="max-height:100px;overflow-y:auto;margin-top:4px;">${all_rmm_hostnames.map(h => `<div>${h}</div>`).join('')}</div></div>` : ''}
      </div>
    </details>`;


  document.getElementById('modalRMMResultBody').innerHTML = html;
  modal.classList.add('open');

  if (total_synced > 0) {
    notify(`${total_synced} ativos atualizados pelo RMM!`, 'success');
  } else if (total_not_found > 0 && total_synced === 0) {
    notify('Nenhum ativo correspondente encontrado. Verifique os patrimônios.', 'error');
  }
}

// ─── Timestamp de última sincronização ───────────────────────
function _updateSyncTimestamp() {
  const el = document.getElementById('rmmSyncTimestamp');
  if (!el) return;
  if (_lastRMMSync) {
    const d = new Date(_lastRMMSync);
    const ago = _timeAgo(d);
    el.textContent = `Última sync: ${ago}`;
    el.title = d.toLocaleString('pt-BR');
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

function _timeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

// Inicializar timestamp ao carregar
document.addEventListener('DOMContentLoaded', () => {
  _updateSyncTimestamp();
});
