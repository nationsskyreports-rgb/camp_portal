/* ══════════════════════════════════════════════════════════════
   intake-kids.js
   ──────────────
   Children (sons) yes/no toggle, per-child name/age/hobby cards,
   family avatar builder, hobby card selection, and "Other" modal.
   
   Depends on: intake-config.js (T, currentLang, kidaValue,
                                  HOBBY_OPTIONS, selectedHobby)
               intake-helpers.js (escHtml, val, saveDraft)
   
   EDIT HERE when you need to:
   - Add/remove per-child fields
   - Change hobby card options       → use HOBBY_OPTIONS in config
   - Change avatar appearance
   - Change the "Other" hobby modal
   ══════════════════════════════════════════════════════════════ */

// ── Kids state ───────────────────────────────────────────────
var kidsNamesData   = [];
var kidsAgesData    = [];
var kidsTalentsData = [];

var AR_ORDINALS = ['الأول','الثاني','الثالث','الرابع','الخامس'];


/* ══════════════════════════════════════════════════════════════
   Hobby Cards
   ══════════════════════════════════════════════════════════════ */
function renderHobbyCards() {
  var lang = currentLang;
  var html = '';
  HOBBY_OPTIONS.forEach(function(h) {
    var label = lang === 'ar' ? h.ar : h.en;
    var sel   = selectedHobby === h.value ? ' selected' : '';
    html += '<div class="hobby-card' + sel + '" data-value="' + escHtml(h.value) + '" onclick="selectHobby(\'' + escHtml(h.value) + '\')">';
    html += '<span class="hobby-card-emoji">' + h.emoji + '</span>';
    html += '<span class="hobby-card-label">' + escHtml(label) + '</span>';
    html += '</div>';
  });
  document.getElementById('hobby-cards-container').innerHTML = html;
}

function selectHobby(value) {
  // Deselect all
  var cards = document.querySelectorAll('.hobby-card');
  cards.forEach(function(c) { c.classList.remove('selected'); });

  if (value === 'Other') {
    selectedHobby = 'Other';
    var card = document.querySelector('.hobby-card[data-value="Other"]');
    if (card) card.classList.add('selected');
    document.getElementById('inp-hobbies').value = 'Other';
    openOtherModal('hobbies');
    return;
  }

  // Toggle: if same value clicked again, deselect
  if (selectedHobby === value) {
    selectedHobby = '';
    document.getElementById('inp-hobbies').value = '';
    otherHobbiesText = '';
    hideOtherDisplay();
  } else {
    selectedHobby = value;
    document.getElementById('inp-hobbies').value = value;
    var card = document.querySelector('.hobby-card[data-value="' + value + '"]');
    if (card) card.classList.add('selected');
    otherHobbiesText = '';
    hideOtherDisplay();
  }

  var field = document.getElementById('field-hobbies');
  if (field) field.classList.remove('has-err');
  saveDraft();
}

function getHobbiesVal(fieldKey) {
  if (selectedHobby === 'Other') return otherHobbiesText || '';
  return selectedHobby || '';
}


/* ══════════════════════════════════════════════════════════════
   Family Avatar Builder
   ══════════════════════════════════════════════════════════════ */
