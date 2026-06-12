// ============================================================
// GENERIC SHEET MIRROR — reads ANY sheet's headers exactly,
// stores data under them, drops empty columns automatically.
// Each campaign keeps its own column structure independently.
// ============================================================

// Junk columns that should never be imported
var SKIP_HEADERS = ['(Do Not Modify) Order','(Do Not Modify) Row Checksum','(Do Not Modify) Modified On'];

// Build columns from the sheet's first row — completely generic
function buildColsFromHeaders(headers){
  var cols = [];
  var seen = {};
  var phoneCount = 0;

  headers.forEach(function(h, i){
    if (h === null || h === undefined) return;
    var label = String(h).trim();
    if (!label) return;
    if (SKIP_HEADERS.indexOf(label) > -1) return;

    var lower = label.toLowerCase();
    var key;

    // Phone columns get canonical keys (phone, phone_2, phone_3...)
    // so the intake form lookup keeps working regardless of header names
    if (/mobile|phone|تليفون|موبايل|هاتف|جوال/.test(lower)) {
      phoneCount++;
      key = phoneCount === 1 ? 'phone' : 'phone_' + phoneCount;
    }
    // Customer/name column gets canonical key
    else if (/^customer$|^client$|customer name|client name|^name$|الاسم|اسم العميل/.test(lower)) {
      key = 'customer';
    }
    // Everything else: slugified from the header itself
    else {
      key = label.toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 40) || ('col_' + i);
    }

    // Ensure uniqueness
    var base = key, n = 2;
    while (seen[key]) { key = base + '_' + n; n++; }
    seen[key] = true;

    cols.push({ key: key, label: label, srcIdx: i });
  });

  return cols;
}

