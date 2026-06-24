function carregarMonitoramento() {
  const container = document.getElementById('rmmContainer');
  
  // Proteção: Desabilitar no Modo Demonstração
  if (typeof currentUser !== 'undefined' && currentUser?.email === 'demo@nk3it.com') {
    container.innerHTML = `
      <div class="empty" style="max-width: 400px;">
        <div class="empty-icon" style="color:var(--text-muted);"><i data-lucide="shield-alert"></i></div>
        <div class="empty-title">Acesso Restrito</div>
        <div class="empty-sub">Por questões de segurança, a visualização do painel real de RMM está desabilitada no modo de demonstração.</div>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  const urlRMM = localStorage.getItem('tacticalRmmUrl');

  if (!urlRMM) {
    container.innerHTML = `
      <div class="empty" style="max-width: 400px;">
        <div class="empty-icon"><i data-lucide="activity"></i></div>
        <div class="empty-title">Integração Tactical RMM</div>
        <div class="empty-sub" style="margin-bottom:24px;">Configure a URL do seu painel do Tactical RMM para visualizá-lo diretamente por aqui.</div>
        <button class="btn btn-primary" onclick="configurarURLRMM()" style="justify-content:center; width:100%;">Configurar URL</button>
      </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    return;
  }

  // Render iframe
  container.innerHTML = `
    <iframe src="${urlRMM}" style="width:100%; height:100%; border:none; border-radius:0 0 16px 0;"></iframe>
  `;
}

function configurarURLRMM() {
  if (typeof currentUser !== 'undefined' && currentUser?.email === 'demo@nk3it.com') {
    notify('Ação bloqueada no modo demonstração por segurança.', 'error');
    return;
  }

  const atual = localStorage.getItem('tacticalRmmUrl') || 'https://';
  const novaUrl = prompt('Digite a URL do seu painel do Tactical RMM:\n\n*Nota: Se a página ficar em branco, pode ser que seu RMM bloqueie iframes (X-Frame-Options). Nesse caso, use o botão "Abrir em Nova Guia".', atual);
  
  if (novaUrl !== null) {
    if (novaUrl.trim() === '' || novaUrl === 'https://') {
      localStorage.removeItem('tacticalRmmUrl');
    } else {
      localStorage.setItem('tacticalRmmUrl', novaUrl.trim());
    }
    carregarMonitoramento();
  }
}

function abrirRMMNovaAba() {
  if (typeof currentUser !== 'undefined' && currentUser?.email === 'demo@nk3it.com') {
    notify('Ação bloqueada no modo demonstração por segurança.', 'error');
    return;
  }

  const url = localStorage.getItem('tacticalRmmUrl');
  if (url && url !== 'https://') {
    window.open(url, '_blank');
  } else {
    notify('Configure a URL do RMM primeiro.', 'error');
    configurarURLRMM();
  }
}
