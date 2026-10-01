// ============================================================
// PAGE REPORTS
// ============================================================
// Filters: campaign, campaign type, employee, status, call result,
// satisfaction, form, attempts, date (by client added OR by call date), search.
// Views: Clients · By Agent · By Campaign · Daily · Best Hours
// Export: one XLSX workbook with every view as a sheet (respects filters).

var RPT_RESULTS = [
  { value: 'not_called',   label: 'Not Called',   emoji: '⚪', color: '#64748b', icon: 'phone-off'    },
  { value: 'no_answer',    label: 'No Answer',    emoji: '🔇', color: '#f59e0b', icon: 'phone-missed' },
  { value: 'answered',     label: 'Answered',     emoji: '✅', color: '#10b981', icon: 'phone-call'   },
  { value: 'wrong_number', label: 'Wrong Number', emoji: '📵', color: '#ef4444', icon: 'x-circle'     },
  { value: 'closed',       label: 'Closed',       emoji: '🏁', color: '#8b5cf6', icon: 'check-circle' }
];

var RPT_MOODS = [
  { value: 'interested', label: 'Satisfied',     emoji: '🟢', color: '#10b981' },
  { value: 'neutral',    label: 'Normal',        emoji: '🟡', color: '#f59e0b' },
  { value: 'refused',    label: 'Not Satisfied', emoji: '🔴', color: '#ef4444' }
];

var RPT_DEFAULTS = {
  campaign: '', campType: '', employee: '', status: '', result: '', mood: '',
  form: '', vip: '', attempts: '', dateBasis: 'created', dateFrom: '', dateTo: '',
  search: '', view: 'clients', page: 0
};

var _rptSearchTimer = null;

// Fill any missing keys (logout resets rptFilter to the old shape)
function rptEnsureDefaults(){
  if (!rptFilter) rptFilter = {};
  Object.keys(RPT_DEFAULTS).forEach(function(k){
    if (rptFilter[k] === undefined) rptFilter[k] = RPT_DEFAULTS[k];
  });
}

function rptResetFilters(){
  var view = rptFilter.view;
  rptFilter = JSON.parse(JSON.stringify(RPT_DEFAULTS));
  rptFilter.view = view || 'clients';
  renderReports();
}

function rptSet(key, val){
  rptFilter[key] = val;
  rptFilter.page = 0;
  renderReports();
}

function rptToggle(key, val){
  rptSet(key, rptFilter[key] === val ? '' : val);
}

function rptQuick(result, mood, attempts){
  rptFilter.result = result;
  rptFilter.mood = mood;
  rptFilter.attempts = attempts;
  rptFilter.view = 'clients';
  rptFilter.page = 0;
  renderReports();
}