// Format cell values: Excel dates → readable date strings
function formatCellValue(v){
  if (v === null || v === undefined) return '';
  // Excel serial date number (rough range for modern dates)
  if (typeof v === 'number' && v > 25569 && v < 60000 && v % 1 === 0) {
    var d = new Date((v - 25569) * 86400 * 1000);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  var s = String(v).trim();
  // Datetime strings like "2026-06-02 00:00:00" → "2026-06-02"
  var m = s.match(/^(\d{4}-\d{2}-\d{2})[T ]00:00:00/);
  if (m) return m[1];
  return s;
}

// After rows are parsed: drop columns that are completely empty
function dropEmptyColumns(){
  if (!U.detectedCols || !U.rows.length) return;
  var before = U.detectedCols.length;
  U.detectedCols = U.detectedCols.filter(function(c){
    return U.rows.some(function(r){ return r[c.key] && String(r[c.key]).trim(); });
  });
  var dropped = before - U.detectedCols.length;
  if (dropped > 0) toast(dropped + ' empty column(s) removed automatically', 'info');
}

// Save the detected structure into THIS campaign's column_config —
// each campaign keeps its own independent structure
function saveDetectedCols(cols){
  U.detectedCols = cols;
  if (!U.campaignId) return;

  var camp = campById(U.campaignId);
  var existing = (camp && camp.column_config) || [];
  // Preserve form settings (show_in_form etc.) for keys that already exist
  var existingByKey = {};
  existing.forEach(function(c){ existingByKey[c.key] = c; });

  var newConfig = cols.map(function(c, i){
    var prev = existingByKey[c.key] || {};
    return {
      key           : c.key,
      label         : c.label,
      visible       : prev.visible !== undefined ? prev.visible : true,
      order         : i,
      show_in_form  : prev.show_in_form || false,
      form_label    : prev.form_label || c.label,
      form_order    : prev.form_order !== undefined ? prev.form_order : 999,
      form_required : prev.form_required || false
    };
  });
  // Keep form-only custom questions that aren't sheet columns
  existing.forEach(function(c){
    if (c.form_only && !cols.some(function(x){ return x.key === c.key; })) newConfig.push(c);
  });

  sb.from('campaigns').update({ column_config: newConfig }).eq('id', U.campaignId).then(function(r){
    if (!r.error) {
      // refresh local state so campaign table reflects new structure immediately
      if (camp) camp.column_config = newConfig;
      toast('Campaign columns synced with sheet structure ✓', 'success');
    }
  });
}

// ── Phone normalization helper (used in upload + intake) ──────
function normalizePhoneDigits(raw){
  if(!raw) return '';
  return String(raw).replace(/\D/g,'');
}
function phonesMatch(stored,input){
  var s=normalizePhoneDigits(stored);
  var i=normalizePhoneDigits(input);
  if(s.length<7||i.length<7) return false;
  return s.slice(-9)===i.slice(-9);
}

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
    var totalClients = Object.values(U.preview).reduce(function(s,a){return s+a.length;},0);
    previewHtml='<div class="card border-emerald-500/20 mb-6 fade-in"><h3 class="text-sm font-bold text-white mb-1">Preview - '+totalClients+' clients → active agents</h3><p class="text-xs text-slate-500 mb-4">Inactive agents excluded · duplicates merged by phone</p><div class="space-y-3">'+
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
  (U.uploadTab==='paste'?'<div class="space-y-3"><p class="text-xs text-slate-400 mb-2">Paste from Excel — first row must be headers, system auto-detects columns<strong class="text-slate-300">First row must be headers</strong> , system auto-detects columns</p><textarea id="paste-area" class="input font-mono text-xs" rows="10" placeholder="Paste tab-separated rows here..."></textarea><button class="btn btn-primary" onclick="parsePaste()"><i data-lucide="clipboard-check" class="w-4 h-4"></i> Parse & Preview</button></div>':'')+
  (U.uploadTab==='excel'?'<div class="space-y-3"><p class="text-xs text-slate-400">Upload .xlsx or .csv file — <strong class="text-slate-300">System will auto-detect headers</strong> from first row</p><div class="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/40 transition-colors" ondrop="handleExcelDrop(event)" ondragover="event.preventDefault()"><i data-lucide="file-spreadsheet" class="w-10 h-10 text-slate-600 mx-auto mb-3"></i><p class="text-slate-400 text-sm mb-3">Drag & drop file here</p><label class="btn btn-ghost cursor-pointer"><i data-lucide="upload" class="w-4 h-4"></i> Browse<input type="file" accept=".xlsx,.xls,.csv" class="hidden" onchange="handleExcelFile(this)"></label></div>'+(U.rows.length?'<p class="text-emerald-400 text-sm font-medium">✓ '+U.rows.length+' rows loaded</p>':'')+'</div>':'')+
  manualHtml+
  (U.rows.length?'<div class="mt-4 pt-4 border-t border-white/10 flex gap-2 flex-wrap">'+
  '<button class="btn btn-primary" onclick="previewDistribute()"><i data-lucide="shuffle" class="w-4 h-4"></i> Distribute to agents ('+U.rows.length+' rows)</button>'+
  '<button class="btn btn-ghost" onclick="saveWithoutDistribution()"><i data-lucide="save" class="w-4 h-4"></i> Save without distribution</button>'+
'</div>':'')+'</div>';
  lucide.createIcons();
}
function addUploadRows(n){var cols=getCurrentUploadCols();for(var i=0;i<n;i++){var r={};cols.forEach(function(c){r[c.key]='';});U.rows.push(r);}renderUpload();}
function parsePaste(){
  var raw=document.getElementById('paste-area').value;
  if(!raw||!raw.trim()){toast('Paste data first','error');return;}

  // ── Parse TSV handling quoted multiline cells ─────────────
  // Excel wraps cells containing newlines in double-quotes when copying
  // e.g. "line1\nline2" — we collapse them to a single value
  var allLines = parseTSV(raw);
  if(allLines.length < 2){toast('No data rows found','error');return;}

  var headerParts = allLines[0];
  var cols = buildColsFromHeaders(headerParts);
  if(!cols.length){toast('Could not detect headers','error');return;}
  saveDetectedCols(cols);

  var minCols = Math.floor(headerParts.length * 0.3); // at least 30% of header cols must be filled
  var rows = [];
  for(var i = 1; i < allLines.length; i++){
    var parts = allLines[i];
    // Skip rows that are clearly partial (too few columns — likely newline artifact)
    if(parts.length < minCols) continue;
    var obj = {};
    cols.forEach(function(c){
      obj[c.key] = formatCellValue(c.srcIdx !== undefined ? parts[c.srcIdx] : parts[cols.indexOf(c)]);
    });
    if(!Object.values(obj).some(function(v){return v;})) continue;
    rows.push(obj);
  }
  if(!rows.length){toast('No data rows found','error');return;}
  U.rows = rows;
  dropEmptyColumns();
  saveDetectedCols(U.detectedCols);
  toast(U.detectedCols.length+' columns detected · '+rows.length+' rows parsed','success');
  renderUpload();
}

