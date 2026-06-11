// ============================================================
// PAGE TEAM Q&A — shared knowledge base for all agents
// All answered questions from the whole team, searchable
// ============================================================
var tqaSearch = '';

function setTqaSearch(v){
  tqaSearch = v;
  renderTeamQA();
  restoreSearchFocus('tqa-search');
}

function renderTeamQA(){
  var m = document.getElementById('main-content');

  // All ANSWERED questions from everyone (knowledge base)
  var qs = S.questions.filter(function(q){ return q.status === 'answered'; });

  // search in question + answer text
  if (tqaSearch) {
    var q = tqaSearch.toLowerCase();
    qs = qs.filter(function(x){
      return (x.question_text||'').toLowerCase().indexOf(q) > -1 ||
             (x.admin_reply||'').toLowerCase().indexOf(q) > -1;
    });
  }

  // newest first
  qs.sort(function(a,b){ return new Date(b.replied_at||b.created_at) - new Date(a.replied_at||a.created_at); });

  m.innerHTML = hdr('Team Q&A', 'Answered questions from the whole team — learn from each other')+

    '<div class="card mb-4 fade-in" style="padding:.75rem 1rem">'+
      '<div class="flex items-center gap-3 flex-wrap">'+
        searchBox('tqa-search', tqaSearch, 'setTqaSearch', 'Search questions & answers...')+
        '<span class="text-xs text-slate-500">'+qs.length+' answered question'+(qs.length===1?'':'s')+'</span>'+
      '</div>'+
    '</div>'+

    '<div class="space-y-3 fade-in">'+
    (qs.length ? qs.map(function(q){
      var emp = empById(q.employee_id);
      var cp  = q.related_campaign_id ? campById(q.related_campaign_id) : null;
      return '<div class="card">'+
        '<div class="flex items-start justify-between gap-3 mb-3">'+
          '<div class="flex items-center gap-2 flex-wrap">'+
            (emp ? av(emp.name, emp.color||'#3b82f6', 22)+'<span class="text-xs text-slate-300">'+esc(emp.name)+'</span>' : '<span class="text-xs text-slate-500">Unknown</span>')+
            (cp ? '<span class="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">'+esc(cp.name)+'</span>' : '')+
          '</div>'+
          '<span class="text-xs text-slate-500 flex-shrink-0">'+fmtDT(q.created_at)+'</span>'+
        '</div>'+
        '<p class="text-sm text-slate-200 mb-3 leading-relaxed"><span class="text-slate-500 text-xs font-semibold">Q: </span>'+esc(q.question_text)+'</p>'+
        '<div class="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">'+
          '<div class="flex items-center gap-2 mb-2">'+
            '<div class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">'+
              '<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i>'+
            '</div>'+
            '<p class="text-xs text-emerald-400 font-semibold">Admin Reply · '+fmtDT(q.replied_at)+'</p>'+
          '</div>'+
          '<p class="text-sm text-slate-200 leading-relaxed">'+esc(q.admin_reply)+'</p>'+
        '</div>'+
      '</div>';
    }).join('') : '<div class="card text-center py-12"><i data-lucide="messages-square" class="w-10 h-10 text-slate-600 mx-auto mb-3"></i><p class="text-slate-500">No answered questions yet</p></div>')+
    '</div>';

  lucide.createIcons();
}
