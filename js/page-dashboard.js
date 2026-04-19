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
  var closedCount=S.clients.filter(function(c){return c.status==='Closed';}).length;

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
    '<p class="text-xs text-emerald-400 mt-1">'+closedCount+' closed</p>'+
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
