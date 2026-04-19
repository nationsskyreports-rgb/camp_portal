// ============================================================
// PAGE CLIENTS — My Clients / All Clients
// ============================================================
function renderMyClients(){
  var m=document.getElementById('main-content');
  var allCls=myClients();

  // ── Campaign filter ──
  var campOpts='<option value="">All Campaigns</option>';
  var seen={};
  allCls.forEach(function(c){
    if(!seen[c.campaign_id]){
      seen[c.campaign_id]=true;
      var cp=campById(c.campaign_id);
      if(cp) campOpts+='<option value="'+c.campaign_id+'" '+(empClientFilter===c.campaign_id?'selected':'')+'>'+esc(cp.name)+'</option>';
    }
  });
  if(empClientFilter) allCls=allCls.filter(function(c){return c.campaign_id===empClientFilter;});

  // ── Search filter ──
  if(clientSearch.trim()){
    var q=clientSearch.toLowerCase();
    allCls=allCls.filter(function(c){
      var name=getClientDisplayName(c).toLowerCase();
      var phone=(c.phone||'').toLowerCase();
      var extra=JSON.stringify(c.extra_data||{}).toLowerCase();
      return name.indexOf(q)!==-1||phone.indexOf(q)!==-1||extra.indexOf(q)!==-1;
    });
  }

  var totalCount=allCls.length;
  var totalPages=Math.max(1,Math.ceil(totalCount/CLIENT_PAGE_SIZE));
  if(clientPage>=totalPages) clientPage=0;
  var pageCls=allCls.slice(clientPage*CLIENT_PAGE_SIZE,(clientPage+1)*CLIENT_PAGE_SIZE);

  // ── Stats row ──
  var newCount=allCls.filter(function(c){return c.status==='New';}).length;
  var contactedCount=allCls.filter(function(c){return c.status==='Contacted';}).length;
  var interestedCount=allCls.filter(function(c){return c.status==='Interested';}).length;
  var closedCount=allCls.filter(function(c){return c.status==='Closed';}).length;
  var happyCount=allCls.filter(function(c){return getClientMood(c)==='happy';}).length;
  var unhappyCount=allCls.filter(function(c){return getClientMood(c)==='unhappy';}).length;

  // ── Pagination controls ──
  var paginationHtml='';
  if(totalPages>1){
    paginationHtml='<div class="flex items-center gap-2 mt-4 justify-center flex-wrap">'+
      '<button class="btn btn-ghost btn-sm" '+(clientPage===0?'disabled style="opacity:0.4"':'')+
        ' onclick="clientPage--;renderMyClients()"><i data-lucide="chevron-left" class="w-3.5 h-3.5"></i></button>'+
      '<span class="text-xs text-slate-400 px-2">Page '+(clientPage+1)+' / '+totalPages+' &nbsp;·&nbsp; '+totalCount+' total</span>'+
      '<button class="btn btn-ghost btn-sm" '+(clientPage>=totalPages-1?'disabled style="opacity:0.4"':'')+
        ' onclick="clientPage++;renderMyClients()"><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i></button>'+
    '</div>';
  }

  m.innerHTML=
    hdr(S.role==='admin'?'All Clients':'My Clients',totalCount+' clients')+

    // ── Stats mini bar ──
    '<div class="client-stats-bar fade-in">'+
      '<div class="cs-item cs-blue"><span class="cs-num">'+newCount+'</span><span class="cs-lbl">New</span></div>'+
      '<div class="cs-item cs-purple"><span class="cs-num">'+contactedCount+'</span><span class="cs-lbl">Contacted</span></div>'+
      '<div class="cs-item cs-amber"><span class="cs-num">'+interestedCount+'</span><span class="cs-lbl">Interested</span></div>'+
      '<div class="cs-item cs-green"><span class="cs-num">'+closedCount+'</span><span class="cs-lbl">Closed</span></div>'+
      '<div class="cs-sep"></div>'+
      '<div class="cs-item cs-happy"><span class="cs-num">'+happyCount+'</span><span class="cs-lbl">😊 Happy</span></div>'+
      '<div class="cs-item cs-unhappy"><span class="cs-num">'+unhappyCount+'</span><span class="cs-lbl">😞 Unhappy</span></div>'+
    '</div>'+

    // ── Filters ──
    '<div class="flex gap-3 mb-5 flex-wrap fade-in">'+
      '<select class="input" style="max-width:220px" onchange="empClientFilter=this.value||\'\';clientPage=0;renderMyClients()">'+campOpts+'</select>'+
      '<div class="relative flex-1" style="min-width:180px;max-width:340px">'+
        '<i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"></i>'+
        '<input class="input pl-9" placeholder="Search name, phone, any field..." '+
          'value="'+esc(clientSearch)+'" '+
          'oninput="clientSearch=this.value;clientPage=0;renderMyClients()">'+
        (clientSearch?'<button class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" onclick="clientSearch=\'\';clientPage=0;renderMyClients()"><i data-lucide="x" class="w-4 h-4"></i></button>':'')+
      '</div>'+
    '</div>'+

    // ── Client cards ──
    '<div class="space-y-3 fade-in">'+
    (pageCls.length?pageCls.map(function(c){
      var isExp=expandedClientId===c.id;
      var hist=clientHistory(c.id);
      var trials=hist.length;
      var extra=c.extra_data||{};
      var camp=campById(c.campaign_id);
      var visCols=camp?getVisibleCols(camp.id):DEFAULT_COLUMNS.filter(function(x){return x.visible;});
      var displayName=getClientDisplayName(c);
      var subInfo=visCols.slice(1,3).map(function(col){return extra[col.key]||c[col.key]||'';}).filter(Boolean).join(' · ');
      var mood=getClientMood(c);

      return'<div class="card client-card '+(isExp?'border-blue-500/30':'')+'" id="card-'+c.id+'">'+

        // ── Card header (click to expand) ──
        '<div class="flex items-center justify-between" style="cursor:pointer" '+
          'onclick="expandedClientId='+(isExp?'null':'\\''+c.id+'\\'')+';smoothExpandClient(\''+c.id+'\')">'+
          '<div class="flex items-center gap-3">'+
            '<div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">'+
              '<i data-lucide="user" class="w-5 h-5"></i>'+
            '</div>'+
            '<div>'+
              '<p class="font-semibold text-white">'+esc(displayName)+'</p>'+
              '<p class="text-xs text-slate-500">'+esc(subInfo)+'</p>'+
            '</div>'+
          '</div>'+
          '<div class="flex items-center gap-2">'+
            (mood?moodBadge(mood):'')+
            (trials>0?trialsBadge(trials):'')+
            sBadge(c.status)+
            '<i data-lucide="'+(isExp?'chevron-up':'chevron-down')+'" class="w-4 h-4 text-slate-400 ml-1"></i>'+
          '</div>'+
        '</div>'+

        // ── Expanded section ──
        (isExp?renderClientExpanded(c,visCols,hist,mood):'')+'</div>';
    }).join(''):'<div class="card text-center py-12">'+
      '<p class="text-slate-500">'+(clientSearch?'No clients match "'+esc(clientSearch)+'"':'No clients assigned')+'</p>'+
    '</div>')+
    '</div>'+
    paginationHtml;

  lucide.createIcons();
}

