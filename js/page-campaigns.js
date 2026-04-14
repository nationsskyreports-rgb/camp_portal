// ============================================================
// PAGE CAMPAIGNS
// ============================================================
// ── CAMPAIGNS ──
function renderCampaigns(){
  var m=document.getElementById('main-content');
  if(selectedCampId){
    var vc=campById(selectedCampId);if(!vc){selectedCampId=null;renderCampaigns();return;}
    var cc=S.clients.filter(function(c){return c.campaign_id===vc.id;});
    var sBtns='';['Active','Paused','Ended'].forEach(function(s){sBtns+='<button class="btn btn-sm '+(vc.status===s?'btn-primary':'btn-ghost')+'" onclick="changeCampStatus(\''+vc.id+'\',\''+s+'\')">'+s+'</button>';});
    var visCols=getVisibleCols(vc.id);
    m.innerHTML=hdr(esc(vc.name),esc(vc.type),
      '<button class="btn btn-ghost" onclick="selectedCampId=null;renderCampaigns()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="openColConfig(\''+vc.id+'\')"><i data-lucide="settings-2" class="w-4 h-4"></i> Columns</button>'+
      sBadge(vc.status))+
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 fade-in">'+
    '<div class="card text-center"><p class="text-slate-400 text-xs mb-1">Total</p><p class="text-2xl font-bold text-white">'+cc.length+'</p></div>'+
    '<div class="card text-center"><p class="text-slate-400 text-xs mb-1">Contacted</p><p class="text-2xl font-bold text-violet-400">'+cc.filter(function(c){return c.status==='Contacted';}).length+'</p></div>'+
    '<div class="card text-center"><p class="text-slate-400 text-xs mb-1">Closed</p><p class="text-2xl font-bold text-emerald-400">'+cc.filter(function(c){return c.status==='Closed';}).length+'</p></div></div>'+
    '<div class="card mb-6 fade-in"><div class="flex items-center gap-3"><span class="text-sm text-slate-400">Status:</span>'+sBtns+'</div></div>'+
    '<div class="card fade-in"><h3 class="text-sm font-bold text-white mb-4">Clients ('+cc.length+')</h3>'+
    (cc.length?'<div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
    visCols.map(function(c){return'<th class="pb-3 pr-4">'+esc(c.label)+'</th>';}).join('')+
    '<th class="pb-3 pr-4">Assigned To</th><th class="pb-3">Status</th></tr></thead><tbody>'+
    cc.map(function(c){var e=empById(c.assigned_employee_id);var extra=c.extra_data||{};
      return'<tr class="table-row border-b border-white/[0.03]">'+
      visCols.map(function(col){return'<td class="py-3 pr-4 text-slate-300">'+esc(extra[col.key]||c[col.key]||'-')+'</td>';}).join('')+
      '<td class="py-3 pr-4">'+(e?av(e.name,e.color||'#3b82f6',22)+'<span class="text-xs text-slate-300 ml-1">'+esc(e.name)+'</span>':'<span class="text-slate-500 text-xs">Unassigned</span>')+'</td>'+
      '<td class="py-3">'+sBadge(c.status)+'</td></tr>';
    }).join('')+'</tbody></table></div>':'<p class="text-slate-500 text-sm">No clients</p>')+'</div>';
    lucide.createIcons();return;
  }
  m.innerHTML=hdr('Campaigns','Manage campaigns','<button class="btn btn-primary" onclick="showCampForm=!showCampForm;renderCampaigns()"><i data-lucide="plus" class="w-4 h-4"></i> New</button>')+
  (showCampForm?'<div class="card mb-6 fade-in border-blue-500/20"><h3 class="text-sm font-bold text-white mb-4">Create Campaign</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="text-xs text-slate-400 mb-1 block">Name *</label><input id="cn" class="input" placeholder="Campaign name"></div><div><label class="text-xs text-slate-400 mb-1 block">Type</label><input id="ct" class="input" placeholder="e.g. Sales, Leads..."></div><div><label class="text-xs text-slate-400 mb-1 block">Start Date</label><input id="cs" type="date" class="input"></div><div><label class="text-xs text-slate-400 mb-1 block">End Date</label><input id="ce" type="date" class="input"></div></div><div class="flex gap-2 mt-4"><button class="btn btn-primary" onclick="createCamp()">Create</button><button class="btn btn-ghost" onclick="showCampForm=false;renderCampaigns()">Cancel</button></div></div>':'')+
  '<div class="space-y-3 fade-in">'+(S.campaigns.length?S.campaigns.map(function(c){var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;}).length;return'<div class="card card-hover cursor-pointer" onclick="selectedCampId=\''+c.id+'\';renderCampaigns()"><div class="flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><i data-lucide="target" class="w-5 h-5"></i></div><div><p class="font-semibold text-white">'+esc(c.name)+'</p><p class="text-xs text-slate-500">'+esc(c.type)+'</p></div></div><div class="flex items-center gap-4"><span class="text-sm text-slate-400">'+cc+' clients</span>'+sBadge(c.status)+'</div></div></div>';}).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No campaigns yet</p></div>')+'</div>';
  lucide.createIcons();
}
function createCamp(){
  var n=document.getElementById('cn').value.trim();var t=document.getElementById('ct').value.trim();var s=document.getElementById('cs').value;var e=document.getElementById('ce').value;
  if(!n){toast('Name required','error');return;}
  sb.from('campaigns').insert({name:n,type:t||'General',start_date:s||null,end_date:e||null,column_config:DEFAULT_COLUMNS})
    .then(function(){toast('Campaign created');showCampForm=false;fetchAll().then(renderCampaigns);}).catch(function(e){toast(e.message,'error');});
}
function changeCampStatus(id,st){
  sb.from('campaigns').update({status:st}).eq('id',id)
    .then(function(r){if(r.error){toast(r.error.message,'error');return;}toast('Status updated');fetchAll().then(renderCampaigns);}).catch(function(e){toast(e.message,'error');});
}