function renderFamilyAvatar() {
  var container = document.getElementById('family-avatar');
  if (!container) return;

  var count = getKidsCount();
  if (!count && kidaValue !== 'yes') {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  var html = '';

  // Parent figures
  html += '<div class="avatar-figure avatar-parent"><div class="avatar-head"></div><div class="avatar-body"></div></div>';
  html += '<span class="avatar-heart">❤️</span>';
  html += '<div class="avatar-figure avatar-parent"><div class="avatar-head"></div><div class="avatar-body"></div></div>';

  // Child figures
  for (var i = 0; i < count; i++) {
    var name = kidsNamesData[i] || '';
    var displayName = name.length > 6 ? name.substring(0, 6) + '..' : name;
    html += '<div class="avatar-figure avatar-child">';
    html += '<div class="avatar-head"></div>';
    html += '<div class="avatar-body"></div>';
    if (displayName) html += '<div class="avatar-name">' + escHtml(displayName) + '</div>';
    html += '</div>';
  }

  container.innerHTML = html;
}


/* ══════════════════════════════════════════════════════════════
   Yes/No Toggle
   ══════════════════════════════════════════════════════════════ */
function setKida(v) {
  kidaValue = v;
  var yesBtn  = document.getElementById('btn-kida-yes');
  var noBtn   = document.getElementById('btn-kida-no');
  var details = document.getElementById('kids-details');
  if (yesBtn) { yesBtn.classList.toggle('sel-yes', v === 'yes'); yesBtn.classList.remove('sel-no'); }
  if (noBtn)  { noBtn.classList.toggle('sel-no',   v === 'no');  noBtn.classList.remove('sel-yes'); }
  if (details) details.style.display = v === 'yes' ? 'block' : 'none';
  var field = document.getElementById('field-kida');
  if (field) field.classList.remove('has-err');
  renderFamilyAvatar();
  saveDraft();
}


/* ══════════════════════════════════════════════════════════════
   Kids Count
   ══════════════════════════════════════════════════════════════ */
function getKidsCount() {
  var v = val('inp-kids-count');
  if (!v) return 0;
  return v === '5+' ? 5 : parseInt(v, 10);
}

function handleKidsCountChange() {
  var count = getKidsCount();
  kidsNamesData   = [];
  kidsAgesData    = [];
  kidsTalentsData = [];
  if (!count) {
    document.getElementById('kids-names-container').innerHTML = '';
    renderFamilyAvatar();
    return;
  }
  renderKidsNameFields(count);
  renderFamilyAvatar();
  saveDraft();
}


/* ══════════════════════════════════════════════════════════════
   Per-Child Cards
   ══════════════════════════════════════════════════════════════ */
function renderKidsNameFields(count) {
  var t    = T[currentLang];
  var isAr = currentLang === 'ar';
  var html = '<div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">';

  for (var i = 0; i < count; i++) {
    var lbl = isAr
      ? ('الابن ' + AR_ORDINALS[i])
      : (t.kidLabel + ' ' + (i + 1));

    html += '<div style="background:#fff;border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;">';
    html += '<div style="font-size:13px;color:var(--gold-dark);font-weight:700;margin-bottom:10px;">👦 ' + escHtml(lbl) + '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';

    html += '<input type="text" class="kid-field-input" id="inp-kid-name-' + i + '" '
          + 'oninput="onKidNameInput()" placeholder="' + escHtml(t.kidName) + '">';

    html += '<input type="text" class="kid-field-input" id="inp-kid-age-' + i + '" '
          + 'oninput="onKidNameInput()" placeholder="' + escHtml(t.kidAge) + '" '
          + 'inputmode="numeric" style="max-width:160px;">';

    html += '<input type="text" class="kid-field-input" id="inp-kid-talent-' + i + '" '
          + 'oninput="onKidNameInput()" placeholder="' + escHtml(t.kidHobby) + '">';

    html += '</div></div>';
  }
  html += '</div>';
  document.getElementById('kids-names-container').innerHTML = html;

  for (var j = 0; j < count; j++) {
    var elN = document.getElementById('inp-kid-name-'   + j);
    var elA = document.getElementById('inp-kid-age-'    + j);
    var elT = document.getElementById('inp-kid-talent-' + j);
    if (elN && kidsNamesData[j])   elN.value = kidsNamesData[j];
    if (elA && kidsAgesData[j])    elA.value = kidsAgesData[j];
    if (elT && kidsTalentsData[j]) elT.value = kidsTalentsData[j];
  }

  var container = document.getElementById('kids-names-container');
  if (container) container.addEventListener('input', saveDraft);
}

function onKidNameInput() {
  var count = getKidsCount();
  for (var i = 0; i < count; i++) {
    var elN = document.getElementById('inp-kid-name-'   + i);
    var elA = document.getElementById('inp-kid-age-'    + i);
    var elT = document.getElementById('inp-kid-talent-' + i);
    kidsNamesData[i]   = elN ? elN.value.trim() : '';
    kidsAgesData[i]    = elA ? elA.value.trim() : '';
    kidsTalentsData[i] = elT ? elT.value.trim() : '';
  }
  renderFamilyAvatar();
}

function getKidNamesString() {
  var count  = getKidsCount();
  var isAr   = currentLang === 'ar';
  var parts  = [];
  for (var i = 0; i < count; i++) {
    var name   = kidsNamesData[i]   || (isAr ? 'الابن ' + (i + 1) : 'Child ' + (i + 1));
    var age    = kidsAgesData[i]    || '';
    var hobby  = kidsTalentsData[i] || '';
    var s      = name;
    if (age || hobby) {
      s += ' (';
      if (age)        s += (isAr ? 'السن: '     : 'Age: ')   + age;
      if (age && hobby) s += ' - ';
      if (hobby)      s += (isAr ? 'الهواية: '  : 'Hobby: ') + hobby;
      s += ')';
    }
    parts.push(s);
  }
  return parts.join(', ');
}


/* ══════════════════════════════════════════════════════════════
   "Other" Hobbies Modal
   ══════════════════════════════════════════════════════════════ */
var otherFieldActive = null;
var otherHobbiesText = '';

function handleOtherSelect(fieldKey) {
  if (selectedHobby === 'Other') {
    openOtherModal(fieldKey);
  } else {
    otherHobbiesText = '';
    hideOtherDisplay();
  }
}

function openOtherModal(fieldKey) {
  otherFieldActive  = fieldKey;
  var isAr  = currentLang === 'ar';
  var title = document.getElementById('other-modal-title');
  var inp   = document.getElementById('other-modal-input');
  var err   = document.getElementById('other-modal-err');

  title.textContent = isAr ? 'ما هي هوايتك؟' : 'What is your hobby?';
  inp.placeholder   = isAr ? 'مثال: تصوير، رسم، سباحة...' : 'e.g. Photography, Drawing, Swimming...';
  inp.value         = otherHobbiesText;
  err.style.display = 'none';
  inp.style.borderColor = 'rgba(255,255,255,0.15)';

  var overlay = document.getElementById('other-modal-overlay');
  overlay.style.display = 'flex';
  setTimeout(function() { inp.focus(); if (inp.value) inp.select(); }, 80);
  inp.onkeydown = function(e) {
    if (e.key === 'Enter')  { e.preventDefault(); closeOtherModal(true); }
    if (e.key === 'Escape') { closeOtherModal(false); }
  };
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('other-modal-overlay')) closeOtherModal(false);
}

