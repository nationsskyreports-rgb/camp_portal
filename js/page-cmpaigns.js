// ============================================================
// PAGE CAMPAIGNS
// ============================================================
var CAMP_TYPES    = ['Real Estate','Insurance','Telecom','Banking','Services','General','Other'];
var CAMP_STATUSES = ['Active','Paused','Ended'];

function renderCampaigns(){
  var m=document.getElementById('main-content');

  // ── DETAIL VIEW — when a campaign is selected ──
  if(selectedCampId){
    var vc=campById(selectedCampId);
    if(!vc){selectedCampId=null;renderCampaigns();return;}

    var cc=S.clients.filter(function(c){return c.campaign_id===vc.id;});
    var visCols=getVisibleCols(vc.id);

    var sBtns='';
    CAMP_STATUSES.forEach(function(s){
      sBtns+='<button class="btn btn-sm '+(vc.status===s?'btn-primary':'btn-ghost')+'" onclick="changeCampStatus(\''+vc.id+'\',\''+s+'\')">'+s+'</button>';
    });

    var newCount  =cc.filter(function(c){return c.status==='New';}).length;
    var contacted =cc.filter(function(c){return c.status==='Contacted';}).length;
    var interested=cc.filter(function(c){return c.status==='Interested';}).length;
    var closed    =cc.filter(function(c){return c.status==='Closed';}).length;
    var convRate  =cc.length?Math.round((closed/cc.length)*100):0;

    m.innerHTML=hdr(
      esc(vc.name),
      esc(vc.type||'General'),
      '<button class="btn btn-ghost" onclick="selectedCampId=null;renderCampaigns()">'+
        '<i data-lucide="arrow-left" class="w-4 h-4"></i> Back'+
      '</button>'+
      '<button class="btn btn-ghost btn-sm" onclick="openColConfig(\''+vc.id+'\')">'+
        '<i data-lucide="settings-2" class="w-4 h-4"></i> Columns'+
      '</button>'+
      sBadge(vc.status)
    )+

    // Status switcher
    '<div class="card mb-5 fade-in"><div class="flex items-center gap-3 flex-wrap">'+
      '<span class="text-xs text-slate-400 font-medium uppercase tracking-wider">Status:</span>'+
      sBtns+
    '</div></div>'+

    // Stats
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:12px;margin-bottom:20px" class="fade-in">'+
      campStatCell(cc.length,    'Total',       'text-white')+
      campStatCell(newCount,     'New',          'text-blue-400')+
      campStatCell(contacted,    'Contacted',    'text-violet-400')+
      campStatCell(interested,   'Interested',   'text-amber-400')+
      campStatCell(closed,       'Closed',       'text-emerald-400')+
      campStatCell(convRate+'%', 'Conv. Rate',   convRate>=20?'text-emerald-400':convRate>=10?'text-amber-400':'text-slate-400')+
    '</div>'+

    // Clients table
    '<div class="card fade-in">'+
      '<h3 class="text-sm font-bold text-white mb-4">Clients ('+cc.length+')</h3>'+
      (cc.length?
        '<div class="tbl-wrap"><table class="w-full text-sm">'+
          '<thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
            visCols.map(function(c){return'<th class="pb-3 pr-4">'+esc(c.label)+'</th>';}).join('')+
            '<th class="pb-3 pr-4">Assigned To</th>'+
            '<th class="pb-3 pr-4">Mood</th>'+
            '<th class="pb-3 pr-4">Trials</th>'+
            '<th class="pb-3">Status</th>'+
          '</tr></thead>'+
          '<tbody>'+
          cc.map(function(c){
            var e=empById(c.assigned_employee_id);
            var extra=c.extra_data||{};
            var mood=getClientMood(c);
            var trials=clientHistory(c.id).length;
            return'<tr class="table-row border-b border-white/[0.03]">'+
              visCols.map(function(col){
                return'<td class="py-3 pr-4 text-slate-300 text-xs max-w-[160px] truncate">'+esc(extra[col.key]||c[col.key]||'-')+'</td>';
              }).join('')+
              '<td class="py-3 pr-4">'+
                (e?
                  '<div class="flex items-center gap-1.5">'+
                    av(e.name,e.color||'#3b82f6',22)+
                    '<span class="text-xs text-slate-300">'+esc(e.name)+'</span>'+
                    pDot(e.is_active)+
                  '</div>':
                  '<span class="text-slate-500 text-xs">Unassigned</span>')+
              '</td>'+
              '<td class="py-3 pr-4">'+(mood?moodBadge(mood):'<span class="text-slate-600 text-xs">—</span>')+'</td>'+
              '<td class="py-3 pr-4">'+trialsBadge(trials)+'</td>'+
              '<td class="py-3">'+sBadge(c.status)+'</td>'+
            '</tr>';
          }).join('')+
          '</tbody></table></div>':
        '<p class="text-slate-500 text-sm text-center py-8">No clients in this campaign yet</p>'
      )+
    '</div>';

    lucide.createIcons();
    return;
  }

  // ── LIST VIEW ──
  m.innerHTML=hdr(
    'Campaigns',
    S.campaigns.length+' campaigns',
    '<button class="btn btn-primary" onclick="showCampForm=!showCampForm;renderCampaigns()">'+
      '<i data-lucide="plus" class="w-4 h-4"></i> New Campaign'+
    '</button>'
  )+

  (showCampForm?
    '<div class="card mb-6 fade-in border-blue-500/20">'+
      '<h3 class="text-sm font-bold text-white mb-4">Create Campaign</h3>'+
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">'+
        '<div><label class="text-xs text-slate-400 mb-1 block">Name *</label>'+
          '<input id="cn" class="input" placeholder="Campaign name"></div>'+
        '<div><label class="text-xs text-slate-400 mb-1 block">Type</label>'+
          '<select id="ct" class="input">'+
            CAMP_TYPES.map(function(t){return'<option>'+t+'</option>';}).join('')+
          '</select></div>'+
      '</div>'+
      '<div class="flex gap-2 mt-4">'+
        '<button class="btn btn-primary" onclick="createCamp()">Create</button>'+
        '<button class="btn btn-ghost" onclick="showCampForm=false;renderCampaigns()">Cancel</button>'+
      '</div>'+
    '</div>':'')+

  '<div class="space-y-3 fade-in">'+
  (S.campaigns.length?S.campaigns.map(function(camp){
    var cc=S.clients.filter(function(cl){return cl.campaign_id===camp.id;});
    var closed=cc.filter(function(c){return c.status==='Closed';}).length;
    var convRate=cc.length?Math.round((closed/cc.length)*100):0;
    var convColor=convRate>=20?'text-emerald-400':convRate>=10?'text-amber-400':'text-slate-500';

    var agentIds={};
    cc.forEach(function(c){if(c.assigned_employee_id)agentIds[c.assigned_employee_id]=true;});
    var campAgents=S.employees.filter(function(e){return agentIds[e.id];});

    return'<div class="card card-hover cursor-pointer" onclick="selectedCampId=\''+camp.id+'\';renderCampaigns()">'+
      '<div class="flex items-center justify-between gap-3" style="flex-wrap:wrap">'+

        '<div class="flex items-center gap-3">'+
          '<div class="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0">'+
            '<i data-lucide="target" class="w-5 h-5"></i>'+
          '</div>'+
          '<div>'+
            '<p class="font-bold text-white">'+esc(camp.name)+'</p>'+
            '<p class="text-xs text-slate-500">'+esc(camp.type||'General')+'</p>'+
          '</div>'+
        '</div>'+

        '<div class="flex items-center gap-3 flex-wrap">'+
          '<div class="text-xs text-slate-400">'+
            '<span class="text-white font-semibold">'+cc.length+'</span> clients'+
            (cc.length?
              ' &nbsp;·&nbsp; <span class="text-emerald-400 font-semibold">'+closed+'</span> closed'+
              ' &nbsp;·&nbsp; <span class="'+convColor+' font-semibold">'+convRate+'%</span>':'')+
          '</div>'+

          // Agent avatars
          (campAgents.length?
            '<div class="flex items-center" style="gap:-4px">'+
            campAgents.slice(0,5).map(function(e){
              return'<div title="'+esc(e.name)+'" style="width:26px;height:26px;border-radius:50%;background:'+(e.color||'#3b82f6')+';border:2px solid #0d1628;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;margin-left:-6px">'+
                initials(e.name)+
              '</div>';
            }).join('')+
            (campAgents.length>5?
              '<div style="width:26px;height:26px;border-radius:50%;background:#1e293b;border:2px solid #0d1628;display:flex;align-items:center;justify-content:center;font-size:9px;color:#64748b;margin-left:-6px">+'+( campAgents.length-5)+'</div>':'')+
            '</div>':'')+''+

          sBadge(camp.status)+

          '<div class="flex gap-1" onclick="event.stopPropagation()">'+
            '<button class="btn btn-ghost btn-sm" style="padding:5px 8px" onclick="event.stopPropagation();openColConfig(\''+camp.id+'\')" title="Columns">'+
              '<i data-lucide="columns" class="w-3.5 h-3.5"></i>'+
            '</button>'+
            '<button class="btn btn-danger btn-sm" style="padding:5px 8px" onclick="event.stopPropagation();deleteCampaign(\''+camp.id+'\',\''+esc(camp.name).replace(/'/g,'')+'\')">'+
              '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>'+
            '</button>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join(''):
    '<div class="card text-center py-16">'+
      '<div class="w-14 h-14 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">'+
        '<i data-lucide="target" class="w-7 h-7 text-slate-600"></i>'+
      '</div>'+
      '<p class="text-slate-400 font-medium">No campaigns yet</p>'+
      '<p class="text-slate-600 text-sm mt-1">Click "New Campaign" to get started</p>'+
    '</div>'
  )+'</div>';

  lucide.createIcons();
}

function campStatCell(val,label,colorCls){
  return'<div class="card text-center" style="padding:12px">'+
    '<p class="text-xl font-bold '+colorCls+'">'+val+'</p>'+
    '<p class="text-xs text-slate-500 mt-0.5">'+label+'</p>'+
  '</div>';
}

function createCamp(){
  var n=document.getElementById('cn').value.trim();
  var t=document.getElementById('ct').value;
  if(!n){toast('Name required','error');return;}
  sb.from('campaigns').insert({name:n,type:t,status:'Active',column_config:DEFAULT_COLUMNS})
    .then(function(r){
      if(r.error){toast(r.error.message,'error');return;}
      toast('Campaign created');
      showCampForm=false;
      fetchAll().then(renderCampaigns);
    }).catch(function(e){toast(e.message,'error');});
}

function changeCampStatus(id,st){
  sb.from('campaigns').update({status:st}).eq('id',id)
    .then(function(r){
      if(r.error){toast(r.error.message,'error');return;}
      toast('Status updated');
      fetchAll().then(renderCampaigns);
    }).catch(function(e){toast(e.message,'error');});
}

function deleteCampaign(id,name){
  showConfirm(
    'Delete Campaign',
    'Delete "'+name+'"? All clients in this campaign will also be deleted.',
    function(){
      sb.from('clients').delete().eq('campaign_id',id)
        .then(function(){return sb.from('campaigns').delete().eq('id',id);})
        .then(function(){
          toast('Campaign deleted');
          if(selectedCampId===id)selectedCampId=null;
          fetchAll().then(renderCampaigns);
        }).catch(function(e){toast(e.message,'error');});
    },
    'Delete','btn-danger'
  );
}
