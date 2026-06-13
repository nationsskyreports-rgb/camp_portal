// ============================================================
// PAGE DASHBOARD
// ============================================================
function renderDashboard(){
  var m=document.getElementById('main-content');
  var ac=S.campaigns.filter(function(c){return c.status==='Active';});
  var pq=S.questions.filter(function(q){return q.status==='pending';});
  var onlineEmps=activeEmps();
  var dist=onlineEmps.map(function(e){return{name:e.name,color:e.color,count:S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length};}).sort(function(a,b){return b.count-a.count;});
  var mx=Math.max.apply(null,dist.map(function(d){return d.count;}).concat([1]));
  var offList=S.employees.filter(function(e){return!e.is_active;});
  var closedCount      = S.clients.filter(function(c){return c.status==='Closed';}).length;
  var contactedCount   = S.clients.filter(function(c){return c.status==='Contacted';}).length;
  var newCount         = S.clients.filter(function(c){return c.status==='New';}).length;
  var interestedCount  = S.clients.filter(function(c){return c.status==='Interested';}).length;

  // ── Reachability per campaign ──────────────────────────────
  var reachStats = S.campaigns.map(function(camp){
    var campClients = S.clients.filter(function(c){ return c.campaign_id === camp.id; });
    var campClientIds = {};
    campClients.forEach(function(c){ campClientIds[c.id] = true; });

    var campHistory = (S.contactHistory||[]).filter(function(h){ return campClientIds[h.client_id]; });

    var totalCalls    = campHistory.length;
    var answeredCalls = campHistory.filter(function(h){ return h.outcome === 'answered'; }).length;

    // unique clients with at least 1 answered call
    var reachedIds = {};
    campHistory.filter(function(h){ return h.outcome === 'answered'; })
               .forEach(function(h){ reachedIds[h.client_id] = true; });
    var reachedClients = Object.keys(reachedIds).length;

    // unique clients with any call attempt
    var touchedIds = {};
    campHistory.forEach(function(h){ touchedIds[h.client_id] = true; });
    var touchedClients = Object.keys(touchedIds).length;

    var totalClients    = campClients.length;
    var untouched       = totalClients - touchedClients;
    var closedCl        = campClients.filter(function(c){ return c.status === 'Closed'; }).length;

    // Reachability = unique clients answered ÷ total clients (client-level reach)
    var reachability = totalClients > 0 ? Math.round(reachedClients / totalClients * 100) : 0;
    // Contact Rate  = answered calls ÷ total calls (call-level efficiency)
    var contactRate  = totalCalls > 0 ? Math.round(answeredCalls / totalCalls * 100) : 0;
    var closeRate    = totalClients > 0 ? Math.round(closedCl / totalClients * 100) : 0;

    return {
      id: camp.id, name: camp.name, status: camp.status,
      totalClients: totalClients, reachedClients: reachedClients,
      reachability: reachability, totalCalls: totalCalls,
      answeredCalls: answeredCalls, contactRate: contactRate,
      untouched: untouched, closedClients: closedCl, closeRate: closeRate
    };
  }).filter(function(r){ return r.totalClients > 0; })
    .sort(function(a,b){ return b.reachability - a.reachability; });

  m.innerHTML=hdr('Dashboard','Overview')+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px" class="fade-in">'+

  // ── Stat cards with data-counter for animation ──
  '<div class="card stat-card blue">'+
    '<p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Campaigns</p>'+
    '<p class="text-3xl font-bold text-white stat-num" data-counter="'+S.campaigns.length+'">'+S.campaigns.length+'</p>'+
    '<p class="text-xs text-blue-400 mt-1">'+ac.length+' active</p>'+
  '</div>'+

  '<div class="card stat-card green">'+
    '<p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Clients</p>'+
    '<p class="text-3xl font-bold text-white stat-num" data-counter="'+S.clients.length+'">'+S.clients.length+'</p>'+
    '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">'+
    '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(59,130,246,0.12);color:#93c5fd">🆕 '+newCount+' New</span>'+
    '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(139,92,246,0.12);color:#c4b5fd">📞 '+contactedCount+' Contacted</span>'+
    '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(245,158,11,0.12);color:#fbbf24">⭐ '+interestedCount+' Interested</span>'+
    '<span style="font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(16,185,129,0.12);color:#34d399">✅ '+closedCount+' Closed</span>'+
    '</div>'+
  '</div>'+

  '<div class="card stat-card amber">'+
    '<p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Pending Q&A</p>'+
    '<p class="text-3xl font-bold text-white stat-num" data-counter="'+pq.length+'">'+pq.length+'</p>'+
    '<p class="text-xs text-amber-400 mt-1">needs attention</p>'+
  '</div>'+

  '<div class="card stat-card red">'+
    '<p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Active Agents</p>'+
    '<p class="text-3xl font-bold text-white stat-num" data-counter="'+onlineEmps.length+'">'+onlineEmps.length+'</p>'+
    '<p class="text-xs text-slate-400 mt-1">of '+S.employees.length+' total</p>'+
  '</div></div>'+

  '<div style="display:grid;grid-template-columns:1fr;gap:20px" class="fade-in dash-mid-grid">'+
  '<div class="card" style="min-width:0"><h3 class="text-sm font-bold text-white mb-4">Active Campaigns</h3>'+
  (ac.length
    ? '<div class="space-y-2">'+ac.map(function(c){
        var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;}).length;
        return'<div class="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] table-row">'+
          '<div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-blue-500"></div>'+
          '<div><p class="text-sm font-medium text-white">'+esc(c.name)+'</p>'+
          '<p class="text-xs text-slate-500">'+esc(c.type)+'</p></div></div>'+
          '<div class="flex items-center gap-3"><span class="text-xs text-slate-400">'+cc+' clients</span>'+sBadge(c.status)+'</div></div>';
      }).join('')+'</div>'
    : '<p class="text-slate-500 text-sm">No active campaigns</p>')+
  '</div>'+

  '<div class="card"><h3 class="text-sm font-bold text-white mb-4">Client Distribution</h3>'+
  '<div class="space-y-3">'+dist.map(function(d){
    return'<div>'+
      '<div class="flex items-center justify-between mb-1">'+
      '<div class="flex items-center gap-2">'+av(d.name,d.color,20)+'<span class="text-xs text-slate-300">'+esc(d.name)+'</span></div>'+
      '<span class="text-xs font-semibold text-white" data-counter="'+d.count+'">'+d.count+'</span></div>'+
      '<div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">'+
      '<div class="h-full rounded-full progress-fill" style="width:'+(d.count/mx)*100+'%;background:'+d.color+'"></div></div></div>';
  }).join('')+(dist.length?'':'<p class="text-slate-500 text-sm">No active employees</p>')+
  '</div></div></div>'+

  // ── Campaign Reachability Section ─────────────────────────
  '<div class="card fade-in" style="margin-top:20px">'+
    '<div class="flex items-center gap-2 mb-1">'+
      '<i data-lucide="radio" class="w-5 h-5" style="color:#a78bfa"></i>'+
      '<h3 class="text-sm font-bold text-white">Campaign Reachability</h3>'+
    '</div>'+
    '<p class="text-xs text-slate-500 mb-4" style="padding-right:4px">'+
      '<strong style="color:#a78bfa">Reachability</strong> = % من العملاء اللي اتكلمنا معاهم فعلاً (ولو مرة واحدة) &nbsp;·&nbsp; '+
      '<strong style="color:#93c5fd">Contact Rate</strong> = % المكالمات اللي ردوا فيها من إجمالي المحاولات'+
    '</p>'+
    (reachStats.length
      ? '<div class="tbl-wrap"><table class="w-full text-sm">'+
          '<thead><tr class="text-left text-slate-500 text-xs uppercase border-b border-white/5">'+
            '<th class="pb-3 pr-4 whitespace-nowrap">Campaign</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Clients</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Reached</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Reachability %</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Calls Made</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Answered</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Contact Rate %</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Closed</th>'+
            '<th class="pb-3 pr-4 text-center whitespace-nowrap">Close %</th>'+
            '<th class="pb-3 text-center whitespace-nowrap">Untouched</th>'+
          '</tr></thead><tbody>'+
          reachStats.map(function(r){
            var rColor = r.reachability >= 60 ? '#6ee7b7' : r.reachability >= 30 ? '#fbbf24' : '#f87171';
            var cColor = r.contactRate  >= 50 ? '#93c5fd' : r.contactRate  >= 25 ? '#fbbf24' : '#f87171';
            var clColor = r.closeRate   >= 50 ? '#6ee7b7' : r.closeRate    >= 20 ? '#fbbf24' : '#94a3b8';
            var rPct   = r.totalClients > 0 ? Math.round(r.reachedClients / r.totalClients * 100) : 0;
            return '<tr class="table-row border-b border-white/[0.03]">'+
              '<td class="py-3 pr-4">'+
                '<div class="flex items-center gap-2">'+
                  '<div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background:'+(r.status==='Active'?'#10b981':r.status==='Paused'?'#f59e0b':'#ef4444')+'"></div>'+
                  '<span class="text-sm text-slate-200 font-medium">'+esc(r.name)+'</span>'+
                '</div>'+
              '</td>'+
              '<td class="py-3 pr-4 text-center text-slate-300 font-semibold">'+r.totalClients+'</td>'+
              '<td class="py-3 pr-4 text-center" style="color:#a78bfa;font-weight:600">'+r.reachedClients+'</td>'+
              '<td class="py-3 pr-4 text-center">'+
                '<div>'+
                  '<span style="font-size:13px;font-weight:700;color:'+rColor+'">'+r.reachability+'%</span>'+
                  '<div class="w-full h-1 bg-white/5 rounded-full mt-1" style="min-width:60px">'+
                    '<div style="width:'+r.reachability+'%;height:4px;border-radius:2px;background:'+rColor+';transition:width .3s"></div>'+
                  '</div>'+
                '</div>'+
              '</td>'+
              '<td class="py-3 pr-4 text-center text-slate-400">'+r.totalCalls+'</td>'+
              '<td class="py-3 pr-4 text-center" style="color:#34d399">'+r.answeredCalls+'</td>'+
              '<td class="py-3 pr-4 text-center"><span style="font-size:12px;font-weight:600;color:'+cColor+'">'+r.contactRate+'%</span></td>'+
              '<td class="py-3 pr-4 text-center" style="color:#60a5fa;font-weight:600">'+r.closedClients+'</td>'+
              '<td class="py-3 pr-4 text-center"><span style="font-size:12px;font-weight:600;color:'+clColor+'">'+r.closeRate+'%</span></td>'+
              '<td class="py-3 text-center">'+(r.untouched>0?'<span style="color:#fca5a5;font-weight:700">'+r.untouched+'</span>':'<span style="color:#6ee7b7">0</span>')+'</td>'+
            '</tr>';
          }).join('')+
        '</tbody></table></div>'
      : '<p class="text-slate-500 text-sm py-4 text-center">No campaign data yet</p>')+
  '</div>'+

  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:20px" class="fade-in">'+
  '<div class="card"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Active Now</h3><span class="badge badge-active">'+onlineEmps.length+'</span></div>'+
  '<div class="space-y-2">'+
  onlineEmps.map(function(e){
    var cc=S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length;
    return'<div class="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]">'+
      '<div class="flex items-center gap-2">'+av(e.name,e.color||'#3b82f6',30)+
      '<div><p class="text-sm font-medium text-white">'+esc(e.name)+'</p>'+
      '<p class="text-xs text-emerald-400 font-medium">Active</p></div></div>'+
      '<div class="flex items-center gap-2"><span class="text-xs text-slate-400" data-counter="'+cc+'">'+cc+'</span> <span class="text-xs text-slate-500">clients</span>'+pDot(true)+'</div></div>';
  }).join('')+
  (onlineEmps.length?'':'<p class="text-slate-500 text-sm text-center py-4">No agents active</p>')+
  '</div></div>'+

  '<div class="card"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Inactive</h3><span class="badge badge-ended">'+offList.length+'</span></div>'+
  '<div class="space-y-2">'+
  offList.map(function(e){
    return'<div class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02]">'+
      av(e.name,e.color||'#475569',28)+
      '<p class="text-sm text-slate-500">'+esc(e.name)+'</p></div>';
  }).join('')+
  (offList.length?'':'<p class="text-slate-500 text-sm text-center py-4">Everyone is active!</p>')+
  '</div></div>';

  lucide.createIcons();
  // Run counter + pop animations after render
  setTimeout(function() {
    if (window.runCounters)   runCounters();
    if (window.popStatNums)   popStatNums();
  }, 50);
}
