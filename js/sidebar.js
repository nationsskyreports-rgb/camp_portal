// ============================================================
// SIDEBAR — Navigation + Active Status Toggle
// ============================================================
function buildSidebar(){
  var pages=S.role==='admin'?ADMIN_PAGES:EMP_PAGES;
  var html='';
  for(var i=0;i<pages.length;i++){
    var p=pages[i];
    var extra='';
    if(p.id==='notifications'&&S.role==='employee'){
      var uc=unreadCount();
      if(uc>0)extra='<span class="ml-auto text-xs bg-blue-500/20 text-blue-400 rounded-full px-2 py-0.5">'+uc+'</span>';
    }
    html+='<div class="sidebar-item '+(S.currentPage===p.id?'active':'')+'" onclick="navigateTo(\''+p.id+'\');closeMobileSidebar()">'+
      '<i data-lucide="'+p.icon+'" class="w-[18px] h-[18px]"></i><span>'+p.label+'</span>'+extra+'</div>';
  }
  document.getElementById('sidebar-nav').innerHTML=html;

  var ud=document.getElementById('sidebar-user');
  var ta=document.getElementById('active-toggle-area');
  if(S.role==='admin'){
    ud.innerHTML=av('AD','#3b82f6',28)+'<div><p class="text-sm font-semibold text-white">Admin</p><p class="text-[11px] text-slate-500">Full Access</p></div>';
    ta.classList.add('hidden');
  } else if(S.employee){
    var e=S.employee;
    ud.innerHTML=av(e.name,e.color||'#3b82f6',28)+'<div>'+
      '<p class="text-sm font-semibold text-white">'+esc(e.name)+'</p>'+
      '<p class="text-[11px] '+(e.is_active?'text-emerald-400':'text-slate-500')+'">'+esc(e.is_active?'Active':'Inactive')+'</p></div>';
    ta.classList.remove('hidden');
    updateActiveToggleUI();
  }

  document.getElementById('sidebar-title').textContent = S.role==='admin'?'Admin Portal':'Employee Portal';
  // Update subtitle to current page name
  var allPages = ADMIN_PAGES.concat(EMP_PAGES);
  var currentPg = allPages.find(function(p){return p.id===S.currentPage;});
  document.getElementById('sidebar-subtitle').textContent = currentPg ? currentPg.label : (S.role==='admin'?'Management':'Dashboard');
  lucide.createIcons();
}

function navigateTo(page){
  S.currentPage=page;
  buildSidebar();
  renderPage();
  // Only show mobile topbar title when inside the app shell
  if(S.role){
    var allPages=ADMIN_PAGES.concat(EMP_PAGES);
    var pg=allPages.find(function(p){return p.id===page;});
    var titleEl=document.getElementById('mobile-page-title');
    if(titleEl&&pg)titleEl.textContent=pg.label;
    var tb=document.getElementById('mobile-topbar-title');
    if(tb)tb.style.display='flex';
  }
}

function renderPage(){
  var m=document.getElementById('main-content');
  m.innerHTML='<div class="flex items-center justify-center py-20"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>';
  setTimeout(function(){
    var fn={
      dashboard:renderDashboard,campaigns:renderCampaigns,
      upload:renderUpload,qa:renderQA,reports:renderReports,
      team:renderTeam,'my-clients':renderMyClients,
      'ask-question':renderAskQuestion,'my-questions':renderMyQuestions,
      notifications:renderNotifPage,cleanup:renderCleanup
    };
    if(fn[S.currentPage])fn[S.currentPage]();
    else renderDashboard();
  },80);
}

// ── Active Status Toggle ──
function toggleActiveStatus(){
  if(!S.employee)return;
  var newActive=!S.employee.is_active;
  S.employee.is_active=newActive;
  updateActiveToggleUI();
  sb.from('employees').update({is_active:newActive}).eq('id',S.employee.id)
    .then(function(){
      toast(newActive?'You are now Active':'You are now Inactive',(newActive?'success':'info'));
      fetchAll().then(buildSidebar);
    })
    .catch(function(e){
      S.employee.is_active=!newActive;
      updateActiveToggleUI();
      toast(e.message,'error');
    });
}

function updateActiveToggleUI(){
  if(!S.employee)return;
  var active=S.employee.is_active;
  var btn   =document.getElementById('active-toggle-btn');
  var track =document.getElementById('toggle-track');
  var thumb =document.getElementById('toggle-thumb');
  var label =document.getElementById('toggle-label');
  var sub   =document.getElementById('toggle-sublabel');
  var badge =document.getElementById('toggle-badge');
  if(!btn)return;
  btn.className  ='active-toggle '+(active?'is-active':'is-inactive');
  track.className='toggle-track '+(active?'on':'off');
  thumb.className='toggle-thumb '+(active?'on':'off');
  label.textContent=active?'Active':'Set Active';
  label.style.color=active?'#10b981':'#94a3b8';
  sub.textContent  =active?'You\'re online & receiving clients':'You\'re currently offline';
  badge.textContent=active?'Online':'Offline';
  badge.style.background=active?'rgba(16,185,129,0.15)':'rgba(100,116,139,0.15)';
  badge.style.color      =active?'#10b981':'#64748b';
}
