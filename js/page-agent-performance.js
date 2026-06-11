// ============================================================
// AGENT PERFORMANCE DASHBOARD
// ============================================================

var performanceFilter = { campaign: '' };

// ── Get metrics for one employee ─────────────────────────────
function getEmployeeMetrics(empId) {
  var emp = empById(empId);
  if (!emp) return null;

  // respect campaign filter
  var empClients = S.clients.filter(function(c) {
    if (c.assigned_employee_id !== empId) return false;
    if (performanceFilter.campaign && c.campaign_id !== performanceFilter.campaign) return false;
    return true;
  });

  // contact history for this agent's filtered clients
  var clientIds = {};
  empClients.forEach(function(c) { clientIds[c.id] = true; });
  var empHistory = (S.contactHistory || []).filter(function(h) { return clientIds[h.client_id]; });

  var totalClients   = empClients.length;
  var closedClients  = empClients.filter(function(c){ return c.status === 'Closed'; }).length;
  var totalCalls     = empHistory.length;
  var answeredCalls  = empHistory.filter(function(h){ return h.outcome === 'answered'; }).length;
  var wrongNumber    = empHistory.filter(function(h){ return h.outcome === 'wrong_number'; }).length;

  // clients with at least 1 attempt
  var touchedIds = {};
  empHistory.forEach(function(h){ touchedIds[h.client_id] = true; });
  var touchedCount  = Object.keys(touchedIds).length;
  var untouched     = totalClients - touchedCount;

  var answerRate    = totalCalls > 0 ? Math.round(answeredCalls / totalCalls * 100) : 0;
  var contactRate   = totalClients > 0 ? Math.round(touchedCount / totalClients * 100) : 0;
  var closeRate     = totalClients > 0 ? Math.round(closedClients / totalClients * 100) : 0;
  // productivity = average calls per client
  var productivity  = totalClients > 0 ? Math.round(totalCalls / totalClients * 10) / 10 : 0;

  // reminders from our reminders table (if loaded)
  // ── Follow-up metrics (from reminders table) ─────────────────
  var now = Date.now();
  var myReminders = (S.reminders||[]).filter(function(r){ return r.employee_id === empId; });
  var fuTotal    = myReminders.length;
  var fuDone     = myReminders.filter(function(r){ return r.done; }).length;
  var fuOverdue  = myReminders.filter(function(r){ return !r.done && new Date(r.remind_at).getTime() <= now; }).length;
  var fuPending  = myReminders.filter(function(r){ return !r.done; }).length;
  // clients that have at least 1 reminder set (proactiveness)
  var clientsWithFu = {};
  myReminders.forEach(function(r){ clientsWithFu[r.client_id] = true; });
  var fuSetRate  = totalClients > 0 ? Math.round(Object.keys(clientsWithFu).length / totalClients * 100) : 0;
  // completion: done / (done + overdue) — measures reliability
  var fuDoneOfDue = (fuDone + fuOverdue) > 0 ? Math.round(fuDone / (fuDone + fuOverdue) * 100) : 100;

  return {
    id: empId, name: emp.name, color: emp.color || '#3b82f6', isActive: emp.is_active,
    totalClients: totalClients,
    closedClients: closedClients,
    untouched: untouched,
    totalCalls: totalCalls,
    answeredCalls: answeredCalls,
    wrongNumber: wrongNumber,
    answerRate: answerRate,
    contactRate: contactRate,
    closeRate: closeRate,
    productivity: productivity,
    fuTotal: fuTotal,
    fuDone: fuDone,
    fuOverdue: fuOverdue,
    fuPending: fuPending,
    fuSetRate: fuSetRate,
    fuDoneOfDue: fuDoneOfDue
  };
}

// ── All agents sorted by close rate ──────────────────────────
function getAllEmployeesMetrics() {
  return S.employees
    .map(function(e){ return getEmployeeMetrics(e.id); })
    .filter(function(m){ return m && m.totalClients > 0; })
    .sort(function(a,b){ return b.closeRate - a.closeRate || b.answeredCalls - a.answeredCalls; });
}

