/* Quadro livre do Fluxo (estilo Figma/FigJam): formas, textos, notas, linhas e setas que grudam nas formas,
   lápis, imagens, cores, zoom e navegação. Usado na aba Mapa mental (mapas do tipo "livre").
   QuadroLivre.montar(el, doc, opts) → controle { atualizar(doc), ocupado(), destruir() }
   opts: { podeEditar, onChange(els), upload(file) → Promise(meta), url(meta) → Promise(url), toast(msg) } */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var CORES = ["#F5DF00", "#FFFFFF", "#1E1E1E", "#3A3A3A", "#B69CFF", "#5CC8FF", "#3DDC84", "#FF9F43", "#FF7AC6", "#FF5C5C", "#FFF3A6", "#C9F2D8", "#CFE8FF", "transparent"];
  var NOTAS = ["#FFF3A6", "#FFD6A5", "#C9F2D8", "#CFE8FF", "#E4D7FF", "#FFD1E8"];
  var FERR = [["sel", "Selecionar", "V", '<path d="M5 3l14 8-6 2-3 6z"/>'], ["mao", "Mover a tela", "H", '<path d="M8 13V5.5a1.5 1.5 0 013 0V12m0-1.5V4a1.5 1.5 0 013 0v7m0-5.5a1.5 1.5 0 013 0V13m0-4.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-2a6 6 0 01-5-2.7L4.6 15a1.5 1.5 0 012.4-1.8L8 14"/>'],
    ["rect", "Retângulo", "R", '<rect x="4" y="5" width="16" height="14" rx="2"/>'], ["elipse", "Círculo", "O", '<ellipse cx="12" cy="12" rx="8" ry="7"/>'], ["losango", "Losango (decisão)", "D", '<path d="M12 3l9 9-9 9-9-9z"/>'],
    ["texto", "Texto", "T", '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'], ["nota", "Nota adesiva", "N", '<path d="M4 4h16v11l-5 5H4z"/><path d="M15 20v-5h5"/>'],
    ["linha", "Linha", "L", '<path d="M5 19L19 5"/>'], ["seta", "Seta", "A", '<path d="M5 19L19 5M10 5h9v9"/>'], ["lapis", "Lápis", "P", '<path d="M4 20l4-1L19 8l-3-3L5 16z"/>'], ["img", "Imagem", "I", '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-8 8"/>']];
  function uid() { return Math.random().toString(36).slice(2, 10); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function el(tag, at) { var e = document.createElementNS(NS, tag); Object.keys(at || {}).forEach(function (k) { if (at[k] != null) e.setAttribute(k, at[k]); }); return e; }
  function caixa(e) { if (e.t === "linha" || e.t === "seta" || e.t === "lapis") return null; return { x: e.x, y: e.y, w: e.w, h: e.h }; }
  function claro(c) { if (!c || c === "transparent" || c[0] !== "#") return false; var n = parseInt(c.slice(1, 7), 16); return ((n >> 16) * .3 + (n >> 8 & 255) * .59 + (n & 255) * .11) > 150; }

  function montar(host, doc, opts) {
    opts = opts || {};
    var els = clone(doc.els || []), pode = !!opts.podeEditar;
    var cam = { x: 0, y: 0, z: 1 }, ferr = "sel", sel = [], hist = [], fut = [], ultimo = JSON.stringify(els), ocupado = false, editando = null, clip = null, urls = {};
    host.innerHTML =
      '<div class="ql">' +
        (pode ? '<div class="ql-tools">' + FERR.map(function (f) { return '<button data-f="' + f[0] + '" title="' + f[1] + " (" + f[2] + ')"><svg viewBox="0 0 24 24">' + f[3] + "</svg></button>"; }).join("") + "</div>" : "") +
        '<div class="ql-stage" tabindex="0"><svg class="ql-svg"><defs>' +
          '<marker id="qlSeta" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker>' +
          '<filter id="qlSombra" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-opacity=".28"/></filter>' +
        '</defs><g class="ql-cam"><g class="ql-els"></g><g class="ql-selg"></g></g></svg><textarea class="ql-edit" hidden></textarea></div>' +
        '<div class="ql-props" hidden></div>' +
        '<div class="ql-zoom"><button data-z="out" title="Diminuir">−</button><span class="ql-zl">100%</span><button data-z="in" title="Aumentar">+</button><button data-z="fit" title="Ver tudo">Ver tudo</button>' + (pode ? '<button data-z="undo" title="Desfazer (Ctrl+Z)">↶</button><button data-z="redo" title="Refazer (Ctrl+Y)">↷</button>' : "") + '<button data-z="png" title="Baixar imagem do quadro">PNG</button></div>' +
        '<div class="ql-dica">' + (pode ? "Escolha uma ferramenta e arraste no quadro. Dois cliques escrevem dentro. Espaço + arrastar (ou botão do meio) move a tela; Ctrl + rolar dá zoom. Ligue formas com Linha ou Seta saindo de uma e soltando na outra." : "Arraste para mover a tela e role para dar zoom.") + "</div>" +
      "</div>";
    var root = host.firstChild, stage = root.querySelector(".ql-stage"), svg = root.querySelector(".ql-svg"), gcam = root.querySelector(".ql-cam"), gels = root.querySelector(".ql-els"), gsel = root.querySelector(".ql-selg"), props = root.querySelector(".ql-props"), ta = root.querySelector(".ql-edit");

    function porId(id) { return els.find(function (e) { return e.id === id; }); }
    function mudou(registrar) {
      var s = JSON.stringify(els);
      if (s === ultimo) return;
      if (registrar !== false) { hist.push(ultimo); if (hist.length > 100) hist.shift(); fut = []; }
      ultimo = s; if (opts.onChange) opts.onChange(clone(els));
    }
    function desfazer() { if (!hist.length) return; fut.push(ultimo); els = JSON.parse(hist.pop()); ultimo = JSON.stringify(els); sel = sel.filter(porId); desenha(); if (opts.onChange) opts.onChange(clone(els)); }
    function refazer() { if (!fut.length) return; hist.push(ultimo); els = JSON.parse(fut.pop()); ultimo = JSON.stringify(els); desenha(); if (opts.onChange) opts.onChange(clone(els)); }

    /* ---------- câmera ---------- */
    function aplicaCam() {
      gcam.setAttribute("transform", "translate(" + cam.x + "," + cam.y + ") scale(" + cam.z + ")");
      var g = 24 * cam.z; stage.style.backgroundSize = g + "px " + g + "px"; stage.style.backgroundPosition = cam.x + "px " + cam.y + "px";
      root.querySelector(".ql-zl").textContent = Math.round(cam.z * 100) + "%";
      desenhaSel(); posEdit();
    }
    function mundo(ev) { var r = stage.getBoundingClientRect(); return { x: (ev.clientX - r.left - cam.x) / cam.z, y: (ev.clientY - r.top - cam.y) / cam.z }; }
    function zoomEm(f, px, py) { if (px == null) { px = stage.clientWidth / 2; py = stage.clientHeight / 2; } var nz = Math.max(.1, Math.min(5, cam.z * f)), k = nz / cam.z; cam.x = px - (px - cam.x) * k; cam.y = py - (py - cam.y) * k; cam.z = nz; aplicaCam(); }
    function limites(lista) {
      var b = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
      lista.forEach(function (e) { var p = pontos(e); p.forEach(function (q) { b.x1 = Math.min(b.x1, q.x); b.y1 = Math.min(b.y1, q.y); b.x2 = Math.max(b.x2, q.x); b.y2 = Math.max(b.y2, q.y); }); });
      return b;
    }
    function verTudo() {
      if (!els.length) { cam = { x: stage.clientWidth / 2, y: stage.clientHeight / 2, z: 1 }; aplicaCam(); return; }
      var b = limites(els), W = stage.clientWidth || 800, H = stage.clientHeight || 500, m = 60;
      var z = Math.max(.1, Math.min(1.5, (W - 2 * m) / Math.max(b.x2 - b.x1, 1), (H - 2 * m) / Math.max(b.y2 - b.y1, 1)));
      cam = { z: z, x: W / 2 - (b.x1 + b.x2) / 2 * z, y: H / 2 - (b.y1 + b.y2) / 2 * z }; aplicaCam();
    }

    /* ---------- geometria das linhas ---------- */
    function centro(e) { return { x: e.x + e.w / 2, y: e.y + e.h / 2 }; }
    function borda(e, alvo) { // ponto na borda da forma na direção do alvo
      var c = centro(e), dx = alvo.x - c.x, dy = alvo.y - c.y; if (!dx && !dy) return c;
      if (e.t === "elipse") { var a = e.w / 2, b = e.h / 2, t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b)); return { x: c.x + dx * t, y: c.y + dy * t }; }
      if (e.t === "losango") { var t2 = 1 / (Math.abs(dx) / (e.w / 2) + Math.abs(dy) / (e.h / 2)); return { x: c.x + dx * t2, y: c.y + dy * t2 }; }
      var sx = (e.w / 2) / Math.abs(dx || 1e-9), sy = (e.h / 2) / Math.abs(dy || 1e-9), s = Math.min(sx, sy); return { x: c.x + dx * s, y: c.y + dy * s };
    }
    function pontaLinha(l) {
      var A = l.a && porId(l.a), B = l.b && porId(l.b);
      var p1 = A ? centro(A) : { x: l.x1, y: l.y1 }, p2 = B ? centro(B) : { x: l.x2, y: l.y2 };
      if (A) p1 = borda(A, B ? centro(B) : p2); if (B) p2 = borda(B, A ? centro(A) : p1);
      return [p1, p2];
    }
    function pontos(e) {
      if (e.t === "linha" || e.t === "seta") return pontaLinha(e);
      if (e.t === "lapis") return (e.pts || []).map(function (p) { return { x: p[0], y: p[1] }; });
      return [{ x: e.x, y: e.y }, { x: e.x + e.w, y: e.y + e.h }];
    }

    /* ---------- desenho ---------- */
    function texto(e, x, y, w, h) {
      var fo = el("foreignObject", { x: x, y: y, width: Math.max(w, 1), height: Math.max(h, 1) });
      var d = document.createElement("div"); d.className = "ql-tx";
      var cor = e.fc || (e.t === "texto" ? "#F2F2F2" : claro(e.fill) || e.t === "nota" ? "#141414" : "#F2F2F2");
      d.style.cssText = "color:" + cor + ";font-size:" + (e.fs || 18) + "px;font-weight:" + (e.b ? 700 : 400) + ";text-align:" + (e.al || (e.t === "texto" ? "left" : "center")) + ";justify-content:" + (e.t === "texto" ? "flex-start" : "center") + ";font-style:" + (e.i ? "italic" : "normal");
      d.textContent = e.txt || ""; fo.appendChild(d); return fo;
    }
    function desenha() {
      gels.innerHTML = "";
      els.forEach(function (e) {
        var g = el("g", { "data-id": e.id, opacity: e.op == null ? 1 : e.op, class: "ql-el" + (e.trava ? " trava" : "") }), s = e.stroke || "none", sw = e.sw == null ? 2 : e.sw;
        if (e.t === "rect" || e.t === "nota") g.appendChild(el("rect", { x: e.x, y: e.y, width: Math.max(e.w, 1), height: Math.max(e.h, 1), rx: e.t === "nota" ? 4 : e.r || 0, fill: e.fill || "#fff", stroke: e.t === "nota" ? "none" : s, "stroke-width": sw, filter: e.t === "nota" || e.sombra ? "url(#qlSombra)" : null }));
        else if (e.t === "elipse") g.appendChild(el("ellipse", { cx: e.x + e.w / 2, cy: e.y + e.h / 2, rx: Math.abs(e.w / 2), ry: Math.abs(e.h / 2), fill: e.fill || "#fff", stroke: s, "stroke-width": sw, filter: e.sombra ? "url(#qlSombra)" : null }));
        else if (e.t === "losango") g.appendChild(el("polygon", { points: [[e.x + e.w / 2, e.y], [e.x + e.w, e.y + e.h / 2], [e.x + e.w / 2, e.y + e.h], [e.x, e.y + e.h / 2]].join(" "), fill: e.fill || "#fff", stroke: s, "stroke-width": sw, filter: e.sombra ? "url(#qlSombra)" : null }));
        else if (e.t === "img") { var im = el("image", { x: e.x, y: e.y, width: Math.max(e.w, 1), height: Math.max(e.h, 1), preserveAspectRatio: "none" }); g.appendChild(im); if (e.arq) carregaImg(e, im); if (e.stroke && e.stroke !== "none") g.appendChild(el("rect", { x: e.x, y: e.y, width: e.w, height: e.h, fill: "none", stroke: e.stroke, "stroke-width": sw })); }
        else if (e.t === "linha" || e.t === "seta") {
          var p = pontaLinha(e), d = "M" + p[0].x + " " + p[0].y + (e.curva ? " Q" + ((p[0].x + p[1].x) / 2 + (p[1].y - p[0].y) * .25) + " " + ((p[0].y + p[1].y) / 2 - (p[1].x - p[0].x) * .25) + " " : " L") + p[1].x + " " + p[1].y;
          g.appendChild(el("path", { d: d, fill: "none", stroke: "transparent", "stroke-width": Math.max(14, sw + 10) }));
          g.appendChild(el("path", { d: d, fill: "none", stroke: e.stroke || "#F2F2F2", "stroke-width": sw, "stroke-dasharray": e.trac ? sw * 3 + " " + sw * 2.5 : null, "stroke-linecap": "round", "marker-end": e.t === "seta" ? "url(#qlSeta)" : null, "marker-start": e.t === "seta" && e.dupla ? "url(#qlSeta)" : null }));
          if (e.txt) { var mx = (p[0].x + p[1].x) / 2, my = (p[0].y + p[1].y) / 2, tw = Math.max(80, (e.txt.length * (e.fs || 14) * .6) + 16); g.appendChild(el("rect", { x: mx - tw / 2, y: my - (e.fs || 14) * .9, width: tw, height: (e.fs || 14) * 1.8, rx: 4, fill: "#141414" })); g.appendChild(texto(Object.assign({}, e, { fc: e.fc || "#F2F2F2", fs: e.fs || 14 }), mx - tw / 2, my - (e.fs || 14) * .9, tw, (e.fs || 14) * 1.8)); }
        }
        else if (e.t === "lapis") { var pts = e.pts || []; g.appendChild(el("path", { d: pts.map(function (q, i) { return (i ? "L" : "M") + q[0] + " " + q[1]; }).join(" "), fill: "none", stroke: e.stroke || "#F5DF00", "stroke-width": sw || 3, "stroke-linecap": "round", "stroke-linejoin": "round" })); }
        if (e.t !== "linha" && e.t !== "seta" && e.t !== "lapis" && e.t !== "img" && editando !== e.id) { var pd = e.t === "texto" ? 2 : Math.min(14, e.w * .08); g.appendChild(texto(e, e.x + pd, e.y + pd, e.w - 2 * pd, e.h - 2 * pd)); }
        gels.appendChild(g);
      });
      desenhaSel(); painel();
    }
    function carregaImg(e, im) {
      var k = e.arq && (e.arq.ref || e.arq.url); if (!k) return;
      if (urls[k]) { im.setAttribute("href", urls[k]); return; }
      if (opts.url) opts.url(e.arq).then(function (u) { urls[k] = u; im.setAttribute("href", u); }).catch(function () {});
    }
    function desenhaSel() {
      gsel.innerHTML = ""; if (!sel.length) return;
      var hs = 9 / cam.z, sw = 1.5 / cam.z;
      if (sel.length === 1) {
        var e = porId(sel[0]); if (!e) return;
        if (e.t === "linha" || e.t === "seta") { pontaLinha(e).forEach(function (p, i) { gsel.appendChild(el("circle", { cx: p.x, cy: p.y, r: hs * .7, fill: "#fff", stroke: "#F5DF00", "stroke-width": sw * 1.5, "data-h": i ? "p2" : "p1", class: "ql-h" })); }); return; }
        var b = e.t === "lapis" ? (function () { var l = limites([e]); return { x: l.x1, y: l.y1, w: l.x2 - l.x1, h: l.y2 - l.y1 }; })() : caixa(e);
        gsel.appendChild(el("rect", { x: b.x, y: b.y, width: b.w, height: b.h, fill: "none", stroke: "#F5DF00", "stroke-width": sw, "pointer-events": "none" }));
        if (e.t === "lapis" || e.trava) return;
        [["nw", b.x, b.y], ["n", b.x + b.w / 2, b.y], ["ne", b.x + b.w, b.y], ["e", b.x + b.w, b.y + b.h / 2], ["se", b.x + b.w, b.y + b.h], ["s", b.x + b.w / 2, b.y + b.h], ["sw", b.x, b.y + b.h], ["w", b.x, b.y + b.h / 2]].forEach(function (h) {
          gsel.appendChild(el("rect", { x: h[1] - hs / 2, y: h[2] - hs / 2, width: hs, height: hs, rx: 2 / cam.z, fill: "#fff", stroke: "#F5DF00", "stroke-width": sw, "data-h": h[0], class: "ql-h ql-h-" + h[0] }));
        });
        return;
      }
      var l = limites(sel.map(porId).filter(Boolean));
      gsel.appendChild(el("rect", { x: l.x1 - 4 / cam.z, y: l.y1 - 4 / cam.z, width: l.x2 - l.x1 + 8 / cam.z, height: l.y2 - l.y1 + 8 / cam.z, fill: "rgba(245,223,0,.05)", stroke: "#F5DF00", "stroke-width": sw, "stroke-dasharray": 4 / cam.z, "pointer-events": "none" }));
    }

    /* ---------- painel de propriedades ---------- */
    function painel() {
      if (!pode || !sel.length || editando) { props.hidden = true; return; }
      var es = sel.map(porId).filter(Boolean); if (!es.length) { props.hidden = true; return; }
      var e = es[0], linha = es.every(function (x) { return x.t === "linha" || x.t === "seta" || x.t === "lapis"; }), temTx = es.some(function (x) { return x.t !== "lapis" && x.t !== "img"; });
      var sw = function (key, lista) { return '<div class="ql-sw">' + lista.map(function (c) { return '<button data-p="' + key + '" data-v="' + c + '" title="' + c + '" class="' + (c === "transparent" ? "tr" : "") + ((e[key] || "") === c ? " on" : "") + '" style="background:' + (c === "transparent" ? "transparent" : c) + '"></button>'; }).join("") + '<input type="color" data-pc="' + key + '" value="' + (/^#[0-9a-f]{6}$/i.test(e[key] || "") ? e[key] : "#ffffff") + '" title="Outra cor"></div>'; };
      var h = "";
      if (!linha && e.t !== "texto" && e.t !== "img") h += '<div class="ql-pl">Preenchimento</div>' + sw("fill", e.t === "nota" ? NOTAS.concat(["#FFFFFF"]) : CORES);
      if (e.t !== "nota") h += '<div class="ql-pl">' + (linha ? "Cor da linha" : "Borda") + "</div>" + sw("stroke", linha ? CORES.slice(0, -1) : CORES.concat(["none"]).filter(function (c, i, a) { return a.indexOf(c) === i; }).filter(function (c) { return c !== "transparent"; }).concat(["none"]).filter(function (c, i, a) { return a.indexOf(c) === i; }));
      if (e.t !== "nota" && e.t !== "texto") h += '<div class="ql-pl">Espessura</div><div class="ql-row">' + [1, 2, 4, 8].map(function (v) { return '<button data-p="sw" data-v="' + v + '" class="' + ((e.sw == null ? 2 : e.sw) === v ? "on" : "") + '">' + v + "</button>"; }).join("") + "</div>";
      if (temTx) h += '<div class="ql-pl">Texto</div><div class="ql-row">' + [12, 16, 20, 28, 40, 64].map(function (v) { return '<button data-p="fs" data-v="' + v + '" class="' + ((e.fs || 18) === v ? "on" : "") + '">' + v + "</button>"; }).join("") + '</div><div class="ql-row"><button data-t="b" class="' + (e.b ? "on" : "") + '"><b>N</b></button><button data-t="i" class="' + (e.i ? "on" : "") + '"><i>I</i></button><button data-p="al" data-v="left" class="' + (e.al === "left" ? "on" : "") + '">≡ esq.</button><button data-p="al" data-v="center" class="' + ((e.al || (e.t === "texto" ? "left" : "center")) === "center" ? "on" : "") + '">≡ centro</button></div>' + sw("fc", ["#141414", "#F2F2F2", "#F5DF00", "#5CC8FF", "#FF5C5C", "#3DDC84"]);
      if (e.t === "rect") h += '<div class="ql-pl">Cantos</div><div class="ql-row">' + [0, 8, 16, 999].map(function (v) { return '<button data-p="r" data-v="' + v + '" class="' + ((e.r || 0) === v ? "on" : "") + '">' + (v === 999 ? "pílula" : v) + "</button>"; }).join("") + "</div>";
      if (e.t === "linha" || e.t === "seta") h += '<div class="ql-row"><button data-t="trac" class="' + (e.trac ? "on" : "") + '">tracejada</button><button data-t="curva" class="' + (e.curva ? "on" : "") + '">curva</button>' + (e.t === "seta" ? '<button data-t="dupla" class="' + (e.dupla ? "on" : "") + '">2 pontas</button>' : "") + "</div>";
      if (!linha && e.t !== "texto") h += '<div class="ql-row"><button data-t="sombra" class="' + (e.sombra || e.t === "nota" ? "on" : "") + '">sombra</button></div>';
      h += '<div class="ql-pl">Opacidade</div><input type="range" min="10" max="100" value="' + Math.round((e.op == null ? 1 : e.op) * 100) + '" data-op>' +
        '<div class="ql-row ql-acts"><button data-a="frente" title="Trazer para frente">↑ frente</button><button data-a="tras" title="Mandar para trás">↓ trás</button><button data-a="dup" title="Ctrl+D">duplicar</button><button data-a="trava">' + (e.trava ? "destravar" : "travar") + '</button><button data-a="del" class="dan" title="Delete">excluir</button></div>';
      props.innerHTML = h; props.hidden = false;
    }
    props.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return; var es = sel.map(porId).filter(Boolean);
      if (b.dataset.p) { var v = b.dataset.v; if (["sw", "fs", "r"].indexOf(b.dataset.p) >= 0) v = +v; es.forEach(function (e) { e[b.dataset.p] = v; }); }
      else if (b.dataset.t) { var nv = !es[0][b.dataset.t]; es.forEach(function (e) { e[b.dataset.t] = nv; }); }
      else if (b.dataset.a) return acao(b.dataset.a);
      mudou(); desenha();
    });
    props.addEventListener("input", function (ev) {
      var t = ev.target, es = sel.map(porId).filter(Boolean);
      if (t.dataset.pc) { es.forEach(function (e) { e[t.dataset.pc] = t.value; }); desenha(); }
      if (t.hasAttribute("data-op")) { es.forEach(function (e) { e.op = +t.value / 100; }); desenha(); }
    });
    props.addEventListener("change", function () { mudou(); });

    function acao(a) {
      var es = sel.map(porId).filter(Boolean); if (!es.length) return;
      if (a === "del") { var ids = sel.slice(); els = els.filter(function (e) { return ids.indexOf(e.id) < 0; }); els.forEach(function (l) { if (ids.indexOf(l.a) >= 0) { var p = pontaLinha(l); l.x1 = p[0].x; l.y1 = p[0].y; l.a = null; } if (ids.indexOf(l.b) >= 0) { var q = pontaLinha(l); l.x2 = q[1].x; l.y2 = q[1].y; l.b = null; } }); sel = []; }
      if (a === "dup") { sel = duplicar(es, 24); }
      if (a === "frente") es.forEach(function (e) { els.splice(els.indexOf(e), 1); els.push(e); });
      if (a === "tras") es.slice().reverse().forEach(function (e) { els.splice(els.indexOf(e), 1); els.unshift(e); });
      if (a === "trava") { var t = !es[0].trava; es.forEach(function (e) { e.trava = t; }); }
      mudou(); desenha();
    }
    function duplicar(es, d) {
      var mapa = {}, novos = es.map(function (e) { var n = clone(e); n.id = uid(); mapa[e.id] = n.id; mover(n, d, d); return n; });
      novos.forEach(function (n) { if (n.a && mapa[n.a]) n.a = mapa[n.a]; else if (n.a) { n.a = null; } if (n.b && mapa[n.b]) n.b = mapa[n.b]; else if (n.b) n.b = null; });
      els = els.concat(novos); return novos.map(function (n) { return n.id; });
    }
    function mover(e, dx, dy) {
      if (e.t === "lapis") e.pts = (e.pts || []).map(function (p) { return [p[0] + dx, p[1] + dy]; });
      else if (e.t === "linha" || e.t === "seta") { if (!e.a) { e.x1 += dx; e.y1 += dy; } if (!e.b) { e.x2 += dx; e.y2 += dy; } }
      else { e.x += dx; e.y += dy; }
    }

    /* ---------- edição de texto ---------- */
    function posEdit() {
      if (!editando) return; var e = porId(editando); if (!e) return;
      var p = e.t === "linha" || e.t === "seta" ? (function () { var q = pontaLinha(e); return { x: (q[0].x + q[1].x) / 2 - 90, y: (q[0].y + q[1].y) / 2 - 18, w: 180, h: 36 }; })() : caixa(e);
      ta.style.left = (cam.x + p.x * cam.z) + "px"; ta.style.top = (cam.y + p.y * cam.z) + "px"; ta.style.width = Math.max(60, p.w * cam.z) + "px"; ta.style.height = Math.max(30, p.h * cam.z) + "px";
      ta.style.fontSize = (e.fs || 18) * cam.z + "px"; ta.style.textAlign = e.al || (e.t === "texto" ? "left" : "center"); ta.style.fontWeight = e.b ? 700 : 400;
    }
    function editar(id) {
      if (!pode) return; var e = porId(id); if (!e || e.t === "lapis" || e.t === "img") return;
      editando = id; ocupado = true; ta.hidden = false; ta.value = e.txt || ""; desenha(); posEdit(); ta.focus(); ta.select();
    }
    function fimEdit(salvar) {
      if (!editando) return; var e = porId(editando);
      if (e && salvar) { e.txt = ta.value; if (e.t === "texto") { var linhas = (ta.value.split("\n").length) || 1; e.h = Math.max(e.h, linhas * (e.fs || 18) * 1.35 + 6); } if (e.t === "texto" && !e.txt.trim()) els = els.filter(function (x) { return x !== e; }); }
      editando = null; ocupado = false; ta.hidden = true; mudou(); desenha(); stage.focus();
    }
    ta.addEventListener("keydown", function (ev) { ev.stopPropagation(); if (ev.key === "Escape") { ev.preventDefault(); fimEdit(true); } if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); fimEdit(true); } });
    ta.addEventListener("blur", function () { fimEdit(true); });

    /* ---------- ferramentas ---------- */
    function setFerr(f) {
      ferr = f; $$(".ql-tools button").forEach(function (b) { b.classList.toggle("on", b.dataset.f === f); });
      stage.dataset.f = f;
      if (f === "img") { escolherImg(); setFerr("sel"); }
    }
    function $$(s) { return Array.prototype.slice.call(root.querySelectorAll(s)); }
    function escolherImg(pos) {
      var i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.multiple = true;
      i.onchange = function () { Array.prototype.forEach.call(i.files, function (f, n) { addImg(f, pos ? { x: pos.x + n * 30, y: pos.y + n * 30 } : null); }); };
      i.click();
    }
    function addImg(f, pos) {
      if (!opts.upload) return;
      var c = pos || { x: (stage.clientWidth / 2 - cam.x) / cam.z - 150, y: (stage.clientHeight / 2 - cam.y) / cam.z - 100 };
      var im = new Image(), u = URL.createObjectURL(f);
      im.onload = function () {
        var w = Math.min(420, im.naturalWidth), h = w * im.naturalHeight / im.naturalWidth;
        var e = { id: uid(), t: "img", x: c.x, y: c.y, w: w, h: h, arq: null };
        els.push(e); sel = [e.id]; desenha();
        opts.upload(f).then(function (meta) { if (!meta) throw 0; e.arq = meta; urls[meta.ref || meta.url] = u; mudou(); desenha(); }).catch(function () { els = els.filter(function (x) { return x !== e; }); sel = []; desenha(); if (opts.toast) opts.toast("Não consegui enviar a imagem."); });
      };
      im.src = u;
    }
    if (pode) root.querySelector(".ql-tools").addEventListener("click", function (ev) { var b = ev.target.closest("[data-f]"); if (b) setFerr(b.dataset.f); });
    root.querySelector(".ql-zoom").addEventListener("click", function (ev) {
      var b = ev.target.closest("[data-z]"); if (!b) return; var z = b.dataset.z;
      if (z === "in") zoomEm(1.2); if (z === "out") zoomEm(1 / 1.2); if (z === "fit") verTudo(); if (z === "undo") desfazer(); if (z === "redo") refazer(); if (z === "png") exportarPNG();
    });

    /* ---------- ponteiro ---------- */
    var arr = null, espaco = false;
    function alvo(ev) { var g = ev.target.closest && ev.target.closest(".ql-el"); return g ? porId(g.dataset.id) : null; }
    function formaEm(p, exceto) { for (var i = els.length - 1; i >= 0; i--) { var e = els[i]; if (e === exceto || !caixa(e) || e.t === "texto") continue; if (p.x >= e.x && p.x <= e.x + e.w && p.y >= e.y && p.y <= e.y + e.h) return e; } return null; }
    var ultClique = { t: 0, x: 0, y: 0 };
    stage.addEventListener("pointerdown", function (ev) {
      if (editando) return;
      var agora = Date.now(), duplo = ev.button === 0 && agora - ultClique.t < 380 && Math.abs(ev.clientX - ultClique.x) < 6 && Math.abs(ev.clientY - ultClique.y) < 6;
      ultClique = { t: duplo ? 0 : agora, x: ev.clientX, y: ev.clientY };
      if (duplo && (ferr === "sel" || !pode)) { ev.preventDefault(); cliqueDuplo(ev); return; }
      stage.focus(); var p = mundo(ev), h = ev.target.getAttribute && ev.target.getAttribute("data-h");
      try { stage.setPointerCapture(ev.pointerId); } catch (e) {}
      if (ev.button === 1 || espaco || ferr === "mao" || !pode) { arr = { t: "pan", x: ev.clientX, y: ev.clientY, cx: cam.x, cy: cam.y }; stage.classList.add("pan"); return; }
      if (h) { var e0 = porId(sel[0]); arr = { t: h === "p1" || h === "p2" ? "ponta" : "res", h: h, e: e0, p0: p, o: clone(e0) }; ocupado = true; return; }
      if (ferr === "sel") {
        var e = alvo(ev);
        if (e && e.trava && sel.indexOf(e.id) < 0) e = null;
        if (e) {
          if (ev.shiftKey) { var i = sel.indexOf(e.id); if (i >= 0) sel.splice(i, 1); else sel.push(e.id); desenha(); return; }
          if (sel.indexOf(e.id) < 0) sel = [e.id];
          if (ev.altKey) sel = duplicar(sel.map(porId), 0);
          arr = { t: "mov", p0: p, o: sel.map(function (id) { return clone(porId(id)); }), moveu: false }; ocupado = true; desenha(); return;
        }
        if (!ev.shiftKey) sel = [];
        arr = { t: "laco", p0: p, base: sel.slice() }; desenha(); return;
      }
      // criar
      var n = { id: uid(), t: ferr, x: p.x, y: p.y, w: 0, h: 0 };
      if (ferr === "rect") Object.assign(n, { fill: "#FFFFFF", stroke: "none", r: 8 });
      if (ferr === "elipse" || ferr === "losango") Object.assign(n, { fill: "#FFFFFF", stroke: "none" });
      if (ferr === "nota") Object.assign(n, { fill: NOTAS[els.filter(function (x) { return x.t === "nota"; }).length % NOTAS.length], fs: 18 });
      if (ferr === "texto") Object.assign(n, { fs: 24, txt: "" });
      if (ferr === "linha" || ferr === "seta") { var f = formaEm(p); Object.assign(n, { x1: p.x, y1: p.y, x2: p.x, y2: p.y, a: f ? f.id : null, b: null, stroke: "#F2F2F2", sw: 2 }); delete n.x; delete n.y; delete n.w; delete n.h; }
      if (ferr === "lapis") { Object.assign(n, { pts: [[p.x, p.y]], stroke: "#F5DF00", sw: 3 }); delete n.x; delete n.y; delete n.w; delete n.h; }
      els.push(n); sel = [n.id]; arr = { t: "cria", e: n, p0: p }; ocupado = true; desenha();
    });
    stage.addEventListener("pointermove", function (ev) {
      if (!arr) return; var p = mundo(ev);
      if (arr.t === "pan") { cam.x = arr.cx + ev.clientX - arr.x; cam.y = arr.cy + ev.clientY - arr.y; aplicaCam(); return; }
      var dx = p.x - arr.p0.x, dy = p.y - arr.p0.y, gr = ev.altKey ? 1 : 1;
      if (arr.t === "mov") { if (!arr.moveu && Math.abs(dx) + Math.abs(dy) < 3 / cam.z) return; arr.moveu = true; arr.o.forEach(function (o) { var e = porId(o.id); if (!e || e.trava) return; Object.assign(e, clone(o)); mover(e, Math.round(dx), Math.round(dy)); }); desenha(); return; }
      if (arr.t === "laco") {
        var x1 = Math.min(arr.p0.x, p.x), y1 = Math.min(arr.p0.y, p.y), x2 = Math.max(arr.p0.x, p.x), y2 = Math.max(arr.p0.y, p.y);
        sel = arr.base.concat(els.filter(function (e) { var l = limites([e]); return l.x1 >= x1 && l.x2 <= x2 && l.y1 >= y1 && l.y2 <= y2; }).map(function (e) { return e.id; }).filter(function (id) { return arr.base.indexOf(id) < 0; }));
        desenha(); gsel.appendChild(el("rect", { x: x1, y: y1, width: x2 - x1, height: y2 - y1, fill: "rgba(245,223,0,.08)", stroke: "#F5DF00", "stroke-width": 1 / cam.z, "stroke-dasharray": 4 / cam.z })); return;
      }
      if (arr.t === "cria") {
        var e = arr.e;
        if (e.t === "lapis") { e.pts.push([Math.round(p.x), Math.round(p.y)]); desenha(); return; }
        if (e.t === "linha" || e.t === "seta") { var f = formaEm(p, porId(e.a)); e.b = f && f.id !== e.a ? f.id : null; e.x2 = p.x; e.y2 = p.y; if (ev.shiftKey && !e.b) { if (Math.abs(dx) > Math.abs(dy)) e.y2 = e.y1; else e.x2 = e.x1; } desenha(); return; }
        var w = dx, h = dy; if (ev.shiftKey) { var m = Math.max(Math.abs(w), Math.abs(h)); w = Math.sign(w || 1) * m; h = Math.sign(h || 1) * m; }
        e.x = Math.min(arr.p0.x, arr.p0.x + w); e.y = Math.min(arr.p0.y, arr.p0.y + h); e.w = Math.abs(w); e.h = Math.abs(h); desenha(); return;
      }
      if (arr.t === "ponta") { var l = arr.e, f2 = formaEm(p); if (arr.h === "p1") { l.a = f2 ? f2.id : null; l.x1 = p.x; l.y1 = p.y; } else { l.b = f2 ? f2.id : null; l.x2 = p.x; l.y2 = p.y; } desenha(); return; }
      if (arr.t === "res") {
        var o = arr.o, e2 = arr.e, hh = arr.h, x = o.x, y = o.y, ww = o.w, hg = o.h;
        if (/e/.test(hh)) ww = o.w + dx; if (/s/.test(hh)) hg = o.h + dy; if (/w/.test(hh)) { ww = o.w - dx; x = o.x + dx; } if (/n/.test(hh)) { hg = o.h - dy; y = o.y + dy; }
        if ((ev.shiftKey || e2.t === "img") && hh.length === 2) { var r = o.w / o.h; if (ww / r > hg) { var nh = ww / r; if (/n/.test(hh)) y = o.y + o.h - nh; hg = nh; } else { var nw = hg * r; if (/w/.test(hh)) x = o.x + o.w - nw; ww = nw; } }
        e2.x = Math.round(Math.min(x, x + ww)); e2.y = Math.round(Math.min(y, y + hg)); e2.w = Math.round(Math.max(8, Math.abs(ww))); e2.h = Math.round(Math.max(8, Math.abs(hg))); desenha();
      }
    });
    function solta(ev) {
      try { if (ev && ev.pointerId != null) stage.releasePointerCapture(ev.pointerId); } catch (x) {}
      if (!arr) return; var a = arr; arr = null; stage.classList.remove("pan"); ocupado = false;
      if (a.t === "cria") {
        var e = a.e;
        if (e.t === "lapis") { if (e.pts.length < 2) els = els.filter(function (x) { return x !== e; }); }
        else if (e.t === "linha" || e.t === "seta") { var pp = pontaLinha(e); if (Math.hypot(pp[1].x - pp[0].x, pp[1].y - pp[0].y) < 6 && !e.b) { e.x2 = e.x1 + 160; e.y2 = e.y1; } }
        else if (e.w < 6 && e.h < 6) { var def = { rect: [180, 100], elipse: [140, 140], losango: [160, 120], nota: [200, 200], texto: [260, 40] }[e.t] || [160, 100]; e.w = def[0]; e.h = def[1]; e.x -= def[0] / 2; e.y -= def[1] / 2; }
        else if (e.t === "texto") e.h = Math.max(e.h, 40);
        mudou(); desenha();
        if (e.t !== "linha" && e.t !== "seta" && e.t !== "lapis" && (e.t === "texto" || e.t === "nota")) editar(e.id);
        if (["rect", "elipse", "losango", "nota", "texto"].indexOf(e.t) >= 0 && !a.manter) setFerr("sel");
        return;
      }
      if (a.t === "mov" && !a.moveu) return;
      mudou(); desenha();
    }
    stage.addEventListener("pointerup", solta); stage.addEventListener("pointercancel", solta);
    function cliqueDuplo(ev) {
      var hit = document.elementFromPoint(ev.clientX, ev.clientY), e = alvo({ target: hit || ev.target });
      if (e) { if (e.t !== "img" && e.t !== "lapis") editar(e.id); return; }
      if (!pode) return;
      var p = mundo(ev), n = { id: uid(), t: "texto", x: p.x, y: p.y - 20, w: 260, h: 40, fs: 24, txt: "" }; els.push(n); sel = [n.id]; desenha(); editar(n.id);
    }
    stage.addEventListener("wheel", function (ev) {
      ev.preventDefault(); var r = stage.getBoundingClientRect();
      if (ev.ctrlKey || ev.metaKey) zoomEm(Math.exp(-ev.deltaY * .0035), ev.clientX - r.left, ev.clientY - r.top);
      else { cam.x -= ev.deltaX; cam.y -= ev.deltaY; aplicaCam(); }
    }, { passive: false });
    stage.addEventListener("keydown", function (ev) {
      if (editando) return;
      var k = ev.key, mod = ev.ctrlKey || ev.metaKey;
      if (k === " ") { espaco = true; stage.classList.add("pan-ok"); ev.preventDefault(); return; }
      if (mod && k.toLowerCase() === "z") { ev.preventDefault(); ev.shiftKey ? refazer() : desfazer(); return; }
      if (mod && k.toLowerCase() === "y") { ev.preventDefault(); refazer(); return; }
      if (!pode) return;
      if (mod && k.toLowerCase() === "a") { ev.preventDefault(); sel = els.map(function (e) { return e.id; }); desenha(); return; }
      if (mod && k.toLowerCase() === "c") { clip = sel.map(porId).filter(Boolean).map(clone); return; }
      if (mod && k.toLowerCase() === "v" && clip) { ev.preventDefault(); sel = duplicar(clip, 30); clip = clip.map(function (e) { var c = clone(e); mover(c, 30, 30); return c; }); mudou(); desenha(); return; }
      if (mod && k.toLowerCase() === "d") { ev.preventDefault(); acao("dup"); return; }
      if ((k === "Delete" || k === "Backspace") && sel.length) { ev.preventDefault(); acao("del"); return; }
      if (k === "Enter" && sel.length === 1) { ev.preventDefault(); editar(sel[0]); return; }
      if (k === "Escape") { sel = []; setFerr("sel"); desenha(); return; }
      var mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
      if (mv && sel.length) { ev.preventDefault(); var st = ev.shiftKey ? 10 : 1; sel.map(porId).forEach(function (e) { if (!e.trava) mover(e, mv[0] * st, mv[1] * st); }); mudou(); desenha(); return; }
      if (!mod) { var f = FERR.find(function (x) { return x[2].toLowerCase() === k.toLowerCase(); }); if (f) setFerr(f[0]); }
    });
    stage.addEventListener("keyup", function (ev) { if (ev.key === " ") { espaco = false; stage.classList.remove("pan-ok"); } });
    stage.addEventListener("paste", function (ev) { if (!pode) return; var fs = Array.prototype.slice.call((ev.clipboardData && ev.clipboardData.files) || []).filter(function (f) { return /^image\//.test(f.type); }); if (fs.length) { ev.preventDefault(); fs.forEach(function (f) { addImg(f); }); } });
    stage.addEventListener("dragover", function (ev) { if (pode) ev.preventDefault(); });
    stage.addEventListener("drop", function (ev) { if (!pode) return; ev.preventDefault(); var p = mundo(ev); Array.prototype.forEach.call(ev.dataTransfer.files || [], function (f, n) { if (/^image\//.test(f.type)) addImg(f, { x: p.x + n * 30, y: p.y + n * 30 }); }); });

    /* ---------- exportar imagem ---------- */
    function exportarPNG() {
      if (!els.length) return;
      var b = limites(els), m = 40, w = b.x2 - b.x1 + 2 * m, h = b.y2 - b.y1 + 2 * m, k = Math.min(3, 4000 / Math.max(w, h));
      var clone2 = svg.cloneNode(true); clone2.querySelector(".ql-selg").innerHTML = "";
      clone2.querySelector(".ql-cam").setAttribute("transform", "translate(" + (-b.x1 + m) + "," + (-b.y1 + m) + ")");
      clone2.setAttribute("width", w); clone2.setAttribute("height", h); clone2.setAttribute("xmlns", NS);
      var bg = el("rect", { x: -1e5, y: -1e5, width: 2e5, height: 2e5, fill: "#111111" }); clone2.querySelector(".ql-cam").insertBefore(bg, clone2.querySelector(".ql-els"));
      var st = document.createElementNS(NS, "style"); st.textContent = ".ql-tx{display:flex;flex-direction:column;width:100%;height:100%;font-family:Work Sans,Arial,sans-serif;line-height:1.3;white-space:pre-wrap;word-break:break-word;overflow:hidden}"; clone2.insertBefore(st, clone2.firstChild);
      var imgs = Array.prototype.slice.call(clone2.querySelectorAll("image"));
      Promise.all(imgs.map(function (im) { var u = im.getAttribute("href"); if (!u) return null; return fetch(u).then(function (r) { return r.blob(); }).then(function (bl) { return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { im.setAttribute("href", fr.result); res(); }; fr.readAsDataURL(bl); }); }).catch(function () {}); })).then(function () {
        var data = new XMLSerializer().serializeToString(clone2), img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k); var g = c.getContext("2d"); g.scale(k, k); g.drawImage(img, 0, 0);
          c.toBlob(function (bl) { var a = document.createElement("a"); a.href = URL.createObjectURL(bl); a.download = (doc.titulo || "quadro").replace(/[^\w\- ]+/g, "") + ".png"; document.body.appendChild(a); a.click(); a.remove(); });
        };
        img.onerror = function () { if (opts.toast) opts.toast("Não consegui gerar a imagem."); };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(data);
      });
    }

    setFerr("sel");
    setTimeout(verTudo, 0);
    desenha();
    return {
      atualizar: function (d) { if (ocupado || editando) return; var s = JSON.stringify(d.els || []); if (s === ultimo) return; els = JSON.parse(s); ultimo = s; sel = sel.filter(porId); desenha(); },
      ocupado: function () { return ocupado || !!editando || !!arr; },
      destruir: function () { host.innerHTML = ""; }
    };
  }
  window.QuadroLivre = { montar: montar };
})();
