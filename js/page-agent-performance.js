// ============================================================
// AGENT PERFORMANCE DASHBOARD
// ============================================================

var performanceFilter = { timeRange: '30days', campaign: '' };

// ── Get performance metrics for an employee ──
function getEmployeeMetrics(empId) {
  var emp = empById(empId);
  if (!emp) return null;

  var empClients = S.clients.filter(function(c) { return c.assigned_employee_id === empId; });
  var empHistory = [];
  empClients.forEach(function(c) {
    clientHistory(c.id).forEach(function(h) { empHistory.push(h); });
  });

  var totalClients = empClients.length;
  var closedClients = empClients.filter(function(c) { return c.status === 'Closed'; }).length;
  var answeredCalls = empHistory.filter(function(h) { return h.outcome === 'answered'; }).length;
  var totalCalls = empHistory.length;
  var answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0;
  var closeRate = totalClients > 0 ? Math.round((closedClients / totalClients) * 100) : 0;

  // Count overdue follow-ups
  var now = new Date();
  var overdueCount = 0;
  empClients.forEach(function(c) {
    if (c.next_followup_date && new Date(c.next_followup_date) < now && c.status !== 'Closed') {
      overdueCount++;
    }
  });

  // Calculate Contact Rate (clients with at least one contact attempt)
  var contactedClients = empClients.filter(function(c) {
    return clientHistory(c.id).length > 0;
  }).length;
  var contactRate = totalClients > 0 ? Math.round((contactedClients / totalClients) * 100) : 0;

  // Calculate Conversion Rate (closed clients / total clients)
  var conversionRate = closeRate; // Already calculated above

  // Calculate Average Follow-up Delay (days overdue for pending follow-ups)
  var followupDelays = [];
  empClients.forEach(function(c) {
    if (c.next_followup_date && c.status !== 'Closed') {
      var followupDate = new Date(c.next_followup_date);
      if (followupDate < now) {
        var delayDays = Math.floor((now - followupDate) / (1000 * 60 * 60 * 24));
        followupDelays.push(delayDays);
      }
    }
  });
  var avgFollowupDelay = followupDelays.length > 0 
    ? Math.round(followupDelays.reduce(function(a, b) { return a + b; }, 0) / followupDelays.length)
    : 0;

  // Calculate Agent Productivity (calls per client assigned)
  var agentProductivity = totalClients > 0 ? Math.round((totalCalls / totalClients) * 100) / 100 : 0;

  return {
    id: empId,
    name: emp.name,
    color: emp.color || '#3b82f6',
    totalClients: totalClients,
    closedClients: closedClients,
    totalCalls: totalCalls,
    answeredCalls: answeredCalls,
    answerRate: answerRate,
    closeRate: closeRate,
    overdueFollowups: overdueCount,
    isActive: emp.is_active,
    contactRate: contactRate,
    conversionRate: conversionRate,
    avgFollowupDelay: avgFollowupDelay,
    agentProductivity: agentProductivity
  };
}

// ── Get all employees metrics sorted by performance ──
function getAllEmployeesMetrics() {
  var metrics = [];
  S.employees.forEach(function(emp) {
    var m = getEmployeeMetrics(emp.id);
    if (m) metrics.push(m);
  });
  return metrics.sort(function(a, b) { return b.closeRate - a.closeRate; });
}

