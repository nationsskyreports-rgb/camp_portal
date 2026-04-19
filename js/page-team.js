// ============================================================
// PAGE TEAM — Team Management + PIN + Performance
// ============================================================
function renderTeam(){
  var m=document.getElementById('main-content');
  var activeList=activeEmps();
  var inactiveList=S.employees.filter(function(e){return!e.is_active;});

  m.innerHTML=hdr('Team Management',S.employees.length+' total employees',
    '<button class="btn btn-primary" onclick="T={showForm:true,editId:null,name:\'\',email:\'\',phone:\'\',pin:\'\'};renderTeam()">'+
      '<i data-lucide="plus" class="w-4 h-4"></i> Add Employee'+
    '</button>')+

  // ── Add/Edit Form ──
  (T.showForm?
    '<div class="card mb-6 fade-in border-blue-500/20">'+
      '<h3 class="text-sm font-bold text-white mb-4">'+(T.editId?'Edit':'Add')+' Employee</h3>'+
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'+
        '<div><label class="text-xs text-slate-400 mb-1 block">Name *</label>'+
          '<input id="tn" class="input" value="'+esc(T.name)+'" placeholder="Full name"></div>'+
        '<div><label class="text-xs text-slate-400 mb-1 block">Email *</label>'+
          '<input id="te" class="input" value="'+esc(T.email)+'" placeholder="Email"></div>'+
        '<div><label class="text-xs text-slate-400 mb-1 block">Phone</label>'+
          '<input id="tp" class="input" value="'+esc(T.phone)+'" placeholder="Phone"></div>'+
        '<div><label class="text-xs text-slate-400 mb-1 block">'+
          'PIN <span class="text-slate-600 font-normal">(optional — protects login)</span>'+
          '</label>'+
          '<input id="tpin" class="input" type="password" value="'+esc(T.pin)+'" placeholder="Set a PIN (or leave empty)">'+
        '</div>'+
      '</div>'+
      '<div class="flex gap-2 mt-4">'+
        '<button class="btn btn-primary" onclick="saveEmployee()">'+(T.editId?'Update':'Add')+'</button>'+
        '<button class="btn btn-ghost" onclick="T={showForm:false,editId:null,name:\'\',email:\'\',phone:\'\',pin:\'\'};renderTeam()">Cancel</button>'+
      '</div>'+
    '</div>':'')+''+

  // ── Active Agents ──
  '<div class="card mb-6 fade-in">'+
    '<div class="flex items-center justify-between mb-4">'+
      '<h3 class="text-sm font-bold text-white">Active Agents</h3>'+
      '<span class="badge badge-active">'+activeList.length+'</span>'+
    '</div>'+
    (activeList.length?'<div class="space-y-3">'+activeList.map(function(e){return renderEmployeeRow(e,true);}).join('')+'</div>':
      '<p class="text-slate-500 text-sm text-center py-4">No active agents</p>')+
  '</div>'+

  // ── Inactive Agents ──
  '<div class="card fade-in">'+
    '<div class="flex items-center justify-between mb-4">'+
      '<h3 class="text-sm font-bold text-white">Inactive Agents</h3>'+
      '<span class="badge badge-ended">'+inactiveList.length+'</span>'+
    '</div>'+
    (inactiveList.length?'<div class="space-y-3">'+inactiveList.map(function(e){return renderEmployeeRow(e,false);}).join('')+'</div>':
      '<p class="text-slate-500 text-sm text-center py-4">Everyone is active!</p>')+
  '</div>';

  lucide.createIcons();
}

