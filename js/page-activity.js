// ============================================================
// PAGE ACTIVITY LOG — admin view
// ============================================================
var auditSearch = '';
var auditLogs   = [];
var auditLoaded = false;

function setAuditSearch(v){ auditSearch=v; renderActivityLog(); restoreSearchFocus('audit-search'); }

function renderActivityLog(){
  var m = document.getElementById('main-content');
  if(!auditLoaded){
    m.innerHTML = hdr('Activity Log','Who did what and when') +
      '<div class="flex items-center justify-center py-20"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" style="animation:spin .7s linear infinite"></div></div>';
    sb.from('audit_log').select('*').order('created_at',{ascending:false}).limit(300)
      .then(function(r){ auditLogs=r.data||[]; auditLoaded=true; renderActivityLog(); });
    return;
  }
  var logs = auditLogs;
  if(auditSearch){
    var q=auditSearch.toLowerCase();
    logs=logs.filter(function(l){
      return (l.actor_name||'').toLowerCase().indexOf(q)>-1 ||
             (l.entity_name||'').toLowerCase().indexOf(q)>-1 ||
             (l.action||'').toLowerCase().indexOf(q)>-1;
    });
  }
  var ACTION_STYLE={
    create:{icon:'plus-circle',color:'#10b981'},update:{icon:'pencil',color:'#3b82f6'},
    delete:{icon:'trash-2',color:'#ef4444'},assign:{icon:'user-plus',color:'#8b5cf6'},
    unassign:{icon:'user-x',color:'#f59e0b'},upload:{icon:'upload',color:'#06b6d4'},
    form_submit:{icon:'clipboard-check',color:'#10b981'}
  };
  m.innerHTML = hdr('Activity Log','Who did what and when',
    '<button class="btn btn-ghost btn-sm" onclick="auditLoaded=false;renderActivityLog()"><i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh</button>')+
    '<div class="card mb-4 fade-in" style="padding:.75rem 1rem">'+
      '<div class="flex items-center gap-3">'+
        searchBox('audit-search',auditSearch,'setAuditSearch','Search actor, client, action...')+
        '<span class="text-xs text-slate-500">'+logs.length+' entries</span>'+
      '</div>'+
    '</div>'+
    '<div class="card fade-in" style="padding:.5rem 0">'+
    (logs.length?logs.map(function(l){
      var st=ACTION_STYLE[l.action]||{icon:'activity',color:'#64748b'};
      var when=new Date(l.created_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
      return '<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.04)">'+
        '<div style="width:28px;height:28px;border-radius:7px;background:'+st.color+'18;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px">'+
          '<i data-lucide="'+st.icon+'" style="width:13px;height:13px;color:'+st.color+'"></i>'+
        '</div>'+
        '<div style="flex:1;min-width:0">'+
          '<p style="font-size:13px;color:#e2e8f0"><strong>'+esc(l.actor_name||'?')+'</strong> '+
          '<span style="color:'+st.color+'">'+esc(l.action.replace(/_/g,' '))+'</span> '+
          esc(l.entity_type)+(l.entity_name?' — <span style="color:#94a3b8">'+esc(l.entity_name)+'</span>':'')+
          '</p>'+
        '</div>'+
        '<span style="font-size:11px;color:#64748b;flex-shrink:0">'+when+'</span>'+
      '</div>';
    }).join(''):'<p class="text-slate-500 text-sm text-center py-10">No activity yet</p>')+
    '</div>';
  lucide.createIcons();
}
