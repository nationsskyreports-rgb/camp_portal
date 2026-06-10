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
    '<div class="card fade-in"><div class="flex items-center justify-between mb-4">'+
    '<h3 class="text-sm font-bold text-white">Clients ('+cc.length+')</h3>'+
    (cc.filter(function(c){return !c.assigned_employee_id;}).length?
      '<button class="btn btn-primary btn-sm" onclick="distributeCampUnassigned(\''+vc.id+'\')">'+
      '<i data-lucide="shuffle" class="w-4 h-4"></i> Distribute Unassigned ('+
      cc.filter(function(c){return !c.assigned_employee_id;}).length+')</button>':'')+
    '</div>'+
    (cc.length?(function(){
      // Collect all extra_data keys, skip base fields already shown as columns
      var SKIP_EX = ['name','phone','phone2','email'];
      var extraKeysMap = {};
      cc.forEach(function(c){
        var ex = c.extra_data||{};
        Object.keys(ex).forEach(function(k){ if(SKIP_EX.indexOf(k)===-1) extraKeysMap[k]=true; });
      });
      var extraKeys = Object.keys(extraKeysMap);
      // Friendly labels
      var KEY_LABELS = { project:'Project', unit:'Unit No.', property_type:'Type', payment_term:'Payment', notes:'Notes' };
      function colLabel(k){ return KEY_LABELS[k]||(k.charAt(0).toUpperCase()+k.slice(1).replace(/_/g,' ')); }
      var th = 'pb-3 pr-4 whitespace-nowrap';
      var td = 'py-3 pr-4 text-slate-300';
      return '<div class="tbl-wrap"><table class="w-full text-sm">'+
        '<thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
        '<th class="'+th+'">Client Name</th>'+
        '<th class="'+th+'">Mobile</th>'+
        '<th class="'+th+'">Mobile 2</th>'+
        '<th class="'+th+'">Email</th>'+
        extraKeys.map(function(k){ return '<th class="'+th+'">'+esc(colLabel(k))+'</th>'; }).join('')+
        '<th class="'+th+'">Assigned To</th>'+
        '<th class="'+th+'">Status</th>'+
        '</tr></thead><tbody>'+
        cc.map(function(c){
          var e=empById(c.assigned_employee_id); var extra=c.extra_data||{};
          return '<tr class="table-row border-b border-white/[0.03]">'+
            '<td class="'+td+'">'+esc(c.name||extra.name||'-')+'</td>'+
            '<td class="'+td+'">'+esc(c.phone||extra.phone||'-')+'</td>'+
            '<td class="'+td+'">'+esc(extra.phone2||'-')+'</td>'+
            '<td class="'+td+'">'+esc(extra.email||'-')+'</td>'+
            extraKeys.map(function(k){
              var v=extra[k]||'-';
              return '<td class="'+td+'" style="max-width:180px"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px" title="'+esc(v)+'">'+esc(v)+'</span></td>';
            }).join('')+
            '<td class="py-3 pr-4">'+(e?av(e.name,e.color||'#3b82f6',22)+'<span class="text-xs text-slate-300 ml-1">'+esc(e.name)+'</span>':'<span class="text-slate-500 text-xs">Unassigned</span>')+'</td>'+
            '<td class="py-3">'+sBadge(c.status)+'</td>'+
            '</tr>';
        }).join('')+
        '</tbody></table></div>';
    })():'<p class="text-slate-500 text-sm">No clients</p>')+'</div>';
    lucide.createIcons();return;
  }
  m.innerHTML=hdr('Campaigns','Manage campaigns','<button class="btn btn-primary" onclick="showCampForm=!showCampForm;renderCampaigns()"><i data-lucide="plus" class="w-4 h-4"></i> New</button>')+
  (showCampForm?'<div class="card mb-6 fade-in border-blue-500/20"><h3 class="text-sm font-bold text-white mb-4">Create Campaign</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="text-xs text-slate-400 mb-1 block">Name *</label><input id="cn" class="input" placeholder="Campaign name"></div><div><label class="text-xs text-slate-400 mb-1 block">Type</label><input id="ct" class="input" placeholder="e.g. Sales, Leads..."></div><div><label class="text-xs text-slate-400 mb-1 block">Start Date</label><input id="cs" type="date" class="input"></div><div><label class="text-xs text-slate-400 mb-1 block">End Date</label><input id="ce" type="date" class="input"></div></div><div class="flex gap-2 mt-4"><button class="btn btn-primary" onclick="createCamp()">Create</button><button class="btn btn-ghost" onclick="showCampForm=false;renderCampaigns()">Cancel</button></div></div>':'')+
  '<div class="space-y-3 fade-in">'+(S.campaigns.length?S.campaigns.map(function(c){var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;}).length;return'<div class="card card-hover cursor-pointer" onclick="selectedCampId=\''+c.id+'\';renderCampaigns()"><div class="flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><i data-lucide="target" class="w-5 h-5"></i></div><div><p class="font-semibold text-white">'+esc(c.name)+'</p><p class="text-xs text-slate-500">'+esc(c.type)+'</p></div></div><div class="flex items-center gap-4"><span class="text-sm text-slate-400">'+cc+' clients</span>'+sBadge(c.status)+copyFormLinkBtn(c.id)+'</div></div></div>';}).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No campaigns yet</p></div>')+'</div>';
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
function copyFormLinkBtn(campaignId) {
  return '<button ' +
    'class="btn btn-ghost btn-sm" ' +
    'style="padding:4px 10px;font-size:11px;display:flex;align-items:center;gap:4px" ' +
    'title="Copy client intake form link" ' +
    'onclick="copyIntakeLink(\'' + campaignId + '\');event.stopPropagation()">' +
    '<i data-lucide="link" class="w-3.5 h-3.5"></i> Form Link' +
    '</button>';
}

