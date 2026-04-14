// ============================================================
// PAGE NOTIFICATIONS
// ============================================================
// ── NOTIFICATIONS ──
function renderNotifPage(){
  var m=document.getElementById('main-content');
  var unread=S.notifications.filter(function(n){return!n.read;}).length;
  m.innerHTML=hdr('Notifications',unread+' unread',(unread?'<button class="btn btn-ghost btn-sm" onclick="markAllRead()"><i data-lucide="check-check" class="w-4 h-4"></i> Mark all read</button>':''))+
  '<div class="space-y-2 fade-in">'+(S.notifications.length?S.notifications.map(function(n){
    return'<div class="card '+(n.read?'':'border-blue-500/15 bg-blue-500/[0.03]')+' cursor-pointer" onclick="markNotifRead(\''+n.id+'\')">'+
    '<div class="flex items-start gap-3"><div class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 '+(n.type==='data_updated'?'bg-blue-500/10':'bg-emerald-500/10')+'"><span class="text-sm">'+(n.type==='data_updated'?'📊':'💬')+'</span></div>'+
    '<div class="flex-1 min-w-0"><p class="text-sm '+(n.read?'text-slate-400':'text-white')+'">'+esc(n.message)+'</p><p class="text-xs text-slate-500 mt-1">'+fmtDT(n.created_at)+'</p></div>'+
    (!n.read?'<div class="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0 mt-2"></div>':'')+
    '</div></div>';
  }).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No notifications</p></div>')+'</div>';
  lucide.createIcons();
}
function markNotifRead(id){sb.from('notifications').update({read:true}).eq('id',id).then(function(){fetchAll().then(function(){buildSidebar();if(S.currentPage==='notifications')renderNotifPage();});}).catch(function(){});}
function markAllRead(){
  var q=S.role==='admin'?sb.from('notifications').update({read:true}).eq('read',false):sb.from('notifications').update({read:true}).eq('employee_id',S.employee.id).eq('read',false);
  q.then(function(){toast('All marked as read');fetchAll().then(function(){buildSidebar();if(S.currentPage==='notifications')renderNotifPage();});}).catch(function(e){toast(e.message,'error');});
}
