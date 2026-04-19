// ============================================================
// ANIMATIONS — Page transitions, counters, ripples, feedback
// ============================================================

// ── Page transitions ──────────────────────────────────────────
// Wraps the existing navigateTo to add smooth fade+slide
(function() {
  var _nav = window.navigateTo;
  window.navigateTo = function(page) {
    var mc = document.getElementById('main-content');
    if (!mc) { _nav(page); return; }
    mc.style.transition = 'opacity 0.15s ease, transform 0.15s ease';
    mc.style.opacity    = '0';
    mc.style.transform  = 'translateY(6px)';
    setTimeout(function() {
      _nav(page);
      // Fade back in after renderPage's internal 80ms + content
      setTimeout(function() {
        mc.style.opacity   = '1';
        mc.style.transform = 'translateY(0)';
        runCounters();
        staggerCards();
      }, 120);
    }, 120);
  };
})();

// ── Counter animation ─────────────────────────────────────────
// Looks for elements with [data-counter="N"] and counts up to N
function runCounters() {
  document.querySelectorAll('[data-counter]').forEach(function(el) {
    var target   = parseInt(el.getAttribute('data-counter'), 10);
    var duration = 700;
    var start    = null;
    if (isNaN(target)) return;
    function step(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      // Ease out cubic
      var ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(ease * target);
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = target;
    }
    requestAnimationFrame(step);
  });
}

// ── Stagger card list items ───────────────────────────────────
function staggerCards() {
  var cards = document.querySelectorAll('#main-content .card, #main-content .client-card');
  cards.forEach(function(card, i) {
    card.style.opacity   = '0';
    card.style.transform = 'translateY(10px)';
    card.style.transition = 'none';
    setTimeout(function() {
      card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      card.style.opacity    = '1';
      card.style.transform  = 'translateY(0)';
    }, i * 40);
  });
}

// ── Button ripple effect ──────────────────────────────────────
document.addEventListener('click', function(e) {
  var btn = e.target.closest('.btn');
  if (!btn || btn.disabled) return;

  var ripple   = document.createElement('span');
  var rect     = btn.getBoundingClientRect();
  var size     = Math.max(rect.width, rect.height);
  ripple.style.cssText = [
    'position:absolute',
    'border-radius:50%',
    'background:rgba(255,255,255,0.25)',
    'pointer-events:none',
    'width:'  + size + 'px',
    'height:' + size + 'px',
    'left:'   + (e.clientX - rect.left - size / 2) + 'px',
    'top:'    + (e.clientY - rect.top  - size / 2) + 'px',
    'transform:scale(0)',
    'animation:ripple 0.55s ease forwards'
  ].join(';');

  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(function() { ripple.remove(); }, 600);
}, true);

// ── Save button success feedback ──────────────────────────────
// Call animateSaveSuccess(btn) after a successful save
window.animateSaveSuccess = function(btn) {
  if (!btn) return;
  var orig = btn.innerHTML;
  var origBg = btn.style.background;
  btn.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i> Saved!';
  btn.style.background = '#10b981';
  btn.style.transition = 'background 0.3s ease';
  btn.disabled = true;
  if (window.lucide) lucide.createIcons();
  setTimeout(function() {
    btn.innerHTML    = orig;
    btn.style.background = origBg;
    btn.disabled     = false;
    if (window.lucide) lucide.createIcons();
  }, 2000);
};

// ── Stat card number pop animation ───────────────────────────
// Applied to elements with class .stat-num when they appear
function popStatNums() {
  document.querySelectorAll('.stat-num').forEach(function(el) {
    el.style.animation = 'none';
    el.offsetHeight; // reflow
    el.style.animation = 'numPop 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards';
  });
}

// ── Sidebar active indicator slide ───────────────────────────
// Adds a smooth sliding indicator to the active sidebar item
function updateSidebarIndicator() {
  var active = document.querySelector('.sidebar-item.active');
  var indicator = document.getElementById('sidebar-indicator');
  if (!active) return;
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'sidebar-indicator';
    indicator.style.cssText = [
      'position:absolute',
      'left:0',
      'width:3px',
      'border-radius:0 3px 3px 0',
      'background:#3b82f6',
      'transition:top 0.25s cubic-bezier(0.4,0,0.2,1), height 0.25s ease',
      'pointer-events:none'
    ].join(';');
    var nav = document.getElementById('sidebar-nav');
    if (nav) { nav.style.position = 'relative'; nav.appendChild(indicator); }
  }
  var nav    = document.getElementById('sidebar-nav');
  var navTop = nav ? nav.getBoundingClientRect().top : 0;
  var rect   = active.getBoundingClientRect();
  indicator.style.top    = (rect.top - navTop + nav.scrollTop + rect.height * 0.2) + 'px';
  indicator.style.height = (rect.height * 0.6) + 'px';
}

// ── Progress bars animated fill ───────────────────────────────
// Any .progress-fill will animate width from 0 to its inline style
var _progObserver = new MutationObserver(function() {
  document.querySelectorAll('.progress-fill:not([data-animated])').forEach(function(el) {
    var targetW = el.style.width;
    el.setAttribute('data-animated', '1');
    el.style.width      = '0';
    el.style.transition = 'none';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.style.transition = 'width 0.8s cubic-bezier(0.4,0,0.2,1)';
        el.style.width      = targetW;
      });
    });
  });
});
_progObserver.observe(document.body, { childList: true, subtree: true });

// ── Hook into buildSidebar for indicator updates ──────────────
(function() {
  var _build = window.buildSidebar;
  if (!_build) return;
  window.buildSidebar = function() {
    _build.apply(this, arguments);
    setTimeout(updateSidebarIndicator, 50);
  };
})();

// ── Init on load ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Run once on first load if already in app
  setTimeout(function() {
    runCounters();
    updateSidebarIndicator();
  }, 300);
});
