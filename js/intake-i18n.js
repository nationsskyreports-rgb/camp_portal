/* ══════════════════════════════════════════════════════════════
   intake-i18n.js
   ──────────────
   Language toggle (ar/en) and dynamic fields builder.
   
   Depends on: intake-config.js  (T, currentLang, AR_LABELS, EN_LABELS,
                                   DROPDOWN_KEYS, campaignData)
               intake-helpers.js (escHtml, saveDraft)
               intake-kids.js    (getKidsCount, renderKidsNameFields)
   
   EDIT HERE when you need to:
   - Wire a new form field to the language toggle
   - Change which campaign columns render as form fields
   - Change the dynamic fields skip list
   ══════════════════════════════════════════════════════════════ */

function setLang(lang) {
  currentLang = lang;
  var t = T[lang];

  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', t.dir);

  document.getElementById('btn-ar').classList.toggle('active', lang === 'ar');
  document.getElementById('btn-en').classList.toggle('active', lang === 'en');

  // Brand
  var brandSub = document.getElementById('brand-sub');
  if (brandSub) brandSub.textContent = t.brandSub.replace(/\\n/g, '\n');

  // Form header
  document.getElementById('form-title').textContent = t.formTitle;
  document.getElementById('form-desc').textContent  = t.formDesc;
  var formTimeText = document.getElementById('form-time-text');
  if (formTimeText) formTimeText.textContent = t.formTime;

  // Section labels
  document.getElementById('lbl-basic').textContent = t.lblBasic;
  var lifestyleSec = document.getElementById('lbl-lifestyle-section');
  if (lifestyleSec) lifestyleSec.textContent = lang === 'ar' ? 'العائلة وأسلوب الحياة' : 'Family & Lifestyle';

  // Field labels
  setLabelText('lbl-name',      t.lblName,     true);
  setLabelText('lbl-phone',     t.lblPhone,    true);
  setLabelText('lbl-new-phone', t.lblNewPhone, false, t.lblOptional);
  setLabelText('lbl-phone2',    t.lblPhone2,   false, t.lblOptional);
  setLabelText('lbl-email',     t.lblEmail,    true);
  setLabelText('lbl-email2',    t.lblEmail2,   false, t.lblOptional);
  setLabelText('lbl-notes',     t.lblNotes,    false, t.lblOptional);
  setLabelText('lbl-kida',      t.lblKida,     true);
  setLabelText('lbl-kids-count',t.lblKidsCount, true);
  setLabelText('lbl-hobbies',   t.lblHobbies,  true);
  setLabelText('lbl-job-title', t.lblJobTitle, true);

  // Sons section label
  var sonsSec = document.getElementById('lbl-sons-section');
  if (sonsSec) sonsSec.textContent = t.lblSonsSection;

  // Channel section
  var chanSec = document.getElementById('lbl-channel-section');
  if (chanSec) chanSec.textContent = t.lblChannelSection;

  // Channel items
  var chCall = document.getElementById('lbl-ch-call');  if (chCall)  chCall.textContent  = t.lblChCall;
  var chWa   = document.getElementById('lbl-ch-wa');    if (chWa)    chWa.textContent    = t.lblChWa;
  var chEm   = document.getElementById('lbl-ch-email'); if (chEm)    chEm.textContent    = t.lblChEmail;
  var chSms  = document.getElementById('lbl-ch-sms');   if (chSms)   chSms.textContent   = t.lblChSms;

  // Acknowledgment — show both languages or just active one
  var ackTitle = document.getElementById('lbl-ack-title');
  if (ackTitle) ackTitle.textContent = t.lblAckTitle;
  var ackEn = document.getElementById('ack-text-en');
  var ackAr = document.getElementById('ack-text-ar');
  if (ackEn) { ackEn.textContent = t.lblAckTextEn; ackEn.style.display = lang === 'en' ? 'block' : 'none'; }
  if (ackAr) { ackAr.textContent = t.lblAckTextAr; ackAr.style.display = lang === 'ar' ? 'block' : 'none'; }

  // Edit hobby link
  var editHobby = document.getElementById('lbl-edit-hobby');
  if (editHobby) editHobby.textContent = t.lblEditHobby;

  // Placeholders
  document.getElementById('inp-name').placeholder  = t.namePlaceholder;
  document.getElementById('btn-label').textContent = t.btnSubmit;
  var jobInp = document.getElementById('inp-job-title');
  if (jobInp) jobInp.placeholder = t.phJobTitle;

  // Error messages
  document.getElementById('err-name').textContent      = t.errRequired;
  document.getElementById('err-phone').textContent     = t.errPhone;
  document.getElementById('err-new-phone').textContent = t.errPhone;
  document.getElementById('err-phone2').textContent    = t.errPhone;
  document.getElementById('err-email').textContent     = t.errEmail;
  document.getElementById('err-email2').textContent    = t.errEmail;
  document.getElementById('err-kida').textContent      = t.errRequired;
  document.getElementById('err-kids-count').textContent= t.errRequired;
  document.getElementById('err-hobbies').textContent   = t.errRequired;
  document.getElementById('err-job-title').textContent = t.errRequired;
  document.getElementById('lbl-privacy').textContent   = t.lblPrivacy;

  // WhatsApp
  if (document.getElementById('wa-text'))      document.getElementById('wa-text').textContent      = t.waText;
  if (document.getElementById('wa-label-form'))document.getElementById('wa-label-form').textContent = t.waLabel;
  if (document.getElementById('wa-label'))     document.getElementById('wa-label').textContent      = t.waLabel;

  // Not found
  if (document.getElementById('nf-title')) document.getElementById('nf-title').textContent = t.nfTitle;
  if (document.getElementById('nf-sub'))   document.getElementById('nf-sub').innerHTML     = t.nfSub;
  document.getElementById('footer-txt').textContent = t.footerTxt;

  // Re-render dynamic fields & kid cards with new lang
  if (campaignData) buildDynamicFields(campaignData);
  if (kidaValue === 'yes') {
    var count = getKidsCount();
    if (count) renderKidsNameFields(count);
  }
}