// ── TSV parser that handles quoted multiline cells ─────────────
function parseTSV(raw){
  var rows = [];
  var currentRow = [];
  var currentCell = '';
  var inQuotes = false;
  var i = 0;

  // Normalize line endings
  raw = raw.replace(/\r\n/g,'\n').replace(/\r/g,'\n');

  while(i < raw.length){
    var ch = raw[i];
    if(inQuotes){
      if(ch === '"'){
        if(raw[i+1] === '"'){
          // Escaped quote
          currentCell += '"';
          i += 2; continue;
        }
        inQuotes = false; i++; continue;
      }
      // Newline inside quoted cell — collapse to space
      if(ch === '\n'){ currentCell += ' '; i++; continue; }
      currentCell += ch; i++; continue;
    }
    // Not in quotes
    if(ch === '"'){ inQuotes = true; i++; continue; }
    if(ch === '\t'){
      currentRow.push(currentCell.trim());
      currentCell = ''; i++; continue;
    }
    if(ch === '\n'){
      currentRow.push(currentCell.trim());
      if(currentRow.some(function(c){return c;})) rows.push(currentRow);
      currentRow = []; currentCell = ''; i++; continue;
    }
    currentCell += ch; i++;
  }
  // Last cell/row
  currentRow.push(currentCell.trim());
  if(currentRow.some(function(c){return c;})) rows.push(currentRow);
  return rows;
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
        cols.forEach(function(c){var v=(c.srcIdx!==undefined?parts[c.srcIdx]:'')||'';obj[c.key]=formatCellValue(String(v).replace(/^"|"$/g,''));});
        if(!Object.values(obj).some(function(v){return v;}))continue;
        rows.push(obj);
      }
      U.rows=rows;
      dropEmptyColumns();
      saveDetectedCols(U.detectedCols);
      toast(U.detectedCols.length+' columns detected · '+rows.length+' rows from CSV','success');
      renderUpload();
    };reader.readAsText(file);
  } else if(window.XLSX){
    var reader=new FileReader();
    reader.onload=function(e){
      try{
        var wb=XLSX.read(e.target.result,{type:'array',cellDates:false});
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
          cols.forEach(function(c){obj[c.key]=formatCellValue(c.srcIdx!==undefined?row[c.srcIdx]:row[cols.indexOf(c)]);});
          if(!Object.values(obj).some(function(v){return v;}))continue;
          rows.push(obj);
        }
        U.rows=rows;
        dropEmptyColumns();
        saveDetectedCols(U.detectedCols);
        toast(U.detectedCols.length+' columns detected · '+rows.length+' rows from Excel','success');
        renderUpload();
      }catch(err){toast('Could not read file: '+err.message,'error');}
    };reader.readAsArrayBuffer(file);
  } else {toast('XLSX library not loaded','error');}
}

// ── Duplicate detection ──────────────────────────────────────
function detectDuplicates(rows){
  if(!U.campaignId) return [];
  var existing=S.clients.filter(function(c){return c.campaign_id===U.campaignId;});
  if(!existing.length) return [];
  var byPhone={},byContract={};
  existing.forEach(function(c){
    var p=normalizePhoneDigits(c.phone||'');
    if(p&&p.length>=7) byPhone[p.slice(-9)]=true;
    var cn=(c.extra_data||{}).contract_number;
    if(cn) byContract[cn.trim().toLowerCase()]=true;
  });
  return rows.filter(function(r){
    var rp=normalizePhoneDigits(r.phone||'').slice(-9);
    var rc=(r.contract_number||'').trim().toLowerCase();
    return (rp&&byPhone[rp])||(rc&&byContract[rc]);
  });
}