function renderEmployeeRow(e,isActive){
  var myCls=S.clients.filter(function(c){return c.assigned_employee_id===e.id;});
  var closed=myCls.filter(function(c){return c.status==='Closed';}).length;
  var trials=myCls.reduce(function(sum,c){return sum+clientHistory(c.id).length;},0);
  var happy=myCls.filter(function(c){return getClientMood(c)==='happy';}).length;
  var unhappy=myCls.filter(function(c){return getClientMood(c)==='unhappy';}).length;
  var convRate=myCls.length?Math.round((closed/myCls.length)*100):0;

  return'<div class="p-3 rounded-xl border transition-all" style="background:rgba(255,255,255,0.02);border-color:rgba(255,255,255,0.06)">'+

    // Top row: avatar + info + action buttons
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
      '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">'+
        av(e.name,e.color||'#3b82f6',38)+
        '<div style="min-width:0">'+
          '<div class="flex items-center gap-2">'+
            '<p style="font-size:14px;font-weight:600;color:#fff">'+esc(e.name)+'</p>'+
            (e.pin?'<span class="badge" style="font-size:10px;background:rgba(59,130,246,0.1);color:#60a5fa">🔒 PIN</span>':'')+
          '</div>'+
          '<p style="font-size:11px;color:#64748b">'+esc(e.email)+'</p>'+
        '</div>'+
      '</div>'+
      '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
        (isActive?
          '<button class="btn btn-sm" style="background:rgba(100,116,139,0.12);color:#64748b;border:1px solid rgba(100,116,139,0.2);padding:5px 10px;font-size:12px" '+
            'onclick="adminSetActive(\''+e.id+'\',false)"><i data-lucide="power" class="w-3 h-3"></i> Off</button>':
          '<button class="btn btn-success btn-sm" style="padding:5px 10px;font-size:12px" '+
            'onclick="adminSetActive(\''+e.id+'\',true)"><i data-lucide="power" class="w-3 h-3"></i> On</button>')+
        '<button class="btn btn-ghost btn-sm" style="padding:5px 8px" onclick="editEmployee(\''+e.id+'\')">'+
          '<i data-lucide="pencil" class="w-3.5 h-3.5"></i>'+
        '</button>'+
        '<button class="btn btn-danger btn-sm" style="padding:5px 8px" '+
          'onclick="deleteEmployee(\''+e.id+'\',\''+esc(e.name).replace(/'/g,'')+'\')">'+
          '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>'+
        '</button>'+
      '</div>'+
    '</div>'+

    // Performance mini stats
    (myCls.length>0?
    '<div class="perf-mini-row mt-3 pt-3" style="border-top:1px solid rgba(255,255,255,0.05)">'+
      '<div class="perf-mini-stat">'+
        '<span class="perf-mini-num text-white">'+myCls.length+'</span>'+
        '<span class="perf-mini-lbl">Clients</span>'+
      '</div>'+
      '<div class="perf-mini-stat">'+
        '<span class="perf-mini-num text-slate-400">'+trials+'</span>'+
        '<span class="perf-mini-lbl">🔄 Trials</span>'+
      '</div>'+
      '<div class="perf-mini-stat">'+
        '<span class="perf-mini-num text-emerald-400">'+closed+'</span>'+
        '<span class="perf-mini-lbl">Closed</span>'+
      '</div>'+
      '<div class="perf-mini-stat">'+
        '<span class="perf-mini-num '+(convRate>=20?'text-emerald-400':convRate>=10?'text-amber-400':'text-slate-500')+'">'+convRate+'%</span>'+
        '<span class="perf-mini-lbl">Conv.</span>'+
      '</div>'+
      '<div class="perf-mini-stat">'+
        '<span class="perf-mini-num text-emerald-400">'+happy+'😊</span>'+
        '<span class="perf-mini-lbl">Happy</span>'+
      '</div>'+
      '<div class="perf-mini-stat">'+
        '<span class="perf-mini-num text-red-400">'+unhappy+'😞</span>'+
        '<span class="perf-mini-lbl">Unhappy</span>'+
      '</div>'+
    '</div>':'')+'</div>';
}

async function adminSetActive(eid,val){
  try{
    var res=await sb.from('employees').update({is_active:val}).eq('id',eid);
    if(res.error)throw res.error;
    await notifyEmployee(eid,'employee_active',
      val?'You have been set as Active by admin':'You have been set as Inactive by admin');
    toast(val?'Activated':'Deactivated','success');
    fetchAll().then(function(){
      renderTeam();
      if(S.currentPage==='dashboard') renderDashboard();
    });
  }catch(e){toast(e.message,'error');}
}

function editEmployee(id){
  var e=empById(id);if(!e)return;
  T={showForm:true,editId:id,name:e.name,email:e.email,phone:e.phone||'',pin:e.pin||''};
  renderTeam();
}

function saveEmployee(){
  var n=document.getElementById('tn').value.trim();
  var em=document.getElementById('te').value.trim();
  var ph=document.getElementById('tp').value.trim();
  var pin=document.getElementById('tpin').value.trim();
  if(!n||!em){toast('Name and email required','error');return;}

  // Validate PIN: must be numeric or empty
  if(pin&&!/^\d{4,8}$/.test(pin)){toast('PIN must be 4–8 digits','error');return;}

  var payload={name:n,email:em,phone:ph||null};
  // Only update pin if field was touched (non-empty = set; empty = clear)
  if(T.editId){
    // On edit: if pin field is empty, keep existing; if set, update; if explicitly cleared, set null
    // We'll always save whatever is in the field (empty = clear PIN)
    payload.pin=pin||null;
  } else {
    payload.pin=pin||null;
  }

  if(T.editId){
    sb.from('employees').update(payload).eq('id',T.editId)
      .then(function(){
        toast('Employee updated');
        T={showForm:false,editId:null,name:'',email:'',phone:'',pin:''};
        fetchAll().then(renderTeam);
      }).catch(function(e){toast(e.message,'error');});
  } else {
    sb.from('employees').insert(Object.assign({is_active:false,color:COLORS[S.employees.length%COLORS.length]},payload))
      .then(function(){
        toast('Employee added');
        T={showForm:false,editId:null,name:'',email:'',phone:'',pin:''};
        fetchAll().then(renderTeam);
      }).catch(function(e){toast(e.message,'error');});
  }
}

function deleteEmployee(id,name){
  showConfirm('Delete Employee','Delete "'+name+'"? This cannot be undone.',function(){
    sb.from('employees').delete().eq('id',id)
      .then(function(){toast('Deleted');fetchAll().then(renderTeam);})
      .catch(function(e){toast(e.message,'error');});
  },'Delete','btn-danger');
}
