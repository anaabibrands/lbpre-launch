/* ==========================================================================
   Legacy Buddy: lq-score.js
   The interactive LQ(TM) Score dial. An SVG gauge (270-degree arc + needle)
   whose value the visitor moves by toggling life factors, so they can watch
   the score dial up and down in real time. Animates in when scrolled into view.
   Loaded only on lq-score.html.
   ========================================================================== */

(function () {
  'use strict';

  var mount = document.querySelector('[data-lq-gauge]');
  if (!mount) {
    return;
  }

  // Gauge geometry (matches the SVG viewBox 0 0 260 260)
  var CX = 130, CY = 130, R = 110, START = 135, SWEEP = 270;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BASE = 16; // starting score with no factors

  function polar(angleDeg) {
    var a = angleDeg * Math.PI / 180;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  }

  function arcPath(a0, a1) {
    var s = polar(a0), e = polar(a1);
    var large = (a1 - a0) <= 180 ? 0 : 1;
    return 'M ' + s.x.toFixed(2) + ' ' + s.y.toFixed(2) +
      ' A ' + R + ' ' + R + ' 0 ' + large + ' 1 ' + e.x.toFixed(2) + ' ' + e.y.toFixed(2);
  }

  var trackEl = mount.querySelector('.lb-gauge__track');
  var fillEl = mount.querySelector('.lb-gauge__fill');
  var numEl = mount.querySelector('[data-gauge-num]');
  var bandEl = mount.querySelector('[data-gauge-band]');

  // Draw the 270-degree track and fill arcs
  var d = arcPath(START, START + SWEEP);
  trackEl.setAttribute('d', d);
  fillEl.setAttribute('d', d);
  var len = fillEl.getTotalLength();
  fillEl.style.strokeDasharray = len;
  fillEl.style.strokeDashoffset = len;

  function bandFor(score) {
    if (score <= 25) return { label: 'Needs Attention', cls: 'lb-band-color--urgent' };
    if (score <= 50) return { label: 'Building', cls: 'lb-band-color--building' };
    if (score <= 75) return { label: 'Strong', cls: 'lb-band-color--strong' };
    return { label: 'Excellent', cls: 'lb-band-color--excellent' };
  }

  var current = 0;
  var numFrame = null;

  function tweenNumber(from, to) {
    if (prefersReduced) {
      numEl.textContent = to;
      return;
    }
    if (numFrame) {
      window.cancelAnimationFrame(numFrame);
    }
    var duration = 750, startTime = null;
    function step(ts) {
      if (startTime === null) {
        startTime = ts;
      }
      var p = Math.min((ts - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      numEl.textContent = Math.round(from + (to - from) * eased);
      if (p < 1) {
        numFrame = window.requestAnimationFrame(step);
      } else {
        numEl.textContent = to;
        numFrame = null;
      }
    }
    numFrame = window.requestAnimationFrame(step);
  }

  function setScore(score, animateNumber) {
    score = Math.max(0, Math.min(100, Math.round(score)));
    fillEl.style.strokeDashoffset = len * (1 - score / 100);
    var b = bandFor(score);
    bandEl.textContent = b.label;
    bandEl.className = 'lb-gauge__band ' + b.cls;
    if (animateNumber) {
      tweenNumber(current, score);
    } else {
      numEl.textContent = score;
    }
    current = score;
  }

  // Factor toggles
  var factorEls = Array.prototype.slice.call(document.querySelectorAll('.lb-factor'));

  function compute() {
    var total = BASE;
    factorEls.forEach(function (b) {
      if (b.getAttribute('aria-pressed') === 'true') {
        total += parseInt(b.getAttribute('data-points'), 10) || 0;
      }
    });
    return total;
  }

  factorEls.forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') === 'true';
      b.setAttribute('aria-pressed', String(!on));
      setScore(compute(), true);
    });
  });

  // Initial empty state, then animate up to the default score when in view
  setScore(0, false);

  function animateIn() {
    setScore(compute(), true);
  }

  if ('IntersectionObserver' in window && !prefersReduced) {
    var io = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateIn();
            obs.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(mount);
  } else {
    setScore(compute(), false);
  }
})();