function closeOtherModal(confirm) {
  var inp     = document.getElementById('other-modal-input');
  var err     = document.getElementById('other-modal-err');
  var overlay = document.getElementById('other-modal-overlay');

  if (confirm) {
    var text = inp.value.trim();
    if (!text) {
      err.style.display     = 'block';
      inp.style.borderColor = '#ef4444';
      inp.focus();
      return;
    }
    otherHobbiesText      = text;
    selectedHobby         = 'Other';
    document.getElementById('inp-hobbies').value = 'Other';
    overlay.style.display = 'none';
    showOtherDisplay(text);
    // Highlight "Other" card
    var cards = document.querySelectorAll('.hobby-card');
    cards.forEach(function(c) { c.classList.toggle('selected', c.getAttribute('data-value') === 'Other'); });
    saveDraft();
  } else {
    // If no text was entered, deselect Other
    if (!otherHobbiesText) {
      selectedHobby = '';
      document.getElementById('inp-hobbies').value = '';
      var cards = document.querySelectorAll('.hobby-card');
      cards.forEach(function(c) { c.classList.remove('selected'); });
    }
    overlay.style.display = 'none';
    if (!otherHobbiesText) hideOtherDisplay();
  }
}

function showOtherDisplay(text) {
  var disp = document.getElementById('other-hobbies-display');
  var span = document.getElementById('other-hobbies-text');
  if (disp && span) { span.textContent = text; disp.style.display = 'flex'; }
}

function hideOtherDisplay() {
  var disp = document.getElementById('other-hobbies-display');
  if (disp) disp.style.display = 'none';
}

function reOpenOtherModal(fieldKey) { openOtherModal(fieldKey); }
