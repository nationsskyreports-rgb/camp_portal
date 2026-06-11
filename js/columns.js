// ============================================================
// COLUMNS — Column Config Helpers + Modal
// ============================================================

// Form fields that intake.html always saves into extra_data
var FORM_FIELDS = [
  {key:'name',               label:'Client Name',        visible:true,  order:0},
  {key:'phone',              label:'Mobile',             visible:true,  order:1},
  {key:'old_phone',          label:'Old Phone',          visible:true,  order:2},
  {key:'phone2',             label:'Mobile 2',           visible:true,  order:3},
  {key:'email',              label:'Email',              visible:true,  order:4},
  {key:'email2',             label:'Email 2',            visible:true,  order:5},
  {key:'preferred_channel',  label:'Preferred Channel',  visible:true,  order:6},
  {key:'notes',              label:'Notes',              visible:true,  order:7},
];

function getDefaultCols(){return JSON.parse(JSON.stringify(DEFAULT_COLUMNS));}

function getCampaignCols(campId){
  var camp=campById(campId);
  if(camp&&camp.column_config&&Array.isArray(camp.column_config)&&camp.column_config.length>0){
    return JSON.parse(JSON.stringify(camp.column_config));
  }
  return getDefaultCols();
}

// Returns visible columns for a campaign.
// If the campaign has clients submitted via the intake form,
// auto-merges any form fields that are missing from the saved config
// so form data always shows up — even without touching column config.
function getVisibleCols(campId){
  var cols = getCampaignCols(campId);

  // Collect keys already in config
  var existingKeys = {};
  cols.forEach(function(c){ existingKeys[c.key] = true; });

  // Find clients of this campaign that came from the form
  var hasFormClients = S.clients.some(function(c){
    return c.campaign_id === campId && c.extra_data && c.extra_data.form_submitted;
  });

  if(hasFormClients){
    // Find the highest order value already used
    var maxOrder = cols.reduce(function(m,c){ return Math.max(m, c.order); }, -1);

    FORM_FIELDS.forEach(function(ff){
      if(!existingKeys[ff.key]){
        maxOrder++;
        cols.push({key:ff.key, label:ff.label, visible:true, order:maxOrder, _auto:true});
      }
    });
  }

  return cols.filter(function(c){return c.visible;}).sort(function(a,b){return a.order-b.order;});
}

function getCurrentUploadCols(){
  if(U.campaignId){return getVisibleCols(U.campaignId);}
  var cfg=U.colConfig||DEFAULT_COLUMNS;
  return cfg.filter(function(c){return c.visible;}).sort(function(a,b){return a.order-b.order;});
}

function buildUploadHeaderHTML(cols){
  var html='';
  cols.forEach(function(c){html+='<th>'+esc(c.label)+'</th>';});
  html+='<th></th>';
  return html;
}

function buildUploadRowHTML(cols,i,row){
  var html='';
  cols.forEach(function(c){
    var val=row[c.key]||'';
    html+='<td><input class="input" style="min-width:90px" placeholder="'+esc(c.label)+'" value="'+esc(val)+'" onchange="U.rows['+i+'][\''+c.key+'\']=this.value"></td>';
  });
  html+='<td><button class="btn btn-danger btn-sm" onclick="U.rows.splice('+i+',1);renderUpload()" style="padding:6px"><i data-lucide="trash-2" class="w-4 h-4"></i></button></td>';
  return html;
}

// ── Column Config Modal ──
function openColConfig(campId){
  colConfigCampaignId=campId||null;
  colConfigWorking=getCampaignCols(campId||(U.campaignId||null));
  renderColConfigList();
  document.getElementById('col-config-modal').style.display = 'flex';
  lucide.createIcons();
}
function closeColConfig(){document.getElementById('col-config-modal').style.display = 'none';}

