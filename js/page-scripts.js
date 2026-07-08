// ============================================================
// PAGE — Call Scripts (Admin)
// Manage call scripts per campaign. Stored in campaigns.call_script
// ============================================================

var scriptEditCampId = null;

function renderScriptsPage() {
  var m = document.getElementById('main-content');

  // If editing a specific campaign's script
  if (scriptEditCampId) { renderScriptEditor(); return; }

  var cards = S.campaigns.map(function(c) {
    var hasScript = c.call_script && (
      (c.call_script.ar && c.call_script.ar.paras && c.call_script.ar.paras.length) ||
      (c.call_script.en && c.call_script.en.paras && c.call_script.en.paras.length)
    );
    var paraCount = 0;
    if (c.call_script && c.call_script.ar && c.call_script.ar.paras) paraCount = c.call_script.ar.paras.length;

    return '<div class="card card-hover cursor-pointer" onclick="scriptEditCampId=\'' + c.id + '\';renderScriptsPage()" style="display:flex;align-items:center;justify-content:space-between">' +
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="width:40px;height:40px;border-radius:10px;background:rgba(96,165,250,.1);display:flex;align-items:center;justify-content:center">' +
          '<i data-lucide="scroll-text" style="width:20px;height:20px;color:#60a5fa"></i>' +
        '</div>' +
        '<div>' +
          '<p class="font-semibold text-white">' + esc(c.name) + '</p>' +
          '<p class="text-xs text-slate-500">' + (hasScript ? paraCount + ' paragraphs' : 'No script yet') + '</p>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        (hasScript
          ? '<span style="background:rgba(16,185,129,.1);color:#6ee7b7;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600">✓ Script Set</span>'
          : '<span style="background:rgba(239,68,68,.08);color:#f87171;border-radius:6px;padding:3px 10px;font-size:11px;font-weight:600">Empty</span>') +
        '<i data-lucide="chevron-right" style="width:16px;height:16px;color:#475569"></i>' +
      '</div>' +
    '</div>';
  }).join('');

  m.innerHTML =
    hdr('Call Scripts', S.campaigns.length + ' campaigns', '') +
    '<div class="card mb-4 fade-in" style="padding:12px 16px;background:rgba(96,165,250,.04);border:1px solid rgba(96,165,250,.12)">' +
      '<p class="text-xs text-slate-400"><i data-lucide="info" style="width:12px;height:12px;display:inline;vertical-align:middle;margin-left:4px"></i> ' +
      'Write a call script for each campaign. Agents will see the script for their assigned campaigns when they click "Call Script".</p>' +
    '</div>' +
    '<div class="space-y-3 fade-in">' + cards + '</div>';
  lucide.createIcons();
}

