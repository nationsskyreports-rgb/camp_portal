// ============================================================
// PAGE QUESTIONS
// ============================================================
// ── ASK QUESTION ──
function renderAskQuestion(){
  var m=document.getElementById('main-content');var cls=myClients();
  var clientOpts='<option value="">None</option>'+cls.map(function(c){return'<option value="'+c.id+'">'+esc(c.name)+'</option>';}).join('');
  var campIds=[];cls.forEach(function(c){if(c.campaign_id&&campIds.indexOf(c.campaign_id)===-1)campIds.push(c.campaign_id);});
  var campOpts='<option value="">None</option>'+campIds.map(function(cid){var cp=campById(cid);return cp?'<option value="'+cid+'">'+esc(cp.name)+'</option>':'';}).join('');
  m.innerHTML=hdr('Ask a Question','Send a question to management')+
  (qSent?'<div class="card border-emerald-500/20 fade-in text-center py-10"><div class="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center text-3xl">✓</div><p class="text-white font-semibold mb-1">Question sent successfully.</p><p class="text-slate-400 text-sm mb-5">You\'ll be notified when it\'s answered.</p><button class="btn btn-primary" onclick="qSent=false;renderAskQuestion()">Ask Another</button></div>':
  '<div class="card fade-in" style="max-width:600px"><div class="space-y-4">'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Related Client</label><select id="qclient" class="input">'+clientOpts+'</select></div>'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Related Campaign</label><select id="qcamp" class="input">'+campOpts+'</select></div>'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Question *</label><textarea id="qtext" class="input" rows="4" placeholder="Type your question..."></textarea></div>'+
  '<button class="btn btn-primary" onclick="submitQuestion()"><i data-lucide="send" class="w-4 h-4"></i> Submit</button></div></div>');
  lucide.createIcons();
}
function submitQuestion(){
  var text=document.getElementById('qtext').value.trim();if(!text){toast('Type a question','error');return;}
  sb.from('questions').insert({employee_id:S.employee.id,employee_name:S.employee.name,question_text:text,related_client_id:document.getElementById('qclient').value||null,related_campaign_id:document.getElementById('qcamp').value||null,status:'pending'})
    .then(function(){qSent=true;toast('Question sent');renderAskQuestion();}).catch(function(e){toast(e.message,'error');});
}

// ── MY QUESTIONS ──
function renderMyQuestions(){
  var m=document.getElementById('main-content');
  var qs=S.questions.filter(function(q){return q.employee_id===S.employee.id;});
  qs.sort(function(a,b){if(a.status==='pending'&&b.status!=='pending')return-1;if(a.status!=='pending'&&b.status==='pending')return 1;return new Date(b.created_at)-new Date(a.created_at);});
  m.innerHTML=hdr('My Questions',qs.length+' questions')+
  '<div class="space-y-3 fade-in">'+(qs.length?qs.map(function(q){
    return'<div class="card">'+sBadge(q.status)+'<span class="text-xs text-slate-500 ml-2">'+fmtDT(q.created_at)+'</span>'+
    '<p class="text-sm text-slate-300 mt-2 mb-3">'+esc(q.question_text)+'</p>'+
    (q.status==='answered'?'<div class="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"><p class="text-xs text-emerald-400 font-medium mb-1">Reply</p><p class="text-sm text-slate-200">'+esc(q.admin_reply)+'</p></div>':
    '<p class="text-xs text-amber-400">Awaiting reply...</p>')+'</div>';
  }).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No questions yet</p></div>')+'</div>';
  lucide.createIcons();
}
