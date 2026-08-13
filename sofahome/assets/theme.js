/* Sofahome — thema-interacties. Bewust klein gehouden: geen frameworks. */
(function () {
  'use strict';

  /* ---------- Aankondigingsbalk: rouleren ---------- */
  document.querySelectorAll('[data-announcement]').forEach(function (bar) {
    var items = bar.querySelectorAll('.announcement__item');
    if (items.length < 2) return;

    var interval = parseInt(bar.getAttribute('data-interval'), 10) || 5000;
    var index = 0;
    var timer = null;

    function show(next) {
      items[index].classList.remove('is-active');
      items[index].setAttribute('aria-hidden', 'true');
      index = next;
      items[index].classList.add('is-active');
      items[index].removeAttribute('aria-hidden');
    }

    function start() {
      if (timer) return;
      timer = setInterval(function () {
        show((index + 1) % items.length);
      }, interval);
    }

    function stop() {
      clearInterval(timer);
      timer = null;
    }

    bar.addEventListener('mouseenter', stop);
    bar.addEventListener('mouseleave', start);
    bar.addEventListener('focusin', stop);
    bar.addEventListener('focusout', start);

    // Niet doorrouleren wanneer het tabblad op de achtergrond staat.
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    start();
  });

  /* ---------- Mobiel menu ---------- */
  document.querySelectorAll('[data-menu-toggle]').forEach(function (button) {
    var nav = document.getElementById(button.getAttribute('aria-controls'));
    if (!nav) return;

    button.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- Zoekbalk in de header ---------- */
  document.querySelectorAll('[data-search-toggle]').forEach(function (button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;

    button.addEventListener('click', function () {
      var hidden = panel.hasAttribute('hidden');
      if (hidden) {
        panel.removeAttribute('hidden');
        var input = panel.querySelector('input[type="search"]');
        if (input) input.focus();
      } else {
        panel.setAttribute('hidden', '');
      }
      button.setAttribute('aria-expanded', hidden ? 'true' : 'false');
    });
  });

  /* ---------- Aantal-stepper ---------- */
  document.querySelectorAll('[data-quantity]').forEach(function (wrapper) {
    var input = wrapper.querySelector('input');
    if (!input) return;

    wrapper.querySelectorAll('button[data-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        var step = parseInt(button.getAttribute('data-step'), 10);
        var min = parseInt(input.getAttribute('min') || '1', 10);
        var next = (parseInt(input.value, 10) || min) + step;
        input.value = next < min ? min : next;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  });

  /* ---------- Productgalerij ---------- */
  document.querySelectorAll('[data-gallery]').forEach(function (gallery) {
    var main = gallery.querySelector('[data-gallery-main]');
    if (!main) return;

    gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        main.src = thumb.getAttribute('data-full');
        main.srcset = '';
        main.alt = thumb.getAttribute('data-alt') || '';
        gallery.querySelectorAll('[data-gallery-thumb]').forEach(function (other) {
          other.setAttribute('aria-current', other === thumb ? 'true' : 'false');
        });
      });
    });
  });

  /* ---------- Variantkiezer ---------- */
  document.querySelectorAll('[data-variant-picker]').forEach(function (picker) {
    var dataEl = document.getElementById(picker.getAttribute('data-variants'));
    if (!dataEl) return;

    var variants;
    try {
      variants = JSON.parse(dataEl.textContent);
    } catch (error) {
      return;
    }

    var form = picker.closest('form');
    var idInput = form && form.querySelector('[data-variant-id]');
    var priceEl = document.querySelector('[data-variant-price]');
    var submit = form && form.querySelector('[data-add-to-cart]');
    var soldOutText = picker.getAttribute('data-sold-out-text') || 'Uitverkocht';
    var addText = picker.getAttribute('data-add-text') || 'In winkelwagen';

    function selectedOptions() {
      return Array.prototype.map.call(
        picker.querySelectorAll('[data-option-index]'),
        function (group) {
          var checked = group.querySelector('input:checked');
          return checked ? checked.value : null;
        }
      );
    }

    function matchVariant() {
      var chosen = selectedOptions();
      return variants.find(function (variant) {
        return chosen.every(function (value, index) {
          return value === null || variant.options[index] === value;
        });
      });
    }

    function update() {
      var variant = matchVariant();

      if (!variant) {
        if (submit) {
          submit.disabled = true;
          submit.textContent = soldOutText;
        }
        return;
      }

      if (idInput) idInput.value = variant.id;

      if (priceEl && variant.price_html) priceEl.innerHTML = variant.price_html;

      if (submit) {
        submit.disabled = !variant.available;
        submit.textContent = variant.available ? addText : soldOutText;
      }

      if (variant.featured_image) {
        var main = document.querySelector('[data-gallery-main]');
        if (main) {
          main.src = variant.featured_image;
          main.srcset = '';
        }
      }

      if (window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
    }

    picker.addEventListener('change', update);
    update();
  });

  /* ---------- Winkelwagen: regel verwijderen / aantal wijzigen ---------- */
  document.querySelectorAll('[data-cart-form]').forEach(function (form) {
    form.querySelectorAll('[data-cart-quantity]').forEach(function (input) {
      input.addEventListener('change', function () {
        form.submit();
      });
    });
  });

  /* ---------- Sorteren op de collectiepagina ---------- */
  document.querySelectorAll('[data-sort-select]').forEach(function (select) {
    select.addEventListener('change', function () {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', select.value);
      url.searchParams.delete('page');
      window.location.href = url.toString();
    });
  });
})();
