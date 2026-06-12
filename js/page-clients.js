// ============================================================
// PAGE CLIENTS
// ============================================================

var clientsTab       = 'active';
var editingHistoryId = null;
var moodFilter       = '';
var reassignClientId = null; // client being reassigned

// Redistribute state
var redistPreview = null;
var redistCampId  = '';
var clientSearch  = '';
var statusFilter  = '';

var OUTCOMES = [
  { value: 'answered',     label: 'Answered',     emoji: '✅', color: '#10b981' },
  { value: 'no_answer',    label: 'No Answer',    emoji: '🔇', color: '#f59e0b' },
  { value: 'wrong_number', label: 'Wrong Number', emoji: '📵', color: '#ef4444' }
];

var MOODS = [
  { value: 'interested', label: 'Interested', emoji: '🟢' },
  { value: 'neutral',    label: 'Neutral',    emoji: '🟡' },
  { value: 'refused',    label: 'Refused',    emoji: '🔴' }
];

// ── Which tab does a client belong to? ───────────────────────
function getClientTab(c) {
  if (c.status === 'Closed') return 'closed';
  var hist = clientHistory(c.id);
  if (!hist.length) return 'active';
  var latest = hist[0];
  if (latest.outcome === 'answered')     return 'answered';
  if (latest.outcome === 'wrong_number') return 'wrong_number';
  return 'active';
}

// ── Badges ────────────────────────────────────────────────────
function outcomeBadge(outcome, mood) {
  var o = OUTCOMES.find(function(x) { return x.value === outcome; });
  var m = mood ? MOODS.find(function(x) { return x.value === mood; }) : null;
  var html = o
    ? '<span style="font-size:12px;padding:2px 8px;border-radius:6px;background:rgba(128,128,128,0.12);border:1px solid rgba(128,128,128,0.15)">' +
      o.emoji + ' ' + o.label + '</span>'
    : '';
  if (m) html += ' <span title="' + m.label + '" style="font-size:14px">' + m.emoji + '</span>';
  return html;
}

// ── Outcome + mood selectors ──────────────────────────────────
function outcomeSelector(areaId, preOutcome, preMood) {
  return '<div>' +
    '<p class="text-xs text-slate-500 mb-2">Call Outcome *</p>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap" data-outcome-area="' + areaId + '">' +
    OUTCOMES.map(function(o) {
      var sel = preOutcome === o.value;
      return '<button class="outcome-btn' + (sel ? ' selected-' + o.value : '') + '" ' +
        'onclick="selectOutcome(\'' + areaId + '\',\'' + o.value + '\',this);event.stopPropagation()" ' +
        'data-outcome="' + o.value + '">' + o.emoji + ' ' + o.label + '</button>';
    }).join('') +
    '</div>' +
    '<div id="mood-row-' + areaId + '" style="display:' + (preOutcome === 'answered' ? 'block' : 'none') + ';margin-top:10px">' +
    '<p class="text-xs text-slate-500 mb-2">Client Mood</p>' +
    '<div style="display:flex;gap:6px" data-mood-area="' + areaId + '">' +
    MOODS.map(function(m) {
      var sel = preMood === m.value;
      return '<button class="mood-btn' + (sel ? ' selected-' + m.value : '') + '" ' +
        'onclick="selectMood(\'' + areaId + '\',\'' + m.value + '\',this);event.stopPropagation()" ' +
        'data-mood="' + m.value + '" title="' + m.label + '" style="font-size:20px">' + m.emoji + '</button>';
    }).join('') +
    '</div></div></div>';
}

function selectOutcome(areaId, outcome, btn) {
  document.querySelectorAll('[data-outcome-area="' + areaId + '"] .outcome-btn').forEach(function(b) { b.className = 'outcome-btn'; });
  btn.className = 'outcome-btn selected-' + outcome;
  var moodRow = document.getElementById('mood-row-' + areaId);
  if (moodRow) moodRow.style.display = outcome === 'answered' ? 'block' : 'none';
  if (outcome !== 'answered') {
    document.querySelectorAll('[data-mood-area="' + areaId + '"] .mood-btn').forEach(function(b) { b.className = 'mood-btn'; });
  }
}

function selectMood(areaId, mood, btn) {
  document.querySelectorAll('[data-mood-area="' + areaId + '"] .mood-btn').forEach(function(b) { b.className = 'mood-btn'; });
  btn.className = 'mood-btn selected-' + mood;
}

function getSelectedOutcome(areaId) {
  var btn = document.querySelector('[data-outcome-area="' + areaId + '"] .outcome-btn[class*="selected-"]');
  return btn ? btn.getAttribute('data-outcome') : null;
}

function getSelectedMood(areaId) {
  var btn = document.querySelector('[data-mood-area="' + areaId + '"] .mood-btn[class*="selected-"]');
  return btn ? btn.getAttribute('data-mood') : null;
}

// ── Edit history entry ────────────────────────────────────────
function startEditHistory(histId) { editingHistoryId = histId; renderMyClients(); }
function cancelEditHistory()      { editingHistoryId = null;   renderMyClients(); }

async function saveHistoryEdit(histId) {
  var areaId  = 'edit-' + histId;
  var noteEl  = document.getElementById('edit-note-' + histId);
  var outcome = getSelectedOutcome(areaId);
  var mood    = outcome === 'answered' ? getSelectedMood(areaId) : null;
  var note    = noteEl ? noteEl.value.trim() : '';
  if (!outcome) { toast('Select a call outcome', 'info'); return; }
  try {
    var res = await sb.from('contact_history').update({ outcome: outcome, note: note || '', mood: mood || null }).eq('id', histId);
    if (res.error) throw res.error;
    toast('Updated', 'success');
    editingHistoryId = null;
    fetchAll().then(function() { navigateToClientTab(); renderMyClients(); });
  } catch (e) { toast(e.message, 'error'); }
}

function navigateToClientTab(clientId, outcome, status) {
  if (!clientId) return;
  if (status === 'Closed')        { clientsTab = 'closed';       return; }
  if (outcome === 'answered')     { clientsTab = 'answered';      return; }
  if (outcome === 'wrong_number') { clientsTab = 'wrong_number';  return; }
}

// ══════════════════════════════════════════════════════════════
// UNASSIGN / REASSIGN
// ══════════════════════════════════════════════════════════════

// Unassign a single client (admin only)
async function unassignClient(cid, clientName) {
  if (!confirm('Remove assignment for "' + clientName + '"?')) return;
  try {
    var res = await sb.from('clients').update({ assigned_employee_id: null }).eq('id', cid);
    if (res.error) throw res.error;
    toast('"' + clientName + '" is now unassigned', 'success');
    fetchAll().then(renderMyClients);
  } catch(e) { toast(e.message, 'error'); }
}

// Open reassign dropdown for a client
function openReassign(cid) {
  reassignClientId = (reassignClientId === cid) ? null : cid;
  renderMyClients();
}

// Save reassign to selected employee
async function saveReassign(cid, clientName) {
  var sel = document.getElementById('reassign-select-' + cid);
  if (!sel) return;
  var newEmpId = sel.value;
  if (!newEmpId) { toast('Select an employee', 'info'); return; }
  try {
    var res = await sb.from('clients').update({ assigned_employee_id: newEmpId }).eq('id', cid);
    if (res.error) throw res.error;
    var emp = empById(newEmpId);
    // notify new employee
    if (emp) {
      notifyEmployee(newEmpId, 'new_clients', 'Client "' + clientName + '" has been assigned to you').catch(function(){});
    }
    toast('"' + clientName + '" reassigned to ' + (emp ? emp.name : 'employee'), 'success');
    reassignClientId = null;
    fetchAll().then(renderMyClients);
  } catch(e) { toast(e.message, 'error'); }
}