// ── Render Agent Performance Dashboard ──
function renderAgentPerformance() {
  var m = document.getElementById('main-content');
  var allMetrics = getAllEmployeesMetrics();

  var html = '<div class="space-y-6 pb-6">' +
    // Header
    '<div>' +
    '<h1 class="text-3xl font-bold text-white mb-2" style="font-family:\'Syne\',sans-serif">Agent Performance Dashboard</h1>' +
    '<p class="text-slate-400 text-sm">Real-time performance metrics and KPIs for all agents</p>' +
    '</div>' +

    // Filters
    '<div class="flex gap-3 flex-wrap">' +
    '<select id="perf-campaign-filter" class="input" onchange="performanceFilter.campaign=this.value;renderAgentPerformance()">' +
    '<option value="">All Campaigns</option>' +
    S.campaigns.map(function(c) {
      return '<option value="' + c.id + '" ' + (performanceFilter.campaign === c.id ? 'selected' : '') + '>' + esc(c.name) + '</option>';
    }).join('') +
    '</select>' +
    '</div>' +

    // Summary Cards
    '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">' +
    buildSummaryCard('Total Agents', allMetrics.length, '#3b82f6', 'users') +
    buildSummaryCard('Active Agents', allMetrics.filter(function(m) { return m.isActive; }).length, '#10b981', 'user-check') +
    buildSummaryCard('Total Clients', S.clients.length, '#8b5cf6', 'contact') +
    buildSummaryCard('Closed Clients', S.clients.filter(function(c) { return c.status === 'Closed'; }).length, '#f59e0b', 'check-circle') +
    '</div>' +

    // Performance Leaderboard
    '<div class="card">' +
    '<div class="flex items-center gap-2 mb-4">' +
    '<i data-lucide="trophy" class="w-5 h-5 text-amber-400"></i>' +
    '<h2 class="text-lg font-bold text-white">Performance Leaderboard</h2>' +
    '</div>' +
    buildPerformanceLeaderboard(allMetrics) +
    '</div>' +

    // Detailed Metrics Table
    '<div class="card">' +
    '<div class="flex items-center gap-2 mb-4">' +
    '<i data-lucide="bar-chart-3" class="w-5 h-5 text-blue-400"></i>' +
    '<h2 class="text-lg font-bold text-white">Detailed Metrics</h2>' +
    '</div>' +
    buildPerformanceTable(allMetrics) +
    '</div>' +

    // Overdue Follow-ups Alert
    buildOverdueFollowupsSection(allMetrics) +

    '</div>';

  m.innerHTML = html;
  lucide.createIcons();
}

// ── Build Summary Card ──
function buildSummaryCard(label, value, color, icon) {
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

// ── Build Performance Leaderboard ──
function buildPerformanceLeaderboard(metrics) {
  if (!metrics.length) return '<p class="text-slate-400 text-sm">No agents available</p>';

  var html = '<div class="space-y-3">';
  metrics.slice(0, 10).forEach(function(m, idx) {
    var medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1);
    var statusBadge = m.isActive ? '<span class="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">Active</span>' : 
                      '<span class="text-xs px-2 py-1 rounded bg-slate-500/20 text-slate-300">Inactive</span>';
    
    html += '<div class="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">' +
      '<div class="flex items-center gap-3 flex-1">' +
      '<span class="text-lg font-bold" style="min-width:30px">' + medal + '</span>' +
      av(m.name, m.color, 32) +
      '<div class="flex-1 min-w-0">' +
      '<p class="text-sm font-semibold text-white">' + esc(m.name) + '</p>' +
      '<p class="text-xs text-slate-400">' + m.totalClients + ' clients · ' + m.totalCalls + ' calls</p>' +
      '</div>' +
      '</div>' +
      '<div class="flex items-center gap-4 flex-wrap justify-end">' +
      '<div class="text-right">' +
      '<p class="text-sm font-bold text-white">' + m.closeRate + '%</p>' +
      '<p class="text-xs text-slate-400">Close Rate</p>' +
      '</div>' +
      statusBadge +
      '</div>' +
      '</div>';
  });
  html += '</div>';
  return html;
}

