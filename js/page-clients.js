// ============================================================
// PAGE CLIENTS
// ============================================================

// ── Mood helpers ─────────────────────────────────────────────
var MOODS = [
  { value: 'happy',   emoji: '😊', label: 'Happy',   color: '#10b981' },
  { value: 'neutral', emoji: '😐', label: 'Neutral',  color: '#f59e0b' },
  { value: 'unhappy', emoji: '😞', label: 'Unhappy',  color: '#ef4444' }
];

function moodBadge(mood) {
  var m = MOODS.find(function(x) { return x.value === mood; });
  if (!m) return '';
  return '<span style="font-size:13px" title="' + m.label + '">' + m.emoji + '</span>';
}

function moodSelector(clientId) {
  return '<div style="display:flex;gap:6px;align-items:center">' +
    '<span class="text-xs text-slate-500">Mood:</span>' +
    MOODS.map(function(m) {
      return '<button onclick="selectMood(\'' + clientId + '\',\'' + m.value + '\',this);event.stopPropagation()" ' +
        'data-mood="' + m.value + '" ' +
        'style="font-size:18px;padding:4px 8px;border-radius:8px;border:2px solid transparent;background:rgba(255,255,255,0.03);cursor:pointer;transition:all 0.15s" ' +
        'title="' + m.label + '">' + m.emoji + '</button>';
    }).join('') +
    '</div>';
}

function selectMood(clientId, mood, btn) {
  // Toggle selection — clicking same mood deselects
  var current = btn.getAttribute('data-selected') === 'true';
  var area = btn.closest ? btn.closest('[data-mood-area]') : document.querySelector('[data-mood-area="' + clientId + '"]');

  // Clear all selections in this client's mood area
  var allBtns = document.querySelectorAll('[data-mood-area="' + clientId + '"] button[data-mood]');
  allBtns.forEach(function(b) {
    b.setAttribute('data-selected', 'false');
    b.style.borderColor = 'transparent';
    b.style.background  = 'rgba(255,255,255,0.03)';
  });

  if (!current) {
    btn.setAttribute('data-selected', 'true');
    var m = MOODS.find(function(x) { return x.value === mood; });
    btn.style.borderColor = m ? m.color : '#fff';
    btn.style.background  = 'rgba(255,255,255,0.08)';
  }
}

function getSelectedMood(clientId) {
  var selected = document.querySelector('[data-mood-area="' + clientId + '"] button[data-selected="true"]');
  return selected ? selected.getAttribute('data-mood') : null;
}

