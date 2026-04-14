// ============================================================
// PAGE QA — Q&A Inbox
// ============================================================
function renderQA(){
  var m=document.getElementById('main-content');
  var qs=S.questions.slice();
  if(qaFilter.employee)qs=qs.filter(function(q){return q.employee_id===qaFilter.employee;});
  if(qaFilter.campaign)qs=qs.filter(function(q){return q.related_campaign_id===qaFilter.campaign;});
  if(qaFilter.status)qs=qs.filter(function(q){return q.status===qaFilter.status;});
  qs.sort(function(a,b){
    if(a.status==='pending'&&b.status!=='pending')return -1;
    if(a.status!=='pending'&&b.status==='pending')return 1;
    return new Date(b.created_at)-new Date(a.created_at);
  });
  var empOpts='<option value="">All Employees</option>'+S.employees.map(function(e){return'<option value="'+e.id+'" '+(qaFilter.employee===e.id?'selected':'')+'>'+esc(e.name)+'</option>';}).join('');
  var campOpts='<option value="">All Campaigns</option>'+S.campaigns.map(function(c){return'<option value="'+c.id+'" '+(qaFilter.campaign===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('');
  var pc=S.questions.filter(function(q){return q.status==='pending';}).length;

  m.innerHTML=hdr('Q&A Inbox',pc+' pending')+
  '<div class="card mb-6 fade-in"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">'+
  '<select class="input" onchange="qaFilter.employee=this.value;renderQA()">'+empOpts+'</select>'+
  '<select class="input" onchange="qaFilter.campaign=this.value;renderQA()">'+campOpts+'</select>'+
  '<select class="input" onchange="qaFilter.status=this.value;renderQA()">'+
    '<option value="">All Status</option>'+
    '<option value="pending" '+(qaFilter.status==='pending'?'selected':'')+'>Pending</option>'+
    '<option value="answered" '+(qaFilter.status==='answered'?'selected':'')+'>Answered</option>'+
  '</select>'+
  '</div></div>'+
  '<div class="space-y-3 fade-in">'+
  (qs.length?qs.map(function(q){
    var emp=empById(q.employee_id);
    var cl=q.related_client_id?clientById(q.related_client_id):null;
    var cp=q.related_campaign_id?campById(q.related_campaign_id):null;
    return'<div class="card">'+
      '<div class="flex items-start gap-3">'+
      (emp?av(emp.name,emp.color||'#3b82f6',36):'<div class="avatar" style="width:36px;height:36px;background:#475569">?</div>')+
      '<div class="flex-1 min-w-0">'+
        '<div class="flex items-center gap-2 mb-1 flex-wrap">'+
          '<span class="text-sm font-semibold text-white">'+esc(q.employee_name||'Employee')+'</span>'+
          sBadge(q.status)+
          '<span class="text-xs text-slate-500">'+timeAgo(q.created_at)+'</span>'+
          (cl?'<span class="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">'+esc(getClientDisplayName(cl))+'</span>':'')+
          (cp?'<span class="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">'+esc(cp.name)+'</span>':'')+
        '</div>'+
        '<p class="text-sm text-slate-300 mb-3 leading-relaxed">'+esc(q.question_text)+'</p>'+
        (q.status==='pending'?
          '<div class="flex gap-2">'+
            '<textarea id="reply-'+q.id+'" class="input flex-1" placeholder="Type your reply..." rows="2"></textarea>'+
            '<button class="btn btn-primary self-end" onclick="sendReply(\''+q.id+'\')">'+
              '<i data-lucide="send" class="w-4 h-4"></i> Send'+
            '</button>'+
          '</div>':
          '<div class="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">'+
            '<div class="flex items-center gap-2 mb-2">'+
              '<div class="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">'+
                '<i data-lucide="check" class="w-3 h-3 text-emerald-400"></i>'+
              '</div>'+
              '<p class="text-xs text-emerald-400 font-semibold">Reply · '+fmtDT(q.replied_at)+'</p>'+
            '</div>'+
            '<p class="text-sm text-slate-200 leading-relaxed">'+esc(q.admin_reply)+'</p>'+
          '</div>'
        )+
      '</div></div></div>';
  }).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No questions</p></div>')+
  '</div>';
  lucide.createIcons();
}

async function sendReply(qid){
  var ta=document.getElementById('reply-'+qid);
  if(!ta||!ta.value.trim()){toast('Type a reply','error');return;}
  var replyText=ta.value.trim();

  var btn=document.querySelector('[onclick="sendReply(\''+qid+'\')"]');
  if(btn){btn.disabled=true;btn.innerHTML='<i data-lucide="loader" class="w-4 h-4"></i> Sending...';}

  try{
    // 1. Update question
    var res=await sb.from('questions')
      .update({status:'answered', admin_reply:replyText, replied_at:new Date().toISOString()})
      .eq('id',qid);
    if(res.error)throw res.error;

    // 2. Notify employee
    var q=S.questions.find(function(x){return x.id===qid;});
    if(q&&q.employee_id){
      await notifyEmployee(
        q.employee_id,
        'question_answered',
        'Your question was answered: "'+replyText.slice(0,80)+(replyText.length>80?'...':'')+'"'
      );
    }

    toast('Reply sent!','success');
    fetchAll().then(renderQA);
  }catch(e){
    toast(e.message,'error');
    if(btn){btn.disabled=false;btn.innerHTML='<i data-lucide="send" class="w-4 h-4"></i> Send';}
  }
}
