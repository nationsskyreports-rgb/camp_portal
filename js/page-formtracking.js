// ============================================================
// PAGE FORM TRACKING — who submitted the form, who didn't
// ============================================================
var ftFilter   = '';   // '' | 'submitted' | 'pending'
var ftCampaign = '';   // campaign filter

function renderFormTracking(){
  var m = document.getElementById('main-content');

  // ── filter clients ──
  var all = S.clients.slice();
  if (ftCampaign) all = all.filter(function(c){ return c.campaign_id === ftCampaign; });

  var submitted = all.filter(function(c){ return (c.extra_data||{}).form_submitted === true; });
  var pending   = all.filter(function(c){ return !(c.extra_data||{}).form_submitted; });

  var shown = ftFilter === 'submitted' ? submitted
            : ftFilter === 'pending'   ? pending
            : all;

  // ── campaign options ──
  var campOpts = '<option value="">All Campaigns</option>' +
    S.campaigns.map(function(c){
      return '<option value="'+c.id+'" '+(ftCampaign===c.id?'selected':'')+'>'+esc(c.name)+'</option>';
    }).join('');

  // ── stat card builder ──
  function statCard(label, count, color, filterVal, icon){
    var active = ftFilter === filterVal;
    return '<div class="card text-center cursor-pointer card-hover" '+
      'style="'+(active?'border-color:'+color+';box-shadow:0 0 0 1px '+color:'')+'" '+
      'onclick="ftFilter=ftFilter===\''+filterVal+'\'?\'\':\''+filterVal+'\';renderFormTracking()">'+
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px">'+
        '<i data-lucide="'+icon+'" style="width:16px;height:16px;color:'+color+'"></i>'+
        '<p class="text-slate-400 text-xs">'+label+'</p>'+
      '</div>'+
      '<p class="text-3xl font-bold" style="color:'+color+'">'+count+'</p>'+
      (all.length?'<p class="text-xs text-slate-500 mt-1">'+Math.round(count/all.length*100)+'%</p>':'')+
    '</div>';
  }

  m.innerHTML = hdr('Form Tracking','Client form submission status',
      '<button class="btn btn-primary btn-sm" onclick="exportFormTracking()"><i data-lucide="download" class="w-4 h-4"></i> Export Excel</button>')+

    // ── Stat Cards ──
    '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 fade-in">'+
      statCard('Total Clients', all.length, '#3b82f6', '', 'users')+
      statCard('Form Submitted', submitted.length, '#10b981', 'submitted', 'check-circle')+
      statCard('Not Submitted', pending.length, '#ef4444', 'pending', 'clock')+
    '</div>'+

    // ── Campaign Filter ──
    '<div class="card mb-4 fade-in" style="padding:.75rem 1rem">'+
      '<div class="flex items-center gap-3 flex-wrap">'+
        '<span class="text-xs text-slate-400">Campaign:</span>'+
        '<select class="input" style="max-width:240px" onchange="ftCampaign=this.value;renderFormTracking()">'+campOpts+'</select>'+
        (ftFilter?'<span class="badge badge-active" style="font-size:11px">'+
          (ftFilter==='submitted'?'Showing: Form Submitted':'Showing: Not Submitted')+
          ' <span style="cursor:pointer;margin-right:4px" onclick="ftFilter=\'\';renderFormTracking()">✕</span></span>':'')+
      '</div>'+
    '</div>'+

    // ── Clients Table ──
    '<div class="card fade-in">'+
      '<h3 class="text-sm font-bold text-white mb-4">Clients ('+shown.length+')</h3>'+
      (shown.length ? '<div class="tbl-wrap"><table class="w-full text-sm">'+
        '<thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Client Name</th>'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Mobile</th>'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Project</th>'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Unit</th>'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Campaign</th>'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Assigned To</th>'+
          '<th class="pb-3 pr-4 whitespace-nowrap">Form Status</th>'+
          '<th class="pb-3 whitespace-nowrap">Submitted At</th>'+
        '</tr></thead><tbody>'+
        shown.map(function(c){
          var extra = c.extra_data||{};
          var e     = empById(c.assigned_employee_id);
          var camp  = campById(c.campaign_id);
          var isSubmitted = extra.form_submitted === true;
          var submittedAt = extra.form_submitted_at
            ? new Date(extra.form_submitted_at).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})
            : '-';
          return '<tr class="table-row border-b border-white/[0.03] cursor-pointer" '+
            (isSubmitted?'onclick="showFormResponse(\''+c.id+'\')"':'')+'>'+
            '<td class="py-3 pr-4 text-slate-300">'+esc(c.name||extra.name||'-')+'</td>'+
            '<td class="py-3 pr-4 text-slate-300">'+esc(c.phone||'-')+'</td>'+
            '<td class="py-3 pr-4 text-slate-400">'+esc(extra.project||'-')+'</td>'+
            '<td class="py-3 pr-4 text-slate-400" style="max-width:160px"><span style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="'+esc(extra.unit||'')+'">'+esc(extra.unit||'-')+'</span></td>'+
            '<td class="py-3 pr-4 text-slate-400">'+esc(camp?camp.name:'-')+'</td>'+
            '<td class="py-3 pr-4">'+(e?av(e.name,e.color||'#3b82f6',20)+'<span class="text-xs text-slate-300 ml-1">'+esc(e.name)+'</span>':'<span class="text-slate-500 text-xs">Unassigned</span>')+'</td>'+
            '<td class="py-3 pr-4">'+(isSubmitted
              ? '<span class="badge" style="background:rgba(16,185,129,.12);color:#6ee7b7;font-size:11px">✓ Submitted</span>'
              : '<span class="badge" style="background:rgba(239,68,68,.1);color:#fca5a5;font-size:11px">Pending</span>')+'</td>'+
            '<td class="py-3 text-slate-400 text-xs">'+submittedAt+'</td>'+
          '</tr>';
        }).join('')+
      '</tbody></table></div>'
      : '<p class="text-slate-500 text-sm">No clients</p>')+
    '</div>';

  lucide.createIcons();
}

