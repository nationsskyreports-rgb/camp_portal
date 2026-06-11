// ============================================================
// FOLLOW-UP REMINDERS SYSTEM
// ============================================================

var followupFilter = { employee: '', status: '', campaign: '' };
var followupEditId = null;

// ── Get all follow-up reminders ──
function getAllFollowupReminders() {
  var reminders = [];
  S.clients.forEach(function(c) {
    if (c.next_followup_date) {
      var isOverdue = new Date(c.next_followup_date) < new Date();
      var daysUntil = Math.ceil((new Date(c.next_followup_date) - new Date()) / (1000 * 60 * 60 * 24));
      reminders.push({
        clientId: c.id,
        clientName: c.name,
        clientPhone: c.phone,
        campaignId: c.campaign_id,
        employeeId: c.assigned_employee_id,
        nextFollowupDate: c.next_followup_date,
        followupNote: c.followup_note || '',
        isOverdue: isOverdue,
        daysUntil: daysUntil,
        status: c.status
      });
    }
  });
  return reminders.sort(function(a, b) {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return new Date(a.nextFollowupDate) - new Date(b.nextFollowupDate);
  });
}

// ── Set next follow-up date for a client ──
async function setFollowupDate(clientId, dateStr, noteStr) {
  try {
    var res = await sb.from('clients').update({
      next_followup_date: dateStr,
      followup_note: noteStr || ''
    }).eq('id', clientId);
    if (res.error) throw res.error;
    toast('Follow-up date set successfully', 'success');
    fetchAll().then(function() {
      if (S.currentPage === 'followup-reminders') renderFollowupReminders();
      else if (S.currentPage === 'my-clients') renderMyClients();
    });
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Mark follow-up as completed ──
async function completeFollowup(clientId) {
  try {
    var res = await sb.from('clients').update({
      next_followup_date: null,
      followup_note: ''
    }).eq('id', clientId);
    if (res.error) throw res.error;
    toast('Follow-up marked as completed', 'success');
    fetchAll().then(function() {
      if (S.currentPage === 'followup-reminders') renderFollowupReminders();
    });
  } catch (e) {
    toast(e.message, 'error');
  }
}

// ── Render Follow-up Reminders Page ──
function renderFollowupReminders() {
  var m = document.getElementById('main-content');
  var reminders = getAllFollowupReminders();

  // Apply filters
  var filtered = reminders.filter(function(r) {
    if (followupFilter.employee && r.employeeId !== followupFilter.employee) return false;
    if (followupFilter.campaign && r.campaignId !== followupFilter.campaign) return false;
    if (followupFilter.status === 'overdue' && !r.isOverdue) return false;
    if (followupFilter.status === 'upcoming' && r.isOverdue) return false;
    return true;
  });

  var html = '<div class="space-y-6 pb-6">' +
    // Header
    '<div>' +
    '<h1 class="text-3xl font-bold text-white mb-2" style="font-family:\'Syne\',sans-serif">Follow-up Reminders</h1>' +
    '<p class="text-slate-400 text-sm">Manage and track client follow-up schedules</p>' +
    '</div>' +

    // Stats
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-4">' +
    buildFollowupStatCard('Total Reminders', reminders.length, '#3b82f6', 'bell') +
    buildFollowupStatCard('Overdue', reminders.filter(function(r) { return r.isOverdue; }).length, '#ef4444', 'alert-circle') +
    buildFollowupStatCard('Due This Week', reminders.filter(function(r) { return !r.isOverdue && r.daysUntil <= 7; }).length, '#f59e0b', 'calendar') +
    '</div>' +

    // Filters
    '<div class="card">' +
    '<div class="flex items-center gap-2 mb-4">' +
    '<i data-lucide="filter" class="w-5 h-5 text-slate-400"></i>' +
    '<h3 class="font-semibold text-white">Filters</h3>' +
    '</div>' +
    '<div class="grid grid-cols-1 md:grid-cols-3 gap-3">' +
    '<select id="followup-status-filter" class="input" onchange="followupFilter.status=this.value;renderFollowupReminders()">' +
    '<option value="">All Status</option>' +
    '<option value="overdue" ' + (followupFilter.status === 'overdue' ? 'selected' : '') + '>Overdue Only</option>' +
    '<option value="upcoming" ' + (followupFilter.status === 'upcoming' ? 'selected' : '') + '>Upcoming Only</option>' +
    '</select>' +
    '<select id="followup-emp-filter" class="input" onchange="followupFilter.employee=this.value;renderFollowupReminders()">' +
    '<option value="">All Employees</option>' +
    S.employees.map(function(e) {
      return '<option value="' + e.id + '" ' + (followupFilter.employee === e.id ? 'selected' : '') + '>' + esc(e.name) + '</option>';
    }).join('') +
    '</select>' +
    '<select id="followup-camp-filter" class="input" onchange="followupFilter.campaign=this.value;renderFollowupReminders()">' +
    '<option value="">All Campaigns</option>' +
    S.campaigns.map(function(c) {
      return '<option value="' + c.id + '" ' + (followupFilter.campaign === c.id ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('') +
    '</select>' +
    '</div>' +
    '</div>';

  // Reminders List
  if (filtered.length === 0) {
    html += '<div class="card text-center py-12">' +
      '<i data-lucide="inbox" class="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50"></i>' +
      '<p class="text-slate-400">No follow-up reminders found</p>' +
      '</div>';
  } else {
    html += '<div class="space-y-3">';
    filtered.forEach(function(r) {
      var emp = empById(r.employeeId);
      var camp = campById(r.campaignId);
      var dateObj = new Date(r.nextFollowupDate);
      var dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      var timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      var statusClass = r.isOverdue ? 'bg-red-500/10 border-red-500/20' : 'bg-blue-500/10 border-blue-500/20';
      var statusIcon = r.isOverdue ? 'alert-circle' : 'clock';
      var statusColor = r.isOverdue ? 'text-red-400' : 'text-blue-400';

      html += '<div class="card ' + statusClass + ' border-l-4 ' + (r.isOverdue ? 'border-l-red-500' : 'border-l-blue-500') + '">' +
        '<div class="flex items-start justify-between gap-4 flex-wrap">' +
        '<div class="flex-1 min-w-0">' +
        '<div class="flex items-center gap-2 mb-2">' +
        '<i data-lucide="' + statusIcon + '" class="w-5 h-5 ' + statusColor + '"></i>' +
        '<h3 class="text-sm font-bold text-white">' + esc(r.clientName) + '</h3>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-2 text-xs text-slate-400 mb-2">' +
        '<div><span class="text-slate-500">Phone:</span> ' + (r.clientPhone ? esc(r.clientPhone) : 'N/A') + '</div>' +
        '<div><span class="text-slate-500">Agent:</span> ' + (emp ? esc(emp.name) : 'Unassigned') + '</div>' +
        '<div><span class="text-slate-500">Campaign:</span> ' + (camp ? esc(camp.name) : 'N/A') + '</div>' +
        '<div><span class="text-slate-500">Status:</span> ' + esc(r.status) + '</div>' +
        '</div>' +
        '<div class="flex items-center gap-2 mb-2">' +
        '<i data-lucide="calendar" class="w-4 h-4 text-slate-500"></i>' +
        '<span class="text-sm font-semibold text-white">' + dateStr + ' at ' + timeStr + '</span>' +
        (r.isOverdue ? '<span class="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 font-bold">' + Math.abs(r.daysUntil) + ' days overdue</span>' : '') +
        '</div>' +
        (r.followupNote ? '<div class="text-xs text-slate-300 bg-white/5 p-2 rounded mb-2"><span class="text-slate-500">Note:</span> ' + esc(r.followupNote) + '</div>' : '') +
        '</div>' +
        '<div class="flex gap-2 flex-wrap justify-end">' +
        '<button class="btn btn-primary btn-sm" onclick="editFollowupReminder(\'' + r.clientId + '\')">' +
        '<i data-lucide="edit" class="w-4 h-4"></i> Edit' +
        '</button>' +
        '<button class="btn btn-success btn-sm" onclick="completeFollowup(\'' + r.clientId + '\')">' +
        '<i data-lucide="check" class="w-4 h-4"></i> Complete' +
        '</button>' +
        '</div>' +
        '</div>' +
        '</div>';
    });
    html += '</div>';
  }

  html += '</div>';
  m.innerHTML = html;
  lucide.createIcons();
}

// ── Build Follow-up Stat Card ──
function buildFollowupStatCard(label, value, color, icon) {
  return '<div class="card border-l-4" style="border-left-color:' + color + '">' +
    '<div class="flex items-start justify-between">' +
    '<div>' +
    '<p class="text-slate-400 text-xs font-medium mb-1">' + label + '</p>' +
    '<p class="text-3xl font-bold text-white">' + value + '</p>' +
    '</div>' +
    '<i data-lucide="' + icon + '" class="w-8 h-8" style="color:' + color + ';opacity:0.6"></i>' +
    '</div>' +
    '</div>';
}

// ── Edit follow-up reminder ──
function editFollowupReminder(clientId) {
  followupEditId = clientId;
  var client = clientById(clientId);
  if (!client) return;

  var currentDate = client.next_followup_date ? new Date(client.next_followup_date).toISOString().split('T')[0] : '';
  var currentTime = client.next_followup_date ? new Date(client.next_followup_date).toTimeString().split(' ')[0].substring(0, 5) : '09:00';
  var currentNote = client.followup_note || '';

  var modal = '<div class="modal-overlay" id="followup-edit-modal" onclick="if(event.target===this)closeFollowupEdit()">' +
    '<div class="modal fade-in">' +
    '<div class="modal-header">' +
    '<h3 class="font-bold text-white">Edit Follow-up Reminder</h3>' +
    '<button onclick="closeFollowupEdit()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>' +
    '</div>' +
    '<div class="modal-body space-y-4">' +
    '<div>' +
    '<p class="text-sm font-semibold text-white mb-2">Client: ' + esc(client.name) + '</p>' +
    '</div>' +
    '<div>' +
    '<label class="text-xs text-slate-400 font-medium mb-2 block">Follow-up Date *</label>' +
    '<input type="date" id="followup-date-input" class="input" value="' + currentDate + '">' +
    '</div>' +
    '<div>' +
    '<label class="text-xs text-slate-400 font-medium mb-2 block">Follow-up Time *</label>' +
    '<input type="time" id="followup-time-input" class="input" value="' + currentTime + '">' +
    '</div>' +
    '<div>' +
    '<label class="text-xs text-slate-400 font-medium mb-2 block">Note (Optional)</label>' +
    '<textarea id="followup-note-input" class="input" placeholder="Add a note for this follow-up..." style="min-height:80px">' + esc(currentNote) + '</textarea>' +
    '</div>' +
    '</div>' +
    '<div class="modal-footer">' +
    '<button class="btn btn-ghost" onclick="closeFollowupEdit()">Cancel</button>' +
    '<button class="btn btn-primary" onclick="saveFollowupEdit(\'' + clientId + '\')"><i data-lucide="save" class="w-4 h-4"></i> Save</button>' +
    '</div>' +
    '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', modal);
  lucide.createIcons();
}

// ── Save follow-up edit ──
function saveFollowupEdit(clientId) {
  var dateInput = document.getElementById('followup-date-input');
  var timeInput = document.getElementById('followup-time-input');
  var noteInput = document.getElementById('followup-note-input');

  if (!dateInput.value || !timeInput.value) {
    toast('Please select both date and time', 'info');
    return;
  }

  var dateStr = dateInput.value + 'T' + timeInput.value + ':00';
  var noteStr = noteInput.value.trim();

  closeFollowupEdit();
  setFollowupDate(clientId, dateStr, noteStr);
}

// ── Close follow-up edit modal ──
function closeFollowupEdit() {
  var modal = document.getElementById('followup-edit-modal');
  if (modal) modal.remove();
  followupEditId = null;
}

// ── Escape HTML ──
function esc(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
