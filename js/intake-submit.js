/* ══════════════════════════════════════════════════════════════
   intake-submit.js
   ─────────────────
   Form validation & submission, existing-record update,
   least-loaded employee assignment, and app initialization.
   
   Depends on: ALL other intake-*.js files
   
   EDIT HERE when you need to:
   - Add/remove required fields         → submitForm() validation
   - Change what data gets sent         → extraData object in submitForm()
   - Change the record structure        → record object in submitForm()
   - Change employee assignment logic   → getLeastLoadedEmployee()
   ══════════════════════════════════════════════════════════════ */

function submitForm() {
  if (isSubmitting) return;
  var t = T[currentLang];
  clearErrors(); hideBanner();

  var name     = val('inp-name');
  var phone    = val('inp-phone');
  var newPhone = val('inp-new-phone');
  var phone2   = val('inp-phone2');
  var email    = val('inp-email');
  var email2   = val('inp-email2');
  var valid    = true;

  if (!name && !matchedClients.length)      { setErr('field-name');      valid = false; }
  if (!isValidPhone(phone))                { setErr('field-phone');     valid = false; }
  if (newPhone && !isValidPhone(newPhone)) { setErr('field-new-phone'); valid = false; }
  if (phone2 && !isValidPhone(phone2))     { setErr('field-phone2');    valid = false; }
  if (!isValidEmail(email))                { setErr('field-email');     valid = false; }
  if (email2 && !isValidEmail(email2))     { setErr('field-email2');    valid = false; }

  // ── Phone must be registered ──
  if (isValidPhone(phone) && !phoneLookupDone) {
    showBanner(currentLang === 'ar' ? 'جاري التحقق من رقمك...' : 'Verifying your number...');
    sbRpc('lookup_client_by_phone', { p_campaign_id: campaignId, p_phone: normalizePhone(phone) })
      .then(function(clients) {
        matchedClients  = clients || [];
        phoneLookupDone = true;
        var panel  = document.getElementById('phone-lookup-panel');
        var notice = document.getElementById('phone-notfound-notice');
        if (matchedClients.length) {
          phoneNotFound = false;
          renderLookupUnits();
          if (panel)  panel.style.display = 'block';
          if (notice) notice.classList.remove('show');
        } else {
          phoneNotFound = true;
          if (panel)  panel.style.display = 'none';
          if (notice) { notice.textContent = T[currentLang].errPhoneBlocked; notice.classList.add('show'); }
          matchedClients = []; selectedIds = [];
        }
        hideBanner();
        submitForm();
      }).catch(function() { phoneLookupDone = true; hideBanner(); });
    return;
  }
  if (phoneLookupDone && phoneNotFound) {
    showBanner(t.errNotFound);
    setErr('field-phone');
    valid = false;
  }

  // ── Sons/Children fields ──
  if (!kidaValue)       { setErr('field-kida');      valid = false; }
  if (kidaValue === 'yes') {
    if (!val('inp-kids-count')) { setErr('field-kids-count'); valid = false; }
  }

  if (!getHobbiesVal('hobbies')) { setErr('field-hobbies');   valid = false; }
  if (!val('inp-job-title'))     { setErr('field-job-title'); valid = false; }

  var privacy = document.getElementById('inp-privacy').checked;
  if (!privacy) { showBanner(t.errPrivacy); valid = false; }

  if (!valid) return;

  // ── Rate Limiting ──
  var now = Date.now();
  if (lastSubmitTime && (now - lastSubmitTime) < RATE_LIMIT_MS) {
    var secsLeft = Math.ceil((RATE_LIMIT_MS - (now - lastSubmitTime)) / 1000);
    showBanner(
      currentLang === 'ar'
        ? 'يرجى الانتظار ' + secsLeft + ' ثانية قبل الإرسال مرة أخرى.'
        : 'Please wait ' + secsLeft + ' seconds before submitting again.'
    );
    return;
  }

  var finalPhone  = newPhone || phone;
  var storedPhone = normalizePhone(finalPhone);
  var phoneKey    = campaignId + '_' + storedPhone;

  // ── Build extra_data payload ──
  var extraData = { name: name, phone: finalPhone };
  if (newPhone) extraData.old_phone = phone;
  if (phone2)   extraData.phone2    = phone2;
  if (email)    extraData.email     = email;
  if (email2)   extraData.email2    = email2;

  // Children data
  extraData.has_children = kidaValue;
  if (kidaValue === 'yes') {
    extraData.children_count = val('inp-kids-count');
    var childrenArr = [];
    var count = getKidsCount();
    for (var ci = 0; ci < count; ci++) {
      childrenArr.push({
        name:  kidsNamesData[ci]   || '',
        age:   kidsAgesData[ci]    || '',
        hobby: kidsTalentsData[ci] || ''
      });
    }
    extraData.children = childrenArr;
    // Keep flat strings for backward compatibility
    extraData.children_details = getKidNamesString();
    extraData.children_ages    = kidsAgesData.filter(Boolean).join(', ');
    extraData.children_hobbies = kidsTalentsData.filter(Boolean).join(', ');
  }

  extraData.hobbies   = getHobbiesVal('hobbies');
  extraData.job_title = val('inp-job-title');

  document.querySelectorAll('[data-col-key]').forEach(function(inp) {
    if (inp.value.trim()) extraData[inp.getAttribute('data-col-key')] = inp.value.trim();
  });

  var notesVal = val('inp-notes');
  if (notesVal) extraData.notes = notesVal;

  var channels = [];
  ['ch-call','ch-wa','ch-email','ch-sms'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.checked) channels.push(el.value);
  });
  if (channels.length) extraData.preferred_channel = channels.join(', ');

  // ── UPDATE existing clients ──
  if (selectedIds.length > 0 && matchedClients.length > 0) {
    doUpdateExisting(extraData, t);
    return;
  }

  // ── Anti-Duplicate ──
  if (submittedPhones[phoneKey]) {
    showBanner(
      currentLang === 'ar'
        ? 'هذا الرقم مسجّل بالفعل. سيتواصل معك فريقنا قريباً.'
        : 'This number is already registered. Our team will contact you shortly.'
    );
    return;
  }

  isSubmitting = true;
  setBtnLoading(true, 'btn-submit', 'btn-label', 'btn-progress', t.btnSending);

  sbGet('clients', 'phone=eq.' + encodeURIComponent(storedPhone) + '&campaign_id=eq.' + campaignId + '&select=id&limit=1')
    .then(function(existing) {
      if (existing && existing.length) {
        submittedPhones[phoneKey] = true;
        isSubmitting = false;
        setBtnLoading(false, 'btn-submit', 'btn-label', 'btn-progress', t.btnSubmit);
        showBanner(
          currentLang === 'ar'
            ? 'هذا الرقم مسجّل بالفعل في هذه الحملة. سيتواصل معك فريقنا قريباً.'
            : 'This number is already registered in this campaign. Our team will contact you shortly.'
        );
        return Promise.reject('duplicate');
      }
      return getLeastLoadedEmployee();
    })
    .then(function(employee) {
      var record = {
        name                 : name,
        phone                : storedPhone,
        extra_data           : extraData,
        status               : 'New',
        campaign_id          : campaignId,
        assigned_employee_id : employee ? employee.id : null
      };
      return sbInsert('clients', record).then(function() {
        if (employee) {
          sbInsert('notifications', {
            employee_id : employee.id,
            type        : 'new_clients',
            message     : '📋 New lead from form: ' + name + (phone ? ' · ' + phone : ''),
            read        : false
          }).catch(function(){});
        }
      });
    })
    .then(function() {
      lastSubmitTime            = Date.now();
      submittedPhones[phoneKey] = true;
      clearDraft();
      document.getElementById('success-title').textContent = t.successTitle;
      document.getElementById('success-msg').textContent   = t.successMsg;
      showState('success');
    })
    .catch(function(err) {
      if (err === 'duplicate') return;
      isSubmitting = false;
      setBtnLoading(false, 'btn-submit', 'btn-label', 'btn-progress', t.btnSubmit);
      showBanner(err && err.message ? err.message : t.errGeneral);
    });
}


