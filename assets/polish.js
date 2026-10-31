/* SCOPO — camada de polimento: parallax, progresso, navegação, motion.
   Roda depois de enhance.js. Nada aqui depende de bibliotecas externas. */
(function () {
  "use strict";
  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (html) n.innerHTML = html;
    return n;
  }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* ------------------------------------------------------------------
     Página atual (aceita /servicos, /servicos.html, index.html, /)
  ------------------------------------------------------------------ */
  function pageKey(path) {
    var p = (path || "").split("?")[0].split("#")[0];
    p = p.replace(/^\/+/, "").replace(/\.html$/, "").replace(/\/+$/, "");
    if (p === "" || p === "index") return "home";
    if (p === "projeto") return "portfolio"; // detalhe de projeto vive sob Portfólio
    return p;
  }
  var currentPage = pageKey(location.pathname);

  /* ------------------------------------------------------------------
     Header: altura para a gaveta mobile, menu hambúrguer
  ------------------------------------------------------------------ */
  var header = $(".site-header");
  var nav = $(".nav-links");
  var toggle = $(".nav-toggle");

  function setHeaderHeight() {
    if (header) root.style.setProperty("--header-h", header.offsetHeight + "px");
  }

  function closeNav() {
    if (!toggle) return;
    root.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
  }
  function openNav() {
    setHeaderHeight();
    root.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
  }
  function setupMenu() {
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      if (root.classList.contains("nav-open")) closeNav(); else openNav();
    });
    $$("a", nav).forEach(function (a) { a.addEventListener("click", closeNav); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("nav-open")) { closeNav(); toggle.focus(); }
    });
    window.addEventListener("resize", function () {
      setHeaderHeight();
      if (window.innerWidth > 900) closeNav();
    });
    if ("ResizeObserver" in window && header) new ResizeObserver(setHeaderHeight).observe(header);
    setHeaderHeight();
  }

  /* ------------------------------------------------------------------
     Indicador deslizante + item ativo
  ------------------------------------------------------------------ */
  function setupNavIndicator() {
    if (!nav) return;
    var links = $$(".navlink", nav);
    var active = null;
    links.forEach(function (a) {
      var key = pageKey(a.getAttribute("href"));
      if (key === currentPage) {
        active = a;
        a.classList.add("is-active");
        a.setAttribute("aria-current", "page");
      } else {
        a.classList.remove("is-active");
        a.style.color = ""; // remove a cor "ativa" gravada em linha no HTML
      }
    });
    if (reduce) return;
    var ind = el("span", "nav-indicator");
    ind.setAttribute("aria-hidden", "true");
    nav.appendChild(ind);
    nav.classList.add("has-indicator");

    function moveTo(a, instant) {
      if (!a) { ind.classList.remove("is-on"); return; }
      var nr = nav.getBoundingClientRect();
      var r = a.getBoundingClientRect();
      if (instant) ind.style.transition = "none";
      ind.style.width = r.width + "px";
      ind.style.transform = "translateX(" + (r.left - nr.left) + "px)";
      ind.classList.add("is-on");
      if (instant) { void ind.offsetWidth; ind.style.transition = ""; }
    }
    links.forEach(function (a) {
      a.addEventListener("mouseenter", function () { moveTo(a); });
      a.addEventListener("focus", function () { moveTo(a); });
    });
    nav.addEventListener("mouseleave", function () { moveTo(active); });
    nav.addEventListener("focusout", function () { moveTo(active); });
    window.addEventListener("resize", function () { moveTo(active, true); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { moveTo(active, true); });
    moveTo(active, true);
  }

  /* ------------------------------------------------------------------
     Skip link + landmark principal
  ------------------------------------------------------------------ */
  function setupSkipLink() {
    var content = header && header.nextElementSibling;
    if (!content) return;
    if (!content.id) content.id = "conteudo";
    content.setAttribute("tabindex", "-1");
    var skip = el("a", "skip-link");
    skip.href = "#" + content.id;
    skip.textContent = "Pular para o conteúdo";
    doc.body.insertBefore(skip, doc.body.firstChild);
  }

  /* ------------------------------------------------------------------
     Barra de progresso de leitura + voltar ao topo
  ------------------------------------------------------------------ */
  var progressFill = null;
  var useCssTimeline = !!(window.CSS && CSS.supports && CSS.supports("animation-timeline: scroll()"));
  var toTop = null;

  function setupProgress() {
    var bar = el("div", "scroll-progress");
    bar.setAttribute("aria-hidden", "true");
    progressFill = el("span");
    bar.appendChild(progressFill);
    doc.body.appendChild(bar);

    toTop = el("button", "to-top");
    toTop.type = "button";
    toTop.setAttribute("aria-label", "Voltar ao topo");
    toTop.innerHTML =
      '<svg class="ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/></svg>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    doc.body.appendChild(toTop);
  }

  /* ------------------------------------------------------------------
     Parallax em camadas (usa a propriedade `translate`, que convive com
     animações de `transform` — o motivo de os blobs não se mexerem antes)
  ------------------------------------------------------------------ */
  var layers = [];   // { el, f, kind }
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  var state = { sy: 0, ticking: false, running: false };
  var bgTexture = null;
  var suppressors = [];
  var floatingCta = null;

  function collectLayers() {
    layers = [];
    $$("[data-parallax]").forEach(function (n) {
      var f = parseFloat(n.getAttribute("data-parallax")) || 0;
      layers.push({ el: n, f: f, kind: "layer" });
    });
    // conteúdo do hero sobe devagar enquanto rola: sensação de profundidade
    $$(".hero-in").forEach(function (n) { layers.push({ el: n, f: 0.1, kind: "content" }); });
    $$(".hero-hud").forEach(function (n) { layers.push({ el: n, f: 0.04, kind: "content" }); });
  }

  function applyScroll() {
    var sy = window.pageYOffset || root.scrollTop || 0;
    state.sy = sy;
    state.ticking = false;

    var max = Math.max(1, root.scrollHeight - window.innerHeight);
    var p = clamp(sy / max, 0, 1);
    if (progressFill && !useCssTimeline) progressFill.style.transform = "scaleX(" + p.toFixed(4) + ")";
    if (toTop) {
      toTop.style.setProperty("--read", p.toFixed(4));
      toTop.classList.toggle("is-visible", sy > 700);
    }
    if (bgTexture) root.style.setProperty("--bgy", (-sy * 0.18).toFixed(1));
    if (!reduce) paintLayers();
  }

  function paintLayers() {
    var sy = state.sy;
    var limit = window.innerHeight * 1.2; // só mexe no hero enquanto ele é visível
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i];
      var y, x = 0;
      if (L.kind === "content") {
        y = Math.min(sy, limit) * L.f;
      } else {
        y = sy * L.f;
        x = pointer.x * L.f * 380; // movimento do mouse, proporcional à "profundidade"
        y += pointer.y * L.f * 260;
      }
      L.el.style.translate = x.toFixed(1) + "px " + y.toFixed(1) + "px";
    }
  }

  function pointerLoop() {
    // suaviza o seguimento do mouse (lerp) e para quando assenta
    pointer.x += (pointer.tx - pointer.x) * 0.08;
    pointer.y += (pointer.ty - pointer.y) * 0.08;
    paintLayers();
    if (Math.abs(pointer.tx - pointer.x) > 0.001 || Math.abs(pointer.ty - pointer.y) > 0.001) {
      requestAnimationFrame(pointerLoop);
    } else {
      state.running = false;
    }
  }

  function onScroll() {
    if (!state.ticking) { state.ticking = true; requestAnimationFrame(applyScroll); }
  }

  function setupParallax() {
    collectLayers();
    bgTexture = $(".bg-texture--grid");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (finePointer && !reduce && layers.some(function (l) { return l.kind === "layer"; })) {
      window.addEventListener("pointermove", function (e) {
        pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
        pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
        if (!state.running) { state.running = true; requestAnimationFrame(pointerLoop); }
      }, { passive: true });
    }
    applyScroll();
  }

  /* ------------------------------------------------------------------
     CTA flutuante some quando já existe outro botão de WhatsApp visível
  ------------------------------------------------------------------ */
  function setupFloatingCtaSuppress() {
    floatingCta = $("#js-floating-cta");
    if (!floatingCta || !("IntersectionObserver" in window)) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) visible.add(en.target); else visible.delete(en.target);
      });
      floatingCta.classList.toggle("is-suppressed", visible.size > 0);
    }, { threshold: 0.4 });
    $$("a[data-wa]").forEach(function (a) {
      if (floatingCta.contains(a)) return;
      io.observe(a);
    });
    var footer = $$(".scopo-root > div > div").pop();
    if (footer) io.observe(footer);
  }

  /* ------------------------------------------------------------------
     Reveal extra: seções sem data-reveal também entram em cena
  ------------------------------------------------------------------ */
  function setupExtraReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var wrap = header && header.parentElement;
    if (!wrap) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-revealed"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    Array.prototype.forEach.call(wrap.children, function (n) {
      if (n === header || n.hasAttribute("data-reveal")) return;
      if (n.offsetHeight && n.offsetHeight <= 6) return;                 // linhas decorativas
      if (n.querySelector(".hero-in, .hero-hud") || n.previousElementSibling === header) return; // hero
      if (n.nextElementSibling === null) { /* rodapé */ }
      n.setAttribute("data-reveal", "");
      io.observe(n);
    });
  }

  /* ------------------------------------------------------------------
     Magnético nos botões + brilho nos cards (ponteiro fino)
  ------------------------------------------------------------------ */
  function setupPointerFx() {
    if (!finePointer || reduce) return;
    var activeBtn = null;
    doc.addEventListener("pointermove", function (e) {
      var t = e.target;
      var card = t.closest && t.closest(".card");
      if (card) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      }
      var btn = t.closest && t.closest(".btn-primary, .btn-outline");
      if (btn) {
        var b = btn.getBoundingClientRect();
        var dx = (e.clientX - (b.left + b.width / 2)) / b.width;
        var dy = (e.clientY - (b.top + b.height / 2)) / b.height;
        btn.style.translate = (dx * 10).toFixed(1) + "px " + (dy * 6).toFixed(1) + "px";
        activeBtn = btn;
      }
      if (activeBtn && activeBtn !== btn) { activeBtn.style.translate = ""; activeBtn = null; }
    }, { passive: true });
    doc.addEventListener("pointerleave", function () {
      if (activeBtn) { activeBtn.style.translate = ""; activeBtn = null; }
    });
  }

  /* ------------------------------------------------------------------
     Contagem animada nos números da página Sobre
  ------------------------------------------------------------------ */
  function setupCountUp() {
    var nodes = $$('[data-text-key$="_number"]');
    if (!nodes.length || reduce || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var node = en.target;
        setTimeout(function () { countUp(node); }, 350); // espera os textos do CMS chegarem
      });
    }, { threshold: 0.6 });
    nodes.forEach(function (n) { io.observe(n); });

    function countUp(node) {
      var m = (node.textContent || "").trim().match(/^(\D*)(\d+)(.*)$/);
      if (!m) return;
      var pre = m[1], target = parseInt(m[2], 10), post = m[3];
      var t0 = performance.now(), dur = 1400;
      function tick(now) {
        var k = clamp((now - t0) / dur, 0, 1);
        var eased = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
        node.textContent = pre + Math.round(target * eased) + post;
        if (k < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }
  }

  /* ------------------------------------------------------------------
     Navegação fluida: pré-renderiza a próxima página ao passar o mouse
     (Speculation Rules API; Chrome/Edge — nos demais navegadores é ignorado)
  ------------------------------------------------------------------ */
  function setupSpeculation() {
    if (!(HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return;
    var s = doc.createElement("script");
    s.type = "speculationrules";
    s.textContent = JSON.stringify({
      prerender: [{
        where: { and: [{ href_matches: "/*" }, { not: { href_matches: "/admin*" } }, { not: { selector_matches: "[target=_blank]" } }] },
        eagerness: "moderate"
      }]
    });
    doc.head.appendChild(s);
  }

  /* ------------------------------------------------------------------ */
  function init() {
    setupMenu();
    setupNavIndicator();
    setupSkipLink();
    setupProgress();
    setupParallax();
    setupFloatingCtaSuppress();
    setupExtraReveal();
    setupPointerFx();
    setupCountUp();
    setupSpeculation();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();
