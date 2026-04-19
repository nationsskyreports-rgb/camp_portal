// ============================================================
// PAGE CLIENTS
// ============================================================

var OUTCOMES = [
  { value: 'answered',      label: 'Answered',     emoji: '✅', color: '#10b981' },
  { value: 'no_answer',     label: 'No Answer',    emoji: '🔇', color: '#f59e0b' },
  { value: 'wrong_number',  label: 'Wrong Number', emoji: '📵', color: '#ef4444' }
];

var MOODS = [
  { value: 'happy',   label: 'Happy',   emoji: '😊' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'unhappy', label: 'Unhappy', emoji: '😞' }
];

// ── Badge for history list ────────────────────────────────────
function outcomeBadge(outcome, mood) {
  var o = OUTCOMES.find(function(x) { return x.value === outcome; });
  var m = mood ? MOODS.find(function(x) { return x.value === mood; }) : null;
  var html = o
    ? '<span style="font-size:12px;padding:2px 8px;border-radius:6px;background:rgba(128,128,128,0.12);border:1px solid rgba(128,128,128,0.15)">' +
      o.emoji + ' ' + o.label + '</span>'
    : '';
  if (m) html += ' <span title="' + m.label + '">' + m.emoji + '</span>';
  return html;
}

// ── Selectors ─────────────────────────────────────────────────
function outcomeSelector(clientId) {
  return '<div>' +
    '<p class="text-xs text-slate-500 mb-2">Call Outcome *</p>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap" data-outcome-area="' + clientId + '">' +
    OUTCOMES.map(function(o) {
      return '<button class="outcome-btn" ' +
        'onclick="selectOutcome(\'' + clientId + '\',\'' + o.value + '\',this);event.stopPropagation()" ' +
        'data-outcome="' + o.value + '">' +
        o.emoji + ' ' + o.label + '</button>';
    }).join('') +
    '</div>' +
    '<div id="mood-row-' + clientId + '" style="display:none;margin-top:10px">' +
    '<p class="text-xs text-slate-500 mb-2">Client Mood</p>' +
    '<div style="display:flex;gap:6px" data-mood-area="' + clientId + '">' +
    MOODS.map(function(m) {
      return '<button class="mood-btn" ' +
        'onclick="selectMood(\'' + clientId + '\',\'' + m.value + '\',this);event.stopPropagation()" ' +
        'data-mood="' + m.value + '" title="' + m.label + '">' +
        m.emoji + '</button>';
    }).join('') +
    '</div></div>' +
    '</div>';
}

function selectOutcome(clientId, outcome, btn) {
  var allBtns = document.querySelectorAll('[data-outcome-area="' + clientId + '"] .outcome-btn');
  allBtns.forEach(function(b) {
    b.className = 'outcome-btn';
  });
  btn.className = 'outcome-btn selected-' + outcome;

  var moodRow = document.getElementById('mood-row-' + clientId);
  if (moodRow) moodRow.style.display = outcome === 'answered' ? 'block' : 'none';

  if (outcome !== 'answered') {
    document.querySelectorAll('[data-mood-area="' + clientId + '"] .mood-btn').forEach(function(b) {
      b.className = 'mood-btn';
    });
  }
}

function selectMood(clientId, mood, btn) {
  document.querySelectorAll('[data-mood-area="' + clientId + '"] .mood-btn').forEach(function(b) {
    b.className = 'mood-btn';
  });
  btn.className = 'mood-btn selected-' + mood;
}

function getSelectedOutcome(clientId) {
  var btn = document.querySelector('[data-outcome-area="' + clientId + '"] .outcome-btn[class*="selected-"]');
  return btn ? btn.getAttribute('data-outcome') : null;
}

function getSelectedMood(clientId) {
  var btn = document.querySelector('[data-mood-area="' + clientId + '"] .mood-btn[class*="selected-"]');
  return btn ? btn.getAttribute('data-mood') : null;
}

