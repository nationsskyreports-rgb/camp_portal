// ============================================================
// AUTH — Login / Logout
// ============================================================

// ── Admin UI helpers ─────────────────────────────────────────
function showAdminPass() {
  document.getElementById('admin-btn').classList.add('hidden');
  document.getElementById('admin-pass-area').classList.remove('hidden');
  document.getElementById('admin-pass-input').focus();
  lucide.createIcons();
}

function hideAdminPass() {
  document.getElementById('admin-btn').classList.remove('hidden');
  document.getElementById('admin-pass-area').classList.add('hidden');
  document.getElementById('admin-pass-input').value = '';
}

function togglePassVis() {
  var inp  = document.getElementById('admin-pass-input');
  var icon = document.getElementById('pass-eye-icon');
  if (!inp) return;
  if (inp.type === 'password') {
    inp.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    inp.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
}

// ── Admin login ──────────────────────────────────────────────
// Password verified server-side via RPC — never returned to client.
async function loginAsAdmin() {
  var pass = document.getElementById('admin-pass-input').value;
  if (!pass) { toast('Enter password', 'error'); return; }

  var btn = document.querySelector('#admin-pass-area .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = 'Checking...'; }

  try {
    var res = await sb.rpc('verify_admin_password', { input_password: pass });
    if (res.error) throw res.error;

    if (!res.data) {
      toast('Wrong password', 'error');
      document.getElementById('admin-pass-input').value = '';
      return;
    }

    enterAdminDashboard();
  } catch (e) {
    toast('Error checking password', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="log-in" class="w-4 h-4"></i>Login';
      lucide.createIcons();
    }
  }
}

function enterAdminDashboard() {
  S.role = 'admin'; S.employee = null;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('mobile-menu-btn').style.display = '';
  hideAdminPass();
  fetchAll().then(function() {
    buildSidebar();
    navigateTo('dashboard');
  }).catch(function(e) { toast('Error loading data: ' + e.message, 'error'); logout(); });
}

// ── Employee login ───────────────────────────────────────────
function loginAsEmployee() {
  var sel   = document.getElementById('employee-select');
  var empId = sel.value;
  if (!empId) { toast('Select an employee', 'error'); return; }

  var emp = S.employees.find(function(e) { return e.id === empId; });
  if (!emp) { toast('Employee not found', 'error'); return; }

  S.role = 'employee'; S.employee = emp;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('mobile-menu-btn').style.display = '';
  fetchAll().then(function() {
    buildSidebar();
    navigateTo('my-clients');
  }).catch(function(e) { toast('Error loading data: ' + e.message, 'error'); logout(); });
}

// ── Logout ────────────────────────────────────────────────────
function logout() {
  var empIdToDeactivate = (S.role === 'employee' && S.employee) ? S.employee.id : null;

  S = {
    role: null, employee: null, currentPage: '',
    employees: [], campaigns: [], clients: [],
    questions: [], notifications: [], contactHistory: [],
    darkMode: S.darkMode, callTimers: {}
  };

  notifFilter       = 'all';
  qClientSearch     = '';
  qSelectedClient   = null;
  qSelectedCampaign = '';
  U = { campaignId: '', rows: [], preview: null, uploadTab: 'paste', colConfig: null };
  T = { showForm: false, editId: null, name: '', email: '', phone: '' };
  showCampForm      = false;
  selectedCampId    = null;
  expandedClientId  = null;
  qSent             = false;
  qaFilter          = { employee: '', campaign: '', status: '' };
  rptFilter         = { campaign: '', employee: '', status: '', dateFrom: '', dateTo: '', page: 0 };
  empClientFilter   = '';

  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('mobile-menu-btn').style.display = 'none';

  var tb = document.getElementById('mobile-topbar-title');
  if (tb) tb.style.display = 'none';
  closeMobileSidebar();

  function reloadDropdown() {
    sb.from('employees').select('id,name,is_active,color').order('name')
      .then(function(res) { S.employees = res.data || []; loadEmpDropdown(); lucide.createIcons(); })
      .catch(function() { loadEmpDropdown(); lucide.createIcons(); });
  }

  if (empIdToDeactivate) {
    sb.from('employees').update({ is_active: false }).eq('id', empIdToDeactivate)
      .then(reloadDropdown).catch(reloadDropdown);
  } else {
    reloadDropdown();
  }
}

// ── Dropdown loader ───────────────────────────────────────────
function loadEmpDropdown() {
  var select = document.getElementById('employee-select');
  if (!select) return;
  if (S.employees && S.employees.length > 0) {
    select.innerHTML = '<option value="">Select Employee...</option>' +
      S.employees.map(function(e) {
        return '<option value="' + e.id + '">' + esc(e.name) + '</option>';
      }).join('');
  } else {
    select.innerHTML = '<option value="">Loading employees...</option>';
  }
}

function initializeEmployeeList() {
  sb.from('employees').select('id,name,is_active,color').order('name')
    .then(function(res) { S.employees = res.data || []; loadEmpDropdown(); lucide.createIcons(); })
    .catch(function(e) {
      console.error('Error loading employees:', e);
      toast('Error loading employees. Please refresh.', 'error');
      setTimeout(initializeEmployeeList, 3000);
    });
}