function renderColConfigList(){
  var sorted=colConfigWorking.slice().sort(function(a,b){return a.order-b.order;});
  var html='';
  sorted.forEach(function(col){
    html+='<div class="col-config-item" draggable="true" data-key="'+esc(col.key)+'" '+
      'ondragstart="colDragStart(event,\''+esc(col.key)+'\')" '+
      'ondragover="colDragOver(event)" '+
      'ondrop="colDrop(event,\''+esc(col.key)+'\')" '+
      'ondragend="colDragEnd(event)">'+
      '<i data-lucide="grip-vertical" class="w-4 h-4 text-slate-600 flex-shrink-0"></i>'+
      '<input class="input flex-1 py-1 px-2 text-sm h-8" style="min-width:0" value="'+esc(col.label)+'" '+
        'onchange="updateColLabel(\''+esc(col.key)+'\',this.value)" onclick="event.stopPropagation()">'+
      '<button onclick="toggleColVisible(\''+esc(col.key)+'\')" class="btn btn-sm '+(col.visible?'btn-success':'btn-ghost')+' flex-shrink-0" style="padding:4px 10px;font-size:11px">'+
        (col.visible?'<i data-lucide="eye" class="w-3.5 h-3.5"></i> Visible':'<i data-lucide="eye-off" class="w-3.5 h-3.5"></i> Hidden')+
      '</button>'+
      (col.custom?'<button onclick="removeColConfig(\''+esc(col.key)+'\')" class="btn btn-danger btn-sm flex-shrink-0" style="padding:4px 8px"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>':'')+
    '</div>';
  });
  document.getElementById('col-config-list').innerHTML=html;
  lucide.createIcons();
}

// ── "Add Form Fields" button in modal ──
// Adds any missing intake form fields to the working config
function addFormFieldsToConfig(){
  var existingKeys={};
  colConfigWorking.forEach(function(c){ existingKeys[c.key]=true; });
  var maxOrder=colConfigWorking.reduce(function(m,c){ return Math.max(m,c.order); },-1);
  var added=0;
  FORM_FIELDS.forEach(function(ff){
    if(!existingKeys[ff.key]){
      maxOrder++;
      colConfigWorking.push({key:ff.key, label:ff.label, visible:true, order:maxOrder, custom:true});
      added++;
    }
  });
  if(added) renderColConfigList();
  toast(added ? added+' form fields added' : 'All form fields already present', added?'success':'info');
}

function colDragStart(e,key){colConfigDragSrc=key;e.target.classList.add('dragging');e.dataTransfer.effectAllowed='move';}
function colDragOver(e){e.preventDefault();e.currentTarget.classList.add('drag-over');}
function colDrop(e,targetKey){
  e.preventDefault();e.currentTarget.classList.remove('drag-over');
  if(!colConfigDragSrc||colConfigDragSrc===targetKey)return;
  var srcCol=colConfigWorking.find(function(c){return c.key===colConfigDragSrc;});
  var tgtCol=colConfigWorking.find(function(c){return c.key===targetKey;});
  if(!srcCol||!tgtCol)return;
  var tmp=srcCol.order;srcCol.order=tgtCol.order;tgtCol.order=tmp;
  renderColConfigList();
}
function colDragEnd(e){
  e.target.classList.remove('dragging');
  document.querySelectorAll('.col-config-item').forEach(function(el){el.classList.remove('drag-over');});
  colConfigDragSrc=null;
}
function updateColLabel(key,val){var c=colConfigWorking.find(function(x){return x.key===key;});if(c)c.label=val;}
function toggleColVisible(key){var c=colConfigWorking.find(function(x){return x.key===key;});if(c){c.visible=!c.visible;renderColConfigList();}}
function removeColConfig(key){colConfigWorking=colConfigWorking.filter(function(c){return c.key!==key;});renderColConfigList();}
function addCustomColumn(){
  var newKey='custom_'+Date.now();
  var maxOrder=Math.max.apply(null,colConfigWorking.map(function(c){return c.order;}).concat([-1]))+1;
  colConfigWorking.push({key:newKey,label:'New Column',visible:true,order:maxOrder,custom:true});
  renderColConfigList();
}
function saveColConfig(){
  colConfigWorking.sort(function(a,b){return a.order-b.order;});
  colConfigWorking.forEach(function(c,i){c.order=i;});
  var campId=colConfigCampaignId||(U.campaignId||null);
  if(campId){
    sb.from('campaigns').update({column_config:colConfigWorking}).eq('id',campId).then(function(r){
      if(r.error){toast(r.error.message,'error');return;}
      toast('Column config saved');
      fetchAll().then(function(){
        closeColConfig();
        if(S.currentPage==='upload')renderUpload();
        if(S.currentPage==='my-clients')renderMyClients();
      });
    });
  } else {
    U.colConfig=colConfigWorking.slice();
    toast('Column config applied');
    closeColConfig();
    renderUpload();
  }
}
