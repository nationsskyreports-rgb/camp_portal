// ============================================================
// AUTH — Login / Logout
// ============================================================
function showAdminPass(){
  document.getElementById('admin-btn').classList.add('hidden');
  document.getElementById('admin-pass-area').classList.remove('hidden');
  document.getElementById('admin-pass-input').focus();
  lucide.createIcons();
}
function hideAdminPass(){
  document.getElementById('admin-btn').classList.remove('hidden');
  document.getElementById('admin-pass-area').classList.add('hidden');
  document.getElementById('admin-pass-input').value='';
}
function togglePassVis(){
  var inp=document.getElementById('admin-pass-input');
  var icon=document.getElementById('pass-eye-icon');
  if(!inp)return;
  if(inp.type==='password'){inp.type='text';icon.setAttribute('data-lucide','eye-off');}
  else{inp.type='password';icon.setAttribute('data-lucide','eye');}
  lucide.createIcons();
}

async function loginAsAdmin(){
  var pass=document.getElementById('admin-pass-input').value;
  if(!pass){toast('Enter password','error');return;}
  try{
    var res=await sb.from('app_settings').select('value').eq('key','admin_password').single();
    if(!res.data||pass!==res.data.value){
      toast('Wrong password','error');
      document.getElementById('admin-pass-input').value='';
      return;
    }
    // Secure session: sessionStorage (dies on tab/browser close) + expiry timestamp
    var rememberMe=document.getElementById('admin-remember-me');
    if(rememberMe&&rememberMe.checked){
      sessionStorage.setItem('admin_session',JSON.stringify({
        v:1,
        expiry: Date.now()+SESSION_EXPIRY_MS
      }));
    } else {
      sessionStorage.removeItem('admin_session');
    }
    enterAdminDashboard();
  }catch(e){toast('Error checking password','error');}
}

function enterAdminDashboard(){
  S.role='admin'; S.employee=null;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('mobile-menu-btn').style.display='';
  hideAdminPass();
  fetchAll().then(function(){
    setupRealtime();
    buildSidebar();
    navigateTo('dashboard');
  }).catch(function(e){toast('Error loading data: '+e.message,'error');logout();});
}

function checkRememberedAdmin(){
  try{
    var raw=sessionStorage.getItem('admin_session');
    if(!raw) return false;
    var session=JSON.parse(raw);
    if(!session||session.v!==1) { sessionStorage.removeItem('admin_session'); return false; }
    if(Date.now()>session.expiry){ sessionStorage.removeItem('admin_session'); return false; }
    enterAdminDashboard();
    return true;
  }catch(e){
    sessionStorage.removeItem('admin_session');
    return false;
  }
}

// ── Employee Login ──
async function loginAsEmployee(){
  var sel=document.getElementById('employee-select');
  var empId=sel.value;
  if(!empId){toast('Select an employee','error');return;}
  var emp=S.employees.find(function(e){return e.id===empId;});
  if(!emp){toast('Employee not found','error');return;}

  // If employee has a PIN, prompt for it
  if(emp.pin){
    showEmployeePinPrompt(emp);
    return;
  }
  doLoginEmployee(emp);
}

function showEmployeePinPrompt(emp){
  var existing=document.getElementById('emp-pin-overlay');
  if(existing)existing.remove();

  var overlay=document.createElement('div');
  overlay.id='emp-pin-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px';
  overlay.innerHTML=
    '<div class="card w-full fade-in" style="max-width:340px;border-color:rgba(59,130,246,0.3)">'+
      '<div class="text-center mb-6">'+
        av(emp.name,emp.color||'#3b82f6',52)+
        '<p class="text-white font-bold text-lg mt-3" style="font-family:\'Syne\',sans-serif">'+esc(emp.name)+'</p>'+
        '<p class="text-slate-400 text-sm mt-1">Enter your PIN to continue</p>'+
      '</div>'+
      '<div class="relative mb-4">'+
        '<input id="emp-pin-input" type="password" class="input text-center text-2xl tracking-[0.5em]" '+
          'placeholder="••••" maxlength="8" '+
          'onkeydown="if(event.key===\'Enter\')verifyEmployeePin(\''+emp.id+'\')">'+
      '</div>'+
      '<div class="flex gap-2">'+
        '<button class="btn btn-primary flex-1" onclick="verifyEmployeePin(\''+emp.id+'\')">'+
          '<i data-lucide="log-in" class="w-4 h-4"></i> Login'+
        '</button>'+
        '<button class="btn btn-ghost" onclick="document.getElementById(\'emp-pin-overlay\').remove()">Cancel</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  lucide.createIcons();
  setTimeout(function(){var i=document.getElementById('emp-pin-input');if(i)i.focus();},80);
}

