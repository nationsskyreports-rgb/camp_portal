// ============================================================
// PAGE PROJECT STATS — Per-project analytics with VIP breakdown
// ============================================================

var psFilter = { project: '', view: 'combined' }; // view: 'combined' | 'vip' | 'nonvip'

// ── Helpers ──────────────────────────────────────────────────

function getProjectList(){
  var seen = {};
  var list = [];
  S.clients.forEach(function(c){
    var p = (c.extra_data||{}).project;
    if(p && !seen[p]){ seen[p] = true; list.push(p); }
  });
  return list.sort();
}

function clientsByProject(proj, filterFn){
  return S.clients.filter(function(c){
    var p = (c.extra_data||{}).project || '';
    if(proj && p !== proj) return false;
    if(filterFn && !filterFn(c)) return false;
    return true;
  });
}

function getAnsweredIds(){
  var ids = {};
  (S.contactHistory||[]).forEach(function(h){
    if(h.outcome === 'answered') ids[h.client_id] = true;
  });
  return ids;
}

function calcProjectStats(group, answeredIds){
  var total     = group.length;
  var answered  = group.filter(function(c){ return answeredIds[c.id] || c.status==='Contacted' || c.status==='Closed'; }).length;
  var submitted = group.filter(function(c){ return (c.extra_data||{}).form_submitted === true; }).length;
  var dataChange = group.filter(function(c){
    var ex = c.extra_data || {};
    return ex.form_submitted === true && (ex.old_phone || ex.phone2 || ex.email2);
  }).length;
  var closed    = group.filter(function(c){ return c.status==='Closed'; }).length;
  var newCount  = group.filter(function(c){ return c.status==='New'; }).length;
  var contacted = group.filter(function(c){ return c.status==='Contacted'; }).length;
  var vipCount  = group.filter(function(c){ return isVipClient(c); }).length;
  var unassigned = group.filter(function(c){ return !c.assigned_employee_id; }).length;

  // Untouched: no contact_history entry at all
  var touchedIds = {};
  (S.contactHistory||[]).forEach(function(h){ touchedIds[h.client_id] = true; });
  var untouched = group.filter(function(c){ return !touchedIds[c.id] && c.status==='New'; }).length;

  return {
    total:total, answered:answered, submitted:submitted,
    dataChange:dataChange, closed:closed, newCount:newCount,
    contacted:contacted, vipCount:vipCount, unassigned:unassigned,
    untouched:untouched,
    answeredPct: total>0 ? Math.round(answered/total*100) : 0,
    submittedPct: total>0 ? Math.round(submitted/total*100) : 0,
    closedPct: total>0 ? Math.round(closed/total*100) : 0
  };
}

// ── Render ───────────────────────────────────────────────────

