// ============================================================
// NOTIFICATIONS — Central notification sender
// ============================================================

/**
 * Send notification to a specific employee
 */
async function notifyEmployee(employeeId, type, message){
  try{
    await sb.from('notifications').insert({
      employee_id: employeeId,
      type: type,
      message: message,
      read: false
    });
  }catch(e){ console.error('notifyEmployee error:', e); }
}

/**
 * Send notification to admin (employee_id = null)
 */
async function notifyAdmin(type, message){
  try{
    await sb.from('notifications').insert({
      employee_id: null,
      type: type,
      message: message,
      read: false
    });
  }catch(e){ console.error('notifyAdmin error:', e); }
}

/**
 * Notification types:
 * - new_clients       → Employee got new clients
 * - question_answered → Employee's question was answered
 * - status_changed    → Client status changed
 * - new_question      → Admin: employee sent a question
 * - employee_active   → Admin: employee went online/offline
 */

// ── Icons and labels for each type ──
function notifMeta(type){
  var map = {
    'new_clients':       { icon:'📋', color:'bg-blue-500/10' },
    'question_answered': { icon:'💬', color:'bg-emerald-500/10' },
    'status_changed':    { icon:'🔄', color:'bg-amber-500/10' },
    'new_question':      { icon:'❓', color:'bg-violet-500/10' },
    'employee_active':   { icon:'👤', color:'bg-slate-500/10' },
    'data_updated':      { icon:'📊', color:'bg-blue-500/10' },
  };
  return map[type] || { icon:'🔔', color:'bg-slate-500/10' };
}
