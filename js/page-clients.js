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
    var displayName=c.name||Object.values(extra)[0]||'Client';
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
    '<select class="input text-sm" onclick="event.stopPropagation()" onchange="updateClientStatus(\''+c.id+'\',this.value)">'+
    ['New','Contacted','Interested','Closed'].map(function(s){return'<option value="'+s+'" '+(c.status===s?'selected':'')+'>'+s+'</option>';}).join('')+
    '</select></div></div>'+
    '<div><p class="text-xs text-slate-500 mb-2 font-medium">History ('+hist.length+')</p>'+
    (hist.length?'<div class="space-y-2 max-h-48 overflow-y-auto">'+hist.map(function(h){return'<div class="p-2 rounded-lg bg-white/[0.02] text-xs"><span class="text-slate-500">'+fmtDT(h.created_at)+'</span><p class="text-slate-300 mt-1">'+esc(h.note)+'</p></div>';}).join('')+'</div>':'<p class="text-slate-500 text-xs">No notes yet</p>')+'</div>'+
    '<div class="flex gap-2" onclick="event.stopPropagation()">'+
    '<textarea id="note-'+c.id+'" class="input flex-1" placeholder="Add a note..." rows="2"></textarea>'+
    '<button class="btn btn-primary self-end" onclick="addNote(\''+c.id+'\')"><i data-lucide="plus" class="w-4 h-4"></i> Save</button></div></div>':'')+
    '</div>';
  }).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No clients assigned</p></div>')+'</div>';
  lucide.createIcons();
}
function saveClient(cid){
  var statusEl=document.getElementById('status-'+cid);
  var noteEl=document.getElementById('note-'+cid);
  var status=statusEl?statusEl.value:null;
  var note=noteEl?noteEl.value.trim():'';
  var promises=[];
  if(status){promises.push(sb.from('clients').update({status:status}).eq('id',cid));}
  if(note){promises.push(sb.from('contact_history').insert({client_id:cid,note:note}));}
  if(!promises.length){toast('Nothing to save','info');return;}
  Promise.all(promises)
    .then(function(){toast('Saved!','success');fetchAll().then(renderMyClients);})
    .catch(function(e){toast(e.message,'error');});
}
