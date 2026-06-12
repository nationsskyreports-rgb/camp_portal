// ============================================================
// NOTIFICATIONS — Central sender + type definitions
// ============================================================

// ── Send to specific employee ─────────────────────────────────
async function notifyEmployee(employeeId, type, message){
  if(!employeeId){ console.warn('notifyEmployee: missing employeeId'); return; }
  try{
    var res = await sb.from('notifications').insert({
      employee_id : employeeId,
      type        : type    || 'info',
      message     : message || '',
      read        : false
    });
    if(res.error) console.warn('notifyEmployee error:', res.error.message);
  }catch(e){ console.warn('notifyEmployee catch:', e); }
}

// ── Send to admin (employee_id = null) ───────────────────────
// Requires: ALTER TABLE notifications ALTER COLUMN employee_id DROP NOT NULL
async function notifyAdmin(type, message){
  try{
    var res = await sb.from('notifications').insert({
      employee_id : null,
      type        : type    || 'info',
      message     : message || '',
      read        : false
    });
    if(res.error) console.warn('notifyAdmin error:', res.error.message);
  }catch(e){ console.warn('notifyAdmin catch:', e); }
}

// ── Check due follow-ups on load → send notification ─────────
function checkDueFollowups(){
  if(S.role !== 'employee' || !S.reminders) return;
  var now = Date.now();
  var due = S.reminders.filter(function(r){
    return !r.done &&
           new Date(r.remind_at).getTime() <= now &&
           !r._notified; // avoid duplicate toasts in same session
  });
  due.forEach(function(r){
    r._notified = true;
    var c = clientById(r.client_id);
    var name = c ? (c.name || (c.extra_data||{}).customer || '') : '';
    var msg = 'Follow-up due' + (name ? ': ' + name : '') + (r.note ? ' — ' + r.note : '');
    toast('⏰ ' + msg, 'info');
    // Save to DB so it appears in the Notifications page
    notifyEmployee(S.employee.id, 'followup_due', msg);
    updateNotifBadge();
  });
}

// ── Type metadata ─────────────────────────────────────────────
function notifMeta(type){
  var map = {
    'new_clients'       : { icon:'📋', label:'New Clients',       color:'bg-blue-500/10'    },
    'question_answered' : { icon:'💬', label:'Question Answered', color:'bg-emerald-500/10' },
    'status_changed'    : { icon:'🔄', label:'Status Changed',    color:'bg-amber-500/10'   },
    'new_question'      : { icon:'❓', label:'New Question',      color:'bg-violet-500/10'  },
    'employee_active'   : { icon:'👤', label:'Team',              color:'bg-slate-500/10'   },
    'data_updated'      : { icon:'📊', label:'Data Updated',      color:'bg-blue-500/10'    },
    'form_submitted'    : { icon:'📝', label:'Form Submitted',    color:'bg-teal-500/10'    },
    'followup_due'      : { icon:'⏰', label:'Follow-up Due',     color:'bg-red-500/10'     },
    'client_assigned'   : { icon:'👤', label:'Client Assigned',   color:'bg-purple-500/10'  },
  };
  return map[type] || { icon:'🔔', label:'Notification', color:'bg-slate-500/10' };
}