function rptSearchInput(val){
  clearTimeout(_rptSearchTimer);
  _rptSearchTimer = setTimeout(function(){
    rptFilter.search = val;
    rptFilter.page = 0;
    renderReports();
    var el = document.getElementById('rpt-search');
    if (el){ el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
  }, 350);
}

// ── Date helpers ─────────────────────────────────────────────
function rptPad(n){ return n < 10 ? '0' + n : '' + n; }
function rptLocalDay(ts){
  var d = new Date(ts);
  return d.getFullYear() + '-' + rptPad(d.getMonth() + 1) + '-' + rptPad(d.getDate());
}
function rptInRange(ts){
  if (!ts) return false;
  var day = rptLocalDay(ts);
  if (rptFilter.dateFrom && day < rptFilter.dateFrom) return false;
  if (rptFilter.dateTo && day > rptFilter.dateTo) return false;
  return true;
}
function rptHasRange(){ return !!(rptFilter.dateFrom || rptFilter.dateTo); }

function rptPreset(p){
  var now = new Date();
  var today = rptLocalDay(now);
  var from = today, to = today;
  if (p === 'yesterday'){
    var y = new Date(now); y.setDate(y.getDate() - 1);
    from = to = rptLocalDay(y);
  } else if (p === '7d'){
    var s = new Date(now); s.setDate(s.getDate() - 6);
    from = rptLocalDay(s);
  } else if (p === 'month'){
    from = now.getFullYear() + '-' + rptPad(now.getMonth() + 1) + '-01';
  } else if (p === 'all'){
    from = ''; to = '';
  }
  rptFilter.dateFrom = from;
  rptFilter.dateTo = to;
  rptFilter.page = 0;
  renderReports();
}

// Did the client ever pick up? (independent of Closed status)
function rptReached(r){ return r.answeredCalls > 0 ? 'Answered' : (r.attempts > 0 ? 'No Answer' : 'Not Called'); }

function rptPct(a, b){ return b > 0 ? Math.round(a / b * 100) : 0; }
function rptResultMeta(v){ return RPT_RESULTS.find(function(r){ return r.value === v; }); }
function rptMoodMeta(v){ return RPT_MOODS.find(function(m){ return m.value === v; }); }

// Collect all unique visible columns across all campaigns (used when no campaign filter)
function getAllCampaignVisCols(){
  var seenKeys = {};
  var cols = [];
  S.campaigns.forEach(function(camp){
    var campCols = (camp.column_config && camp.column_config.length)
      ? camp.column_config.filter(function(c){ return c.visible !== false; })
      : DEFAULT_COLUMNS.filter(function(c){ return c.visible; });
    campCols.forEach(function(c){
      if(!seenKeys[c.key]){
        seenKeys[c.key] = true;
        cols.push(c);
      }
    });
  });
  return cols.length ? cols : DEFAULT_COLUMNS.filter(function(c){ return c.visible; });
}

// ============================================================
// DATA ENGINE — builds everything the page and the export need
// ============================================================
function rptBuild(){
  rptEnsureDefaults();
  var callMode = rptFilter.dateBasis === 'call' && rptHasRange();

  // History grouped per client (S.contactHistory is newest-first)
  var histMap = {};
  (S.contactHistory || []).forEach(function(h){
    if (callMode && !rptInRange(h.created_at)) return;
    (histMap[h.client_id] = histMap[h.client_id] || []).push(h);
  });

  var campTypeOf = {};
  S.campaigns.forEach(function(c){ campTypeOf[c.id] = c.type || 'General'; });

  // ── Step 1: base filters (do NOT depend on call result) ──
  var base = S.clients.filter(function(c){
    if (rptFilter.campaign && c.campaign_id !== rptFilter.campaign) return false;
    if (rptFilter.campType && campTypeOf[c.campaign_id] !== rptFilter.campType) return false;
    if (rptFilter.employee === '__none__'){ if (c.assigned_employee_id) return false; }
    else if (rptFilter.employee && c.assigned_employee_id !== rptFilter.employee) return false;
    if (rptFilter.status && c.status !== rptFilter.status) return false;
    var ex = c.extra_data || {};
    if (rptFilter.form === 'submitted' && !ex.form_submitted) return false;
    if (rptFilter.form === 'pending' && ex.form_submitted) return false;
    if (rptFilter.vip === 'vip' && ex.vip !== true) return false;
    if (rptFilter.vip === 'normal' && ex.vip === true) return false;
    if (rptFilter.search && !clientMatchesSearch(c, rptFilter.search)) return false;
    if (rptHasRange()){
      if (callMode){ if (!histMap[c.id]) return false; }
      else if (!rptInRange(c.created_at)) return false;
    }
    return true;
  });

  // ── Step 2: per-client call info ──
  var rows = base.map(function(c){
    var hist = histMap[c.id] || [];
    var latest = hist[0] || null;
    var result;
    if (c.status === 'Closed') result = 'closed';
    else if (!latest) result = 'not_called';
    else if (latest.outcome === 'answered' || latest.outcome === 'wrong_number' || latest.outcome === 'no_answer') result = latest.outcome;
    else result = 'not_called';
    var lastAns = hist.find(function(h){ return h.outcome === 'answered'; });
    var firstAnsIdx = -1;
    for (var i = hist.length - 1; i >= 0; i--){ if (hist[i].outcome === 'answered'){ firstAnsIdx = i; break; } }
    return {
      c: c,
      hist: hist,
      result: result,
      mood: lastAns ? (lastAns.mood || '') : '',
      attempts: hist.length,
      vip: (c.extra_data || {}).vip === true,
      answeredCalls: hist.filter(function(h){ return h.outcome === 'answered'; }).length,
      // attempts until the first answer (counted oldest-first)
      attemptsToAnswer: firstAnsIdx >= 0 ? (hist.length - firstAnsIdx) : null,
      lastCall: latest ? latest.created_at : '',
      lastNote: latest ? (latest.note || '') : ''
    };
  });

  // KPI counts are taken BEFORE result/mood/attempt filters so the cards work as toggles
  var kpiRows = rows;

  // ── Step 3: result-dependent filters ──
  rows = rows.filter(function(r){
    if (rptFilter.result && r.result !== rptFilter.result) return false;
    if (rptFilter.mood && r.mood !== rptFilter.mood) return false;
    if (rptFilter.attempts === '0' && r.attempts !== 0) return false;
    if (rptFilter.attempts === '1' && r.attempts !== 1) return false;
    if (rptFilter.attempts === '2' && r.attempts !== 2) return false;
    if (rptFilter.attempts === '3+' && r.attempts < 3) return false;
    return true;
  });

  // All calls belonging to the final row set
  var calls = [];
  rows.forEach(function(r){ r.hist.forEach(function(h){ calls.push({ h: h, r: r }); }); });

  return { callMode: callMode, kpiRows: kpiRows, rows: rows, calls: calls };
}

function rptSummary(rows, calls){
  var s = { clients: rows.length, calls: calls.length, ansCalls: 0, naCalls: 0, wnCalls: 0,
            byResult: {}, byMood: {}, form: 0, touched: 0, reached: 0, closed: 0,
            attToAnsSum: 0, attToAnsN: 0 };
  RPT_RESULTS.forEach(function(r){ s.byResult[r.value] = 0; });
  RPT_MOODS.forEach(function(m){ s.byMood[m.value] = 0; });
  rows.forEach(function(r){
    s.byResult[r.result]++;
    if (r.mood && s.byMood[r.mood] !== undefined) s.byMood[r.mood]++;
    if ((r.c.extra_data || {}).form_submitted) s.form++;
    if (r.attempts > 0) s.touched++;
    if (r.answeredCalls > 0) s.reached++;
    if (r.c.status === 'Closed') s.closed++;
    if (r.attemptsToAnswer){ s.attToAnsSum += r.attemptsToAnswer; s.attToAnsN++; }
  });
  calls.forEach(function(x){
    if (x.h.outcome === 'answered') s.ansCalls++;
    else if (x.h.outcome === 'no_answer') s.naCalls++;
    else if (x.h.outcome === 'wrong_number') s.wnCalls++;
  });
  var moodTotal = RPT_MOODS.reduce(function(a, m){ return a + s.byMood[m.value]; }, 0);
  s.satPct = rptPct(s.byMood.interested, moodTotal);
  s.answerRate = rptPct(s.ansCalls, s.calls);
  s.reachRate = rptPct(s.reached, s.clients);
  s.coverage = rptPct(s.touched, s.clients);
  s.avgAttToAns = s.attToAnsN ? Math.round(s.attToAnsSum / s.attToAnsN * 10) / 10 : 0;
  return s;
}

function rptGroup(rows, keyFn){
  var groups = {};
  rows.forEach(function(r){
    var k = keyFn(r) || '__none__';
    (groups[k] = groups[k] || []).push(r);
  });
  return Object.keys(groups).map(function(k){
    var rs = groups[k];
    var cs = [];
    rs.forEach(function(r){ r.hist.forEach(function(h){ cs.push({ h: h, r: r }); }); });
    return { key: k, s: rptSummary(rs, cs) };
  }).sort(function(a, b){ return b.s.clients - a.s.clients; });
}

function rptCallBuckets(calls, keyFn){
  var b = {};
  calls.forEach(function(x){
    var k = keyFn(x.h);
    if (!b[k]) b[k] = { key: k, total: 0, answered: 0, no_answer: 0, wrong_number: 0 };
    b[k].total++;
    if (b[k][x.h.outcome] !== undefined) b[k][x.h.outcome]++;
  });
  return b;
}

// ============================================================
// RENDER
// ============================================================
function renderReports(){
  rptEnsureDefaults();
  var m = document.getElementById('main-content');
  var D = rptBuild();
  var K = rptSummary(D.kpiRows, []);
  var S2 = rptSummary(D.rows, D.calls);

  var campTypes = {};
  S.campaigns.forEach(function(c){ campTypes[c.type || 'General'] = true; });
  var statuses = { New: 1, Contacted: 1, Closed: 1 };
  S.clients.forEach(function(c){ if (c.status) statuses[c.status] = 1; });

  function sel(key, allLabel, opts){
    return '<select class="input" onchange="rptSet(\'' + key + '\',this.value)">' +
      '<option value="">' + allLabel + '</option>' +
      opts.map(function(o){
        return '<option value="' + esc(o.v) + '" ' + (rptFilter[key] === o.v ? 'selected' : '') + '>' + esc(o.l) + '</option>';
      }).join('') + '</select>';
  }

  function kpi(r, count){
    var active = rptFilter.result === r.value;
    return '<div class="card card-hover cursor-pointer text-center" ' +
      'style="padding:14px;' + (active ? 'border-color:' + r.color + ';box-shadow:0 0 0 1px ' + r.color : '') + '" ' +
      'onclick="rptToggle(\'result\',\'' + r.value + '\')">' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px">' +
        '<i data-lucide="' + r.icon + '" style="width:14px;height:14px;color:' + r.color + '"></i>' +
        '<p class="text-slate-400 text-xs">' + r.label + '</p></div>' +
      '<p class="text-2xl font-bold" style="color:' + r.color + '">' + count + '</p>' +
      '<p class="text-xs text-slate-500">' + rptPct(count, K.clients) + '%</p>' +
    '</div>';
  }

  function chip(key, val, label, color){
    var active = rptFilter[key] === val;
    return '<button class="btn btn-sm ' + (active ? 'btn-primary' : 'btn-ghost') + '" ' +
      (active && color ? 'style="background:' + color + ';border-color:' + color + '" ' : '') +
      'onclick="rptToggle(\'' + key + '\',\'' + val + '\')">' + label + '</button>';
  }

  var activeCount = Object.keys(RPT_DEFAULTS).filter(function(k){
    return k !== 'view' && k !== 'page' && k !== 'dateBasis' && rptFilter[k] !== RPT_DEFAULTS[k];
  }).length;

  var html = hdr('Reports & Export', 'Every filter here is applied to the table and to the export',
    (activeCount ? '<button class="btn btn-ghost btn-sm" onclick="rptResetFilters()"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reset (' + activeCount + ')</button>' : '') +
    '<button class="btn btn-primary btn-sm" onclick="exportReportXLSX()"><i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i> Export Excel (' + D.rows.length + ')</button>');

  // ── Filters card ──
  html += '<div class="card mb-4 fade-in">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px">' +
      sel('campaign', 'All Campaigns', S.campaigns.map(function(c){ return { v: c.id, l: c.name }; })) +
      sel('campType', 'All Campaign Types', Object.keys(campTypes).sort().map(function(t){ return { v: t, l: t }; })) +
      sel('employee', 'All Employees', [{ v: '__none__', l: '— Unassigned —' }].concat(S.employees.map(function(e){ return { v: e.id, l: e.name + (e.is_active ? '' : ' (inactive)') }; }))) +
      sel('status', 'All Status', Object.keys(statuses).map(function(s){ return { v: s, l: s }; })) +
      sel('result', 'All Call Results', RPT_RESULTS.map(function(r){ return { v: r.value, l: r.emoji + ' ' + r.label }; })) +
      sel('mood', 'All Satisfaction', RPT_MOODS.map(function(mo){ return { v: mo.value, l: mo.emoji + ' ' + mo.label }; })) +
      sel('form', 'Form: Any', [{ v: 'submitted', l: 'Form Submitted' }, { v: 'pending', l: 'Form Not Submitted' }]) +
      sel('vip', 'VIP + Normal', [{ v: 'vip', l: 'VIP only' }, { v: 'normal', l: 'Normal only' }]) +
      sel('attempts', 'Any # of Attempts', [{ v: '0', l: '0 attempts' }, { v: '1', l: '1 attempt' }, { v: '2', l: '2 attempts' }, { v: '3+', l: '3+ attempts' }]) +
      '<input id="rpt-search" class="input" placeholder="Search name / phone..." value="' + esc(rptFilter.search) + '" oninput="rptSearchInput(this.value)">' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06)">' +
      '<span class="text-xs text-slate-500">Date by:</span>' +
      '<button class="btn btn-sm ' + (rptFilter.dateBasis === 'created' ? 'btn-primary' : 'btn-ghost') + '" onclick="rptSet(\'dateBasis\',\'created\')">Client added</button>' +
      '<button class="btn btn-sm ' + (rptFilter.dateBasis === 'call' ? 'btn-primary' : 'btn-ghost') + '" onclick="rptSet(\'dateBasis\',\'call\')">Call date</button>' +
      '<input type="date" class="input" style="max-width:160px" value="' + rptFilter.dateFrom + '" onchange="rptSet(\'dateFrom\',this.value)">' +
      '<span class="text-xs text-slate-500">to</span>' +
      '<input type="date" class="input" style="max-width:160px" value="' + rptFilter.dateTo + '" onchange="rptSet(\'dateTo\',this.value)">' +
      '<button class="btn btn-ghost btn-sm" onclick="rptPreset(\'today\')">Today</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="rptPreset(\'yesterday\')">Yesterday</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="rptPreset(\'7d\')">Last 7 days</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="rptPreset(\'month\')">This month</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="rptPreset(\'all\')">All time</button>' +
    '</div>' +
    (D.callMode ? '<p class="text-xs text-slate-500 mt-2">Call-date mode: only clients called in this period, and results/attempts count only calls inside the period.</p>' : '') +
  '</div>';

  // ── Result KPI cards (click = filter) ──
  html += '<div class="fade-in mb-4" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">' +
    '<div class="card card-hover cursor-pointer text-center" style="padding:14px" onclick="rptSet(\'result\',\'\')">' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px"><i data-lucide="users" style="width:14px;height:14px;color:#3b82f6"></i><p class="text-slate-400 text-xs">Total</p></div>' +
      '<p class="text-2xl font-bold" style="color:#3b82f6">' + K.clients + '</p><p class="text-xs text-slate-500">clients</p></div>' +
    RPT_RESULTS.map(function(r){ return kpi(r, K.byResult[r.value]); }).join('') +
  '</div>';

  // ── Satisfaction chips + quick lists ──
  html += '<div class="flex gap-2 mb-4 items-center flex-wrap fade-in">' +
    '<span class="text-xs text-slate-500">Satisfaction:</span>' +
    RPT_MOODS.map(function(mo){ return chip('mood', mo.value, mo.emoji + ' ' + mo.label + ' <span style="opacity:.7;font-size:10px">(' + K.byMood[mo.value] + ')</span>', mo.color); }).join('') +
    '<span class="text-xs text-slate-500" style="margin-left:8px">Quick lists:</span>' +
    '<button class="btn btn-sm btn-ghost" onclick="rptQuick(\'no_answer\',\'\',\'3+\')" title="Still not answering after 3+ calls">🔁 No answer 3+ times</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="rptQuick(\'\',\'refused\',\'\')" title="Answered but not satisfied">⚠️ Not satisfied</button>' +
    '<button class="btn btn-sm btn-ghost" onclick="rptQuick(\'wrong_number\',\'\',\'\')" title="Numbers to fix or clean up">📵 Data to fix</button>' +
  '</div>';

  html += '<div class="card mb-4 fade-in" style="padding:12px 16px">' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;text-align:center">' +
      rptMini('Call attempts', S2.calls) +
      rptMini('Answer rate', S2.answerRate + '%', 'answered calls ÷ all attempts') +
      rptMini('Reach rate', S2.reachRate + '%', 'clients answered at least once') +
      rptMini('Coverage', S2.coverage + '%', 'clients called at least once') +
      rptMini('Avg tries to answer', S2.avgAttToAns || '-', 'average attempts until the first answer') +
      rptMini('Satisfaction', S2.satPct + '%', 'satisfied ÷ rated answered clients') +
      rptMini('VIP', D.rows.filter(function(r){ return r.vip; }).length) +
      rptMini('Form submitted', S2.form + ' (' + rptPct(S2.form, S2.clients) + '%)') +
    '</div></div>';

  // ── View tabs ──
  var views = [
    { k: 'clients',   l: 'Clients',     i: 'list' },
    { k: 'agents',    l: 'By Agent',    i: 'user-check' },
    { k: 'campaigns', l: 'By Campaign', i: 'target' },
    { k: 'daily',     l: 'Daily',       i: 'calendar' },
    { k: 'hourly',    l: 'Best Hours',  i: 'clock' }
  ];
  html += '<div class="flex gap-2 mb-4 flex-wrap border-b border-white/10 pb-2 fade-in">' +
    views.map(function(v){
      return '<button class="btn btn-sm ' + (rptFilter.view === v.k ? 'btn-primary' : 'btn-ghost') + '" onclick="rptFilter.view=\'' + v.k + '\';renderReports()">' +
        '<i data-lucide="' + v.i + '" class="w-3.5 h-3.5"></i> ' + v.l + '</button>';
    }).join('') +
    '<div style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-ghost btn-sm" onclick="exportQaCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Q&A CSV</button>' +
      '<button class="btn btn-ghost btn-sm" onclick="exportCampSummaryCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Campaigns CSV</button>' +
    '</div>' +
  '</div>';

  if (rptFilter.view === 'agents') html += rptRenderGroupTable(rptAgentGroups(D.rows), 'Agent');
  else if (rptFilter.view === 'campaigns') html += rptRenderGroupTable(rptCampaignGroups(D.rows), 'Campaign');
  else if (rptFilter.view === 'daily') html += rptRenderDaily(D.calls);
  else if (rptFilter.view === 'hourly') html += rptRenderHourly(D.calls);
  else html += rptRenderClients(D.rows);

  m.innerHTML = html;
  lucide.createIcons();
}

