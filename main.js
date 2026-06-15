/* ==========================================================================
   Legacy Buddy: main.js
   Shared interactions: sticky nav scroll state, mobile drawer, smooth
   anchor scrolling, scroll-reveal animations, announcement dismissal,
   and the FAQ accordion. Vanilla JS, no dependencies.
   Loaded with `defer`, so the DOM is ready when this runs.
   ========================================================================== */

(function () {
  'use strict';

  /* ----------------------------------------------------------------------
     1. Sticky navigation: transparent at top, solid navy on scroll.
        Pages whose hero is light add `lb-nav--solid` in markup and opt
        out of the transparent state via data-nav-static.
     ---------------------------------------------------------------------- */
  function initNavScroll() {
    var nav = document.querySelector('.lb-nav');
    if (!nav || nav.hasAttribute('data-nav-static')) {
      return;
    }

    var SCROLL_THRESHOLD = 24;

    function updateNavState() {
      if (window.scrollY > SCROLL_THRESHOLD) {
        nav.classList.add('lb-nav--scrolled');
      } else {
        nav.classList.remove('lb-nav--scrolled');
      }
    }

    updateNavState();
    window.addEventListener('scroll', updateNavState, { passive: true });
  }

  /* ----------------------------------------------------------------------
     2. Mobile slide-in drawer
     ---------------------------------------------------------------------- */
  function initMobileDrawer() {
    var toggle = document.querySelector('.lb-nav__toggle');
    var drawer = document.querySelector('.lb-nav__drawer');
    var backdrop = document.querySelector('.lb-nav__backdrop');
    var closeBtn = document.querySelector('.lb-nav__drawer-close');

    if (!toggle || !drawer || !backdrop) {
      return;
    }

    function openDrawer() {
      drawer.classList.add('lb-is-open');
      backdrop.classList.add('lb-is-open');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('lb-no-scroll');
      // Move focus into the drawer for keyboard users
      if (closeBtn) {
        closeBtn.focus();
      }
    }

    function closeDrawer() {
      drawer.classList.remove('lb-is-open');
      backdrop.classList.remove('lb-is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('lb-no-scroll');
      toggle.focus();
    }

    toggle.addEventListener('click', function () {
      var isOpen = drawer.classList.contains('lb-is-open');
      if (isOpen) {
        closeDrawer();
      } else {
        openDrawer();
      }
    });

    backdrop.addEventListener('click', closeDrawer);

    if (closeBtn) {
      closeBtn.addEventListener('click', closeDrawer);
    }

    // Close the drawer after tapping any link inside it
    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeDrawer);
    });

    // Escape closes the drawer
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && drawer.classList.contains('lb-is-open')) {
        closeDrawer();
      }
    });
  }

  /* ----------------------------------------------------------------------
     3. Smooth scroll for in-page anchor links.
        Native CSS smooth-scroll handles most cases; this adds focus
        management for accessibility and respects reduced motion.
     ---------------------------------------------------------------------- */
  function initSmoothAnchors() {
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href || href === '#' || href.length < 2) {
        return;
      }

      link.addEventListener('click', function (event) {
        var target = document.getElementById(href.slice(1));
        if (!target) {
          return;
        }
        event.preventDefault();
        target.scrollIntoView({
          behavior: prefersReduced ? 'auto' : 'smooth',
          block: 'start'
        });
        // Make the target programmatically focusable for screen readers
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }

  /* ----------------------------------------------------------------------
     4. Scroll-reveal animations via IntersectionObserver.
        Elements tagged `.lb-animate` fade in once on entering the viewport.
     ---------------------------------------------------------------------- */
  function initScrollReveal() {
    var animated = document.querySelectorAll('.lb-animate');
    if (!animated.length) {
      return;
    }

    // Graceful fallback: if IntersectionObserver is unavailable, reveal all.
    if (!('IntersectionObserver' in window)) {
      animated.forEach(function (el) {
        el.classList.add('lb-visible');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('lb-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.12
      }
    );

    animated.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ----------------------------------------------------------------------
     5. Announcement bar dismissal (persists for the browser session).
     ---------------------------------------------------------------------- */
  function initAnnouncementBar() {
    var bar = document.querySelector('.lb-announcement-bar');
    var closeBtn = bar ? bar.querySelector('.lb-announcement-bar__close') : null;
    if (!bar || !closeBtn) {
      return;
    }

    var STORAGE_KEY = 'lb-announcement-dismissed';

    // Restore dismissed state from this session
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === 'true') {
        bar.setAttribute('hidden', '');
      }
    } catch (err) {
      /* sessionStorage may be unavailable (private mode); ignore */
    }

    closeBtn.addEventListener('click', function () {
      bar.setAttribute('hidden', '');
      try {
        window.sessionStorage.setItem(STORAGE_KEY, 'true');
      } catch (err) {
        /* ignore storage failures */
      }
    });
  }

  /* ----------------------------------------------------------------------
     6. FAQ accordion (used on the LQ Quiz page).
     ---------------------------------------------------------------------- */
  function initFaq() {
    var questions = document.querySelectorAll('.lb-faq__question');
    if (!questions.length) {
      return;
    }

    questions.forEach(function (button) {
      button.addEventListener('click', function () {
        var expanded = button.getAttribute('aria-expanded') === 'true';
        var answerId = button.getAttribute('aria-controls');
        var answer = answerId ? document.getElementById(answerId) : null;

        button.setAttribute('aria-expanded', String(!expanded));

        if (answer) {
          if (expanded) {
            answer.style.maxHeight = null;
          } else {
            answer.style.maxHeight = answer.scrollHeight + 'px';
          }
        }
      });
    });
  }

  /* ----------------------------------------------------------------------
     7. Static score badges: animate the ring fill when scrolled into view.
        Markup: <div class="lb-score-badge" data-lb-score="74"> with an SVG
        whose <circle r="…"> drives the geometry.
     ---------------------------------------------------------------------- */
  function fillScoreBadge(badge) {
    var fill = badge.querySelector('.lb-score-badge__fill');
    var circle = badge.querySelector('.lb-score-badge__track');
    if (!fill || !circle) {
      return;
    }
    var radius = parseFloat(circle.getAttribute('r')) || 36;
    var circumference = 2 * Math.PI * radius;
    var score = Math.max(0, Math.min(100, parseFloat(badge.getAttribute('data-lb-score')) || 0));

    fill.style.strokeDasharray = circumference;
    fill.style.strokeDashoffset = circumference;

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        fill.style.strokeDashoffset = circumference * (1 - score / 100);
      });
    });
  }

  function initScoreBadges() {
    var badges = document.querySelectorAll('.lb-score-badge[data-lb-score]');
    if (!badges.length) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      badges.forEach(fillScoreBadge);
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            fillScoreBadge(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    badges.forEach(function (badge) {
      observer.observe(badge);
    });
  }

  /* ----------------------------------------------------------------------
     8. Scroll progress bar (thin emerald bar that tracks page progress).
     ---------------------------------------------------------------------- */
  function initScrollProgress() {
    var bar = document.createElement('div');
    bar.className = 'lb-scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    var ticking = false;
    function paint() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      var pct = max > 0 ? (window.scrollY || doc.scrollTop) / max : 0;
      bar.style.width = (Math.min(Math.max(pct, 0), 1) * 100) + '%';
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(paint);
        ticking = true;
      }
    }
    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
  }

  /* ----------------------------------------------------------------------
     9. Count-up: animate headline quantities when they scroll into view.
        Only values carrying a quantity marker ($ , % + T/M/K/B) animate,
        so years and labels like "All 50" are left alone.
     ---------------------------------------------------------------------- */
  function initCountUp() {
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nodes = document.querySelectorAll('.lb-stat-card__number, .lb-trust-bar__value');
    if (!nodes.length || prefersReduced || !('IntersectionObserver' in window)) {
      return;
    }

    var QTY = /[$,%+]|\d(?:T|M|K|B)\b/;
    var targets = [];
    nodes.forEach(function (el) {
      var txt = el.textContent.trim();
      var m = txt.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      if (m && QTY.test(txt)) {
        targets.push({ el: el, prefix: m[1], numStr: m[2], suffix: m[3] });
        el.textContent = m[1] + '0' + m[3];
      }
    });
    if (!targets.length) {
      return;
    }

    function render(t, value) {
      var raw = t.numStr.replace(/,/g, '');
      var decimals = (raw.split('.')[1] || '').length;
      var hadComma = t.numStr.indexOf(',') !== -1;
      var s;
      if (hadComma) {
        s = value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      } else {
        s = decimals > 0 ? value.toFixed(decimals) : String(Math.round(value));
      }
      t.el.textContent = t.prefix + s + t.suffix;
    }

    function run(t) {
      var target = parseFloat(t.numStr.replace(/,/g, ''));
      var duration = 1300;
      var startTime = null;
      function step(ts) {
        if (startTime === null) {
          startTime = ts;
        }
        var p = Math.min((ts - startTime) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        render(t, target * eased);
        if (p < 1) {
          window.requestAnimationFrame(step);
        } else {
          t.el.textContent = t.prefix + t.numStr + t.suffix;
        }
      }
      window.requestAnimationFrame(step);
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            for (var i = 0; i < targets.length; i++) {
              if (targets[i].el === entry.target) {
                run(targets[i]);
                break;
              }
            }
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    targets.forEach(function (t) {
      observer.observe(t.el);
    });
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  function init() {
    initNavScroll();
    initMobileDrawer();
    initSmoothAnchors();
    initScrollReveal();
    initAnnouncementBar();
    initFaq();
    initScoreBadges();
    initScrollProgress();
    initCountUp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
