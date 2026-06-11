// ============================================================
// FOLLOW-UP REMINDERS — Agent & Admin views
// Uses the `reminders` table exclusively
// ============================================================

var fuFilter = { employee:'', campaign:'', status:'' }; // admin filters
var fuSearch = '';

function setFuSearch(v){ fuSearch=v; renderFollowupReminders(); restoreSearchFocus('fu-search'); }

// ── Helpers ───────────────────────────────────────────────────
function fuClientReminders(clientId){
  return (S.reminders||[]).filter(function(r){ return r.client_id === clientId; });
}

function fuMyReminders(){
  if(S.role === 'admin') return S.reminders||[];
  return (S.reminders||[]).filter(function(r){ return r.employee_id === S.employee.id; });
}

// ── OPEN Follow-up modal from client card ─────────────────────
function openFollowupModal(clientId, ev){
  if(ev) ev.stopPropagation();
  var c = clientById(clientId);
  if(!c) return;

  var existing = fuClientReminders(clientId).filter(function(r){ return !r.done; });

  var old = document.getElementById('fu-modal');
  if(old) old.remove();

  // default: tomorrow 10am
  var def = new Date(); def.setDate(def.getDate()+1); def.setHours(10,0,0,0);
  var defVal = def.toISOString().slice(0,16);

  var existingHtml = '';
  if(existing.length){
    existingHtml = '<div style="margin-bottom:1rem">' +
      '<p style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Current follow-ups</p>' +
      existing.map(function(r){
        var dt = new Date(r.remind_at);
        var isOverdue = dt < new Date();
        var dtStr = dt.toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;background:rgba(255,255,255,.04);margin-bottom:6px;border:1px solid rgba(255,255,255,.06)">'+
          '<i data-lucide="'+(isOverdue?'alert-circle':'alarm-clock')+'" style="width:14px;height:14px;color:'+(isOverdue?'#f87171':'#fbbf24')+';flex-shrink:0"></i>'+
          '<div style="flex:1;min-width:0">'+
            '<p style="font-size:12px;color:#e2e8f0;font-weight:500">'+dtStr+(isOverdue?'<span style="color:#f87171;margin-right:6px;font-size:10px"> overdue</span>':'')+'</p>'+
            (r.note?'<p style="font-size:11px;color:#94a3b8">'+esc(r.note)+'</p>':'')+
          '</div>'+
          '<button onclick="markFuDone(\''+r.id+'\',\''+clientId+'\')" '+
            'style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);color:#6ee7b7;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;flex-shrink:0" '+
            'title="Mark done"><i data-lucide="check" style="width:11px;height:11px"></i></button>'+
        '</div>';
      }).join('')+
    '</div>';
  }

  var overlay = document.createElement('div');
  overlay.id = 'fu-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem';
  overlay.onclick = function(e){ if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML =
    '<div style="background:#0d1628;border:1px solid rgba(59,130,246,.15);border-radius:16px;max-width:440px;width:100%;padding:1.5rem;max-height:85vh;overflow-y:auto" onclick="event.stopPropagation()">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">'+
        '<div>'+
          '<h3 style="font-size:15px;font-weight:700;color:#fff">Follow-up</h3>'+
          '<p style="font-size:12px;color:#64748b;margin-top:2px">'+esc(c.name||'')+'</p>'+
        '</div>'+
        '<button onclick="document.getElementById(\'fu-modal\').remove()" style="background:none;border:none;color:#64748b;cursor:pointer;font-size:20px;line-height:1;padding:4px">×</button>'+
      '</div>'+
      existingHtml+
      '<p style="font-size:11px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">Set new follow-up</p>'+
      '<label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px">Date & Time *</label>'+
      '<input type="datetime-local" id="fu-when" class="input" value="'+defVal+'" style="margin-bottom:12px">'+
      '<label style="font-size:12px;color:#94a3b8;display:block;margin-bottom:4px">Note</label>'+
      '<input type="text" id="fu-note" class="input" placeholder="e.g. Ask about payment confirmation" style="margin-bottom:16px">'+
      '<div style="display:flex;gap:8px">'+
        '<button class="btn btn-primary flex-1" onclick="saveFuReminder(\''+clientId+'\')">'+
          '<i data-lucide="alarm-clock" class="w-4 h-4"></i> Set Follow-up</button>'+
        '<button class="btn btn-ghost" onclick="document.getElementById(\'fu-modal\').remove()">Cancel</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(overlay);
  lucide.createIcons();
}

function saveFuReminder(clientId){
  var when = document.getElementById('fu-when').value;
  var note = (document.getElementById('fu-note').value||'').trim();
  if(!when){ toast('Pick a date & time','error'); return; }

  var empId = S.role==='employee' ? S.employee.id : null;
  // If admin is setting it, assign to client's agent
  if(!empId){
    var c = clientById(clientId);
    empId = c ? c.assigned_employee_id : null;
  }

  sb.from('reminders').insert({
    client_id   : clientId,
    employee_id : empId,
    remind_at   : new Date(when).toISOString(),
    note        : note || null,
    done        : false
  }).then(function(r){
    if(r.error){ toast(r.error.message,'error'); return; }
    toast('Follow-up set ✓','success');
    document.getElementById('fu-modal').remove();
    fetchAll().then(function(){
      if(S.currentPage==='followup-reminders') renderFollowupReminders();
      else if(S.currentPage==='my-clients') renderMyClients();
    });
  });
}

function markFuDone(reminderId, clientId){
  sb.from('reminders').update({done:true}).eq('id',reminderId).then(function(r){
    if(r.error){ toast(r.error.message,'error'); return; }
    toast('Follow-up completed ✓','success');
    fetchAll().then(function(){
      var old = document.getElementById('fu-modal');
      if(old) old.remove();
      if(S.currentPage==='followup-reminders') renderFollowupReminders();
      else if(S.currentPage==='my-clients') renderMyClients();
    });
  });
}

// ── MAIN RENDER ───────────────────────────────────────────────
function renderFollowupReminders(){
  var m = document.getElementById('main-content');
  var now = Date.now();

  var mine = fuMyReminders().filter(function(r){ return !r.done; });

  // Admin filters
  if(S.role==='admin'){
    if(fuFilter.employee) mine = mine.filter(function(r){ return r.employee_id === fuFilter.employee; });
    if(fuFilter.campaign){
      mine = mine.filter(function(r){
        var c = clientById(r.client_id);
        return c && c.campaign_id === fuFilter.campaign;
      });
    }
  }
  if(fuSearch){
    var q = fuSearch.toLowerCase();
    mine = mine.filter(function(r){
      var c = clientById(r.client_id);
      return (r.note||'').toLowerCase().indexOf(q) > -1 ||
             (c && clientMatchesSearch(c, fuSearch));
    });
  }

  // categorize
  var overdue  = mine.filter(function(r){ return new Date(r.remind_at) < new Date(); })
                     .sort(function(a,b){ return new Date(a.remind_at)-new Date(b.remind_at); });
  var todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  var today    = mine.filter(function(r){ var t=new Date(r.remind_at); return t>=new Date() && t<=todayEnd; })
                     .sort(function(a,b){ return new Date(a.remind_at)-new Date(b.remind_at); });
  var weekEnd  = new Date(Date.now()+7*86400000);
  var thisWeek = mine.filter(function(r){ var t=new Date(r.remind_at); return t>todayEnd && t<=weekEnd; })
                     .sort(function(a,b){ return new Date(a.remind_at)-new Date(b.remind_at); });
  var later    = mine.filter(function(r){ return new Date(r.remind_at)>weekEnd; })
                     .sort(function(a,b){ return new Date(a.remind_at)-new Date(b.remind_at); });

  // total done (for stats)
  var totalAll  = fuMyReminders();
  var doneCount = totalAll.filter(function(r){ return r.done; }).length;

  var campOpts = '<option value="">All Campaigns</option>'+
    S.campaigns.map(function(c){ return '<option value="'+c.id+'" '+(fuFilter.campaign===c.id?'selected':'')+'>'+esc(c.name)+'</option>'; }).join('');
  var empOpts  = '<option value="">All Agents</option>'+
    S.employees.filter(function(e){ return e.is_active; }).map(function(e){ return '<option value="'+e.id+'" '+(fuFilter.employee===e.id?'selected':'')+'>'+esc(e.name)+'</option>'; }).join('');

  m.innerHTML = hdr('Follow-up Reminders','Track and manage all client follow-ups',
      '<button class="btn btn-primary btn-sm" onclick="renderFollowupReminders()"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh</button>')+

    // ── Stats ──
    '<div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 fade-in">'+
      fuStatCard('Total Pending', mine.length,  '#3b82f6','alarm-clock')+
      fuStatCard('Overdue',       overdue.length, overdue.length>0?'#ef4444':'#10b981','alert-circle')+
      fuStatCard('Today',         today.length,   '#f59e0b','calendar')+
      fuStatCard('Completed',     doneCount,      '#10b981','check-circle')+
    '</div>'+

    // ── Filters ──
    '<div class="card mb-4 fade-in" style="padding:.75rem 1rem">'+
      '<div class="flex items-center gap-3 flex-wrap">'+
        searchBox('fu-search', fuSearch, 'setFuSearch', 'Search client name, phone, note...')+
        (S.role==='admin'?
          '<select class="input" style="max-width:180px" onchange="fuFilter.employee=this.value;renderFollowupReminders()">'+empOpts+'</select>'+
          '<select class="input" style="max-width:180px" onchange="fuFilter.campaign=this.value;renderFollowupReminders()">'+campOpts+'</select>'
        : '')+
      '</div>'+
    '</div>'+

    // ── Grouped lists ──
    fuGroup('🔴 Overdue', overdue, '#ef4444', true)+
    fuGroup('📅 Today',   today,   '#f59e0b', false)+
    fuGroup('📆 This Week',thisWeek,'#3b82f6', false)+
    fuGroup('🗓️ Upcoming', later,   '#8b5cf6', false)+

    (mine.length===0 ?
      '<div class="card text-center py-14 fade-in">'+
        '<i data-lucide="check-circle" style="width:40px;height:40px;color:#10b981;margin:0 auto 12px;display:block"></i>'+
        '<p class="text-slate-300 font-semibold">All clear!</p>'+
        '<p class="text-slate-500 text-sm mt-1">No pending follow-ups</p>'+
      '</div>'
    : '');

  lucide.createIcons();
}

function fuGroup(title, reminders, color, alwaysShow){
  if(!reminders.length && !alwaysShow) return '';
  return '<div class="mb-4 fade-in">'+
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'+
      '<h3 style="font-size:13px;font-weight:700;color:'+color+'">'+title+' ('+reminders.length+')</h3>'+
    '</div>'+
    (reminders.length ? '<div class="space-y-2">'+reminders.map(fuCard).join('')+'</div>'
      : '<p style="font-size:12px;color:#475569;padding:8px 0">None</p>')+
  '</div>';
}

function fuCard(r){
  var c    = clientById(r.client_id);
  var emp  = empById(r.employee_id);
  var camp = c ? campById(c.campaign_id) : null;
  var dt   = new Date(r.remind_at);
  var isOverdue = dt < new Date();
  var dtStr = dt.toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  var ex   = (c&&c.extra_data)||{};

  return '<div class="card" style="border-color:rgba(255,255,255,'+(isOverdue?'.12':'.06')+')" >'+
    '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">'+
      '<div style="flex:1;min-width:200px">'+
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'+
          '<i data-lucide="'+(isOverdue?'alert-circle':'alarm-clock')+'" style="width:14px;height:14px;color:'+(isOverdue?'#f87171':'#fbbf24')+'"></i>'+
          '<span style="font-size:13px;font-weight:700;color:#fff">'+(c?esc(c.name||ex.name||ex.customer||'-'):'Unknown client')+'</span>'+
          (camp?'<span style="font-size:10px;color:#a78bfa;background:rgba(139,92,246,.12);padding:2px 8px;border-radius:4px">'+esc(camp.name)+'</span>':'')+
        '</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;font-size:12px;color:#94a3b8;margin-bottom:6px">'+
          (c&&c.phone?'<div>📞 '+esc(c.phone)+'</div>':'')+
          (ex.unit?'<div>🏠 '+esc(ex.unit)+'</div>':'')+
          (emp?'<div>👤 '+esc(emp.name)+'</div>':'')+
          (c?'<div style="color:'+(isOverdue?'#f87171':'#fbbf24')+'">⏰ '+dtStr+'</div>':'')+
        '</div>'+
        (r.note?'<div style="background:rgba(255,255,255,.04);border-radius:8px;padding:6px 10px;font-size:12px;color:#cbd5e1">'+esc(r.note)+'</div>':'')+
      '</div>'+
      '<div style="display:flex;gap:6px;flex-direction:column;flex-shrink:0">'+
        '<button class="btn btn-sm" style="background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.25);color:#6ee7b7" '+
          'onclick="markFuDone(\''+r.id+'\',\''+(c?c.id:'')+'\')">'+
          '<i data-lucide="check" class="w-3.5 h-3.5"></i> Done</button>'+
        (c?'<button class="btn btn-ghost btn-sm" onclick="expandedClientId=\''+c.id+'\';navigateTo(\'my-clients\')">'+
          '<i data-lucide="external-link" class="w-3.5 h-3.5"></i> Client</button>':'.')+
      '</div>'+
    '</div>'+
  '</div>';
}

function fuStatCard(label, val, color, icon){
  return '<div class="card text-center" style="padding:14px;cursor:default">'+
    '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px">'+
      '<i data-lucide="'+icon+'" style="width:14px;height:14px;color:'+color+'"></i>'+
      '<p class="text-xs text-slate-400">'+label+'</p>'+
    '</div>'+
    '<p class="text-2xl font-bold" style="color:'+color+'">'+val+'</p>'+
  '</div>';
}
