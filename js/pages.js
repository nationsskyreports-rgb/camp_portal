// ============================================================
// PAGES — All Page Render Functions
// ============================================================

// ── DASHBOARD ──
function renderDashboard(){
  var m=document.getElementById('main-content');
  var ac=S.campaigns.filter(function(c){return c.status==='Active';});
  var pq=S.questions.filter(function(q){return q.status==='pending';});
  var onlineEmps=activeEmps();
  var dist=onlineEmps.map(function(e){return{name:e.name,color:e.color,count:S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length};}).sort(function(a,b){return b.count-a.count;});
  var mx=Math.max.apply(null,dist.map(function(d){return d.count;}).concat([1]));
  var offList=S.employees.filter(function(e){return!e.is_active;});

  m.innerHTML=hdr('Dashboard','Overview')+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:24px" class="fade-in">'+
  '<div class="card stat-card blue"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Campaigns</p><p class="text-3xl font-bold text-white">'+S.campaigns.length+'</p><p class="text-xs text-blue-400 mt-1">'+ac.length+' active</p></div>'+
  '<div class="card stat-card green"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Clients</p><p class="text-3xl font-bold text-white">'+S.clients.length+'</p><p class="text-xs text-emerald-400 mt-1">'+S.clients.filter(function(c){return c.status==='Closed';}).length+' closed</p></div>'+
  '<div class="card stat-card amber"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Pending Q&A</p><p class="text-3xl font-bold text-white">'+pq.length+'</p><p class="text-xs text-amber-400 mt-1">needs attention</p></div>'+
  '<div class="card stat-card red"><p class="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Active Agents</p><p class="text-3xl font-bold text-white">'+onlineEmps.length+'/'+S.employees.length+'</p><p class="text-xs text-slate-400 mt-1">online now</p></div></div>'+
  '<div style="display:grid;grid-template-columns:1fr;gap:20px" class="fade-in dash-mid-grid">'+
  '<div class="card" style="min-width:0"><h3 class="text-sm font-bold text-white mb-4">Active Campaigns</h3>'+(ac.length?'<div class="space-y-2">'+ac.map(function(c){var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;}).length;return'<div class="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] table-row"><div class="flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-blue-500"></div><div><p class="text-sm font-medium text-white">'+esc(c.name)+'</p><p class="text-xs text-slate-500">'+esc(c.type)+'</p></div></div><div class="flex items-center gap-3"><span class="text-xs text-slate-400">'+cc+' clients</span>'+sBadge(c.status)+'</div></div>';}).join('')+'</div>':'<p class="text-slate-500 text-sm">No active campaigns</p>')+'</div>'+
  '<div class="card"><h3 class="text-sm font-bold text-white mb-4">Client Distribution</h3><div class="space-y-3">'+dist.map(function(d){return'<div><div class="flex items-center justify-between mb-1"><div class="flex items-center gap-2">'+av(d.name,d.color,20)+'<span class="text-xs text-slate-300">'+esc(d.name)+'</span></div><span class="text-xs font-semibold text-white">'+d.count+'</span></div><div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div class="h-full rounded-full" style="width:'+(d.count/mx)*100+'%;background:'+d.color+'"></div></div></div>';}).join('')+(dist.length?'':'<p class="text-slate-500 text-sm">No active employees</p>')+'</div></div></div>'+
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:20px" class="fade-in">'+
  '<div class="card"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Active Now</h3><span class="badge badge-active">'+onlineEmps.length+'</span></div><div class="space-y-2">'+
  onlineEmps.map(function(e){var cc=S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length;return'<div class="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02]"><div class="flex items-center gap-2">'+av(e.name,e.color||'#3b82f6',30)+'<div><p class="text-sm font-medium text-white">'+esc(e.name)+'</p><p class="text-xs text-emerald-400 font-medium">Active</p></div></div><div class="flex items-center gap-2"><span class="text-xs text-slate-400">'+cc+' clients</span>'+pDot(true)+'</div></div>';}).join('')+
  (onlineEmps.length?'':'<p class="text-slate-500 text-sm text-center py-4">No agents active</p>')+'</div></div>'+
  '<div class="card"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Inactive</h3><span class="badge badge-ended">'+offList.length+'</span></div><div class="space-y-2">'+
  offList.map(function(e){return'<div class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02]">'+av(e.name,e.color||'#475569',28)+'<p class="text-sm text-slate-500">'+esc(e.name)+'</p></div>';}).join('')+
  (offList.length?'':'<p class="text-slate-500 text-sm text-center py-4">Everyone is active!</p>')+'</div></div>';
  lucide.createIcons();
}