function renderProjectStats(){
  var m = document.getElementById('main-content');
  var projects = getProjectList();
  var answeredIds = getAnsweredIds();

  // ── View filter function ──
  var viewFilterFn;
  if(psFilter.view === 'vip')       viewFilterFn = function(c){ return isVipClient(c); };
  else if(psFilter.view === 'nonvip') viewFilterFn = function(c){ return !isVipClient(c); };
  else                               viewFilterFn = null;

  var viewLabel = psFilter.view==='vip' ? '👑 VIP Only' : psFilter.view==='nonvip' ? '📊 Non-VIP Only' : '📋 Combined (All)';

  // ── Project options ──
  var projOpts = '<option value="">All Projects</option>' +
    projects.map(function(p){
      return '<option value="'+esc(p)+'" '+(psFilter.project===p?'selected':'')+'>'+esc(p)+'</option>';
    }).join('');

  // ── View toggle buttons ──
  function viewBtn(val, label, icon, color){
    var active = psFilter.view === val;
    return '<button class="btn btn-sm '+(active?'':'btn-ghost')+'" '+
      'style="'+(active?'background:'+color+';color:#fff;border-color:'+color:'')+ '" '+
      'onclick="psFilter.view=\''+val+'\';renderProjectStats()">'+
      '<i data-lucide="'+icon+'" class="w-3.5 h-3.5"></i> '+label+'</button>';
  }

  // ── Determine which projects to show ──
  var displayProjects = psFilter.project ? [psFilter.project] : projects;

  // ── Per-project stats ──
  var projectStats = {};
  displayProjects.forEach(function(p){
    projectStats[p] = calcProjectStats(clientsByProject(p, viewFilterFn), answeredIds);
  });

  // ── Global stats (all shown projects combined) ──
  var allClients = [];
  displayProjects.forEach(function(p){ allClients = allClients.concat(clientsByProject(p, viewFilterFn)); });
  var globalStats = calcProjectStats(allClients, answeredIds);

  // ── Stat card builder ──
  function miniStat(label, value, color, icon, sub){
    return '<div class="card text-center" style="min-width:0">'+
      '<div style="display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px">'+
        '<i data-lucide="'+icon+'" style="width:14px;height:14px;color:'+color+'"></i>'+
        '<p class="text-slate-400 text-xs">'+label+'</p>'+
      '</div>'+
      '<p class="text-2xl font-bold" style="color:'+color+'">'+value+'</p>'+
      (sub?'<p class="text-[11px] text-slate-500 mt-1">'+sub+'</p>':'')+
    '</div>';
  }

  // ── Main Matrix Table (the exact table from the image) ──
  var matrixProjects = displayProjects.length <= 8 ? displayProjects : displayProjects.slice(0,8);
  var matrixHtml =
    '<div class="tbl-wrap"><table class="w-full text-sm">'+
    '<thead><tr class="text-left text-xs uppercase tracking-wider border-b border-white/5">'+
      '<th class="pb-3 pr-4 text-slate-500" style="min-width:180px">Status</th>'+
      matrixProjects.map(function(p){
        return '<th class="pb-3 pr-4 text-center text-slate-400 whitespace-nowrap">'+esc(p)+'</th>';
      }).join('')+
      (matrixProjects.length > 1 ? '<th class="pb-3 text-center text-blue-400 whitespace-nowrap">Total</th>' : '')+
    '</tr></thead><tbody>';

  var matrixRows = [
    { label:'Total Forms Sent',     key:'total',      icon:'send',        color:'#3b82f6' },
    { label:'Answered Clients',     key:'answered',    icon:'phone-call',  color:'#a78bfa' },
    { label:'Submitted Forms',      key:'submitted',   icon:'check-circle',color:'#10b981' },
    { label:'Data Change Requests', key:'dataChange',  icon:'edit-3',      color:'#f59e0b' }
  ];

  matrixRows.forEach(function(row){
    var rowTotal = 0;
    matrixHtml += '<tr class="table-row border-b border-white/[0.03]">'+
      '<td class="py-3 pr-4"><div class="flex items-center gap-2">'+
        '<i data-lucide="'+row.icon+'" style="width:14px;height:14px;color:'+row.color+'"></i>'+
        '<span class="text-slate-300 text-sm font-medium">'+row.label+'</span>'+
      '</div></td>';
    matrixProjects.forEach(function(p){
      var val = projectStats[p][row.key];
      rowTotal += val;
      var pct = projectStats[p].total > 0 ? Math.round(val/projectStats[p].total*100) : 0;
      var pctStr = row.key !== 'total' ? '<span class="text-[10px] text-slate-600 ml-1">('+pct+'%)</span>' : '';
      matrixHtml += '<td class="py-3 pr-4 text-center"><span class="text-white font-bold text-lg">'+val+'</span>'+pctStr+'</td>';
    });
    if(matrixProjects.length > 1){
      matrixHtml += '<td class="py-3 text-center"><span class="text-blue-400 font-bold text-lg">'+rowTotal+'</span></td>';
    }
    matrixHtml += '</tr>';
  });
  matrixHtml += '</tbody></table></div>';

  // ── Extended stats table ──
  var extRows = [
    { label:'Closed Deals',    key:'closed',     icon:'trophy',     color:'#10b981' },
    { label:'New (Untouched)',  key:'untouched',  icon:'alert-circle',color:'#ef4444' },
    { label:'VIP Clients',     key:'vipCount',   icon:'crown',      color:'#fcd34d' },
    { label:'Unassigned',      key:'unassigned',  icon:'user-x',     color:'#f97316' }
  ];

  var extHtml =
    '<div class="tbl-wrap"><table class="w-full text-sm">'+
    '<thead><tr class="text-left text-xs uppercase tracking-wider border-b border-white/5">'+
      '<th class="pb-3 pr-4 text-slate-500" style="min-width:180px">Metric</th>'+
      matrixProjects.map(function(p){
        return '<th class="pb-3 pr-4 text-center text-slate-400 whitespace-nowrap">'+esc(p)+'</th>';
      }).join('')+
      (matrixProjects.length > 1 ? '<th class="pb-3 text-center text-blue-400 whitespace-nowrap">Total</th>' : '')+
    '</tr></thead><tbody>';

  extRows.forEach(function(row){
    var rowTotal = 0;
    extHtml += '<tr class="table-row border-b border-white/[0.03]">'+
      '<td class="py-3 pr-4"><div class="flex items-center gap-2">'+
        '<i data-lucide="'+row.icon+'" style="width:14px;height:14px;color:'+row.color+'"></i>'+
        '<span class="text-slate-300 text-sm font-medium">'+row.label+'</span>'+
      '</div></td>';
    matrixProjects.forEach(function(p){
      var val = projectStats[p][row.key];
      rowTotal += val;
      extHtml += '<td class="py-3 pr-4 text-center"><span class="text-white font-semibold">'+val+'</span></td>';
    });
    if(matrixProjects.length > 1){
      extHtml += '<td class="py-3 text-center"><span class="text-blue-400 font-semibold">'+rowTotal+'</span></td>';
    }
    extHtml += '</tr>';
  });
  extHtml += '</tbody></table></div>';

  // ── Progress bars per project ──
  var progressHtml = '';
  if(matrixProjects.length <= 6){
    progressHtml = '<div class="grid grid-cols-1 sm:grid-cols-'+Math.min(matrixProjects.length,3)+' gap-4 mb-6 fade-in">';
    matrixProjects.forEach(function(p){
      var st = projectStats[p];
      progressHtml += '<div class="card">'+
        '<h4 class="text-sm font-bold text-white mb-3">'+esc(p)+'</h4>'+
        '<div class="space-y-3">'+
          progressBar('Answered', st.answered, st.total, '#a78bfa')+
          progressBar('Submitted', st.submitted, st.total, '#10b981')+
          progressBar('Closed', st.closed, st.total, '#3b82f6')+
        '</div>'+
      '</div>';
    });
    progressHtml += '</div>';
  }

  // ── VIP Details Table ──
  var vipDetailsHtml = '';
  if(psFilter.view !== 'nonvip'){
    var vipClients = [];
    displayProjects.forEach(function(p){
      clientsByProject(p).filter(function(c){ return isVipClient(c); }).forEach(function(c){
        c._projName = p;
        vipClients.push(c);
      });
    });
    if(vipClients.length > 0){
      vipDetailsHtml = '<div class="card fade-in mb-6">'+
        '<div class="flex items-center justify-between mb-4">'+
          '<h3 class="text-sm font-bold text-white flex items-center gap-2">'+
            '<span style="color:#fcd34d">👑</span> VIP Clients ('+vipClients.length+')'+
          '</h3>'+
          '<span class="text-[11px] text-slate-500">لم يتم التواصل معهم كموظفين</span>'+
        '</div>'+
        '<div class="tbl-wrap"><table class="w-full text-sm">'+
        '<thead><tr class="text-left text-xs uppercase tracking-wider border-b border-white/5 text-slate-500">'+
          '<th class="pb-3 pr-4">Client Name</th>'+
          '<th class="pb-3 pr-4">Mobile</th>'+
          '<th class="pb-3 pr-4">Project</th>'+
          '<th class="pb-3 pr-4">Unit</th>'+
          '<th class="pb-3 pr-4">Form</th>'+
          '<th class="pb-3 pr-4">Agent</th>'+
          '<th class="pb-3">Status</th>'+
        '</tr></thead><tbody>'+
        vipClients.map(function(c){
          var ex = c.extra_data||{};
          var e  = empById(c.assigned_employee_id);
          return '<tr class="table-row border-b border-white/[0.03]">'+
            '<td class="py-2.5 pr-4 text-slate-300 text-xs">'+esc(c.name||ex.name||ex.customer||'-')+
              ' <span class="badge" style="background:rgba(245,158,11,.15);color:#fcd34d;border:1px solid rgba(245,158,11,.3);font-size:9px;padding:1px 5px">VIP</span></td>'+
            '<td class="py-2.5 pr-4 text-slate-400 text-xs">'+esc(c.phone||'-')+'</td>'+
            '<td class="py-2.5 pr-4 text-slate-400 text-xs">'+esc(c._projName||'-')+'</td>'+
            '<td class="py-2.5 pr-4 text-slate-400 text-xs" style="max-width:140px"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(ex.unit||'')+'">'+esc(ex.unit||'-')+'</span></td>'+
            '<td class="py-2.5 pr-4">'+(ex.form_submitted
              ? '<span class="badge" style="background:rgba(16,185,129,.12);color:#6ee7b7;font-size:10px">✓ Yes</span>'
              : '<span class="badge" style="background:rgba(239,68,68,.1);color:#fca5a5;font-size:10px">No</span>')+'</td>'+
            '<td class="py-2.5 pr-4 text-xs">'+(e
              ? av(e.name,e.color||'#3b82f6',18)+'<span class="text-slate-300 ml-1">'+esc(e.name)+'</span>'
              : '<span class="text-slate-600">Unassigned</span>')+'</td>'+
            '<td class="py-2.5">'+sBadge(c.status)+'</td>'+
          '</tr>';
        }).join('')+
        '</tbody></table></div></div>';
    }
  }

  // ── Agent distribution per project ──
  var agentDistHtml = '';
  if(!psFilter.project && matrixProjects.length > 1 && psFilter.view !== 'vip'){
    agentDistHtml = '<div class="card fade-in mb-6">'+
      '<h3 class="text-sm font-bold text-white mb-4 flex items-center gap-2">'+
        '<i data-lucide="users" style="width:16px;height:16px;color:#93c5fd"></i> Agent Distribution per Project'+
      '</h3>'+
      '<div class="tbl-wrap"><table class="w-full text-sm">'+
      '<thead><tr class="text-left text-xs uppercase tracking-wider border-b border-white/5 text-slate-500">'+
        '<th class="pb-3 pr-4">Agent</th>'+
        matrixProjects.map(function(p){ return '<th class="pb-3 pr-4 text-center whitespace-nowrap">'+esc(p)+'</th>'; }).join('')+
        '<th class="pb-3 text-center">Total</th>'+
      '</tr></thead><tbody>';
    activeEmps().forEach(function(emp){
      var rowTotal = 0;
      agentDistHtml += '<tr class="table-row border-b border-white/[0.03]">'+
        '<td class="py-2.5 pr-4"><div class="flex items-center gap-2">'+
          av(emp.name, emp.color||'#3b82f6', 20)+
          '<span class="text-xs text-slate-300">'+esc(emp.name)+'</span>'+
        '</div></td>';
      matrixProjects.forEach(function(p){
        var count = clientsByProject(p, viewFilterFn).filter(function(c){
          return c.assigned_employee_id === emp.id;
        }).length;
        rowTotal += count;
        agentDistHtml += '<td class="py-2.5 pr-4 text-center text-slate-300 text-xs font-semibold">'+count+'</td>';
      });
      agentDistHtml += '<td class="py-2.5 text-center text-blue-400 font-semibold text-xs">'+rowTotal+'</td></tr>';
    });
    agentDistHtml += '</tbody></table></div></div>';
  }

  // ── Build page ──
  m.innerHTML =
    hdr('Project Stats', 'Per-project analytics with VIP breakdown',
      '<button class="btn btn-primary btn-sm" onclick="exportProjectStatsExcel()">'+
        '<i data-lucide="download" class="w-4 h-4"></i> Export Excel'+
      '</button>')+

    // ── Filters ──
    '<div class="card mb-6 fade-in" style="padding:.75rem 1rem">'+
      '<div class="flex items-center gap-3 flex-wrap">'+
        '<span class="text-xs text-slate-400">Project:</span>'+
        '<select class="input" style="max-width:220px" onchange="psFilter.project=this.value;renderProjectStats()">'+projOpts+'</select>'+
        '<span class="text-xs text-slate-400 ml-2">View:</span>'+
        viewBtn('combined','All','layers','rgba(59,130,246,.7)')+
        viewBtn('vip','VIP','crown','rgba(245,158,11,.7)')+
        viewBtn('nonvip','Non-VIP','users','rgba(139,92,246,.7)')+
      '</div>'+
    '</div>'+

    // ── Global stat cards ──
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:20px" class="fade-in">'+
      miniStat('Total Clients', globalStats.total, '#3b82f6', 'users', displayProjects.length+' project(s)')+
      miniStat('Answered', globalStats.answered, '#a78bfa', 'phone-call', globalStats.answeredPct+'%')+
      miniStat('Forms Submitted', globalStats.submitted, '#10b981', 'check-circle', globalStats.submittedPct+'%')+
      miniStat('Data Changes', globalStats.dataChange, '#f59e0b', 'edit-3', '')+
      miniStat('Closed', globalStats.closed, '#34d399', 'trophy', globalStats.closedPct+'%')+
      miniStat('VIP', globalStats.vipCount, '#fcd34d', 'crown', '')+
    '</div>'+

    // ── View label ──
    '<div class="flex items-center gap-2 mb-4 fade-in">'+
      '<span class="text-xs font-bold text-white" style="background:rgba(255,255,255,.06);padding:4px 12px;border-radius:8px">'+viewLabel+'</span>'+
    '</div>'+

    // ── Main matrix table ──
    '<div class="card mb-6 fade-in">'+
      '<h3 class="text-sm font-bold text-white mb-4 flex items-center gap-2">'+
        '<i data-lucide="table-2" style="width:16px;height:16px;color:#3b82f6"></i> Project Breakdown'+
      '</h3>'+
      matrixHtml+
    '</div>'+

    // ── Extended stats ──
    '<div class="card mb-6 fade-in">'+
      '<h3 class="text-sm font-bold text-white mb-4 flex items-center gap-2">'+
        '<i data-lucide="bar-chart-3" style="width:16px;height:16px;color:#a78bfa"></i> Additional Metrics'+
      '</h3>'+
      extHtml+
    '</div>'+

    // ── Progress bars ──
    progressHtml+

    // ── VIP details ──
    vipDetailsHtml+

    // ── Agent distribution ──
    agentDistHtml;

  lucide.createIcons();
}