// Build the assign actions section inside a client card (admin only)
function buildAssignActions(c, displayName) {
  if (S.role !== 'admin') return '';

  var currentEmp = empById(c.assigned_employee_id);
  var isReassigning = reassignClientId === c.id;

  // Employee dropdown options
  var empOpts = '<option value="">Select employee...</option>' +
    S.employees.filter(function(e) { return e.is_active; }).map(function(e) {
      return '<option value="' + e.id + '" ' + (c.assigned_employee_id === e.id ? 'selected' : '') + '>' +
        esc(e.name) + '</option>';
    }).join('');

  return '<div class="pt-3 border-t border-white/5" onclick="event.stopPropagation()">' +
    '<p class="text-xs text-slate-500 mb-2 font-medium">Assignment</p>' +
    '<div class="flex flex-wrap gap-2 items-center">' +

    // Current assignment badge
    '<span class="text-xs px-2 py-1 rounded-lg ' +
    (currentEmp ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' : 'bg-white/5 text-slate-400 border border-white/10') + '">' +
    (currentEmp ? '👤 ' + esc(currentEmp.name) : '👤 Unassigned') +
    '</span>' +

    // Reassign button
    '<button class="btn btn-ghost btn-sm" onclick="openReassign(\'' + c.id + '\');event.stopPropagation()" ' +
    'style="font-size:11px;padding:3px 10px">' +
    '<i data-lucide="user-check" class="w-3 h-3"></i> ' + (c.assigned_employee_id ? 'Reassign' : 'Assign') +
    '</button>' +

    // Unassign button (only if assigned)
    (c.assigned_employee_id
      ? '<button class="btn btn-ghost btn-sm" onclick="unassignClient(\'' + c.id + '\',\'' + escHtmlAttr(displayName) + '\');event.stopPropagation()" ' +
        'style="font-size:11px;padding:3px 10px;color:#f87171">' +
        '<i data-lucide="user-x" class="w-3 h-3"></i> Unassign' +
        '</button>'
      : '') +

    '</div>' +

    // Reassign panel
    (isReassigning
      ? '<div class="mt-3 flex gap-2 items-center flex-wrap">' +
        '<select id="reassign-select-' + c.id + '" class="input flex-1" style="min-width:180px;max-width:260px">' + empOpts + '</select>' +
        '<button class="btn btn-primary btn-sm" onclick="saveReassign(\'' + c.id + '\',\'' + escHtmlAttr(displayName) + '\');event.stopPropagation()">' +
        '<i data-lucide="check" class="w-3 h-3"></i> Confirm</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="openReassign(\'' + c.id + '\');event.stopPropagation()">Cancel</button>' +
        '</div>'
      : '') +

    '</div>';
}

function escHtmlAttr(str) {
  return String(str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ══════════════════════════════════════════════════════════════
// REDISTRIBUTE LOGIC
// ══════════════════════════════════════════════════════════════

function previewRedistribute() {
  var actEmps = activeEmps();
  if (!actEmps.length) { toast('No active employees', 'error'); return; }

  var pool = S.clients.filter(function(c) {
    var matchCamp = redistCampId ? c.campaign_id === redistCampId : true;
    return matchCamp && !c.assigned_employee_id;
  });

  if (!pool.length) {
    toast('No unassigned clients found' + (redistCampId ? ' in this campaign' : ''), 'info');
    return;
  }

  var dist = {};
  actEmps.forEach(function(e) { dist[e.id] = []; });
  pool.forEach(function(c, i) { dist[actEmps[i % actEmps.length].id].push(c); });
  redistPreview = dist;
  renderMyClients();
}

async function confirmRedistribute() {
  if (!redistPreview) return;
  var campName = redistCampId ? ((campById(redistCampId) || {}).name || 'Campaign') : 'All Campaigns';
  try {
    var updates = [];
    Object.keys(redistPreview).forEach(function(eid) {
      redistPreview[eid].forEach(function(c) {
        updates.push(sb.from('clients').update({ assigned_employee_id: eid }).eq('id', c.id));
      });
    });
    await Promise.all(updates);

    var notifPromises = Object.keys(redistPreview).map(function(eid) {
      var count = redistPreview[eid].length;
      if (count) return notifyEmployee(eid, 'new_clients', 'You have ' + count + ' new client(s) assigned from ' + campName);
      return Promise.resolve();
    });
    await Promise.all(notifPromises);

    var total = Object.values(redistPreview).reduce(function(s, a) { return s + a.length; }, 0);
    toast(total + ' clients distributed successfully', 'success');
    redistPreview = null;
    fetchAll().then(renderMyClients);
  } catch(e) { toast(e.message, 'error'); }
}

function cancelRedistribute() { redistPreview = null; renderMyClients(); }

function buildRedistributePanel() {
  if (S.role !== 'admin') return '';
  var actEmps = activeEmps();

  var campOpts = '<option value="">All Campaigns</option>' +
    S.campaigns.map(function(c) {
      return '<option value="' + c.id + '" ' + (redistCampId === c.id ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('');

  var unassignedCount = S.clients.filter(function(c) {
    var matchCamp = redistCampId ? c.campaign_id === redistCampId : true;
    return matchCamp && !c.assigned_employee_id;
  }).length;

  var previewHtml = '';
  if (redistPreview) {
    var mx = Math.max.apply(null, Object.values(redistPreview).map(function(a) { return a.length; }).concat([1]));
    previewHtml =
      '<div class="mt-4 pt-4 border-t border-white/10">' +
      '<p class="text-xs text-slate-400 mb-3">Preview — <span class="text-white font-semibold">' +
      Object.values(redistPreview).reduce(function(s,a){return s+a.length;},0) +
      ' clients</span> → <span class="text-white font-semibold">' + actEmps.length + ' active employees</span></p>' +
      '<div class="space-y-2">' +
      Object.keys(redistPreview).map(function(eid) {
        var e = empById(eid); if (!e) return '';
        var cls = redistPreview[eid]; if (!cls.length) return '';
        return '<div><div class="flex items-center justify-between mb-1">' +
          '<div class="flex items-center gap-2">' + av(e.name, e.color||'#3b82f6', 22) +
          '<span class="text-xs text-slate-300">' + esc(e.name) + '</span></div>' +
          '<span class="text-xs font-bold text-white">' + cls.length + '</span></div>' +
          '<div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">' +
          '<div class="h-full rounded-full bg-emerald-500/70" style="width:' + (cls.length/mx)*100 + '%"></div></div></div>';
      }).join('') + '</div>' +
      '<div class="flex gap-2 mt-4">' +
      '<button class="btn btn-success" onclick="confirmRedistribute()"><i data-lucide="check" class="w-4 h-4"></i> Confirm & Distribute</button>' +
      '<button class="btn btn-ghost" onclick="cancelRedistribute()">Cancel</button>' +
      '</div></div>';
  }

  return '<div class="card mb-4 fade-in border-violet-500/20">' +
    '<div class="flex items-center gap-2 mb-3">' +
    '<i data-lucide="shuffle" class="w-4 h-4 text-violet-400"></i>' +
    '<h3 class="text-sm font-bold text-white">Redistribute Unassigned Clients</h3></div>' +
    '<div class="flex flex-wrap gap-3 items-end">' +
    '<div><label class="text-[10px] text-slate-500 uppercase tracking-wider mb-1 block">Campaign Source</label>' +
    '<select class="input py-1 text-xs" style="min-width:160px" onchange="redistCampId=this.value;renderMyClients()">' + campOpts + '</select></div>' +
    '<div class="flex-1"><p class="text-xs text-slate-400 mb-1">Found <span class="text-white font-medium">' + unassignedCount + '</span> unassigned clients</p>' +
    '<button class="btn btn-primary btn-sm w-full" onclick="previewRedistribute()" ' + (unassignedCount===0?'disabled':'') + '>' +
    '<i data-lucide="play" class="w-3 h-3"></i> Preview Distribution</button></div></div>' +
    previewHtml + '</div>';
}

// ══════════════════════════════════════════════════════════════
// BULK ACTIONS
// ══════════════════════════════════════════════════════════════

var selectedClients = {}; // {id: true}

function buildBulkBar(cls) {
  var ids = Object.keys(selectedClients);
  if (!ids.length) return '';
  var empOpts = '<option value="">Assign to...</option>' +
    S.employees.filter(function(e){return e.is_active;}).map(function(e){
      return '<option value="'+e.id+'">'+esc(e.name)+'</option>';
    }).join('');

  return '<div class="card mb-4 bg-blue-600/10 border-blue-500/30 flex items-center justify-between gap-4 py-2 px-4 sticky top-0 z-30 backdrop-blur-md fade-in">' +
    '<div class="flex items-center gap-3">' +
    '<span class="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">' + ids.length + ' Selected</span>' +
    '<button class="btn btn-ghost btn-sm text-xs" onclick="selectedClients={};renderMyClients()">Clear</button></div>' +
    '<div class="flex items-center gap-2">' +
    '<select id="bulk-assign-sel" class="input py-1 text-xs" style="width:140px" onchange="handleBulkAssignChange()">' + empOpts + '</select>' +
    '<button class="btn btn-danger btn-sm py-1 text-xs" onclick="bulkUnassign()">Unassign</button>' +
    '</div></div>';
}

function handleBulkAssignChange() {
  var sel = document.getElementById('bulk-assign-sel');
  if (sel && sel.value) { bulkAssign(sel.value); sel.value = ''; }
}

function toggleClientSelect(id, e) {
  if (e) e.stopPropagation();
  if (selectedClients[id]) { delete selectedClients[id]; }
  else { selectedClients[id] = true; }
  renderMyClients();
}

function toggleSelectAll(e) {
  var cls = (myClients()).filter(function(c){
    if(empClientFilter) return c.campaign_id===empClientFilter; return true;
  });
  var allSel = Object.keys(selectedClients).length === cls.length;
  selectedClients = {};
  if (!allSel) cls.forEach(function(c){ selectedClients[c.id]=true; });
  renderMyClients();
}

function bulkUnassign() {
  var ids = Object.keys(selectedClients);
  if (!ids.length) return;
  showConfirm(
    'Unassign',
    'Unassign '+ids.length+' clients — continue?',
    function() {
      var updates = ids.map(function(id){
        return sb.from('clients').update({assigned_employee_id:null}).eq('id',id);
      });
      Promise.all(updates).then(function(){
        toast(ids.length+' clients unassigned ✓','success');
        selectedClients={};
        fetchAll().then(renderMyClients);
      });
    },
    'Unassign',
    'btn-danger'
  );
}

function bulkAssign(employeeId) {
  if (!employeeId) return;
  var ids = Object.keys(selectedClients);
  if (!ids.length) return;
  var emp = empById(employeeId);
  showConfirm(
    'Assign agent',
    'Assign '+ids.length+' clients to '+(emp?emp.name:'')+'?',
    function() {
      var updates = ids.map(function(id){
        return sb.from('clients').update({assigned_employee_id:employeeId}).eq('id',id);
      });
      Promise.all(updates).then(function(){
        toast(ids.length+' clients assigned to '+(emp?emp.name:'')+ ' ✓','success');
        selectedClients={};
        fetchAll().then(renderMyClients);
      });
    },
    'تعيين',
    'btn-primary'
  );
}



function setClientSearch(v){
  clientSearch = v;
  renderMyClients();
  restoreSearchFocus('client-search');
}


// ── Group clients by normalized phone ─────────────────────────
function normalizePhoneForGroup(p){
  if(!p) return null;
  var d = String(p).replace(/\D/g,'');
  return d.length >= 7 ? d.slice(-9) : null;
}

function groupClientsByPhone(clients){
  var groups  = [];
  var byPhone = {};
  var noPhone = [];

  clients.forEach(function(c){
    var norm = normalizePhoneForGroup(c.phone);
    if(!norm){
      noPhone.push([c]);
      return;
    }
    if(!byPhone[norm]) byPhone[norm] = [];
    byPhone[norm].push(c);
  });

  Object.keys(byPhone).forEach(function(k){ groups.push(byPhone[k]); });
  noPhone.forEach(function(g){ groups.push(g); });

  // Sort: multi-unit first (so they stand out at top), then by name
  groups.sort(function(a,b){
    if(b.length !== a.length) return b.length - a.length;
    var na = (a[0].name||(a[0].extra_data||{}).customer||'').toLowerCase();
    var nb = (b[0].name||(b[0].extra_data||{}).customer||'').toLowerCase();
    return na < nb ? -1 : 1;
  });

  return groups;
}


// ── Group clients by normalized phone ────────────────────────
function normPhoneGroup(p){
  if(!p) return null;
  var d=String(p).replace(/\D/g,'');
  return d.length>=7 ? d.slice(-9) : null;
}

function groupClientsByPhone(clients){
  var byPhone={}, noPhone=[];
  clients.forEach(function(c){
    var k=normPhoneGroup(c.phone);
    if(!k){noPhone.push(c);return;}
    if(!byPhone[k]) byPhone[k]=[];
    byPhone[k].push(c);
  });
  var groups=[];
  Object.keys(byPhone).forEach(function(k){groups.push(byPhone[k]);});
  noPhone.forEach(function(c){groups.push([c]);});
  groups.sort(function(a,b){return b.length-a.length;});
  return groups;
}


// ── Get all units for same phone ─────────────────────────────
function getSiblingClients(c){
  var k=normPhoneGroup(c.phone);
  if(!k) return [c];
  var siblings=myClients().filter(function(x){return normPhoneGroup(x.phone)===k;});
  return siblings.length>1 ? siblings : [c];
}

function renderMyClients() {
  var m   = document.getElementById('main-content');
  var all = myClients();

  if (empClientFilter) all = all.filter(function(c) { return c.campaign_id === empClientFilter; });

  if (S.role === 'admin' && formFilter === 'submitted') {
    all = all.filter(function(c) { return c.extra_data && c.extra_data.form_submitted; });
  } else if (S.role === 'admin' && formFilter === 'pending') {
    all = all.filter(function(c) { return !c.extra_data || !c.extra_data.form_submitted; });
  }

  if (clientSearch) all = all.filter(function(c) { return clientMatchesSearch(c, clientSearch); });
  var allBeforeStatus = all;
  if (statusFilter) all = all.filter(function(c) { return c.status === statusFilter; });

  var tabs = { active: [], answered: [], wrong_number: [], closed: [] };
  all.forEach(function(c) { tabs[getClientTab(c)].push(c); });

  var cls = tabs[clientsTab] || [];
  if (clientsTab === 'answered' && moodFilter) {
    cls = cls.filter(function(c) {
      var hist   = clientHistory(c.id);
      var latest = hist.find(function(h) { return h.outcome === 'answered'; });
      return latest && latest.mood === moodFilter;
    });
  }

  var campOpts = '<option value="">All Campaigns</option>';
  var seen = {};
  all.forEach(function(c) {
    if (!seen[c.campaign_id]) {
      seen[c.campaign_id] = true;
      var cp = campById(c.campaign_id);
      if (cp) campOpts += '<option value="' + c.campaign_id + '" ' + (empClientFilter === c.campaign_id ? 'selected' : '') + '>' + esc(cp.name) + '</option>';
    }
  });

  var tabDefs = [
    { key: 'active',       label: 'Active',       icon: 'users',        cls: 'btn-primary' },
    { key: 'answered',     label: 'Answered',      icon: 'phone-call',   cls: 'btn-success' },
    { key: 'wrong_number', label: 'Wrong Number',  icon: 'phone-missed', cls: 'btn-danger'  },
    { key: 'closed',       label: 'Closed',        icon: 'check-circle', cls: 'btn-ghost'   }
  ];

  m.innerHTML =
    (function(){
    var groups = groupClientsByPhone(all);
    var uniqueClients = groups.length;
    var totalRecords  = all.length;
    var subtitle = totalRecords === uniqueClients
      ? totalRecords + ' clients'
      : totalRecords + ' records · ' + uniqueClients + ' unique clients';
    return hdr(S.role === 'admin' ? 'All Clients' : 'My Clients', subtitle);
  })() +
    buildRedistributePanel() +
    '<div class="mb-4 fade-in" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
      searchBox('client-search', clientSearch, 'setClientSearch', 'Search name, phone, unit, contract...') +
      '<select class="input" style="max-width:220px" onchange="empClientFilter=this.value||\'\';renderMyClients()">' + campOpts + '</select>' +
      (S.role==='admin' ?
        '<div style="display:flex;gap:5px">' +
        '<button class="btn btn-sm ' + (!formFilter ? 'btn-primary' : 'btn-ghost') + '" onclick="formFilter=\'\';renderMyClients()">All</button>' +
        '<button class="btn btn-sm ' + (formFilter==='submitted' ? 'btn-success' : 'btn-ghost') + '" onclick="formFilter=\'submitted\';renderMyClients()"><i data-lucide=\"check-circle\" class=\"w-3.5 h-3.5\"></i> Form Submitted</button>' +
        '<button class="btn btn-sm ' + (formFilter==='pending' ? 'btn-danger' : 'btn-ghost') + '" onclick="formFilter=\'pending\';renderMyClients()"><i data-lucide=\"clock\" class=\"w-3.5 h-3.5\"></i> Not Submitted</button>' +
        '</div>'
      : '') +
    '</div>' +
    // ── Status filter tabs (works for both admin & employee) ──
    '<div class="mb-4 fade-in" style="display:flex;gap:6px;flex-wrap:wrap">' +
      (function(){
        var statuses = ['','New','Contacted','Interested','Closed'];
        var colors = {'':'#3b82f6','New':'#3b82f6','Contacted':'#8b5cf6','Interested':'#f59e0b','Closed':'#10b981'};
        return statuses.map(function(st){
          var cnt = st ? allBeforeStatus.filter(function(c){return c.status===st;}).length : allBeforeStatus.length;
          var active = statusFilter === st;
          return '<button class="btn btn-sm ' + (active?'btn-primary':'btn-ghost') + '" ' +
            'onclick="statusFilter=statusFilter===\''+st+'\'?String():\''+st+'\';renderMyClients()">' +
            (st||'All') + ' <span style="opacity:.7;font-size:10px;margin-right:2px">(' + cnt + ')</span></button>';
        }).join('');
      })() +
    '</div>' +
    '<div class="flex gap-2 mb-4 flex-wrap border-b border-white/10 pb-2">' +
    tabDefs.map(function(t) {
      var count  = tabs[t.key].length;
      var active = clientsTab === t.key;
      return '<button class="btn btn-sm ' + (active ? t.cls : 'btn-ghost') + '" ' +
        'onclick="clientsTab=\'' + t.key + '\';moodFilter=\'\';expandedClientId=null;renderMyClients()">' +
        '<i data-lucide="' + t.icon + '" class="w-3.5 h-3.5"></i> ' + t.label +
        ' <span class="ml-1 opacity-70">(' + count + ')</span></button>';
    }).join('') +
    '</div>' +
    (clientsTab === 'answered'
      ? '<div class="flex gap-2 mb-4 items-center flex-wrap">' +
        '<span class="text-xs text-slate-500">Filter by mood:</span>' +
        '<button class="btn btn-sm ' + (!moodFilter ? 'btn-primary' : 'btn-ghost') + '" onclick="moodFilter=\'\';renderMyClients()">All</button>' +
        MOODS.map(function(mo) {
          return '<button class="btn btn-sm ' + (moodFilter === mo.value ? 'btn-primary' : 'btn-ghost') + '" ' +
            'onclick="moodFilter=\'' + mo.value + '\';renderMyClients()">' + mo.emoji + ' ' + mo.label + '</button>';
        }).join('') + '</div>'
      : '') +
    (S.role==='admin' ? buildBulkBar(cls) : '') +
    '<div class="space-y-3 fade-in" id="clients-list">' +
    (cls.length
      ? (function(){
          var groups = groupClientsByPhone(cls);
          var multi  = groups.filter(function(g){return g.length>1;}).length;
          var banner = multi > 0
            ? '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(251,191,36,.06);border:1px solid rgba(251,191,36,.15);border-radius:8px;margin-bottom:12px;font-size:12px;color:#fbbf24">'+
              '<i data-lucide="layers" style="width:14px;height:14px"></i> '+
              multi+' client'+(multi>1?'s':'')+' with multiple units — grouped below</div>'
            : '';
          return banner + groups.map(function(g){
            return g.length > 1 ? renderGroupedCard(g) : renderClientCard(g[0]);
          }).join('');
        })()
      : '<div class="card text-center py-12"><p class="text-slate-500">No clients here</p></div>') +
    '</div>';

  lucide.createIcons();
}

// ── Single client card ────────────────────────────────────────

function copyClientInfo(id, e) {
  if (e) e.stopPropagation();
  var c = clientById(id);
  if (!c) return;
  var ex = c.extra_data || {};
  var lines = [];
  if (c.name || ex.name || ex.customer)
    lines.push('Name: '+(c.name||ex.name||ex.customer||''));
  if (c.phone)
    lines.push('Phone: '+c.phone);
  if (ex.phone2 || ex.phone_2)
    lines.push('Phone 2: '+(ex.phone2||ex.phone_2||''));
  if (ex.contract_number)
    lines.push('Contract: '+ex.contract_number);
  if (ex.unit)
    lines.push('Unit: '+ex.unit);
  if (ex.project)
    lines.push('Project: '+ex.project);
  if (ex.email)
    lines.push('Email: '+ex.email);
  var text = lines.join('\n');
  if (!text.trim()) { toast('No info to copy','error'); return; }
  navigator.clipboard.writeText(text)
    .then(function(){ toast('Copied ✓','success'); })
    .catch(function(){
      var t=document.createElement('textarea');t.value=text;
      document.body.appendChild(t);t.select();
      document.execCommand('copy');document.body.removeChild(t);
      toast('Copied ✓','success');
    });
}


// Render a value with inline copy icon — won't collapse card
function copyable(value, label) {
  if (!value || value === '-') return '<span class="text-white text-sm">-</span>';
  return '<span style="display:inline-flex;align-items:center;gap:5px;cursor:default" onclick="event.stopPropagation()">'+
    '<span class="text-sm text-white">'+esc(value)+'</span>'+
    '<button title="Copy '+escHtmlAttr(label||'')+'" onclick="event.stopPropagation();quickCopy(\''+escHtmlAttr(value)+'\')" '+
      'style="background:none;border:none;cursor:pointer;padding:2px;color:#475569;display:inline-flex" '+
      'onmouseover="this.style.color=\'#94a3b8\'" onmouseout="this.style.color=\'#475569\'">'+
      '<i data-lucide=\"copy\" style=\"width:11px;height:11px\"></i>'+
    '</button>'+
  '</span>';
}

function quickCopy(text) {
  navigator.clipboard.writeText(text)
    .then(function(){ toast('Copied ✓','success'); })
    .catch(function(){
      var t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t);
      t.select(); document.execCommand('copy');
      document.body.removeChild(t);
      toast('Copied ✓','success');
    });
}


// ── Grouped card: one client, multiple units ──────────────────
function renderGroupedCard(clients){
  // Sort units by contract number
  clients.sort(function(a,b){
    var ca = ((a.extra_data||{}).contract_number||a.id);
    var cb = ((b.extra_data||{}).contract_number||b.id);
    return ca < cb ? -1 : 1;
  });

  var primary = clients[0];
  var extra   = primary.extra_data || {};
  var name    = primary.name || extra.customer || extra.name || '—';
  var phone   = primary.phone || '—';
  var emp     = empById(primary.assigned_employee_id);

  // Check if all form submitted
  var allSubmitted = clients.every(function(c){ return (c.extra_data||{}).form_submitted; });
  var anySubmitted = clients.some(function(c){ return (c.extra_data||{}).form_submitted; });

  // Any overdue follow-up?
  var anyFu = clients.some(function(c){
    return (S.reminders||[]).some(function(r){ return r.client_id===c.id && !r.done; });
  });
  var anyOverdueFu = clients.some(function(c){
    return (S.reminders||[]).some(function(r){ return r.client_id===c.id && !r.done && new Date(r.remind_at)<new Date(); });
  });

  // Dominant status
  var statusCounts = {};
  clients.forEach(function(c){ statusCounts[c.status] = (statusCounts[c.status]||0)+1; });
  var dominantStatus = Object.keys(statusCounts).sort(function(a,b){ return statusCounts[b]-statusCounts[a]; })[0];

  var isExpanded = expandedClientId === ('group_'+phone.replace(/\D/g,''));

  var html =
    '<div class="card" style="border-color:rgba(251,191,36,.35);border-left:3px solid #f59e0b;margin-bottom:8px">'+

    // ── Header row ──
    '<div style="display:flex;align-items:center;gap:12px;cursor:pointer" '+
      'onclick="expandedClientId=expandedClientId===\'group_'+phone.replace(/\D/g,'')+'\'?null:\'group_'+phone.replace(/\D/g,'')+'\'  ;renderMyClients()">'+

      // Avatar
      av(name, '#f59e0b', 36)+

      // Name + phone
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'+
          '<p style="font-weight:700;color:#fff;font-size:14px">'+esc(name)+'</p>'+
          '<span style="background:rgba(251,191,36,.12);color:#fbbf24;border:1px solid rgba(251,191,36,.25);border-radius:5px;font-size:11px;font-weight:700;padding:2px 8px">'+
            '🏠 '+clients.length+' units</span>'+
          (anySubmitted?'<span style="background:rgba(16,185,129,.1);color:#6ee7b7;border-radius:5px;font-size:10px;padding:2px 6px">'+(allSubmitted?'✓ All':'½ Partial')+' Form</span>':'')+
          (anyOverdueFu?'<span style="background:rgba(239,68,68,.1);color:#f87171;border-radius:5px;font-size:10px;padding:2px 6px">⏰ Overdue FU</span>':
            anyFu?'<span style="background:rgba(251,191,36,.1);color:#fbbf24;border-radius:5px;font-size:10px;padding:2px 6px">⏰ FU Set</span>':'')+
        '</div>'+
        '<div style="display:flex;align-items:center;gap:6px;margin-top:2px">'+
          '<span style="font-size:12px;color:#64748b">'+esc(phone)+'</span>'+
          '<button onclick="event.stopPropagation();quickCopy(\''+escHtmlAttr(phone)+'\');" '+
            'style="background:none;border:none;cursor:pointer;padding:1px;color:#334155;display:inline-flex">'+
            '<i data-lucide="copy" style="width:10px;height:10px"></i></button>'+
        '</div>'+
      '</div>'+

      // Right side: agent + status + expand arrow
      '<div style="display:flex;align-items:center;gap:8px;flex-shrink:0">'+
        (emp ? av(emp.name, emp.color||'#3b82f6', 24)+'<span style="font-size:11px;color:#94a3b8">'+esc(emp.name)+'</span>' : '')+
        sBadge(dominantStatus)+
        '<i data-lucide="'+(isExpanded?'chevron-up':'chevron-down')+'" style="width:16px;height:16px;color:#64748b"></i>'+
      '</div>'+

    '</div>'+ // end header

    // ── Units list (always visible, not just expanded) ──
    '<div style="margin-top:10px;border-top:1px solid rgba(255,255,255,.06);padding-top:8px">'+
      clients.map(function(c){
        var ex2     = c.extra_data || {};
        var contract = ex2.contract_number || c.id.slice(0,8);
        var unit     = ex2.unit || '—';
        var project  = ex2.project || '';
        var fuCount  = (S.reminders||[]).filter(function(r){return r.client_id===c.id&&!r.done;}).length;
        var fuOver   = (S.reminders||[]).some(function(r){return r.client_id===c.id&&!r.done&&new Date(r.remind_at)<new Date();});
        return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04)">'+
          '<i data-lucide="home" style="width:12px;height:12px;color:#64748b;flex-shrink:0"></i>'+
          '<div style="flex:1;min-width:0">'+
            '<span style="font-size:12px;font-weight:600;color:#e2e8f0">'+esc(unit)+'</span>'+
            (project?'<span style="font-size:11px;color:#64748b;margin-right:6px"> · '+esc(project)+'</span>':'')+
            '<span style="font-size:11px;color:#475569">'+esc(contract)+'</span>'+
          '</div>'+
          sBadge(c.status)+
          (fuOver?'<span style="font-size:10px;color:#f87171">⏰</span>':fuCount?'<span style="font-size:10px;color:#fbbf24">⏰</span>':'')+
          ((ex2.form_submitted)?'<span style="font-size:10px;color:#6ee7b7">📝</span>':'')+
        '</div>';
      }).join('')+
    '</div>'+

    // ── Expanded actions ──
    (isExpanded ?
      '<div style="margin-top:12px;border-top:1px solid rgba(255,255,255,.06);padding-top:10px;display:flex;gap:8px;flex-wrap:wrap">'+
        // Follow-up button
        '<button class="btn btn-sm" '+
          'style="background:rgba(251,191,36,.08);border:1px solid rgba(251,191,36,.2);color:#fbbf24" '+
          'onclick="openFollowupModal(\''+primary.id+'\',event)">'+
          '<i data-lucide="alarm-clock" class="w-3.5 h-3.5"></i> Follow-up</button>'+
        // Assign (admin only)
        (S.role==='admin' && !primary.assigned_employee_id ?
          '<button class="btn btn-primary btn-sm" onclick="openAssignModal('+JSON.stringify(clients.map(function(c){return c.id;}))+')">'+
          '<i data-lucide="user-plus" class="w-3.5 h-3.5"></i> Assign All</button>'
        : '') +
      '</div>'
    : '')+

    '</div>';

  return html;
}

// ── Assign multiple records at once ──────────────────────────
var _assignIds = [];
function openAssignModal(ids){
  _assignIds = ids;
  // reuse existing reassign UI or quick pick
  var empOpts = S.employees.filter(function(e){return e.is_active;})
    .map(function(e){ return '<option value="'+e.id+'">'+esc(e.name)+'</option>'; }).join('');
  var old = document.getElementById('mass-assign-modal');
  if(old) old.remove();
  var ov = document.createElement('div');
  ov.id = 'mass-assign-modal';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem';
  ov.onclick = function(e){ if(e.target===ov) ov.remove(); };
  ov.innerHTML = '<div style="background:#0d1628;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:1.5rem;max-width:360px;width:100%">'+
    '<h3 style="color:#fff;font-size:15px;font-weight:700;margin-bottom:1rem">Assign '+ids.length+' units</h3>'+
    '<select id="mass-assign-sel" class="input" style="margin-bottom:1rem"><option value="">Select agent...</option>'+empOpts+'</select>'+
    '<div style="display:flex;gap:8px">'+
      '<button class="btn btn-primary flex-1" onclick="doMassAssign()">Assign All</button>'+
      '<button class="btn btn-ghost" onclick="document.getElementById(\'mass-assign-modal\').remove()">Cancel</button>'+
    '</div>'+
  '</div>';
  document.body.appendChild(ov);
  lucide.createIcons();
}

function doMassAssign(){
  var empId = document.getElementById('mass-assign-sel').value;
  if(!empId){ toast('Select an agent','error'); return; }
  var emp = empById(empId);
  Promise.all(_assignIds.map(function(id){
    return sb.from('clients').update({assigned_employee_id:empId}).eq('id',id);
  })).then(function(){
    toast(_assignIds.length+' units assigned to '+(emp?emp.name:'')+ ' ✓','success');
    document.getElementById('mass-assign-modal').remove();
    fetchAll().then(renderMyClients);
  });
}


// ── Form Response Section (expanded card) ─────────────────────
function buildFormResponseSection(extra){
  var submittedAt = extra.form_submitted_at
    ? new Date(extra.form_submitted_at).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
    : '';
  var FIELDS = [
    {key:'name',              label:'Full Name'},
    {key:'phone',             label:'Primary Phone'},
    {key:'old_phone',         label:'Previous Phone'},
    {key:'phone2',            label:'Secondary Phone'},
    {key:'email',             label:'Email'},
    {key:'email2',            label:'Secondary Email'},
    {key:'preferred_channel', label:'Preferred Channel'},
    {key:'notes',             label:'Notes'}
  ];
  var rows = FIELDS
    .filter(function(f){ return extra[f.key] && String(extra[f.key]).trim(); })
    .map(function(f){
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);gap:12px">'+
        '<span style="font-size:11px;color:#64748b;flex-shrink:0">'+esc(f.label)+'</span>'+
        '<span style="font-size:11px;color:#6ee7b7;font-weight:500;text-align:right;word-break:break-word">'+esc(String(extra[f.key]))+'</span>'+
      '</div>';
    }).join('');
  if(!rows) return '';
  return '<div style="background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:.75rem 1rem;margin-bottom:8px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem">'+
      '<p style="font-size:11px;font-weight:700;color:#6ee7b7;text-transform:uppercase;letter-spacing:.05em">📝 Form Response</p>'+
      (submittedAt?'<span style="font-size:10px;color:#64748b">'+submittedAt+'</span>':'')+
    '</div>'+rows+'</div>';
}

// ── Client Activity Timeline ───────────────────────────────────
function buildClientTimeline(c){
  var extra = c.extra_data || {};
  var events = [];
  if(c.created_at) events.push({
    t:new Date(c.created_at).getTime(), icon:'upload', color:'#06b6d4',
    text:'Added to portal'+(extra.contract_number?' — '+extra.contract_number:'')
  });
  if(c.assigned_employee_id){
    var e=empById(c.assigned_employee_id);
    if(e) events.push({t:new Date(c.created_at||Date.now()).getTime()+1,icon:'user-plus',color:'#8b5cf6',text:'Assigned to '+e.name});
  }
  if(extra.form_submitted_at) events.push({
    t:new Date(extra.form_submitted_at).getTime(), icon:'clipboard-check', color:'#10b981',
    text:'Filled the data update form'
  });
  clientHistory(c.id).forEach(function(h){
    events.push({
      t:new Date(h.created_at).getTime(),
      icon:h.outcome==='answered'?'phone-call':'phone-missed',
      color:h.outcome==='answered'?'#10b981':'#f59e0b',
      text:(h.outcome==='answered'?'Answered call':h.outcome==='wrong_number'?'Wrong number':'Call attempt')+(h.note?' — '+h.note:'')
    });
  });
  if(!events.length) return '';
  events.sort(function(a,b){return b.t-a.t;});
  return '<div style="margin-bottom:8px"><p style="font-size:11px;color:#64748b;font-weight:600;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Activity</p>'+
    '<div style="max-height:200px;overflow-y:auto">'+
    events.map(function(ev,i){
      var when=new Date(ev.t).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      return '<div style="display:flex;gap:8px;padding:4px 0">'+
        '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">'+
          '<div style="width:22px;height:22px;border-radius:50%;background:'+ev.color+'18;display:flex;align-items:center;justify-content:center">'+
            '<i data-lucide="'+ev.icon+'" style="width:10px;height:10px;color:'+ev.color+'"></i></div>'+
          (i<events.length-1?'<div style="width:1px;flex:1;min-height:6px;background:rgba(255,255,255,.06)"></div>':'')+
        '</div>'+
        '<div style="flex:1;min-width:0;padding-bottom:3px">'+
          '<p style="font-size:11px;color:#cbd5e1">'+esc(ev.text)+'</p>'+
          '<p style="font-size:10px;color:#475569">'+when+'</p>'+
        '</div></div>';
    }).join('')+'</div></div>';
}

function renderClientCard(c) {
  var isExp   = expandedClientId === c.id;
  var hist    = clientHistory(c.id);
  var extra   = c.extra_data || {};
  var camp    = campById(c.campaign_id);
  var visCols = camp ? getVisibleCols(camp.id) : DEFAULT_COLUMNS.filter(function(x) { return x.visible; });

  var displayName = (function() {
    if (c.name && c.name.trim() && c.name.trim() !== '"') return c.name.trim();
    var nameKeys = ['contract_id','customer_name','client_name','full_name'];
    for (var ni = 0; ni < nameKeys.length; ni++) {
      var v = extra[nameKeys[ni]];
      if (v && v.toString().trim() && v.toString().trim() !== '"') return v.toString().trim();
    }
    var vals = Object.values(extra);
    for (var vi = 0; vi < vals.length; vi++) {
      var vv = (vals[vi]||'').toString().trim();
      if (vv && vv !== '"' && isNaN(vv) && vv.length > 2) return vv;
    }
    return 'Client';
  })();

  var subInfo = visCols.slice(1,3).map(function(col) {
    return extra[col.key] || c[col.key] || '';
  }).filter(Boolean).join(' · ');

  var totalAttempts  = hist.length;
  var answeredCount  = hist.filter(function(h) { return h.outcome === 'answered'; }).length;
  var wrongCount     = hist.filter(function(h) { return h.outcome === 'wrong_number'; }).length;
  var noAnsCount     = hist.filter(function(h) { return h.outcome === 'no_answer'; }).length;
  var latestAnswered = hist.find(function(h) { return h.outcome === 'answered'; });
  var latestMoodObj  = latestAnswered && latestAnswered.mood
    ? MOODS.find(function(x) { return x.value === latestAnswered.mood; }) : null;

  var statsBar = totalAttempts > 0
    ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">' +
      '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.15)">📞 ' + totalAttempts + '</span>' +
      (answeredCount ? '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(16,185,129,0.12);color:#10b981">✅ ' + answeredCount + '</span>' : '') +
      (wrongCount    ? '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(239,68,68,0.12);color:#ef4444">📵 ' + wrongCount + '</span>' : '') +
      (noAnsCount    ? '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(245,158,11,0.12);color:#f59e0b">🔇 ' + noAnsCount + '</span>' : '') +
      (latestMoodObj ? '<span style="font-size:14px" title="' + latestMoodObj.label + '">' + latestMoodObj.emoji + '</span>' : '') +
      '</div>'
    : '';

  // Assignment badge on card header (admin only)
  var assignBadge = S.role === 'admin'
    ? (c.assigned_employee_id
        ? '<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:rgba(59,130,246,0.1);color:#93c5fd;border:1px solid rgba(59,130,246,0.2)">' +
          esc((empById(c.assigned_employee_id)||{}).name||'') + '</span>'
        : '<span style="font-size:10px;padding:2px 7px;border-radius:5px;background:rgba(239,68,68,0.1);color:#fca5a5;border:1px solid rgba(239,68,68,0.2)">Unassigned</span>')
    : '';

  var isSel = !!selectedClients[c.id];
  return '<div class="card client-card ' + (isExp ? 'border-blue-500/30' : '') + (isSel ? ' border-blue-500/60 bg-blue-500/5' : '') + '">' +
    (S.role==='admin' ? '<div style="float:left;margin:0 0 4px 8px"><input type="checkbox" ' + (isSel?'checked':'') + ' onclick="toggleClientSelect(\''+c.id+'\',event)" style="width:16px;height:16px;cursor:pointer;accent-color:#3b82f6"></div>' : '') +

    '<div class="flex items-center justify-between gap-3" onclick="expandedClientId=' + (isExp ? 'null' : '\'' + c.id + '\'') + ';renderMyClients()">' +
    '<div class="flex items-center gap-3 min-w-0 flex-1">' +
    '<div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0"><i data-lucide="user" class="w-5 h-5"></i></div>' +
    '<div class="min-w-0">' +
    '<div style="display:flex;align-items:center;gap:8px;min-width:0">'+
      '<p class="font-semibold text-white truncate">' + esc(displayName) + '</p>'+
      (function(){
        var sibs=getSiblingClients(c);
        if(sibs.length<=1) return '';
        return '<span style="background:rgba(251,191,36,.12);color:#fbbf24;border:1px solid rgba(251,191,36,.25);border-radius:5px;font-size:10px;font-weight:700;padding:1px 7px;flex-shrink:0">'+
          '🏠 '+sibs.length+' units</span>';
      })()+
    '</div>'+
    '<div class="flex items-center gap-2" onclick="event.stopPropagation()">'+
      '<p class="text-xs text-slate-500 truncate">' + esc(subInfo) + '</p>'+
      (c.phone ? '<button title="Copy phone" onclick="event.stopPropagation();quickCopy(\''+escHtmlAttr(c.phone)+'\')" '+
        'style="background:none;border:none;cursor:pointer;padding:1px;color:#334155;display:inline-flex" '+
        'onmouseover="this.style.color=\'#64748b\'" onmouseout="this.style.color=\'#334155\'">'+
        '<i data-lucide=\"copy\" style=\"width:10px;height:10px\"></i></button>' : '')+
    '</div>' +
    statsBar + '</div></div>' +
    '<div class="flex items-center gap-2 flex-shrink-0">' +
    assignBadge + sBadge(c.status) +
    (extra.form_submitted ? '<span class="badge" style="background:#064e3b;color:#6ee7b7;font-size:10px;margin-right:2px"><i data-lucide=\"check\" style=\"width:10px;height:10px;vertical-align:-1px\"></i> Form</span>' : '') +
    (function(){
      var fu=(S.reminders||[]).filter(function(r){return r.client_id===c.id&&!r.done;});
      if(!fu.length) return '';
      var over=fu.some(function(r){return new Date(r.remind_at)<new Date();});
      return '<span class="badge" style="font-size:10px;margin-right:2px;background:'+(over?'rgba(239,68,68,.12)':'rgba(251,191,36,.1)')+';color:'+(over?'#fca5a5':'#fbbf24')+'">⏰'+fu.length+'</span>';
    })() +
    '<i data-lucide="' + (isExp ? 'chevron-up' : 'chevron-down') + '" class="w-4 h-4 text-slate-400"></i>' +
    '</div></div>' +

    (isExp ? '<div class="mt-4 pt-4 border-t border-white/5 space-y-5">' +

      // Fields
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">' +
      visCols.map(function(col) {
        var v = extra[col.key]||c[col.key]||'-';
        var isCopiable = (col.key==='phone'||col.key==='phone_2'||col.key==='phone_3'||col.key==='phone2'||
          col.key==='unit'||col.key==='contract_number'||col.key==='email'||col.key==='customer');
        return '<div onclick="event.stopPropagation()"><p class="text-xs text-slate-500 mb-1">' + esc(col.label) + '</p>' +
          (isCopiable ? copyable(v, col.label) : '<p class="text-sm text-white">' + esc(v) + '</p>') +
          '</div>';
      }).join('') +
      '<div><p class="text-xs text-slate-500 mb-1">Status</p>' +
      (S.role === 'employee'
        ? '<select id="status-' + c.id + '" class="input text-sm" onclick="event.stopPropagation()">' +
          ['New','Contacted','Interested','Closed'].map(function(s) {
            return '<option value="' + s + '" ' + (c.status === s ? 'selected' : '') + '>' + s + '</option>';
          }).join('') + '</select>'
        : '<p class="text-sm text-white">' + esc(c.status||'-') + '</p>') +
      '</div></div>' +

      // ── Form Response Section ──
      (extra.form_submitted ? buildFormResponseSection(extra) : '') +

      // ── Follow-up button ──
      '<div style="margin-bottom:8px">'+
      (function(){
        var fu=(S.reminders||[]).filter(function(r){return r.client_id===c.id&&!r.done;});
        var over=fu.some(function(r){return new Date(r.remind_at)<new Date();});
        return '<button class="btn btn-sm" '+
          'style="'+(over?'background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#fca5a5':
            fu.length?'background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.2);color:#fbbf24':
            'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#94a3b8')+'" '+
          'onclick="openFollowupModal(\''+c.id+'\',event)">'+
          '<i data-lucide="alarm-clock" class="w-3.5 h-3.5"></i> '+
          (over?'Follow-up overdue!':fu.length?'Follow-up ('+fu.length+')':'Set Follow-up')+
        '</button>';
      })()+
      '</div>'+

      // ── Assign / Reassign / Unassign section (admin only) ──
      buildAssignActions(c, displayName) +

      // History
      '<div><p class="text-xs text-slate-500 mb-2 font-medium">Contact History (' + totalAttempts + ' attempts)</p>' +
      (hist.length
        ? '<div class="space-y-2 max-h-64 overflow-y-auto">' +
          hist.map(function(h) {
            var isEditing = editingHistoryId === h.id;
            var areaId    = 'edit-' + h.id;
            if (isEditing) {
              return '<div class="p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 text-xs space-y-3" onclick="event.stopPropagation()">' +
                '<div class="flex items-center justify-between mb-1">' +
                '<span class="text-slate-500">' + fmtDT(h.created_at) + '</span>' +
                '<span class="text-blue-400 font-medium">Editing</span></div>' +
                outcomeSelector(areaId, h.outcome, h.mood) +
                '<textarea id="edit-note-' + h.id + '" class="input text-xs" rows="2" placeholder="Note (optional)...">' + esc(h.note||'') + '</textarea>' +
                '<div class="flex gap-2">' +
                '<button class="btn btn-primary btn-sm" onclick="saveHistoryEdit(\'' + h.id + '\');event.stopPropagation()"><i data-lucide="save" class="w-3 h-3"></i> Save</button>' +
                '<button class="btn btn-ghost btn-sm" onclick="cancelEditHistory();event.stopPropagation()">Cancel</button>' +
                '</div></div>';
            }
            return '<div class="p-2 rounded-lg bg-white/[0.02] text-xs">' +
              '<div class="flex items-center justify-between mb-1">' +
              '<span class="text-slate-500">' + fmtDT(h.created_at) + '</span>' +
              '<div class="flex items-center gap-2">' + outcomeBadge(h.outcome, h.mood) +
              (S.role === 'employee'
                ? '<button class="btn btn-ghost btn-sm" style="padding:2px 6px;opacity:0.5" ' +
                  'onclick="startEditHistory(\'' + h.id + '\');event.stopPropagation()" title="Edit">' +
                  '<i data-lucide="pencil" class="w-3 h-3"></i></button>'
                : '') +
              '</div></div>' +
              (h.note ? '<p class="text-slate-300">' + esc(h.note) + '</p>' : '') +
              '</div>';
          }).join('') + '</div>'
        : '<p class="text-slate-500 text-xs">No contact attempts yet</p>') +
      '</div>' +

      // Log new attempt (employee only)
      (S.role === 'employee'
        ? '<div onclick="event.stopPropagation()">' +
          '<p class="text-xs text-slate-500 mb-3 font-medium">Log Contact Attempt</p>' +
          '<div class="space-y-3">' +
          outcomeSelector(c.id, null, null) +
          '<div class="flex gap-2">' +
          '<textarea id="note-' + c.id + '" class="input flex-1" placeholder="Note (optional)..." rows="2"></textarea>' +
          '<button class="btn btn-primary self-end" onclick="saveClient(\'' + c.id + '\')">'+
          '<i data-lucide="save" class="w-4 h-4"></i> Save</button>' +
          '</div></div></div>'
        : '') +

      // Set Follow-up Reminder (employee only)
      (S.role === 'employee'
        ? '<div class="pt-4 border-t border-white/5" onclick="event.stopPropagation()">' +
          '<p class="text-xs text-slate-500 mb-3 font-medium">Schedule Follow-up</p>' +
          '<div class="space-y-2">' +
          '<input type="date" id="followup-date-' + c.id + '" class="input" value="' + (c.next_followup_date ? new Date(c.next_followup_date).toISOString().split('T')[0] : '') + '">' +
          '<input type="time" id="followup-time-' + c.id + '" class="input" value="' + (c.next_followup_date ? new Date(c.next_followup_date).toTimeString().split(' ')[0].substring(0, 5) : '09:00') + '">' +
          '<textarea id="followup-note-' + c.id + '" class="input" placeholder="Follow-up note (optional)..." rows="2">' + esc(c.followup_note || '') + '</textarea>' +
          '<div class="flex gap-2">' +
          '<button class="btn btn-primary flex-1" onclick="saveFollowupFromClient(\'' + c.id + '\')"><i data-lucide="bell" class="w-4 h-4"></i> Set Reminder</button>' +
          (c.next_followup_date ? '<button class="btn btn-ghost" onclick="clearFollowupFromClient(\'' + c.id + '\')"><i data-lucide="trash" class="w-4 h-4"></i> Clear</button>' : '') +
          '</div></div></div>'
        : '') +

      '</div>' : '') +
    '</div>';
}

// ── Save new contact attempt ───────────────────────────────────
async function saveClient(cid) {
  var statusEl  = document.getElementById('status-' + cid);
  var noteEl    = document.getElementById('note-' + cid);
  var newStatus = statusEl ? statusEl.value : null;
  var note      = noteEl ? noteEl.value.trim() : '';
  var outcome   = getSelectedOutcome(cid);
  var mood      = outcome === 'answered' ? getSelectedMood(cid) : null;

  if (!outcome && !newStatus) { toast('Select a call outcome', 'info'); return; }

  try {
    if (newStatus) {
      var res = await sb.from('clients').update({ status: newStatus }).eq('id', cid);
      if (res.error) throw res.error;
      var c = S.clients.find(function(x) { return x.id === cid; });
      if (c && S.role === 'employee') {
        await notifyAdmin('status_changed', S.employee.name + ' changed "' + getClientDisplayName(c) + '" status to ' + newStatus);
      }
    }
    if (outcome) {
      var entry = { client_id: cid, outcome: outcome, note: note || '' };
      if (mood) entry.mood = mood;
      var r2 = await sb.from('contact_history').insert(entry);
      if (r2.error) throw r2.error;
    }
    toast('Saved!', 'success');
    expandedClientId = null;
    moodFilter = '';
    var finalStatus = newStatus || (S.clients.find(function(x) { return x.id === cid; })||{}).status;
    navigateToClientTab(cid, outcome, finalStatus);
    fetchAll().then(renderMyClients);
  } catch(e) { toast(e.message, 'error'); }
}

// ── Save follow-up reminder from client card ──
async function saveFollowupFromClient(cid) {
  var dateEl = document.getElementById('followup-date-' + cid);
  var timeEl = document.getElementById('followup-time-' + cid);
  var noteEl = document.getElementById('followup-note-' + cid);

  if (!dateEl.value || !timeEl.value) {
    toast('Please select both date and time', 'info');
    return;
  }

  var dateStr = dateEl.value + 'T' + timeEl.value + ':00';
  var noteStr = noteEl.value.trim();

  try {
    var res = await sb.from('clients').update({
      next_followup_date: dateStr,
      followup_note: noteStr || ''
    }).eq('id', cid);
    if (res.error) throw res.error;
    toast('Follow-up reminder set successfully', 'success');
    fetchAll().then(renderMyClients);
  } catch(e) { toast(e.message, 'error'); }
}

// ── Clear follow-up reminder from client card ──
async function clearFollowupFromClient(cid) {
  if (!confirm('Clear this follow-up reminder?')) return;
  try {
    var res = await sb.from('clients').update({
      next_followup_date: null,
      followup_note: ''
    }).eq('id', cid);
    if (res.error) throw res.error;
    toast('Follow-up reminder cleared', 'success');
    fetchAll().then(renderMyClients);
  } catch(e) { toast(e.message, 'error'); }
}
