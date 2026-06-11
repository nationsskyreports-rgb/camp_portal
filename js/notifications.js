// ============================================================
// NOTIFICATIONS — Central notification sender
// ============================================================

async function notifyEmployee(employeeId, type, message){
  // Guard: skip if employee ID is missing
  if(!employeeId) return;
  try{
    var res = await sb.from('notifications').insert({
      employee_id : employeeId,
      type        : type    || 'new_clients',
      message     : message || '',
      read        : false
    });
    if(res.error) console.warn('notifyEmployee:', res.error.message);
  }catch(e){ console.warn('notifyEmployee error:', e); }
}

async function notifyAdmin(type, message){
  // Uses null employee_id — requires column to allow nulls
  // ALTER TABLE notifications ALTER COLUMN employee_id DROP NOT NULL;
  try{
    var res = await sb.from('notifications').insert({
      employee_id : null,
      type        : type    || 'info',
      message     : message || '',
      read        : false
    });
    if(res.error) console.warn('notifyAdmin:', res.error.message);
  }catch(e){ console.warn('notifyAdmin error:', e); }
}

function notifMeta(type){
  var map = {
    'new_clients'       : { icon:'📋', color:'bg-blue-500/10'    },
    'question_answered' : { icon:'💬', color:'bg-emerald-500/10' },
    'status_changed'    : { icon:'🔄', color:'bg-amber-500/10'   },
    'new_question'      : { icon:'❓', color:'bg-violet-500/10'  },
    'employee_active'   : { icon:'👤', color:'bg-slate-500/10'   },
    'data_updated'      : { icon:'📊', color:'bg-blue-500/10'    },
  };
  return map[type] || { icon:'🔔', color:'bg-slate-500/10' };
}
