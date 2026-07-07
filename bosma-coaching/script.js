/* ==========================================================================
   Bosma Coaching & Mediation — script.js
   Serene animaties: woord-fade in de hero, scroll-reveals, zelftekenende
   werkwijze-lijn, FAQ-accordeon en desktop-parallax.
   Respecteert prefers-reduced-motion volledig.
   ========================================================================== */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Zonder JS (of met reduced motion) blijft alles gewoon zichtbaar;
     de klasse js-anim activeert de animatie-styles in CSS. */
  if (!reduceMotion) {
    document.documentElement.classList.add("js-anim");
  }

  /* ---------- 1. Hero: koptekst fadet per woord in ---------- */

  var heroTitle = document.querySelector("[data-word-fade]");
  if (heroTitle && !reduceMotion) {
    var words = heroTitle.textContent.trim().split(/\s+/);
    heroTitle.textContent = "";
    words.forEach(function (word, i) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      span.style.setProperty("--d", (0.15 + i * 0.11).toFixed(2) + "s");
      heroTitle.appendChild(span);
      if (i < words.length - 1) {
        heroTitle.appendChild(document.createTextNode(" "));
      }
    });
  }

  /* ---------- 2. Scroll-reveals (eenmalig, gestaggerd) ---------- */

  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (!reduceMotion && "IntersectionObserver" in window && reveals.length) {
    /* Stagger: broertjes/zusjes binnen dezelfde ouder krijgen 100 ms extra
       vertraging per stuk (met een plafond, zodat niets traag aanvoelt). */
    var byParent = new Map();
    reveals.forEach(function (el) {
      var group = byParent.get(el.parentElement) || [];
      group.push(el);
      byParent.set(el.parentElement, group);
    });
    byParent.forEach(function (group) {
      group.forEach(function (el, i) {
        el.style.setProperty("--stagger", Math.min(i * 0.1, 0.5).toFixed(1) + "s");
      });
    });

    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });

    reveals.forEach(function (el) { revealObserver.observe(el); });
  } else {
    /* Fallback: alles direct tonen. */
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- 3. Werkwijze: lijn tekent zichzelf tijdens het scrollen ---------- */

  var stepsWrap = document.querySelector(".steps");
  var stepsSvg = document.querySelector(".steps-line");
  var stepsPath = document.getElementById("steps-path");

  if (stepsWrap && stepsSvg && stepsPath && !reduceMotion) {
    var pathLength = 0;

    var buildPath = function () {
      var wrapRect = stepsWrap.getBoundingClientRect();
      var nums = stepsWrap.querySelectorAll(".step-num");
      if (nums.length < 2 || wrapRect.width === 0) { return; }

      stepsSvg.setAttribute("viewBox", "0 0 " + wrapRect.width + " " + wrapRect.height);

      var points = Array.prototype.map.call(nums, function (num) {
        var r = num.getBoundingClientRect();
        return {
          x: r.left - wrapRect.left + r.width / 2,
          y: r.top - wrapRect.top + r.height / 2
        };
      });

      /* Zachte S-bochtjes tussen de stap-nummers. */
      var d = "M " + points[0].x + " " + points[0].y;
      for (var i = 1; i < points.length; i++) {
        var prev = points[i - 1];
        var curr = points[i];
        var midY = (prev.y + curr.y) / 2;
        var sway = (i % 2 === 1 ? 1 : -1) * 36;
        d += " C " + (prev.x + sway) + " " + midY + ", " + (curr.x + sway) + " " + midY + ", " + curr.x + " " + curr.y;
      }

      stepsPath.setAttribute("d", d);
      pathLength = stepsPath.getTotalLength();
      stepsPath.style.strokeDasharray = pathLength;
      stepsPath.style.strokeDashoffset = pathLength;
      drawProgress();
    };

    var drawProgress = function () {
      if (!pathLength) { return; }
      var rect = stepsWrap.getBoundingClientRect();
      /* De lijn begint te tekenen zodra de sectie het onderste kwart van
         het scherm binnenkomt, en is af als het einde daar voorbij is. */
      var startLine = window.innerHeight * 0.8;
      var progress = (startLine - rect.top) / (rect.height + window.innerHeight * 0.2);
      progress = Math.max(0, Math.min(1, progress));
      stepsPath.style.strokeDashoffset = pathLength * (1 - progress);
    };

    var lineTicking = false;
    window.addEventListener("scroll", function () {
      if (!lineTicking) {
        lineTicking = true;
        window.requestAnimationFrame(function () {
          drawProgress();
          lineTicking = false;
        });
      }
    }, { passive: true });

    window.addEventListener("resize", buildPath);
    /* Na fonts/layout nog eens meten, zodat de lijn exact klopt. */
    window.addEventListener("load", buildPath);
    buildPath();
  }

  /* ---------- 4. FAQ-accordeon ---------- */

  var faqButtons = document.querySelectorAll(".faq-question");
  faqButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var item = button.closest(".faq-item");
      var isOpen = item.classList.toggle("open");
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  });

  /* ---------- 5. Parallax op sfeerbeeld (alleen desktop) ---------- */

  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll("[data-parallax]"));
  var desktopQuery = window.matchMedia("(min-width: 900px)");

  if (parallaxEls.length && !reduceMotion) {
    var parallaxTicking = false;

    var applyParallax = function () {
      if (!desktopQuery.matches) {
        parallaxEls.forEach(function (el) { el.style.transform = ""; });
        return;
      }
      parallaxEls.forEach(function (el) {
        var rect = el.parentElement.getBoundingClientRect();
        var centerOffset = rect.top + rect.height / 2 - window.innerHeight / 2;
        /* Achtergrond beweegt ~20% langzamer dan de pagina. */
        el.style.transform = "translate3d(0, " + (centerOffset * 0.2).toFixed(1) + "px, 0)";
      });
    };

    window.addEventListener("scroll", function () {
      if (!parallaxTicking) {
        parallaxTicking = true;
        window.requestAnimationFrame(function () {
          applyParallax();
          parallaxTicking = false;
        });
      }
    }, { passive: true });

    desktopQuery.addEventListener("change", applyParallax);
    applyParallax();
  }
})();
