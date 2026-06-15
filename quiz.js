/* ==========================================================================
   Legacy Buddy: quiz.js
   The full interactive LQ(TM) Quiz: 12 questions across four pillars, an
   email gate, animated score reveal, pillar bars, and tailored
   recommendations. State persists in sessionStorage.

   Scoring model (per pillar, each normalised to 0-100):
     Financial Health   = Q1(0-25)  + Q2(0-50)  + Q3(0-25)
     Estate Readiness   = Q4(0-35)  + Q5(0-35)  + Q6(0-30)
     Protection         = Q7(0-40)  + Q8(0-30)  + Q9(0-30)
     Generational       = Q10(0-30) + Q11(0-40) + Q12(0-30)
   Total LQ = FH*0.30 + ER*0.35 + PR*0.20 + GI*0.15
   ========================================================================== */

(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var STORAGE_ANSWERS = 'lb-quiz-answers';
  var STORAGE_POSITION = 'lb-quiz-position';

  /* ----------------------------------------------------------------------
     Pillar metadata
     ---------------------------------------------------------------------- */
  var PILLARS = {
    financial: { name: 'Financial Health', weight: 0.30, color: 'financial' },
    estate: { name: 'Estate Readiness', weight: 0.35, color: 'estate' },
    protection: { name: 'Protection Readiness', weight: 0.20, color: 'protection' },
    generational: { name: 'Generational Impact', weight: 0.15, color: 'generational' }
  };

  // Each pillar's lowest-score remedy, surfaced as a recommendation.
  var RECOMMENDATIONS = {
    financial:
      'Strengthen your financial base. Build an emergency fund covering at least three months of expenses and start tracking your net worth. A steady savings habit is the foundation every estate plan stands on.',
    estate:
      'Put your core estate documents in place. A current Will, and where it fits, a Living Trust and Powers of Attorney, is the single highest-impact step for most families. It is exactly where Legacy Buddy helps you begin.',
    protection:
      'Close your protection gaps. Review whether your life insurance truly covers your family’s needs, and add a healthcare directive so your wishes are clear if the unexpected happens.',
    generational:
      'Plan the handoff. Document how you want your assets to pass on, keep beneficiaries current, and consider education or legacy savings for the people who come after you.'
  };

  /* ----------------------------------------------------------------------
     Question bank. Each option carries the points it contributes to its
     pillar. `points` upper bounds match the scoring model above.
     ---------------------------------------------------------------------- */
  var QUESTIONS = [
    {
      pillar: 'financial',
      text: 'What best describes your current savings situation?',
      options: [
        { label: 'I save consistently each month', points: 25 },
        { label: 'I save when I can', points: 16 },
        { label: 'I’m working on paying off debt first', points: 8 },
        { label: 'Savings aren’t possible right now', points: 0 }
      ]
    },
    {
      pillar: 'financial',
      text: 'Roughly, what is your household net worth?',
      options: [
        { label: 'Negative or under $25,000', points: 5 },
        { label: '$25,000 to $99,999', points: 18 },
        { label: '$100,000 to $499,999', points: 30 },
        { label: '$500,000 to $1 million', points: 42 },
        { label: 'Over $1 million', points: 50 }
      ]
    },
    {
      pillar: 'financial',
      text: 'Do you have an emergency fund covering 3+ months of expenses?',
      options: [
        { label: 'Yes, fully funded', points: 25 },
        { label: 'Partially funded', points: 12 },
        { label: 'No, not yet', points: 0 }
      ]
    },
    {
      pillar: 'estate',
      text: 'Does your household currently have a Last Will & Testament?',
      options: [
        { label: 'Yes, up to date', points: 35 },
        { label: 'Yes, but it needs updating', points: 22 },
        { label: 'No, but I’ve been meaning to', points: 8 },
        { label: 'No, and I’m not sure I need one', points: 4 }
      ]
    },
    {
      pillar: 'estate',
      text: 'Do you have a Revocable Living Trust?',
      options: [
        { label: 'Yes', points: 35 },
        { label: 'No, but I want one', points: 18 },
        { label: 'No, I don’t think I need one', points: 10 },
        { label: 'I’m not sure what this is', points: 5 }
      ]
    },
    {
      pillar: 'estate',
      text: 'Do you have Financial and Medical Powers of Attorney?',
      options: [
        { label: 'Yes, both', points: 30 },
        { label: 'Just one of them', points: 16 },
        { label: 'No', points: 4 },
        { label: 'What is a Power of Attorney?', points: 0 }
      ]
    },
    {
      pillar: 'protection',
      text: 'Do you have life insurance coverage?',
      options: [
        { label: 'Yes, enough to cover my family’s needs', points: 40 },
        { label: 'Yes, but probably not enough', points: 26 },
        { label: 'No, I’ve been meaning to get it', points: 10 },
        { label: 'No, I don’t think I need it', points: 4 }
      ]
    },
    {
      pillar: 'protection',
      text: 'Do you have a healthcare directive or living will?',
      options: [
        { label: 'Yes', points: 30 },
        { label: 'No, but I want one', points: 14 },
        { label: 'No, I’ll worry about that later', points: 4 }
      ]
    },
    {
      pillar: 'protection',
      text: 'Have you designated up-to-date beneficiaries on all accounts?',
      options: [
        { label: 'Yes, all accounts are updated', points: 30 },
        { label: 'Some, but not all', points: 16 },
        { label: 'I’m not sure', points: 4 }
      ]
    },
    {
      pillar: 'generational',
      text: 'Do you have education savings plans (529 or similar) for dependents?',
      options: [
        { label: 'Yes, actively contributing', points: 30 },
        { label: 'No dependents that need this', points: 30 },
        { label: 'No, but I want to start', points: 12 },
        { label: 'Not applicable', points: 30 }
      ]
    },
    {
      pillar: 'generational',
      text: 'Have you documented your wishes for asset distribution?',
      options: [
        { label: 'Yes, clearly documented', points: 40 },
        { label: 'Partially documented', points: 24 },
        { label: 'No, but I know what I want', points: 12 },
        { label: 'I haven’t thought about this', points: 4 }
      ]
    },
    {
      pillar: 'generational',
      text: 'Do you have any charitable giving or legacy intentions documented?',
      options: [
        { label: 'Yes, formally included in my estate plan', points: 30 },
        { label: 'I have intentions but nothing formal', points: 16 },
        { label: 'Not at this time', points: 6 }
      ]
    }
  ];

  var TOTAL_QUESTIONS = QUESTIONS.length;

  /* ----------------------------------------------------------------------
     State
     ---------------------------------------------------------------------- */
  var state = {
    position: 0, // 0..11 = question index, then 'gate', then 'results'
    stage: 'question',
    answers: {}, // { qIndex: optionIndex }
    email: ''
  };

  var mount = null;

  /* ----------------------------------------------------------------------
     Persistence
     ---------------------------------------------------------------------- */
  function saveState() {
    try {
      window.sessionStorage.setItem(STORAGE_ANSWERS, JSON.stringify(state.answers));
      window.sessionStorage.setItem(
        STORAGE_POSITION,
        JSON.stringify({ position: state.position, stage: state.stage })
      );
    } catch (err) {
      /* sessionStorage unavailable; continue without persistence */
    }
  }

  function loadState() {
    try {
      var answers = window.sessionStorage.getItem(STORAGE_ANSWERS);
      if (answers) {
        state.answers = JSON.parse(answers) || {};
      }
      var pos = window.sessionStorage.getItem(STORAGE_POSITION);
      if (pos) {
        var parsed = JSON.parse(pos);
        // Resume only within the question flow; always re-gate before results.
        if (parsed && typeof parsed.position === 'number' && parsed.stage === 'question') {
          state.position = Math.min(parsed.position, TOTAL_QUESTIONS - 1);
          state.stage = 'question';
        }
      }
    } catch (err) {
      state.answers = {};
    }
  }

  /* ----------------------------------------------------------------------
     Scoring
     ---------------------------------------------------------------------- */
  function computePillarScores() {
    var totals = { financial: 0, estate: 0, protection: 0, generational: 0 };

    QUESTIONS.forEach(function (question, index) {
      var answerIndex = state.answers[index];
      if (typeof answerIndex === 'number' && question.options[answerIndex]) {
        totals[question.pillar] += question.options[answerIndex].points;
      }
    });

    // Each pillar's three questions sum to a 0-100 scale by design.
    return totals;
  }

  function computeTotal(pillarScores) {
    var total =
      pillarScores.financial * PILLARS.financial.weight +
      pillarScores.estate * PILLARS.estate.weight +
      pillarScores.protection * PILLARS.protection.weight +
      pillarScores.generational * PILLARS.generational.weight;
    return Math.round(total);
  }

  function getBand(score) {
    if (score <= 25) {
      return { label: 'Needs Attention', cls: 'lb-band-color--urgent' };
    }
    if (score <= 50) {
      return { label: 'Building Your Foundation', cls: 'lb-band-color--building' };
    }
    if (score <= 75) {
      return { label: 'Strong Progress', cls: 'lb-band-color--strong' };
    }
    return { label: 'Excellent Readiness', cls: 'lb-band-color--excellent' };
  }

  function topRecommendations(pillarScores) {
    return Object.keys(pillarScores)
      .map(function (key) {
        return { key: key, score: pillarScores[key] };
      })
      .sort(function (a, b) {
        return a.score - b.score;
      })
      .slice(0, 3)
      .map(function (entry) {
        return RECOMMENDATIONS[entry.key];
      });
  }

  /* ----------------------------------------------------------------------
     Rendering helpers
     ---------------------------------------------------------------------- */
  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (html !== undefined) {
      node.innerHTML = html;
    }
    return node;
  }

  function letterFor(index) {
    return String.fromCharCode(65 + index); // A, B, C...
  }

  function renderQuestion() {
    var index = state.position;
    var question = QUESTIONS[index];
    var pillar = PILLARS[question.pillar];
    var progressPct = Math.round((index / TOTAL_QUESTIONS) * 100);

    mount.innerHTML = '';

    var screen = el('div', 'lb-quiz__screen');

    // Progress
    var progress = el('div', 'lb-quiz__progress');
    var meta = el('div', 'lb-quiz__progress-meta');
    meta.appendChild(el('span', 'lb-quiz__pillar', pillar.name));
    meta.appendChild(
      el('span', 'lb-quiz__counter', 'Question ' + (index + 1) + ' of ' + TOTAL_QUESTIONS)
    );
    progress.appendChild(meta);

    var track = el('div', 'lb-quiz__progress-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(TOTAL_QUESTIONS));
    track.setAttribute('aria-valuenow', String(index));
    track.setAttribute('aria-label', 'Quiz progress');
    var fill = el('div', 'lb-quiz__progress-fill');
    track.appendChild(fill);
    progress.appendChild(track);
    screen.appendChild(progress);

    // Question heading
    var heading = el('h3', 'lb-quiz__question', question.text);
    heading.id = 'lb-quiz-question';
    heading.setAttribute('tabindex', '-1');
    screen.appendChild(heading);

    // Options
    var optionsWrap = el('div', 'lb-quiz__options');
    optionsWrap.setAttribute('role', 'group');
    optionsWrap.setAttribute('aria-labelledby', 'lb-quiz-question');

    question.options.forEach(function (option, optIndex) {
      var btn = el('button', 'lb-quiz__option');
      btn.type = 'button';
      btn.setAttribute('aria-pressed', 'false');
      var marker = el('span', 'lb-quiz__option-marker', letterFor(optIndex));
      marker.setAttribute('aria-hidden', 'true');
      var text = el('span', 'lb-quiz__option-label', option.label);
      btn.appendChild(marker);
      btn.appendChild(text);

      if (state.answers[index] === optIndex) {
        btn.classList.add('lb-is-selected');
        btn.setAttribute('aria-pressed', 'true');
      }

      btn.addEventListener('click', function () {
        selectOption(index, optIndex, optionsWrap, nextBtn);
      });

      optionsWrap.appendChild(btn);
    });
    screen.appendChild(optionsWrap);

    // Navigation
    var nav = el('div', 'lb-quiz__nav');

    var backBtn = el('button', 'lb-btn lb-btn-ghost lb-quiz__back', 'Back');
    backBtn.type = 'button';
    if (index === 0) {
      backBtn.setAttribute('hidden', '');
    }
    backBtn.addEventListener('click', goBack);

    var nextBtn = el(
      'button',
      'lb-btn lb-btn-primary',
      index === TOTAL_QUESTIONS - 1 ? 'See My Score' : 'Next'
    );
    nextBtn.type = 'button';
    nextBtn.addEventListener('click', goNext);
    if (typeof state.answers[index] !== 'number') {
      nextBtn.setAttribute('aria-disabled', 'true');
    }

    nav.appendChild(backBtn);
    nav.appendChild(nextBtn);
    screen.appendChild(nav);

    mount.appendChild(screen);

    // Animate progress fill after paint
    window.requestAnimationFrame(function () {
      fill.style.width = progressPct + '%';
    });

    heading.focus({ preventScroll: true });
  }

  function selectOption(qIndex, optIndex, optionsWrap, nextBtn) {
    state.answers[qIndex] = optIndex;
    saveState();

    optionsWrap.querySelectorAll('.lb-quiz__option').forEach(function (node, i) {
      var selected = i === optIndex;
      node.classList.toggle('lb-is-selected', selected);
      node.setAttribute('aria-pressed', String(selected));
    });

    if (nextBtn) {
      nextBtn.removeAttribute('aria-disabled');
    }
  }

  function goNext() {
    // Require an answer before advancing
    if (typeof state.answers[state.position] !== 'number') {
      return;
    }
    if (state.position < TOTAL_QUESTIONS - 1) {
      state.position += 1;
      state.stage = 'question';
      saveState();
      renderQuestion();
    } else {
      state.stage = 'gate';
      saveState();
      renderGate();
    }
    scrollMountIntoView();
  }

  function goBack() {
    if (state.position > 0) {
      state.position -= 1;
      state.stage = 'question';
      saveState();
      renderQuestion();
      scrollMountIntoView();
    }
  }

  function renderGate() {
    mount.innerHTML = '';
    var screen = el('div', 'lb-quiz__screen lb-quiz__panel');

    screen.appendChild(el('h3', 'lb-quiz__panel-title', 'Your LQ™ Score is ready.'));
    screen.appendChild(
      el(
        'p',
        'lb-quiz__panel-body',
        'Enter your email to see your personalized score across all four pillars, and find out exactly what to do next.'
      )
    );

    var form = el('form', 'lb-quiz__gate-form');
    form.setAttribute('novalidate', '');

    var group = el('div', 'lb-form-group');
    var label = el('label', 'lb-label', 'Email address');
    label.setAttribute('for', 'lb-quiz-email');
    var input = el('input', 'lb-input');
    input.type = 'email';
    input.id = 'lb-quiz-email';
    input.name = 'email';
    input.placeholder = 'you@example.com';
    input.autocomplete = 'email';
    input.setAttribute('required', '');
    input.setAttribute('aria-describedby', 'lb-quiz-email-error');
    if (state.email) {
      input.value = state.email;
    }
    var error = el('p', 'lb-error-msg');
    error.id = 'lb-quiz-email-error';
    error.setAttribute('hidden', '');
    error.setAttribute('role', 'alert');

    group.appendChild(label);
    group.appendChild(input);
    group.appendChild(error);
    form.appendChild(group);

    var submit = el('button', 'lb-btn lb-btn-primary lb-btn-full', 'See My Score →');
    submit.type = 'submit';
    form.appendChild(submit);

    var sub = el(
      'p',
      'lb-form-note',
      'No spam. No credit card. Unsubscribe anytime.'
    );
    form.appendChild(sub);

    var back = el('button', 'lb-btn lb-btn-ghost lb-mt-6', '← Back to questions');
    back.type = 'button';
    back.addEventListener('click', function () {
      state.stage = 'question';
      state.position = TOTAL_QUESTIONS - 1;
      saveState();
      renderQuestion();
      scrollMountIntoView();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = input.value.trim();
      if (!value) {
        showGateError(input, error, 'Email address is required.');
        return;
      }
      if (!EMAIL_RE.test(value)) {
        showGateError(input, error, 'Please enter a valid email address.');
        return;
      }
      clearGateError(input, error);
      state.email = value;

      // TODO: forward {email, answers, score} to the CRM / Formspree
      // endpoint before launch so quiz leads are captured server-side.
      // eslint-disable-next-line no-console
      console.log('[Legacy Buddy] LQ Quiz lead captured:', {
        email: state.email,
        answers: state.answers
      });

      state.stage = 'results';
      saveState();
      renderResults();
      scrollMountIntoView();
    });

    screen.appendChild(form);
    screen.appendChild(back);
    mount.appendChild(screen);

    var title = screen.querySelector('.lb-quiz__panel-title');
    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }

  function showGateError(input, error, message) {
    input.setAttribute('aria-invalid', 'true');
    error.textContent = message;
    error.removeAttribute('hidden');
    input.focus();
  }

  function clearGateError(input, error) {
    input.removeAttribute('aria-invalid');
    error.textContent = '';
    error.setAttribute('hidden', '');
  }

  function buildScoreBadge(score, band) {
    var radius = 80;
    var circumference = 2 * Math.PI * radius; // ~502.65
    var badge = el('div', 'lb-score-badge lb-score-badge--lg');
    badge.innerHTML =
      '<svg class="lb-score-badge__svg" viewBox="0 0 180 180" aria-hidden="true">' +
      '<circle class="lb-score-badge__track" cx="90" cy="90" r="' + radius + '"></circle>' +
      '<circle class="lb-score-badge__fill" cx="90" cy="90" r="' + radius + '"></circle>' +
      '</svg>' +
      '<div class="lb-score-badge__center">' +
      '<span class="lb-score-badge__number" data-score-number>0</span>' +
      '<span class="lb-score-badge__label">LQ™</span>' +
      '</div>';

    var fill = badge.querySelector('.lb-score-badge__fill');
    fill.style.strokeDasharray = circumference;
    fill.style.strokeDashoffset = circumference;

    // Animate the ring after the badge is in the DOM
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        fill.style.strokeDashoffset = circumference * (1 - score / 100);
      });
    });

    return badge;
  }

  function animateCount(node, target) {
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      node.textContent = target;
      return;
    }
    var duration = 1400;
    var startTime = null;

    function step(timestamp) {
      if (startTime === null) {
        startTime = timestamp;
      }
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = Math.round(eased * target);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        node.textContent = target;
      }
    }
    window.requestAnimationFrame(step);
  }

  function renderResults() {
    var pillarScores = computePillarScores();
    var total = computeTotal(pillarScores);
    var band = getBand(total);

    mount.innerHTML = '';
    var screen = el('div', 'lb-quiz__screen lb-quiz__panel');

    var heading = el('h3', 'lb-quiz__panel-title', 'Your LQ™ Score');
    heading.setAttribute('tabindex', '-1');
    screen.appendChild(heading);

    // Score badge + band
    var scoreWrap = el('div', 'lb-quiz__result-score');
    scoreWrap.appendChild(buildScoreBadge(total, band));
    var bandEl = el('span', 'lb-quiz__result-band ' + band.cls, band.label);
    scoreWrap.appendChild(bandEl);
    screen.appendChild(scoreWrap);

    // Pillar bars
    var pillars = el('div', 'lb-quiz__pillars');
    Object.keys(PILLARS).forEach(function (key) {
      var p = PILLARS[key];
      var value = Math.round(pillarScores[key]);
      var row = el('div', 'lb-quiz__pillar-bar-row');
      row.appendChild(el('span', 'lb-quiz__pillar-bar-label', p.name));
      row.appendChild(el('span', 'lb-quiz__pillar-bar-value', value + '/100'));
      var barTrack = el('div', 'lb-quiz__pillar-bar-track');
      var barFill = el('div', 'lb-quiz__pillar-bar-fill');
      barTrack.appendChild(barFill);
      row.appendChild(barTrack);
      pillars.appendChild(row);

      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          barFill.style.width = value + '%';
        });
      });
    });
    screen.appendChild(pillars);

    // Recommendations
    var recs = el('div', 'lb-quiz__recommendations');
    recs.appendChild(el('h4', null, 'Your top 3 priorities right now'));
    var list = el('ul');
    topRecommendations(pillarScores).forEach(function (rec) {
      list.appendChild(el('li', null, rec));
    });
    recs.appendChild(list);
    screen.appendChild(recs);

    // CTA
    var cta = el(
      'a',
      'lb-btn lb-btn-primary lb-btn-large lb-btn-full',
      'Create your free account to save your score →'
    );
    cta.href = '#lb-waitlist';
    screen.appendChild(cta);
    screen.appendChild(
      el(
        'p',
        'lb-form-note lb-text-center',
        'Join the waitlist. The full platform launches in 2026.'
      )
    );

    // Restart option
    var restart = el('button', 'lb-btn lb-btn-ghost lb-mt-6', 'Retake the quiz');
    restart.type = 'button';
    restart.addEventListener('click', resetQuiz);
    screen.appendChild(restart);

    mount.appendChild(screen);

    // Count up the number
    var numberNode = mount.querySelector('[data-score-number]');
    if (numberNode) {
      animateCount(numberNode, total);
    }

    heading.focus({ preventScroll: true });
  }

  function resetQuiz() {
    state.answers = {};
    state.position = 0;
    state.stage = 'question';
    state.email = '';
    try {
      window.sessionStorage.removeItem(STORAGE_ANSWERS);
      window.sessionStorage.removeItem(STORAGE_POSITION);
    } catch (err) {
      /* ignore */
    }
    renderQuestion();
    scrollMountIntoView();
  }

  function scrollMountIntoView() {
    var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var anchor = document.getElementById('lq-quiz') || mount;
    if (anchor && anchor.scrollIntoView) {
      anchor.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'start'
      });
    }
  }

  /* ----------------------------------------------------------------------
     Boot
     ---------------------------------------------------------------------- */
  function init() {
    mount = document.querySelector('[data-lb-quiz]');
    if (!mount) {
      return;
    }
    loadState();
    if (state.stage === 'question') {
      renderQuestion();
    } else {
      // Any persisted non-question stage restarts cleanly at question 1.
      state.stage = 'question';
      state.position = 0;
      renderQuestion();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