// ── Build Performance Table ──
function buildPerformanceTable(metrics) {
  if (!metrics.length) return '<p class="text-slate-400 text-sm">No agents available</p>';

  var html = '<div class="overflow-x-auto">' +
    '<table class="w-full text-sm">' +
    '<thead>' +
    '<tr class="border-b border-white/10">' +
    '<th class="text-left py-3 px-4 text-slate-400 font-semibold">Agent</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Clients</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Closed</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Calls</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Answer Rate</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Contact Rate</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Conversion Rate</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Avg Follow-up Delay</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Productivity</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Close Rate</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Overdue</th>' +
    '<th class="text-center py-3 px-4 text-slate-400 font-semibold">Status</th>' +
    '</tr>' +
    '</thead>' +
    '<tbody>';

  metrics.forEach(function(m, idx) {
    var statusColor = m.isActive ? 'text-emerald-400' : 'text-slate-400';
    var statusText = m.isActive ? 'Active' : 'Inactive';
    
    html += '<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">' +
      '<td class="py-3 px-4"><div class="flex items-center gap-2">' + av(m.name, m.color, 28) + '<span class="text-white">' + esc(m.name) + '</span></div></td>' +
      '<td class="py-3 px-4 text-center text-white font-semibold">' + m.totalClients + '</td>' +
      '<td class="py-3 px-4 text-center text-white font-semibold">' + m.closedClients + '</td>' +
      '<td class="py-3 px-4 text-center text-white font-semibold">' + m.totalCalls + '</td>' +
      '<td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-semibold">' + m.answerRate + '%</span></td>' +
      '<td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-semibold">' + m.contactRate + '%</span></td>' +
      '<td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300 text-xs font-semibold">' + m.conversionRate + '%</span></td>' +
      '<td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded ' + (m.avgFollowupDelay > 3 ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300') + ' text-xs font-semibold">' + m.avgFollowupDelay + 'd</span></td>' +
      '<td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 text-xs font-semibold">' + m.agentProductivity.toFixed(2) + '</span></td>' +
      '<td class="py-3 px-4 text-center"><span class="px-2 py-1 rounded ' + (m.closeRate >= 50 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300') + ' text-xs font-semibold">' + m.closeRate + '%</span></td>' +
      '<td class="py-3 px-4 text-center text-white font-semibold">' + (m.overdueFollowups > 0 ? '<span class="px-2 py-1 rounded bg-red-500/20 text-red-300 text-xs font-bold">' + m.overdueFollowups + '</span>' : '0') + '</td>' +
      '<td class="py-3 px-4 text-center"><span class="text-xs font-semibold ' + statusColor + '">' + statusText + '</span></td>' +
      '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

// ── Build Overdue Follow-ups Section ──
function buildOverdueFollowupsSection(metrics) {
  var overdueClients = [];
  S.clients.forEach(function(c) {
    if (c.next_followup_date && new Date(c.next_followup_date) < new Date() && c.status !== 'Closed') {
      var emp = empById(c.assigned_employee_id);
      overdueClients.push({ client: c, employee: emp });
    }
  });

  if (!overdueClients.length) {
    return '<div class="card border-emerald-500/20 bg-emerald-500/5">' +
      '<div class="flex items-center gap-2">' +
      '<i data-lucide="check-circle" class="w-5 h-5 text-emerald-400"></i>' +
      '<p class="text-emerald-300 text-sm font-semibold">✓ All follow-ups are up to date!</p>' +
      '</div></div>';
  }

  var html = '<div class="card border-red-500/20 bg-red-500/5">' +
    '<div class="flex items-center gap-2 mb-4">' +
    '<i data-lucide="alert-circle" class="w-5 h-5 text-red-400"></i>' +
    '<h2 class="text-lg font-bold text-red-300">' + overdueClients.length + ' Overdue Follow-ups</h2>' +
    '</div>' +
    '<div class="space-y-2 max-h-96 overflow-y-auto">';

  overdueClients.slice(0, 20).forEach(function(item) {
    var daysOverdue = Math.floor((new Date() - new Date(item.client.next_followup_date)) / (1000 * 60 * 60 * 24));
    html += '<div class="flex items-center justify-between p-2 rounded bg-white/5">' +
      '<div class="flex-1 min-w-0">' +
      '<p class="text-sm font-semibold text-white">' + esc(item.client.name) + '</p>' +
      '<p class="text-xs text-slate-400">' + (item.employee ? esc(item.employee.name) : 'Unassigned') + '</p>' +
      '</div>' +
      '<span class="text-xs px-2 py-1 rounded bg-red-500/20 text-red-300 font-semibold">' + daysOverdue + ' days overdue</span>' +
      '</div>';
  });

  if (overdueClients.length > 20) {
    html += '<p class="text-xs text-slate-400 text-center py-2">... and ' + (overdueClients.length - 20) + ' more</p>';
  }

  html += '</div></div>';
  return html;
}

// ── Avatar helper ──
function av(name, color, size) {
  var initials = name.split(' ').map(function(n) { return n[0]; }).join('').toUpperCase().substring(0, 2);
  return '<div class="flex items-center justify-center rounded-full font-bold text-white" style="width:' + size + 'px;height:' + size + 'px;background:' + color + ';font-size:' + Math.round(size * 0.4) + 'px">' + initials + '</div>';
}

// ── Escape HTML ──
function esc(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