function setLabelText(id, text, required, optionalText) {
  var el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = escHtml(text) +
    (required     ? ' <span class="req">*</span>' : '') +
    (optionalText ? ' <span style="color:var(--muted);font-weight:400">' + escHtml(optionalText) + '</span>' : '');
}


/* ══════════════════════════════════════════════════════════════
   Dynamic Fields Builder
   ══════════════════════════════════════════════════════════════ */

function buildDynamicFields(camp) {
  var cols = camp.column_config || [];
  if (typeof cols === 'string') { try { cols = JSON.parse(cols); } catch(e) { cols = []; } }

  var DYNAMIC_SKIP = ['email','email_account','email2','name','phone','phone2','notes'];
  var visibleCols = cols
    .filter(function(c) { return c.show_in_form === true && DYNAMIC_SKIP.indexOf(c.key) === -1; })
    .sort(function(a,b) { return (a.form_order !== undefined ? a.form_order : a.order) - (b.form_order !== undefined ? b.form_order : b.order); });

  if (!visibleCols.length) { document.getElementById('dynamic-fields').innerHTML = ''; return; }

  var t        = T[currentLang];
  var labelMap = currentLang === 'ar' ? AR_LABELS : EN_LABELS;

  var html = '<hr class="divider"><div class="section-label">' + escHtml(t.lblDetails) + '</div>';
  visibleCols.forEach(function(col) {
    var label = labelMap[col.key] || col.label;
    var opts  = DROPDOWN_KEYS[col.key];
    if (opts) {
      var arrowStyle = 'appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'%2378716c\'%3E%3Cpath d=\'M7 10l5 5 5-5z\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:left 12px center;padding-left:2rem;';
      html += '<div class="field">' +
        '<label>' + escHtml(label) + ' <span style="color:var(--muted);font-weight:400">' + escHtml(t.lblOptional) + '</span></label>' +
        '<select id="inp-' + escHtml(col.key) + '" data-col-key="' + escHtml(col.key) + '" style="' + arrowStyle + '">' +
        '<option value="">' + escHtml(label) + '...</option>' +
        opts.map(function(o){ return '<option value="' + escHtml(o) + '">' + escHtml(o) + '</option>'; }).join('') +
        '</select>' +
        '</div>';
    } else {
      html += '<div class="field">' +
        '<label>' + escHtml(label) + ' <span style="color:var(--muted);font-weight:400">' + escHtml(t.lblOptional) + '</span></label>' +
        '<input type="text" id="inp-' + escHtml(col.key) + '" placeholder="' + escHtml(label) + '" data-col-key="' + escHtml(col.key) + '">' +
        '</div>';
    }
  });
  document.getElementById('dynamic-fields').innerHTML = html;
  var dynArea = document.getElementById('dynamic-fields');
  if (dynArea) dynArea.addEventListener('input', saveDraft);
}
