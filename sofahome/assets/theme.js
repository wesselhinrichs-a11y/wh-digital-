/* Sofahome — thema-interacties. Bewust klein gehouden: geen frameworks. */
(function () {
  'use strict';

  /* ---------- Aankondigingsbalk: rouleren ---------- */
  function maakBalk(bar) {
    var items = bar.querySelectorAll('.announcement__item');
    if (items.length < 2 || bar.getAttribute('data-klaar')) return;
    bar.setAttribute('data-klaar', 'true');

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
  }

  /* ---------- Voordelen: carrousel op telefoon ---------- */
  function maakCarrousel(wrap) {
    var track = wrap.querySelector('.usps__track');
    if (!track || wrap.getAttribute('data-klaar')) return;
    wrap.setAttribute('data-klaar', 'true');

    var items = track.querySelectorAll('.usp');
    var dots = wrap.querySelectorAll('.usps__dot');
    if (items.length < 2) return;

    var interval = parseInt(wrap.getAttribute('data-interval'), 10) || 4000;
    var rustig = window.matchMedia('(prefers-reduced-motion: reduce)');
    var timer = null;

    // Op desktop staat alles naast elkaar in een raster en valt er niets te
    // rollen. Dat is meteen de test of de carrousel actief moet zijn.
    function rolt() {
      return track.scrollWidth > track.clientWidth + 4;
    }

    function index() {
      if (!track.clientWidth) return 0;
      return Math.round(track.scrollLeft / track.clientWidth);
    }

    function markeer() {
      var huidig = index();
      dots.forEach(function (dot, n) {
        dot.classList.toggle('is-active', n === huidig);
      });
    }

    function volgende() {
      if (!rolt()) return;
      var n = (index() + 1) % items.length;
      track.scrollTo({
        left: n * track.clientWidth,
        // 'auto' zou terugvallen op de CSS-waarde, en die staat op smooth.
        behavior: rustig.matches ? 'instant' : 'smooth'
      });
    }

    function start() {
      if (timer || !rolt()) return;
      timer = setInterval(volgende, interval);
    }

    function stop() {
      clearInterval(timer);
      timer = null;
    }

    track.addEventListener('scroll', markeer, { passive: true });

    // Wie zelf swipet wil niet dat het onder z'n vinger vandaan schuift.
    track.addEventListener('pointerdown', stop);
    track.addEventListener('pointerup', start);
    // Alleen waar echt met een muis gewezen wordt. Op touch kan een tik een
    // mouseenter opleveren zonder dat er ooit een mouseleave volgt — dan zou
    // de carrousel na één aanraking voorgoed stilstaan.
    if (window.matchMedia('(hover: hover)').matches) {
      wrap.addEventListener('mouseenter', stop);
      wrap.addEventListener('mouseleave', start);
    }

    wrap.addEventListener('focusin', stop);
    wrap.addEventListener('focusout', start);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    });

    // Bij draaien van de telefoon klopt de breedte niet meer.
    window.addEventListener('resize', function () {
      stop();
      markeer();
      start();
    });

    start();
  }

  /* ---------- Aanzetten ---------- */
  function zetAan(root) {
    root.querySelectorAll('[data-announcement]').forEach(maakBalk);
    root.querySelectorAll('[data-usps]').forEach(maakCarrousel);
  }

  zetAan(document);

  // De theme-editor bouwt een sectie opnieuw op bij elke wijziging. De nieuwe
  // elementen zijn dan andere dan die hierboven, dus koppelen we opnieuw.
  document.addEventListener('shopify:section:load', function (event) {
    zetAan(event.target);
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