// ── Render ─────────────────────────────────────────────────────
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
      var isExp   = expandedClientId === c.id;
      var hist    = clientHistory(c.id);
      var extra   = c.extra_data || {};
      var camp    = campById(c.campaign_id);
      var visCols = camp ? getVisibleCols(camp.id) : DEFAULT_COLUMNS.filter(function(x) { return x.visible; });

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

      var totalAttempts = hist.length;
      var answeredCount = hist.filter(function(h) { return h.outcome === 'answered'; }).length;
      var wrongCount    = hist.filter(function(h) { return h.outcome === 'wrong_number'; }).length;
      var noAnsCount    = hist.filter(function(h) { return h.outcome === 'no_answer'; }).length;
      var lastMood      = hist.length && hist[0].mood ? (MOODS.find(function(x) { return x.value === hist[0].mood; }) || {}).emoji : '';

      var statsBar = totalAttempts > 0
        ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:4px">' +
          '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.15)">📞 ' + totalAttempts + '</span>' +
          (answeredCount ? '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(16,185,129,0.12);color:#10b981">✅ ' + answeredCount + '</span>' : '') +
          (wrongCount   ? '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(239,68,68,0.12);color:#ef4444">📵 ' + wrongCount + '</span>' : '') +
          (noAnsCount   ? '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(245,158,11,0.12);color:#f59e0b">🔇 ' + noAnsCount + '</span>' : '') +
          (lastMood     ? '<span style="font-size:13px">' + lastMood + '</span>' : '') +
          '</div>'
        : '';

      return '<div class="card client-card ' + (isExp ? 'border-blue-500/30' : '') + '">' +

        '<div class="flex items-center justify-between gap-3" onclick="expandedClientId=' + (isExp ? 'null' : '\'' + c.id + '\'') + ';renderMyClients()">' +
        '<div class="flex items-center gap-3 min-w-0 flex-1">' +
        '<div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0"><i data-lucide="user" class="w-5 h-5"></i></div>' +
        '<div class="min-w-0">' +
        '<p class="font-semibold text-white truncate">' + esc(displayName) + '</p>' +
        '<p class="text-xs text-slate-500 truncate">' + esc(subInfo) + '</p>' +
        statsBar +
        '</div></div>' +
        '<div class="flex items-center gap-2 flex-shrink-0">' + sBadge(c.status) +
        '<i data-lucide="' + (isExp ? 'chevron-up' : 'chevron-down') + '" class="w-4 h-4 text-slate-400"></i>' +
        '</div></div>' +

        (isExp ? '<div class="mt-4 pt-4 border-t border-white/5 space-y-5">' +

          '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">' +
          visCols.map(function(col) {
            return '<div><p class="text-xs text-slate-500 mb-1">' + esc(col.label) + '</p>' +
              '<p class="text-sm text-white">' + esc(extra[col.key] || c[col.key] || '-') + '</p></div>';
          }).join('') +
          (S.role === 'admin' ? '<div><p class="text-xs text-slate-500 mb-1">Assigned To</p><p class="text-sm text-white">' + esc((empById(c.assigned_employee_id) || {}).name || 'Unassigned') + '</p></div>' : '') +
          '<div><p class="text-xs text-slate-500 mb-1">Status</p>' +
          (S.role === 'employee'
            ? '<select id="status-' + c.id + '" class="input text-sm" onclick="event.stopPropagation()">' +
              ['New', 'Contacted', 'Interested', 'Closed'].map(function(s) {
                return '<option value="' + s + '" ' + (c.status === s ? 'selected' : '') + '>' + s + '</option>';
              }).join('') + '</select>'
            : '<p class="text-sm text-white">' + esc(c.status || '-') + '</p>') +
          '</div>' +
          '</div>' +

          '<div><p class="text-xs text-slate-500 mb-2 font-medium">Contact History (' + totalAttempts + ' attempts)</p>' +
          (hist.length
            ? '<div class="space-y-2 max-h-52 overflow-y-auto">' +
              hist.map(function(h) {
                return '<div class="p-2 rounded-lg bg-white/[0.02] text-xs">' +
                  '<div class="flex items-center justify-between mb-1">' +
                  '<span class="text-slate-500">' + fmtDT(h.created_at) + '</span>' +
                  outcomeBadge(h.outcome, h.mood) + '</div>' +
                  (h.note ? '<p class="text-slate-300">' + esc(h.note) + '</p>' : '') +
                  '</div>';
              }).join('') + '</div>'
            : '<p class="text-slate-500 text-xs">No contact attempts yet</p>') + '</div>' +

          (S.role === 'employee'
            ? '<div onclick="event.stopPropagation()">' +
              '<p class="text-xs text-slate-500 mb-3 font-medium">Log Contact Attempt</p>' +
              '<div class="space-y-3">' +
              outcomeSelector(c.id) +
              '<div class="flex gap-2">' +
              '<textarea id="note-' + c.id + '" class="input flex-1" placeholder="Note (optional)..." rows="2"></textarea>' +
              '<button class="btn btn-primary self-end" onclick="saveClient(\'' + c.id + '\')">' +
              '<i data-lucide="save" class="w-4 h-4"></i> Save</button>' +
              '</div></div></div>'
            : '') +

          '</div>' : '') +
        '</div>';
    }).join('') : '<div class="card text-center py-12"><p class="text-slate-500">No clients assigned</p></div>') +
    '</div>';

  lucide.createIcons();
}

// ── Save ────────────────────────────────────────────────────────
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

    if (outcome) {
      var entry = { client_id: cid, outcome: outcome, note: note || '' };
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
