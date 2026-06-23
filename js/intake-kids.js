/* ══════════════════════════════════════════════════════════════
   intake-kids.js
   ──────────────
   Children (sons) yes/no toggle, per-child name/age/hobby cards,
   and the "Other" hobbies modal.
   
   Depends on: intake-config.js (T, currentLang, kidaValue)
               intake-helpers.js (escHtml, val, saveDraft)
   
   EDIT HERE when you need to:
   - Add/remove per-child fields (name, age, hobby)
   - Change max children count
   - Change the "Other" hobby modal behavior
   ══════════════════════════════════════════════════════════════ */

// ── Kids state ───────────────────────────────────────────────
var kidsNamesData   = [];
var kidsAgesData    = [];
var kidsTalentsData = [];

var AR_ORDINALS = ['الأول','الثاني','الثالث','الرابع','الخامس'];

// ── Yes/No Toggle ────────────────────────────────────────────
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
  saveDraft();
}

// ── Kids count ───────────────────────────────────────────────
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
    return;
  }
  renderKidsNameFields(count);
  saveDraft();
}

// ── Render per-child cards ───────────────────────────────────
function renderKidsNameFields(count) {
  var t    = T[currentLang];
  var isAr = currentLang === 'ar';
  var html = '<div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">';

  for (var i = 0; i < count; i++) {
    var lbl = isAr
      ? ('الابن ' + AR_ORDINALS[i])
      : (t.kidLabel + ' ' + (i + 1));

    html += '<div style="background:#fff;border:1.5px solid var(--border);border-radius:10px;padding:12px 14px;">';
    html += '<div style="font-size:13px;color:var(--blue-dark);font-weight:700;margin-bottom:10px;">👦 ' + escHtml(lbl) + '</div>';
    html += '<div style="display:flex;flex-direction:column;gap:8px;">';

    // Name
    html += '<input type="text" class="kid-field-input" id="inp-kid-name-' + i + '" '
          + 'oninput="onKidNameInput()" placeholder="' + escHtml(t.kidName) + '">';

    // Age
    html += '<input type="text" class="kid-field-input" id="inp-kid-age-' + i + '" '
          + 'oninput="onKidNameInput()" placeholder="' + escHtml(t.kidAge) + '" '
          + 'inputmode="numeric" style="max-width:160px;">';

    // Hobby
    html += '<input type="text" class="kid-field-input" id="inp-kid-talent-' + i + '" '
          + 'oninput="onKidNameInput()" placeholder="' + escHtml(t.kidHobby) + '">';

    html += '</div></div>';
  }
  html += '</div>';
  document.getElementById('kids-names-container').innerHTML = html;

  // Restore saved values
  for (var j = 0; j < count; j++) {
    var elN = document.getElementById('inp-kid-name-'   + j);
    var elA = document.getElementById('inp-kid-age-'    + j);
    var elT = document.getElementById('inp-kid-talent-' + j);
    if (elN && kidsNamesData[j])   elN.value = kidsNamesData[j];
    if (elA && kidsAgesData[j])    elA.value = kidsAgesData[j];
    if (elT && kidsTalentsData[j]) elT.value = kidsTalentsData[j];
  }

  // Attach draft save
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
  var sel = document.getElementById('inp-hobbies');
  if (sel && sel.value === 'Other') {
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
    overlay.style.display = 'none';
    showOtherDisplay(text);
    saveDraft();
  } else {
    var sel = document.getElementById('inp-hobbies');
    if (sel) sel.value = '';
    otherHobbiesText      = '';
    overlay.style.display = 'none';
    hideOtherDisplay();
  }
}

function getHobbiesVal(fieldKey) {
  var sel = document.getElementById('inp-hobbies');
  if (!sel) return '';
  if (sel.value === 'Other') return otherHobbiesText || '';
  return sel.value.trim();
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