// ── CAMPAIGNS ──
function renderCampaigns(){
  var m=document.getElementById('main-content');
  if(selectedCampId){
    var vc=campById(selectedCampId);if(!vc){selectedCampId=null;renderCampaigns();return;}
    var cc=S.clients.filter(function(c){return c.campaign_id===vc.id;});
    var sBtns='';['Active','Paused','Ended'].forEach(function(s){sBtns+='<button class="btn btn-sm '+(vc.status===s?'btn-primary':'btn-ghost')+'" onclick="changeCampStatus(\''+vc.id+'\',\''+s+'\')">'+s+'</button>';});
    var visCols=getVisibleCols(vc.id);
    m.innerHTML=hdr(esc(vc.name),esc(vc.type),
      '<button class="btn btn-ghost" onclick="selectedCampId=null;renderCampaigns()"><i data-lucide="arrow-left" class="w-4 h-4"></i> Back</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="openColConfig(\''+vc.id+'\')"><i data-lucide="settings-2" class="w-4 h-4"></i> Columns</button>'+
      sBadge(vc.status))+
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 fade-in">'+
    '<div class="card text-center"><p class="text-slate-400 text-xs mb-1">Total</p><p class="text-2xl font-bold text-white">'+cc.length+'</p></div>'+
    '<div class="card text-center"><p class="text-slate-400 text-xs mb-1">Contacted</p><p class="text-2xl font-bold text-violet-400">'+cc.filter(function(c){return c.status==='Contacted';}).length+'</p></div>'+
    '<div class="card text-center"><p class="text-slate-400 text-xs mb-1">Closed</p><p class="text-2xl font-bold text-emerald-400">'+cc.filter(function(c){return c.status==='Closed';}).length+'</p></div></div>'+
    '<div class="card mb-6 fade-in"><div class="flex items-center gap-3"><span class="text-sm text-slate-400">Status:</span>'+sBtns+'</div></div>'+
    '<div class="card fade-in"><h3 class="text-sm font-bold text-white mb-4">Clients ('+cc.length+')</h3>'+
    (cc.length?'<div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
    visCols.map(function(c){return'<th class="pb-3 pr-4">'+esc(c.label)+'</th>';}).join('')+
    '<th class="pb-3 pr-4">Assigned To</th><th class="pb-3">Status</th></tr></thead><tbody>'+
    cc.map(function(c){var e=empById(c.assigned_employee_id);var extra=c.extra_data||{};
      return'<tr class="table-row border-b border-white/[0.03]">'+
      visCols.map(function(col){return'<td class="py-3 pr-4 text-slate-300">'+esc(extra[col.key]||c[col.key]||'-')+'</td>';}).join('')+
      '<td class="py-3 pr-4">'+(e?av(e.name,e.color||'#3b82f6',22)+'<span class="text-xs text-slate-300 ml-1">'+esc(e.name)+'</span>':'<span class="text-slate-500 text-xs">Unassigned</span>')+'</td>'+
      '<td class="py-3">'+sBadge(c.status)+'</td></tr>';
    }).join('')+'</tbody></table></div>':'<p class="text-slate-500 text-sm">No clients</p>')+'</div>';
    lucide.createIcons();return;
  }
  m.innerHTML=hdr('Campaigns','Manage campaigns','<button class="btn btn-primary" onclick="showCampForm=!showCampForm;renderCampaigns()"><i data-lucide="plus" class="w-4 h-4"></i> New</button>')+
  (showCampForm?'<div class="card mb-6 fade-in border-blue-500/20"><h3 class="text-sm font-bold text-white mb-4">Create Campaign</h3><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label class="text-xs text-slate-400 mb-1 block">Name *</label><input id="cn" class="input" placeholder="Campaign name"></div><div><label class="text-xs text-slate-400 mb-1 block">Type</label><input id="ct" class="input" placeholder="e.g. Sales, Leads..."></div><div><label class="text-xs text-slate-400 mb-1 block">Start Date</label><input id="cs" type="date" class="input"></div><div><label class="text-xs text-slate-400 mb-1 block">End Date</label><input id="ce" type="date" class="input"></div></div><div class="flex gap-2 mt-4"><button class="btn btn-primary" onclick="createCamp()">Create</button><button class="btn btn-ghost" onclick="showCampForm=false;renderCampaigns()">Cancel</button></div></div>':'')+
  '<div class="space-y-3 fade-in">'+(S.campaigns.length?S.campaigns.map(function(c){var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;}).length;return'<div class="card card-hover cursor-pointer" onclick="selectedCampId=\''+c.id+'\';renderCampaigns()"><div class="flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><i data-lucide="target" class="w-5 h-5"></i></div><div><p class="font-semibold text-white">'+esc(c.name)+'</p><p class="text-xs text-slate-500">'+esc(c.type)+'</p></div></div><div class="flex items-center gap-4"><span class="text-sm text-slate-400">'+cc+' clients</span>'+sBadge(c.status)+'</div></div></div>';}).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No campaigns yet</p></div>')+'</div>';
  lucide.createIcons();
}
function createCamp(){
  var n=document.getElementById('cn').value.trim();var t=document.getElementById('ct').value.trim();var s=document.getElementById('cs').value;var e=document.getElementById('ce').value;
  if(!n){toast('Name required','error');return;}
  sb.from('campaigns').insert({name:n,type:t||'General',start_date:s||null,end_date:e||null,column_config:DEFAULT_COLUMNS})
    .then(function(){toast('Campaign created');showCampForm=false;fetchAll().then(renderCampaigns);}).catch(function(e){toast(e.message,'error');});
}
function changeCampStatus(id,st){
  sb.from('campaigns').update({status:st}).eq('id',id)
    .then(function(r){if(r.error){toast(r.error.message,'error');return;}toast('Status updated');fetchAll().then(renderCampaigns);}).catch(function(e){toast(e.message,'error');});
}

// ── UPLOAD ──
function setUploadTab(tab){U.uploadTab=tab;renderUpload();}
function tabBtn(tab,icon,label){var act=U.uploadTab===tab;return'<button class="btn btn-sm '+(act?'btn-primary':'btn-ghost')+'" onclick="setUploadTab(\''+tab+'\')"><i data-lucide="'+icon+'" class="w-3.5 h-3.5"></i> '+label+'</button>';}