// ── Render ────────────────────────────────────────────────────
function renderMyClients() {
  var m   = document.getElementById('main-content');
  var cls = myClients();

  if (empClientFilter) cls = cls.filter(function(c) { return c.campaign_id === empClientFilter; });

  var campOpts = '<option value="">All Campaigns</option>';
  var seen = {};
  myClients().forEach(function(c) {
    if (!seen[c.campaign_id]) {
      seen[c.campaign_id] = true;
      var cp = campById(c.campaign_id);
      if (cp) campOpts += '<option value="' + c.campaign_id + '" ' + (empClientFilter === c.campaign_id ? 'selected' : '') + '>' + esc(cp.name) + '</option>';
    }
  });

  m.innerHTML =
    hdr(S.role === 'admin' ? 'All Clients' : 'My Clients', cls.length + ' clients') +
    '<div class="mb-6 fade-in"><select class="input max-w-xs" onchange="empClientFilter=this.value||\'\';renderMyClients()">' + campOpts + '</select></div>' +
    '<div class="space-y-3 fade-in">' +
    (cls.length ? cls.map(function(c) {
      var isExp     = expandedClientId === c.id;
      var hist      = clientHistory(c.id);
      var extra     = c.extra_data || {};
      var camp      = campById(c.campaign_id);
      var visCols   = camp ? getVisibleCols(camp.id) : DEFAULT_COLUMNS.filter(function(x) { return x.visible; });

      // Display name
      var displayName = (function() {
        if (c.name && c.name.trim() && c.name.trim() !== '"') return c.name.trim();
        var nameKeys = ['contract_id', 'customer_name', 'client_name', 'full_name'];
        for (var ni = 0; ni < nameKeys.length; ni++) {
          var v = extra[nameKeys[ni]];
          if (v && v.toString().trim() && v.toString().trim() !== '"') return v.toString().trim();
        }
        var vals = Object.values(extra);
        for (var vi = 0; vi < vals.length; vi++) {
          var vv = (vals[vi] || '').toString().trim();
          if (vv && vv !== '"' && isNaN(vv) && vv.length > 2) return vv;
        }
        return 'Client';
      })();

      var subInfo = visCols.slice(1, 3).map(function(col) {
        return extra[col.key] || c[col.key] || '';
      }).filter(Boolean).join(' · ');

      // Attempts count + last mood
      var attemptsCount = hist.length;
      var lastMood      = hist.length ? hist[0].mood : null;

      return '<div class="card client-card ' + (isExp ? 'border-blue-500/30' : '') + '">' +

        // ── Header row ───────────────────────────────────────
        '<div class="flex items-center justify-between" onclick="expandedClientId=' + (isExp ? 'null' : '\'' + c.id + '\'') + ';renderMyClients()">' +
        '<div class="flex items-center gap-3">' +
        '<div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">' +
        '<i data-lucide="user" class="w-5 h-5"></i></div>' +
        '<div>' +
        '<p class="font-semibold text-white">' + esc(displayName) + '</p>' +
        '<p class="text-xs text-slate-500">' + esc(subInfo) + '</p>' +
        '</div></div>' +
        '<div class="flex items-center gap-3">' +

        // Attempts badge
        (attemptsCount > 0
          ? '<span style="font-size:11px;padding:2px 8px;border-radius:6px;background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.2)">' +
            '📞 ' + attemptsCount + (attemptsCount === 1 ? ' attempt' : ' attempts') +
            (lastMood ? ' · ' + moodBadge(lastMood) : '') +
            '</span>'
          : '') +

        sBadge(c.status) +
        '<i data-lucide="' + (isExp ? 'chevron-up' : 'chevron-down') + '" class="w-4 h-4 text-slate-400"></i>' +
        '</div></div>' +

        // ── Expanded panel ────────────────────────────────────
        (isExp
          ? '<div class="mt-4 pt-4 border-t border-white/5 space-y-4">' +

            // Fields grid
            '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">' +
            visCols.map(function(col) {
              return '<div><p class="text-xs text-slate-500 mb-1">' + esc(col.label) + '</p>' +
                '<p class="text-sm text-white">' + esc(extra[col.key] || c[col.key] || '-') + '</p></div>';
            }).join('') +
            (S.role === 'admin'
              ? '<div><p class="text-xs text-slate-500 mb-1">Assigned To</p>' +
                '<p class="text-sm text-white">' + esc((empById(c.assigned_employee_id) || {}).name || 'Unassigned') + '</p></div>'
              : '') +
            '<div><p class="text-xs text-slate-500 mb-1">Status</p>' +
            '<select id="status-' + c.id + '" class="input text-sm" onclick="event.stopPropagation()">' +
            ['New', 'Contacted', 'Interested', 'Closed'].map(function(s) {
              return '<option value="' + s + '" ' + (c.status === s ? 'selected' : '') + '>' + s + '</option>';
            }).join('') +
            '</select></div>' +
            '</div>' +

            // History
            '<div>' +
            '<p class="text-xs text-slate-500 mb-2 font-medium">Contact History (' + attemptsCount + ' attempts)</p>' +
            (hist.length
              ? '<div class="space-y-2 max-h-52 overflow-y-auto">' +
                hist.map(function(h) {
                  return '<div class="p-2 rounded-lg bg-white/[0.02] text-xs">' +
                    '<div class="flex items-center justify-between mb-1">' +
                    '<span class="text-slate-500">' + fmtDT(h.created_at) + '</span>' +
                    (h.mood ? moodBadge(h.mood) : '') +
                    '</div>' +
                    '<p class="text-slate-300">' + esc(h.note || '') + '</p>' +
                    '</div>';
                }).join('') +
                '</div>'
              : '<p class="text-slate-500 text-xs">No contact attempts yet</p>') +
            '</div>' +

            // Add note + mood
            '<div onclick="event.stopPropagation()">' +
            '<p class="text-xs text-slate-500 mb-2 font-medium">Log Contact Attempt</p>' +
            '<div class="space-y-2">' +
            '<div data-mood-area="' + c.id + '">' + moodSelector(c.id) + '</div>' +
            '<div class="flex gap-2">' +
            '<textarea id="note-' + c.id + '" class="input flex-1" placeholder="Add a note (optional)..." rows="2"></textarea>' +
            '<button class="btn btn-primary self-end" onclick="saveClient(\'' + c.id + '\')">' +
            '<i data-lucide="save" class="w-4 h-4"></i> Save</button>' +
            '</div></div></div>' +

            '</div>'
          : '') +
        '</div>';
    }).join('') : '<div class="card text-center py-12"><p class="text-slate-500">No clients assigned</p></div>') +
    '</div>';

  lucide.createIcons();
}

// ── Save client ────────────────────────────────────────────────
async function saveClient(cid) {
  var statusEl = document.getElementById('status-' + cid);
  var noteEl   = document.getElementById('note-' + cid);
  var newStatus = statusEl ? statusEl.value : null;
  var note      = noteEl ? noteEl.value.trim() : '';
  var mood      = getSelectedMood(cid);

  // Must have at least a mood or a note to log an attempt
  if (!newStatus && !note && !mood) { toast('Nothing to save', 'info'); return; }

  try {
    // 1. Update status
    if (newStatus) {
      var res = await sb.from('clients').update({ status: newStatus }).eq('id', cid);
      if (res.error) throw res.error;

      var c = S.clients.find(function(x) { return x.id === cid; });
      if (c) {
        var clientName = getClientDisplayName(c);

        if (S.role === 'employee') {
          await notifyAdmin('status_changed', S.employee.name + ' changed "' + clientName + '" status to ' + newStatus);
        }
        if (S.role === 'admin' && c.assigned_employee_id) {
          await notifyEmployee(c.assigned_employee_id, 'status_changed', 'Admin changed "' + clientName + '" status to ' + newStatus);
        }
      }
    }

    // 2. Log contact attempt if mood or note is provided
    if (mood || note) {
      var entry = { client_id: cid };
      if (note) entry.note = note;
      if (mood) entry.mood = mood;

      var r2 = await sb.from('contact_history').insert(entry);
      if (r2.error) throw r2.error;
    }

    toast('Saved!', 'success');
    fetchAll().then(renderMyClients);

  } catch (e) {
    toast(e.message, 'error');
  }
}
