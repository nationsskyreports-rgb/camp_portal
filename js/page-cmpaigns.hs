// ============================================================
// PAGE CAMPAIGNS — Campaign Management
// ============================================================

var CAMP_TYPES   = ['Real Estate', 'Insurance', 'Telecom', 'Banking', 'Services', 'Other'];
var CAMP_STATUSES = ['Active', 'Paused', 'Ended'];

function renderCampaigns() {
  var m = document.getElementById('main-content');

  var html = hdr(
    'Campaigns',
    S.campaigns.length + ' campaigns',
    '<button class="btn btn-primary" onclick="showCampForm=true;selectedCampId=null;renderCampaigns()">' +
      '<i data-lucide="plus" class="w-4 h-4"></i> New Campaign' +
    '</button>'
  );

  // ── Add / Edit form ──
  if (showCampForm) {
    var editing = selectedCampId
      ? S.campaigns.find(function(c) { return c.id === selectedCampId; })
      : null;

    html +=
      '<div class="card mb-6 fade-in border-blue-500/20">' +
        '<h3 class="text-sm font-bold text-white mb-4">' + (editing ? 'Edit' : 'New') + ' Campaign</h3>' +
        '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4">' +
          '<div>' +
            '<label class="text-xs text-slate-400 mb-1 block">Name *</label>' +
            '<input id="cn" class="input" placeholder="Campaign name" value="' + esc(editing ? editing.name : '') + '">' +
          '</div>' +
          '<div>' +
            '<label class="text-xs text-slate-400 mb-1 block">Type</label>' +
            '<select id="ct" class="input">' +
              CAMP_TYPES.map(function(t) {
                return '<option value="' + t + '" ' + (editing && editing.type === t ? 'selected' : '') + '>' + t + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
          '<div>' +
            '<label class="text-xs text-slate-400 mb-1 block">Status</label>' +
            '<select id="cs" class="input">' +
              CAMP_STATUSES.map(function(s) {
                return '<option value="' + s + '" ' + (editing && editing.status === s ? 'selected' : '') + '>' + s + '</option>';
              }).join('') +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="flex gap-2 mt-4">' +
          '<button class="btn btn-primary" onclick="saveCampaign()">' + (editing ? 'Update' : 'Create') + '</button>' +
          '<button class="btn btn-ghost" onclick="showCampForm=false;selectedCampId=null;renderCampaigns()">Cancel</button>' +
        '</div>' +
      '</div>';
  }

  // ── Empty state ──
  if (!S.campaigns.length) {
    html +=
      '<div class="card text-center py-16 fade-in">' +
        '<div class="w-14 h-14 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">' +
          '<i data-lucide="target" class="w-7 h-7 text-slate-600"></i>' +
        '</div>' +
        '<p class="text-slate-400 font-medium">No campaigns yet</p>' +
        '<p class="text-slate-600 text-sm mt-1">Click "New Campaign" to get started</p>' +
      '</div>';

    m.innerHTML = html;
    lucide.createIcons();
    return;
  }

  // ── Campaign cards ──
  html += '<div class="space-y-4 fade-in">';

  S.campaigns.forEach(function(camp) {
    var clients     = S.clients.filter(function(c) { return c.campaign_id === camp.id; });
    var newCount    = clients.filter(function(c) { return c.status === 'New'; }).length;
    var contacted   = clients.filter(function(c) { return c.status === 'Contacted'; }).length;
    var interested  = clients.filter(function(c) { return c.status === 'Interested'; }).length;
    var closed      = clients.filter(function(c) { return c.status === 'Closed'; }).length;
    var inProgress  = contacted + interested;
    var convRate    = clients.length ? Math.round((closed / clients.length) * 100) : 0;
    var convColor   = convRate >= 20 ? 'text-emerald-400' : convRate >= 10 ? 'text-amber-400' : 'text-slate-400';

    // Agents assigned to this campaign
    var agentIds = {};
    clients.forEach(function(c) { if (c.assigned_employee_id) agentIds[c.assigned_employee_id] = true; });
    var campAgents = S.employees.filter(function(e) { return agentIds[e.id]; });

    html +=
      '<div class="card fade-in">' +

        // ── Card header ──
        '<div class="flex items-start justify-between gap-3 mb-5" style="flex-wrap:wrap">' +
          '<div class="flex items-center gap-3">' +
            '<div class="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">' +
              '<i data-lucide="target" class="w-5 h-5 text-blue-400"></i>' +
            '</div>' +
            '<div>' +
              '<p class="font-bold text-white text-base">' + esc(camp.name) + '</p>' +
              '<p class="text-xs text-slate-500">' + esc(camp.type || 'General') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex items-center gap-2" style="flex-wrap:wrap">' +
            sBadge(camp.status) +
            '<button class="btn btn-ghost btn-sm" onclick="editCampaign(\'' + camp.id + '\')" title="Edit">' +
              '<i data-lucide="pencil" class="w-3.5 h-3.5"></i>' +
            '</button>' +
            '<button class="btn btn-ghost btn-sm" onclick="openColConfig(\'' + camp.id + '\')" title="Configure Columns">' +
              '<i data-lucide="columns" class="w-3.5 h-3.5"></i>' +
            '</button>' +
            '<button class="btn btn-danger btn-sm" onclick="deleteCampaign(\'' + camp.id + '\',\'' + esc(camp.name).replace(/'/g, '') + '\')" title="Delete">' +
              '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>' +
            '</button>' +
          '</div>' +
        '</div>' +

        // ── Stats grid ──
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;margin-bottom:16px">' +
          statCell(clients.length, 'Total', 'text-white') +
          statCell(newCount,    'New',        'text-blue-400') +
          statCell(inProgress,  'In Progress','text-violet-400') +
          statCell(closed,      'Closed',     'text-emerald-400') +
          statCell(convRate + '%', 'Conv.', convColor) +
          statCell(campAgents.length, 'Agents', 'text-white') +
        '</div>' +

        // ── Funnel bar ──
        (clients.length > 0 ?
          '<div class="mb-4">' +
            '<div class="flex h-2 rounded-full overflow-hidden bg-white/5">' +
              funnelBar(newCount,   clients.length, '#3b82f6') +
              funnelBar(inProgress, clients.length, '#8b5cf6') +
              funnelBar(closed,     clients.length, '#10b981') +
            '</div>' +
            '<div class="flex gap-4 mt-1.5">' +
              '<span class="text-[10px] text-slate-500"><span style="color:#3b82f6">■</span> New</span>' +
              '<span class="text-[10px] text-slate-500"><span style="color:#8b5cf6">■</span> In Progress</span>' +
              '<span class="text-[10px] text-slate-500"><span style="color:#10b981">■</span> Closed</span>' +
            '</div>' +
          '</div>' : '') +

        // ── Agents row ──
        (campAgents.length ?
          '<div class="flex flex-wrap gap-2">' +
          campAgents.slice(0, 10).map(function(e) {
            var cnt = clients.filter(function(c) { return c.assigned_employee_id === e.id; }).length;
            return '<div class="flex items-center gap-1.5 px-2 py-1 rounded-lg" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06)">' +
              av(e.name, e.color || '#3b82f6', 20) +
              '<span class="text-xs text-slate-400">' + esc(e.name) + '</span>' +
              '<span class="text-xs font-bold text-white ml-1">' + cnt + '</span>' +
              (e.is_active ? pDot(true) : '') +
            '</div>';
          }).join('') +
          (campAgents.length > 10 ?
            '<span class="text-xs text-slate-500 self-center">+' + (campAgents.length - 10) + ' more</span>' : '') +
          '</div>' : '') +

      '</div>';
  });

  html += '</div>';
  m.innerHTML = html;
  lucide.createIcons();
}

// ── Helpers for campaign card ──
function statCell(val, label, colorCls) {
  return '<div class="p-3 rounded-xl text-center" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05)">' +
    '<p class="text-xl font-bold ' + colorCls + '">' + val + '</p>' +
    '<p class="text-[11px] text-slate-500 mt-0.5">' + label + '</p>' +
  '</div>';
}

function funnelBar(count, total, color) {
  if (!total || !count) return '';
  return '<div style="width:' + (count / total * 100) + '%;background:' + color + ';opacity:0.7"></div>';
}

// ── Edit ──
function editCampaign(id) {
  selectedCampId = id;
  showCampForm   = true;
  document.getElementById('main-content').scrollTop = 0;
  renderCampaigns();
}

// ── Save (create / update) ──
function saveCampaign() {
  var name   = document.getElementById('cn').value.trim();
  var type   = document.getElementById('ct').value;
  var status = document.getElementById('cs').value;
  if (!name) { toast('Campaign name is required', 'error'); return; }

  var payload = { name: name, type: type, status: status };

  if (selectedCampId) {
    sb.from('campaigns').update(payload).eq('id', selectedCampId)
      .then(function(r) {
        if (r.error) { toast(r.error.message, 'error'); return; }
        toast('Campaign updated');
        showCampForm = false; selectedCampId = null;
        fetchAll().then(renderCampaigns);
      })
      .catch(function(e) { toast(e.message, 'error'); });
  } else {
    sb.from('campaigns').insert(payload)
      .then(function(r) {
        if (r.error) { toast(r.error.message, 'error'); return; }
        toast('Campaign created');
        showCampForm = false; selectedCampId = null;
        fetchAll().then(renderCampaigns);
      })
      .catch(function(e) { toast(e.message, 'error'); });
  }
}

// ── Delete ──
function deleteCampaign(id, name) {
  showConfirm(
    'Delete Campaign',
    'Delete "' + name + '"? All clients in this campaign will also be deleted. This cannot be undone.',
    function() {
      sb.from('clients').delete().eq('campaign_id', id)
        .then(function() { return sb.from('campaigns').delete().eq('id', id); })
        .then(function() {
          toast('Campaign deleted');
          fetchAll().then(renderCampaigns);
        })
        .catch(function(e) { toast(e.message, 'error'); });
    },
    'Delete Campaign',
    'btn-danger'
  );
}
