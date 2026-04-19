// ============================================================
// PAGE CLEANUP
// ============================================================
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
