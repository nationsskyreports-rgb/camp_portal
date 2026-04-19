// ============================================================
// PAGE CLIENTS
// ============================================================
// ── MY CLIENTS ──
function renderMyClients(){
  var m=document.getElementById('main-content');var cls=myClients();
  if(empClientFilter)cls=cls.filter(function(c){return c.campaign_id===empClientFilter;});
  var campOpts='<option value="">All Campaigns</option>';var seen={};
  myClients().forEach(function(c){if(!seen[c.campaign_id]){seen[c.campaign_id]=true;var cp=campById(c.campaign_id);if(cp)campOpts+='<option value="'+c.campaign_id+'" '+(empClientFilter===c.campaign_id?'selected':'')+'>'+esc(cp.name)+'</option>';}});
  m.innerHTML=hdr(S.role==='admin'?'All Clients':'My Clients',cls.length+' clients')+
  '<div class="mb-6 fade-in"><select class="input max-w-xs" onchange="empClientFilter=this.value||\'\';renderMyClients()">'+campOpts+'</select></div>'+
  '<div class="space-y-3 fade-in">'+(cls.length?cls.map(function(c){
    var isExp=expandedClientId===c.id;var hist=clientHistory(c.id);var extra=c.extra_data||{};var camp=campById(c.campaign_id);
    var visCols=camp?getVisibleCols(camp.id):DEFAULT_COLUMNS.filter(function(x){return x.visible;});
    // Get best display name
    var displayName = (function(){
      if(c.name && c.name.trim() && c.name.trim()!=='"') return c.name.trim();
      var nameKeys=['contract_id','customer_name','client_name','full_name'];
      for(var ni=0;ni<nameKeys.length;ni++){
        var v=extra[nameKeys[ni]];
        if(v&&v.toString().trim()&&v.toString().trim()!=='"') return v.toString().trim();
      }
      var vals=Object.values(extra);
      for(var vi=0;vi<vals.length;vi++){
        var vv=(vals[vi]||'').toString().trim();
        if(vv&&vv!=='"'&&isNaN(vv)&&vv.length>2) return vv;
      }
      return 'Client';
    })();
    var subInfo=visCols.slice(1,3).map(function(col){return extra[col.key]||c[col.key]||'';}).filter(Boolean).join(' · ');
    return'<div class="card client-card '+(isExp?'border-blue-500/30':'')+'">'+
    '<div class="flex items-center justify-between" onclick="expandedClientId='+(isExp?'null':'\''+c.id+'\'')+';renderMyClients()">'+
    '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><i data-lucide="user" class="w-5 h-5"></i></div>'+
    '<div><p class="font-semibold text-white">'+esc(displayName)+'</p><p class="text-xs text-slate-500">'+esc(subInfo)+'</p></div></div>'+
    '<div class="flex items-center gap-3">'+sBadge(c.status)+'<i data-lucide="'+(isExp?'chevron-up':'chevron-down')+'" class="w-4 h-4 text-slate-400"></i></div></div>'+
    (isExp?'<div class="mt-4 pt-4 border-t border-white/5 space-y-4">'+
    '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">'+
    visCols.map(function(col){return'<div><p class="text-xs text-slate-500 mb-1">'+esc(col.label)+'</p><p class="text-sm text-white">'+esc(extra[col.key]||c[col.key]||'-')+'</p></div>';}).join('')+
    (S.role==='admin'?'<div><p class="text-xs text-slate-500 mb-1">Assigned To</p><p class="text-sm text-white">'+esc((empById(c.assigned_employee_id)||{}).name||'Unassigned')+'</p></div>':'')+
    '<div><p class="text-xs text-slate-500 mb-1">Status</p>'+
    '<select id="status-'+c.id+'" class="input text-sm" onclick="event.stopPropagation()">'+
    ['New','Contacted','Interested','Closed'].map(function(s){return'<option value="'+s+'" '+(c.status===s?'selected':'')+'>'+s+'</option>';}).join('')+
    '</select></div></div>'+
    '<div><p class="text-xs text-slate-500 mb-2 font-medium">History ('+hist.length+')</p>'+
    (hist.length?'<div class="space-y-2 max-h-48 overflow-y-auto">'+hist.map(function(h){return'<div class="p-2 rounded-lg bg-white/[0.02] text-xs"><span class="text-slate-500">'+fmtDT(h.created_at)+'</span><p class="text-slate-300 mt-1">'+esc(h.note)+'</p></div>';}).join('')+'</div>':'<p class="text-slate-500 text-xs">No notes yet</p>')+'</div>'+
    '<div class="flex gap-2" onclick="event.stopPropagation()">'+
    '<textarea id="note-'+c.id+'" class="input flex-1" placeholder="Add a note..." rows="2"></textarea>'+
    '<button class="btn btn-primary self-end" onclick="saveClient(\''+c.id+'\')"><i data-lucide="save" class="w-4 h-4"></i> Save</button></div></div>':'')+
    '</div>';
  }).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No clients assigned</p></div>')+'</div>';
  lucide.createIcons();
}
async function saveClient(cid){
  var statusEl=document.getElementById('status-'+cid);
  var noteEl=document.getElementById('note-'+cid);
  var newStatus=statusEl?statusEl.value:null;
  var note=noteEl?noteEl.value.trim():'';

  if(!newStatus&&!note){toast('Nothing to save','info');return;}

  try{
    // 1. Update status
    if(newStatus){
      var res=await sb.from('clients').update({status:newStatus}).eq('id',cid);
      if(res.error)throw res.error;

      // Get client info for notification
      var c=S.clients.find(function(x){return x.id===cid;});
      if(c){
        var clientName=getClientDisplayName(c);
        var emp=empById(c.assigned_employee_id);

        // Notify admin if employee changed status
        if(S.role==='employee'){
          await notifyAdmin(
            'status_changed',
            S.employee.name+' changed "'+clientName+'" status to '+newStatus
          );
        }

        // Notify assigned employee if admin changed status
        if(S.role==='admin'&&c.assigned_employee_id){
          await notifyEmployee(
            c.assigned_employee_id,
            'status_changed',
            'Admin changed "'+clientName+'" status to '+newStatus
          );
        }
      }
    }

    // 2. Save note
    if(note){
      var r2=await sb.from('contact_history').insert({client_id:cid,note:note});
      if(r2.error)throw r2.error;
    }

    toast('Saved!','success');
    fetchAll().then(renderMyClients);
  }catch(e){
    toast(e.message,'error');
  }
}