// ── Main render ───────────────────────────────────────────────
function renderAgentPerformance() {
  var m = document.getElementById('main-content');
  var all = getAllEmployeesMetrics();

  // ── Totals ──
  var T = all.reduce(function(acc, s){
    acc.clients  += s.totalClients;
    acc.closed   += s.closedClients;
    acc.calls    += s.totalCalls;
    acc.answered += s.answeredCalls;
    acc.untouched += s.untouched;
    return acc;
  }, {clients:0, closed:0, calls:0, answered:0, untouched:0});

  var campOpts = '<option value="">All Campaigns</option>' +
    S.campaigns.map(function(c){
      return '<option value="'+c.id+'" '+(performanceFilter.campaign===c.id?'selected':'')+'>'+esc(c.name)+'</option>';
    }).join('');

  m.innerHTML = hdr('Agent Performance','Live metrics based on calls & client statuses')+

    // ── Campaign filter ──
    '<div class="card mb-5 fade-in" style="padding:.75rem 1rem">'+
      '<div class="flex items-center gap-3 flex-wrap">'+
        '<span class="text-xs text-slate-400">Campaign:</span>'+
        '<select class="input" style="max-width:240px" onchange="performanceFilter.campaign=this.value;renderAgentPerformance()">'+campOpts+'</select>'+
        (performanceFilter.campaign
          ? '<button class="btn btn-ghost btn-sm" onclick="performanceFilter.campaign=String();renderAgentPerformance()"><i data-lucide="x" class="w-3.5 h-3.5"></i> Clear</button>'
          : '')+
      '</div>'+
    '</div>'+

    // ── Summary cards ──
    '<div class="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6 fade-in">'+
      perfCard('Total Clients',  T.clients,  '#3b82f6', 'users')+
      perfCard('Calls Made',     T.calls,    '#06b6d4', 'phone')+
      perfCard('Answered',       T.answered, '#10b981', 'phone-call')+
      perfCard('Closed',         T.closed,   '#8b5cf6', 'check-circle')+
      perfCard('Untouched',      T.untouched,      T.untouched > 0 ? '#ef4444' : '#10b981', 'user-x')+
    '</div>'+

    // ── Leaderboard ──
    '<div class="card mb-5 fade-in">'+
      '<div class="flex items-center gap-2 mb-4">'+
        '<i data-lucide="trophy" class="w-5 h-5 text-amber-400"></i>'+
        '<h2 class="text-lg font-bold text-white">Leaderboard</h2>'+
      '</div>'+
      '<div class="space-y-2">'+
      (all.length ? all.slice(0, 10).map(function(s, i){
        var medal = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : '<span class="text-slate-500 text-sm font-bold">'+(i+1)+'</span>';
        return '<div class="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">'+
          '<div class="flex items-center gap-3 flex-1 min-w-0">'+
            '<span style="min-width:28px;text-align:center">'+medal+'</span>'+
            av(s.name, s.color, 32)+
            '<div class="flex-1 min-w-0">'+
              '<p class="text-sm font-semibold text-white">'+esc(s.name)+'</p>'+
              '<p class="text-xs text-slate-400">'+s.totalClients+' clients · '+s.totalCalls+' calls</p>'+
            '</div>'+
          '</div>'+
          '<div class="flex items-center gap-3 flex-wrap justify-end">'+
            '<div class="text-right"><p class="text-sm font-bold text-emerald-400">'+s.closeRate+'%</p><p class="text-xs text-slate-500">Close</p></div>'+
            '<div class="text-right"><p class="text-sm font-bold text-blue-400">'+s.answerRate+'%</p><p class="text-xs text-slate-500">Answer</p></div>'+
            (s.untouched > 0 ? '<span class="badge" style="background:rgba(239,68,68,.12);color:#fca5a5;font-size:10px">'+s.untouched+' untouched</span>' : '')+
            sBadge(s.isActive ? 'online' : 'offline')+
          '</div>'+
        '</div>';
      }).join('') : '<p class="text-slate-500 text-sm">No data</p>')+
      '</div>'+
    '</div>'+

    // ── Detailed table ──
    '<div class="card fade-in">'+
      '<div class="flex items-center gap-2 mb-4">'+
        '<i data-lucide="bar-chart-3" class="w-5 h-5 text-blue-400"></i>'+
        '<h2 class="text-lg font-bold text-white">Detailed Metrics</h2>'+
      '</div>'+
      (all.length ? '<div class="tbl-wrap"><table class="w-full text-sm">'+
        '<thead><tr class="text-left text-slate-500 text-xs uppercase border-b border-white/5">'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Agent</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Clients</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Calls</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Answered</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Answer %</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Contacted %</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Closed</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Close %</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Calls/Client</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Untouched</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Follow-ups Set</th>'+
          '<th class="pb-3 pr-4 text-center whitespace-nowrap">Overdue FU</th>'+
          '<th class="pb-3 text-center whitespace-nowrap">FU Done %</th>'+
        '</tr></thead><tbody>'+
        all.map(function(s){
          return '<tr class="table-row border-b border-white/[0.03]">'+
            '<td class="py-3 pr-4">'+av(s.name,s.color,26)+'<span class="text-xs text-slate-200 ml-2">'+esc(s.name)+'</span></td>'+
            '<td class="py-3 pr-4 text-center text-slate-300 font-semibold">'+s.totalClients+'</td>'+
            '<td class="py-3 pr-4 text-center text-slate-400">'+s.totalCalls+'</td>'+
            '<td class="py-3 pr-4 text-center text-emerald-400">'+s.answeredCalls+'</td>'+
            '<td class="py-3 pr-4 text-center">'+perfPct(s.answerRate,'blue')+'</td>'+
            '<td class="py-3 pr-4 text-center">'+perfPct(s.contactRate,'violet')+'</td>'+
            '<td class="py-3 pr-4 text-center text-blue-400 font-bold">'+s.closedClients+'</td>'+
            '<td class="py-3 pr-4 text-center">'+perfPct(s.closeRate, s.closeRate>=50?'emerald':'amber')+'</td>'+
            '<td class="py-3 pr-4 text-center text-slate-400">'+s.productivity+'</td>'+
            '<td class="py-3 pr-4 text-center">'+(s.untouched>0?'<span style="color:#fca5a5;font-weight:700">'+s.untouched+'</span>':'<span style="color:#6ee7b7">0</span>')+'</td>'+
            '<td class="py-3 pr-4 text-center"><span style="font-size:12px;color:#94a3b8">'+s.fuPending+'</span></td>'+
            '<td class="py-3 pr-4 text-center">'+(s.fuOverdue>0?'<span style="font-size:12px;font-weight:700;color:#f87171">'+s.fuOverdue+'</span>':'<span style="color:#6ee7b7;font-size:12px">0</span>')+'</td>'+
            '<td class="py-3 text-center">'+perfPct(s.fuDoneOfDue, s.fuDoneOfDue>=80?'emerald':s.fuDoneOfDue>=50?'amber':'red')+'</td>'+
          '</tr>';
        }).join('')+
      '</tbody></table></div>' : '<p class="text-slate-500 text-sm py-6 text-center">No agent data yet</p>')+
    '</div>';

  lucide.createIcons();
}

function perfCard(label, val, color, icon){
  return '<div class="card text-center" style="padding:14px">'+
    '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px">'+
      '<i data-lucide="'+icon+'" style="width:14px;height:14px;color:'+color+'"></i>'+
      '<p class="text-xs text-slate-400">'+label+'</p>'+
    '</div>'+
    '<p class="text-2xl font-bold" style="color:'+color+'">'+val+'</p>'+
  '</div>';
}

function perfPct(pct, clr){
  var c = clr === 'emerald' ? '#6ee7b7' : clr === 'amber' ? '#fbbf24' : clr === 'blue' ? '#93c5fd' : clr === 'violet' ? '#c4b5fd' : '#94a3b8';
  return '<span style="font-size:12px;font-weight:600;color:'+c+'">'+pct+'%</span>';
}