/* ── UPDATE existing records ──────────────────────────────────── */
function doUpdateExisting(extraData, t) {
  var updates = selectedIds.map(function(id) {
    var client     = matchedClients.find(function(c) { return c.id === id; });
    var existExtra = (client && client.extra_data) || {};
    var merged     = Object.assign({}, existExtra, extraData, {
      form_submitted    : true,
      form_submitted_at : new Date().toISOString()
    });
    return sbPatch('clients', 'id=eq.' + id, { extra_data: merged });
  });

  Promise.all(updates)
    .then(function() {
      var empIds = {};
      selectedIds.forEach(function(id) {
        var client = matchedClients.find(function(c){ return c.id === id; });
        if (client && client.assigned_employee_id) empIds[client.assigned_employee_id] = true;
      });
      var notifName = matchedClients[0] ? (matchedClients[0].name || 'A client') : 'A client';
      var notifPromises = Object.keys(empIds).map(function(empId) {
        var agentUnits = selectedIds.filter(function(id){
          var c = matchedClients.find(function(x){ return x.id === id; });
          return c && c.assigned_employee_id === empId;
        }).length;
        return sbInsert('notifications', {
          employee_id : empId,
          type        : 'form_submitted',
          message     : '📝 ' + notifName + ' updated their form data' +
                        (agentUnits > 1 ? ' (' + agentUnits + ' units)' : '') +
                        (matchedClients[0] && matchedClients[0].extra_data && matchedClients[0].extra_data.phone
                          ? ' · ' + matchedClients[0].extra_data.phone : ''),
          read        : false
        });
      });
      var adminMsg = '📝 ' + (matchedClients[0] ? matchedClients[0].name || 'A client' : 'A client') +
        ' submitted their form' +
        (matchedClients[0] && matchedClients[0].extra_data && matchedClients[0].extra_data.phone
          ? ' · ' + matchedClients[0].extra_data.phone : '');
      notifPromises.push(
        sbInsert('notifications', { employee_id: null, type: 'form_submitted', message: adminMsg, read: false }).catch(function(){})
      );
      return Promise.all(notifPromises).catch(function(){});
    })
    .then(function() {
      clearDraft();
      document.getElementById('success-title').textContent = t.successTitle;
      document.getElementById('success-msg').textContent   = t.successMsg;
      showState('success');
    })
    .catch(function() {
      isSubmitting = false;
      setBtnLoading(false, 'btn-submit', 'btn-label', 'btn-progress', t.btnSubmit);
      showBanner(t.errGeneral);
    });
}


