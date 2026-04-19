// ============================================================
// PAGE UPLOAD — Upload & Smart Distribute
// ============================================================

// ── Column auto-detection from file headers ──
function buildColsFromHeaders(headers) {
  var cols = [];
  headers.forEach(function(h, i) {
    var label = (h || '').toString().trim();
    if (!label) return;
    // Try to match a known DEFAULT_COLUMNS entry by label or key
    var known = DEFAULT_COLUMNS.find(function(d) {
      return d.label.toLowerCase() === label.toLowerCase() ||
             d.key.toLowerCase() === label.toLowerCase().replace(/[\s-]+/g, '_');
    });
    if (known) {
      cols.push({ key: known.key, label: known.label, visible: true, order: i });
    } else {
      var key = label.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || ('col_' + i);
      cols.push({ key: key, label: label, visible: true, order: i, custom: true });
    }
  });
  return cols;
}

function saveDetectedCols(cols) {
  U.detectedCols = cols;
  if (U.campaignId) {
    var camp = campById(U.campaignId);
    // Only auto-save if the campaign has no column config yet
    if (camp && (!camp.column_config || camp.column_config.length === 0)) {
      sb.from('campaigns').update({ column_config: cols }).eq('id', U.campaignId)
        .then(function(r) { if (!r.error) fetchAll(); })
        .catch(function() {});
    }
  } else {
    U.colConfig = cols;
  }
}

function setUploadTab(tab){U.uploadTab=tab;renderUpload();}
function tabBtn(tab,icon,label){var act=U.uploadTab===tab;return'<button class="btn btn-sm '+(act?'btn-primary':'btn-ghost')+'" onclick="setUploadTab(\''+tab+'\')"><i data-lucide="'+icon+'" class="w-3.5 h-3.5"></i> '+label+'</button>';}