// ── Export to Excel ──────────────────────────────────────────
function exportFormTracking(){
  var all = S.clients.slice();
  if (ftCampaign) all = all.filter(function(c){ return c.campaign_id === ftCampaign; });

  var shown = ftFilter === 'submitted' ? all.filter(function(c){ return (c.extra_data||{}).form_submitted === true; })
            : ftFilter === 'pending'   ? all.filter(function(c){ return !(c.extra_data||{}).form_submitted; })
            : all;

  if (!shown.length){ toast('No data to export','error'); return; }

  var rows = shown.map(function(c){
    var extra = c.extra_data||{};
    var e     = empById(c.assigned_employee_id);
    var camp  = campById(c.campaign_id);
    return {
      'Client Name'      : c.name || extra.name || '',
      'Mobile'           : c.phone || '',
      'Mobile 2'         : extra.phone2 || extra.phone_2 || '',
      'Email'            : extra.email || '',
      'Email 2'          : extra.email2 || '',
      'Project'          : extra.project || '',
      'Unit'             : extra.unit || '',
      'Contract Number'  : extra.contract_number || '',
      'Campaign'         : camp ? camp.name : '',
      'Assigned To'      : e ? e.name : '',
      'Form Status'      : extra.form_submitted ? 'Submitted' : 'Pending',
      'Submitted At'     : extra.form_submitted_at || '',
      'Preferred Channel': extra.preferred_channel || '',
      'Old Phone'        : extra.old_phone || '',
      'Notes'            : extra.notes || ''
    };
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  // auto column width
  var colWidths = Object.keys(rows[0]).map(function(k){
    var maxLen = Math.max(k.length, ...rows.map(function(r){ return String(r[k]||'').length; }));
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  var wb = XLSX.utils.book_new();
  var sheetName = ftFilter === 'submitted' ? 'Form Submitted'
                : ftFilter === 'pending'   ? 'Not Submitted'
                : 'All Clients';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  var fname = 'Form_Tracking_' + new Date().toISOString().slice(0,10) + '.xlsx';
  XLSX.writeFile(wb, fname);
  toast('Exported ' + shown.length + ' clients ✓','success');
}
