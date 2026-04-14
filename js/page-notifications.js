// ============================================================
// PAGE NOTIFICATIONS — Employee Notification Center
// ============================================================

var notifFilter = 'all'; // 'all' | 'unread' | 'data_updated' | 'question_answered'

function renderNotifPage(){
  var m = document.getElementById('main-content');
  // Admin sees notifications where employee_id is null
  // Employee sees their own notifications
  var all = S.role==='admin'
    ? S.notifications.filter(function(n){return n.employee_id===null;})
    : S.notifications;
  var unreadCount = all.filter(function(n){return !n.read;}).length;

  // Apply filter
  var filtered = all;
  if(notifFilter === 'unread') filtered = all.filter(function(n){return !n.read;});
  else if(notifFilter === 'data_updated') filtered = all.filter(function(n){return n.type==='data_updated';});
  else if(notifFilter === 'question_answered') filtered = all.filter(function(n){return n.type==='question_answered';});

  // Filter tabs
  var tabs = [
    {key:'all',      label:'All',         count: all.length},
    {key:'unread',   label:'Unread',      count: unreadCount},
    {key:'data_updated',      label:'📊 Data',     count: all.filter(function(n){return n.type==='data_updated';}).length},
    {key:'question_answered', label:'💬 Answers',  count: all.filter(function(n){return n.type==='question_answered';}).length},
  ];

  var tabsHtml = '<div class="flex gap-2 flex-wrap mb-6">'+
    tabs.map(function(t){
      return '<button onclick="notifFilter=\''+t.key+'\';renderNotifPage()" '+
        'class="btn btn-sm '+(notifFilter===t.key?'btn-primary':'btn-ghost')+'">'+
        t.label+
        (t.count>0 ? ' <span class="ml-1 text-xs '+(notifFilter===t.key?'opacity-80':'text-slate-500')+'">'+t.count+'</span>' : '')+
      '</button>';
    }).join('')+
  '</div>';

  m.innerHTML = hdr('Notifications',
    unreadCount > 0 ? unreadCount+' unread' : 'All caught up!',
    unreadCount > 0 ? '<button class="btn btn-ghost btn-sm" onclick="markAllRead()"><i data-lucide="check-check" class="w-4 h-4"></i> Mark all read</button>' : ''
  )+
  tabsHtml+
  '<div class="space-y-2 fade-in">'+
  (filtered.length ?
    filtered.map(function(n){
      var isData = n.type === 'data_updated';
      var isAnswer = n.type === 'question_answered';
      var icon = isData ? '📊' : isAnswer ? '💬' : '🔔';
      var iconBg = isData ? 'bg-blue-500/10' : isAnswer ? 'bg-emerald-500/10' : 'bg-slate-500/10';
      var borderCls = n.read ? '' : 'border-blue-500/20 bg-blue-500/[0.02]';

      return '<div class="card '+borderCls+' cursor-pointer transition-all hover:border-white/15" onclick="markNotifRead(\''+n.id+'\')">'+
        '<div class="flex items-start gap-3">'+

          // Icon
          '<div class="w-10 h-10 rounded-xl '+iconBg+' flex items-center justify-center flex-shrink-0 text-lg">'+icon+'</div>'+

          // Content
          '<div class="flex-1 min-w-0">'+
            '<p class="text-sm '+(n.read?'text-slate-400':'text-white font-medium')+' leading-relaxed">'+esc(n.message)+'</p>'+
            '<p class="text-xs text-slate-500 mt-1">'+fmtDT(n.created_at)+'</p>'+
          '</div>'+

          // Unread dot
          (!n.read ?
            '<div class="w-2.5 h-2.5 rounded-full bg-blue-400 flex-shrink-0 mt-1.5"></div>' :
            '<i data-lucide="check" class="w-4 h-4 text-slate-700 flex-shrink-0 mt-0.5"></i>'
          )+

        '</div>'+

        // If it's an answer — show a "View Reply" hint
        (isAnswer && !n.read ?
          '<div class="mt-3 pt-3 border-t border-white/5">'+
            '<button onclick="event.stopPropagation();markNotifRead(\''+n.id+'\');navigateTo(\'my-questions\')" '+
              'class="btn btn-ghost btn-sm text-emerald-400 border-emerald-500/20">'+
              '<i data-lucide="external-link" class="w-3.5 h-3.5"></i> View Reply'+
            '</button>'+
          '</div>' : ''
        )+

      '</div>';
    }).join('') :
    '<div class="card text-center py-16">'+
      '<div class="w-14 h-14 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">'+
        '<i data-lucide="bell-off" class="w-7 h-7 text-slate-600"></i>'+
      '</div>'+
      '<p class="text-slate-400 font-medium">No notifications</p>'+
      '<p class="text-slate-600 text-sm mt-1">'+
        (notifFilter!=='all' ? 'Try switching to "All"' : 'You\'re all caught up!')+
      '</p>'+
    '</div>'
  )+
  '</div>';

  lucide.createIcons();
}

function markNotifRead(id){
  sb.from('notifications').update({read:true}).eq('id',id)
    .then(function(){
      fetchAll().then(function(){
        buildSidebar();
        if(S.currentPage==='notifications') renderNotifPage();
      });
    }).catch(function(){});
}

function markAllRead(){
  var q = S.role==='admin' ?
    sb.from('notifications').update({read:true}).eq('read',false) :
    sb.from('notifications').update({read:true}).eq('employee_id',S.employee.id).eq('read',false);
  q.then(function(){
    toast('All marked as read');
    fetchAll().then(function(){
      buildSidebar();
      if(S.currentPage==='notifications') renderNotifPage();
    });
  }).catch(function(e){toast(e.message,'error');});
}
