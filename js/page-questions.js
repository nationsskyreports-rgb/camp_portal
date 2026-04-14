// ============================================================
// PAGE QUESTIONS — Ask a Question + My Questions
// ============================================================

function getClientDisplayName(c){
  if(!c) return 'Unknown';
  if(c.name && c.name.trim() && c.name.trim() !== '"') return c.name.trim();
  var extra = c.extra_data || {};
  var nameKeys = ['contract_id','customer_name','client_name','full_name'];
  for(var i=0;i<nameKeys.length;i++){
    var val = extra[nameKeys[i]];
    if(val && val.toString().trim() && val.toString().trim() !== '"') return val.toString().trim();
  }
  var vals = Object.values(extra);
  for(var j=0;j<vals.length;j++){
    var v = (vals[j]||'').toString().trim();
    if(v && v !== '"' && isNaN(v) && v.length > 2) return v;
  }
  return 'Client';
}

var qClientSearch = '';
var qSelectedClient = null;
var qSelectedCampaign = '';

function renderAskQuestion(){
  var m = document.getElementById('main-content');

  if(qSent){
    m.innerHTML = hdr('Ask a Question','Send a question to management')+
    '<div class="card border-emerald-500/20 fade-in text-center py-10">'+
    '<div class="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-3xl">✓</div>'+
    '<p class="text-white font-semibold mb-1">Question sent successfully.</p>'+
    '<p class="text-slate-400 text-sm mb-5">You\'ll be notified when it\'s answered.</p>'+
    '<button class="btn btn-primary" onclick="qSent=false;qSelectedClient=null;qClientSearch=\'\';renderAskQuestion()">Ask Another</button>'+
    '</div>';
    lucide.createIcons();
    return;
  }

  var cls = myClients();
  var campIds = [];
  cls.forEach(function(c){if(c.campaign_id&&campIds.indexOf(c.campaign_id)===-1)campIds.push(c.campaign_id);});
  var campOpts = '<option value="">All Campaigns</option>'+
    campIds.map(function(cid){
      var cp = campById(cid);
      return cp?'<option value="'+cid+'" '+(qSelectedCampaign===cid?'selected':'')+'>'+esc(cp.name)+'</option>':'';
    }).join('');

  var filteredClients = qSelectedCampaign ? cls.filter(function(c){return c.campaign_id===qSelectedCampaign;}) : cls;
  var searchResults = [];
  if(qClientSearch.length >= 1){
    var q = qClientSearch.toLowerCase();
    searchResults = filteredClients.filter(function(c){
      return getClientDisplayName(c).toLowerCase().indexOf(q) !== -1;
    }).slice(0,8);
  }

  var selectedClientHtml = '';
  if(qSelectedClient){
    var cp = campById(qSelectedClient.campaign_id);
    selectedClientHtml =
      '<div class="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">'+
        '<div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">'+
          initials(qSelectedClient.name)+
        '</div>'+
        '<div class="flex-1 min-w-0">'+
          '<p class="text-sm font-semibold text-white">'+esc(qSelectedClient.name)+'</p>'+
          '<p class="text-xs text-slate-400">'+(cp?esc(cp.name):'')+'</p>'+
        '</div>'+
        '<button onclick="qSelectedClient=null;qClientSearch=\'\';renderAskQuestion()" class="text-slate-400 hover:text-red-400">'+
          '<i data-lucide="x" class="w-4 h-4"></i>'+
        '</button>'+
      '</div>';
  }

  m.innerHTML = hdr('Ask a Question','Send a question to management')+
  '<div class="card fade-in" style="max-width:620px"><div class="space-y-5">'+

  '<div>'+
    '<label class="text-xs text-slate-400 mb-2 block font-medium uppercase tracking-wider">Filter by Campaign</label>'+
    '<select class="input" onchange="qSelectedCampaign=this.value;qSelectedClient=null;qClientSearch=\'\';renderAskQuestion()">'+campOpts+'</select>'+
  '</div>'+

  '<div>'+
    '<label class="text-xs text-slate-400 mb-2 block font-medium uppercase tracking-wider">Related Client <span class="text-slate-600">(optional)</span></label>'+
    (qSelectedClient ? selectedClientHtml :
      '<div class="relative">'+
        '<div class="relative">'+
          '<i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>'+
          '<input id="client-search-input" type="text" class="input pl-9" placeholder="Search client name..." '+
            'value="'+esc(qClientSearch)+'" '+
            'oninput="qClientSearch=this.value;renderAskQuestion()" '+
            'onkeydown="if(event.key===\'Escape\'){qClientSearch=\'\';renderAskQuestion()}">'+
        '</div>'+
        (qClientSearch.length >= 1 ?
          '<div class="absolute z-10 w-full mt-1 rounded-xl overflow-hidden shadow-2xl" style="background:var(--dropdown-bg,#0d1628);border:1px solid rgba(128,128,128,0.2)">'+
            (searchResults.length ?
              searchResults.map(function(c){
                var cp = campById(c.campaign_id);
                var name = getClientDisplayName(c);
                return '<div class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-white/5 transition-colors" '+
                  'style="border-bottom:1px solid rgba(128,128,128,0.1)" '+
                  'onmouseover="this.style.background=\'rgba(59,130,246,0.08)\'" '+
                  'onmouseout="this.style.background=\'\'" '+
                  'onclick="qSelectedClient={id:\''+c.id+'\',name:\''+name.replace(/'/g,'')+'\',campaign_id:\''+c.campaign_id+'\'};qClientSearch=\'\';renderAskQuestion()">'+
                  '<div class="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">'+
                    initials(name)+
                  '</div>'+
                  '<div class="min-w-0">'+
                    '<p class="text-sm font-medium truncate" style="color:var(--text-primary,#fff)">'+esc(name)+'</p>'+
                    '<p class="text-xs text-slate-500">'+(cp?esc(cp.name):'')+'</p>'+
                  '</div>'+
                '</div>';
              }).join('') :
              '<div class="px-4 py-6 text-center text-slate-500 text-sm">No clients found</div>'
            )+
          '</div>' : ''
        )+
      '</div>'
    )+
  '</div>'+

  '<div>'+
    '<label class="text-xs text-slate-400 mb-2 block font-medium uppercase tracking-wider">Question *</label>'+
    '<textarea id="qtext" class="input" rows="4" placeholder="Type your question here..."></textarea>'+
  '</div>'+

  '<button class="btn btn-primary w-full" onclick="submitQuestion()">'+
    '<i data-lucide="send" class="w-4 h-4"></i> Submit Question'+
  '</button>'+

  '</div></div>';

  lucide.createIcons();
  if(qClientSearch){
    var inp=document.getElementById('client-search-input');
    if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}
  }
}