// ── Progress bar helper ─────────────────────────────────────
function progressBar(label, value, total, color){
  var pct = total > 0 ? Math.round(value/total*100) : 0;
  return '<div>'+
    '<div class="flex items-center justify-between mb-1">'+
      '<span class="text-[11px] text-slate-400">'+label+'</span>'+
      '<span class="text-[11px] font-bold text-white">'+value+' <span class="text-slate-600 font-normal">/'+total+' ('+pct+'%)</span></span>'+
    '</div>'+
    '<div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">'+
      '<div class="h-full rounded-full" style="width:'+pct+'%;background:'+color+';transition:width .3s"></div>'+
    '</div>'+
  '</div>';
}


// ── Export to Excel ──────────────────────────────────────────

function exportProjectStatsExcel(){
  var projects = getProjectList();
  var answeredIds = getAnsweredIds();
  var wb = XLSX.utils.book_new();

  function buildSheet(filterFn, sheetName){
    var header = ['Status'].concat(projects).concat(['Total']);
    var rows = [header];
    var metrics = [
      { label:'Total Forms Sent', key:'total' },
      { label:'Answered Clients', key:'answered' },
      { label:'Submitted Forms',  key:'submitted' },
      { label:'Data Change Requests', key:'dataChange' },
      { label:'Closed Deals',     key:'closed' },
      { label:'New (Untouched)',   key:'untouched' },
      { label:'VIP Clients',      key:'vipCount' },
      { label:'Unassigned',       key:'unassigned' }
    ];
    metrics.forEach(function(met){
      var row = [met.label];
      var rowTotal = 0;
      projects.forEach(function(p){
        var st = calcProjectStats(clientsByProject(p, filterFn), answeredIds);
        row.push(st[met.key]);
        rowTotal += st[met.key];
      });
      row.push(rowTotal);
      rows.push(row);
    });
    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = rows[0].map(function(_, ci){
      var maxLen = Math.max.apply(null, rows.map(function(r){ return String(r[ci]||'').length; }));
      return { wch: Math.min(maxLen + 3, 40) };
    });
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Sheet 1: Combined
  buildSheet(null, 'Combined');
  // Sheet 2: VIP
  buildSheet(function(c){ return isVipClient(c); }, 'VIP Only');
  // Sheet 3: Non-VIP
  buildSheet(function(c){ return !isVipClient(c); }, 'Non-VIP');

  // Sheet 4: VIP Details
  var vipRows = [['Project','Name','Phone','Unit','Status','Form Submitted','Assigned Agent','Old Phone']];
  projects.forEach(function(p){
    clientsByProject(p).filter(function(c){ return isVipClient(c); }).forEach(function(c){
      var ex = c.extra_data || {};
      var e  = empById(c.assigned_employee_id);
      vipRows.push([
        p,
        c.name || ex.name || ex.customer || '',
        c.phone || '',
        ex.unit || '',
        c.status || '',
        ex.form_submitted ? 'Yes' : 'No',
        e ? e.name : 'Unassigned',
        ex.old_phone || ''
      ]);
    });
  });
  var ws4 = XLSX.utils.aoa_to_sheet(vipRows);
  ws4['!cols'] = vipRows[0].map(function(_, ci){
    var maxLen = Math.max.apply(null, vipRows.map(function(r){ return String(r[ci]||'').length; }));
    return { wch: Math.min(maxLen + 3, 40) };
  });
  XLSX.utils.book_append_sheet(wb, ws4, 'VIP Details');

  // Sheet 5: Agent × Project
  var agents = activeEmps();
  var agentHeader = ['Agent'].concat(projects).concat(['Total']);
  var agentRows = [agentHeader];
  agents.forEach(function(emp){
    var row = [emp.name];
    var total = 0;
    projects.forEach(function(p){
      var count = clientsByProject(p).filter(function(c){ return c.assigned_employee_id === emp.id; }).length;
      row.push(count);
      total += count;
    });
    row.push(total);
    agentRows.push(row);
  });
  var ws5 = XLSX.utils.aoa_to_sheet(agentRows);
  ws5['!cols'] = agentRows[0].map(function(_, ci){
    var maxLen = Math.max.apply(null, agentRows.map(function(r){ return String(r[ci]||'').length; }));
    return { wch: Math.min(maxLen + 3, 40) };
  });
  XLSX.utils.book_append_sheet(wb, ws5, 'Agent Distribution');

  var fname = 'Project_Stats_' + new Date().toISOString().slice(0,10) + '.xlsx';
  XLSX.writeFile(wb, fname);
  toast('Exported ' + fname + ' ✓', 'success');
}
