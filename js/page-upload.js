// ============================================================
// PAGE UPLOAD
// ============================================================
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
