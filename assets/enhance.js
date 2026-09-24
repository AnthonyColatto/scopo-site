(function () {
  function bust(url) {
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
  }
  function fetchJSON(path) {
    return fetch(bust(path)).then(function (r) {
      if (!r.ok) throw new Error("failed to load " + path);
      return r.json();
    });
  }
  function getCache(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function setCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function applyTexture(settings) {
    var el = document.querySelector(".bg-texture");
    if (!el) return;
    el.classList.remove("bg-texture--grid", "bg-texture--dots", "bg-texture--none");
    var custom = settings && settings.textura_custom;
    if (custom) {
      // custom uploaded texture: tiles across the background, keeping the same
      // top/bottom vignette gradients used by the built-in grid/dots patterns
      el.style.background =
        "radial-gradient(ellipse 900px 500px at 50% -10%, color-mix(in srgb, var(--brand) 5%, transparent), transparent 70%), " +
        'url("' + custom + '") repeat, ' +
        "radial-gradient(ellipse 1400px 700px at 50% 110%, rgba(0,0,0,0.7), transparent 60%)";
      return;
    }
    el.style.background = "";
    var t = (settings && settings.texture) || "grid";
    el.classList.add("bg-texture--" + t);
  }

  var SETTINGS = {};
  function applyToggles(settings) {
    SETTINGS = settings || {};
    setupCustomClickSound(SETTINGS);

    var dotEl = document.getElementById("cursorDot");
    if (dotEl && SETTINGS.cursor_icon) {
      dotEl.textContent = "";
      dotEl.style.backgroundImage = "url(" + SETTINGS.cursor_icon + ")";
      dotEl.style.backgroundSize = "cover";
      dotEl.style.backgroundPosition = "center";
      dotEl.style.backgroundColor = "transparent";
    } else if (dotEl && SETTINGS.cursor_symbol) {
      dotEl.textContent = SETTINGS.cursor_symbol;
    }

    if (SETTINGS.custom_cursor === false) {
      var dot = document.getElementById("cursorDot");
      var ring = document.getElementById("cursorRing");
      if (dot) dot.style.display = "none";
      if (ring) ring.style.display = "none";
      if (!document.getElementById("scopo-cursor-off-style")) {
        var style = document.createElement("style");
        style.id = "scopo-cursor-off-style";
        style.textContent = "@media (hover:hover) and (pointer:fine){ .scopo-root{cursor:auto !important;} }";
        document.head.appendChild(style);
      }
    }
  }

  function applyTexts(texts) {
    if (!texts) return;
    document.querySelectorAll("[data-text-key]").forEach(function (el) {
      var key = el.getAttribute("data-text-key");
      if (texts[key] !== undefined && texts[key] !== null && texts[key] !== "") {
        el.textContent = texts[key];
      }
    });
    var titleEl = document.getElementById("js-hero-title");
    if (titleEl) {
      var main = texts && texts.home_hero_title ? texts.home_hero_title : titleEl.getAttribute("data-default-main");
      var hi = texts && texts.home_hero_highlight ? texts.home_hero_highlight : titleEl.getAttribute("data-default-highlight");
      titleEl.innerHTML = main + ' <span style="color:var(--brand);">' + hi + "</span>";
    }
  }

  function setupParallax() {
    var els = document.querySelectorAll("[data-parallax]");
    if (!els.length) return;
    var ticking = false;
    function apply() {
      var sy = window.scrollY || window.pageYOffset;
      els.forEach(function (el) {
        var factor = parseFloat(el.getAttribute("data-parallax")) || 0;
        el.style.transform = "translate3d(0," + (sy * factor).toFixed(1) + "px,0)";
      });
      ticking = false;
    }
    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(apply);
        ticking = true;
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    apply();
  }

  function setupHoverPreview() {
    // delegated (not bound at parse time) because project cards are rendered
    // later, asynchronously, from content/projects.json
    document.addEventListener(
      "mouseover",
      function (e) {
        var card = e.target.closest && e.target.closest(".card");
        if (!card) return;
        var v = card.querySelector(".thumb video");
        if (v) v.play().catch(function () {});
      },
      true
    );
    document.addEventListener(
      "mouseout",
      function (e) {
        var card = e.target.closest && e.target.closest(".card");
        if (!card) return;
        // only reset when the mouse actually left the card, not a child element
        if (card.contains(e.relatedTarget)) return;
        var v = card.querySelector(".thumb video");
        if (v) {
          v.pause();
          try { v.currentTime = 0; } catch (err) {}
        }
      },
      true
    );
  }

  var audioCtx;
  var customClickAudio = null;
  var customClickAudioSrc = null;
  // called whenever settings load/change so a newly-uploaded click sound
  // (or one that was removed) is picked up without a page reload
  function setupCustomClickSound(settings) {
    var src = settings && settings.click_sound;
    if (src) {
      if (src !== customClickAudioSrc) {
        customClickAudio = new Audio(src);
        customClickAudio.preload = "auto";
        customClickAudioSrc = src;
      }
    } else {
      customClickAudio = null;
      customClickAudioSrc = null;
    }
  }
  function playClickSound() {
    if (customClickAudio) {
      try {
        // cloneNode lets rapid clicks overlap instead of cutting each other off
        var a = customClickAudio.cloneNode();
        a.volume = 1;
        var p = a.play();
        if (p && p.catch) p.catch(function () {});
        return;
      } catch (e) {}
    }
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(420, audioCtx.currentTime + 0.09);
      g.gain.setValueAtTime(0.05, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 0.11);
    } catch (e) {}
  }
  function setupClickSound() {
    document.addEventListener("click", function (e) {
      if (SETTINGS.sound_enabled === false) return;
      var t = e.target.closest && e.target.closest(".btn-primary, .btn-outline, .card, .navlink, .logo-link");
      if (t) playClickSound();
    });
  }

  function setupFloatingCta() {
    var cta = document.getElementById("js-floating-cta");
    if (!cta) return;
    function onScroll() {
      if ((window.scrollY || window.pageYOffset) > 500) cta.classList.add("is-visible");
      else cta.classList.remove("is-visible");
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // hero "video editor" HUD: a running timecode, purely decorative
  // (a page can have more than one hero using the HUD, so it's a class)
  function setupHudTimecode() {
    var els = document.querySelectorAll(".js-hud-timecode");
    if (!els.length) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var start = performance.now();
    function pad(n) {
      return (n < 10 ? "0" : "") + n;
    }
    function tick() {
      var totalCs = Math.floor((performance.now() - start) / 10);
      var cs = totalCs % 100;
      var totalSec = Math.floor(totalCs / 100);
      var sec = totalSec % 60;
      var min = Math.floor(totalSec / 60);
      var text = pad(min) + ":" + pad(sec) + ":" + pad(cs);
      els.forEach(function (el) {
        el.textContent = text;
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // "Scene reveal" on scroll: sections fade/scale/blur in like cuts on a
  // timeline as they enter the viewport (see [data-reveal] in style.css).
  // Content rendered later by apply-content.js (projects, clients — anything
  // that arrives asynchronously from content/*.json, possibly more than once
  // if the fetch differs from cache) also carries [data-reveal], so this
  // keeps watching the DOM with a MutationObserver instead of scanning once;
  // otherwise anything inserted after this runs would be stuck at opacity:0.
  function setupScrollReveal() {
    var noIO = !("IntersectionObserver" in window);
    var io = noIO
      ? null
      : new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) {
                entry.target.classList.add("is-revealed");
                io.unobserve(entry.target);
              }
            });
          },
          { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
        );

    function observe(el) {
      if (el.__scopoRevealSeen) return;
      el.__scopoRevealSeen = true;
      if (noIO) {
        el.classList.add("is-revealed");
      } else {
        io.observe(el);
      }
    }

    document.querySelectorAll("[data-reveal]").forEach(observe);

    if ("MutationObserver" in window) {
      var mo = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes &&
            m.addedNodes.forEach(function (node) {
              if (node.nodeType !== 1) return;
              if (node.matches && node.matches("[data-reveal]")) observe(node);
              if (node.querySelectorAll) {
                node.querySelectorAll("[data-reveal]").forEach(observe);
              }
            });
        });
      });
      mo.observe(document.body, { childList: true, subtree: true });
    }
  }

  var cachedSettings = getCache("scopo_cache_settings");
  var cachedTexts = getCache("scopo_cache_texts");
  if (cachedSettings || cachedTexts) {
    applyTexture(cachedSettings);
    applyToggles(cachedSettings);
    applyTexts(cachedTexts);
  }

  Promise.all([
    fetchJSON("content/settings.json").catch(function () { return null; }),
    fetchJSON("content/texts.json").catch(function () { return null; }),
  ]).then(function (results) {
    var settings = results[0], texts = results[1];
    applyTexture(settings);
    applyToggles(settings);
    applyTexts(texts);
    if (settings) setCache("scopo_cache_settings", settings);
    if (texts) setCache("scopo_cache_texts", texts);
  });

  setupParallax();
  setupHoverPreview();
  setupClickSound();
  setupFloatingCta();
  setupHudTimecode();
  setupScrollReveal();
})();
