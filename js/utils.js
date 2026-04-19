// ============================================================
// UTILS — Helper Functions
// ============================================================
function initials(n){if(!n)return'?';return n.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2);}
function esc(s){if(s==null)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function timeAgo(ts){if(!ts)return'-';var d=(Date.now()-new Date(ts).getTime())/1000;if(d<60)return'just now';if(d<3600)return Math.floor(d/60)+'m ago';if(d<86400)return Math.floor(d/3600)+'h ago';return Math.floor(d/86400)+'d ago';}
function fmtDT(d){if(!d)return'-';return new Date(d).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
function pDot(active){return'<span class="presence-dot '+(active?'presence-online':'presence-offline')+'"></span>';}
function av(name,color,sz){sz=sz||32;return'<div class="avatar" style="width:'+sz+'px;height:'+sz+'px;background:'+(color||'#3b82f6')+'">'+initials(name)+'</div>';}

function sBadge(status){
  var m={
    Active:'badge-active',Paused:'badge-paused',Ended:'badge-ended',
    New:'badge-new',Contacted:'badge-contacted',Interested:'badge-interested',
    Closed:'badge-closed',pending:'badge-pending',answered:'badge-answered',
    online:'badge-online',offline:'badge-offline'
  };
  return'<span class="badge '+(m[status]||'badge-new')+'">'+esc(status)+'</span>';
}

// ── Mood badge ──
function moodBadge(mood){
  if(!mood) return '<span class="badge badge-mood-none">—</span>';
  var opt=MOOD_OPTIONS.find(function(m){return m.key===mood;});
  if(!opt) return '<span class="badge badge-mood-none">—</span>';
  return'<span class="badge '+opt.cls+'">'+opt.emoji+' '+opt.label+'</span>';
}

// ── Mood picker (inline buttons) ──
function moodPicker(clientId,currentMood){
  return'<div class="mood-picker">'+
    MOOD_OPTIONS.map(function(opt){
      var isActive=currentMood===opt.key;
      return'<button class="mood-btn'+(isActive?' mood-btn-active':'')+'" '+
        'onclick="saveMood(\''+clientId+'\',\''+opt.key+'\')" '+
        'title="'+opt.label+'">'+
        opt.emoji+
      '</button>';
    }).join('')+
    (currentMood?'<button class="mood-btn mood-btn-clear" onclick="saveMood(\''+clientId+'\',null)" title="Clear mood">✕</button>':'')+
  '</div>';
}

// ── Trials badge ──
function trialsBadge(count){
  var cls='badge-trials-none';
  if(count>=5) cls='badge-trials-high';
  else if(count>=3) cls='badge-trials-mid';
  else if(count>=1) cls='badge-trials-low';
  return'<span class="badge '+cls+'" title="'+count+' attempt(s)">🔄 '+count+'</span>';
}

function toast(msg,type){
  var c=document.getElementById('toast-container');
  var bg=(type==='error')?'bg-red-900/90 border border-red-700/50 text-red-200'
        :(type==='info')?'bg-blue-900/90 border border-blue-700/50 text-blue-200'
        :'bg-emerald-900/90 border border-emerald-700/50 text-emerald-200';
  var el=document.createElement('div');
  el.className='toast '+bg;
  el.textContent=msg;
  c.appendChild(el);
  setTimeout(function(){
    el.style.opacity='0';el.style.transform='translateX(50px)';el.style.transition='all .3s';
    setTimeout(function(){el.remove();},300);
  },3500);
}

function showConfirm(title,msg,cb,btnLabel,btnClass){
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-msg').textContent=msg;
  var btn=document.getElementById('confirm-exec-btn');
  btn.textContent=btnLabel||'Confirm';
  btn.className='btn btn-sm '+(btnClass||'btn-danger');
  confirmCb=cb;
  document.getElementById('confirm-overlay').classList.remove('hidden');
}
function closeConfirm(){document.getElementById('confirm-overlay').classList.add('hidden');confirmCb=null;}
function execConfirm(){if(confirmCb)confirmCb();closeConfirm();}

function csvExport(filename,headers,rows){
  var bom='\uFEFF';
  var csv=bom+headers.join(',')+'\\n'+rows.map(function(r){
    return r.map(function(c){return'"'+String(c==null?'':c).replace(/"/g,'""')+'"';}).join(',');
  }).join('\\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');a.href=url;a.download=filename;a.click();
  URL.revokeObjectURL(url);
}

function openMobileSidebar(){
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
}
function closeMobileSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

function openGenModal(title,html){
  var ex=document.getElementById('gen-modal-overlay');
  if(ex)ex.remove();
  var o=document.createElement('div');
  o.id='gen-modal-overlay';
  o.className='modal-overlay';
  o.style.zIndex='200';
  o.innerHTML='<div class="modal fade-in"><div class="modal-header"><h3 class="font-bold text-white">'+title+'</h3><button onclick="closeGenModal()" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button></div><div class="modal-body">'+html+'</div></div>';
  document.body.appendChild(o);
  lucide.createIcons();
}
function closeGenModal(){
  var el=document.getElementById('gen-modal-overlay');
  if(el)el.remove();
}

function toggleDarkMode(){
  S.darkMode=!S.darkMode;
  if(S.darkMode){document.body.classList.remove('light-mode');localStorage.setItem('darkMode','true');}
  else{document.body.classList.add('light-mode');localStorage.setItem('darkMode','false');}
  lucide.createIcons();
}

function playNotificationSound(){
  var audioContext=new(window.AudioContext||window.webkitAudioContext)();
  var oscillator=audioContext.createOscillator();
  var gainNode=audioContext.createGain();
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.frequency.value=800;
  oscillator.type='sine';
  gainNode.gain.setValueAtTime(0.3,audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01,audioContext.currentTime+0.5);
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime+0.5);
}

function hdr(title,desc,actions){
  return'<div class="flex items-start justify-between mb-6 fade-in gap-3" style="flex-wrap:wrap">'+
    '<div style="min-width:0;flex:1">'+
      '<h1 class="text-2xl font-bold text-white" style="line-height:1.2">'+title+'</h1>'+
      (desc?'<p class="text-slate-400 text-sm mt-1">'+desc+'</p>':'')+
    '</div>'+
    (actions?'<div class="flex gap-2" style="flex-wrap:wrap;align-items:center;flex-shrink:0">'+actions+'</div>':'')+
  '</div>';
}

// ── Save client mood ──
async function saveMood(cid,mood){
  var c=clientById(cid);
  if(!c)return;
  var newExtra=Object.assign({},c.extra_data||{});
  if(mood) newExtra.__mood=mood;
  else delete newExtra.__mood;
  try{
    var res=await sb.from('clients').update({extra_data:newExtra}).eq('id',cid);
    if(res.error)throw res.error;
    // Update local state immediately (optimistic UI)
    c.extra_data=newExtra;
    toast('Mood updated','success');
    // Re-render the expanded card area only
    renderMyClients();
  }catch(e){toast(e.message,'error');}
}

function getClientDisplayName(c){
  if(!c) return 'Unknown';
  if(c.name&&c.name.trim()&&c.name.trim()!=='"') return c.name.trim();
  var extra=c.extra_data||{};
  var nameKeys=['contract_id','customer_name','client_name','full_name','customer'];
  for(var i=0;i<nameKeys.length;i++){
    var val=extra[nameKeys[i]];
    if(val&&val.toString().trim()&&val.toString().trim()!=='"') return val.toString().trim();
  }
  var vals=Object.values(extra);
  for(var j=0;j<vals.length;j++){
    var v=(vals[j]||'').toString().trim();
    if(v&&v!=='"'&&isNaN(v)&&v.length>2&&!v.startsWith('__')) return v;
  }
  return 'Client';
}