function showDupWarning(dupCount,totalRows,onSkip,onOverwrite){
  var old=document.getElementById('dup-modal');if(old)old.remove();
  var ov=document.createElement('div');ov.id='dup-modal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:1000;display:flex;align-items:center;justify-content:center;padding:1rem';
  ov.innerHTML='<div style="background:#0d1628;border:1px solid rgba(239,68,68,.25);border-radius:14px;max-width:420px;width:100%;padding:1.5rem">'+
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:1rem">'+
      '<div style="width:36px;height:36px;border-radius:10px;background:rgba(239,68,68,.1);display:flex;align-items:center;justify-content:center">'+
        '<i data-lucide="alert-triangle" style="width:18px;height:18px;color:#f87171"></i></div>'+
      '<div><h3 style="color:#fff;font-size:15px;font-weight:700">Duplicates Detected</h3>'+
        '<p style="color:#94a3b8;font-size:12px">'+dupCount+' of '+totalRows+' rows already exist in this campaign</p></div>'+
    '</div>'+
    '<div style="background:rgba(255,255,255,.03);border-radius:8px;padding:10px 12px;margin-bottom:1rem;font-size:12px;color:#94a3b8;line-height:1.6">'+
      '• <b style="color:#e2e8f0">Skip</b> — import new records only<br>'+
      '• <b style="color:#e2e8f0">Overwrite</b> — update existing records<br>'+
      '• <b style="color:#e2e8f0">Cancel</b> — go back and review</div>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
      '<button class="btn btn-primary btn-sm flex-1" id="dup-skip">Skip ('+dupCount+')</button>'+
      '<button class="btn btn-ghost btn-sm" id="dup-over" style="border-color:rgba(251,191,36,.3);color:#fbbf24">Overwrite</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="document.getElementById(\'dup-modal\').remove()">Cancel</button>'+
    '</div></div>';
  document.body.appendChild(ov);lucide.createIcons();
  document.getElementById('dup-skip').onclick=function(){ov.remove();onSkip();};
  document.getElementById('dup-over').onclick=function(){ov.remove();onOverwrite();};
}

function saveWithoutDistribution(){
  if(!U.rows.length){toast('No data to save','error');return;}
  if(!U.campaignId){toast('Select a campaign first','error');return;}
  var dups=detectDuplicates(U.rows);
  if(dups.length>0){
    var dp=new Set(dups.map(function(r){return normalizePhoneDigits(r.phone||'').slice(-9);}));
    var dc=new Set(dups.map(function(r){return (r.contract_number||'').trim().toLowerCase();}));
    showDupWarning(dups.length,U.rows.length,
      function(){U.rows=U.rows.filter(function(r){var p=normalizePhoneDigits(r.phone||'').slice(-9);var c=(r.contract_number||'').trim().toLowerCase();return !(p&&dp.has(p))&&!(c&&dc.has(c));});doSave();},
      function(){doSave();}
    );return;
  }
  doSave();
}
// ── Group rows by phone — same client with multiple units → one record ──
function groupRowsByPhone(rawRows, cols) {
  var CLIENT_KEYS = ['phone','phone_2','phone_3','customer','name','email'];
  var unitCols    = cols.filter(function(c){ return CLIENT_KEYS.indexOf(c.key) === -1; });
  var grouped     = {};
  var order       = [];

  rawRows.forEach(function(r) {
    var rawPhone = r['phone'] || r['Phone'] || '';
    var norm     = normalizePhoneDigits(rawPhone).slice(-9);
    if (!norm || norm.length < 7) norm = rawPhone;

    var unitObj = {};
    unitCols.forEach(function(c){ if (r[c.key]) unitObj[c.key] = r[c.key]; });

    if (!grouped[norm]) {
      var clientExtra = { phone: rawPhone };
      cols.forEach(function(c){
        if (CLIENT_KEYS.indexOf(c.key) > -1 && c.key !== 'phone' && r[c.key])
          clientExtra[c.key] = r[c.key];
      });
      grouped[norm] = {
        name  : r['customer'] || r['name'] || Object.values(r)[0] || '',
        phone : rawPhone,
        extra : clientExtra,
        units : []
      };
      order.push(norm);
    }
    if (Object.keys(unitObj).length) grouped[norm].units.push(unitObj);
  });

  return order.map(function(norm) {
    var g     = grouped[norm];
    var extra = Object.assign({}, g.extra);
    if (g.units.length) extra.units = g.units;
    return { name: g.name.trim(), phone: g.phone, extra_data: extra };
  });
}

