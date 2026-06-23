/* ══════════════════════════════════════════════════════════════
   intake-draft.js
   ────────────────
   SessionStorage auto-save / load / clear for form drafts.
   
   Depends on: intake-config.js  (DRAFT_KEY, kidaValue)
               intake-helpers.js (val, setV)
               intake-kids.js    (kidsNamesData, kidsAgesData, kidsTalentsData,
                                  setKida, handleKidsCountChange)
   
   EDIT HERE when you need to:
   - Add a new form field to draft persistence
   - Change draft storage mechanism (e.g. localStorage)
   ══════════════════════════════════════════════════════════════ */

function saveDraft() {
  try {
    var draft = {
      name           : val('inp-name'),
      phone          : val('inp-phone'),
      newPhone       : val('inp-new-phone'),
      phone2         : val('inp-phone2'),
      email          : val('inp-email'),
      email2         : val('inp-email2'),
      notes          : val('inp-notes'),
      kida           : kidaValue,
      kidsCount      : val('inp-kids-count'),
      kidsNames      : kidsNamesData,
      kidsAgesData   : kidsAgesData,
      kidsTalentsData: kidsTalentsData,
      hobbies        : selectedHobbies,
      otherHobbies   : otherHobbiesText,
      jobTitle       : val('inp-job-title')
    };
    document.querySelectorAll('[data-col-key]').forEach(function(inp) {
      draft['_col_' + inp.getAttribute('data-col-key')] = inp.value.trim();
    });
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch(e) {}
}

function loadDraft() {
  try {
    var raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    var draft = JSON.parse(raw);
    if (draft.name)     setV('inp-name',      draft.name);
    if (draft.phone)    setV('inp-phone',     draft.phone);
    if (draft.newPhone) setV('inp-new-phone', draft.newPhone);
    if (draft.phone2)   setV('inp-phone2',    draft.phone2);
    if (draft.email)    setV('inp-email',     draft.email);
    if (draft.email2)   setV('inp-email2',    draft.email2);
    if (draft.notes)    setV('inp-notes',     draft.notes);
    if (draft.hobbies) {
      selectedHobbies = Array.isArray(draft.hobbies) ? draft.hobbies : [draft.hobbies];
      document.getElementById('inp-hobbies').value = selectedHobbies.join(',');
      if (selectedHobbies.indexOf('Other') !== -1 && draft.otherHobbies) {
        otherHobbiesText = draft.otherHobbies;
        showOtherDisplay(draft.otherHobbies);
      }
      renderHobbyCards();
    }
    if (draft.jobTitle) setV('inp-job-title', draft.jobTitle);
    if (draft.kida)     { setKida(draft.kida); }
    if (draft.kidsNames)       kidsNamesData    = draft.kidsNames;
    if (draft.kidsAgesData)    kidsAgesData     = draft.kidsAgesData;
    if (draft.kidsTalentsData) kidsTalentsData  = draft.kidsTalentsData;
    if (draft.kidsCount) {
      var el = document.getElementById('inp-kids-count');
      if (el) { el.value = draft.kidsCount; handleKidsCountChange(); }
    }
    Object.keys(draft).forEach(function(k) {
      if (k.indexOf('_col_') === 0) {
        var key = k.replace('_col_', '');
        var inp = document.querySelector('[data-col-key="' + key + '"]');
        if (inp && draft[k]) inp.value = draft[k];
      }
    });
  } catch(e) {}
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch(e) {}
}

function attachDraftListeners() {
  var fields = ['inp-name','inp-phone','inp-phone2','inp-new-phone','inp-email','inp-email2',
                'inp-notes','inp-kids-count','inp-hobbies','inp-job-title'];
  fields.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', saveDraft);
      if (el.tagName === 'SELECT') el.addEventListener('change', saveDraft);
    }
  });
  var dynArea = document.getElementById('dynamic-fields');
  if (dynArea) dynArea.addEventListener('input', saveDraft);
}
