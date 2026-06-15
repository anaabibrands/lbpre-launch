/* ==========================================================================
   Legacy Buddy: waitlist.js
   Accessible validation and submission for every waitlist / application
   form on the site. Works for any <form data-lb-waitlist>.
   Submission is stubbed with a clearly marked TODO for the real endpoint
   (Formspree or Webflow Forms). On success the form animates out and a
   confirmation panel animates in.
   ========================================================================== */

(function () {
  'use strict';

  // RFC-pragmatic email check: good enough for client-side UX, never the
  // single source of truth (the backend must validate too).
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ----------------------------------------------------------------------
     Field-level helpers
     ---------------------------------------------------------------------- */

  function getErrorEl(input) {
    // Convention: the error message lives at <input id> + "-error"
    var id = input.getAttribute('id');
    return id ? document.getElementById(id + '-error') : null;
  }

  function setError(input, message) {
    input.setAttribute('aria-invalid', 'true');
    var group = input.closest('.lb-form-group');
    if (group) {
      group.classList.add('lb-form-group--error');
    }
    var errorEl = getErrorEl(input);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.removeAttribute('hidden');
    }
  }

  function clearError(input) {
    input.removeAttribute('aria-invalid');
    var group = input.closest('.lb-form-group');
    if (group) {
      group.classList.remove('lb-form-group--error');
    }
    var errorEl = getErrorEl(input);
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.setAttribute('hidden', '');
    }
  }

  function validateField(input) {
    var value = (input.value || '').trim();
    var type = input.getAttribute('type');
    var isRequired = input.hasAttribute('required');
    var label = input.getAttribute('data-label') || 'This field';

    // Required check
    if (isRequired && !value) {
      setError(input, label + ' is required.');
      return false;
    }

    // Email format check (applies whether required or, if filled, optional)
    if (type === 'email' && value && !EMAIL_RE.test(value)) {
      setError(input, 'Please enter a valid email address.');
      return false;
    }

    // Phone: optional, but if provided do a light sanity check
    if (input.getAttribute('data-validate') === 'phone' && value) {
      var digits = value.replace(/[^0-9]/g, '');
      if (digits.length < 7) {
        setError(input, 'Please enter a valid phone number.');
        return false;
      }
    }

    clearError(input);
    return true;
  }

  /* ----------------------------------------------------------------------
     Form-level handling
     ---------------------------------------------------------------------- */

  function validateForm(form) {
    var fields = form.querySelectorAll('input, textarea, select');
    var firstInvalid = null;
    var allValid = true;

    fields.forEach(function (field) {
      if (field.type === 'submit' || field.type === 'hidden') {
        return;
      }
      var ok = validateField(field);
      if (!ok && !firstInvalid) {
        firstInvalid = field;
      }
      if (!ok) {
        allValid = false;
      }
    });

    if (firstInvalid) {
      firstInvalid.focus();
    }
    return allValid;
  }

  function showSuccess(form) {
    var successId = form.getAttribute('data-success');
    var successEl = successId ? document.getElementById(successId) : null;

    // Inject the submitted email into any success placeholder
    var emailInput = form.querySelector('input[type="email"]');
    var email = emailInput ? emailInput.value.trim() : '';
    if (successEl) {
      successEl.querySelectorAll('[data-success-email]').forEach(function (node) {
        node.textContent = email || 'your inbox';
      });
    }

    // Animate the form out, then reveal the success panel
    form.style.transition = 'opacity 250ms ease, transform 250ms ease';
    form.style.opacity = '0';
    form.style.transform = 'translateY(8px)';

    window.setTimeout(function () {
      form.setAttribute('hidden', '');
      if (successEl) {
        successEl.removeAttribute('hidden');
        successEl.setAttribute('tabindex', '-1');
        successEl.focus({ preventScroll: true });
      }
    }, 260);
  }

  function setSubmitting(button, isSubmitting) {
    if (!button) {
      return;
    }
    if (isSubmitting) {
      button.setAttribute('aria-disabled', 'true');
      button.dataset.originalLabel = button.innerHTML;
      button.innerHTML = '<span class="lb-btn__spinner" aria-hidden="true"></span><span>Securing your spot...</span>';
    } else {
      button.removeAttribute('aria-disabled');
      if (button.dataset.originalLabel) {
        button.innerHTML = button.dataset.originalLabel;
      }
    }
  }

  function submitForm(form) {
    var button = form.querySelector('[type="submit"]');
    setSubmitting(button, true);

    // Collect the payload
    var payload = {};
    new FormData(form).forEach(function (value, key) {
      payload[key] = value;
    });

    var endpoint = form.getAttribute('action');

    // -------------------------------------------------------------------
    // TODO: Connect to the live endpoint before launch.
    // Option A: Formspree: set the form's `action` to
    //   https://formspree.io/f/{your-id} and method="POST".
    // Option B: Webflow native forms: remove this handler and let
    //   Webflow capture the submission (see webflow-embed-guide.md).
    // The fetch below runs only when a real action URL is present;
    // otherwise we simulate a successful submission for the prototype.
    // -------------------------------------------------------------------
    if (endpoint && /^https?:\/\//.test(endpoint)) {
      fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Submission failed with status ' + response.status);
          }
          return response.json().catch(function () {
            return {};
          });
        })
        .then(function () {
          setSubmitting(button, false);
          showSuccess(form);
        })
        .catch(function (error) {
          setSubmitting(button, false);
          handleSubmitError(form, error);
        });
      return;
    }

    // Prototype path: log the captured data and show success.
    // eslint-disable-next-line no-console
    console.log('[Legacy Buddy] Waitlist submission captured (no endpoint set yet):', payload);
    window.setTimeout(function () {
      setSubmitting(button, false);
      showSuccess(form);
    }, 700);
  }

  function handleSubmitError(form, error) {
    // eslint-disable-next-line no-console
    console.error('[Legacy Buddy] Waitlist submission error:', error);
    var formError = form.querySelector('[data-form-error]');
    if (formError) {
      formError.textContent =
        'Something went wrong on our end. Please try again in a moment.';
      formError.removeAttribute('hidden');
    }
  }

  /* ----------------------------------------------------------------------
     Wiring
     ---------------------------------------------------------------------- */

  function initForm(form) {
    // Turn off native validation bubbles; we provide our own accessible UI.
    form.setAttribute('novalidate', '');

    // Live-clear errors as the user corrects a field
    form.querySelectorAll('input, textarea, select').forEach(function (field) {
      field.addEventListener('blur', function () {
        validateField(field);
      });
      field.addEventListener('input', function () {
        if (field.getAttribute('aria-invalid') === 'true') {
          validateField(field);
        }
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var formError = form.querySelector('[data-form-error]');
      if (formError) {
        formError.setAttribute('hidden', '');
      }
      if (validateForm(form)) {
        submitForm(form);
      }
    });
  }

  function init() {
    document.querySelectorAll('form[data-lb-waitlist]').forEach(initForm);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