function rptMini(label, value, hint){
  return '<div' + (hint ? ' title="' + esc(hint) + '"' : '') + '>' +
    '<p class="text-lg font-bold text-white">' + value + '</p>' +
    '<p class="text-xs text-slate-500">' + label + '</p></div>';
}

function rptResultBadge(v){
  var r = rptResultMeta(v);
  if (!r) return '-';
  return '<span style="font-size:11px;padding:2px 8px;border-radius:6px;white-space:nowrap;background:' + r.color + '1f;color:' + r.color + ';border:1px solid ' + r.color + '33">' + r.emoji + ' ' + r.label + '</span>';
}

function rptRenderClients(rows){
  var totalPages = Math.ceil(rows.length / RPT_PAGE_SIZE) || 1;
  if (rptFilter.page >= totalPages) rptFilter.page = 0;
  var pageRows = rows.slice(rptFilter.page * RPT_PAGE_SIZE, (rptFilter.page + 1) * RPT_PAGE_SIZE);
  var visCols = rptFilter.campaign ? getVisibleCols(rptFilter.campaign) : getAllCampaignVisCols();

  var out = '<div class="card fade-in"><div class="flex items-center justify-between mb-4 flex-wrap gap-2">' +
    '<h3 class="text-sm font-bold text-white">Results</h3>' +
    '<div class="flex items-center gap-3"><span class="text-xs text-slate-400">' + rows.length + ' total · Page ' + (rptFilter.page + 1) + '/' + totalPages + '</span>' +
    '<div class="flex gap-1">' +
    '<button class="btn btn-ghost btn-sm" ' + (rptFilter.page === 0 ? 'disabled style="opacity:0.4"' : '') + ' onclick="rptFilter.page--;renderReports()"><i data-lucide="chevron-left" class="w-3.5 h-3.5"></i></button>' +
    '<button class="btn btn-ghost btn-sm" ' + (rptFilter.page >= totalPages - 1 ? 'disabled style="opacity:0.4"' : '') + ' onclick="rptFilter.page++;renderReports()"><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i></button>' +
    '</div></div></div>';

  if (!pageRows.length) return out + '<p class="text-slate-500 text-sm text-center py-6">No results</p></div>';

  var th = function(t){ return '<th class="pb-3 pr-4" style="white-space:nowrap">' + t + '</th>'; };
  out += '<div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">' +
    visCols.map(function(c){ return th(esc(c.label)); }).join('') +
    (rptFilter.campaign ? '' : th('Campaign')) +
    th('VIP') + th('Employee') + th('Status') + th('Call Result') + th('Satisfaction') + th('Attempts') + th('Last Call') + th('Last Note') + th('Form') +
    '</tr></thead><tbody>' +
    pageRows.map(function(r){
      var c = r.c, ex = c.extra_data || {};
      var ep = empById(c.assigned_employee_id), cp = campById(c.campaign_id);
      var mo = rptMoodMeta(r.mood);
      var td = function(v, cls){ return '<td class="py-2.5 pr-4 text-xs ' + (cls || 'text-slate-300') + '">' + v + '</td>'; };
      return '<tr class="table-row border-b border-white/[0.03]">' +
        visCols.map(function(col){ return td(esc(ex[col.key] || c[col.key] || '-')); }).join('') +
        (rptFilter.campaign ? '' : td(esc(cp ? cp.name : '-'), 'text-slate-400')) +
        td(r.vip ? '👑 VIP' : '-', r.vip ? 'text-amber-400' : 'text-slate-500') +
        td(esc(ep ? ep.name : '-'), 'text-slate-400') +
        '<td class="py-2.5 pr-4">' + sBadge(c.status) + '</td>' +
        '<td class="py-2.5 pr-4">' + rptResultBadge(r.result) + '</td>' +
        td(mo ? mo.emoji + ' ' + mo.label : '-') +
        td(r.attempts, r.attempts >= 3 ? 'text-amber-400' : 'text-slate-300') +
        td(r.lastCall ? fmtDT(r.lastCall) : '-', 'text-slate-400') +
        '<td class="py-2.5 pr-4 text-xs text-slate-400" style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(r.lastNote) + '">' + esc(r.lastNote || '-') + '</td>' +
        td(ex.form_submitted ? '✅' : '-') +
      '</tr>';
    }).join('') + '</tbody></table></div></div>';
  return out;
}