function renderUpload(){
  var m=document.getElementById('main-content');
  var cols=getCurrentUploadCols();
  var campOpts='<option value="">Select campaign...</option>'+S.campaigns.map(function(c){return'<option value="'+c.id+'" '+(U.campaignId===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('');

  var previewHtml='';
  if(U.preview){
    var mx=Math.max.apply(null,Object.values(U.preview.dist||{}).map(function(a){return a.length;}).concat([1]));
    var dupHtml='';
    if(U.preview.duplicates&&U.preview.duplicates.length){
      dupHtml='<div class="card mb-4 fade-in" style="border-color:rgba(245,158,11,0.3);background:rgba(245,158,11,0.04)">'+
        '<div class="flex items-center gap-3 mb-3">'+
          '<div class="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400"><i data-lucide="alert-triangle" class="w-4 h-4"></i></div>'+
          '<div>'+
            '<p class="text-sm font-semibold text-amber-300">'+U.preview.duplicates.length+' Possible Duplicate'+(U.preview.duplicates.length>1?'s':'')+' Detected</p>'+
            '<p class="text-xs text-slate-500">These clients may already exist in this campaign</p>'+
          '</div>'+
        '</div>'+
        '<div class="space-y-1 max-h-32 overflow-y-auto">'+
        U.preview.duplicates.map(function(d){
          return'<div class="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-white/[0.03]">'+
            '<span class="text-amber-300">⚠ "'+esc(d.name)+'"</span>'+
            '<span class="text-slate-500">Matches: "'+esc(d.match)+'"</span>'+
          '</div>';
        }).join('')+
        '</div>'+
        '<div class="flex gap-2 mt-3">'+
          '<button class="btn btn-ghost btn-sm" onclick="U.preview.skipDuplicates=!U.preview.skipDuplicates;renderUpload()">'+
            (U.preview.skipDuplicates?'<i data-lucide="check-square" class="w-3.5 h-3.5 text-blue-400"></i> Skipping duplicates':'<i data-lucide="square" class="w-3.5 h-3.5"></i> Include duplicates')+
          '</button>'+
        '</div>'+
      '</div>';
    }

    previewHtml=dupHtml+
      '<div class="card border-emerald-500/20 mb-6 fade-in">'+
        '<div class="flex items-center gap-3 mb-3">'+
          '<h3 class="text-sm font-bold text-white">Preview — '+U.rows.length+' clients</h3>'+
          '<span class="text-xs text-slate-500">distributed to active agents by workload</span>'+
        '</div>'+
        '<div class="space-y-3">'+
        Object.keys(U.preview.dist||{}).map(function(eid){
          var e=empById(eid);if(!e)return'';
          var cls=U.preview.dist[eid];
          var existingCount=S.clients.filter(function(c){return c.assigned_employee_id===eid;}).length;
          return'<div>'+
            '<div class="flex items-center justify-between mb-1">'+
              '<div class="flex items-center gap-2">'+
                av(e.name,e.color||'#3b82f6',22)+
                '<span class="text-xs text-slate-300">'+esc(e.name)+'</span>'+
                '<span class="badge badge-active ml-1" style="font-size:10px">Active</span>'+
                '<span class="text-xs text-slate-600">(had '+existingCount+')</span>'+
              '</div>'+
              '<span class="text-xs font-bold text-white">+'+cls.length+'</span>'+
            '</div>'+
            '<div class="w-full h-2 bg-white/5 rounded-full overflow-hidden">'+
              '<div class="h-full rounded-full bg-emerald-500/70" style="width:'+(cls.length/mx)*100+'%"></div>'+
            '</div>'+
          '</div>';
        }).join('')+
        '</div>'+
        '<div class="flex gap-2 mt-5">'+
          '<button class="btn btn-success" onclick="confirmDistribute()">'+
            '<i data-lucide="check" class="w-4 h-4"></i> Confirm & Distribute'+
          '</button>'+
          '<button class="btn btn-ghost" onclick="U.preview=null;renderUpload()">Cancel</button>'+
        '</div>'+
      '</div>';
  }

  var manualHtml='';
  if(U.uploadTab==='manual'){
    var tRows='';for(var i=0;i<U.rows.length;i++){tRows+='<tr>'+buildUploadRowHTML(cols,i,U.rows[i])+'</tr>';}
    manualHtml='<div class="flex items-center justify-between mb-3">'+
      '<h3 class="text-sm font-bold text-white">Entries ('+U.rows.length+')</h3>'+
      '<button class="btn btn-ghost btn-sm" onclick="addUploadRows(5)"><i data-lucide="plus" class="w-3.5 h-3.5"></i> Add 5 rows</button></div>'+
      '<div class="overflow-x-auto max-h-[400px] overflow-y-auto">'+
      '<table class="upload-tbl"><thead><tr>'+buildUploadHeaderHTML(cols)+'</tr></thead><tbody>'+tRows+'</tbody></table></div>';
  }

  m.innerHTML=hdr('Upload & Distribute','Upload data and distribute to active agents')+previewHtml+
    '<div class="card fade-in mb-4">'+
    '<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px">'+
      '<select class="input" style="max-width:280px;flex:1;min-width:180px" '+
        'onchange="U.campaignId=this.value;U.preview=null;U.rows=[];U.detectedCols=null;renderUpload()">'+campOpts+'</select>'+
      '<button class="btn btn-ghost btn-sm" onclick="openColConfig(null)">'+
        '<i data-lucide="settings-2" class="w-4 h-4"></i> Configure Columns</button></div>'+
    '<div class="flex flex-wrap gap-2 mb-5 p-3 rounded-lg bg-white/[0.02] border border-white/5">'+
      '<span class="text-xs text-slate-500 self-center mr-1">Columns:</span>'+
      cols.map(function(c){return'<span class="badge badge-new text-[11px]">'+esc(c.label)+'</span>';}).join('')+
    '</div>'+
    '<div class="flex gap-2 mb-4 border-b border-white/10 pb-2">'+
      tabBtn('paste','clipboard','Paste from Excel')+
      tabBtn('excel','file-spreadsheet','Upload File')+
      tabBtn('manual','table','Manual Entry')+
    '</div>'+

    (U.uploadTab==='paste'?
      '<div class="space-y-3">'+
        '<p class="text-xs text-slate-400 mb-2">Copy from Excel — columns: <strong class="text-slate-300">'+cols.map(function(c){return c.label;}).join(', ')+'</strong></p>'+
        '<textarea id="paste-area" class="input font-mono text-xs" rows="10" placeholder="Paste tab-separated rows here..."></textarea>'+
        '<button class="btn btn-primary" onclick="parsePaste()"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Parse & Preview</button>'+
      '</div>':'')+

    (U.uploadTab==='excel'?
      '<div class="space-y-3">'+
        '<p class="text-xs text-slate-400">Upload .xlsx, .xls or .csv — first row = headers</p>'+
        '<div class="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/40 transition-colors" '+
          'ondrop="handleExcelDrop(event)" ondragover="event.preventDefault()">'+
          '<i data-lucide="file-spreadsheet" class="w-10 h-10 text-slate-600 mx-auto mb-3"></i>'+
          '<p class="text-slate-400 text-sm mb-3">Drag & drop file here</p>'+
          '<label class="btn btn-ghost cursor-pointer">'+
            '<i data-lucide="upload" class="w-4 h-4"></i> Browse'+
            '<input type="file" accept=".xlsx,.xls,.csv" class="hidden" onchange="handleExcelFile(this)">'+
          '</label>'+
        '</div>'+
        (U.rows.length?'<p class="text-emerald-400 text-sm font-medium">✓ '+U.rows.length+' rows loaded</p>':'')+
      '</div>':'')+

    manualHtml+
    (U.rows.length?
      '<div class="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 flex-wrap">'+
        '<button class="btn btn-primary" onclick="previewDistribute()">'+
          '<i data-lucide="shuffle" class="w-4 h-4"></i> Preview Distribution ('+U.rows.length+' rows)'+
        '</button>'+
        '<span class="text-xs text-slate-500">Smart distribution — assigns to least-loaded agents first</span>'+
      '</div>':'')+
    '</div>';

  lucide.createIcons();
}

function addUploadRows(n){var cols=getCurrentUploadCols();for(var i=0;i<n;i++){var r={};cols.forEach(function(c){r[c.key]='';});U.rows.push(r);}renderUpload();}

function parsePaste(){
  var raw=document.getElementById('paste-area').value.trim();
  if(!raw){toast('Paste data first','error');return;}
  var lines=raw.split('\n').map(function(l){return l.replace(/\r/g,'');});
  if(!lines.length){toast('No data','error');return;}
  var headerParts=lines[0].split('\t');
  var cols=buildColsFromHeaders(headerParts);
  if(!cols.length){toast('Could not detect headers','error');return;}
  saveDetectedCols(cols);
  var rows=[];
  for(var i=1;i<lines.length;i++){
    var line=lines[i].trim();if(!line)continue;
    var parts=line.split('\t');
    var obj={};cols.forEach(function(c,ci){obj[c.key]=(parts[ci]||'').trim();});
    if(!Object.values(obj).some(function(v){return v;}))continue;
    rows.push(obj);
  }
  if(!rows.length){toast('No data rows found','error');return;}
  U.rows=rows;
  toast(cols.length+' columns · '+rows.length+' rows parsed','success');
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
      var headerParts=lines[0].replace(/\r/g,'').split(',').map(function(h){return h.replace(/^"|"$/g,'').trim();});
      var cols=buildColsFromHeaders(headerParts);
      if(!cols.length){toast('Could not detect headers','error');return;}
      saveDetectedCols(cols);
      var rows=[];
      for(var i=1;i<lines.length;i++){
        var parts=lines[i].replace(/\r/g,'').split(',');
        var obj={};cols.forEach(function(c,ci){obj[c.key]=(parts[ci]||'').replace(/^"|"$/g,'').trim();});
        if(!Object.values(obj).some(function(v){return v;}))continue;
        rows.push(obj);
      }
      U.rows=rows;
      toast(cols.length+' columns · '+rows.length+' rows from CSV','success');
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
        var headerRow=(data[0]||[]).map(function(h){return(h||'').toString().trim();});
        var cols=buildColsFromHeaders(headerRow);
        if(!cols.length){toast('Could not detect headers','error');return;}
        saveDetectedCols(cols);
        var rows=[];
        for(var i=1;i<data.length;i++){
          var row=data[i];var obj={};
          cols.forEach(function(c,ci){obj[c.key]=(row[ci]||'').toString().trim();});
          if(!Object.values(obj).some(function(v){return v;}))continue;
          rows.push(obj);
        }
        U.rows=rows;
        toast(cols.length+' columns · '+rows.length+' rows from Excel','success');
        renderUpload();
      }catch(err){toast('Could not read file: '+err.message,'error');}
    };reader.readAsArrayBuffer(file);
  } else {toast('XLSX library not loaded','error');}
}