async function verifyEmployeePin(empId){
  var pinInput=document.getElementById('emp-pin-input');
  if(!pinInput)return;
  var entered=pinInput.value.trim();
  if(!entered){toast('Enter your PIN','error');return;}
  var emp=S.employees.find(function(e){return e.id===empId;});
  if(!emp){toast('Employee not found','error');return;}
  if(entered!==String(emp.pin)){
    toast('Wrong PIN — try again','error');
    pinInput.value='';
    pinInput.focus();
    return;
  }
  var overlay=document.getElementById('emp-pin-overlay');
  if(overlay)overlay.remove();
  doLoginEmployee(emp);
}

function doLoginEmployee(emp){
  S.role='employee'; S.employee=emp;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('mobile-menu-btn').style.display='';
  fetchAll().then(function(){
    setupRealtime();
    buildSidebar();
    navigateTo('my-clients');
  }).catch(function(e){toast('Error loading data: '+e.message,'error');logout();});
}

function logout(){
  teardownRealtime();
  var empIdToDeactivate=(S.role==='employee'&&S.employee)?S.employee.id:null;

  S={role:null,employee:null,currentPage:'',employees:[],campaigns:[],clients:[],
     questions:[],notifications:[],contactHistory:[],darkMode:S.darkMode};
  notifFilter='all';
  qClientSearch=''; qSelectedClient=null; qSelectedCampaign='';
  U={campaignId:'',rows:[],preview:null,uploadTab:'paste',colConfig:null};
  T={showForm:false,editId:null,name:'',email:'',phone:'',pin:''};
  showCampForm=false; selectedCampId=null; expandedClientId=null; qSent=false;
  qaFilter={employee:'',campaign:'',status:''};
  rptFilter={campaign:'',employee:'',status:'',dateFrom:'',dateTo:'',page:0};
  empClientFilter=''; clientSearch=''; clientPage=0;

  sessionStorage.removeItem('admin_session');

  document.getElementById('app-shell').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('mobile-menu-btn').style.display='none';
  var tb=document.getElementById('mobile-topbar-title');
  if(tb)tb.style.display='none';
  closeMobileSidebar();

  function reloadDropdown(){
    sb.from('employees').select('id,name,is_active,color,pin').order('name')
      .then(function(res){S.employees=res.data||[];loadEmpDropdown();lucide.createIcons();})
      .catch(function(){loadEmpDropdown();lucide.createIcons();});
  }

  if(empIdToDeactivate){
    sb.from('employees').update({is_active:false}).eq('id',empIdToDeactivate)
      .then(reloadDropdown).catch(reloadDropdown);
  } else {
    reloadDropdown();
  }
}

function loadEmpDropdown(){
  var select=document.getElementById('employee-select');
  if(!select)return;
  if(S.employees&&S.employees.length>0){
    select.innerHTML='<option value="">Select Employee...</option>'+
      S.employees.map(function(e){
        var lockIcon=e.pin?' 🔒':'';
        return'<option value="'+e.id+'">'+esc(e.name)+lockIcon+'</option>';
      }).join('');
  } else {
    select.innerHTML='<option value="">Loading employees...</option>';
  }
}

function initializeEmployeeList(){
  sb.from('employees').select('id,name,is_active,color,pin').order('name')
    .then(function(res){S.employees=res.data||[];loadEmpDropdown();lucide.createIcons();})
    .catch(function(e){
      console.error('Error loading employees:',e);
      toast('Error loading employees. Please refresh.','error');
      setTimeout(initializeEmployeeList,3000);
    });
}
