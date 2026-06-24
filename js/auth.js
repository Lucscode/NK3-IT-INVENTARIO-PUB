// ===================== AUTH (Supabase Auth) =====================

function togglePassword() {
  const passInput = document.getElementById('loginPass');
  const icon = document.getElementById('togglePassIcon');
  if (passInput.type === 'password') {
    passInput.type = 'text';
    icon.classList.remove('bi-eye');
    icon.classList.add('bi-eye-slash');
  } else {
    passInput.type = 'password';
    icon.classList.remove('bi-eye-slash');
    icon.classList.add('bi-eye');
  }
}

function _applyRoleSidebar(role) {
  const isAdmin = role === 'admin';
  ['adminSectionPrincipal', 'adminSectionOperacoes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? '' : 'none';
  });
  const clientSection = document.getElementById('clientSection');
  if (clientSection) clientSection.style.display = isAdmin ? 'none' : 'block';

  // Esconder monitoramento no modo demo
  const navMon = document.getElementById('navMonitoramento');
  const btnSync = document.getElementById('btnSyncRMM');
  const btnSyncMon = document.getElementById('btnSyncRMM_mon');
  if (typeof currentUser !== 'undefined' && currentUser?.email === 'demo@nk3it.com') {
    if (navMon) navMon.style.display = 'none';
    if (btnSync) btnSync.style.display = 'none';
    if (btnSyncMon) btnSyncMon.style.display = 'none';
  } else {
    if (navMon) navMon.style.display = '';
    if (btnSync) btnSync.style.display = 'inline-flex';
    if (btnSyncMon) btnSyncMon.style.display = 'inline-flex';
  }
}

function _setUserUI(user) {
  // Sidebar
  document.getElementById('userNameSidebar').textContent = user.nome || user.name || 'Usuário';
  document.getElementById('userRoleSidebar').textContent = user.role === 'admin' ? 'Administrador' : 'Cliente';
  document.getElementById('userAvatarSidebar').textContent = user.initials || user.nome?.slice(0, 2).toUpperCase() || 'US';

  // Topbar
  const topName = document.getElementById('topbarUserName');
  if (topName) topName.textContent = user.nome || user.name || 'Usuário';
  
  const topRole = document.getElementById('topbarUserRole');
  if (topRole) topRole.textContent = user.role === 'admin' ? 'Administrador' : 'Cliente';
  
  const topAvatar = document.getElementById('topbarUserInitials');
  if (topAvatar) topAvatar.textContent = user.initials || user.nome?.slice(0, 2).toUpperCase() || 'US';
}

async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;

  if (!email || !pass) { notify('Preencha todos os campos', 'error'); return; }

  const btn = document.querySelector('#loginWrap .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Entrando...'; }

  try {
    const { user } = await dbSignIn(email, pass);

    // Busca perfil com role
    const perfil = await dbGetPerfil(user.id);
    if (!perfil) throw new Error('Perfil não encontrado. Contate o administrador.');

    loginRole = perfil.role;
    currentUser = { ...perfil, email: user.email };

    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';

    _setUserUI(currentUser);
    _applyRoleSidebar(currentUser.role);

    if (currentUser.role === 'client') {
      goTo('area-cliente');
    } else {
      goTo('dashboard');
    }

    updateStats();
    updatePendBadge();
    _cacheColabs = await dbGetColabs();
    refreshColabDatalist();

  } catch (ex) {
    const msg = ex.message?.includes('Invalid login') || ex.message?.includes('invalid_credentials')
      ? 'Email ou senha inválidos!'
      : ex.message || 'Erro ao fazer login';
    notify(msg, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Entrar →'; }
  }
}

async function doDemoLogin() {
  const btn = document.querySelector('#loginWrap .btn-ghost');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin" style="display:inline-block; margin-right:6px;">↻</span> Acessando...'; }

  try {
    loginRole = 'admin';
    currentUser = { role: 'admin', nome: 'Modo Demonstração', initials: 'MD', email: 'demo@nk3it.com' };

    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';

    _setUserUI(currentUser);
    _applyRoleSidebar(currentUser.role);

    if (typeof initDemoMock === 'function') initDemoMock();

    goTo('dashboard');

    updateStats();
    updatePendBadge();
    _cacheColabs = await dbGetColabs();
    refreshColabDatalist();
    
    notify('Acessando em modo de demonstração. Bem-vindo!', 'success');
    
    // Mostra o pop up de boas vindas do modo demo
    openModal('modalDemoWelcome');

  } catch (ex) {
    notify('Erro ao acessar demonstração: ' + ex.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-play-circle" style="margin-right:6px;"></i> Acessar Modo Demonstração'; }
  }
}

async function doLogout() {
  await dbSignOut();
  _applyRoleSidebar('admin');
  loginRole = 'admin';
  currentUser = { name: 'Admin', role: 'admin', initials: 'AD' };

  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPass').value = '';
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loginWrap').style.display = 'flex';
}

// Recuperar sessão existente ao carregar a página
async function tryRestoreSession() {
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return false;

    const perfil = await dbGetPerfil(session.user.id);
    if (!perfil) return false;

    loginRole = perfil.role;
    currentUser = { ...perfil, email: session.user.email };

    document.getElementById('loginWrap').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';

    _setUserUI(currentUser);
    _applyRoleSidebar(currentUser.role);

    if (currentUser.role === 'client') {
      goTo('area-cliente');
    } else {
      goTo('dashboard');
    }
    return true;
  } catch (e) {
    console.warn('[Auth] Restore session:', e.message);
    return false;
  }
}
