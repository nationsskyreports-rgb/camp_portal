function previewDistribute(){
  var dups = detectDuplicates(U.rows);
  if(dups.length > 0){
    var dupPhones    = new Set(dups.map(function(r){ return normalizePhoneDigits(r.phone||'').slice(-9); }));
    var dupContracts = new Set(dups.map(function(r){ return (r.contract_number||'').trim().toLowerCase(); }));
    showDupWarning('distribute', dups.length, U.rows.length,
      function(){
        U.rows = U.rows.filter(function(r){
          var p  = normalizePhoneDigits(r.phone||'').slice(-9);
          var cn = (r.contract_number||'').trim().toLowerCase();
          return !(p&&dupPhones.has(p)) && !(cn&&dupContracts.has(cn));
        });
        _doPreviewDistribute();
      },
      function(){ _doPreviewDistribute(); }
    );
    return;
  }
  _doPreviewDistribute();
}
function _doPreviewDistribute(){
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
      var name=c['customer']||c['Customer']||c[cols[0]?cols[0].key:'']||c['name']||Object.values(c)[0]||'';
      var phone=c['phone']||c['Phone']||'';
      rows.push({name:name.trim(),phone:phone||null,extra_data:extraData,status:'New',assigned_employee_id:eid,campaign_id:U.campaignId});
    });
  });
  sb.from('clients').insert(rows).then(function(result){
    if(result.error){toast(result.error.message,'error');return;}
    var notifs=[];
    Object.keys(U.preview).forEach(function(eid){if(U.preview[eid].length){notifs.push({employee_id:eid,type:'data_updated',message:'New data - '+U.preview[eid].length+' client(s) in '+campName,read:false});}});
    // Send notifications to employees
    if(notifs.length){
      var notifPromises = Object.keys(U.preview).map(function(eid){
        if(U.preview[eid].length){
          return notifyEmployee(
            eid,
            'new_clients',
            'You have '+U.preview[eid].length+' new client(s) assigned in '+campName
          );
        }
        return Promise.resolve();
      });
      Promise.all(notifPromises).catch(function(){});
    }
    toast(rows.length+' clients distributed successfully','success');
    U={campaignId:'',rows:[],preview:null,uploadTab:'paste',colConfig:null};
    fetchAll().then(renderUpload);
  });
}