/* ── Least-loaded employee assignment ─────────────────────────── */
function getLeastLoadedEmployee() {
  return Promise.all([
    sbGet('employees', 'is_active=eq.true&select=id,name'),
    sbGet('clients',   'campaign_id=eq.' + campaignId + '&select=assigned_employee_id')
  ]).then(function(results) {
    var emps    = results[0] || [];
    var clients = results[1] || [];
    if (!emps.length) return null;
    var counts = {};
    emps.forEach(function(e) { counts[e.id] = 0; });
    clients.forEach(function(c) {
      if (c.assigned_employee_id && counts[c.assigned_employee_id] !== undefined)
        counts[c.assigned_employee_id]++;
    });
    return emps.reduce(function(min, e) { return counts[e.id] < counts[min.id] ? e : min; });
  }).catch(function() { return null; });
}


/* ══════════════════════════════════════════════════════════════
   App Initialization
   ══════════════════════════════════════════════════════════════ */
(function init(){
  var params = new URLSearchParams(window.location.search);
  campaignId = params.get('c') || params.get('campaign');
  if (!campaignId) { showState('notfound'); return; }

  sbGet('campaigns', 'id=eq.' + campaignId + '&select=id,name,column_config&limit=1')
    .then(function(rows) {
      if (!rows || !rows.length) { showState('notfound'); return; }
      campaignData = rows[0];
      var tagNameEl = document.getElementById('camp-tag-name');
      var tagEl     = document.getElementById('camp-tag');
      if (tagNameEl) tagNameEl.textContent = campaignData.name || '';
      if (tagEl && campaignData.name) tagEl.style.display = 'inline-flex';
      document.title = 'Nations OF Sky Form — ' + (campaignData.name || '');
      buildDynamicFields(campaignData);
      showState('form');
      loadDraft();
      attachDraftListeners();
    })
    .catch(function() { showState('notfound'); });

  setLang('ar');
})();
