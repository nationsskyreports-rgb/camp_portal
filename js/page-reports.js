// ============================================================
// PAGE REPORTS
// ============================================================
// ── REPORTS ──
function renderReports(){
  var m=document.getElementById('main-content');
  var data=S.clients.slice();
  if(rptFilter.campaign)data=data.filter(function(c){return c.campaign_id===rptFilter.campaign;});
  if(rptFilter.employee)data=data.filter(function(c){return c.assigned_employee_id===rptFilter.employee;});
  if(rptFilter.status)data=data.filter(function(c){return c.status===rptFilter.status;});
  if(rptFilter.dateFrom)data=data.filter(function(c){return c.created_at>=rptFilter.dateFrom;});
  if(rptFilter.dateTo)data=data.filter(function(c){return c.created_at<=rptFilter.dateTo+'T23:59:59';});
  var totalPages=Math.ceil(data.length/RPT_PAGE_SIZE)||1;
  if(rptFilter.page>=totalPages)rptFilter.page=0;
  var pageData=data.slice(rptFilter.page*RPT_PAGE_SIZE,(rptFilter.page+1)*RPT_PAGE_SIZE);
  var visCols=rptFilter.campaign?getVisibleCols(rptFilter.campaign):DEFAULT_COLUMNS.filter(function(c){return c.visible;});
  m.innerHTML=hdr('Reports & Export','Filter and export client data')+
  '<div class="card mb-6 fade-in"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">'+
  '<select class="input" onchange="rptFilter.campaign=this.value;rptFilter.page=0;renderReports()"><option value="">All Campaigns</option>'+S.campaigns.map(function(c){return'<option value="'+c.id+'" '+(rptFilter.campaign===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select>'+
  '<select class="input" onchange="rptFilter.employee=this.value;rptFilter.page=0;renderReports()"><option value="">All Employees</option>'+S.employees.map(function(e){return'<option value="'+e.id+'" '+(rptFilter.employee===e.id?'selected':'')+'>'+esc(e.name)+'</option>';}).join('')+'</select>'+
  '<select class="input" onchange="rptFilter.status=this.value;rptFilter.page=0;renderReports()"><option value="">All Status</option>'+['New','Contacted','Interested','Closed'].map(function(s){return'<option value="'+s+'" '+(rptFilter.status===s?'selected':'')+'>'+s+'</option>';}).join('')+'</select>'+
  '<input type="date" class="input" value="'+rptFilter.dateFrom+'" onchange="rptFilter.dateFrom=this.value;rptFilter.page=0;renderReports()">'+
  '<input type="date" class="input" value="'+rptFilter.dateTo+'" onchange="rptFilter.dateTo=this.value;rptFilter.page=0;renderReports()">'+
  '</div></div>'+
  '<div class="flex gap-2 mb-6 fade-in flex-wrap">'+
  '<button class="btn btn-primary btn-sm" onclick="exportClientsCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Export Clients</button>'+
  '<button class="btn btn-primary btn-sm" onclick="exportQaCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Export Q&A</button>'+
  '<button class="btn btn-primary btn-sm" onclick="exportCampSummaryCSV()"><i data-lucide="download" class="w-3.5 h-3.5"></i> Export Campaigns</button>'+
  '</div>'+
  '<div class="card fade-in"><div class="flex items-center justify-between mb-4 flex-wrap gap-2">'+
  '<h3 class="text-sm font-bold text-white">Results</h3>'+
  '<div class="flex items-center gap-3"><span class="text-xs text-slate-400">'+data.length+' total · Page '+(rptFilter.page+1)+'/'+totalPages+'</span>'+
  '<div class="flex gap-1">'+
  '<button class="btn btn-ghost btn-sm" '+(rptFilter.page===0?'disabled style="opacity:0.4"':'')+' onclick="rptFilter.page--;renderReports()"><i data-lucide="chevron-left" class="w-3.5 h-3.5"></i></button>'+
  '<button class="btn btn-ghost btn-sm" '+(rptFilter.page>=totalPages-1?'disabled style="opacity:0.4"':'')+' onclick="rptFilter.page++;renderReports()"><i data-lucide="chevron-right" class="w-3.5 h-3.5"></i></button>'+
  '</div></div></div>'+
  (pageData.length?'<div class="tbl-wrap"><table class="w-full text-sm"><thead><tr class="text-left text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">'+
  visCols.map(function(c){return'<th class="pb-3 pr-4">'+esc(c.label)+'</th>';}).join('')+
  '<th class="pb-3 pr-4">Employee</th><th class="pb-3">Status</th></tr></thead><tbody>'+
  pageData.map(function(c){var ep=empById(c.assigned_employee_id);var extra=c.extra_data||{};
    return'<tr class="table-row border-b border-white/[0.03]">'+visCols.map(function(col){return'<td class="py-2.5 pr-4 text-slate-300 text-xs">'+esc(extra[col.key]||c[col.key]||'-')+'</td>';}).join('')+
    '<td class="py-2.5 pr-4 text-xs text-slate-400">'+esc(ep?ep.name:'')+'</td>'+
    '<td class="py-2.5">'+sBadge(c.status)+'</td></tr>';}).join('')+'</tbody></table></div>':
  '<p class="text-slate-500 text-sm text-center py-6">No results</p>')+'</div>';
  lucide.createIcons();
}
function exportClientsCSV(){var visCols=rptFilter.campaign?getVisibleCols(rptFilter.campaign):DEFAULT_COLUMNS.filter(function(c){return c.visible;});csvExport('clients.csv',visCols.map(function(c){return c.label;}).concat(['Employee','Status']),S.clients.map(function(c){var ep=empById(c.assigned_employee_id);var extra=c.extra_data||{};return visCols.map(function(col){return extra[col.key]||c[col.key]||'';}).concat([ep?ep.name:'',c.status]);}));toast('Exported');}
function exportQaCSV(){csvExport('qa.csv',['Employee','Question','Status','Reply','Date'],S.questions.map(function(q){return[q.employee_name||'',q.question_text,q.status,q.admin_reply||'',q.created_at];}));toast('Exported');}
function exportCampSummaryCSV(){csvExport('campaigns.csv',['Campaign','Type','Status','Clients','New','Contacted','Closed'],S.campaigns.map(function(c){var cc=S.clients.filter(function(cl){return cl.campaign_id===c.id;});return[c.name,c.type,c.status,cc.length,cc.filter(function(x){return x.status==='New';}).length,cc.filter(function(x){return x.status==='Contacted';}).length,cc.filter(function(x){return x.status==='Closed';}).length];}));toast('Exported');}
