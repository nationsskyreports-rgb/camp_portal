// ============================================================
// AUDIT LOG — central logging helper
// ============================================================
function logAudit(action, entityType, entityId, entityName, details){
  try{
    var actorName = S.role==='admin' ? 'Admin' : (S.employee ? S.employee.name : 'Unknown');
    sb.from('audit_log').insert({
      actor_name  : actorName,
      actor_role  : S.role || 'unknown',
      action      : action,
      entity_type : entityType,
      entity_id   : entityId  || null,
      entity_name : entityName|| '',
      details     : details   || {}
    }).then(function(){});
  }catch(e){}
}