// ── Smart distribution (least-loaded agent first) ──
function smartDistribute(rows,agents){
  // Get current client counts per agent
  var loads={};
  agents.forEach(function(e){
    loads[e.id]=S.clients.filter(function(c){return c.assigned_employee_id===e.id;}).length;
  });

  var dist={};
  agents.forEach(function(e){dist[e.id]=[];});

  // Sort by load ascending before each assignment
  rows.forEach(function(row){
    // Pick agent with lowest current + assigned count
    var best=agents.slice().sort(function(a,b){
      var aTotal=loads[a.id]+(dist[a.id]||[]).length;
      var bTotal=loads[b.id]+(dist[b.id]||[]).length;
      return aTotal-bTotal;
    })[0];
    dist[best.id].push(row);
  });

  return dist;
}

// ── Duplicate detection ──
function detectDuplicates(rows,campaignId){
  var existingInCampaign=S.clients.filter(function(c){return c.campaign_id===campaignId;});
  var duplicates=[];
  var firstKey=getCurrentUploadCols()[0]?getCurrentUploadCols()[0].key:'';

  rows.forEach(function(row){
    var rowName=(row[firstKey]||row['customer']||row['name']||Object.values(row)[0]||'').toString().toLowerCase().trim();
    var rowPhone=(row['phone']||row['Phone']||'').toString().toLowerCase().trim();
    if(!rowName) return;

    var match=existingInCampaign.find(function(ec){
      var ecName=getClientDisplayName(ec).toLowerCase();
      var ecPhone=(ec.phone||'').toLowerCase();
      // Match on name similarity or same phone
      var nameMatch=rowName.length>2&&(ecName.indexOf(rowName)!==-1||rowName.indexOf(ecName)!==-1);
      var phoneMatch=rowPhone&&ecPhone&&rowPhone===ecPhone;
      return nameMatch||phoneMatch;
    });

    if(match){
      duplicates.push({name:rowName,match:getClientDisplayName(match)});
    }
  });
  return duplicates;
}