function renderScriptEditor() {
  var m = document.getElementById('main-content');
  var c = campById(scriptEditCampId);
  if (!c) { scriptEditCampId = null; renderScriptsPage(); return; }

  var script = c.call_script || {};
  var ar = script.ar || { title: '', paras: [] };
  var en = script.en || { title: '', paras: [] };

  // Ensure at least one empty paragraph
  if (!ar.paras || !ar.paras.length) ar.paras = [''];
  if (!en.paras || !en.paras.length) en.paras = [''];

  m.innerHTML =
    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">' +
      '<button class="btn btn-ghost btn-sm" onclick="scriptEditCampId=null;renderScriptsPage()">' +
        '<i data-lucide="arrow-left" style="width:16px;height:16px"></i>' +
      '</button>' +
      '<div>' +
        '<h2 class="text-lg font-bold text-white">' + esc(c.name) + '</h2>' +
        '<p class="text-xs text-slate-500">Edit call script</p>' +
      '</div>' +
    '</div>' +

    // Arabic section
    '<div class="card fade-in mb-4">' +
      '<h3 class="text-sm font-bold text-white mb-3" style="display:flex;align-items:center;gap:6px">' +
        '<span style="background:rgba(96,165,250,.1);color:#60a5fa;border-radius:4px;padding:2px 8px;font-size:11px">عربي</span> Arabic Script' +
      '</h3>' +
      '<div style="margin-bottom:10px">' +
        '<label class="text-xs text-slate-400">Title</label>' +
        '<input id="script-ar-title" dir="rtl" value="' + esc(ar.title || c.name + ' (Call Center)') + '" class="input w-full mt-1" placeholder="e.g. Jirian New (Call Center)" />' +
      '</div>' +
      '<label class="text-xs text-slate-400">Paragraphs</label>' +
      '<div id="script-ar-paras" class="space-y-2 mt-1">' +
        ar.paras.map(function(p, i) {
          return '<div style="display:flex;gap:6px;align-items:start">' +
            '<span class="text-xs text-slate-600" style="margin-top:10px;min-width:16px">' + (i + 1) + '</span>' +
            '<textarea dir="rtl" class="input w-full" rows="3" style="resize:vertical" data-lang="ar" data-idx="' + i + '">' + esc(p) + '</textarea>' +
            '<button class="btn btn-ghost btn-sm" style="margin-top:4px;color:#f87171" onclick="removeScriptPara(\'ar\',' + i + ')" title="Remove">' +
              '<i data-lucide="trash-2" style="width:14px;height:14px"></i>' +
            '</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<button class="btn btn-ghost btn-sm mt-2" onclick="addScriptPara(\'ar\')" style="color:#60a5fa">' +
        '<i data-lucide="plus" style="width:14px;height:14px"></i> Add Paragraph' +
      '</button>' +
    '</div>' +

    // English section
    '<div class="card fade-in mb-4">' +
      '<h3 class="text-sm font-bold text-white mb-3" style="display:flex;align-items:center;gap:6px">' +
        '<span style="background:rgba(96,165,250,.1);color:#60a5fa;border-radius:4px;padding:2px 8px;font-size:11px">EN</span> English Script' +
      '</h3>' +
      '<div style="margin-bottom:10px">' +
        '<label class="text-xs text-slate-400">Title</label>' +
        '<input id="script-en-title" value="' + esc(en.title || c.name + ' (Call Center)') + '" class="input w-full mt-1" placeholder="e.g. Jirian New (Call Center)" />' +
      '</div>' +
      '<label class="text-xs text-slate-400">Paragraphs</label>' +
      '<div id="script-en-paras" class="space-y-2 mt-1">' +
        en.paras.map(function(p, i) {
          return '<div style="display:flex;gap:6px;align-items:start">' +
            '<span class="text-xs text-slate-600" style="margin-top:10px;min-width:16px">' + (i + 1) + '</span>' +
            '<textarea class="input w-full" rows="3" style="resize:vertical" data-lang="en" data-idx="' + i + '">' + esc(p) + '</textarea>' +
            '<button class="btn btn-ghost btn-sm" style="margin-top:4px;color:#f87171" onclick="removeScriptPara(\'en\',' + i + ')" title="Remove">' +
              '<i data-lucide="trash-2" style="width:14px;height:14px"></i>' +
            '</button>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<button class="btn btn-ghost btn-sm mt-2" onclick="addScriptPara(\'en\')" style="color:#60a5fa">' +
        '<i data-lucide="plus" style="width:14px;height:14px"></i> Add Paragraph' +
      '</button>' +
    '</div>' +

    // Save
    '<div class="flex gap-3" style="justify-content:flex-end">' +
      '<button class="btn btn-ghost" onclick="scriptEditCampId=null;renderScriptsPage()">Cancel</button>' +
      '<button class="btn btn-primary" id="save-script-btn" onclick="saveScript()"><i data-lucide="save" style="width:14px;height:14px"></i> Save Script</button>' +
    '</div>';

  lucide.createIcons();
}

// ── Helpers for add/remove paragraphs ──

function getScriptFromForm() {
  var arTitle = (document.getElementById('script-ar-title') || {}).value || '';
  var enTitle = (document.getElementById('script-en-title') || {}).value || '';

  var arParas = [], enParas = [];
  document.querySelectorAll('#script-ar-paras textarea').forEach(function(t) { if (t.value.trim()) arParas.push(t.value.trim()); });
  document.querySelectorAll('#script-en-paras textarea').forEach(function(t) { if (t.value.trim()) enParas.push(t.value.trim()); });

  return {
    ar: { title: arTitle, dir: 'rtl', paras: arParas },
    en: { title: enTitle, dir: 'ltr', paras: enParas }
  };
}

function addScriptPara(lang) {
  // Save current state, add empty para, re-render
  var current = getScriptFromForm();
  current[lang].paras.push('');
  var c = campById(scriptEditCampId);
  if (c) c.call_script = current;
  renderScriptEditor();
  // Focus the new textarea
  setTimeout(function() {
    var all = document.querySelectorAll('#script-' + lang + '-paras textarea');
    if (all.length) all[all.length - 1].focus();
  }, 50);
}

function removeScriptPara(lang, idx) {
  var current = getScriptFromForm();
  current[lang].paras.splice(idx, 1);
  if (!current[lang].paras.length) current[lang].paras = [''];
  var c = campById(scriptEditCampId);
  if (c) c.call_script = current;
  renderScriptEditor();
}

function saveScript() {
  var script = getScriptFromForm();
  var btn = document.getElementById('save-script-btn');
  if (btn) btn.disabled = true;

  sb.from('campaigns').update({ call_script: script }).eq('id', scriptEditCampId)
    .then(function(res) {
      if (res.error) { toast(res.error.message, 'error'); if (btn) btn.disabled = false; return; }
      // Update local state
      var c = campById(scriptEditCampId);
      if (c) c.call_script = script;
      toast('Script saved ✓', 'success');
      scriptEditCampId = null;
      renderScriptsPage();
    });
}