function renderUpload(){
  var m=document.getElementById('main-content');
  var cols=getCurrentUploadCols();
  var campOpts='<option value="">Select campaign...</option>'+S.campaigns.map(function(c){return'<option value="'+c.id+'" '+(U.campaignId===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('');
  var previewHtml='';
  if(U.preview){
    var mx=Math.max.apply(null,Object.values(U.preview).map(function(a){return a.length;}).concat([1]));
    previewHtml='<div class="card border-emerald-500/20 mb-6 fade-in"><h3 class="text-sm font-bold text-white mb-1">Preview - '+U.rows.length+' clients → active agents</h3><p class="text-xs text-slate-500 mb-4">Inactive agents excluded from distribution</p><div class="space-y-3">'+
    Object.keys(U.preview).map(function(eid){var e=empById(eid);if(!e)return'';var cls=U.preview[eid];return'<div><div class="flex items-center justify-between mb-1"><div class="flex items-center gap-2">'+av(e.name,e.color||'#3b82f6',22)+'<span class="text-xs text-slate-300">'+esc(e.name)+'</span><span class="badge badge-active ml-1" style="font-size:10px">Active</span></div><span class="text-xs font-bold text-white">'+cls.length+'</span></div><div class="w-full h-2 bg-white/5 rounded-full overflow-hidden"><div class="h-full rounded-full bg-emerald-500/70" style="width:'+(cls.length/mx)*100+'%"></div></div></div>';}).join('')+
    '</div><div class="flex gap-2 mt-5"><button class="btn btn-success" onclick="confirmDistribute()"><i data-lucide="check" class="w-4 h-4"></i> Confirm & Distribute</button><button class="btn btn-ghost" onclick="U.preview=null;renderUpload()">Cancel</button></div></div>';
  }
  var manualHtml='';
  if(U.uploadTab==='manual'){
    var tRows='';for(var i=0;i<U.rows.length;i++){tRows+='<tr>'+buildUploadRowHTML(cols,i,U.rows[i])+'</tr>';}
    manualHtml='<div class="flex items-center justify-between mb-3"><h3 class="text-sm font-bold text-white">Entries ('+U.rows.length+')</h3><button class="btn btn-ghost btn-sm" onclick="addUploadRows(5)"><i data-lucide="plus" class="w-3.5 h-3.5"></i> Add 5 rows</button></div>'+
    '<div class="overflow-x-auto max-h-[400px] overflow-y-auto"><table class="upload-tbl"><thead><tr>'+buildUploadHeaderHTML(cols)+'</tr></thead><tbody>'+tRows+'</tbody></table></div>';
  }
  m.innerHTML=hdr('Upload & Distribute','Upload data and distribute to active employees')+previewHtml+
  '<div class="card fade-in mb-4">'+
  '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px">'+
  '<select class="input" style="max-width:280px;flex:1;min-width:180px" onchange="U.campaignId=this.value;U.preview=null;U.rows=[];U.detectedCols=null;renderUpload()">'+campOpts+'</select>'+
  '<button class="btn btn-ghost btn-sm" onclick="openColConfig(null)"><i data-lucide="settings-2" class="w-4 h-4"></i> Configure Columns</button></div>'+
  '<div class="flex flex-wrap gap-2 mb-5 p-3 rounded-lg bg-white/[0.02] border border-white/5">'+
  '<span class="text-xs text-slate-500 self-center mr-1">Columns:</span>'+cols.map(function(c){return'<span class="badge badge-new text-[11px]">'+esc(c.label)+'</span>';}).join('')+'</div>'+
  '<div class="flex gap-2 mb-4 border-b border-white/10 pb-2">'+tabBtn('paste','clipboard','Paste from Excel')+tabBtn('excel','file-spreadsheet','Upload File')+tabBtn('manual','table','Manual Entry')+'</div>'+
  (U.uploadTab==='paste'?'<div class="space-y-3"><p class="text-xs text-slate-400 mb-2">Copy from Excel — columns should match: <strong class="text-slate-300">'+cols.map(function(c){return c.label;}).join(', ')+'</strong></p><textarea id="paste-area" class="input font-mono text-xs" rows="10" placeholder="Paste tab-separated rows here..."></textarea><button class="btn btn-primary" onclick="parsePaste()"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Parse & Preview</button></div>':'')+
  (U.uploadTab==='excel'?'<div class="space-y-3"><p class="text-xs text-slate-400">Upload .xlsx, .xls or .csv — first row = headers matching column config</p><div class="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/40 transition-colors" ondrop="handleExcelDrop(event)" ondragover="event.preventDefault()"><i data-lucide="file-spreadsheet" class="w-10 h-10 text-slate-600 mx-auto mb-3"></i><p class="text-slate-400 text-sm mb-3">Drag & drop file here</p><label class="btn btn-ghost cursor-pointer"><i data-lucide="upload" class="w-4 h-4"></i> Browse<input type="file" accept=".xlsx,.xls,.csv" class="hidden" onchange="handleExcelFile(this)"></label></div>'+(U.rows.length?'<p class="text-emerald-400 text-sm font-medium">✓ '+U.rows.length+' rows loaded</p>':'')+'</div>':'')+
  manualHtml+
  (U.rows.length?'<div class="mt-4 pt-4 border-t border-white/10"><button class="btn btn-primary" onclick="previewDistribute()"><i data-lucide="shuffle" class="w-4 h-4"></i> Preview Distribution ('+U.rows.length+' rows)</button></div>':'')+'</div>';
  lucide.createIcons();
}
function addUploadRows(n){var cols=getCurrentUploadCols();for(var i=0;i<n;i++){var r={};cols.forEach(function(c){r[c.key]='';});U.rows.push(r);}renderUpload();}
function parsePaste(){
  var raw=document.getElementById('paste-area').value.trim();
  if(!raw){toast('Paste data first','error');return;}
  var lines=raw.split('\n').map(function(l){return l.replace(/\r/g,'');});
  if(!lines.length){toast('No data','error');return;}

  // Always treat first row as headers
  var headerParts=lines[0].split('\t');
  var cols=buildColsFromHeaders(headerParts);
  if(!cols.length){toast('Could not detect headers','error');return;}
  saveDetectedCols(cols);

  var rows=[];
  for(var i=1;i<lines.length;i++){
    var line=lines[i].trim();if(!line)continue;
    var parts=line.split('\t');
    var obj={};
    cols.forEach(function(c,ci){obj[c.key]=(parts[ci]||'').trim();});
    if(!Object.values(obj).some(function(v){return v;}))continue;
    rows.push(obj);
  }
  if(!rows.length){toast('No data rows found','error');return;}
  U.rows=rows;
  toast(cols.length+' columns detected · '+rows.length+' rows parsed','success');
  renderUpload();
}
function handleExcelDrop(e){e.preventDefault();var f=e.dataTransfer.files[0];if(f)readExcelFile(f);}
function handleExcelFile(input){var f=input.files[0];if(f)readExcelFile(f);}
function readExcelFile(file){
  var name=file.name.toLowerCase();
  if(name.endsWith('.csv')){
    var reader=new FileReader();
    reader.onload=function(e){
      var lines=e.target.result.split('\n');
      if(!lines.length){toast('Empty file','error');return;}
      // First row = headers
      var headerParts=lines[0].replace(/\r/g,'').split(',').map(function(h){return h.replace(/^"|"$/g,'').trim();});
      var cols=buildColsFromHeaders(headerParts);
      if(!cols.length){toast('Could not detect headers','error');return;}
      saveDetectedCols(cols);
      var rows=[];
      for(var i=1;i<lines.length;i++){
        var parts=lines[i].replace(/\r/g,'').split(',');
        var obj={};
        cols.forEach(function(c,ci){obj[c.key]=(parts[ci]||'').replace(/^"|"$/g,'').trim();});
        if(!Object.values(obj).some(function(v){return v;}))continue;
        rows.push(obj);
      }
      U.rows=rows;
      toast(cols.length+' columns detected · '+rows.length+' rows from CSV','success');
      renderUpload();
    };reader.readAsText(file);
  } else if(window.XLSX){
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb=XLSX.read(e.target.result,{type:'array'});
        var ws=wb.Sheets[wb.SheetNames[0]];
        var data=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
        if(!data.length){toast('Empty file','error');return;}
        // First row = headers
        var headerRow=(data[0]||[]).map(function(h){return(h||'').toString().trim();});
        var cols=buildColsFromHeaders(headerRow);
        if(!cols.length){toast('Could not detect headers','error');return;}
        saveDetectedCols(cols);
        var rows=[];
        for(var i=1;i<data.length;i++){
          var row=data[i];
          var obj={};
          cols.forEach(function(c,ci){obj[c.key]=(row[ci]||'').toString().trim();});
          if(!Object.values(obj).some(function(v){return v;}))continue;
          rows.push(obj);
        }
        U.rows=rows;
        toast(cols.length+' columns detected · '+rows.length+' rows from Excel','success');
        renderUpload();
      }catch(err){toast('Could not read file: '+err.message,'error');}
    };reader.readAsArrayBuffer(file);
  } else {toast('XLSX library not loaded','error');}
}
function previewDistribute(){
  var firstKey=getCurrentUploadCols()[0]?getCurrentUploadCols()[0].key:'';
  var valid=U.rows.filter(function(r){return firstKey?r[firstKey]&&r[firstKey].trim():true;});
  if(!valid.length){toast('Add clients first','error');return;}
  if(!U.campaignId){toast('Select a campaign','error');return;}
  var actEmps=activeEmps();if(!actEmps.length){toast('No active employees','error');return;}
  var dist={};actEmps.forEach(function(e){dist[e.id]=[];});
  valid.forEach(function(c,i){dist[actEmps[i%actEmps.length].id].push(c);});
  U.preview=dist;renderUpload();
}
function confirmDistribute(){
  if(!U.preview||!U.campaignId)return;
  var campName=(campById(U.campaignId)||{}).name||'Campaign';
  var cols=getCurrentUploadCols();var rows=[];
  Object.keys(U.preview).forEach(function(eid){
    U.preview[eid].forEach(function(c){
      var extraData={};cols.forEach(function(col){extraData[col.key]=c[col.key]||'';});
      var name=c[cols[0]?cols[0].key:''||'customer']||c['customer']||c['name']||Object.values(c)[0]||'';
      var phone=c['phone']||c['Phone']||'';
      rows.push({name:name.trim(),phone:phone||null,extra_data:extraData,status:'New',assigned_employee_id:eid,campaign_id:U.campaignId});
    });
  });
  sb.from('clients').insert(rows).then(function(result){
    if(result.error){toast(result.error.message,'error');return;}
    var notifs=[];
    Object.keys(U.preview).forEach(function(eid){if(U.preview[eid].length){notifs.push({employee_id:eid,type:'data_updated',message:'New data - '+U.preview[eid].length+' client(s) in '+campName,read:false});}});
    if(notifs.length)sb.from('notifications').insert(notifs);
    toast(rows.length+' clients distributed successfully');
    U={campaignId:'',rows:[],preview:null,uploadTab:'paste',colConfig:null};
    fetchAll().then(renderUpload);
  });
}

// ── Q&A ──
function renderQA(){
  var m=document.getElementById('main-content');
  var qs=S.questions.slice();
  if(qaFilter.employee)qs=qs.filter(function(q){return q.employee_id===qaFilter.employee;});
  if(qaFilter.campaign)qs=qs.filter(function(q){return q.related_campaign_id===qaFilter.campaign;});
  if(qaFilter.status)qs=qs.filter(function(q){return q.status===qaFilter.status;});
  qs.sort(function(a,b){if(a.status==='pending'&&b.status!=='pending')return-1;if(a.status!=='pending'&&b.status==='pending')return 1;return new Date(b.created_at)-new Date(a.created_at);});
  var empOpts='<option value="">All Employees</option>'+S.employees.map(function(e){return'<option value="'+e.id+'" '+(qaFilter.employee===e.id?'selected':'')+'>'+esc(e.name)+'</option>';}).join('');
  var campOpts='<option value="">All Campaigns</option>'+S.campaigns.map(function(c){return'<option value="'+c.id+'" '+(qaFilter.campaign===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('');
  var pc=S.questions.filter(function(q){return q.status==='pending';}).length;
  m.innerHTML=hdr('Q&A Inbox',pc+' pending')+
  '<div class="card mb-6 fade-in"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px">'+
  '<select class="input" onchange="qaFilter.employee=this.value;renderQA()">'+empOpts+'</select>'+
  '<select class="input" onchange="qaFilter.campaign=this.value;renderQA()">'+campOpts+'</select>'+
  '<select class="input" onchange="qaFilter.status=this.value;renderQA()"><option value="">All Status</option><option value="pending" '+(qaFilter.status==='pending'?'selected':'')+'>Pending</option><option value="answered" '+(qaFilter.status==='answered'?'selected':'')+'>Answered</option></select>'+
  '</div></div>'+
  '<div class="space-y-3 fade-in">'+(qs.length?qs.map(function(q){
    var emp=empById(q.employee_id);var cl=q.related_client_id?clientById(q.related_client_id):null;var cp=q.related_campaign_id?campById(q.related_campaign_id):null;
    return'<div class="card"><div class="flex items-start gap-3">'+(emp?av(emp.name,emp.color||'#3b82f6',36):'<div class="avatar" style="width:36px;height:36px;background:#475569">?</div>')+
    '<div class="flex-1 min-w-0"><div class="flex items-center gap-2 mb-1 flex-wrap">'+
    '<span class="text-sm font-semibold text-white">'+esc(q.employee_name||'Employee')+'</span>'+sBadge(q.status)+
    '<span class="text-xs text-slate-500">'+timeAgo(q.created_at)+'</span>'+
    (cl?'<span class="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">'+esc(cl.name)+'</span>':'')+
    (cp?'<span class="text-xs text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">'+esc(cp.name)+'</span>':'')+
    '</div><p class="text-sm text-slate-300 mb-3">'+esc(q.question_text)+'</p>'+
    (q.status==='pending'?'<div class="flex gap-2"><textarea id="reply-'+q.id+'" class="input flex-1" placeholder="Type your reply..." rows="2"></textarea><button class="btn btn-primary self-end" onclick="sendReply(\''+q.id+'\')"><i data-lucide="send" class="w-4 h-4"></i> Send</button></div>':
    '<div class="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"><p class="text-xs text-emerald-400 font-medium mb-1">Reply — '+fmtDT(q.replied_at)+'</p><p class="text-sm text-slate-200">'+esc(q.admin_reply)+'</p></div>')+
    '</div></div></div>';
  }).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No questions</p></div>')+'</div>';
  lucide.createIcons();
}
function sendReply(qid){
  var ta=document.getElementById('reply-'+qid);if(!ta||!ta.value.trim()){toast('Type a reply','error');return;}
  sb.from('questions').update({status:'answered',admin_reply:ta.value.trim(),replied_at:new Date().toISOString()}).eq('id',qid)
    .then(function(){var q=S.questions.find(function(x){return x.id===qid;});if(q&&q.employee_id)sb.from('notifications').insert({employee_id:q.employee_id,type:'question_answered',message:'Your question has been answered',read:false}).catch(function(){});toast('Reply sent');fetchAll().then(renderQA);}).catch(function(e){toast(e.message,'error');});
}

// ── REPORTS ──
function renderReports(){
  var m=document.getElementById('main-content');
  var data=S.clients.slice();
  if(rptFilter.campaign)data=data.filter(function(c){return c.campaign_id===rptFilter.campaign;});
  if(rptFilter.employee)data=data.filter(function(c){return c.assigned_employee_id===rptFilter.employee;});
  if(rptFilter.status)data=data.filter(function(c){return c.status===rptFilter.status;});
  if(rptFilter.dateFrom)data=data.filter(function(c){return c.created_at>=rptFilter.dateFrom;});
  if(rptFilter.dateTo)data=data.filter(function(c){return c.created_at<=rptFilter.dateTo+'T23:59:59';});
  var totalPages=Math.ceil(data.length/RPT_PAGE_SIZE)||1;
  if(rptFilter.page>=totalPages)rptFilter.page=0;
  var pageData=data.slice(rptFilter.page*RPT_PAGE_SIZE,(rptFilter.page+1)*RPT_PAGE_SIZE);
  var visCols=rptFilter.campaign?getVisibleCols(rptFilter.campaign):DEFAULT_COLUMNS.filter(function(c){return c.visible;});
  m.innerHTML=hdr('Reports & Export','Filter and export client data')+
  '<div class="card mb-6 fade-in"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+
  '<select class="input" onchange="rptFilter.campaign=this.value;rptFilter.page=0;renderReports()"><option value="">All Campaigns</option>'+S.campaigns.map(function(c){return'<option value="'+c.id+'" '+(rptFilter.campaign===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select>'+
  '<select class="input" onchange="rptFilter.employee=this.value;rptFilter.page=0;renderReports()"><option value="">All Employees</option>'+S.employees.map(function(e){return'<option value="'+e.id+'" '+(rptFilter.employee===e.id?'selected':'')+'>'+esc(e.name)+'</option>';}).join('')+'</select>'+
  '<select class="input" onchange="rptFilter.status=this.value;rptFilter.page=0;renderReports()"><option value="">All Status</option>'+['New','Contacted','Interested','Closed'].map(function(s){return'<option value="'+s+'" '+(rptFilter.status===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select>'+
  '<input type="date" class="input" value="'+rptFilter.dateFrom+'" onchange="rptFilter.dateFrom=this.value;rptFilter.page=0;renderReports()">'+
  '<input type="date" class="input" value="'+rptFilter.dateTo+'" onchange="rptFilter.dateTo=this.value;rptFilter.page=0;renderReports()">'+
  '</div></div>'+
  '<div class="flex gap-2 mb-6 fade-in flex-wrap">'+
  '<button class="btn btn-primary btn-sm" onclick="exportClientsCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Export Clients</button>'+
  '<button class="btn btn-primary btn-sm" onclick="exportQaCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Export Q&A</button>'+
  '<button class="btn btn-primary btn-sm" onclick="exportCampSummaryCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Export Campaigns</button>'+
  '</div>'+
  '<div class="card fade-in"><div class="flex items-center justify-between mb-4 flex-wrap gap-2">'+
  '<h3 class="text-sm font-bold text-white">Results</h3>'+
  '<div class="flex items-center gap-3"><span class="text-xs text-slate-400">'+data.length+' total · Page '+(rptFilter.page+1)+'/'+totalPages+'</span>'+
  '<div class="flex gap-1">'+
  '<button class="btn btn-ghost btn-sm" '+(rptFilter.page===0?'disabled style="opacity:0.4"':'')+' onclick="rptFilter.page--;renderReports()"><i data-lucide="chevron-left" class="w-3.5 h-3.5"></i></button>'+
  '<button class="btn btn-ghost btn-sm" '+(rptFilter.page>=totalPages-1?'disabled style="opacity:0.4"':'')+' onclick="rptFilter.page++;renderReports()"><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i></button>'+
  '</div></div></div>'+
  (pageData.length?'<div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
  visCols.map(function(c){return'<th class="pb-3 pr-4">'+esc(c.label)+'</th>';}).join('')+
  '<th class="pb-3 pr-4">Employee</th><th class="pb-3">Status</th></tr></thead><tbody>'+
  pageData.map(function(c){var ep=empById(c.assigned_employee_id);var extra=c.extra_data||{};
    return'<tr class="table-row border-b border-white/[0.03]">'+visCols.map(function(col){return'<td class="py-2.5 pr-4 text-slate-300 text-xs">'+esc(extra[col.key]||c[col.key]||'-')+'</td>';}).join('')+
    '<td class="py-2.5 pr-4 text-xs text-slate-400">'+esc(ep?ep.name:'')+'</td>'+
    '<td class="py-2.5">'+sBadge(c.status)+'</td></tr>';}).join('')+'</tbody></table></div>':
  '<p class="text-slate-500 text-sm text-center py-6">No results</p>')+'</div>';
  lucide.createIcons();
}
function exportClientsCSV(){var visCols=rptFilter.campaign?getVisibleCols(rptFilter.campaign):DEFAULT_COLUMNS.filter(function(c){return c.visible;});csvExport('clients.csv',visCols.map(function(c){return c.label;}).concat(['Employee','Status']),S.clients.map(function(c){var ep=empById(c.assigned_employee_id);var extra=c.extra_data||{};return visCols.map(function(col){return extra[col.key]||c[col.key]||'';}).concat([ep?ep.name:'',c.status]);}));toast('Exported');}
function exportQaCSV(){csvExport('qa.csv',['Employee','Question','Status','Reply','Date'],S.questions.map(function(q){return[q.employee_name||'',q.question_text,q.status,q.admin_reply||'',q.created_at];}));toast('Exported');}
function exportCampSummaryCSV(){csvExport('campaigns.csv',['Campaign','Type','Status','Clients','New','Contacted','Closed'],S.campaigns.map(function(c){var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;});return[c.name,c.type,c.status,cc.length,cc.filter(function(x){return x.status==='New';}).length,cc.filter(function(x){return x.status==='Contacted';}).length,cc.filter(function(x){return x.status==='Closed';}).length];}));toast('Exported');}

// ── TEAM ──
function renderTeam(){
  var m=document.getElementById('main-content');
  var activeList=activeEmps();var inactiveList=S.employees.filter(function(e){return!e.is_active;});
  m.innerHTML=hdr('Team Management',S.employees.length+' total employees','<button class="btn btn-primary" onclick="T={showForm:true,editId:null,name:\'\',email:\'\',phone:\'\'};renderTeam()"><i data-lucide="plus" class="w-4 h-4"></i> Add Employee</button>')+
  (T.showForm?'<div class="card mb-6 fade-in border-blue-500/20"><h3 class="text-sm font-bold text-white mb-4">'+(T.editId?'Edit':'Add')+' Employee</h3>'+
  '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Name *</label><input id="tn" class="input" value="'+esc(T.name)+'" placeholder="Full name"></div>'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Email *</label><input id="te" class="input" value="'+esc(T.email)+'" placeholder="Email"></div>'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Phone</label><input id="tp" class="input" value="'+esc(T.phone)+'" placeholder="Phone"></div>'+
  '</div><div class="flex gap-2 mt-4"><button class="btn btn-primary" onclick="saveEmployee()">'+(T.editId?'Update':'Add')+'</button><button class="btn btn-ghost" onclick="T={showForm:false,editId:null,name:\'\',email:\'\',phone:\'\'};renderTeam()">Cancel</button></div></div>':'')+
  '<div class="card mb-6 fade-in"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Active Agents</h3><span class="badge badge-active">'+activeList.length+'</span></div>'+
  (activeList.length?'<div class="space-y-2">'+activeList.map(function(e){var cc=S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length;
    return'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:10px;background:rgba(255,255,255,0.02);margin-bottom:4px;gap:8px">'+
    '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">'+av(e.name,e.color||'#3b82f6',36)+
    '<div style="min-width:0"><p style="font-size:14px;font-weight:600;color:#fff">'+esc(e.name)+'</p><p style="font-size:11px;color:#64748b">'+esc(e.email)+'</p><p style="font-size:11px;color:#94a3b8;margin-top:1px">'+cc+' clients</p></div></div>'+
    '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
    '<button class="btn btn-sm" style="background:rgba(100,116,139,0.12);color:#64748b;border:1px solid rgba(100,116,139,0.2);padding:5px 10px;font-size:12px" onclick="adminSetActive(\''+e.id+'\',false)"><i data-lucide="power" class="w-3 h-3"></i> Off</button>'+
    '<button class="btn btn-ghost btn-sm" style="padding:5px 8px" onclick="editEmployee(\''+e.id+'\')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>'+
    '<button class="btn btn-danger btn-sm" style="padding:5px 8px" onclick="deleteEmployee(\''+e.id+'\',\''+esc(e.name).replace(/'/g,'')+'\')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>'+
    '</div></div>';}).join('')+'</div>':'<p class="text-slate-500 text-sm text-center py-4">No active agents</p>')+'</div>'+
  '<div class="card fade-in"><div class="flex items-center justify-between mb-4"><h3 class="text-sm font-bold text-white">Inactive Agents</h3><span class="badge badge-ended">'+inactiveList.length+'</span></div>'+
  (inactiveList.length?'<div class="space-y-2">'+inactiveList.map(function(e){
    return'<div style="display:flex;align-items:center;justify-content:space-between;padding:12px;border-radius:10px;background:rgba(255,255,255,0.015);margin-bottom:4px;gap:8px">'+
    '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">'+av(e.name,e.color||'#475569',36)+
    '<div style="min-width:0"><p style="font-size:14px;color:#94a3b8">'+esc(e.name)+'</p><p style="font-size:11px;color:#475569">'+esc(e.email)+'</p></div></div>'+
    '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
    '<button class="btn btn-success btn-sm" style="padding:5px 10px;font-size:12px" onclick="adminSetActive(\''+e.id+'\',true)"><i data-lucide="power" class="w-3 h-3"></i> On</button>'+
    '<button class="btn btn-ghost btn-sm" style="padding:5px 8px" onclick="editEmployee(\''+e.id+'\')"><i data-lucide="pencil" class="w-3.5 h-3.5"></i></button>'+
    '<button class="btn btn-danger btn-sm" style="padding:5px 8px" onclick="deleteEmployee(\''+e.id+'\',\''+esc(e.name).replace(/'/g,'')+'\')"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>'+
    '</div></div>';}).join('')+'</div>':'<p class="text-slate-500 text-sm text-center py-4">Everyone is active!</p>')+'</div>';
  lucide.createIcons();
}
function adminSetActive(eid,val){sb.from('employees').update({is_active:val}).eq('id',eid).then(function(){toast(val?'Activated':'Deactivated');fetchAll().then(function(){renderTeam();if(S.currentPage==='dashboard')renderDashboard();});}).catch(function(e){toast(e.message,'error');});}
function editEmployee(id){var e=empById(id);if(!e)return;T={showForm:true,editId:id,name:e.name,email:e.email,phone:e.phone||''};renderTeam();}
function saveEmployee(){
  var n=document.getElementById('tn').value.trim();var em=document.getElementById('te').value.trim();var ph=document.getElementById('tp').value.trim();
  if(!n||!em){toast('Name and email required','error');return;}
  if(T.editId){sb.from('employees').update({name:n,email:em,phone:ph}).eq('id',T.editId).then(function(){toast('Updated');T={showForm:false,editId:null,name:'',email:'',phone:''};fetchAll().then(renderTeam);}).catch(function(e){toast(e.message,'error');});}
  else{sb.from('employees').insert({name:n,email:em,phone:ph,is_active:false,color:COLORS[S.employees.length%COLORS.length]}).then(function(){toast('Employee added');T={showForm:false,editId:null,name:'',email:'',phone:''};fetchAll().then(renderTeam);}).catch(function(e){toast(e.message,'error');});}
}
function deleteEmployee(id,name){showConfirm('Delete Employee','Delete "'+name+'"? This cannot be undone.',function(){sb.from('employees').delete().eq('id',id).then(function(){toast('Deleted');fetchAll().then(renderTeam);}).catch(function(e){toast(e.message,'error');});},'Delete','btn-danger');}

// ── MY CLIENTS ──
function renderMyClients(){
  var m=document.getElementById('main-content');var cls=myClients();
  if(empClientFilter)cls=cls.filter(function(c){return c.campaign_id===empClientFilter;});
  var campOpts='<option value="">All Campaigns</option>';var seen={};
  myClients().forEach(function(c){if(!seen[c.campaign_id]){seen[c.campaign_id]=true;var cp=campById(c.campaign_id);if(cp)campOpts+='<option value="'+c.campaign_id+'" '+(empClientFilter===c.campaign_id?'selected':'')+'>'+esc(cp.name)+'</option>';}});
  m.innerHTML=hdr(S.role==='admin'?'All Clients':'My Clients',cls.length+' clients')+
  '<div class="mb-6 fade-in"><select class="input max-w-xs" onchange="empClientFilter=this.value||\'\';renderMyClients()">'+campOpts+'</select></div>'+
  '<div class="space-y-3 fade-in">'+(cls.length?cls.map(function(c){
    var isExp=expandedClientId===c.id;var hist=clientHistory(c.id);var extra=c.extra_data||{};var camp=campById(c.campaign_id);
    var visCols=camp?getVisibleCols(camp.id):DEFAULT_COLUMNS.filter(function(x){return x.visible;});
    var displayName=c.name||Object.values(extra)[0]||'Client';
    var subInfo=visCols.slice(1,3).map(function(col){return extra[col.key]||c[col.key]||'';}).filter(Boolean).join(' · ');
    return'<div class="card client-card '+(isExp?'border-blue-500/30':'')+'">'+
    '<div class="flex items-center justify-between" onclick="expandedClientId='+(isExp?'null':'\''+c.id+'\'')+';renderMyClients()">'+
    '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400"><i data-lucide="user" class="w-5 h-5"></i></div>'+
    '<div><p class="font-semibold text-white">'+esc(displayName)+'</p><p class="text-xs text-slate-500">'+esc(subInfo)+'</p></div></div>'+
    '<div class="flex items-center gap-3">'+sBadge(c.status)+'<i data-lucide="'+(isExp?'chevron-up':'chevron-down')+'" class="w-4 h-4 text-slate-400"></i></div></div>'+
    (isExp?'<div class="mt-4 pt-4 border-t border-white/5 space-y-4">'+
    '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">'+
    visCols.map(function(col){return'<div><p class="text-xs text-slate-500 mb-1">'+esc(col.label)+'</p><p class="text-sm text-white">'+esc(extra[col.key]||c[col.key]||'-')+'</p></div>';}).join('')+
    (S.role==='admin'?'<div><p class="text-xs text-slate-500 mb-1">Assigned To</p><p class="text-sm text-white">'+esc((empById(c.assigned_employee_id)||{}).name||'Unassigned')+'</p></div>':'')+
    '<div><p class="text-xs text-slate-500 mb-1">Status</p>'+
    '<select class="input text-sm" onclick="event.stopPropagation()" onchange="updateClientStatus(\''+c.id+'\',this.value)">'+
    ['New','Contacted','Interested','Closed'].map(function(s){return'<option value="'+s+'" '+(c.status===s?'selected':'')+'>'+s+'</option>';}).join('')+
    '</select></div></div>'+
    '<div><p class="text-xs text-slate-500 mb-2 font-medium">History ('+hist.length+')</p>'+
    (hist.length?'<div class="space-y-2 max-h-48 overflow-y-auto">'+hist.map(function(h){return'<div class="p-2 rounded-lg bg-white/[0.02] text-xs"><span class="text-slate-500">'+fmtDT(h.created_at)+'</span><p class="text-slate-300 mt-1">'+esc(h.note)+'</p></div>';}).join('')+'</div>':'<p class="text-slate-500 text-xs">No notes yet</p>')+'</div>'+
    '<div class="flex gap-2" onclick="event.stopPropagation()">'+
    '<textarea id="note-'+c.id+'" class="input flex-1" placeholder="Add a note..." rows="2"></textarea>'+
    '<button class="btn btn-primary self-end" onclick="addNote(\''+c.id+'\')"><i data-lucide="plus" class="w-4 h-4"></i> Save</button></div></div>':'')+
    '</div>';
  }).join(''):'<div class="card text-center py-12"><p class="text-slate-500">No clients assigned</p></div>')+'</div>';
  lucide.createIcons();
}
function saveClient(cid){
  var statusEl=document.getElementById('status-'+cid);
  var noteEl=document.getElementById('note-'+cid);
  var status=statusEl?statusEl.value:null;
  var note=noteEl?noteEl.value.trim():'';
  var promises=[];
  if(status){promises.push(sb.from('clients').update({status:status}).eq('id',cid));}
  if(note){promises.push(sb.from('contact_history').insert({client_id:cid,note:note}));}
  if(!promises.length){toast('Nothing to save','info');return;}
  Promise.all(promises)
    .then(function(){toast('Saved!','success');fetchAll().then(renderMyClients);})
    .catch(function(e){toast(e.message,'error');});
}

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

// ── CLEANUP ──
function renderCleanup(){
  var m=document.getElementById('main-content');
  var campOpts='<option value="">-- Select Campaign --</option>'+S.campaigns.map(function(c){return'<option value="'+c.id+'" '+(cleanupState.campaignId===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('');
  var selectedCount=Object.keys(cleanupState.selected).filter(function(k){return cleanupState.selected[k];}).length;
  var html=hdr('Data Cleanup','Delete duplicate imports or incorrect records',selectedCount>0?'<button class="btn btn-danger" onclick="deleteSelected()"><i data-lucide="trash-2" class="w-4 h-4"></i> Delete Selected ('+selectedCount+')</button>':'');
  html+='<div class="card mb-5 fade-in"><div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">'+
  '<div><label class="text-xs text-slate-400 mb-1 block">Campaign</label><select class="input" onchange="cleanupSelectCampaign(this.value)">'+campOpts+'</select></div>';
  if(cleanupState.campaignId&&cleanupState.batches.length>1){
    var batchOpts='<option value="">All imports</option>'+cleanupState.batches.map(function(b){return'<option value="'+b.key+'" '+(cleanupState.importBatch===b.key?'selected':'')+'>'+b.label+' ('+b.count+' records)</option>';}).join('');
    html+='<div><label class="text-xs text-slate-400 mb-1 block">Filter by Import Batch</label><select class="input" onchange="cleanupState.importBatch=this.value;renderCleanupTable()">'+batchOpts+'</select></div>';
  }
  if(cleanupState.campaignId){html+='<div><label class="text-xs text-slate-400 mb-1 block">Search</label><input class="input" placeholder="Search name or any field..." value="'+esc(cleanupState.searchText)+'" oninput="cleanupState.searchText=this.value;renderCleanupTable()"></div>';}
  html+='</div>';
  if(cleanupState.campaignId&&cleanupState.clients.length>0){
    html+='<div class="flex gap-2 mt-4 flex-wrap">'+
    '<button class="btn btn-ghost btn-sm" onclick="cleanupSelectAll()"><i data-lucide="check-square" class="w-3.5 h-3.5"></i> Select All Visible</button>'+
    '<button class="btn btn-ghost btn-sm" onclick="cleanupClearSelection()"><i data-lucide="square" class="w-3.5 h-3.5"></i> Clear Selection</button>'+
    (cleanupState.batches.length>1?'<button class="btn btn-ghost btn-sm" onclick="cleanupSelectBatch()"><i data-lucide="layers" class="w-3.5 h-3.5"></i> Select This Batch</button>':'')+
    '<span class="text-xs text-slate-500 self-center ml-2">'+cleanupState.clients.length+' total records</span></div>';
  }
  html+='</div><div id="cleanup-table-area" class="fade-in">';
  if(cleanupState.loading){html+='<div class="flex items-center justify-center py-16"><div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>';}
  else if(!cleanupState.campaignId){html+='<div class="card text-center py-12"><p class="text-slate-500">Select a campaign to view its data</p></div>';}
  else{html+=buildCleanupTable();}
  html+='</div>';
  m.innerHTML=html;lucide.createIcons();
}
function getBatchKey(ts){if(!ts)return'unknown';var d=new Date(ts);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+'_'+d.getHours()+':'+d.getMinutes();}
function formatBatchLabel(ts){if(!ts)return'-';var d=new Date(ts);return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function buildCleanupTable(){
  var rows=cleanupState.clients;
  if(cleanupState.importBatch)rows=rows.filter(function(c){return getBatchKey(c.created_at)===cleanupState.importBatch;});
  if(cleanupState.searchText){var q=cleanupState.searchText.toLowerCase();rows=rows.filter(function(c){var extra=JSON.stringify(c.extra_data||{}).toLowerCase();return(c.name||'').toLowerCase().indexOf(q)!==-1||(c.phone||'').toLowerCase().indexOf(q)!==-1||extra.indexOf(q)!==-1;});}
  if(!rows.length)return'<div class="card text-center py-10"><p class="text-slate-500">No records match your filter</p></div>';
  var camp=campById(cleanupState.campaignId);
  var cols=camp&&camp.column_config&&camp.column_config.length?camp.column_config.filter(function(c){return c.visible;}).sort(function(a,b){return a.order-b.order;}).slice(0,5):DEFAULT_COLUMNS.slice(0,5);
  var selectedCount=Object.keys(cleanupState.selected).filter(function(k){return cleanupState.selected[k];}).length;
  return'<div class="card"><div class="flex items-center justify-between mb-3"><p class="text-sm text-slate-400">Showing <span class="text-white font-semibold">'+rows.length+'</span> records'+(selectedCount>0?' &nbsp;·&nbsp; <span class="text-red-400 font-semibold">'+selectedCount+' selected</span>':'')+
  '</p>'+(selectedCount>0?'<button class="btn btn-danger btn-sm" onclick="deleteSelected()"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Delete '+selectedCount+' records</button>':'')+
  '</div><div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
  '<th class="pb-3 pr-3 w-8"><input type="checkbox" class="cursor-pointer" onchange="cleanupToggleAll(this.checked,'+JSON.stringify(rows.map(function(r){return r.id;}))+')"></th>'+
  cols.map(function(c){return'<th class="pb-3 pr-4">'+esc(c.label)+'</th>';}).join('')+
  '<th class="pb-3 pr-4">Assigned To</th><th class="pb-3 pr-4">Imported</th><th class="pb-3">Status</th></tr></thead><tbody>'+
  rows.map(function(c){var extra=c.extra_data||{};var emp=empById(c.assigned_employee_id);var isChecked=!!cleanupState.selected[c.id];
    return'<tr class="table-row border-b border-white/[0.03] '+(isChecked?'bg-red-500/5':'')+'">'+'<td class="py-2.5 pr-3"><input type="checkbox" class="cursor-pointer" '+(isChecked?'checked':'')+' onchange="cleanupToggleOne(\''+c.id+'\',this.checked)"></td>'+
    cols.map(function(col){return'<td class="py-2.5 pr-4 text-slate-300 text-xs max-w-[140px] truncate">'+esc(extra[col.key]||c[col.key]||'-')+'</td>';}).join('')+
    '<td class="py-2.5 pr-4 text-xs text-slate-400">'+esc(emp?emp.name:'—')+'</td>'+
    '<td class="py-2.5 pr-4 text-xs text-slate-500">'+formatBatchLabel(c.created_at)+'</td>'+
    '<td class="py-2.5">'+sBadge(c.status)+'</td></tr>';
  }).join('')+'</tbody></table></div></div>';
}
function renderCleanupTable(){document.getElementById('cleanup-table-area').innerHTML=buildCleanupTable();lucide.createIcons();}
function cleanupSelectCampaign(campId){
  cleanupState.campaignId=campId;cleanupState.selected={};cleanupState.searchText='';cleanupState.importBatch='';cleanupState.clients=[];cleanupState.batches=[];
  if(!campId){renderCleanup();return;}
  cleanupState.loading=true;renderCleanup();
  sb.from('clients').select('*').eq('campaign_id',campId).order('created_at',{ascending:false})
    .then(function(res){
      cleanupState.clients=res.data||[];cleanupState.loading=false;
      var batchMap={};cleanupState.clients.forEach(function(c){var k=getBatchKey(c.created_at);if(!batchMap[k])batchMap[k]={key:k,label:formatBatchLabel(c.created_at),count:0};batchMap[k].count++;});
      cleanupState.batches=Object.values(batchMap).sort(function(a,b){return b.key.localeCompare(a.key);});
      renderCleanup();
    }).catch(function(e){cleanupState.loading=false;toast(e.message,'error');renderCleanup();});
}
function cleanupToggleOne(id,checked){cleanupState.selected[id]=checked;document.getElementById('cleanup-table-area').innerHTML=buildCleanupTable();lucide.createIcons();}
function cleanupToggleAll(checked,ids){ids.forEach(function(id){cleanupState.selected[id]=checked;});document.getElementById('cleanup-table-area').innerHTML=buildCleanupTable();lucide.createIcons();}
function cleanupSelectAll(){
  var rows=cleanupState.clients;
  if(cleanupState.importBatch)rows=rows.filter(function(c){return getBatchKey(c.created_at)===cleanupState.importBatch;});
  if(cleanupState.searchText){var q=cleanupState.searchText.toLowerCase();rows=rows.filter(function(c){return(c.name||'').toLowerCase().indexOf(q)!==-1||(c.phone||'').toLowerCase().indexOf(q)!==-1||JSON.stringify(c.extra_data||{}).toLowerCase().indexOf(q)!==-1;});}
  rows.forEach(function(c){cleanupState.selected[c.id]=true;});
  document.getElementById('cleanup-table-area').innerHTML=buildCleanupTable();lucide.createIcons();
}
function cleanupClearSelection(){cleanupState.selected={};document.getElementById('cleanup-table-area').innerHTML=buildCleanupTable();lucide.createIcons();}
function cleanupSelectBatch(){
  if(!cleanupState.importBatch)return;
  cleanupState.clients.filter(function(c){return getBatchKey(c.created_at)===cleanupState.importBatch;}).forEach(function(c){cleanupState.selected[c.id]=true;});
  document.getElementById('cleanup-table-area').innerHTML=buildCleanupTable();lucide.createIcons();
}
function deleteSelected(){
  var ids=Object.keys(cleanupState.selected).filter(function(k){return cleanupState.selected[k];});
  if(!ids.length){toast('No records selected','error');return;}
  showConfirm('Delete '+ids.length+' Records','This will permanently delete '+ids.length+' client record(s). This cannot be undone.',function(){
    sb.from('clients').delete().in('id',ids).then(function(){
      toast(ids.length+' records deleted');cleanupState.selected={};
      cleanupState.clients=cleanupState.clients.filter(function(c){return!ids.includes(c.id);});
      var batchMap={};cleanupState.clients.forEach(function(c){var k=getBatchKey(c.created_at);if(!batchMap[k])batchMap[k]={key:k,label:formatBatchLabel(c.created_at),count:0};batchMap[k].count++;});
      cleanupState.batches=Object.values(batchMap).sort(function(a,b){return b.key.localeCompare(a.key);});
      if(cleanupState.importBatch&&!batchMap[cleanupState.importBatch])cleanupState.importBatch='';
      fetchAll().then(renderCleanup);
    }).catch(function(e){toast(e.message,'error');});
  },'Delete '+ids.length+' Records','btn-danger');
}
