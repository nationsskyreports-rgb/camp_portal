// ============================================================
// PAGE TEAM
// ============================================================
// ── TEAM ──
function renderTeam(){
  var m=document.getElementById('main-content');
  var activeList=activeEmps();var inactiveList=S.employees.filter(function(e){return!e.is_active;});
  m.innerHTML=hdr('Team Management',S.employees.length+' total employees','<button class="btn btn-primary" onclick="T={showForm:true,editId:null,name:\'\',email:\'\',phone:\'\'};renderTeam()"><i data-lucide="plus" class="w-4 h-4"></i> Add Employee</button>')+
  (T.showForm?'<div class="card mb-6 fade-in border-blue-500/20"><h3 class="text-sm font-bold text-white mb-4">'+(T.editId?'Edit':'Add')+' Employee</h3>'+
  '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Name *</label><input id="tn" class="input" value="'+esc(T.name)+'" placeholder="Full name"></div>'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Email *</label><input id="te" class="input" value="'+esc(T.email)+'" placeholder="Email"></div>'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Phone</label><input id="tp" class="input" value="'+esc(T.phone)+'" placeholder="Phone"></div>'+
  '</div><div class="flex gap-2 mt-4"><button class="btn btn-primary" onclick="saveEmployee()">'+(T.editId?'Update':'Add')+'</button><button class="btn btn-ghost" onclick="T={showForm:false,editId:null,name:\'\',email:\'\',phone:\'\'};renderTeam()">Cancel</button></div></div>':'')+
  '<div class="card mb-6 fade-in"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Active Agents</h3><span class="badge badge-active">'+activeList.length+'</span></div>'+
  (activeList.length?'<div class="space-y-2">'+activeList.map(function(e){var cc=S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length;
    return'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:10px;background:rgba(255,255,255,0.02);margin-bottom:4px;gap:8px">'+
    '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">'+av(e.name,e.color||'#3b82f6',36)+
    '<div style="min-width:0"><p style="font-size:14px;font-weight:600;color:#fff">'+esc(e.name)+'</p><p style="font-size:11px;color:#64748b">'+esc(e.email)+'</p><p style="font-size:11px;color:#94a3b8;margin-top:1px">'+cc+' clients</p></div></div>'+
    '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
    '<button class="btn btn-sm" style="background:rgba(100,116,139,0.12);color:#64748b;border:1px solid rgba(100,116,139,0.2);padding:5px 10px;font-size:12px" onclick="adminSetActive(\''+e.id+'\',false)"><i data-lucide="power" class="w-3 h-3"></i> Off</button>'+
    '<button class="btn btn-ghost btn-sm" style="padding:5px 8px" onclick="editEmployee(\''+e.id+'\')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>'+
    '<button class="btn btn-danger btn-sm" style="padding:5px 8px" onclick="deleteEmployee(\''+e.id+'\',\''+esc(e.name).replace(/'/g,'')+'\')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>'+
    '</div></div>';}).join('')+'</div>':'<p class="text-slate-500 text-sm text-center py-4">No active agents</p>')+'</div>'+
  '<div class="card fade-in"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Inactive Agents</h3><span class="badge badge-ended">'+inactiveList.length+'</span></div>'+
  (inactiveList.length?'<div class="space-y-2">'+inactiveList.map(function(e){
    return'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:10px;background:rgba(255,255,255,0.015);margin-bottom:4px;gap:8px">'+
    '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">'+av(e.name,e.color||'#475569',36)+
    '<div style="min-width:0"><p style="font-size:14px;color:#94a3b8">'+esc(e.name)+'</p><p style="font-size:11px;color:#475569">'+esc(e.email)+'</p></div></div>'+
    '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
    '<button class="btn btn-success btn-sm" style="padding:5px 10px;font-size:12px" onclick="adminSetActive(\''+e.id+'\',true)"><i data-lucide="power" class="w-3 h-3"></i> On</button>'+
    '<button class="btn btn-ghost btn-sm" style="padding:5px 8px" onclick="editEmployee(\''+e.id+'\')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>'+
    '<button class="btn btn-danger btn-sm" style="padding:5px 8px" onclick="deleteEmployee(\''+e.id+'\',\''+esc(e.name).replace(/'/g,'')+'\')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>'+
    '</div></div>';}).join('')+'</div>':'<p class="text-slate-500 text-sm text-center py-4">Everyone is active!</p>')+'</div>';
  lucide.createIcons();
}
async function adminSetActive(eid,val){
  try{
    var res=await sb.from('employees').update({is_active:val}).eq('id',eid);
    if(res.error)throw res.error;

    var emp=empById(eid);
    var empName=emp?emp.name:'Employee';

    // Notify the employee
    await notifyEmployee(
      eid,
      'employee_active',
      val ? 'You have been set as Active by admin' : 'You have been set as Inactive by admin'
    );

    toast(val?'Activated':'Deactivated','success');
    fetchAll().then(function(){
      renderTeam();
      if(S.currentPage==='dashboard')renderDashboard();
    });
  }catch(e){
    toast(e.message,'error');
  }
}
function editEmployee(id){var e=empById(id);if(!e)return;T={showForm:true,editId:id,name:e.name,email:e.email,phone:e.phone||''};renderTeam();}
function saveEmployee(){
  var n=document.getElementById('tn').value.trim();var em=document.getElementById('te').value.trim();var ph=document.getElementById('tp').value.trim();
  if(!n||!em){toast('Name and email required','error');return;}
  if(T.editId){sb.from('employees').update({name:n,email:em,phone:ph}).eq('id',T.editId).then(function(){toast('Updated');T={showForm:false,editId:null,name:'',email:'',phone:''};fetchAll().then(renderTeam);}).catch(function(e){toast(e.message,'error');});}
  else{sb.from('employees').insert({name:n,email:em,phone:ph,is_active:false,color:COLORS[S.employees.length%COLORS.length]}).then(function(){toast('Employee added');T={showForm:false,editId:null,name:'',email:'',phone:''};fetchAll().then(renderTeam);}).catch(function(e){toast(e.message,'error');});}
}
function deleteEmployee(id,name){showConfirm('Delete Employee','Delete "'+name+'"? This cannot be undone.',function(){sb.from('employees').delete().eq('id',id).then(function(){toast('Deleted');fetchAll().then(renderTeam);}).catch(function(e){toast(e.message,'error');});},'Delete','btn-danger');}