async function submitQuestion(){
  var text=document.getElementById('qtext').value.trim();
  if(!text){toast('Type a question first','error');return;}

  var btn=document.querySelector('[onclick="submitQuestion()"]');
  if(btn){btn.disabled=true;btn.innerHTML='<i data-lucide="loader" class="w-4 h-4"></i> Sending...';}

  try{
    // 1. Insert question
    var res=await sb.from('questions').insert({
      employee_id: S.employee.id,
      employee_name: S.employee.name,
      question_text: text,
      related_client_id: qSelectedClient ? qSelectedClient.id : null,
      related_campaign_id: qSelectedCampaign || null,
      status: 'pending'
    });
    if(res.error)throw res.error;

    // 2. Notify admin
    await notifyAdmin(
      'new_question',
      S.employee.name+' sent a question: "'+text.slice(0,80)+(text.length>80?'...':'')+'"'
    );

    qSent=true;
    toast('Question sent!','success');
    renderAskQuestion();
  }catch(e){
    toast(e.message,'error');
    if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="send" class="w-4 h-4"></i> Submit Question';}
  }
}

// ── MY QUESTIONS ──
function renderMyQuestions(){
  var m=document.getElementById('main-content');
  var qs=S.questions.filter(function(q){return q.employee_id===S.employee.id;});
  qs.sort(function(a,b){
    if(a.status==='pending'&&b.status!=='pending')return -1;
    if(a.status!=='pending'&&b.status==='pending')return 1;
    return new Date(b.created_at)-new Date(a.created_at);
  });

  m.innerHTML=hdr('My Questions',qs.length+' questions')+
  '<div class="space-y-3 fade-in">'+
  (qs.length?qs.map(function(q){
    var cl=q.related_client_id?clientById(q.related_client_id):null;
    var cp=q.related_campaign_id?campById(q.related_campaign_id):null;
    return'<div class="card">'+
      '<div class="flex items-start justify-between gap-3 mb-3">'+
        '<div class="flex items-center gap-2 flex-wrap">'+
          sBadge(q.status)+
          (cl?'<span class="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">'+esc(getClientDisplayName(cl))+'</span>':'')+
          (cp?'<span class="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">'+esc(cp.name)+'</span>':'')+
        '</div>'+
        '<span class="text-xs text-slate-500 flex-shrink-0">'+fmtDT(q.created_at)+'</span>'+
      '</div>'+
      '<p class="text-sm text-slate-200 mb-3 leading-relaxed">'+esc(q.question_text)+'</p>'+
      (q.status==='answered'?
        '<div class="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">'+
          '<div class="flex items-center gap-2 mb-2">'+
            '<div class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">'+
              '<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i>'+
            '</div>'+
            '<p class="text-xs text-emerald-400 font-semibold">Reply · '+fmtDT(q.replied_at)+'</p>'+
          '</div>'+
          '<p class="text-sm text-slate-200 leading-relaxed">'+esc(q.admin_reply)+'</p>'+
        '</div>':
        '<div class="flex items-center gap-2 text-amber-400">'+
          '<i data-lucide="clock" class="w-3.5 h-3.5"></i>'+
          '<p class="text-xs font-medium">Awaiting reply...</p>'+
        '</div>'
      )+
    '</div>';
  }).join(''):
  '<div class="card text-center py-12">'+
    '<div class="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center">'+
      '<i data-lucide="messages-square" class="w-6 h-6 text-slate-600"></i>'+
    '</div>'+
    '<p class="text-slate-500">No questions yet</p>'+
  '</div>')+
  '</div>';
  lucide.createIcons();
}