function rptAgentGroups(rows){
  return rptGroup(rows, function(r){ return r.c.assigned_employee_id; }).map(function(g){
    var e = empById(g.key);
    g.label = g.key === '__none__' ? '— Unassigned —' : (e ? e.name : 'Unknown');
    return g;
  });
}
function rptCampaignGroups(rows){
  return rptGroup(rows, function(r){ return r.c.campaign_id; }).map(function(g){
    var c = campById(g.key);
    g.label = c ? c.name + (c.type ? ' · ' + c.type : '') : 'Unknown';
    return g;
  });
}

function rptGroupRow(g){
  var s = g.s;
  return [g.label, s.clients, s.byResult.not_called, s.byResult.no_answer, s.byResult.answered, s.byResult.wrong_number, s.byResult.closed,
    s.calls, s.answerRate + '%', s.reachRate + '%', s.byMood.interested, s.byMood.neutral, s.byMood.refused, s.satPct + '%', s.form];
}
var RPT_GROUP_HEADERS = ['Clients', 'Not Called', 'No Answer', 'Answered', 'Wrong #', 'Closed',
  'Attempts', 'Answer %', 'Reach %', 'Satisfied', 'Normal', 'Not Satisfied', 'Satisf. %', 'Forms'];

function rptRenderGroupTable(groups, firstCol){
  if (!groups.length) return '<div class="card text-center py-10 fade-in"><p class="text-slate-500">No data</p></div>';
  return '<div class="card fade-in"><div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">' +
    [firstCol].concat(RPT_GROUP_HEADERS).map(function(h){ return '<th class="pb-3 pr-4" style="white-space:nowrap">' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    groups.map(function(g){
      return '<tr class="table-row border-b border-white/[0.03]">' +
        rptGroupRow(g).map(function(v, i){
          return '<td class="py-2.5 pr-4 text-xs ' + (i === 0 ? 'text-white font-semibold' : 'text-slate-300') + '" style="white-space:nowrap">' + esc(v) + '</td>';
        }).join('') + '</tr>';
    }).join('') + '</tbody></table></div></div>';
}

function rptDailyRows(calls){
  var b = rptCallBuckets(calls, function(h){ return rptLocalDay(h.created_at); });
  return Object.keys(b).sort().reverse().map(function(k){ return b[k]; });
}
function rptHourlyRows(calls){
  var b = rptCallBuckets(calls, function(h){ return new Date(h.created_at).getHours(); });
  return Object.keys(b).map(Number).sort(function(a, z){ return a - z; }).map(function(k){ return b[k]; });
}
function rptHourLabel(h){ h = Number(h); return rptPad(h) + ':00 – ' + rptPad((h + 1) % 24) + ':00'; }

function rptRenderBuckets(list, labelFn, firstCol, highlightBest){
  if (!list.length) return '<div class="card text-center py-10 fade-in"><p class="text-slate-500">No calls in this selection</p></div>';
  var best = null;
  if (highlightBest){
    list.forEach(function(x){
      if (x.total >= 5 && (!best || rptPct(x.answered, x.total) > rptPct(best.answered, best.total))) best = x;
    });
  }
  var max = Math.max.apply(null, list.map(function(x){ return x.total; }));
  return '<div class="card fade-in">' +
    (best ? '<p class="text-xs mb-3" style="color:#34d399">⭐ Best time to call: <b>' + labelFn(best.key) + '</b> — ' + rptPct(best.answered, best.total) + '% answer rate (' + best.total + ' calls)</p>' : '') +
    '<div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">' +
    [firstCol, 'Attempts', 'Answered', 'No Answer', 'Wrong #', 'Answer %', ''].map(function(h){ return '<th class="pb-3 pr-4">' + h + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    list.map(function(x){
      var rate = rptPct(x.answered, x.total);
      var isBest = best && best.key === x.key;
      return '<tr class="table-row border-b border-white/[0.03]"' + (isBest ? ' style="background:rgba(16,185,129,0.06)"' : '') + '>' +
        '<td class="py-2.5 pr-4 text-xs text-white" style="white-space:nowrap">' + labelFn(x.key) + '</td>' +
        '<td class="py-2.5 pr-4 text-xs text-slate-300">' + x.total + '</td>' +
        '<td class="py-2.5 pr-4 text-xs" style="color:#10b981">' + x.answered + '</td>' +
        '<td class="py-2.5 pr-4 text-xs" style="color:#f59e0b">' + x.no_answer + '</td>' +
        '<td class="py-2.5 pr-4 text-xs" style="color:#ef4444">' + x.wrong_number + '</td>' +
        '<td class="py-2.5 pr-4 text-xs text-slate-300">' + rate + '%</td>' +
        '<td class="py-2.5" style="min-width:140px"><div style="height:6px;border-radius:3px;background:rgba(255,255,255,0.05);overflow:hidden;display:flex;width:' + Math.max(4, Math.round(x.total / max * 100)) + '%">' +
          '<div style="background:#10b981;width:' + rptPct(x.answered, x.total) + '%"></div>' +
          '<div style="background:#f59e0b;width:' + rptPct(x.no_answer, x.total) + '%"></div>' +
          '<div style="background:#ef4444;width:' + rptPct(x.wrong_number, x.total) + '%"></div>' +
        '</div></td></tr>';
    }).join('') + '</tbody></table></div></div>';
}

function rptRenderDaily(calls){
  return rptRenderBuckets(rptDailyRows(calls), function(k){ return k; }, 'Day', false);
}
function rptRenderHourly(calls){
  return rptRenderBuckets(rptHourlyRows(calls), rptHourLabel, 'Hour', true);
}

// ============================================================
// EXPORTS
// ============================================================
function rptSheet(wb, name, aoa){
  var ws = XLSX.utils.aoa_to_sheet(aoa);
  if (aoa.length){
    var width = Math.max.apply(null, aoa.map(function(r){ return r.length; }));
    var cols = [];
    for (var ci = 0; ci < width; ci++){
      var max = 0;
      aoa.forEach(function(r){ max = Math.max(max, String(r[ci] == null ? '' : r[ci]).length); });
      cols.push({ wch: Math.min(max + 2, 45) });
    }
    ws['!cols'] = cols;
  }
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function rptFilterDescription(){
  var parts = [];
  var c = rptFilter.campaign && campById(rptFilter.campaign);
  var e = rptFilter.employee && empById(rptFilter.employee);
  if (c) parts.push(['Campaign', c.name]);
  if (rptFilter.campType) parts.push(['Campaign Type', rptFilter.campType]);
  if (rptFilter.employee === '__none__') parts.push(['Employee', 'Unassigned']);
  else if (e) parts.push(['Employee', e.name]);
  if (rptFilter.status) parts.push(['Status', rptFilter.status]);
  if (rptFilter.result) parts.push(['Call Result', rptResultMeta(rptFilter.result).label]);
  if (rptFilter.mood) parts.push(['Satisfaction', rptMoodMeta(rptFilter.mood).label]);
  if (rptFilter.form) parts.push(['Form', rptFilter.form === 'submitted' ? 'Submitted' : 'Not submitted']);
  if (rptFilter.vip) parts.push(['Client Type', rptFilter.vip === 'vip' ? 'VIP only' : 'Normal only']);
  if (rptFilter.attempts) parts.push(['Attempts', rptFilter.attempts]);
  if (rptHasRange()) parts.push(['Date (' + (rptFilter.dateBasis === 'call' ? 'call date' : 'client added') + ')', (rptFilter.dateFrom || '…') + ' → ' + (rptFilter.dateTo || '…')]);
  if (rptFilter.search) parts.push(['Search', rptFilter.search]);
  return parts;
}

function exportReportXLSX(){
  if (!window.XLSX){ toast('XLSX library not loaded', 'error'); return; }
  var D = rptBuild();
  if (!D.rows.length){ toast('No clients match these filters', 'info'); return; }
  var S2 = rptSummary(D.rows, D.calls);
  var wb = XLSX.utils.book_new();

  // 1) Summary
  var sum = [['Report', 'Generated ' + new Date().toLocaleString('en-GB')], []];
  var f = rptFilterDescription();
  sum.push(['Filters', f.length ? '' : 'None (all data)']);
  f.forEach(function(p){ sum.push(['  ' + p[0], p[1]]); });
  sum.push([]);
  sum.push(['Clients', S2.clients]);
  RPT_RESULTS.forEach(function(r){ sum.push(['  ' + r.label, S2.byResult[r.value] + ' (' + rptPct(S2.byResult[r.value], S2.clients) + '%)']); });
  sum.push([]);
  sum.push(['Call attempts', S2.calls]);
  sum.push(['  Answered', S2.ansCalls]);
  sum.push(['  No Answer', S2.naCalls]);
  sum.push(['  Wrong Number', S2.wnCalls]);
  sum.push(['Answer rate (answered ÷ attempts)', S2.answerRate + '%']);
  sum.push(['Reach rate (clients answered at least once)', S2.reachRate + '%']);
  sum.push(['Coverage (clients called at least once)', S2.coverage + '%']);
  sum.push(['Avg attempts until first answer', S2.avgAttToAns || '-']);
  sum.push([]);
  RPT_MOODS.forEach(function(mo){ sum.push([mo.label, S2.byMood[mo.value]]); });
  sum.push(['Satisfaction %', S2.satPct + '%']);
  sum.push(['Forms submitted', S2.form]);
  rptSheet(wb, 'Summary', sum);

  // 2) Clients (all columns from every campaign involved)
  var colMap = {}, cols = [];
  var campIds = {};
  D.rows.forEach(function(r){ campIds[r.c.campaign_id] = true; });
  Object.keys(campIds).forEach(function(cid){
    (campById(cid) ? getVisibleCols(cid) : DEFAULT_COLUMNS.filter(function(x){ return x.visible; })).forEach(function(c){
      if (c.key === 'vip' || c.key === '_vip_flag') return;
      if (!colMap[c.key]){ colMap[c.key] = true; cols.push(c); }
    });
  });
  var head = cols.map(function(c){ return c.label; }).concat(['Campaign', 'Campaign Type', 'Client Type', 'Employee', 'Status', 'Call Result', 'Reached', 'Satisfaction',
    'Attempts', 'Answered Calls', 'Tries to First Answer', 'Last Call', 'Last Note', 'Form Submitted', 'Form Submitted At', 'Added']);
  var body = D.rows.map(function(r){
    var c = r.c, ex = c.extra_data || {}, cp = campById(c.campaign_id), ep = empById(c.assigned_employee_id);
    var res = rptResultMeta(r.result), mo = rptMoodMeta(r.mood);
    return cols.map(function(col){ return ex[col.key] || c[col.key] || ''; }).concat([
      cp ? cp.name : '', cp ? (cp.type || '') : '', r.vip ? 'VIP' : 'Normal', ep ? ep.name : '', c.status || '',
      res ? res.label : '', rptReached(r), mo ? mo.label : '', r.attempts, r.answeredCalls, r.attemptsToAnswer || '',
      r.lastCall ? fmtDT(r.lastCall) : '', r.lastNote, ex.form_submitted ? 'Yes' : '', ex.form_submitted_at || '',
      c.created_at ? c.created_at.slice(0, 10) : ''
    ]);
  });
  rptSheet(wb, 'Clients', [head].concat(body));

  // 3) By Agent / By Campaign
  rptSheet(wb, 'By Agent', [['Agent'].concat(RPT_GROUP_HEADERS)].concat(rptAgentGroups(D.rows).map(rptGroupRow)));
  rptSheet(wb, 'By Campaign', [['Campaign'].concat(RPT_GROUP_HEADERS)].concat(rptCampaignGroups(D.rows).map(rptGroupRow)));

  // 4) Daily / Hourly
  var bHead = ['Attempts', 'Answered', 'No Answer', 'Wrong Number', 'Answer %'];
  var bRow = function(label, x){ return [label, x.total, x.answered, x.no_answer, x.wrong_number, rptPct(x.answered, x.total) + '%']; };
  rptSheet(wb, 'Daily', [['Day'].concat(bHead)].concat(rptDailyRows(D.calls).map(function(x){ return bRow(x.key, x); })));
  rptSheet(wb, 'By Hour', [['Hour'].concat(bHead)].concat(rptHourlyRows(D.calls).map(function(x){ return bRow(rptHourLabel(x.key), x); })));

  // 5) Call log (every attempt)
  var logHead = ['Date', 'Time', 'Client', 'Phone', 'Campaign', 'Employee', 'Outcome', 'Satisfaction', 'Note'];
  var log = D.calls.slice().sort(function(a, b){ return a.h.created_at < b.h.created_at ? 1 : -1; }).map(function(x){
    var h = x.h, c = x.r.c, ex = c.extra_data || {};
    var cp = campById(c.campaign_id), ep = empById(c.assigned_employee_id);
    var o = rptResultMeta(h.outcome), mo = rptMoodMeta(h.mood);
    var d = new Date(h.created_at);
    return [rptLocalDay(h.created_at), rptPad(d.getHours()) + ':' + rptPad(d.getMinutes()),
      c.name || ex.name || ex.customer || '', c.phone || '', cp ? cp.name : '', ep ? ep.name : '',
      o ? o.label : (h.outcome || ''), mo ? mo.label : '', h.note || ''];
  });
  rptSheet(wb, 'Call Log', [logHead].concat(log));

  var tag = rptFilter.result ? '_' + rptFilter.result : '';
  XLSX.writeFile(wb, 'Report' + tag + '_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  toast('Exported ' + D.rows.length + ' clients · ' + D.calls.length + ' calls ✓', 'success');
}

// Kept for backward compatibility (old button name) — now exports the filtered report
function exportClientsCSV(){ exportReportXLSX(); }

function exportQaCSV(){csvExport('qa.csv',['Employee','Question','Status','Reply','Date'],S.questions.map(function(q){return[q.employee_name||'',q.question_text,q.status,q.admin_reply||'',q.created_at];}));toast('Exported');}

function exportCampSummaryCSV(){
  var hist = {};
  (S.contactHistory || []).forEach(function(h){ (hist[h.client_id] = hist[h.client_id] || []).push(h); });
  csvExport('campaigns.csv',
    ['Campaign', 'Type', 'Status', 'Clients', 'New', 'Contacted', 'Closed', 'Not Called', 'No Answer', 'Answered', 'Wrong Number', 'Attempts', 'Answer %'],
    S.campaigns.map(function(c){
      var cc = S.clients.filter(function(cl){ return cl.campaign_id === c.id; });
      var r = { not_called: 0, no_answer: 0, answered: 0, wrong_number: 0 }, att = 0, ans = 0;
      cc.forEach(function(cl){
        var h = hist[cl.id] || [];
        att += h.length;
        ans += h.filter(function(x){ return x.outcome === 'answered'; }).length;
        if (cl.status === 'Closed') return;
        var k = h.length ? h[0].outcome : 'not_called';
        if (r[k] !== undefined) r[k]++;
      });
      return [c.name, c.type, c.status, cc.length,
        cc.filter(function(x){ return x.status === 'New'; }).length,
        cc.filter(function(x){ return x.status === 'Contacted'; }).length,
        cc.filter(function(x){ return x.status === 'Closed'; }).length,
        r.not_called, r.no_answer, r.answered, r.wrong_number, att, rptPct(ans, att) + '%'];
    }));
  toast('Exported');
}