function copyIntakeLink(campaignId) {
  var base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  var url  = base + 'intake.html?c=' + campaignId;
  navigator.clipboard.writeText(url).then(function() {
    toast('Form link copied!', 'success');
  }).catch(function() {
    var inp = document.createElement('input');
    inp.value = url;
    document.body.appendChild(inp);
    inp.select();
    document.execCommand('copy');
    document.body.removeChild(inp);
    toast('Link copied: ' + url, 'success');
  });
}

// ── DISTRIBUTE UNASSIGNED CLIENTS ──
function distributeCampUnassigned(campId) {
  var actEmps = activeEmps();
  if (!actEmps.length) { toast('No active employees', 'error'); return; }

  var unassigned = S.clients.filter(function(c) {
    return c.campaign_id === campId && !c.assigned_employee_id;
  });
  if (!unassigned.length) { toast('No unassigned clients', 'error'); return; }

  // Round-robin distribution
  var updates = unassigned.map(function(c, i) {
    return { id: c.id, employee: actEmps[i % actEmps.length] };
  });

  // Build summary per employee
  var summary = {};
  actEmps.forEach(function(e) { summary[e.id] = { emp: e, count: 0 }; });
  updates.forEach(function(u) { summary[u.employee.id].count++; });
  var summaryRows = Object.values(summary).filter(function(s){ return s.count > 0; });

  // Build modal
  var rows = summaryRows.map(function(s) {
    var pct = Math.round((s.count / unassigned.length) * 100);
    return '<div class="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">' +
      av(s.emp.name, s.emp.color || '#3b82f6', 28) +
      '<div class="flex-1 min-w-0">' +
        '<p class="text-sm text-white font-medium">' + esc(s.emp.name) + '</p>' +
        '<div class="w-full h-1.5 bg-white/5 rounded-full mt-1 overflow-hidden">' +
          '<div class="h-full rounded-full bg-blue-500/70" style="width:' + pct + '%"></div>' +
        '</div>' +
      '</div>' +
      '<span class="text-sm font-bold text-white ml-2">' + s.count + '</span>' +
    '</div>';
  }).join('');

  var modal = document.createElement('div');
  modal.id = 'dist-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px)';
  modal.innerHTML =
    '<div style="background:var(--card-bg,#0d1628);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;width:100%;max-width:420px;box-shadow:0 24px 48px rgba(0,0,0,0.5)">' +
      '<div class="flex items-center gap-3 mb-4">' +
        '<div style="width:36px;height:36px;border-radius:10px;background:rgba(59,130,246,0.15);display:flex;align-items:center;justify-content:center">' +
          '<i data-lucide="shuffle" style="width:18px;height:18px;color:#3b82f6"></i>' +
        '</div>' +
        '<div>' +
          '<p class="font-semibold text-white text-sm">Distribute Unassigned Clients</p>' +
          '<p class="text-xs text-slate-400">' + unassigned.length + ' client(s) → ' + actEmps.length + ' active agent(s)</p>' +
        '</div>' +
      '</div>' +
      '<div class="mb-5">' + rows + '</div>' +
      '<div class="flex gap-2 justify-end">' +
        '<button onclick="document.getElementById(\'dist-modal\').remove()" class="btn btn-ghost">Cancel</button>' +
        '<button onclick="confirmCampDistribute(\'' + campId + '\')" class="btn btn-primary"><i data-lucide="check" class="w-4 h-4"></i> Confirm</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);
  lucide.createIcons();

  // Store updates for confirm step
  window._pendingDistribute = { campId: campId, updates: updates };
}

function confirmCampDistribute(campId) {
  var pending = window._pendingDistribute;
  if (!pending || pending.campId !== campId) return;
  var updates  = pending.updates;
  var campName = (campById(campId) || {}).name || 'Campaign';

  document.getElementById('dist-modal').remove();
  window._pendingDistribute = null;

  var promises = updates.map(function(u) {
    return sb.from('clients').update({ assigned_employee_id: u.employee.id }).eq('id', u.id);
  });

  Promise.all(promises)
    .then(function() {
      var notifMap = {};
      updates.forEach(function(u) { notifMap[u.employee.id] = (notifMap[u.employee.id] || 0) + 1; });
      var notifPromises = Object.keys(notifMap).map(function(eid) {
        return notifyEmployee(eid, 'new_clients',
          'You have ' + notifMap[eid] + ' new client(s) assigned in ' + campName);
      });
      return Promise.all(notifPromises).catch(function(){});
    })
    .then(function() {
      toast(updates.length + ' clients distributed successfully', 'success');
      fetchAll().then(renderCampaigns);
    })
    .catch(function(e) { toast(e.message, 'error'); });
}
