/* Remover fundo de imagens (tabloide, Materiais Golden, Endomarketing).
   - Automático (IA): identifica o objeto principal e apaga o resto. Roda no próprio navegador
     (@imgly/background-removal); na primeira vez baixa o modelo (~40 MB) e depois fica em cache.
   - Fundo liso: apaga o fundo branco ou de uma cor só a partir das bordas. Instantâneo.
   RemoverFundo.dialogo(src, onAplicar) abre a janela com antes/depois. */
(function () {
  "use strict";
  var LIB = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/+esm";
  var libP = null;
  function lib() { if (!libP) libP = import(LIB).catch(function (e) { libP = null; throw e; }); return libP; }

  function carregar(src) { return new Promise(function (res, rej) { var im = new Image(); im.crossOrigin = "anonymous"; im.onload = function () { res(im); }; im.onerror = rej; im.src = src; }); }
  function paraCanvas(im, max) { var s = Math.min(1, (max || 2400) / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); return c; }
  function aparar(c) { // corta as sobras transparentes
    var w = c.width, h = c.height, d = c.getContext("2d").getImageData(0, 0, w, h).data, x1 = w, y1 = h, x2 = -1, y2 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 12) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
    if (x2 < 0) return c; var m = Math.round(Math.max(w, h) * .01); x1 = Math.max(0, x1 - m); y1 = Math.max(0, y1 - m); x2 = Math.min(w - 1, x2 + m); y2 = Math.min(h - 1, y2 + m);
    var o = document.createElement("canvas"); o.width = x2 - x1 + 1; o.height = y2 - y1 + 1; o.getContext("2d").drawImage(c, x1, y1, o.width, o.height, 0, 0, o.width, o.height); return o;
  }
  function blobParaDataURL(b) { return new Promise(function (r) { var f = new FileReader(); f.onload = function () { r(f.result); }; f.readAsDataURL(b); }); }

  // IA: devolve dataURL PNG com fundo transparente
  function ia(src, progresso) {
    return carregar(src).then(function (im) {
      var c = paraCanvas(im, 2000);
      return new Promise(function (r) { c.toBlob(r, "image/png"); });
    }).then(function (blob) {
      return lib().then(function (m) {
        var fn = m.removeBackground || (m.default && m.default.removeBackground);
        return fn(blob, { model: "medium", output: { format: "image/png", quality: 1 }, progress: function (k, a, t) { if (progresso && t) progresso(/fetch/.test(k) ? "Baixando o recortador (só na primeira vez)… " + Math.round(a / t * 100) + "%" : "Recortando…"); } });
      });
    }).then(blobParaDataURL).then(carregar).then(function (im) { return aparar(paraCanvas(im, 2400)).toDataURL("image/png"); });
  }

  // fundo liso: apaga a partir das bordas tudo que for parecido com a cor do fundo
  function liso(src, tol, suave) {
    tol = tol == null ? 40 : tol;
    return carregar(src).then(function (im) {
      var c = paraCanvas(im, 2400), w = c.width, h = c.height, g = c.getContext("2d"), id = g.getImageData(0, 0, w, h), d = id.data;
      var amostras = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1], [w >> 1, 0], [w >> 1, h - 1], [0, h >> 1], [w - 1, h >> 1]].map(function (p) { var i = (p[1] * w + p[0]) * 4; return [d[i], d[i + 1], d[i + 2]]; });
      // cor de fundo = média das amostras mais parecidas entre si
      var bg = [0, 1, 2].map(function (k) { var v = amostras.map(function (a) { return a[k]; }).sort(function (a, b) { return a - b; }); return v[Math.floor(v.length / 2)]; });
      var dist = function (i) { var a = d[i] - bg[0], b = d[i + 1] - bg[1], e = d[i + 2] - bg[2]; return Math.sqrt(a * a + b * b + e * e); };
      var fora = new Uint8Array(w * h), fila = new Int32Array(w * h), ini = 0, fim = 0;
      var tenta = function (p) { if (fora[p]) return; if (dist(p * 4) <= tol) { fora[p] = 1; fila[fim++] = p; } };
      for (var x = 0; x < w; x++) { tenta(x); tenta((h - 1) * w + x); }
      for (var y = 0; y < h; y++) { tenta(y * w); tenta(y * w + w - 1); }
      while (ini < fim) { var p = fila[ini++], px = p % w; if (px > 0) tenta(p - 1); if (px < w - 1) tenta(p + 1); if (p >= w) tenta(p - w); if (p < w * (h - 1)) tenta(p + w); }
      var lim = tol * (suave ? 2.2 : 1.3);
      for (var q = 0; q < w * h; q++) {
        if (fora[q]) { d[q * 4 + 3] = 0; continue; }
        var qx = q % w, viz = (qx > 0 && fora[q - 1]) || (qx < w - 1 && fora[q + 1]) || (q >= w && fora[q - w]) || (q < w * (h - 1) && fora[q + w]);
        if (viz) { var di = dist(q * 4); if (di < lim) d[q * 4 + 3] = Math.round(255 * Math.max(.15, (di - tol) / (lim - tol))); }
      }
      g.putImageData(id, 0, 0);
      return aparar(c).toDataURL("image/png");
    });
  }

  function dialogo(src, onAplicar) {
    var css = "position:fixed;inset:0;z-index:600;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;font:14px/1.4 system-ui,sans-serif";
    var xadrez = "background:repeating-conic-gradient(#d9d9d9 0 25%,#fff 0 50%) 0 0/18px 18px";
    var bg = document.createElement("div"); bg.style.cssText = css;
    bg.innerHTML = '<div style="background:#fff;color:#1a1a1a;border-radius:10px;padding:18px 20px;width:min(860px,100%);max-height:94vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.4)">' +
      '<h2 style="margin:0 0 4px;font-size:19px">Remover fundo</h2><p style="margin:0 0 12px;color:#666;font-size:13px">O <b>automático</b> encontra o produto (ou a pessoa) e apaga o resto. O <b>fundo liso</b> é instantâneo e funciona bem em foto de produto com fundo branco ou de uma cor só.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><div style="font-size:12px;color:#888;margin-bottom:4px">Antes</div><div style="' + xadrez + ';border-radius:6px;height:340px;display:flex;align-items:center;justify-content:center"><img data-a style="max-width:100%;max-height:330px"></div></div>' +
      '<div><div style="font-size:12px;color:#888;margin-bottom:4px">Depois</div><div style="' + xadrez + ';border-radius:6px;height:340px;display:flex;align-items:center;justify-content:center;position:relative"><img data-d style="max-width:100%;max-height:330px"><span data-st style="position:absolute;inset:auto 8px 8px 8px;background:rgba(0,0,0,.72);color:#fff;border-radius:5px;padding:6px 9px;font-size:12.5px;display:none"></span></div></div></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:12px">' +
        '<button data-ia style="background:#111;color:#fff;border:0;border-radius:6px;padding:9px 14px;font-weight:600;cursor:pointer">Automático (IA)</button>' +
        '<button data-liso style="background:#f1f1f1;border:1px solid #ddd;border-radius:6px;padding:9px 14px;cursor:pointer">Fundo liso</button>' +
        '<label style="display:flex;align-items:center;gap:6px;font-size:13px;color:#555">Tolerância <input type="range" data-tol min="5" max="120" value="40" style="width:120px"></label>' +
        '<label style="display:flex;align-items:center;gap:5px;font-size:13px;color:#555"><input type="checkbox" data-suave checked> borda suave</label>' +
        '<span style="flex:1"></span><button data-x style="background:#fff;border:1px solid #ccc;border-radius:6px;padding:9px 14px;cursor:pointer">Cancelar</button>' +
        '<button data-ok disabled style="background:#F5DF00;border:0;border-radius:6px;padding:9px 16px;font-weight:700;cursor:pointer;opacity:.5">Usar esta imagem</button></div>' +
      '<p style="margin:10px 0 0;color:#888;font-size:12px">Funciona no próprio computador: a foto não é enviada para nenhum site. Na primeira vez o automático baixa o recortador (uns 40 MB); depois fica rápido.</p></div>';
    document.body.appendChild(bg);
    var q = function (s) { return bg.querySelector(s); }, res = null, ocupado = false;
    q("[data-a]").src = src;
    var st = function (t) { var s = q("[data-st]"); s.style.display = t ? "block" : "none"; s.textContent = t || ""; };
    var pronto = function (url) { res = url; q("[data-d]").src = url; st(""); var ok = q("[data-ok]"); ok.disabled = false; ok.style.opacity = 1; ocupado = false; };
    var erro = function (msg) { st(msg); ocupado = false; };
    var rodaLiso = function () { if (ocupado) return; ocupado = true; st("Recortando…"); liso(src, +q("[data-tol]").value, q("[data-suave]").checked).then(pronto, function () { erro("Não consegui ler essa imagem."); }); };
    q("[data-ia]").onclick = function () { if (ocupado) return; ocupado = true; st("Preparando…"); ia(src, st).then(pronto, function (e) { console.error(e); erro("O automático não carregou (internet ou navegador antigo). Tente o Fundo liso."); }); };
    q("[data-liso]").onclick = rodaLiso;
    q("[data-tol]").onchange = rodaLiso; q("[data-suave]").onchange = rodaLiso;
    q("[data-x]").onclick = function () { bg.remove(); };
    q("[data-ok]").onclick = function () { if (!res) return; bg.remove(); onAplicar(res); };
    bg.addEventListener("click", function (e) { if (e.target === bg && !ocupado) bg.remove(); });
  }

  window.RemoverFundo = { ia: ia, liso: liso, dialogo: dialogo };
})();