function previewDistribute(){
  var firstKey=getCurrentUploadCols()[0]?getCurrentUploadCols()[0].key:'';
  var valid=U.rows.filter(function(r){return firstKey?r[firstKey]&&r[firstKey].trim():true;});
  if(!valid.length){toast('Add clients first','error');return;}
  if(!U.campaignId){toast('Select a campaign','error');return;}
  var actEmps=activeEmps();if(!actEmps.length){toast('No active employees online','error');return;}

  var dups=detectDuplicates(valid,U.campaignId);
  var dist=smartDistribute(valid,actEmps);
  U.preview={dist:dist,duplicates:dups,skipDuplicates:dups.length>0};
  renderUpload();
}

function confirmDistribute(){
  if(!U.preview||!U.campaignId)return;
  var campName=(campById(U.campaignId)||{}).name||'Campaign';
  var cols=getCurrentUploadCols();
  var rows=[];

  Object.keys(U.preview.dist).forEach(function(eid){
    var assignedRows=U.preview.dist[eid];

    // If skip duplicates, filter them out
    if(U.preview.skipDuplicates&&U.preview.duplicates&&U.preview.duplicates.length){
      var firstKey=cols[0]?cols[0].key:'';
      var dupNames=U.preview.duplicates.map(function(d){return d.name;});
      assignedRows=assignedRows.filter(function(r){
        var n=(r[firstKey]||'').toLowerCase().trim();
        return dupNames.indexOf(n)===-1;
      });
    }

    assignedRows.forEach(function(c){
      var extraData={};cols.forEach(function(col){extraData[col.key]=c[col.key]||'';});
      var name=c[cols[0]?cols[0].key:''||'customer']||c['customer']||c['name']||Object.values(c)[0]||'';
      var phone=c['phone']||c['Phone']||'';
      rows.push({name:name.trim(),phone:phone||null,extra_data:extraData,status:'New',
        assigned_employee_id:eid,campaign_id:U.campaignId});
    });
  });

  if(!rows.length){toast('No rows to distribute after filtering','error');return;}

  sb.from('clients').insert(rows).then(function(result){
    if(result.error){toast(result.error.message,'error');return;}
    var notifPromises=Object.keys(U.preview.dist).map(function(eid){
      var cnt=U.preview.dist[eid].length;
      if(cnt){
        return notifyEmployee(eid,'new_clients',
          'You have '+cnt+' new client(s) assigned in '+campName);
      }
      return Promise.resolve();
    });
    Promise.all(notifPromises).catch(function(){});
    var dupMsg=U.preview.skipDuplicates&&U.preview.duplicates.length?
      ' ('+U.preview.duplicates.length+' duplicates skipped)':'';
    toast(rows.length+' clients distributed'+dupMsg,'success');
    U={campaignId:'',rows:[],preview:null,uploadTab:'paste',colConfig:null};
    fetchAll().then(renderUpload);
  });
}
