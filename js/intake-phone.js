/* ══════════════════════════════════════════════════════════════
   intake-phone.js
   ────────────────
   Phone number lookup via Supabase RPC, unit rendering,
   and unit checkbox toggling.
   
   Depends on: intake-config.js  (campaignId, matchedClients, selectedIds,
                                   phoneLookupDone, phoneNotFound, currentLang, T)
               intake-helpers.js (val, sbRpc, normalizePhone, digitsOnly, escHtml)
   
   EDIT HERE when you need to:
   - Change phone lookup behavior or RPC function
   - Change how units are displayed
   - Add extra info to the lookup panel
   ══════════════════════════════════════════════════════════════ */

function lookupPhone() {
  var raw = val('inp-phone');
  if (!raw || !campaignId) return;
  if (digitsOnly(raw).length < 7) return;

  sbRpc('lookup_client_by_phone', { p_campaign_id: campaignId, p_phone: normalizePhone(raw) })
    .then(function(clients) {
      matchedClients  = clients || [];
      phoneLookupDone = true;
      var panel  = document.getElementById('phone-lookup-panel');
      var notice = document.getElementById('phone-notfound-notice');
      if (matchedClients.length) {
        phoneNotFound = false;
        var clientName = matchedClients[0].name || (matchedClients[0].extra_data || {}).customer || '';
        document.getElementById('inp-name').value = clientName;
        renderLookupUnits();
        panel.style.display = 'block';
        notice.classList.remove('show');
      } else {
        phoneNotFound   = true;
        panel.style.display = 'none';
        notice.textContent  = T[currentLang].errPhoneBlocked;
        notice.classList.add('show');
        matchedClients = [];
        selectedIds    = [];
      }
    }).catch(function() { phoneLookupDone = true; });
}

function renderLookupUnits() {
  var clientName = matchedClients[0].name ||
                   (matchedClients[0].extra_data || {}).customer || '\u2014';
  document.getElementById('lookup-name').textContent    = clientName;
  document.getElementById('lookup-greeting').textContent =
    currentLang === 'ar' ? 'أهلاً بك!' : 'Welcome!';
  document.getElementById('lookup-units-lbl').textContent =
    currentLang === 'ar' ? 'اختار وحدتك / وحداتك' : 'Select your unit(s)';

  var unitItems = [];
  matchedClients.forEach(function(c) {
    var ex = c.extra_data || {};
    if (ex.units && Array.isArray(ex.units) && ex.units.length) {
      ex.units.forEach(function(u) {
        if (u.unit || u.contract_number)
          unitItems.push({ clientId: c.id, unit: u.unit || '', contract: u.contract_number || '', project: u.project || '' });
      });
    } else if (ex.unit || ex.contract_number) {
      unitItems.push({ clientId: c.id, unit: ex.unit || ex.Unit || '', contract: ex.contract_number || '', project: ex.project || '' });
    }
  });
  if (!unitItems.length) {
    matchedClients.forEach(function(c) {
      unitItems.push({ clientId: c.id, unit: '', contract: '', project: '' });
    });
  }

  var byProject = {};
  unitItems.forEach(function(u) {
    var proj = u.project || (currentLang === 'ar' ? 'وحدات أخرى' : 'Other Units');
    if (!byProject[proj]) byProject[proj] = [];
    byProject[proj].push(u);
  });

  var html = '';
  Object.keys(byProject).forEach(function(proj) {
    html += '<div class="lookup-proj-lbl">' + escHtml(proj) + '</div>';
    byProject[proj].forEach(function(u, idx) {
      var uid   = u.clientId + '_' + idx;
      var label = u.unit || (currentLang === 'ar' ? 'وحدة ' + (idx + 1) : 'Unit ' + (idx + 1));
      html += '<label class="lookup-unit-item sel" id="lui-' + uid + '" onclick="toggleLookupUnitItem(\'' + uid + '\',\'' + u.clientId + '\')">';
      html += '<input type="checkbox" checked id="lchk-' + uid + '" onclick="event.stopPropagation()">';
      html += '<div><div class="lookup-unit-code">' + escHtml(label) + '</div>';
      if (u.contract) html += '<div class="lookup-unit-con">' + escHtml(u.contract) + '</div>';
      html += '</div></label>';
    });
  });
  document.getElementById('lookup-units-container').innerHTML = html;

  var seen = {};
  unitItems.forEach(function(u) { seen[u.clientId] = true; });
  selectedIds = Object.keys(seen);
}

function toggleLookupUnitItem(uid, clientId) {
  var chk = document.getElementById('lchk-' + uid);
  var lbl = document.getElementById('lui-'  + uid);
  if (!chk) return;
  chk.checked = !chk.checked;
  lbl.classList.toggle('sel', chk.checked);
  var allCheckboxes = document.querySelectorAll('[id^="lchk-"]');
  var checkedByClient = {};
  allCheckboxes.forEach(function(cb) {
    var parts = cb.id.replace('lchk-', '').split('_');
    var cid   = parts.slice(0, -1).join('_');
    if (cb.checked) checkedByClient[cid] = true;
  });
  selectedIds = Object.keys(checkedByClient);
}
