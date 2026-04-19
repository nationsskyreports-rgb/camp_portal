// ============================================================
// STATE — Global App State
// ============================================================
var S = {
  role:null, employee:null, currentPage:'',
  employees:[], campaigns:[], clients:[],
  questions:[], notifications:[], contactHistory:[],
  darkMode:true
};

if(localStorage.getItem('darkMode')==='false'){
  S.darkMode=false;
  document.body.classList.add('light-mode');
}

// Upload state
var U = {
  campaignId:'', rows:[], preview:null, uploadTab:'paste',
  colConfig: null, detectedCols: null
};

// Team form state
var T = {showForm:false, editId:null, name:'', email:'', phone:'', pin:''};

// UI state
var showCampForm      = false;
var selectedCampId    = null;
var expandedClientId  = null;
var qSent             = false;
var confirmCb         = null;
var qaFilter          = {employee:'', campaign:'', status:''};
var rptFilter         = {campaign:'', employee:'', status:'', dateFrom:'', dateTo:'', page:0};
var empClientFilter   = '';
var clientSearch      = '';
var clientPage        = 0;
var RPT_PAGE_SIZE     = 100;

// Column config modal state
var colConfigCampaignId = null;
var colConfigWorking    = [];
var colConfigDragSrc    = null;

// Bulk reassign state
var bulkReassignState = { selectedClients:{}, targetEmployee:null };

// Cleanup state
var cleanupState = {
  campaignId:'', clients:[], selected:{},
  loading:false, searchText:'', importBatch:'', batches:[]
};

// Realtime channel ref
var realtimeChannel = null;

// ============================================================
// DATA FETCH
// ============================================================
function fetchAll(){
  return Promise.all([
    sb.from('employees').select('*').order('name'),
    sb.from('campaigns').select('*').order('created_at',{ascending:false}),
    sb.from('clients').select('*').order('created_at',{ascending:false}),
    sb.from('questions').select('*').order('created_at',{ascending:false})
  ]).then(function(res){
    S.employees  = res[0].data||[];
    S.campaigns  = res[1].data||[];
    S.clients    = res[2].data||[];
    S.questions  = res[3].data||[];

    if(S.role==='employee'&&S.employee){
      var fresh=S.employees.find(function(e){return e.id===S.employee.id;});
      if(fresh)S.employee=fresh;
    }

    if(S.role==='employee'&&S.employee){
      var ids=S.clients.filter(function(c){return c.assigned_employee_id===S.employee.id;}).map(function(c){return c.id;});
      return Promise.all([
        sb.from('notifications').select('*').eq('employee_id',S.employee.id).order('created_at',{ascending:false}),
        ids.length?sb.from('contact_history').select('*').in('client_id',ids).order('created_at',{ascending:false}):Promise.resolve({data:[]})
      ]).then(function(r2){S.notifications=r2[0].data||[];S.contactHistory=r2[1].data||[];});
    } else if(S.role==='admin'){
      return Promise.all([
        sb.from('notifications').select('*').is('employee_id',null).order('created_at',{ascending:false}).limit(100),
        sb.from('contact_history').select('*').order('created_at',{ascending:false})
      ]).then(function(r2){S.notifications=r2[0].data||[];S.contactHistory=r2[1].data||[];});
    } else {S.notifications=[];S.contactHistory=[];}
  }).catch(function(e){console.error('Fetch error:',e);});
}

// ============================================================
// REALTIME — Replace 30s polling with live subscriptions
// ============================================================
function setupRealtime(){
  if(realtimeChannel){
    try{sb.removeChannel(realtimeChannel);}catch(e){}
    realtimeChannel=null;
  }

  var debounceTimer=null;
  function debounceRefresh(pages,renderFn){
    clearTimeout(debounceTimer);
    debounceTimer=setTimeout(function(){
      fetchAll().then(function(){
        buildSidebar();
        if(pages.indexOf(S.currentPage)!==-1&&renderFn) renderFn();
        else if(pages.indexOf(S.currentPage)!==-1) renderPage();
      });
    },800);
  }

  realtimeChannel = sb.channel('portal-live')
    .on('postgres_changes',{event:'*',schema:'public',table:'clients'},function(){
      debounceRefresh(['dashboard','my-clients','reports','campaigns','cleanup']);
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'contact_history'},function(){
      debounceRefresh(['my-clients','dashboard']);
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'notifications'},function(){
      debounceRefresh(['notifications'],renderNotifPage);
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'questions'},function(){
      debounceRefresh(['qa','my-questions']);
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'employees'},function(){
      debounceRefresh(['dashboard','team']);
    })
    .subscribe(function(status){
      if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){
        console.warn('Realtime unavailable — using fallback polling');
        setInterval(function(){
          if(S.role){
            fetchAll().then(function(){
              buildSidebar();
              if(S.currentPage==='dashboard'||S.currentPage==='notifications') renderPage();
            });
          }
        },30000);
      }
    });
}

function teardownRealtime(){
  if(realtimeChannel){
    try{sb.removeChannel(realtimeChannel);}catch(e){}
    realtimeChannel=null;
  }
}

// ============================================================
// STATE HELPERS
// ============================================================
function empById(id){return S.employees.find(function(e){return e.id===id;});}
function campById(id){return S.campaigns.find(function(c){return c.id===id;});}
function clientById(id){return S.clients.find(function(c){return c.id===id;});}
function myClients(){
  if(S.role==='admin')return S.clients;
  return S.clients.filter(function(c){return c.assigned_employee_id===S.employee.id;});
}
function clientHistory(cid){return S.contactHistory.filter(function(h){return h.client_id===cid;});}
function unreadCount(){return S.notifications.filter(function(n){return!n.read;}).length;}
function activeEmps(){return S.employees.filter(function(e){return e.is_active===true;});}

// ── Mood helpers (stored in extra_data.__mood, no schema change needed) ──
function getClientMood(c){
  return (c.extra_data&&c.extra_data.__mood)||null;
}

// ── Trial helpers (count from contact_history, no schema change needed) ──
function getClientTrials(cid){
  return clientHistory(cid).length;
}
