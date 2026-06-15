/* ==========================================================================
   Legacy Buddy: countdown.js
   Counts down to the platform launch: July 1, 2026 00:00:00 UTC.
   Scans the page for any element marked [data-lb-countdown] and updates
   its Days / Hours / Minutes / Seconds children every second.
   Also exposed as window.LBCountdown.init() for manual wiring.
   ========================================================================== */

(function (global) {
  'use strict';

  // Launch moment, fixed in UTC so every visitor sees a consistent target.
  var LAUNCH_TIMESTAMP = Date.UTC(2026, 6, 1, 0, 0, 0); // Month is 0-indexed: 6 = July

  function pad(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function renderLive(root) {
    var unitsWrap = root.querySelector('.lb-countdown__units');
    if (unitsWrap && !root.querySelector('.lb-countdown__live')) {
      unitsWrap.innerHTML = '<span class="lb-countdown__live">Live Now!</span>';
    }
  }

  function update(root) {
    var now = Date.now();
    var diff = LAUNCH_TIMESTAMP - now;

    if (diff <= 0) {
      renderLive(root);
      return false; // signal to stop the interval
    }

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor((totalSeconds % 86400) / 3600);
    var minutes = Math.floor((totalSeconds % 3600) / 60);
    var seconds = totalSeconds % 60;

    setUnit(root, 'days', days);
    setUnit(root, 'hours', pad(hours));
    setUnit(root, 'minutes', pad(minutes));
    setUnit(root, 'seconds', pad(seconds));

    return true;
  }

  function setUnit(root, unit, value) {
    var el = root.querySelector('[data-unit="' + unit + '"]');
    if (el) {
      el.textContent = value;
    }
  }

  function initOne(root) {
    // First paint immediately so there is no flash of empty values.
    var keepGoing = update(root);
    if (!keepGoing) {
      return;
    }
    var timer = global.setInterval(function () {
      var alive = update(root);
      if (!alive) {
        global.clearInterval(timer);
      }
    }, 1000);
  }

  function init() {
    var roots = document.querySelectorAll('[data-lb-countdown]');
    roots.forEach(function (root) {
      initOne(root);
    });
  }

  // Public API
  global.LBCountdown = {
    init: init,
    launchTimestamp: LAUNCH_TIMESTAMP
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
