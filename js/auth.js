// ===================== AUTH (Supabase Auth) =====================

function _applyRoleSidebar(role) {
  const isAdmin = role === 'admin';
  ['adminSectionPrincipal', 'adminSectionOperacoes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? '' : 'none';
  });
  const clientSection = document.getElementById('clientSection');
  if (clientSection) clientSection.style.display = isAdmin ? 'none' : 'block';
}

function _setUserUI(user) {
  document.getElementById('userNameSidebar').textContent = user.nome || user.name || 'Usuário';
  document.getElementById('userRoleSidebar').textContent = user.role === 'admin' ? 'Administrador' : 'Cliente';
  document.getElementById('userAvatarSidebar').textContent = user.initials || user.nome?.slice(0, 2).toUpperCase() || 'US';
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
