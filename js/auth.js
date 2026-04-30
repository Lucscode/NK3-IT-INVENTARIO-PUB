// ===================== AUTH =====================
function _applyRoleSidebar(role) {
  const isAdmin = role === 'admin';
  // Admin-only sections
  ['adminSectionPrincipal', 'adminSectionOperacoes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? '' : 'none';
  });
  // Client-only section
  const clientSection = document.getElementById('clientSection');
  if (clientSection) clientSection.style.display = isAdmin ? 'none' : 'block';
}

function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;

  if (!email || !pass) {
    notify('Preencha todos os campos', 'error');
    return;
  }

  const adminConfig = typeof AUTH_CONFIG !== 'undefined' ? AUTH_CONFIG.admin : { email: '', pass: '' };
  const clientConfig = typeof AUTH_CONFIG !== 'undefined' ? AUTH_CONFIG.client : { email: '', pass: '' };

  if (email === adminConfig.email && pass === adminConfig.pass) {
    loginRole = 'admin';
    currentUser = { name: 'Suporte NK3', initials: 'SN', role: 'admin' };
  } else if (email === clientConfig.email && pass === clientConfig.pass) {
    loginRole = 'client';
    currentUser = { name: 'Cliente QP', initials: 'QP', role: 'client' };
  } else {
    notify('Email ou senha inválidos!', 'error');
    return;
  }

  document.getElementById('loginWrap').style.display = 'none';
  document.getElementById('mainApp').style.display = 'flex';
  document.getElementById('userNameSidebar').textContent = currentUser.name;
  document.getElementById('userRoleSidebar').textContent = currentUser.role === 'admin' ? 'Administrador' : 'Cliente';
  document.getElementById('userAvatarSidebar').textContent = currentUser.initials;

  _applyRoleSidebar(currentUser.role);

  if (currentUser.role === 'client') {
    goTo('area-cliente');
  } else {
    goTo('dashboard');
  }
  updateStats();
  updatePendBadge();
  refreshColabDatalist();
}

function doLogout() {
  // Reset sidebar to neutral state before hiding app
  _applyRoleSidebar('admin');
  loginRole = 'admin';
  
  // Clear fields
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
}
