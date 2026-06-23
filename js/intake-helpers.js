/* ══════════════════════════════════════════════════════════════
   intake-helpers.js
   ─────────────────
   Supabase API helpers  +  UI utility functions.
   
   Depends on: intake-config.js (SB_URL, SB_KEY)
   
   EDIT HERE when you need to:
   - Change Supabase request headers or behavior
   - Add new UI utility functions
   - Change validation rules (phone, email)
   ══════════════════════════════════════════════════════════════ */

// ── Supabase helpers ─────────────────────────────────────────
function sbHeaders() {
  return { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' };
}

function sbGet(table, query) {
  return fetch(SB_URL + '/rest/v1/' + table + '?' + query, { headers: sbHeaders() })
    .then(function(r) { if (!r.ok) throw new Error('GET error ' + r.status); return r.json(); });
}

function sbRpc(fn, params) {
  return fetch(SB_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST', headers: sbHeaders(), body: JSON.stringify(params)
  }).then(function(r) { if (!r.ok) throw new Error('RPC error ' + r.status); return r.json(); });
}

function sbInsert(table, payload) {
  return fetch(SB_URL + '/rest/v1/' + table, {
    method: 'POST',
    headers: Object.assign(sbHeaders(), { 'Prefer': 'return=minimal' }),
    body: JSON.stringify(payload)
  }).then(function(r) {
    if (r.status !== 201) return r.text().then(function(t) { throw new Error(t); });
  });
}

function sbPatch(table, query, payload) {
  return fetch(SB_URL + '/rest/v1/' + table + '?' + query, {
    method: 'PATCH',
    headers: Object.assign(sbHeaders(), { 'Prefer': 'return=minimal' }),
    body: JSON.stringify(payload)
  }).then(function(r) {
    if (!r.ok) return r.text().then(function(t) { throw new Error(t); });
  });
}

// ── UI helpers ───────────────────────────────────────────────
function showState(id) {
  ['loading','form','success','notfound'].forEach(function(s) {
    var el = document.getElementById('state-' + s);
    if (el) el.classList.toggle('active', s === id);
  });
}

function val(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setV(id, v) {
  var el = document.getElementById(id);
  if (el && v) el.value = v;
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Validation ───────────────────────────────────────────────
function isValidPhone(p) {
  var clean = p.replace(/[\s\-\(\)]/g, '');
  return clean && /^\+?[0-9]{7,20}$/.test(clean);
}

function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

// ── Phone normalization ──────────────────────────────────────
function digitsOnly(s)     { return String(s || '').replace(/\D/g, ''); }
function normalizePhone(r) { return digitsOnly(r).slice(-10); }

// ── Error display ────────────────────────────────────────────
function setErr(fieldId) {
  var el = document.getElementById(fieldId);
  if (el) el.classList.add('has-err');
}

function clearErrors() {
  document.querySelectorAll('.field.has-err').forEach(function(el) { el.classList.remove('has-err'); });
}

function showBanner(msg) {
  var b = document.getElementById('error-banner');
  document.getElementById('error-text').textContent = msg;
  b.classList.add('show');
}

function hideBanner() {
  document.getElementById('error-banner').classList.remove('show');
}

// ── Button loading state ─────────────────────────────────────
function setBtnLoading(loading, btnId, labelId, progId, labelText) {
  var btn  = document.getElementById(btnId);
  var lbl  = document.getElementById(labelId);
  var prog = document.getElementById(progId);
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    lbl.innerHTML    = '<span class="spinner"></span> ' + escHtml(labelText);
    prog.style.width = '70%';
  } else {
    lbl.textContent  = labelText;
    prog.style.width = '0%';
  }
}
