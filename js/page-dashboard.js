// ============================================================
// PAGE DASHBOARD
// ============================================================
function renderDashboard(){
  var m=document.getElementById('main-content');
  var ac=S.campaigns.filter(function(c){return c.status==='Active';});
  var pq=S.questions.filter(function(q){return q.status==='pending';});
  var onlineEmps=activeEmps();
  var offList=S.employees.filter(function(e){return!e.is_active;});

  // Distribution for chart
  var dist=onlineEmps.map(function(e){
    return{name:e.name,color:e.color,count:S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length};
  }).sort(function(a,b){return b.count-a.count;});
  var mx=Math.max.apply(null,dist.map(function(d){return d.count;}).concat([1]));

  // Mood summary
  var totalHappy=S.clients.filter(function(c){return getClientMood(c)==='happy';}).length;
  var totalNeutral=S.clients.filter(function(c){return getClientMood(c)==='neutral';}).length;
  var totalUnhappy=S.clients.filter(function(c){return getClientMood(c)==='unhappy';}).length;
  var totalMooded=totalHappy+totalNeutral+totalUnhappy;

  // Employee performance data
  var empPerf=S.employees.map(function(e){
    var myCls=S.clients.filter(function(c){return c.assigned_employee_id===e.id;});
    var closed=myCls.filter(function(c){return c.status==='Closed';}).length;
    var contacted=myCls.filter(function(c){return c.status==='Contacted'||c.status==='Interested'||c.status==='Closed';}).length;
    var totalTrials=myCls.reduce(function(sum,c){return sum+clientHistory(c.id).length;},0);
    var happy=myCls.filter(function(c){return getClientMood(c)==='happy';}).length;
    var unhappy=myCls.filter(function(c){return getClientMood(c)==='unhappy';}).length;
    var convRate=myCls.length?Math.round((closed/myCls.length)*100):0;
    return{emp:e,total:myCls.length,closed:closed,contacted:contacted,
           trials:totalTrials,happy:happy,unhappy:unhappy,convRate:convRate};
  }).filter(function(p){return p.total>0;})
    .sort(function(a,b){return b.closed-a.closed||b.total-a.total;});

  m.innerHTML=hdr('Dashboard','Overview')+

  // ── KPI Cards ──
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px" class="fade-in">'+
    '<div class="card stat-card blue"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Campaigns</p><p class="text-3xl font-bold text-white">'+S.campaigns.length+'</p><p class="text-xs text-blue-400 mt-1">'+ac.length+' active</p></div>'+
    '<div class="card stat-card green"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Clients</p><p class="text-3xl font-bold text-white">'+S.clients.length+'</p><p class="text-xs text-emerald-400 mt-1">'+S.clients.filter(function(c){return c.status==='Closed';}).length+' closed</p></div>'+
    '<div class="card stat-card amber"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Pending Q&A</p><p class="text-3xl font-bold text-white">'+pq.length+'</p><p class="text-xs text-amber-400 mt-1">needs attention</p></div>'+
    '<div class="card stat-card red"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Active Agents</p><p class="text-3xl font-bold text-white">'+onlineEmps.length+'/'+S.employees.length+'</p><p class="text-xs text-slate-400 mt-1">online now</p></div>'+
  '</div>'+

  // ── Mid grid: Campaigns + Distribution ──
  '<div style="display:grid;grid-template-columns:1fr;gap:20px" class="fade-in dash-mid-grid">'+
    '<div class="card" style="min-width:0"><h3 class="text-sm font-bold text-white mb-4">Active Campaigns</h3>'+
    (ac.length?'<div class="space-y-2">'+ac.map(function(c){
      var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;}).length;
      return'<div class="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] table-row">'+
        '<div class="flex items-center gap-3">'+
          '<div class="w-2 h-2 rounded-full bg-blue-500"></div>'+
          '<div><p class="text-sm font-medium text-white">'+esc(c.name)+'</p><p class="text-xs text-slate-500">'+esc(c.type)+'</p></div>'+
        '</div>'+
        '<div class="flex items-center gap-3"><span class="text-xs text-slate-400">'+cc+' clients</span>'+sBadge(c.status)+'</div>'+
      '</div>';
    }).join('')+'</div>':'<p class="text-slate-500 text-sm">No active campaigns</p>')+
    '</div>'+

    '<div class="card"><h3 class="text-sm font-bold text-white mb-4">Client Distribution</h3><div class="space-y-3">'+
    dist.map(function(d){
      return'<div>'+
        '<div class="flex items-center justify-between mb-1">'+
          '<div class="flex items-center gap-2">'+av(d.name,d.color,20)+'<span class="text-xs text-slate-300">'+esc(d.name)+'</span></div>'+
          '<span class="text-xs font-semibold text-white">'+d.count+'</span>'+
        '</div>'+
        '<div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">'+
          '<div class="h-full rounded-full" style="width:'+(d.count/mx)*100+'%;background:'+d.color+'"></div>'+
        '</div>'+
      '</div>';
    }).join('')+(dist.length?'':'<p class="text-slate-500 text-sm">No active employees</p>')+
    '</div></div>'+
  '</div>'+

  // ── Mood Summary + Online/Offline ──
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:20px" class="fade-in">'+

    // Mood card
    (totalMooded>0?
    '<div class="card"><h3 class="text-sm font-bold text-white mb-4">Client Mood Overview</h3>'+
      '<div class="space-y-3">'+
        '<div class="flex items-center justify-between">'+
          '<span class="text-sm">😊 مبسوط</span>'+
          '<div class="flex items-center gap-2">'+
            '<div class="w-24 h-2 bg-white/5 rounded-full overflow-hidden">'+
              '<div class="h-full bg-emerald-500/70 rounded-full" style="width:'+(totalMooded?Math.round(totalHappy/totalMooded*100):0)+'%"></div>'+
            '</div>'+
            '<span class="text-xs font-bold text-white w-6 text-right">'+totalHappy+'</span>'+
          '</div>'+
        '</div>'+
        '<div class="flex items-center justify-between">'+
          '<span class="text-sm">😐 عادي</span>'+
          '<div class="flex items-center gap-2">'+
            '<div class="w-24 h-2 bg-white/5 rounded-full overflow-hidden">'+
              '<div class="h-full bg-amber-500/60 rounded-full" style="width:'+(totalMooded?Math.round(totalNeutral/totalMooded*100):0)+'%"></div>'+
            '</div>'+
            '<span class="text-xs font-bold text-white w-6 text-right">'+totalNeutral+'</span>'+
          '</div>'+
        '</div>'+
        '<div class="flex items-center justify-between">'+
          '<span class="text-sm">😞 مش مبسوط</span>'+
          '<div class="flex items-center gap-2">'+
            '<div class="w-24 h-2 bg-white/5 rounded-full overflow-hidden">'+
              '<div class="h-full bg-red-500/60 rounded-full" style="width:'+(totalMooded?Math.round(totalUnhappy/totalMooded*100):0)+'%"></div>'+
            '</div>'+
            '<span class="text-xs font-bold text-white w-6 text-right">'+totalUnhappy+'</span>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>':'')+''+

    // Active Now
    '<div class="card"><div class="flex items-center justify-between mb-4">'+
      '<h3 class="text-sm font-bold text-white">Active Now</h3>'+
      '<span class="badge badge-active">'+onlineEmps.length+'</span>'+
    '</div><div class="space-y-2">'+
    onlineEmps.map(function(e){
      var cc=S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length;
      return'<div class="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">'+
        '<div class="flex items-center gap-2">'+av(e.name,e.color||'#3b82f6',30)+
          '<div><p class="text-sm font-medium text-white">'+esc(e.name)+'</p>'+
          '<p class="text-xs text-emerald-400 font-medium">Active</p></div>'+
        '</div>'+
        '<div class="flex items-center gap-2"><span class="text-xs text-slate-400">'+cc+' clients</span>'+pDot(true)+'</div>'+
      '</div>';
    }).join('')+
    (onlineEmps.length?'':'<p class="text-slate-500 text-sm text-center py-4">No agents active</p>')+
    '</div></div>'+

    // Inactive
    '<div class="card"><div class="flex items-center justify-between mb-4">'+
      '<h3 class="text-sm font-bold text-white">Inactive</h3>'+
      '<span class="badge badge-ended">'+offList.length+'</span>'+
    '</div><div class="space-y-2">'+
    offList.map(function(e){
      return'<div class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02]">'+
        av(e.name,e.color||'#475569',28)+'<p class="text-sm text-slate-500">'+esc(e.name)+'</p>'+
      '</div>';
    }).join('')+
    (offList.length?'':'<p class="text-slate-500 text-sm text-center py-4">Everyone is active!</p>')+
    '</div></div>'+
  '</div>'+

  // ── Employee Performance Table ──
  (empPerf.length?
  '<div class="card mt-5 fade-in">'+
    '<h3 class="text-sm font-bold text-white mb-4">Employee Performance</h3>'+
    '<div class="tbl-wrap"><table class="w-full text-sm">'+
      '<thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
        '<th class="pb-3 pr-4">Agent</th>'+
        '<th class="pb-3 pr-4 text-center">Clients</th>'+
        '<th class="pb-3 pr-4 text-center">Trials 🔄</th>'+
        '<th class="pb-3 pr-4 text-center">Contacted</th>'+
        '<th class="pb-3 pr-4 text-center">Closed ✓</th>'+
        '<th class="pb-3 pr-4 text-center">Conv %</th>'+
        '<th class="pb-3 pr-4 text-center">😊</th>'+
        '<th class="pb-3 text-center">😞</th>'+
      '</tr></thead><tbody>'+
      empPerf.map(function(p){
        var convColor=p.convRate>=20?'text-emerald-400':p.convRate>=10?'text-amber-400':'text-slate-500';
        return'<tr class="table-row border-b border-white/[0.03]">'+
          '<td class="py-3 pr-4">'+
            '<div class="flex items-center gap-2">'+
              av(p.emp.name,p.emp.color||'#3b82f6',28)+
              '<div>'+
                '<p class="text-sm font-medium text-white">'+esc(p.emp.name)+'</p>'+
                pDot(p.emp.is_active)+
              '</div>'+
            '</div>'+
          '</td>'+
          '<td class="py-3 pr-4 text-center text-white font-semibold">'+p.total+'</td>'+
          '<td class="py-3 pr-4 text-center">'+trialsBadge(p.trials)+'</td>'+
          '<td class="py-3 pr-4 text-center text-violet-400">'+p.contacted+'</td>'+
          '<td class="py-3 pr-4 text-center text-emerald-400 font-semibold">'+p.closed+'</td>'+
          '<td class="py-3 pr-4 text-center font-bold '+convColor+'">'+p.convRate+'%</td>'+
          '<td class="py-3 pr-4 text-center text-emerald-400">'+p.happy+'</td>'+
          '<td class="py-3 text-center text-red-400">'+p.unhappy+'</td>'+
        '</tr>';
      }).join('')+
      '</tbody></table></div>'+
  '</div>':'');

  lucide.createIcons();
}