function doSave(){
  var cols     = U.detectedCols || getCurrentUploadCols();
  var grouped  = groupRowsByPhone(U.rows, cols);
  var rows     = grouped.map(function(g){
    return Object.assign({}, g, { status:'New', assigned_employee_id:null, campaign_id:U.campaignId });
  });
  sb.from('clients').insert(rows).then(function(result){
    if(result.error){toast(result.error.message,'error');return;}
    var dedup = U.rows.length - rows.length;
    toast(rows.length+' client(s) saved'+(dedup?' · '+dedup+' rows merged (duplicates)':'')+' ✓','success');
    U={campaignId:U.campaignId,rows:[],preview:null,uploadTab:'paste',colConfig:null,detectedCols:null,isNOSSheet:false};
    fetchAll().then(renderUpload);
  });
}

function previewDistribute(){
  var dups=detectDuplicates(U.rows);
  if(dups.length>0){
    var dp=new Set(dups.map(function(r){return normalizePhoneDigits(r.phone||'').slice(-9);}));
    var dc=new Set(dups.map(function(r){return (r.contract_number||'').trim().toLowerCase();}));
    showDupWarning(dups.length,U.rows.length,
      function(){U.rows=U.rows.filter(function(r){var p=normalizePhoneDigits(r.phone||'').slice(-9);var c=(r.contract_number||'').trim().toLowerCase();return !(p&&dp.has(p))&&!(c&&dc.has(c));});_doPreview();},
      function(){_doPreview();}
    );return;
  }
  _doPreview();
}
function _doPreview(){
  var cols     = U.detectedCols || getCurrentUploadCols();
  var grouped  = groupRowsByPhone(U.rows, cols);
  if(!grouped.length){toast('Add clients first','error');return;}
  if(!U.campaignId){toast('Select a campaign','error');return;}
  var actEmps=activeEmps();if(!actEmps.length){toast('No active employees','error');return;}
  var dist={};actEmps.forEach(function(e){dist[e.id]=[];});
  grouped.forEach(function(g,i){dist[actEmps[i%actEmps.length].id].push(g);});
  U.preview=dist;renderUpload();
}

function confirmDistribute(){
  if(!U.preview||!U.campaignId)return;
  var campName=(campById(U.campaignId)||{}).name||'Campaign';
  var rows=[];
  Object.keys(U.preview).forEach(function(eid){
    U.preview[eid].forEach(function(g){
      rows.push(Object.assign({}, g, { status:'New', assigned_employee_id:eid, campaign_id:U.campaignId }));
    });
  });
  sb.from('clients').insert(rows).then(function(result){
    if(result.error){toast(result.error.message,'error');return;}
    var notifPromises = Object.keys(U.preview).map(function(eid){
      if(U.preview[eid].length){
        return notifyEmployee(eid,'new_clients',
          'You have '+U.preview[eid].length+' new client(s) assigned in '+campName);
      }
      return Promise.resolve();
    });
    Promise.all(notifPromises).catch(function(){});
    toast(rows.length+' clients distributed successfully','success');
    U={campaignId:'',rows:[],preview:null,uploadTab:'paste',colConfig:null};
    fetchAll().then(renderUpload);
  });
}
