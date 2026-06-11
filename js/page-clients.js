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
    '<div><label class="text-xs text-slate-400 mb-1 block">Campaign</label>' +
    '<select class="input" style="min-width:200px" onchange="redistCampId=this.value;redistPreview=null;renderMyClients()">' + campOpts + '</select></div>' +
    '<div><p class="text-xs text-slate-500 mb-1">Unassigned</p>' +
    '<p class="text-lg font-bold ' + (unassignedCount > 0 ? 'text-violet-400' : 'text-slate-500') + '">' + unassignedCount + '</p></div>' +
    '<div><p class="text-xs text-slate-500 mb-1">Active Employees</p>' +
    '<p class="text-lg font-bold text-emerald-400">' + actEmps.length + '</p></div>' +
    '<button class="btn btn-primary" onclick="previewRedistribute()" ' + (unassignedCount === 0 || actEmps.length === 0 ? 'disabled' : '') + '>' +
    '<i data-lucide="shuffle" class="w-4 h-4"></i> Preview Distribution</button>' +
    '</div>' + previewHtml + '</div>';
}

// ── Render ─────────────────────────────────────────────────────
var selectedClients = {};


function buildFormResponseSection(extra) {
  var submittedAt = extra.form_submitted_at
    ? new Date(extra.form_submitted_at).toLocaleString('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
    : '';

  // Fields that came from the form (not from the original sheet upload)
  var FORM_FIELDS = [
    {key:'name',              label:'Full Name'},
    {key:'phone',             label:'Primary Phone'},
    {key:'old_phone',         label:'Previous Phone'},
    {key:'phone2',            label:'Secondary Phone'},
    {key:'email',             label:'Email'},
    {key:'email2',            label:'Secondary Email'},
    {key:'preferred_channel', label:'Preferred Channel'},
    {key:'notes',             label:'Notes'},
  ];

  var rows = FORM_FIELDS
    .filter(function(f) { return extra[f.key] && extra[f.key].toString().trim(); })
    .map(function(f) {
      return '<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:5px 0;border-bottom:0.5px solid rgba(255,255,255,.06);gap:12px">' +
        '<span style="font-size:11px;color:#64748b;flex-shrink:0">' + esc(f.label) + '</span>' +
        '<span style="font-size:11px;color:#6ee7b7;font-weight:500;text-align:right;word-break:break-all">' + esc(extra[f.key]) + '</span>' +
      '</div>';
    });

  if (!rows.length) return '';

  return '<div style="background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.2);border-radius:10px;padding:.85rem 1rem">' +
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.6rem">' +
      '<p style="font-size:11px;font-weight:600;color:#6ee7b7;text-transform:uppercase;letter-spacing:.05em">Form Response</p>' +
      (submittedAt ? '<span style="font-size:10px;color:#64748b">' + submittedAt + '</span>' : '') +
    '</div>' +
    rows.join('') +
  '</div>';
}

function buildBulkBar(cls) {
  var selCount = Object.keys(selectedClients).length;
  if (!cls.length) return '';
  var html = '<div class="card mb-3 fade-in" style="padding:.75rem 1rem">' +
    '<div class="flex items-center gap-3 flex-wrap">' +
      '<label class="flex items-center gap-2 cursor-pointer text-sm text-slate-300">' +
        '<input type="checkbox" ' + (selCount > 0 && selCount === cls.length ? 'checked' : '') +
          ' onclick="toggleSelectAll(event)" style="width:16px;height:16px;accent-color:#3b82f6">' +
        '<span>' + (selCount > 0 ? selCount + ' selected' : 'Select all') + '</span>' +
      '</label>';
  if (selCount > 0) {
    html += '<button class="btn btn-danger btn-sm" onclick="bulkUnassign()">' +
              '<i data-lucide="user-x" class="w-3.5 h-3.5"></i> Unassign (' + selCount + ')' +
            '</button>';
    html += '<select class="input" id="bulk-assign-sel" style="max-width:200px;height:34px;font-size:12px" onchange="bulkAssignFromSelect()">' +
              '<option value="">Assign to agent...</option>';
    S.employees.filter(function(e){return e.is_active;}).forEach(function(e){
      html += '<option value="' + e.id + '">' + esc(e.name) + '</option>';
    });
    html += '</select>';
    html += '<button class="btn btn-ghost btn-sm" onclick="selectedClients={};renderMyClients()">' +
              '<i data-lucide="x" class="w-3.5 h-3.5"></i> Clear selection' +
            '</button>';
  }
  html += '</div></div>';
  return html;
}

function bulkAssignFromSelect() {
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


function renderMyClients() {
  var m   = document.getElementById('main-content');
  var all = myClients();

  if (empClientFilter) all = all.filter(function(c) { return c.campaign_id === empClientFilter; });

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
    hdr(S.role === 'admin' ? 'All Clients' : 'My Clients', all.length + ' total') +
    buildRedistributePanel() +
    '<div class="mb-4 fade-in"><select class="input max-w-xs" onchange="empClientFilter=this.value||\'\';renderMyClients()">' + campOpts + '</select></div>' +
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
      ? cls.map(function(c) { return renderClientCard(c); }).join('')
      : '<div class="card text-center py-12"><p class="text-slate-500">No clients here</p></div>') +
    '</div>';

  lucide.createIcons();
}

// ── Single client card ────────────────────────────────────────
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
    '<p class="font-semibold text-white truncate">' + esc(displayName) + '</p>' +
    '<p class="text-xs text-slate-500 truncate">' + esc(subInfo) + '</p>' +
    statsBar + '</div></div>' +
    '<div class="flex items-center gap-2 flex-shrink-0">' +
    assignBadge + sBadge(c.status) +
    (extra.form_submitted ? '<span class="badge" style="background:#064e3b;color:#6ee7b7;font-size:10px;margin-right:2px"><i data-lucide=\"check\" style=\"width:10px;height:10px;vertical-align:-1px\"></i> Form</span>' : '') +
    '<i data-lucide="' + (isExp ? 'chevron-up' : 'chevron-down') + '" class="w-4 h-4 text-slate-400"></i>' +
    '</div></div>' +

    (isExp ? '<div class="mt-4 pt-4 border-t border-white/5 space-y-5">' +

      // Fields
      '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">' +
      visCols.map(function(col) {
        return '<div><p class="text-xs text-slate-500 mb-1">' + esc(col.label) + '</p>' +
          '<p class="text-sm text-white">' + esc(extra[col.key]||c[col.key]||'-') + '</p></div>';
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
          '<button class="btn btn-primary self-end" onclick="saveClient(\'' + c.id + '\')">' +
          '<i data-lucide="save" class="w-4 h-4"></i> Save</button>' +
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