function smoothExpandClient(cid){
  // If clicking same card, collapse; otherwise expand new one
  if(expandedClientId===cid){
    expandedClientId=null;
  } else {
    expandedClientId=cid;
  }
  renderMyClients();
}

function renderClientExpanded(c,visCols,hist,mood){
  var extra=c.extra_data||{};
  return'<div class="mt-4 pt-4 border-t border-white/5 space-y-5">'+

    // ── Data grid ──
    '<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">'+
    visCols.map(function(col){
      return'<div>'+
        '<p class="text-xs text-slate-500 mb-1">'+esc(col.label)+'</p>'+
        '<p class="text-sm text-white">'+esc(extra[col.key]||c[col.key]||'-')+'</p>'+
      '</div>';
    }).join('')+
    (S.role==='admin'?
      '<div>'+
        '<p class="text-xs text-slate-500 mb-1">Assigned To</p>'+
        '<p class="text-sm text-white">'+esc((empById(c.assigned_employee_id)||{}).name||'Unassigned')+'</p>'+
      '</div>':'')+
    '</div>'+

    // ── Mood + Status row ──
    '<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-xl" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)">'+

      // Mood
      '<div>'+
        '<p class="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wider">Mood</p>'+
        moodPicker(c.id,mood)+
      '</div>'+

      // Status + Trials
      '<div>'+
        '<div class="flex items-center justify-between mb-2">'+
          '<p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Status</p>'+
          '<div class="flex items-center gap-2">'+
            '<span class="text-xs text-slate-500">Trials:</span>'+
            trialsBadge(hist.length)+
          '</div>'+
        '</div>'+
        '<select id="status-'+c.id+'" class="input text-sm" onclick="event.stopPropagation()">'+
          CLIENT_STATUS_OPTIONS.map(function(s){
            return'<option value="'+s+'" '+(c.status===s?'selected':'')+'>'+s+'</option>';
          }).join('')+
        '</select>'+
      '</div>'+
    '</div>'+

    // ── Contact history ──
    '<div>'+
      '<div class="flex items-center justify-between mb-2">'+
        '<p class="text-xs text-slate-500 font-medium uppercase tracking-wider">Contact History</p>'+
        '<span class="text-xs text-slate-600">'+hist.length+' attempt'+(hist.length!==1?'s':'')+'</span>'+
      '</div>'+
      (hist.length?
        '<div class="space-y-2 max-h-48 overflow-y-auto pr-1">'+
        hist.map(function(h,i){
          return'<div class="p-2.5 rounded-lg" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.04)">'+
            '<div class="flex items-center justify-between mb-1">'+
              '<span class="text-xs text-slate-500">'+fmtDT(h.created_at)+'</span>'+
              '<span class="text-xs text-slate-600">Attempt #'+(hist.length-i)+'</span>'+
            '</div>'+
            '<p class="text-sm text-slate-300">'+esc(h.note)+'</p>'+
          '</div>';
        }).join('')+
        '</div>':
        '<p class="text-slate-600 text-xs">No contact history yet</p>'
      )+
    '</div>'+

    // ── Add note + Save ──
    '<div class="flex gap-2" onclick="event.stopPropagation()">'+
      '<textarea id="note-'+c.id+'" class="input flex-1" '+
        'placeholder="Add a note for this attempt..." rows="2"></textarea>'+
      '<button class="btn btn-primary self-end" onclick="saveClient(\''+c.id+'\')">'+
        '<i data-lucide="save" class="w-4 h-4"></i> Save'+
      '</button>'+
    '</div>'+

  '</div>';
}

async function saveClient(cid){
  var statusEl=document.getElementById('status-'+cid);
  var noteEl=document.getElementById('note-'+cid);
  var newStatus=statusEl?statusEl.value:null;
  var note=noteEl?noteEl.value.trim():'';

  if(!newStatus&&!note){toast('Nothing to save','info');return;}

  try{
    if(newStatus){
      var res=await sb.from('clients').update({status:newStatus}).eq('id',cid);
      if(res.error)throw res.error;

      var c=clientById(cid);
      if(c){
        var clientName=getClientDisplayName(c);
        if(S.role==='employee'){
          await notifyAdmin('status_changed',S.employee.name+' changed "'+clientName+'" status to '+newStatus);
        }
        if(S.role==='admin'&&c.assigned_employee_id){
          await notifyEmployee(c.assigned_employee_id,'status_changed','Admin changed "'+clientName+'" status to '+newStatus);
        }
      }
    }

    if(note){
      var r2=await sb.from('contact_history').insert({client_id:cid,note:note});
      if(r2.error)throw r2.error;
    }

    toast('Saved!','success');
    fetchAll().then(renderMyClients);
  }catch(e){
    toast(e.message,'error');
  }
}
