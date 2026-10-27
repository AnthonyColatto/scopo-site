/* Motor dos estúdios de peças do Fluxo (Materiais Golden, Endomarketing).
   Cada estúdio carrega este arquivo e depois o seu kit.js (marca, modelos e layouts).
   Tudo roda no navegador. Projeto fica no IndexedDB; "Salvar no Fluxo" guarda no Supabase (ponte.js). */
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function slug(s) { return String(s || "pecas").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "golden"; }
function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); }
function modal(html) { var bg = document.createElement("div"); bg.className = "modalBg"; bg.innerHTML = '<div class="modal">' + html + "</div>"; document.body.appendChild(bg); bg.addEventListener("click", function (e) { if (e.target === bg || e.target.closest("[data-close]")) bg.remove(); }); return bg; }


/* ================= formatos ================= */
var BASE_DPI = 150; // impressos: 1 mm = 150/25,4 px na edição; exporta em 300 dpi
var FMTS = {
  feed: { nome: "Feed 1080×1350", w: 1080, h: 1350, g: "Digital" },
  story: { nome: "Story 1080×1920", w: 1080, h: 1920, g: "Digital" },
  quad: { nome: "Quadrado 1080×1080", w: 1080, h: 1080, g: "Digital" },
  email: { nome: "Assinatura de e-mail 600×200", w: 1200, h: 400, g: "Digital", px2: true },
  a4: { nome: "A4 · 21×29,7 cm", mm: [210, 297], g: "Impressos" },
  a4h: { nome: "A4 deitado", mm: [297, 210], g: "Impressos" },
  a5: { nome: "A5 · 14,8×21 cm", mm: [148, 210], g: "Impressos" },
  a5h: { nome: "A5 deitado", mm: [210, 148], g: "Impressos" },
  a3: { nome: "A3 · 29,7×42 cm", mm: [297, 420], g: "Impressos" },
  fili: { nome: "Filipeta 10×21 cm", mm: [100, 210], g: "Impressos" },
  c1015: { nome: "Cartão 10×15 cm", mm: [100, 150], g: "Impressos" },
  c1510: { nome: "Cartão 15×10 cm (deitado)", mm: [150, 100], g: "Impressos" },
  q10: { nome: "Quadrado 10×10 cm", mm: [100, 100], g: "Cartões e tags" },
  q5: { nome: "Quadrado 5×5 cm", mm: [50, 50], g: "Cartões e tags" },
  q15: { nome: "Quadrado 15×15 cm", mm: [150, 150], g: "Cartões e tags" },
  q20: { nome: "Quadrado 20×20 cm", mm: [200, 200], g: "Cartões e tags" },
  r5: { nome: "Redondo 5 cm", mm: [50, 50], g: "Cartões e tags", redondo: true },
  r10: { nome: "Redondo 10 cm", mm: [100, 100], g: "Cartões e tags", redondo: true },
  r15: { nome: "Redondo 15 cm", mm: [150, 150], g: "Cartões e tags", redondo: true },
  r20: { nome: "Redondo 20 cm", mm: [200, 200], g: "Cartões e tags", redondo: true },
  tag59: { nome: "Tag 5×9 cm", mm: [50, 90], g: "Cartões e tags" },
  plaq207: { nome: "Placa de mesa 20×7 cm", mm: [200, 70], g: "Placas" },
  plaq3010: { nome: "Placa de porta 30×10 cm", mm: [300, 100], g: "Placas" },
  plaq2015: { nome: "Placa 20×15 cm", mm: [200, 150], g: "Placas" },
  custom: { nome: "Personalizado", g: "Outros" }
};
function dims(p) {
  var f = FMTS[p.fmt] || FMTS.feed, mm = f.mm, w = f.w, h = f.h, red = !!f.redondo;
  if (p.fmt === "custom") { var c = p.custom || {}; red = !!c.redondo; if (c.un === "px") { w = +c.w || 1080; h = +c.h || 1080; mm = null; } else mm = [+c.w || 100, +c.h || 150]; }
  if (mm) { w = Math.round(mm[0] / 25.4 * BASE_DPI); h = Math.round(mm[1] / 25.4 * BASE_DPI); }
  return { w: w, h: h, mm: mm || null, redondo: red };
}
function fmtNome(p) { if (p.fmt !== "custom") return FMTS[p.fmt].nome; var c = p.custom || {}; return "Personalizado " + c.w + "×" + c.h + (c.un === "px" ? " px" : " mm") + (c.redondo ? " redondo" : ""); }
function fmtOptions(atual, so) { // <option>s agrupados; so = lista de chaves permitidas (opcional)
  var gs = {}; Object.keys(FMTS).forEach(function (k) { if (so && so.indexOf(k) < 0 && k !== "custom") return; var g = FMTS[k].g || "Outros"; (gs[g] = gs[g] || []).push(k); });
  return Object.keys(gs).map(function (g) { return '<optgroup label="' + g + '">' + gs[g].map(function (k) { return '<option value="' + k + '"' + (k === atual ? " selected" : "") + ">" + FMTS[k].nome + "</option>"; }).join("") + "</optgroup>"; }).join("");
}

/* ================= kit (marca e modelos vêm do kit.js de cada estúdio) ================= */
var MARCA_PADRAO, MARCA_NOMES, FONTES, IMGS_MARCA, MODELOS, FONTES_TIME = [];
function lerKit() {
  var K = window.KIT; MARCA_PADRAO = K.marca; MARCA_NOMES = K.marcaNomes; FONTES = K.fontes; IMGS_MARCA = K.imgs; MODELOS = K.modelos;
  K.tok = Object.assign({ claro: "@branco", escuro: "@navy", dest: "@ouro", gradNome: "Dourado", logoClaro: "", logoEscuro: "" }, K.tok || {});
}
function gerar(modelo, d, p) { return window.KIT.gerar(modelo, d, p); }
function novaPeca(modelo, fmt, custom) {
  var M = MODELOS[modelo], p = { id: uid(), nome: M.nome, modelo: modelo, fmt: fmt || M.fmt, custom: custom || { w: 100, h: 150, un: "mm" }, dados: clone(M.dados) };
  if (M.tema) p.tema = M.tema; if (KIT.temaPadrao && !p.tema) p.tema = KIT.temaPadrao;
  var dd = dims(p), g = gerar(modelo, dd, p); p.layers = g.layers; p.bg = g.bg; p._dims = { w: dd.w, h: dd.h }; p.nome = M.nome + " · " + fmtNome(p).split(" ")[0];
  return p;
}

function T(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "texto", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, txt: "", fonte: "Poppins", peso: 400, tam: 40, cor: "@branco", dest: window.KIT ? window.KIT.tok.dest : "@ouro", al: "center", va: "middle", caixa: false, ita: false, ls: 0, lh: 1.15, sombra: 0, fit: true, linhas: false }, o || {}); }
function I(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "img", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, src: "", fit: "cover", zoom: 1, px: 50, py: 50, raio: 0, bcor: "@branco", blarg: 0, sombra: 0 }, o || {}); }
function F(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "forma", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, fill: { t: "cor", c: "@navy", a: 1 }, raio: 0, bcor: window.KIT ? window.KIT.tok.dest : "@ouro", blarg: 0, sombra: 0, cantos: false, ccor: window.KIT ? window.KIT.tok.dest : "@ouro", ctam: 40, cin: 20, clarg: 3 }, o || {}); }
function P$(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "preco", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, moeda: "R$", valor: "{preco}", unid: "{unid}", fonte: "Poppins", peso: 700, tam: 150, cor: "@branco", al: "left", sombra: 0 }, o || {}); }
function G(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "tag", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, txt: "", estilo: "ouro", fundo: "@ouro", cor: "@navy", fonte: "Poppins", peso: 800, tam: 30, ls: 0, raio: 4, blarg: 3, caixa: true, sombra: 0 }, o || {}); }
var OURO = { t: "ouro", ang: 100 };


/* ================= campos e layout automático ================= */
function camposDe(M) { // aceita [chave, rótulo, tipo] ou {k, l, t, ops, se, dica}
  return (M.campos || []).map(function (c) { return Array.isArray(c) ? { k: c[0], l: c[1], t: c[2] || "text" } : Object.assign({ t: "text" }, c); });
}
function regeneraTodas() { P.pecas.forEach(function (x) { regenera(x); }); }
function fonteKit(tipo, padrao) { return (window.P && P.fk && P.fk[tipo]) || padrao; }
function regenera(p) { // peças automáticas: o layout é refeito a partir do conteúdo
  if (!KIT.auto || !p || p.manual || p.modelo === "livre") return;
  var g = gerar(p.modelo, dims(p), p); p.layers = g.layers; p.bg = g.bg;
  if (UI.sel && !p.layers.some(function (l) { return l.id === UI.sel; })) UI.sel = null;
}
var _cv = null;
function medeTexto(txt, o) { // quebra o texto como o navegador e devolve linhas e altura
  o = o || {}; if (!_cv) _cv = document.createElement("canvas").getContext("2d");
  var t = String(txt == null ? "" : txt).replace(/\*\*?/g, ""); if (o.caixa) t = t.toLocaleUpperCase("pt-BR");
  var tam = o.tam || 40, ls = (o.ls || 0) * tam, w = o.w || 1e9;
  _cv.font = (o.ita ? "italic " : "") + (o.peso || 400) + " " + tam + 'px "' + (o.fonte || "Poppins") + '", Poppins, sans-serif';
  var larg = function (s) { return _cv.measureText(s).width + ls * s.length; }, linhas = [], maior = 0;
  t.split("\n").forEach(function (par) {
    var pal = par.split(/\s+/).filter(function (x) { return x !== ""; }), cur = "";
    if (!pal.length) { linhas.push(""); return; }
    pal.forEach(function (pw) { var tst = cur ? cur + " " + pw : pw; if (larg(tst) > w && cur) { linhas.push(cur); cur = pw; } else cur = tst; });
    linhas.push(cur);
  });
  linhas.forEach(function (l) { maior = Math.max(maior, larg(l)); });
  return { linhas: linhas.length, h: linhas.length * tam * (o.lh || 1.15), larg: maior };
}
var ICONES = {
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  local: '<path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  setabaixo: '<path d="M4 7h16l-8 10z" fill="currentColor" stroke="none"/>',
  seta: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  whatsapp: '<path d="M4 20l1.3-4.2A8 8 0 1112 20a8 8 0 01-3.9-1z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2z"/>',
  telefone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z"/>',
  presente: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M3 13h18M12 9v12M12 9C10 5 6 5 7 8c.5 1.5 5 1 5 1zM12 9c2-4 6-4 5-1-.5 1.5-5 1-5 1z"/>',
  estrela: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.5 4.5-6 8-6s7 1.5 8 6"/>'
};
function iconeURL(nome, cor, larg) {
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 24 24" fill="none" stroke="' + cor + '" stroke-width="' + (larg || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" color="' + cor + '">' + (ICONES[nome] || ICONES.estrela) + "</svg>";
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
function Ic(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "icone", nome: nome || "Ícone", x: x, y: y, w: w, h: h, rot: 0, op: 1, icone: "calendario", cor: "@branco", traco: 1.8 }, o || {}); }
function Ch(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "chips", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, txt: "", fonte: "Poppins", peso: 700, tam: 28, cor: "@ouro", fundo: "@navy2", estilo: "cheio", raio: 99, gap: 14, caixa: true, al: "center" }, o || {}); }

/* ================= estado ================= */
function projetoNovo() { return { v: 1, nome: KIT.nome, marca: clone(MARCA_PADRAO), pecas: KIT.inicial().map(function (x) { return novaPeca(x[0], x[1]); }), atual: 0, assets: {}, fontes: [] }; }
var P = null, UI = { sel: null, tab: "rap", zoom: 0, hist: [], fut: [] };
function peca() { return P.pecas[P.atual] || P.pecas[0]; }
function layerSel() { var p = peca(); return p && UI.sel ? p.layers.find(function (l) { return l.id === UI.sel; }) : null; }

var IDB = {
  db: null,
  open: function () { var me = this; if (me.db) return Promise.resolve(me.db); return new Promise(function (res, rej) { var r = indexedDB.open(KIT.idb, 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { me.db = r.result; res(me.db); }; r.onerror = function () { rej(r.error); }; }); },
  get: function (k) { return this.open().then(function (db) { return new Promise(function (res, rej) { var r = db.transaction("kv").objectStore("kv").get(k); r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }); },
  set: function (k, v) { return this.open().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = function () { res(); }; t.onerror = function () { rej(t.error); }; }); }); }
};
var saveT = null;
function persist() { clearTimeout(saveT); saveT = setTimeout(function () { IDB.set("projeto", JSON.stringify(P)).catch(function () {}); }, 600); }
function snap() { return JSON.stringify({ nome: P.nome, marca: P.marca, pecas: P.pecas, atual: P.atual }); }
var lastSnap = null, histT = null;
function commit(now) { // registra no histórico (desfazer) e salva no navegador
  clearTimeout(histT);
  var go = function () { var s = snap(); if (s !== lastSnap) { if (lastSnap) { UI.hist.push(lastSnap); if (UI.hist.length > 80) UI.hist.shift(); } UI.fut = []; lastSnap = s; } persist(); };
  if (now) go(); else histT = setTimeout(go, 450);
}
function restore(s) { var o = JSON.parse(s); P.nome = o.nome; P.marca = o.marca; P.pecas = o.pecas; P.atual = o.atual; lastSnap = s; if (!layerSel()) UI.sel = null; refresh(); persist(); }
function undo() { commit(true); if (!UI.hist.length) return toast("Nada para desfazer."); UI.fut.push(lastSnap); restore(UI.hist.pop()); }
function redo() { if (!UI.fut.length) return toast("Nada para refazer."); UI.hist.push(lastSnap); restore(UI.fut.pop()); }

/* ================= cores, textos e imagens ================= */
var MA = null; // cores da peça que está sendo desenhada (tema da peça ou a marca do projeto)
function marcaDe(p) { var t = KIT.temas && p && p.tema && KIT.temas[p.tema]; return t ? Object.assign({}, P.marca, t.marca) : P.marca; }
function cor(c) { if (!c) return "transparent"; if (c[0] === "@") { var m = MA || P.marca, k = c.slice(1); if (m[k]) return m[k]; var al = window.KIT && KIT.alias && KIT.alias[k]; return al ? cor(al) : "#000"; } return c; } // alias: o kit pode apontar tokens padrão do motor (navy, branco, ouro…) para as cores dele
function rgba(c, a) { c = cor(c); if (a == null || a >= 1 || !/^#[0-9a-f]{6}$/i.test(c)) return c; var n = parseInt(c.slice(1), 16); return "rgba(" + (n >> 16) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + (+a).toFixed(3) + ")"; }
function ouroGrad(ang) { var o = cor("@ouro"), o2 = cor("@ouro2"), o3 = cor("@ouro3"); return "linear-gradient(" + (ang == null ? 100 : ang) + "deg," + o3 + " 0%," + o + " 28%," + o2 + " 50%," + o + " 72%," + o3 + " 100%)"; }
function srcURL(s) { if (!s) return ""; if (s.indexOf("asset:") === 0) return P.assets[s.slice(6)] || ""; return s; }
function dado(p, s) { // troca {campo} pelos dados da peça (duas passadas: o legal usa {validade})
  var f = function (t) { return String(t == null ? "" : t).replace(/\{(\w+)\}/g, function (m, k) { return p.dados && p.dados[k] != null ? p.dados[k] : ""; }); };
  return f(f(s));
}
function marcacao(t, destCor) { // **negrito**  *destaque dourado*
  return esc(t).replace(/\*\*\s*\*\*/g, "").replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>").replace(/\*([^*\n][\s\S]*?)\*/g, '<b style="color:' + destCor + '">$1</b>');
}
function fillCSS(f, el) {
  f = f || { t: "nenhum" };
  if (f.t === "cor") el.style.background = rgba(f.c, f.a == null ? 1 : f.a);
  else if (f.t === "grad") { var a = rgba(f.c1, f.a1 == null ? 1 : f.a1), b = rgba(f.c2, f.a2 == null ? 1 : f.a2); el.style.backgroundImage = "linear-gradient(" + (f.ang || 0) + "deg," + a + "," + b + (f.esp ? "," + a : "") + ")"; }
  else if (f.t === "ouro") el.style.backgroundImage = ouroGrad(f.ang);
  else if (f.t === "img") { el.style.backgroundColor = cor(f.c || "@navy"); var u = srcURL(f.src); if (u) { el.style.backgroundImage = 'url("' + u + '")'; el.style.backgroundSize = f.fit === "repeat" ? (f.esc || 40) + "%" : "cover"; el.style.backgroundRepeat = f.fit === "repeat" ? "repeat" : "no-repeat"; el.style.backgroundPosition = "center"; } }
}
var SOMBRAS = ["", "0 2px 10px rgba(0,0,0,.45)", "0 4px 18px rgba(0,0,0,.7)"];
var BOXS = ["", "0 6px 24px rgba(0,0,0,.28)", "0 14px 40px rgba(0,0,0,.45)"];
// sombra desenhada numa imagem (o box-shadow do html2canvas borra a peça na exportação)
var SOMB = {};
function sombraDiv(L, nivel) {
  var b = nivel === 2 ? 34 : 18, oy = nivel === 2 ? 14 : 6, al = nivel === 2 ? .5 : .32, w = Math.max(1, Math.round(L.w)), h = Math.max(1, Math.round(L.h)), r = L.raio || 0;
  var key = [w, h, nivel, r].join("x"), url = SOMB[key];
  if (!url) {
    var c = document.createElement("canvas"); c.width = w + 4 * b; c.height = h + 4 * b; var g = c.getContext("2d");
    g.shadowColor = "rgba(0,0,0," + al + ")"; g.shadowBlur = b; g.shadowOffsetX = 20000; g.shadowOffsetY = oy; g.fillStyle = "#000";
    g.beginPath(); var x = 2 * b - 20000, y = 2 * b; if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill();
    url = SOMB[key] = c.toDataURL("image/png");
  }
  var d = document.createElement("div"); d.className = "L"; d.style.pointerEvents = "none";
  d.style.left = (L.x - 2 * b) + "px"; d.style.top = (L.y - 2 * b) + "px"; d.style.width = (w + 4 * b) + "px"; d.style.height = (h + 4 * b) + "px";
  d.style.backgroundImage = 'url("' + url + '")'; d.style.backgroundSize = "100% 100%"; d.style.backgroundRepeat = "no-repeat";
  if (L.rot) d.style.transform = "rotate(" + L.rot + "deg)";
  if (L.op != null && L.op < 1) d.style.opacity = L.op;
  return d;
}
var DIMS = {}; // tamanho natural das imagens (para zoom)
function carregaDims(u) { if (!u || DIMS[u]) return Promise.resolve(DIMS[u]); return new Promise(function (res) { var im = new Image(); im.onload = function () { DIMS[u] = { w: im.naturalWidth, h: im.naturalHeight }; res(DIMS[u]); }; im.onerror = function () { res(null); }; im.src = u; }); }
function imgCSS(L, el, u) {
  el.style.backgroundImage = u ? 'url("' + u + '")' : "none";
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundPosition = (L.px == null ? 50 : L.px) + "% " + (L.py == null ? 50 : L.py) + "%";
  var d = DIMS[u], z = +L.zoom || 1;
  if (d && z !== 1) { var s = (L.fit === "contain" ? Math.min(L.w / d.w, L.h / d.h) : Math.max(L.w / d.w, L.h / d.h)) * z; el.style.backgroundSize = Math.round(d.w * s) + "px " + Math.round(d.h * s) + "px"; }
  else el.style.backgroundSize = L.fit === "contain" ? "contain" : "cover";
  if (!d && u) carregaDims(u).then(function () { if (z !== 1) agendaRender(); });
}

/* ================= desenho da peça ================= */
function montar(p, host, edit) {
  var MA0 = MA; MA = marcaDe(p);
  try { return montar0(p, host, edit); } finally { MA = MA0; }
}
function montar0(p, host, edit) {
  var d = dims(p), pg = document.createElement("div");
  pg.className = "pg" + (edit ? " edit" : ""); pg.style.width = d.w + "px"; pg.style.height = d.h + "px";
  var b = p.bg || { t: "cor", c: "#fff" };
  if (b.t === "img") { pg.style.background = cor(b.c || "@creme"); var bi = document.createElement("div"); bi.className = "bgimg"; var u = srcURL(b.src); if (u) { bi.style.backgroundImage = 'url("' + u + '")'; bi.style.backgroundSize = b.fit === "repeat" ? (b.esc || 30) + "%" : b.fit === "contain" ? "contain" : "cover"; bi.style.backgroundRepeat = b.fit === "repeat" ? "repeat" : "no-repeat"; bi.style.backgroundPosition = b.px != null ? b.px + "% " + (b.py == null ? 50 : b.py) + "%" : "center"; bi.style.opacity = b.op == null ? 1 : b.op; } pg.appendChild(bi); }
  else fillCSS(b, pg);
  if (b.escurece) { var sh = document.createElement("div"); sh.className = "bgimg"; sh.style.background = "rgba(0,0,0," + b.escurece + ")"; pg.appendChild(sh); }
  p.layers.forEach(function (L) {
    if (L.oculto && !edit) return;
    var el = document.createElement("div"); el.className = "L" + (L.lock ? " lock" : "") + (L.oculto ? " hid" : ""); el.dataset.lid = L.id;
    el.style.left = L.x + "px"; el.style.top = L.y + "px"; el.style.width = L.w + "px"; el.style.height = L.h + "px";
    el.style.opacity = L.oculto ? .15 : (L.op == null ? 1 : L.op);
    if (L.rot) el.style.transform = "rotate(" + L.rot + "deg)";
    if (L.tipo === "texto") desenhaTexto(L, el, p);
    else if (L.tipo === "img") {
      imgCSS(L, el, srcURL(dado(p, L.src)));
      if (L.raio) el.style.borderRadius = L.raio + "px";
      if (L.blarg) el.style.border = L.blarg + "px solid " + cor(L.bcor);
    } else if (L.tipo === "forma") {
      fillCSS(L.fill, el);
      if (L.raio) el.style.borderRadius = L.raio + "px";
      if (L.blarg) el.style.border = L.blarg + "px solid " + cor(L.bcor);
      if (L.cantos) [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(function (c) {
        var k = document.createElement("div"); k.className = "canto"; var t = L.ctam, i = L.cin, w = L.clarg + "px", cc = cor(L.ccor);
        k.style.width = t + "px"; k.style.height = t + "px"; k.style.borderColor = cc;
        k.style[c[0] ? "right" : "left"] = i + "px"; k.style[c[1] ? "bottom" : "top"] = i + "px";
        k.style["border" + (c[1] ? "Bottom" : "Top") + "Width"] = w; k.style["border" + (c[0] ? "Right" : "Left") + "Width"] = w;
        el.appendChild(k);
      });
    } else if (L.tipo === "preco") desenhaPreco(L, el, p);
    else if (L.tipo === "tag") desenhaTag(L, el, p);
    else if (L.tipo === "icone") { el.style.backgroundImage = 'url("' + iconeURL(L.icone, cor(L.cor), L.traco) + '")'; el.style.backgroundSize = "contain"; el.style.backgroundRepeat = "no-repeat"; el.style.backgroundPosition = "center"; }
    else if (L.tipo === "chips") desenhaChips(L, el, p);
    if (L.sombra && !L.oculto && (L.tipo === "img" || L.tipo === "forma" || L.tipo === "tag")) pg.appendChild(sombraDiv(L, L.sombra));
    pg.appendChild(el);
  });
  host.innerHTML = ""; host.appendChild(pg);
  ajustarTextos(pg, p);
  return pg;
}
function desenhaTexto(L, el, p) {
  var box = document.createElement("div"); box.className = "tx";
  box.style.justifyContent = L.va === "top" ? "flex-start" : L.va === "bottom" ? "flex-end" : "center";
  var inn = document.createElement("div"); inn.className = "in";
  inn.style.fontFamily = '"' + L.fonte + '", Poppins, sans-serif'; inn.style.fontWeight = L.peso; inn.style.fontSize = L.tam + "px";
  inn.style.color = cor(L.cor); inn.style.textAlign = L.al; if (L.al === "justify") inn.style.textAlignLast = "center"; inn.style.lineHeight = L.lh; inn.style.letterSpacing = (L.ls || 0) + "em";
  if (L.ita) inn.style.fontStyle = "italic";
  if (L.sombra) inn.style.textShadow = SOMBRAS[L.sombra] || "";
  var t = dado(p, L.txt); if (L.caixa) t = t.toLocaleUpperCase("pt-BR");
  var html = marcacao(t, cor(L.dest || KIT.tok.dest));
  if (L.linhas) { // — TEXTO — com linhas dos lados
    var lc = cor(L.cor), lw = Math.max(1, Math.round(L.tam * .06)) + "px";
    inn.innerHTML = '<div class="lin" style="gap:' + Math.round(L.tam * .5) + 'px"><i style="height:' + lw + ';background:' + lc + '"></i><span style="margin-right:-' + (L.ls || 0) + 'em">' + html + '</span><i style="height:' + lw + ';background:' + lc + '"></i></div>';
  } else inn.innerHTML = html;
  box.appendChild(inn); el.appendChild(box);
}
function partesPreco(v) { v = String(v || "").trim().replace(/^R\$\s*/i, ""); var m = v.match(/^(.*?)([.,](\d{1,2}))?$/); var inteiro = (m && m[1]) || v, cent = m && m[3] ? m[3] : ""; if (cent.length === 1) cent += "0"; return { i: inteiro, c: cent }; }
function desenhaPreco(L, el, p) {
  var pr = partesPreco(dado(p, L.valor)), un = dado(p, L.unid).trim(), t = L.tam, c = cor(L.cor);
  var box = document.createElement("div"); box.className = "preco";
  box.style.justifyContent = L.al === "right" ? "flex-end" : L.al === "center" ? "center" : "flex-start";
  box.style.fontFamily = '"' + L.fonte + '", Poppins, sans-serif'; box.style.fontWeight = L.peso; box.style.color = c;
  if (L.sombra) box.style.textShadow = SOMBRAS[L.sombra] || "";
  var h = "";
  if (L.moeda) h += '<span style="font-size:' + (t * (L.mtam || .3)).toFixed(1) + "px;line-height:1;align-self:center;margin-right:" + (t * .06).toFixed(1) + "px;margin-top:" + (t * (L.mtam ? .02 : .08)).toFixed(1) + "px" + (L.mcor ? ";color:" + cor(L.mcor) : "") + '">' + esc(L.moeda) + "</span>";
  h += '<span style="font-size:' + t + "px;line-height:.86;letter-spacing:-.02em\">" + esc(pr.i) + (L.virg && pr.c ? "," : "") + "</span>";
  if (pr.c || un) h += '<span class="cl" style="margin-left:' + (t * .02).toFixed(1) + "px" + (L.sup ? ";margin-top:" + (t * L.sup).toFixed(1) + "px" : "") + '">' + (pr.c ? '<span style="font-size:' + (t * (L.virg ? .5 : .44)).toFixed(1) + 'px;line-height:1">' + (L.virg ? "" : ",") + esc(pr.c) + "</span>" : "") + (un ? '<span style="font-size:' + (t * .2).toFixed(1) + "px;line-height:1;margin-top:" + (t * .04).toFixed(1) + "px;padding-left:" + (t * .1).toFixed(1) + 'px">' + esc(un) + "</span>" : "") + "</span>";
  box.innerHTML = h; el.appendChild(box);
}
function desenhaChips(L, el, p) {
  var box = document.createElement("div"); box.className = "chips";
  box.style.justifyContent = L.al === "left" ? "flex-start" : L.al === "right" ? "flex-end" : "center"; box.style.gap = (L.gap || 12) * .8 + "px " + (L.gap || 12) + "px";
  dado(p, L.txt).split("\n").map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (t) {
    var s = document.createElement("span"); s.textContent = L.caixa ? t.toLocaleUpperCase("pt-BR") : t;
    s.style.fontFamily = '"' + L.fonte + '", Poppins, sans-serif'; s.style.fontWeight = L.peso; s.style.fontSize = L.tam + "px"; s.style.color = cor(L.cor); s.style.borderRadius = (L.raio || 0) + "px";
    s.style.padding = (L.tam * .28).toFixed(1) + "px " + (L.tam * .75).toFixed(1) + "px";
    if (L.estilo === "contorno") s.style.border = Math.max(1.5, L.tam * .07).toFixed(1) + "px solid " + cor(L.fundo); else s.style.background = cor(L.fundo);
    box.appendChild(s);
  });
  el.appendChild(box);
}
function desenhaTag(L, el, p) {
  var box = document.createElement("div"); box.className = "tag";
  box.style.borderRadius = (L.raio || 0) + "px";
  if (L.estilo === "ouro") box.style.backgroundImage = ouroGrad(100);
  else if (L.estilo === "cheio") box.style.background = cor(L.fundo);
  else if (L.estilo === "grad") box.style.backgroundImage = "linear-gradient(180deg," + cor(L.fundo2 || L.fundo) + "," + cor(L.fundo) + ")";
  else if (L.estilo !== "nada") box.style.border = (L.blarg || 2) + "px " + (L.estilo === "tracejado" ? "dashed" : "solid") + " " + cor(L.fundo);
  if (L.estilo === "pilula3d") { box.style.background = cor(L.fundo); box.style.borderBottom = Math.max(3, L.tam * .14).toFixed(1) + "px solid " + cor(L.fundo2 || "@navy"); }
  var s = document.createElement("span"); var t = dado(p, L.txt); if (L.caixa) t = t.toLocaleUpperCase("pt-BR");
  if (L.marc) s.innerHTML = marcacao(t, cor(L.dest || L.cor)); else s.textContent = t; s.style.fontFamily = '"' + L.fonte + '", Poppins, sans-serif'; s.style.fontWeight = L.peso; s.style.fontSize = L.tam + "px"; s.style.color = cor(L.cor); s.style.letterSpacing = (L.ls || 0) + "em"; s.style.lineHeight = L.lh || 1; s.style.textAlign = "center"; if (L.ita) s.style.fontStyle = "italic"; if (L.multi) s.style.whiteSpace = "pre-line";
  box.appendChild(s); el.appendChild(box);
}
// diminui a letra até caber na caixa (textos com "encolher para caber", preço e selo)
function ajustarTextos(pg, p) {
  if (!pg.isConnected) return;
  p.layers.forEach(function (L) {
    var el = pg.querySelector('[data-lid="' + L.id + '"]'); if (!el) return;
    if (L.tipo === "texto" && L.fit) {
      var inn = el.querySelector(".in"), box = el.querySelector(".tx"), f = L.tam, n = 0;
      inn.style.fontSize = f + "px";
      while (n++ < 40 && f > 4 && (inn.scrollHeight > L.h + 1 || inn.scrollWidth > L.w + 1)) { f *= .95; inn.style.fontSize = f.toFixed(2) + "px"; }
    } else if (L.tipo === "chips") {
      var cb = el.firstChild, f2 = L.tam, n2 = 0, sps = cb.querySelectorAll("span");
      while (n2++ < 30 && f2 > 6 && (cb.scrollHeight > L.h + 1 || cb.scrollWidth > L.w + 1)) { f2 *= .94; Array.prototype.forEach.call(sps, function (x) { x.style.fontSize = f2.toFixed(1) + "px"; x.style.padding = (f2 * .28).toFixed(1) + "px " + (f2 * .75).toFixed(1) + "px"; }); }
    } else if (L.tipo === "preco" || L.tipo === "tag") {
      var bx = el.firstChild, sc = 1;
      var w = bx.scrollWidth, hh = bx.scrollHeight;
      if (L.tipo === "tag") { var sp = bx.firstChild; w = sp.scrollWidth + L.tam * .7; hh = sp.offsetHeight; }
      if (w > L.w + 1 || hh > L.h + 1) {
        sc = Math.max(.2, Math.min(L.w / w, L.h / hh));
        if (L.tipo === "preco") { bx.style.zoom = ""; Array.prototype.forEach.call(bx.querySelectorAll("span"), function (s) { var fs = parseFloat(s.style.fontSize); if (fs) s.style.fontSize = (fs * sc).toFixed(2) + "px"; ["marginRight", "marginTop", "marginLeft", "paddingLeft"].forEach(function (m) { var v = parseFloat(s.style[m]); if (v) s.style[m] = (v * sc).toFixed(2) + "px"; }); }); }
        else { var sp2 = bx.firstChild; sp2.style.fontSize = (L.tam * sc).toFixed(2) + "px"; }
      }
    }
  });
}

/* ================= tela ================= */
var board = null, pgEl = null, escala = 1;
var rT = null;
function agendaRender() { if (rT) return; rT = requestAnimationFrame(function () { rT = null; renderPreview(); }); }
function renderPreview() {
  var p = peca(); if (!p) return;
  var d = dims(p), wrap = $("#wrap");
  var fit = Math.min((wrap.clientWidth - 48) / d.w, (wrap.clientHeight - 48) / d.h);
  escala = UI.zoom ? UI.zoom : Math.max(.05, fit);
  board.style.width = Math.round(d.w * escala) + "px"; board.style.height = Math.round(d.h * escala) + "px";
  var host = board.querySelector(".pgHost"); if (!host) { host = document.createElement("div"); host.className = "pgHost"; board.innerHTML = ""; board.appendChild(host); var o = document.createElement("div"); o.className = "ovl"; o.id = "ovl"; board.appendChild(o); }
  pgEl = montar(p, host, true); pgEl.style.position = "absolute"; pgEl.style.transformOrigin = "0 0"; pgEl.style.transform = "scale(" + escala + ")";
  $("#zLbl").textContent = Math.round(escala * 100) + "%";
  $("#fmtLbl").textContent = fmtNome(p) + (d.mm ? " · sai em 300 dpi com sangria" : " · " + d.w + "×" + d.h + " px") + (d.redondo ? " · corte redondo (a área escura fica fora)" : "");
  var gr = board.querySelector(".guiaRed"); if (d.redondo && !gr) { gr = document.createElement("div"); gr.className = "guiaRed"; board.insertBefore(gr, board.querySelector(".ovl")); } else if (!d.redondo && gr) gr.remove();
  desenhaSelecao();
  agendaThumbs();
}
function desenhaSelecao() {
  var o = $("#ovl"); if (!o) return; o.innerHTML = "";
  var L = layerSel(); if (!L) return;
  var b = document.createElement("div"); b.className = "selbox";
  b.style.left = L.x * escala + "px"; b.style.top = L.y * escala + "px"; b.style.width = L.w * escala + "px"; b.style.height = L.h * escala + "px";
  if (L.rot) { b.style.transform = "rotate(" + L.rot + "deg)"; }
  ["nw", "ne", "sw", "se", "e", "s"].forEach(function (h) { var e = document.createElement("div"); e.className = "hd " + h; e.dataset.h = h; b.appendChild(e); });
  o.appendChild(b);
}
var thT = null;
function agendaThumbs() { clearTimeout(thT); thT = setTimeout(renderPecas, 500); }
function renderPecas() {
  var box = $("#pecas");
  box.innerHTML = P.pecas.map(function (p, i) { return '<div class="pc' + (i === P.atual ? " on" : "") + '" data-i="' + i + '"><div class="th"></div><div class="tt"><b>' + esc(p.nome) + "</b><small>" + esc(MODELOS[p.modelo].nome + " · " + fmtNome(p)) + "</small></div></div>"; }).join("");
  $$(".pc", box).forEach(function (el) {
    var p = P.pecas[+el.dataset.i], d = dims(p), th = $(".th", el), s = Math.min(54 / d.w, 68 / d.h);
    var host = document.createElement("div"); th.appendChild(host); host.style.transform = "scale(" + s + ")"; host.style.left = (54 - d.w * s) / 2 + "px"; host.style.top = (68 - d.h * s) / 2 + "px";
    montar(p, host, false); if (d.redondo) { host.style.width = d.w + "px"; host.style.height = d.h + "px"; host.style.borderRadius = "50%"; host.style.overflow = "hidden"; }
    el.onclick = function () { if (P.atual === +el.dataset.i) return; P.atual = +el.dataset.i; UI.sel = null; UI.zoom = 0; if (UI.tab === "cam") UI.tab = "rap"; refresh(); commit(); };
  });
}
var TIPO_IC = { texto: "T", img: "▣", forma: "■", preco: "$", tag: "◆", icone: "✦", chips: "◎" };
function renderCamadas() {
  var p = peca(), box = $("#lays");
  if (!p.layers.length) { box.innerHTML = '<p class="hint">Sem camadas. Use os botões abaixo.</p>'; return; }
  box.innerHTML = p.layers.slice().reverse().map(function (L) {
    return '<div class="ly' + (L.id === UI.sel ? " on" : "") + (L.oculto ? " off" : "") + '" data-id="' + L.id + '"><span class="ic">' + TIPO_IC[L.tipo] + '</span><span class="nmL">' + esc(L.nome) + '</span>' +
      '<button class="lk' + (L.lock ? " on" : "") + '" data-lk="lock" title="' + (L.lock ? "Destravar (deixar clicar na arte)" : "Travar (não seleciona clicando na arte)") + '">' + (L.lock ? "🔒" : "🔓") + '</button>' +
      '<button class="lk" data-lk="oculto" title="' + (L.oculto ? "Mostrar" : "Esconder") + '">' + (L.oculto ? "◌" : "●") + "</button></div>";
  }).join("");
  $$(".ly", box).forEach(function (el) {
    el.onclick = function (e) {
      var L = p.layers.find(function (x) { return x.id === el.dataset.id; }); var k = e.target.closest("[data-lk]");
      if (k) { L[k.dataset.lk] = !L[k.dataset.lk]; renderCamadas(); renderPreview(); commit(); return; }
      selecionar(L.id);
    };
  });
}
function selecionar(id) { UI.sel = id; if (id && UI.tab !== "lib") UI.tab = "cam"; renderCamadas(); desenhaSelecao(); renderPainel(); }
function refresh() { $("#projNome").value = P.nome || ""; renderPecas(); renderCamadas(); renderPreview(); renderPainel(); }

/* ================= painel (direita) ================= */
function corCampo(path, val, rotulo) {
  var r = cor(val); var hex = /^#[0-9a-f]{6}$/i.test(r) ? r : "#000000";
  return '<div class="f"><span>' + rotulo + '</span><div class="cor"><input type="color" data-c="' + path + '" value="' + hex + '">' +
    Object.keys(MARCA_PADRAO).map(function (k) { return '<button class="sw' + (val === "@" + k ? " on" : "") + '" title="' + MARCA_NOMES[k] + '" data-tok="' + path + '" data-v="@' + k + '" style="background:' + (MA || P.marca)[k] + '"></button>'; }).join("") + "</div></div>";
}
function num(path, v, rot, o) { o = o || {}; return '<label class="f"><span>' + rot + '</span><input type="number" data-n="' + path + '" value="' + (Math.round((+v || 0) * 100) / 100) + '"' + (o.step ? ' step="' + o.step + '"' : "") + (o.min != null ? ' min="' + o.min + '"' : "") + "></label>"; }
function rng(path, v, rot, min, max, step, fmt) { return '<div class="f"><span>' + rot + '</span><div class="rg"><input type="range" data-r="' + path + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '"><output>' + (fmt ? fmt(v) : v) + "</output></div></div>"; }
function seg(path, v, ops, rot) { return '<div class="f">' + (rot ? "<span>" + rot + "</span>" : "") + '<div class="seg">' + ops.map(function (o) { return '<button data-s="' + path + '" data-v="' + o[0] + '" class="' + (String(v) === String(o[0]) ? "on" : "") + '">' + o[1] + "</button>"; }).join("") + "</div></div>"; }
function chk(path, v, rot) { return '<label class="chk"><input type="checkbox" data-k="' + path + '"' + (v ? " checked" : "") + "> " + rot + "</label>"; }
function sel(path, v, ops, rot) { return '<label class="f"><span>' + rot + '</span><select data-sel="' + path + '">' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; }
function fontesOps() { var vis = {}; return P.fontes.map(function (f) { vis[f.nome] = 1; return [f.nome, f.nome + " (sua)"]; }).concat(FONTES_TIME.filter(function (n) { return !vis[n] && (vis[n] = 1); }).map(function (n) { return [n, n + " (do time)"]; })).concat(FONTES.filter(function (f) { return !vis[f]; }).map(function (f) { return [f, f]; })); }
/* biblioteca compartilhada (logos de parceiros, personas, padrões): itens do kit + enviados pelo time */
var BIBLIO_TIME = { parceiros: [], personas: [], padroes: [] };
var BIBLIO_NOMES = { parceiros: "logos de parceiros", personas: "personas", padroes: "padrões" };
function biblioItens(tipo) { return ((KIT.biblio && KIT.biblio[tipo]) || []).map(function (x) { return { src: x[0], nome: x[1] }; }).concat(BIBLIO_TIME[tipo] || []); }
function biblioLinha(tipo, path, v, c) {
  var its = biblioItens(tipo), atual = String(v || "");
  return '<div class="biblio">' + (c.auto ? '<button class="b nada' + (atual === "auto" ? " on" : "") + '" data-bpick="auto" data-bpath="' + path + '" title="Escolha automática pela marca">Automático</button>' : "") + (c.vazio ? '<button class="b nada' + (!atual ? " on" : "") + '" data-bpick="" data-bpath="' + path + '" title="' + esc(c.vazio) + '">' + esc(c.vazio) + "</button>" : "") +
    (atual && atual !== "auto" && !its.some(function (it) { return it.src === atual; }) ? '<button class="b on' + (tipo === "padroes" ? " larga" : "") + '" title="Imagem enviada" style="background-image:url(&quot;' + esc(srcURL(atual)) + '&quot;)"></button>' : "") +
    its.map(function (it, i) { return '<button class="b' + (atual === it.src ? " on" : "") + (tipo === "padroes" ? " larga" : "") + '" data-bpick="' + i + '" data-btipo="' + tipo + '" data-bpath="' + path + '" title="' + esc(it.nome) + '" style="background-image:url(&quot;' + esc(it.src) + '&quot;)"></button>'; }).join("") +
    '<button class="b mais" data-bup="' + tipo + '" data-bpath="' + path + '" title="Enviar e guardar para o time">+</button></div>' +
    '<p class="hint" style="margin-top:-4px">Clique para usar. O <b>+</b> envia um novo' + (window.FLUXO_FONTES_ON ? " e guarda nas " + BIBLIO_NOMES[tipo] + " do time" : "") + ".</p>";
}
function biblioUsar(tipo, i, path) {
  var p = peca(), fim = function (val) { setv(path, val); regenera(p); renderPreview(); renderPainel(); commit(true); };
  if (i === "" || i === "auto") return fim(i);
  var it = biblioItens(tipo)[+i]; if (!it) return;
  if (!/^blob:/.test(it.src)) return fim(it.src);
  fetch(it.src).then(function (r) { return r.blob(); }).then(function (b) { return new Promise(function (ok) { var f = new FileReader(); f.onload = function () { ok(f.result); }; f.readAsDataURL(b); }); })
    .then(function (d) { var id = uid(); P.assets[id] = d; P.assetNomes = P.assetNomes || {}; P.assetNomes[id] = it.nome; fim("asset:" + id); });
}
function biblioAdd(tipo, nome, url) { var l = BIBLIO_TIME[tipo] || (BIBLIO_TIME[tipo] = []); if (l.some(function (x) { return x.nome === nome; })) return; l.push({ src: url, nome: nome }); if (UI.tab === "rap" && P) renderPainel(); }
function imgCampo(path, src, rot, contain) {
  var u = srcURL(src);
  return '<div class="f"><span>' + rot + '</span><div class="imgpick"><div class="pv' + (contain ? " ct" : "") + '" style="background-image:url(&quot;' + esc(u) + '&quot;)"></div><div style="display:flex;flex-direction:column;gap:5px"><button class="btn sm" data-up="' + path + '">Enviar imagem</button><button class="btn sm" data-lib="' + path + '">Escolher do banco</button>' + (u ? '<button class="btn sm" data-rf="' + path + '">Remover fundo</button>' : "") + '</div></div></div>';
}
// caminho "L.prop", "L.fill.c", "P.dados.x", "B.prop" (fundo), "M.navy" (marca), "PC.nome" (peça)
function alvo(path) {
  var p = peca(), parts = path.split("."), root = parts.shift(), o = root === "L" ? layerSel() : root === "B" ? p.bg : root === "M" ? P.marca : root === "PC" ? p : root === "D" ? p.dados : null;
  while (o && parts.length > 1) { var k = parts.shift(); if (o[k] == null || typeof o[k] !== "object") o[k] = {}; o = o[k]; }
  return { o: o, k: parts[0] };
}
function setv(path, v) { var a = alvo(path); if (!a.o) return; a.o[a.k] = v; }
function getv(path) { var a = alvo(path); return a.o ? a.o[a.k] : undefined; }

function renderPainel() {
  MA = marcaDe(peca());
  $$(".tabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.t === UI.tab); });
  var el = $("#painel"), p = peca(), h = "";
  if (UI.tab === "rap") h = painelRapido(p);
  else if (UI.tab === "cam") h = painelCamada(p);
  else if (UI.tab === "pag") h = painelPagina(p);
  else h = painelBanco();
  el.innerHTML = h;
  ligarPainel(el);
}
function painelRapido(p) {
  var M = MODELOS[p.modelo], h = '<div class="sec"><h3>' + esc(M.nome) + " · " + esc(fmtNome(p)) + "</h3>";
  if (!camposDe(M).length) return h + '<p class="hint">Peça livre: escolha uma camada na arte (ou na lista de camadas) e edite na aba <b>Camada</b>. Use os botões <b>+ Texto, + Imagem, + Forma</b> para montar. Fundo, cores e formato ficam na aba <b>Página</b>.</p></div>';
  if (KIT.auto && p.manual) h += '<div class="aviso">Esta peça foi ajustada à mão: mudar os textos não reorganiza mais o layout. <button class="btn sm" id="voltaAuto">Voltar ao automático</button></div>';
  if (KIT.temas && Object.keys(KIT.temas).length > 1 && !M.temaFixo) h += seg("PC.tema", p.tema, Object.keys(KIT.temas).map(function (k) { return [k, KIT.temas[k].nome]; }), "Marca");
  camposDe(M).forEach(function (c) {
    if (c.se && !c.se(p.dados, p)) return;
    if (typeof c.ops === "function") c = Object.assign({}, c, { ops: c.ops(p.dados, p) });
    var k = c.k, v = p.dados[k] == null ? "" : p.dados[k], path = "D." + k;
    if (c.t === "grupo") { h += '</div><div class="sec"><h3>' + esc(c.l) + "</h3>" + (c.dica ? '<p class="hint">' + c.dica + "</p>" : ""); return; }
    if (c.t === "img" && c.biblio) h += '<div class="f"><span>' + esc(c.l) + "</span></div>" + biblioLinha(c.biblio, path, v, c);
    else if (c.t === "img") h += imgCampo(path, v, c.l, c.contain);
    else if (c.t === "area") h += '<label class="f"><span>' + esc(c.l) + '</span><textarea data-t="' + path + '" rows="' + (c.rows || (k === "legal" ? 6 : 3)) + '" placeholder="' + esc(c.ph || "") + '">' + esc(v) + "</textarea></label>";
    else if (c.t === "seg") h += seg(path, v, c.ops, c.l);
    else if (c.t === "sel") h += sel(path, v, c.ops, c.l);
    else if (c.t === "tog") h += chk(path, !!v, c.l);
    else if (c.t === "cor") h += corCampo(path, v || "@navy", c.l);
    else if (c.t === "num") h += num(path, v, c.l, { step: c.step || 1, min: c.min });
    else if (c.t === "estilos") h += '<div class="f"><span>' + esc(c.l) + '</span><div class="estilos">' + c.ops.map(function (o) { return '<button data-s="' + path + '" data-v="' + esc(o[0]) + '" class="est' + (String(v) === String(o[0]) ? " on" : "") + '"><i style="background:' + (o[2] || "#333") + '"></i>' + esc(o[1]) + "</button>"; }).join("") + "</div></div>";
    else h += '<label class="f"><span>' + esc(c.l) + '</span><input type="text" data-t="' + path + '" value="' + esc(v) + '" placeholder="' + esc(c.ph || "") + '"></label>';
    if (c.dica && c.t !== "grupo") h += '<p class="hint" style="margin-top:-4px">' + c.dica + "</p>";
  });
  if (p.modelo === "promo") { var tom = p.dados.tom || "claro"; h += '<div class="f"><span>Texto sobre a foto</span><div class="seg"><button data-tom="claro" class="' + (tom === "claro" ? "on" : "") + '">Branco (foto escura)</button><button data-tom="escuro" class="' + (tom === "escuro" ? "on" : "") + '">Azul (foto clara)</button></div></div>'; }
  if (KIT.acoes) h += KIT.acoes(p) || "";
  if (KIT.fontesKit) { var fk = P.fk || {}; h += '</div><div class="sec"><h3>Fontes</h3><p class="hint">Valem para todas as peças do projeto. Envie a sua (.otf, .ttf ou .woff)' + (window.FLUXO_FONTES_ON ? " e ela fica guardada para o time todo" : "") + ".</p>" +
    Object.keys(KIT.fontesKit).map(function (k) { var d = KIT.fontesKit[k]; return '<label class="f"><span>' + esc(d[0]) + '</span><select data-fk="' + k + '">' + [["", "Padrão (" + d[1] + ")"]].concat(fontesOps()).map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(fk[k] || "") === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; }).join("") +
    '<button class="btn sm" id="addFonteR">Enviar fonte</button>'; }
  h += '<p class="hint">Dica: <b>**texto**</b> deixa em negrito e <b>*texto*</b> destaca na cor de destaque. Enter quebra a linha.</p>';
  var pals = KIT.paletas && KIT.paletas[p.modelo];
  if (pals) h += '</div><div class="sec"><h3>Combinação de cores</h3><div style="display:flex;flex-wrap:wrap;gap:6px">' + pals.map(function (x, i) { return '<button class="btn sm" data-pal="' + i + '"><i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + x.a + ';border:1px solid rgba(255,255,255,.3)"></i><i style="display:inline-block;width:12px;height:12px;border-radius:50%;background:' + x.b + ';border:1px solid rgba(255,255,255,.3);margin-left:-5px"></i> ' + esc(x.nome) + "</button>"; }).join("") + '<button class="btn sm" data-inv="1">Inverter claro ↔ escuro</button></div><p class="hint">Depois ajuste qualquer cor na aba Página › Cores desta peça.</p>';
  if (camposDe(M).some(function (c) { return c.k === "legal" || c.k === "validade"; })) h += '<button class="btn sm" id="legalTodas">Usar esta validade e texto legal em todas as peças</button>';
  h += "</div><div class=\"sec\"><h3>Atalhos</h3><div style=\"display:flex;flex-wrap:wrap;gap:6px\">" +
    '<button class="btn sm pri" id="loteBtn">Gerar vários (planilha)</button>' +
    '<button class="btn sm" id="dupProd">' + (M.dup || "Duplicar para outro produto") + '</button>' +
    (M.versoes || ["story", "feed"]).filter(function (f) { return f !== p.fmt; }).map(function (f) { return '<button class="btn sm" data-ver="' + f + '">Criar versão ' + esc(FMTS[f].nome.split(" ·")[0]) + "</button>"; }).join("") +
    '<button class="btn sm" id="resetMod">Voltar ao layout do modelo</button></div>' +
    '<p class="hint">"Voltar ao layout" recoloca tudo na posição original do modelo. Textos, fotos e preço continuam.</p></div>';
  return h;
}
function painelCamada(p) {
  var L = layerSel();
  if (!L) return '<div class="sec"><p class="empty">Clique em um elemento na arte ou na lista de camadas para editar.</p></div>';
  var h = '<div class="sec"><h3>' + esc(TIPO_IC[L.tipo] + "  " + L.nome) + '</h3><label class="f"><span>Nome da camada</span><input type="text" data-t="L.nome" value="' + esc(L.nome) + '"></label>';
  if (L.tipo === "texto") {
    var bound = /^\{(\w+)\}$/.exec(L.txt || "");
    h += '<label class="f"><span>Texto' + (bound ? " (campo " + esc(bound[1]) + " da aba Conteúdo)" : "") + '</span><textarea data-t="' + (bound ? "D." + bound[1] : "L.txt") + '" rows="4">' + esc(bound ? (p.dados[bound[1]] || "") : L.txt) + "</textarea></label>" +
      '<p class="hint"><b>**negrito**</b> · <b>*destaque*</b> na cor de destaque.</p>' +
      sel("L.fonte", L.fonte, fontesOps(), "Fonte") +
      '<div class="g2">' + sel("L.peso", L.peso, [[300, "Light"], [400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"], [800, "ExtraBold"], [900, "Black"]], "Peso") + num("L.tam", L.tam, "Tamanho", { min: 4 }) + "</div>" +
      corCampo("L.cor", L.cor, "Cor do texto") + corCampo("L.dest", L.dest || KIT.tok.dest, "Cor do destaque (*texto*)") +
      seg("L.al", L.al, [["left", "Esq."], ["center", "Centro"], ["right", "Dir."], ["justify", "Justif."]], "Alinhamento") +
      seg("L.va", L.va, [["top", "Topo"], ["middle", "Meio"], ["bottom", "Base"]], "Posição na caixa") +
      '<div class="g2">' + num("L.ls", L.ls, "Espaço entre letras (em)", { step: .01 }) + num("L.lh", L.lh, "Entrelinha", { step: .05 }) + "</div>" +
      seg("L.sombra", L.sombra || 0, [[0, "Sem sombra"], [1, "Suave"], [2, "Forte"]], "Sombra") +
      chk("L.caixa", L.caixa, "CAIXA ALTA") + chk("L.ita", L.ita, "Itálico") + chk("L.fit", L.fit, "Encolher para caber na caixa") + chk("L.linhas", L.linhas, "Linhas dos lados (— TEXTO —)");
  } else if (L.tipo === "img") {
    var bi = /^\{(\w+)\}$/.exec(L.src || "");
    h += imgCampo(bi ? "D." + bi[1] : "L.src", bi ? p.dados[bi[1]] : L.src, "Imagem", L.fit === "contain") +
      seg("L.fit", L.fit, [["cover", "Preencher"], ["contain", "Caber inteira"]], "Ajuste") +
      rng("L.zoom", L.zoom || 1, "Zoom", 1, 4, .02, function (v) { return Math.round(v * 100) + "%"; }) +
      '<div class="g2">' + rng("L.px", L.px == null ? 50 : L.px, "Enquadrar ←→", 0, 100, 1) + rng("L.py", L.py == null ? 50 : L.py, "Enquadrar ↑↓", 0, 100, 1) + "</div>" +
      '<div class="g2">' + num("L.raio", L.raio, "Cantos arredondados", { min: 0 }) + num("L.blarg", L.blarg, "Borda (px)", { min: 0 }) + "</div>" +
      (L.blarg ? corCampo("L.bcor", L.bcor, "Cor da borda") : "") +
      seg("L.sombra", L.sombra || 0, [[0, "Sem sombra"], [1, "Suave"], [2, "Forte"]], "Sombra");
  } else if (L.tipo === "forma") {
    h += painelFill("L.fill", L.fill) +
      '<div class="g2">' + num("L.raio", L.raio, "Cantos arredondados", { min: 0 }) + num("L.blarg", L.blarg, "Borda (px)", { min: 0 }) + "</div>" +
      (L.blarg ? corCampo("L.bcor", L.bcor, "Cor da borda") : "") +
      seg("L.sombra", L.sombra || 0, [[0, "Sem sombra"], [1, "Suave"], [2, "Forte"]], "Sombra") +
      chk("L.cantos", L.cantos, "Cantoneiras decorativas") +
      (L.cantos ? corCampo("L.ccor", L.ccor, "Cor das cantoneiras") + '<div class="g3">' + num("L.ctam", L.ctam, "Tamanho") + num("L.cin", L.cin, "Recuo") + num("L.clarg", L.clarg, "Espessura") + "</div>" : "");
  } else if (L.tipo === "preco") {
    var bp = /^\{(\w+)\}$/.exec(L.valor || ""), bu = /^\{(\w+)\}$/.exec(L.unid || "");
    h += '<div class="g3"><label class="f"><span>Moeda</span><input type="text" data-t="L.moeda" value="' + esc(L.moeda) + '"></label>' +
      '<label class="f"><span>Valor</span><input type="text" data-t="' + (bp ? "D." + bp[1] : "L.valor") + '" value="' + esc(bp ? p.dados[bp[1]] || "" : L.valor) + '"></label>' +
      '<label class="f"><span>Unidade</span><input type="text" data-t="' + (bu ? "D." + bu[1] : "L.unid") + '" value="' + esc(bu ? p.dados[bu[1]] || "" : L.unid) + '"></label></div>' +
      sel("L.fonte", L.fonte, fontesOps(), "Fonte") +
      '<div class="g2">' + sel("L.peso", L.peso, [[400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"], [800, "ExtraBold"], [900, "Black"]], "Peso") + num("L.tam", L.tam, "Tamanho", { min: 6 }) + "</div>" +
      corCampo("L.cor", L.cor, "Cor") + seg("L.al", L.al, [["left", "Esq."], ["center", "Centro"], ["right", "Dir."]], "Alinhamento") +
      seg("L.sombra", L.sombra || 0, [[0, "Sem sombra"], [1, "Suave"], [2, "Forte"]], "Sombra") +
      '<p class="hint">Se o valor não couber, o preço diminui sozinho.</p>';
  } else if (L.tipo === "tag") {
    var bt = /^\{(\w+)\}$/.exec(L.txt || "");
    h += '<label class="f"><span>Texto</span><input type="text" data-t="' + (bt ? "D." + bt[1] : "L.txt") + '" value="' + esc(bt ? p.dados[bt[1]] || "" : L.txt) + '"></label>' +
      seg("L.estilo", L.estilo, [["ouro", KIT.tok.gradNome], ["cheio", "Cor"], ["contorno", "Contorno"]], "Estilo") +
      (L.estilo !== "ouro" ? corCampo("L.fundo", L.fundo, L.estilo === "contorno" ? "Cor do contorno" : "Cor do fundo") : "") +
      corCampo("L.cor", L.cor, "Cor do texto") + sel("L.fonte", L.fonte, fontesOps(), "Fonte") +
      '<div class="g3">' + sel("L.peso", L.peso, [[400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"], [800, "ExtraBold"]], "Peso") + num("L.tam", L.tam, "Tamanho") + num("L.raio", L.raio, "Cantos") + "</div>" +
      num("L.ls", L.ls, "Espaço entre letras (em)", { step: .01 }) + chk("L.caixa", L.caixa, "CAIXA ALTA");
  } else if (L.tipo === "icone") {
    var nomesIc = (window.KIT && KIT.iconesNomes) || {};
    h += sel("L.icone", L.icone, Object.keys(ICONES).map(function (k) { return [k, nomesIc[k] || k]; }), "Ícone") + corCampo("L.cor", L.cor, "Cor") +
      rng("L.traco", L.traco || 1.8, "Espessura do traço", .75, 3, .05, function (v) { return String(v).replace(".", ","); });
  }
  h += "</div><div class=\"sec\"><h3>Posição e tamanho</h3><div class=\"g4\">" + num("L.x", L.x, "X") + num("L.y", L.y, "Y") + num("L.w", L.w, "Largura", { min: 2 }) + num("L.h", L.h, "Altura", { min: 2 }) + "</div>" +
    '<div class="g2">' + num("L.rot", L.rot, "Girar (graus)") + rng("L.op", L.op == null ? 1 : L.op, "Opacidade", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; }) + "</div>" +
    '<div style="display:flex;flex-wrap:wrap;gap:6px">' +
    '<button class="btn sm" data-ac="centroH">Centralizar ←→</button><button class="btn sm" data-ac="centroV">Centralizar ↑↓</button>' +
    '<button class="btn sm" data-ac="frente">Trazer p/ frente</button><button class="btn sm" data-ac="tras">Mandar p/ trás</button>' +
    '<button class="btn sm" data-ac="dup">Duplicar</button><button class="btn sm dan" data-ac="del">Excluir</button></div></div>';
  return h;
}
function painelFill(path, f) {
  f = f || { t: "cor", c: "@navy" };
  var h = seg(path + ".t", f.t, [["cor", "Cor"], ["grad", "Degradê"], ["ouro", KIT.tok.gradNome], ["img", "Imagem"], ["nenhum", "Nada"]], "Preenchimento");
  if (f.t === "cor") h += corCampo(path + ".c", f.c || "@navy", "Cor") + rng(path + ".a", f.a == null ? 1 : f.a, "Transparência da cor", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; });
  else if (f.t === "grad") h += '<div class="g2"><div>' + corCampo(path + ".c1", f.c1 || "@navy", "Cor 1") + rng(path + ".a1", f.a1 == null ? 1 : f.a1, "Opacidade 1", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; }) + "</div><div>" + corCampo(path + ".c2", f.c2 || "@navy2", "Cor 2") + rng(path + ".a2", f.a2 == null ? 1 : f.a2, "Opacidade 2", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; }) + "</div></div>" + rng(path + ".ang", f.ang || 0, "Ângulo", 0, 360, 1, function (v) { return v + "°"; }) + chk(path + ".esp", f.esp, "Espelhado (cor 1 → cor 2 → cor 1)");
  else if (f.t === "ouro") h += rng(path + ".ang", f.ang == null ? 100 : f.ang, "Ângulo do brilho", 0, 360, 1, function (v) { return v + "°"; }) + '<p class="hint">Usa as cores ' + KIT.tok.gradNome + ' da aba Página.</p>';
  else if (f.t === "img") h += imgCampo(path + ".src", f.src, "Imagem / textura") + seg(path + ".fit", f.fit || "cover", [["cover", "Preencher"], ["repeat", "Repetir (padrão)"]], "Como aplicar") + (f.fit === "repeat" ? rng(path + ".esc", f.esc || 40, "Tamanho do padrão", 5, 100, 1, function (v) { return v + "%"; }) : "");
  return h;
}
function painelPagina(p) {
  var b = p.bg || {};
  var h = '<div class="sec"><h3>Peça</h3><label class="f"><span>Nome da peça</span><input type="text" data-t="PC.nome" value="' + esc(p.nome) + '"></label>' +
    '<label class="f"><span>Formato</span><select data-sel="PC.fmt">' + fmtOptions(p.fmt) + "</select></label>";
  if (p.fmt === "custom") h += '<div class="g3">' + num("PC.custom.w", p.custom.w, "Largura") + num("PC.custom.h", p.custom.h, "Altura") + sel("PC.custom.un", p.custom.un, [["mm", "mm (impresso)"], ["px", "px (digital)"]], "Medida") + "</div>" + chk("PC.custom.redondo", p.custom.redondo, "Corte redondo");
  h += '<p class="hint">' + (dims(p).mm ? "Impresso: exporta em 300 dpi, com sangria e marcas de corte para a gráfica." : "Digital: exporta em PNG/JPG no tamanho certo para postar.") + (p.modelo !== "livre" ? " Ao trocar o formato, o layout do modelo é refeito (textos e fotos ficam)." : " Ao trocar o formato, tudo é reposicionado na mesma proporção.") + "</p>" +
    '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" id="pcDup">Duplicar peça</button><button class="btn sm" id="pcUp">↑ Subir</button><button class="btn sm" id="pcDown">↓ Descer</button><button class="btn sm dan" id="pcDel">Excluir peça</button></div></div>';
  var autoOn = KIT.auto && !p.manual;
  if (autoOn) h += '<div class="sec"><p class="hint">Fundo, cores e estilo desta peça ficam na aba <b>Conteúdo</b>, para tudo continuar alinhado. Para mexer livremente, use <b>Ajuste fino</b> no topo.</p></div>';
  if (!autoOn) h += painelCoresPeca(p);
  if (!autoOn) h += '<div class="sec"><h3>Fundo</h3>' + seg("B.t", b.t, [["cor", "Cor"], ["grad", "Degradê"], ["ouro", KIT.tok.gradNome], ["img", "Imagem / textura"]]);
  if (autoOn) {} else if (b.t === "img") h += imgCampo("B.src", b.src, "Imagem do fundo") + seg("B.fit", b.fit || "cover", [["cover", "Preencher"], ["contain", "Caber"], ["repeat", "Repetir"]], "Como aplicar") + (b.fit === "repeat" ? rng("B.esc", b.esc || 30, "Tamanho do padrão", 5, 100, 1, function (v) { return v + "%"; }) : "") + rng("B.op", b.op == null ? 1 : b.op, "Opacidade da imagem", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; }) + corCampo("B.c", b.c || "@creme", "Cor por baixo da imagem");
  else if (b.t === "cor") h += corCampo("B.c", b.c, "Cor");
  else if (b.t === "grad") h += '<div class="g2">' + corCampo("B.c1", b.c1 || "@navy", "Cor 1") + corCampo("B.c2", b.c2 || "@navy2", "Cor 2") + "</div>" + rng("B.ang", b.ang || 0, "Ângulo", 0, 360, 1, function (v) { return v + "°"; }) + chk("B.esp", b.esp, "Espelhado");
  else if (b.t === "ouro") h += rng("B.ang", b.ang == null ? 100 : b.ang, "Ângulo do brilho", 0, 360, 1, function (v) { return v + "°"; });
  if (!autoOn) h += rng("B.escurece", b.escurece || 0, "Escurecer o fundo", 0, .8, .01, function (v) { return Math.round(v * 100) + "%"; }) + "</div>";
  h += '<div class="sec"><h3>Cores da marca <button class="btn sm" id="marcaReset">Padrão</button></h3><p class="hint">Valem para todas as peças do projeto. Mudou aqui, muda em tudo que usa a cor da marca.</p><div class="g2">' +
    Object.keys(MARCA_PADRAO).map(function (k) { return '<label class="f"><span>' + MARCA_NOMES[k] + '</span><div class="cor"><input type="color" data-c="M.' + k + '" value="' + P.marca[k] + '"><small style="color:var(--mu)">' + P.marca[k] + "</small></div></label>"; }).join("") + "</div></div>";
  h += '<div class="sec"><h3>Fontes</h3><p class="hint">Envie a <b>Authentic</b> (ou outra .otf/.ttf/.woff) e ela aparece na lista de fontes de todas as camadas. ' + (window.FLUXO_FONTES_ON ? "Ela também fica guardada no Fluxo e aparece para o time todo, nos dois estúdios. " : "") + 'Sem ela, os títulos manuscritos usam ' + KIT.scriptPadrao + ', parecida.</p>' +
    (P.fontes.length ? '<div style="display:flex;flex-direction:column;gap:4px;margin-bottom:8px">' + P.fontes.map(function (f, i) { return '<div style="display:flex;justify-content:space-between;align-items:center"><span style="font-family:&quot;' + esc(f.nome) + '&quot;;font-size:18px">' + esc(f.nome) + '</span><button class="btn sm dan" data-fdel="' + i + '">Tirar</button></div>'; }).join("") + "</div>" : "") +
    '<button class="btn sm" id="addFonte">Enviar fonte</button></div>';
  return h;
}
function painelBanco() {
  var L = layerSel(), alvoTxt = L && (L.tipo === "img" || (L.tipo === "forma" && L.fill && L.fill.t === "img")) ? "Clique numa imagem para colocar em <b>" + esc(L.nome) + "</b>." : "Escolha uma camada de imagem (ou o fundo na aba Página) para aplicar.";
  var h = '<div class="sec"><h3>Banco de imagens</h3><p class="hint">' + alvoTxt + '</p><button class="btn sm" id="bancoUp">Enviar imagens</button></div><div class="sec"><h3>Da marca</h3><div class="lib">' +
    IMGS_MARCA.map(function (m) { return '<div class="it' + (m[2] ? " ct" : "") + '" title="' + esc(m[1]) + '" data-pick="' + esc(m[0]) + '" style="background-image:url(&quot;' + m[0] + '&quot;)"></div>'; }).join("") + "</div></div>";
  var ids = Object.keys(P.assets);
  h += '<div class="sec"><h3>Enviadas (' + ids.length + ")</h3>" + (ids.length ? '<div class="lib">' + ids.map(function (id) { return '<div class="it" data-pick="asset:' + id + '" style="background-image:url(&quot;' + P.assets[id] + '&quot;)"><button class="x" data-adel="' + id + '" title="Tirar do projeto">×</button></div>'; }).join("") + "</div>" : '<p class="hint">Nenhuma ainda.</p>') + "</div>";
  return h;
}

var afterSet = null;
function ligarPainel(el) {
  var p = peca(), x0;
  function mudou(path, reabrir) {
    if (path.indexOf("D.") === 0 && KIT.onDados) { KIT.onDados(p, path.slice(2)); $$('[data-t^="D."]', el).forEach(function (i) { if (i !== document.activeElement) { var k = i.dataset.t.slice(2); if (p.dados[k] != null && i.value !== String(p.dados[k])) i.value = p.dados[k]; } }); }
    if (path.indexOf("D.") === 0 || path === "PC.tema") regenera(p);
    if (path.indexOf("L.") === 0 && KIT.auto && !p.manual) { p.manual = true; reabrir = true; }
    if (path === "PC.fmt" || path.indexOf("PC.custom") === 0) { trocaFormato(p); reabrir = true; }
    if (path.indexOf("M.") === 0) { renderPecas(); }
    renderPreview(); if (path === "L.nome" || path === "PC.nome") { renderCamadas(); agendaThumbs(); }
    commit(); if (reabrir) renderPainel();
  }
  $$("[data-t]", el).forEach(function (i) { i.addEventListener("input", function () { setv(i.dataset.t, i.value); mudou(i.dataset.t); }); });
  $$("[data-n]", el).forEach(function (i) { i.addEventListener("input", function () { if (i.value === "" || isNaN(+i.value)) return; setv(i.dataset.n, +i.value); mudou(i.dataset.n); }); });
  $$("[data-r]", el).forEach(function (i) { i.addEventListener("input", function () { setv(i.dataset.r, +i.value); var o = i.parentNode.querySelector("output"); if (o) { var v = +i.value; o.textContent = /\.(op|a|a1|a2|zoom|escurece)$/.test(i.dataset.r) ? Math.round(v * 100) + "%" : /ang$/.test(i.dataset.r) ? v + "°" : /esc$/.test(i.dataset.r) ? v + "%" : v; } mudou(i.dataset.r); }); });
  $$("[data-sel]", el).forEach(function (i) { i.addEventListener("change", function () { var v = i.value; if (/peso$/.test(i.dataset.sel)) v = +v; setv(i.dataset.sel, v); mudou(i.dataset.sel, true); }); });
  $$("[data-k]", el).forEach(function (i) { i.addEventListener("change", function () { setv(i.dataset.k, i.checked); mudou(i.dataset.k, true); }); });
  $$("[data-s]", el).forEach(function (b) { b.addEventListener("click", function () { var v = b.dataset.v; if (/sombra$/.test(b.dataset.s)) v = +v; if (v === "true") v = true; if (v === "false") v = false; setv(b.dataset.s, v); if (/fill\.t$|^B\.t$/.test(b.dataset.s)) completaFill(b.dataset.s.replace(/\.t$/, ""), v); mudou(b.dataset.s, true); }); });
  $$("[data-c]", el).forEach(function (i) { i.addEventListener("input", function () { setv(i.dataset.c, i.value); $$('[data-tok="' + i.dataset.c + '"]', el).forEach(function (s) { s.classList.remove("on"); }); var sm = i.parentNode.querySelector("small"); if (sm) sm.textContent = i.value; mudou(i.dataset.c); }); });
  $$("[data-tok]", el).forEach(function (b) { b.addEventListener("click", function () { setv(b.dataset.tok, b.dataset.v); mudou(b.dataset.tok, true); }); });
  $$("[data-up]", el).forEach(function (b) { b.onclick = function () { escolherArquivo("image/*", false, function (fs) { addImagens(fs).then(function (ids) { if (ids[0]) { setv(b.dataset.up, "asset:" + ids[0]); mudou(b.dataset.up, true); } }); }); }; });
  $$("[data-lib]", el).forEach(function (b) { b.onclick = function () { abrirBancoPara(b.dataset.lib); }; });
  $$("[data-bpick]", el).forEach(function (b) { b.onclick = function () { biblioUsar(b.dataset.btipo, b.dataset.bpick, b.dataset.bpath); }; });
  $$("[data-bup]", el).forEach(function (b) { b.onclick = function () { var tipo = b.dataset.bup, path = b.dataset.bpath; escolherArquivo("image/*", false, function (fs) { addImagens(fs).then(function (ids) { if (!ids[0]) return; setv(path, "asset:" + ids[0]); mudou(path, true); if (window.aoEnviarBiblio) window.aoEnviarBiblio(tipo, fs); }); }); }; });
  $$("[data-fk]", el).forEach(function (i) { i.addEventListener("change", function () { P.fk = P.fk || {}; P.fk[i.dataset.fk] = i.value; regeneraTodas(); refresh(); commit(true); persist(); }); });
  if ((x0 = $("#addFonteR", el))) x0.onclick = addFonte;
  $$("[data-rf]", el).forEach(function (b) { b.onclick = function () {
    var path = b.dataset.rf, u = srcURL(dado(p, getv(path) || "")); if (!u) return;
    if (!window.RemoverFundo) return toast("O recortador não carregou. Recarregue a página.");
    RemoverFundo.dialogo(u, function (out) { var id = uid(); P.assets[id] = out; P.assetNomes = P.assetNomes || {}; P.assetNomes[id] = "sem-fundo-" + id + ".png"; setv(path, "asset:" + id); renderPreview(); renderPainel(); commit(true); toast("Fundo removido."); });
  }; });
  $$("[data-ac]", el).forEach(function (b) { b.onclick = function () { acao(b.dataset.ac); }; });
  $$("[data-ver]", el).forEach(function (b) { b.onclick = function () { var n = novaPeca(p.modelo, b.dataset.ver); n.dados = clone(p.dados); n.tema = p.tema; n.bg = clone(p.bg); regenera(n); P.pecas.splice(P.atual + 1, 0, n); P.atual++; UI.sel = null; UI.zoom = 0; refresh(); commit(true); toast("Versão " + FMTS[b.dataset.ver].nome + " criada."); }; });
  $$("[data-tom]", el).forEach(function (bt) { bt.onclick = function () {
    var t = bt.dataset.tom; p.dados.tom = t;
    p.layers.forEach(function (L) {
      if (["Produto", "Marca", "Preço"].indexOf(L.nome) >= 0) { L.cor = t === "escuro" ? "@navy" : "@branco"; L.sombra = t === "escuro" ? 0 : 1; }
      if (L.nome === "Sombra atrás do texto") L.oculto = t === "escuro";
    });
    renderPreview(); renderCamadas(); renderPainel(); commit(true);
  }; });
  $$("[data-pal]", el).forEach(function (b) { b.onclick = function () { KIT.paletas[p.modelo][+b.dataset.pal].aplicar(p); renderPreview(); renderPecas(); commit(true); }; });
  $$("[data-trc]", el).forEach(function (b) { b.onclick = function () { UI.trc = UI.trc === b.dataset.trc ? null : b.dataset.trc; renderPainel(); }; });
  $$("[data-trn]", el).forEach(function (b) { b.onclick = function () { trocarCor(p, UI.trc, b.dataset.trn); UI.trc = b.dataset.trn; renderPreview(); renderPainel(); commit(true); }; });
  if ((x0 = $("#trcCor", el))) x0.addEventListener("input", function () { var nv = this.value; trocarCor(p, UI.trc, nv); UI.trc = nv; renderPreview(); commit(); });
  if ((x0 = $("#trcCor", el))) x0.addEventListener("change", function () { renderPainel(); });
  $$("[data-inv]", el).forEach(function (b) { b.onclick = function () { inverterCores(p); renderPreview(); renderPecas(); renderPainel(); commit(true); }; });
  if ((x0 = $("#loteBtn", el))) x0.onclick = function () { loteDlg(p); };
  if (KIT.ligar) KIT.ligar(p, el);
  if ((x0 = $("#voltaAuto", el))) x0.onclick = function () { p.manual = false; regenera(p); UI.sel = null; refresh(); commit(true); toast("Voltou ao layout automático."); };
  var x;
  if ((x = $("#dupProd", el))) x.onclick = function () { duplicarPeca(p); toast("Peça duplicada. Troque produto, foto e preço."); };
  if ((x = $("#resetMod", el))) x.onclick = function () { if (!confirm("Recolocar tudo na posição do modelo? Textos, fotos e preço continuam.")) return; p.manual = false; var g = gerar(p.modelo, dims(p), p); p.layers = g.layers; p.bg = g.bg; UI.sel = null; refresh(); commit(true); };
  if ((x = $("#legalTodas", el))) x.onclick = function () { var n = 0; P.pecas.forEach(function (o) { if (o === p) return; if ("legal" in o.dados || "validade" in o.dados) { o.dados.legal = p.dados.legal; o.dados.validade = p.dados.validade; n++; } }); renderPecas(); commit(true); toast(n ? "Aplicado em " + n + " peça(s)." : "Nenhuma outra peça com texto legal."); };
  if ((x = $("#pcDup", el))) x.onclick = function () { duplicarPeca(p); };
  if ((x = $("#pcUp", el))) x.onclick = function () { var i = P.atual; if (!i) return; P.pecas.splice(i - 1, 0, P.pecas.splice(i, 1)[0]); P.atual--; refresh(); commit(true); };
  if ((x = $("#pcDown", el))) x.onclick = function () { var i = P.atual; if (i >= P.pecas.length - 1) return; P.pecas.splice(i + 1, 0, P.pecas.splice(i, 1)[0]); P.atual++; refresh(); commit(true); };
  if ((x = $("#pcDel", el))) x.onclick = function () { if (P.pecas.length < 2) return toast("O projeto precisa de pelo menos uma peça."); if (!confirm('Excluir a peça "' + p.nome + '"?')) return; P.pecas.splice(P.atual, 1); P.atual = Math.max(0, P.atual - 1); UI.sel = null; UI.zoom = 0; refresh(); commit(true); };
  if ((x = $("#marcaReset", el))) x.onclick = function () { P.marca = clone(MARCA_PADRAO); refresh(); commit(true); };
  if ((x = $("#addFonte", el))) x.onclick = addFonte;
  $$("[data-fdel]", el).forEach(function (b) { b.onclick = function () { P.fontes.splice(+b.dataset.fdel, 1); aplicaFontes(); renderPainel(); persist(); }; });
  if ((x = $("#bancoUp", el))) x.onclick = function () { escolherArquivo("image/*", true, function (fs) { addImagens(fs).then(function () { renderPainel(); }); }); };
  $$("[data-pick]", el).forEach(function (it) { it.onclick = function (e) { if (e.target.closest("[data-adel]")) return; aplicaDoBanco(it.dataset.pick); }; });
  $$("[data-adel]", el).forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); var id = b.dataset.adel; if (usoAsset(id) && !confirm("Essa imagem está em uso numa peça. Tirar mesmo assim?")) return; delete P.assets[id]; renderPainel(); renderPreview(); persist(); }; });
}
function completaFill(path, t) { // valores padrão ao trocar o tipo de preenchimento
  var o; if (path === "B") o = peca().bg; else { var a = alvo(path); o = a.o && a.o[a.k]; }
  if (!o) return;
  if (t === "grad") { if (!o.c1) o.c1 = "@navy"; if (!o.c2) o.c2 = "@navy2"; if (o.ang == null) o.ang = 160; }
  if (t === "img" && !o.src) o.src = path === "B" ? "img/topo.jpg" : "img/navy.jpg";
  if (t === "cor" && !o.c) o.c = "@navy";
}
function duplicarPeca(p) { var n = clone(p); delete n._orig; n.id = uid(); n.layers.forEach(function (l) { l.id = uid(); }); n.nome = p.nome + " (2)"; P.pecas.splice(P.atual + 1, 0, n); P.atual++; UI.sel = null; refresh(); commit(true); }
function usoAsset(id) { var s = JSON.stringify(P.pecas); return s.indexOf("asset:" + id) >= 0; }
function trocaFormato(p) {
  var antes = p._dims || null, d = dims(p);
  if (p.modelo !== "livre") { var g = gerar(p.modelo, d, p); p.layers = g.layers; p.bg = KIT.auto ? g.bg : (p.bg || g.bg); UI.sel = null; }
  else if (antes) { var fx = d.w / antes.w, fy = d.h / antes.h, k = Math.min(fx, fy); p.layers.forEach(function (L) { L.x = Math.round(L.x * fx); L.w = Math.round(L.w * fx); L.y = Math.round(L.y * fy); L.h = Math.round(L.h * fy); if (L.tam) L.tam = Math.round(L.tam * k * 10) / 10; }); }
  p._dims = { w: d.w, h: d.h }; UI.zoom = 0;
  if (p.nome && / · /.test(p.nome)) p.nome = p.nome.replace(/ · .*$/, " · " + fmtNome(p).split(" ")[0]);
  renderPecas(); renderCamadas();
}
var bancoAlvo = null;
function abrirBancoPara(path) { bancoAlvo = path; UI.tab = "lib"; renderPainel(); toast("Clique na imagem que quer usar."); }
function aplicaDoBanco(src) {
  var L = layerSel(), p = peca(), path = bancoAlvo;
  if (!path && L) { if (L.tipo === "img") { var b = /^\{(\w+)\}$/.exec(L.src || ""); path = b ? "D." + b[1] : "L.src"; } else if (L.tipo === "forma") { if (!L.fill || L.fill.t !== "img") L.fill = { t: "img", c: "@navy" }; path = "L.fill.src"; } }
  if (!path) return toast("Escolha antes uma camada de imagem (ou use Enviar/Escolher na aba Página para o fundo).");
  setv(path, src); bancoAlvo = null;
  UI.tab = path.indexOf("D.") === 0 ? "rap" : path.indexOf("B.") === 0 ? "pag" : "cam";
  renderPreview(); renderPainel(); commit();
}

/* ================= imagens e fontes ================= */
function escolherArquivo(accept, multi, cb) { var i = document.createElement("input"); i.type = "file"; i.accept = accept; i.multiple = !!multi; i.onchange = function () { if (i.files.length) cb(Array.prototype.slice.call(i.files)); }; i.click(); }
function lerDataURL(f) { return new Promise(function (r, j) { var fr = new FileReader(); fr.onload = function () { r(fr.result); }; fr.onerror = j; fr.readAsDataURL(f); }); }
function comprimir(f) { // até 2400 px; PNG com transparência continua PNG
  return lerDataURL(f).then(function (url) { return new Promise(function (res) {
    var im = new Image(); im.onload = function () {
      var max = 2400, s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * s), h = Math.round(im.naturalHeight * s);
      var c = document.createElement("canvas"); c.width = w; c.height = h; var g = c.getContext("2d"); g.drawImage(im, 0, 0, w, h);
      var png = /png|webp|gif/i.test(f.type), transp = false;
      if (png) { var d = g.getImageData(0, 0, w, h).data; for (var i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) { transp = true; break; } }
      if (transp) res(c.toDataURL("image/png"));
      else { g.globalCompositeOperation = "destination-over"; g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); res(c.toDataURL("image/jpeg", .88)); }
    }; im.onerror = function () { res(null); }; im.src = url; }); });
}
function addImagens(fs) {
  var b = busy("Preparando imagens…");
  return Promise.all(fs.map(comprimir)).then(function (urls) { var ids = []; P.assetNomes = P.assetNomes || {}; urls.forEach(function (u, k) { if (!u) return; var id = uid(); P.assets[id] = u; P.assetNomes[id] = fs[k].name; ids.push(id); }); persist(); b.remove(); if (urls.some(function (u) { return !u; })) toast("Alguma imagem não abriu (formato não suportado)."); return ids; });
}
function aplicaFontes() {
  var st = $("#fontesUser"); if (!st) { st = document.createElement("style"); st.id = "fontesUser"; document.head.appendChild(st); }
  st.textContent = P.fontes.map(function (f) { return '@font-face{font-family:"' + f.nome + '";src:url(' + f.data + ");font-weight:100 900;font-display:block}"; }).join("");
  return Promise.all(P.fontes.map(function (f) { return document.fonts.load('400 40px "' + f.nome + '"').catch(function () {}); }));
}
function addFonte() {
  escolherArquivo(".otf,.ttf,.woff,.woff2", true, function (fs) {
    Promise.all(fs.map(function (f) { return lerDataURL(f).then(function (d) { return { nome: f.name.replace(/\.[^.]+$/, "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ").trim(), data: d }; }); })).then(function (lst) {
      lst.forEach(function (f) { P.fontes = P.fontes.filter(function (x) { return x.nome !== f.nome; }); P.fontes.push(f); });
      if (window.aoEnviarFonte) window.aoEnviarFonte(fs);
      return aplicaFontes().then(function () {
        // se for uma fonte de assinatura (ex.: Authentic), já aplica nos títulos do aniversariante
        var scr = lst.find(function (f) { return /authentic|signature|script|hand/i.test(f.nome); });
        if (scr) P.pecas.forEach(function (p) { p.layers.forEach(function (L) { if (L.tipo === "texto" && L.fonte === KIT.scriptPadrao) L.fonte = scr.nome; }); });
        if (scr && KIT.fontesKit && KIT.fontesKit.scr) { P.fk = P.fk || {}; P.fk.scr = scr.nome; }
        if (KIT.auto) regeneraTodas();
        refresh(); persist(); toast(lst.length + " fonte(s) adicionada(s)" + (scr ? ". Aplicada nos títulos do aniversariante." : "."));
      });
    });
  });
}

/* ================= arrastar e redimensionar ================= */
var drag = null;
function snapV(v, alvos, tol) { var best = null; alvos.forEach(function (a) { if (Math.abs(v - a) <= tol && (best == null || Math.abs(v - a) < Math.abs(v - best))) best = a; }); return best; }
function initArrasto() {
  board.addEventListener("pointerdown", function (e) {
    if (modoSimples()) return;
    var hd = e.target.closest(".hd"), p = peca();
    if (hd) { var L0 = layerSel(); drag = { tipo: "res", h: hd.dataset.h, L: L0, x0: e.clientX, y0: e.clientY, o: { x: L0.x, y: L0.y, w: L0.w, h: L0.h, tam: L0.tam } }; board.setPointerCapture(e.pointerId); e.preventDefault(); return; }
    var el = e.target.closest(".L"); if (!el || !el.dataset.lid) { if (UI.sel) { UI.sel = null; renderCamadas(); desenhaSelecao(); renderPainel(); } return; }
    var L = p.layers.find(function (l) { return l.id === el.dataset.lid; }); if (!L || L.lock) return;
    if (UI.sel !== L.id) selecionar(L.id);
    drag = { tipo: "mov", L: L, x0: e.clientX, y0: e.clientY, o: { x: L.x, y: L.y }, moveu: false };
    board.setPointerCapture(e.pointerId); e.preventDefault();
  });
  board.addEventListener("pointermove", function (e) {
    if (!drag) return; var dx = (e.clientX - drag.x0) / escala, dy = (e.clientY - drag.y0) / escala, L = drag.L, d = dims(peca());
    if (drag.tipo === "mov") {
      if (!drag.moveu && Math.abs(dx) + Math.abs(dy) < 3 / escala) return; drag.moveu = true;
      var nx = drag.o.x + dx, ny = drag.o.y + dy, tol = 8 / escala, g = [];
      var sx = snapV(nx + L.w / 2, [d.w / 2], tol); if (sx != null) { nx = sx - L.w / 2; g.push(["v", d.w / 2]); } else { var e1 = snapV(nx, [0], tol); if (e1 != null) nx = e1; var e2 = snapV(nx + L.w, [d.w], tol); if (e2 != null) nx = e2 - L.w; }
      var sy = snapV(ny + L.h / 2, [d.h / 2], tol); if (sy != null) { ny = sy - L.h / 2; g.push(["h", d.h / 2]); } else { var e3 = snapV(ny, [0], tol); if (e3 != null) ny = e3; var e4 = snapV(ny + L.h, [d.h], tol); if (e4 != null) ny = e4 - L.h; }
      L.x = Math.round(nx); L.y = Math.round(ny);
      mostraGuias(g);
    } else {
      var o = drag.o, h = drag.h, x = o.x, y = o.y, w = o.w, hh = o.h;
      if (/e/.test(h)) w = o.w + dx; if (/s/.test(h)) hh = o.h + dy;
      if (/w/.test(h)) { w = o.w - dx; x = o.x + dx; } if (/n/.test(h)) { hh = o.h - dy; y = o.y + dy; }
      if (e.shiftKey && h.length === 2) { var r = o.w / o.h; if (Math.abs(w / o.w) > Math.abs(hh / o.h)) { var nh = w / r; if (/n/.test(h)) y = o.y + o.h - nh; hh = nh; } else { var nw = hh * r; if (/w/.test(h)) x = o.x + o.w - nw; w = nw; } }
      L.x = Math.round(x); L.y = Math.round(y); L.w = Math.max(4, Math.round(w)); L.h = Math.max(4, Math.round(hh));
    }
    agendaRender();
  });
  var fim = function () { if (!drag) return; var mexeu = drag.tipo === "res" || drag.moveu; drag = null; mostraGuias([]); if (mexeu) { if (KIT.auto) peca().manual = true; renderPainel(); commit(); } };
  board.addEventListener("pointerup", fim); board.addEventListener("pointercancel", fim);
  board.addEventListener("dblclick", function (e) { var el = e.target.closest(".L"); if (!el) return; UI.tab = "cam"; renderPainel(); var t = $("#painel textarea, #painel input[type=text]:not([data-t='L.nome'])"); if (t) t.focus(); });
}
function mostraGuias(g) { var o = $("#ovl"); if (!o) return; $$(".guide", o).forEach(function (x) { x.remove(); }); g.forEach(function (x) { var d = document.createElement("div"); d.className = "guide"; if (x[0] === "v") { d.style.left = x[1] * escala + "px"; d.style.top = 0; d.style.bottom = 0; d.style.width = "1px"; } else { d.style.top = x[1] * escala + "px"; d.style.left = 0; d.style.right = 0; d.style.height = "1px"; } o.appendChild(d); }); }

function acao(a) {
  var p = peca(), L = layerSel(), d = dims(p); if (!L) return;
  var i = p.layers.indexOf(L);
  if (a === "centroH") L.x = Math.round((d.w - L.w) / 2);
  else if (a === "centroV") L.y = Math.round((d.h - L.h) / 2);
  else if (a === "frente") { if (i < p.layers.length - 1) { p.layers.splice(i, 1); p.layers.splice(i + 1, 0, L); } }
  else if (a === "tras") { if (i > 0) { p.layers.splice(i, 1); p.layers.splice(i - 1, 0, L); } }
  else if (a === "dup") { var n = clone(L); n.id = uid(); n.nome = L.nome + " (cópia)"; n.x += 20; n.y += 20; p.layers.splice(i + 1, 0, n); UI.sel = n.id; }
  else if (a === "del") { p.layers.splice(i, 1); UI.sel = null; }
  if (KIT.auto) p.manual = true;
  renderCamadas(); renderPreview(); renderPainel(); commit(true);
}
function addCamada(tipo) {
  var p = peca(), d = dims(p), k = d.w / 1080, w = Math.round(d.w * .6), h = Math.round(d.h * .12), x = Math.round((d.w - w) / 2), y = Math.round((d.h - h) / 2), n;
  var claro = (function () { var b = p.bg || {}; var c = cor(b.c || b.c1 || "#fff"); if (b.t === "ouro") return true; if (!/^#/.test(c)) return true; var v = parseInt(c.slice(1), 16); return ((v >> 16) * .3 + (v >> 8 & 255) * .59 + (v & 255) * .11) > 150; })();
  if (tipo === "texto") n = T("Texto", x, y, w, h, { txt: "Novo texto", tam: Math.round(54 * k), cor: claro ? "@navy" : "@branco" });
  else if (tipo === "img") { n = I("Imagem", x, Math.round(d.h * .3), w, Math.round(d.h * .3), { src: "img/amb-1.jpg" }); }
  else if (tipo === "forma") n = F("Forma", x, y, w, h, { fill: { t: "cor", c: "@navy", a: 1 } });
  else if (tipo === "logo") n = I("Logo", Math.round(d.w * .3), Math.round(d.h * .04), Math.round(d.w * .4), Math.round(d.w * .13), { src: claro ? KIT.tok.logoEscuro : KIT.tok.logoClaro, fit: "contain" });
  else if (tipo === "preco") n = P$("Preço", x, y, w, Math.round(170 * k), { valor: "99,90", unid: "", tam: Math.round(150 * k), cor: claro ? "@navy" : "@branco" });
  else if (tipo === "tag") n = G("Selo", x, y, Math.round(300 * k), Math.round(62 * k), { txt: "SOMENTE", tam: Math.round(32 * k) });
  else if (tipo === "icone") { var s = Math.round(d.w * .12); n = Ic("Ícone", Math.round((d.w - s) / 2), Math.round((d.h - s) / 2), s, s, { icone: Object.keys(ICONES)[0], cor: claro ? "@navy" : "@branco", traco: 1.6 }); }
  if (KIT.auto) p.manual = true;
  p.layers.push(n); UI.sel = n.id; UI.tab = "cam";
  renderCamadas(); renderPreview(); renderPainel(); commit(true);
}

/* ================= exportação ================= */
var dlP = null;
function dl() { if (!dlP) dlP = (window.claude && window.claude.use) ? window.claude.use("downloads").catch(function () { return null; }) : Promise.resolve(null); return dlP; }
function saveFile(name, blob) {
  return dl().then(function (d) {
    if (d) return d.save({ filename: name, data: blob }).then(function () { toast("Arquivo pronto: " + name); }, function (e) { toast(e && e.code === "declined" ? "Download cancelado." : "Não foi possível salvar o arquivo."); });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  });
}
function busy(t) { var b = document.createElement("div"); b.className = "busy"; b.textContent = t || "Gerando…"; document.body.appendChild(b); return b; }
function esperaFontes(p) {
  var fs = {}; p.layers.forEach(function (L) { if (L.fonte) [200, 300, 400, 500, 600, 700, 800].forEach(function (w) { fs[w + ' 40px "' + L.fonte + '"'] = 1; }); });
  return Promise.all(Object.keys(fs).map(function (f) { return document.fonts.load(f).catch(function () {}); })).then(function () { return document.fonts.ready; });
}
function esperaImagens(p) {
  var us = []; var add = function (s) { var u = srcURL(dado(p, s)); if (u) us.push(u); };
  if (p.bg && p.bg.src) add(p.bg.src);
  p.layers.forEach(function (L) { if (L.src) add(L.src); if (L.fill && L.fill.src) add(L.fill.src); });
  return Promise.all(us.map(carregaDims));
}
function renderCanvas(p, scale) {
  var d = dims(p);
  return esperaFontes(p).then(function () { return esperaImagens(p); }).then(function () {
    var st = $("#stage"), pg = montar(p, st, false);
    return html2canvas(pg, { scale: scale, backgroundColor: null, useCORS: true, logging: false, width: d.w, height: d.h, windowWidth: d.w, windowHeight: d.h }).then(function (c) { st.innerHTML = ""; return c; });
  });
}
function bleedCanvas(src, bpx) {
  if (!bpx) return src; var w = src.width, h = src.height, c = document.createElement("canvas"); c.width = w + 2 * bpx; c.height = h + 2 * bpx; var g = c.getContext("2d");
  g.imageSmoothingEnabled = false; g.drawImage(src, bpx, bpx);
  g.drawImage(src, 0, 0, w, 1, bpx, 0, w, bpx); g.drawImage(src, 0, h - 1, w, 1, bpx, h + bpx, w, bpx);
  g.drawImage(src, 0, 0, 1, h, 0, bpx, bpx, h); g.drawImage(src, w - 1, 0, 1, h, w + bpx, bpx, bpx, h);
  g.drawImage(src, 0, 0, 1, 1, 0, 0, bpx, bpx); g.drawImage(src, w - 1, 0, 1, 1, w + bpx, 0, bpx, bpx); g.drawImage(src, 0, h - 1, 1, 1, 0, h + bpx, bpx, bpx); g.drawImage(src, w - 1, h - 1, 1, 1, w + bpx, h + bpx, bpx, bpx);
  return c;
}
function cropMarks(pdf, x0, y0, w, h, bleed, info) {
  var off = bleed + 1.5, len = 5; pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(.25);
  [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]].forEach(function (c, i) { var x = c[0], y = c[1], sx = i % 2 ? 1 : -1, sy = i > 1 ? 1 : -1; pdf.line(x + sx * off, y, x + sx * (off + len), y); pdf.line(x, y + sy * off, x, y + sy * (off + len)); });
  if (info) { pdf.setFontSize(6); pdf.setTextColor(60, 60, 60); pdf.text(info, x0, y0 + h + bleed + 6); }
}
function exportar() {
  var p = peca(), pp = Object.assign({ bleed: 3, marks: true, dpi: 300, faca: true, folha: "a4", gap: 4, qtd: 0 }, P.printPrefs || {});
  var algumRed = function (l) { return l.some(function (x) { return dims(x).redondo; }); };
  var m = modal('<h2>Exportar</h2>' +
    '<div class="f"><span>O que exportar</span><div class="seg" id="xEsc"><button data-v="uma" class="on">Esta peça</button><button data-v="todas">Todas as peças (' + P.pecas.length + ")</button></div></div>" +
    '<div id="xcPrint"><div class="xcard"><b>PDF para gráfica</b><p>Tamanho final exato, com sangria (o fundo continua além do corte), marcas de corte e, nas peças redondas, a linha da faca. 300 dpi.</p>' +
    '<div class="row"><label class="f"><span>Sangria</span><select id="xBleed">' + [0, 2, 3, 5].map(function (v) { return '<option value="' + v + '"' + (pp.bleed === v ? " selected" : "") + ">" + (v ? v + " mm" : "sem sangria") + "</option>"; }).join("") + '</select></label>' +
    '<label class="f"><span>Resolução</span><select id="xDpi"><option value="300"' + (pp.dpi === 300 ? " selected" : "") + '>300 dpi</option><option value="200"' + (pp.dpi === 200 ? " selected" : "") + '>200 dpi (arquivo menor)</option></select></label></div>' +
    '<label class="chk"><input type="checkbox" id="xMarks"' + (pp.marks ? " checked" : "") + "> Marcas de corte e informações da página</label>" +
    '<label class="chk"><input type="checkbox" id="xFaca"' + (pp.faca ? " checked" : "") + '> Desenhar a linha de corte (faca) em magenta <small style="color:var(--mu)">· a gráfica usa como guia e não imprime</small></label>' +
    '<button class="btn pri" id="xPdf">Gerar PDF para gráfica</button></div>' +
    '<div class="xcard"><b>Várias na mesma folha</b><p>Monta cópias lado a lado numa folha, com a linha de corte de cada uma. Bom para tags, cartões e vouchers impressos no escritório ou na gráfica rápida.</p>' +
    '<div class="row"><label class="f"><span>Folha</span><select id="xFolha">' + [["a4", "A4"], ["a3", "A3"], ["sra3", "SRA3 (32×45)"], ["carta", "Carta"]].map(function (f) { return '<option value="' + f[0] + '"' + (pp.folha === f[0] ? " selected" : "") + ">" + f[1] + "</option>"; }).join("") + '</select></label>' +
    '<label class="f"><span>Espaço entre cópias (mm)</span><input type="number" id="xGap" value="' + pp.gap + '" min="0" max="30" class="inp" style="width:90px"></label>' +
    '<label class="f"><span>Quantidade</span><input type="number" id="xQtd" value="' + (pp.qtd || "") + '" min="0" placeholder="o máximo" class="inp" style="width:110px"></label></div>' +
    '<button class="btn" id="xFolhaBtn">Gerar folha em PDF</button></div></div>' +
    '<div class="xcard"><b>Imagem</b><p>PNG (máxima qualidade' + '; peças redondas saem recortadas, com fundo transparente) ou JPG (mais leve, ideal para Instagram e WhatsApp). Várias peças saem num .zip.</p><div class="row"><button class="btn" id="xPng">Gerar PNG</button><button class="btn" id="xJpg">Gerar JPG</button></div></div>' +
    '<div class="xcard"><b>PDF digital</b><p>Para mandar por WhatsApp ou email. Sem sangria, arquivo leve.</p><button class="btn" id="xWeb">Gerar PDF digital</button></div>' +
    '<p class="hint">O PDF sai em RGB. Se a gráfica pedir CMYK, mande o PDF para mim na conversa que eu converto no perfil que ela pedir.</p>' +
    '<div class="acts"><button class="btn" data-close>Fechar</button></div>');
  var escopo = "uma";
  var lista = function () { return escopo === "uma" ? [p] : P.pecas.slice(); };
  var ajusta = function () { $("#xcPrint", m).hidden = !lista().some(function (x) { return dims(x).mm; }); };
  $$("#xEsc button", m).forEach(function (b) { b.onclick = function () { escopo = b.dataset.v; $$("#xEsc button", m).forEach(function (x) { x.classList.toggle("on", x === b); }); ajusta(); }; });
  ajusta();
  var prefs = function () { P.printPrefs = { bleed: +$("#xBleed", m).value, marks: $("#xMarks", m).checked, dpi: +$("#xDpi", m).value, faca: $("#xFaca", m).checked, folha: $("#xFolha", m).value, gap: +$("#xGap", m).value || 0, qtd: +$("#xQtd", m).value || 0 }; persist(); return P.printPrefs; };
  $("#xPdf", m).onclick = function () { var o = prefs(), l = lista().filter(function (x) { return dims(x).mm; }); m.remove(); gerarPDF(l, o); };
  $("#xFolhaBtn", m).onclick = function () { var o = prefs(), l = lista().filter(function (x) { return dims(x).mm; }); m.remove(); gerarFolha(l, o); };
  $("#xWeb", m).onclick = function () { var l = lista(); m.remove(); gerarPDF(l, { bleed: 0, marks: false, web: true, dpi: 110 }); };
  $("#xPng", m).onclick = function () { var l = lista(); m.remove(); gerarImgs(l, "png"); };
  $("#xJpg", m).onclick = function () { var l = lista(); m.remove(); gerarImgs(l, "jpg"); };
}
function escalaDe(p, dpi) { var d = dims(p); return d.mm ? (d.mm[0] / 25.4 * dpi) / d.w : 1; }
function recorteRedondo(c, fundo) { var o = document.createElement("canvas"); o.width = c.width; o.height = c.height; var g = o.getContext("2d"); if (fundo) { g.fillStyle = fundo; g.fillRect(0, 0, o.width, o.height); } g.save(); g.beginPath(); g.ellipse(o.width / 2, o.height / 2, o.width / 2, o.height / 2, 0, 0, Math.PI * 2); g.clip(); g.drawImage(c, 0, 0); g.restore(); return o; }
function faca(pdf, x, y, w, h, red) { pdf.setDrawColor(236, 0, 140); pdf.setLineWidth(.25); if (red) pdf.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, "S"); else pdf.rect(x, y, w, h, "S"); }
function gerarPDF(lista, o) {
  if (!lista.length) return toast("Nenhuma peça de impresso selecionada.");
  var b = busy(), jsPDF = window.jspdf.jsPDF, pdf = null, i = 0, bl = o.bleed || 0, slugMm = o.marks ? 10 : 0, q = o.web ? .82 : .95;
  var passo = function () {
    if (i >= lista.length) { b.textContent = "Preparando o arquivo…"; return saveFile(slug(P.nome) + (o.web ? "-digital" : "-grafica") + ".pdf", pdf.output("blob")); }
    var p = lista[i], d = dims(p), mm = d.mm || [d.w * 25.4 / 96, d.h * 25.4 / 96];
    b.textContent = "Gerando página " + (i + 1) + " de " + lista.length + "…";
    var sc = d.mm ? escalaDe(p, o.dpi || 300) : (o.web ? 1 : 2);
    return renderCanvas(p, sc).then(function (c) {
      if (o.web && d.redondo) c = recorteRedondo(c, "#ffffff");
      var bpx = d.mm && !o.web ? Math.round(bl / mm[0] * c.width) : 0, b2 = d.mm && !o.web ? bl : 0, sl = d.mm && !o.web ? slugMm : 0; c = bleedCanvas(c, bpx);
      var img = c.toDataURL("image/jpeg", q), pw = mm[0] + 2 * (b2 + sl), ph = mm[1] + 2 * (b2 + sl), ox = sl, ori = pw > ph ? "landscape" : "portrait";
      if (!pdf) pdf = new jsPDF({ unit: "mm", format: [pw, ph], orientation: ori, compress: true }); else pdf.addPage([pw, ph], ori);
      pdf.addImage(img, "JPEG", ox, ox, mm[0] + 2 * b2, mm[1] + 2 * b2, undefined, o.web ? "MEDIUM" : "FAST");
      if (!o.web && d.mm && o.faca && (d.redondo || !o.marks)) faca(pdf, ox + b2, ox + b2, mm[0], mm[1], d.redondo);
      if (o.marks && d.mm && !o.web) cropMarks(pdf, ox + b2, ox + b2, mm[0], mm[1], b2, P.nome + " · " + p.nome + " · " + mm[0] + "×" + mm[1] + " mm" + (d.redondo ? " redondo" : "") + " · sangria " + b2 + " mm · " + (o.dpi || 300) + " dpi · " + new Date().toLocaleDateString("pt-BR"));
      i++; return passo();
    });
  };
  passo().catch(function (e) { console.error(e); toast("A exportação falhou. Tente 200 dpi ou uma peça por vez."); }).then(function () { b.remove(); $("#stage").innerHTML = ""; });
}
var FOLHAS = { a4: [210, 297], a3: [297, 420], sra3: [320, 450], carta: [216, 279] };
function gerarFolha(lista, o) {
  if (!lista.length) return toast("Nenhuma peça de impresso selecionada.");
  var b = busy(), jsPDF = window.jspdf.jsPDF, pdf = null, i = 0, bl = o.bleed || 0, gap = Math.max(o.gap || 0, 0), mg = 8, F0 = FOLHAS[o.folha] || FOLHAS.a4, avisos = [];
  var passo = function () {
    if (i >= lista.length) { b.textContent = "Preparando o arquivo…"; if (avisos.length) toast(avisos.join(" ")); return saveFile(slug(P.nome) + "-folha-" + (o.folha || "a4") + ".pdf", pdf.output("blob")); }
    var p = lista[i], d = dims(p), mm = d.mm;
    b.textContent = "Montando folha " + (i + 1) + " de " + lista.length + "…";
    return renderCanvas(p, escalaDe(p, o.dpi || 300)).then(function (c) {
      var bpx = Math.round(bl / mm[0] * c.width); c = bleedCanvas(c, bpx);
      var img = c.toDataURL("image/jpeg", .93), cw = mm[0] + 2 * bl, ch = mm[1] + 2 * bl, step = function (n) { return n + gap; };
      var cabe = function (W, H) { var cols = Math.floor((W - 2 * mg + gap) / step(cw)), rows = Math.floor((H - 2 * mg - 6 + gap) / step(ch)); return { cols: Math.max(0, cols), rows: Math.max(0, rows), W: W, H: H }; };
      var a = cabe(F0[0], F0[1]), bb = cabe(F0[1], F0[0]), L = a.cols * a.rows >= bb.cols * bb.rows ? a : bb, max = L.cols * L.rows;
      if (!max) { avisos.push('"' + p.nome + '" não cabe nessa folha.'); i++; return passo(); }
      var n = o.qtd ? Math.min(o.qtd, max) : max, rows = Math.ceil(n / L.cols), usedW = L.cols * cw + (L.cols - 1) * gap, usedH = rows * ch + (rows - 1) * gap;
      var x0 = (L.W - usedW) / 2, y0 = Math.max(mg, (L.H - 6 - usedH) / 2), ori = L.W > L.H ? "landscape" : "portrait";
      if (!pdf) pdf = new jsPDF({ unit: "mm", format: [L.W, L.H], orientation: ori, compress: true }); else pdf.addPage([L.W, L.H], ori);
      for (var k = 0; k < n; k++) {
        var cx = x0 + (k % L.cols) * step(cw), cy = y0 + Math.floor(k / L.cols) * step(ch);
        pdf.addImage(img, "JPEG", cx, cy, cw, ch, "copia" + i, "FAST");
        if (o.faca !== false) faca(pdf, cx + bl, cy + bl, mm[0], mm[1], d.redondo);
      }
      pdf.setFontSize(7); pdf.setTextColor(90, 90, 90);
      pdf.text(P.nome + " · " + p.nome + " · " + n + " cópias de " + mm[0] + "×" + mm[1] + " mm" + (d.redondo ? " redondo" : "") + " · sangria " + bl + " mm · linha magenta = corte", mg, L.H - 4);
      if (bl && gap < 2 * bl) avisos.push("Com sangria, use espaço entre cópias de pelo menos " + 2 * bl + " mm para uma não invadir a outra.");
      i++; return passo();
    });
  };
  passo().catch(function (e) { console.error(e); toast("A folha falhou. Tente 200 dpi."); }).then(function () { b.remove(); $("#stage").innerHTML = ""; });
}
function gerarImgs(lista, tipo) {
  var b = busy(), blobs = [], i = 0, mime = tipo === "jpg" ? "image/jpeg" : "image/png";
  var nomeArq = function (p, k) { return String(k + 1).padStart(2, "0") + "-" + slug(p.nome) + "." + tipo; };
  var passo = function () {
    if (i >= lista.length) {
      if (blobs.length === 1) return saveFile(slug(P.nome) + "-" + slug(lista[0].nome) + "." + tipo, blobs[0]);
      b.textContent = "Compactando…"; var z = new JSZip(); blobs.forEach(function (bb, k) { z.file(nomeArq(lista[k], k), bb); });
      return z.generateAsync({ type: "blob" }).then(function (zb) { return saveFile(slug(P.nome) + "-pecas.zip", zb); });
    }
    var p = lista[i], d = dims(p); b.textContent = "Gerando imagem " + (i + 1) + " de " + lista.length + "…";
    return renderCanvas(p, d.mm ? escalaDe(p, 300) : 1).then(function (c) {
      if (d.redondo) c = recorteRedondo(c, tipo === "jpg" ? "#ffffff" : null);
      else if (tipo === "jpg") { var c2 = document.createElement("canvas"); c2.width = c.width; c2.height = c.height; var g = c2.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(c, 0, 0); c = c2; }
      return new Promise(function (r) { c.toBlob(r, mime, .92); });
    }).then(function (bb) { blobs.push(bb); i++; return passo(); });
  };
  passo().catch(function (e) { console.error(e); toast("A exportação falhou. Tente de novo."); }).then(function () { b.remove(); $("#stage").innerHTML = ""; });
}

/* ================= cores da peça: trocar e inverter ================= */
function visitaCores(p, fn) { // fn(valor) -> novo valor (ou undefined para manter)
  var f = function (o, k) { if (!o || o[k] == null || o[k] === "") return; var v = fn(o[k]); if (v !== undefined) o[k] = v; };
  var fill = function (x) { if (!x) return; if (x.t === "cor" || x.t === "img") f(x, "c"); if (x.t === "grad") { f(x, "c1"); f(x, "c2"); } };
  p.layers.forEach(function (L) {
    if (L.tipo === "texto") { f(L, "cor"); f(L, "dest"); }
    if (L.tipo === "preco") f(L, "cor");
    if (L.tipo === "tag") { f(L, "cor"); if (L.estilo !== "ouro") f(L, "fundo"); }
    if (L.tipo === "forma") { fill(L.fill); if (L.cantos) f(L, "ccor"); }
    if ((L.tipo === "forma" || L.tipo === "img") && L.blarg) f(L, "bcor");
  });
  fill(p.bg);
}
function coresDaPeca(p) { var l = []; visitaCores(p, function (v) { if (l.indexOf(v) < 0) l.push(v); }); return l; }
function trocarCor(p, de, para) { if (!de || !para || de === para) return; visitaCores(p, function (v) { return v === de ? para : undefined; }); }
function nomeCor(v) { return v && v[0] === "@" ? (MARCA_NOMES[v.slice(1)] || v.slice(1)) : v; }
function painelCoresPeca(p) {
  var cs = coresDaPeca(p);
  var h = '<div class="sec"><h3>Cores desta peça <button class="btn sm" data-inv="1">Inverter claro ↔ escuro</button></h3><p class="hint">Clique numa cor para trocar em todos os elementos que usam ela.</p><div style="display:flex;flex-wrap:wrap;gap:6px">' +
    cs.map(function (v) { return '<button class="btn sm' + (UI.trc === v ? " pri" : "") + '" data-trc="' + esc(v) + '"><i style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + cor(v) + ';border:1px solid rgba(255,255,255,.35)"></i> ' + esc(nomeCor(v)) + "</button>"; }).join("") + "</div>";
  if (UI.trc && cs.indexOf(UI.trc) >= 0) {
    var hex = cor(UI.trc); if (!/^#[0-9a-f]{6}$/i.test(hex)) hex = "#000000";
    h += '<div class="cor" style="margin-top:8px"><span class="hint" style="margin:0">Trocar ' + esc(nomeCor(UI.trc)) + ' por:</span><input type="color" id="trcCor" value="' + hex + '">' +
      Object.keys(MARCA_PADRAO).map(function (k) { return '<button class="sw" title="' + esc(MARCA_NOMES[k] || k) + '" data-trn="@' + k + '" style="background:' + (MA || P.marca)[k] + '"></button>'; }).join("") + "</div>";
  }
  return h + "</div>";
}
function inverterCores(p) {
  var t = KIT.tok, mp = KIT.inverter || {}; if (!KIT.inverter) { mp[t.claro] = t.escuro; mp[t.escuro] = t.claro; }
  visitaCores(p, function (v) { return mp[v] !== undefined ? mp[v] : undefined; });
  var imgs = KIT.inverterImg || {};
  var troca = function (x) { if (x && x.t === "img" && imgs[x.src]) { var n = imgs[x.src]; Object.keys(x).forEach(function (k) { delete x[k]; }); Object.assign(x, clone(n)); } };
  p.layers.forEach(function (L) {
    if (L.tipo === "img") { if (L.src === t.logoClaro) L.src = t.logoEscuro; else if (L.src === t.logoEscuro) L.src = t.logoClaro; }
    if (L.tipo === "forma") troca(L.fill);
  });
  troca(p.bg);
  toast("Cores invertidas. Ajuste o que quiser em Página › Cores desta peça.");
}

/* ================= vários de uma vez (planilha) ================= */
function carregarLib(url, global) { if (window[global]) return Promise.resolve(window[global]); return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = url; s.onload = function () { res(window[global]); }; s.onerror = rej; document.head.appendChild(s); }); }
function normNome(s) { return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\.[a-z0-9]{2,4}$/, "").replace(/[^a-z0-9]/g, ""); }
var XLSX_URL = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
function loteDlg(base) {
  var M = MODELOS[base.modelo], vistos = {}, campos = camposDe(M).filter(function (c) { if (['text', 'area', 'img', 'preco', 'num'].indexOf(c.t) < 0 || c.biblio || c.k === "fundoFoto" || vistos[c.k]) return false; return (vistos[c.k] = 1); }).map(function (c) { return [c.k, c.l, c.t]; });
  if (!campos.length) return toast("A peça livre não tem campos. Use um modelo (aniversariante, certificado, promoção…).");
  var linhas = null, fotos = 0;
  var outros = (M.versoes || []).filter(function (f) { return f !== base.fmt; });
  var m = modal('<h2>Gerar vários de uma vez</h2><p class="hint">Cada linha da planilha vira uma peça igual a esta (<b>' + esc(base.nome) + '</b>), com o mesmo visual e os textos da linha. Depois é só exportar todas.</p>' +
    '<div class="xcard"><b>1. Planilha modelo</b><p>Colunas: ' + campos.map(function (c) { return esc(c[1].replace(/\s*\(.*\)$/, "")); }).join(", ") + '. Nas colunas de foto, escreva o nome do arquivo (ex.: daniela.jpg).</p><button class="btn" id="lMod">Baixar planilha modelo</button></div>' +
    (campos.some(function (c) { return c[2] === "img"; }) ? '<div class="xcard"><b>2. Fotos (opcional)</b><p>Envie todas de uma vez. Elas entram na peça pelo nome do arquivo escrito na planilha.</p><div class="row"><button class="btn" id="lFotos">Enviar fotos</button><span class="hint" id="lFotosN" style="margin:0">' + Object.keys(P.assetNomes || {}).length + ' imagem(ns) com nome no projeto</span></div></div>' : "") +
    '<div class="xcard"><b>' + (campos.some(function (c) { return c[2] === "img"; }) ? "3" : "2") + '. Enviar a planilha preenchida</b><p>.xlsx, .xls ou .csv. A primeira linha tem os nomes das colunas.</p><button class="btn" id="lPlan">Escolher planilha</button><div id="lPrev" class="hint"></div>' +
    (outros.length ? '<div style="margin-top:6px">' + outros.map(function (f) { return '<label class="chk"><input type="checkbox" data-lv="' + f + '"> Criar também em ' + esc(FMTS[f].nome) + "</label>"; }).join("") + "</div>" : "") + "</div>" +
    '<div class="acts"><button class="btn" data-close>Cancelar</button><button class="btn pri" id="lOk" disabled>Criar peças</button></div>');
  var xl = function () { return carregarLib(XLSX_URL, "XLSX"); };
  $("#lMod", m).onclick = function () {
    xl().then(function (X) {
      var head = campos.map(function (c) { return c[1].replace(/\s*\(.*\)$/, ""); });
      var ex = campos.map(function (c) { var v = base.dados[c[0]]; if (c[2] === "img") { var id = String(v || "").indexOf("asset:") === 0 ? v.slice(6) : ""; return id && P.assetNomes && P.assetNomes[id] ? P.assetNomes[id] : ""; } return v == null ? "" : String(v); });
      var ws = X.utils.aoa_to_sheet([head, ex]); ws["!cols"] = head.map(function (h) { return { wch: Math.max(14, h.length + 4) }; });
      var wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, "Peças");
      saveFile("planilha-" + slug(M.nome) + ".xlsx", new Blob([X.write(wb, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    }).catch(function () { toast("Não consegui carregar o leitor de planilhas. Confira a internet."); });
  };
  if ($("#lFotos", m)) $("#lFotos", m).onclick = function () { escolherArquivo("image/*", true, function (fs) { addImagens(fs).then(function (ids) { fotos += ids.length; $("#lFotosN", m).textContent = fotos + " foto(s) enviada(s) agora · " + Object.keys(P.assetNomes || {}).length + " com nome no projeto"; }); }); };
  $("#lPlan", m).onclick = function () {
    escolherArquivo(".xlsx,.xls,.csv", false, function (fs) {
      xl().then(function (X) { return fs[0].arrayBuffer().then(function (buf) {
        var wb = X.read(buf, { type: "array" }), ws = wb.Sheets[wb.SheetNames[0]], rows = X.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        if (rows.length < 2) throw new Error("vazia");
        var head = rows[0].map(normNome), idx = {};
        campos.forEach(function (c) { var a = normNome(c[1].replace(/\s*\(.*\)$/, "")), b = normNome(c[0]); var i = head.indexOf(a); if (i < 0) i = head.indexOf(b); if (i < 0) i = head.findIndex(function (h) { return h && (h.indexOf(a) === 0 || a.indexOf(h) === 0); }); if (i >= 0) idx[c[0]] = i; });
        linhas = rows.slice(1).filter(function (r) { return r.some(function (v) { return String(v).trim(); }); }).map(function (r) { var o = {}; Object.keys(idx).forEach(function (k) { o[k] = String(r[idx[k]] == null ? "" : r[idx[k]]).trim(); }); return o; });
        var faltam = campos.filter(function (c) { return idx[c[0]] == null; }).map(function (c) { return c[1]; });
        $("#lPrev", m).innerHTML = "<b>" + linhas.length + " linha(s)</b> encontradas." + (faltam.length ? " Colunas não encontradas (ficam como na peça atual): " + esc(faltam.join(", ")) + "." : "");
        $("#lOk", m).disabled = !linhas.length;
      }); }).catch(function (e) { console.error(e); toast("Não consegui ler essa planilha."); });
    });
  };
  $("#lOk", m).onclick = function () {
    var porNome = {}; Object.keys(P.assetNomes || {}).forEach(function (id) { if (P.assets[id]) porNome[normNome(P.assetNomes[id])] = id; });
    var extras = $$("[data-lv]", m).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.lv; });
    var novas = [], semFoto = 0, titulo = campos.find(function (c) { return c[0] === M.nomeCampo; }) || campos.find(function (c) { return c[2] !== "img"; });
    linhas.forEach(function (row, n) {
      var q = clone(base); delete q._orig; q.id = uid(); q.layers.forEach(function (l) { l.id = uid(); });
      campos.forEach(function (c) {
        var v = row[c[0]]; if (v == null || v === "") return;
        if (c[2] === "img") { var id = porNome[normNome(v)]; if (id) q.dados[c[0]] = "asset:" + id; else if (/^https?:/.test(v)) q.dados[c[0]] = v; else semFoto++; }
        else q.dados[c[0]] = v.replace(/\\n/g, "\n");
      });
      if (KIT.onDados) campos.forEach(function (c) { if (row[c[0]]) KIT.onDados(q, c[0]); });
      regenera(q);
      var nm = titulo ? String(q.dados[titulo[0]] || "").replace(/\*/g, "").split("\n")[0].trim().slice(0, 40) : "";
      q.nome = (nm || M.nome + " " + (n + 1)) + " · " + fmtNome(q).split(" ")[0];
      novas.push(q);
      extras.forEach(function (f) { var v2 = novaPeca(base.modelo, f); v2.dados = clone(q.dados); v2.tema = q.tema; regenera(v2); v2.nome = (nm || M.nome) + " · " + FMTS[f].nome.split(" ")[0]; novas.push(v2); });
    });
    P.pecas.splice.apply(P.pecas, [P.atual + 1, 0].concat(novas)); P.atual++; UI.sel = null; UI.zoom = 0; m.remove(); refresh(); commit(true);
    toast(novas.length + " peça(s) criada(s)." + (semFoto ? " " + semFoto + " foto(s) não encontrada(s) pelo nome." : "") + " Exporte todas em Exportar › Todas as peças.");
  };
}

/* ================= números por extenso (cheques, tempo de casa) ================= */
function extensoInt(n) {
  var U = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
  var D = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
  var C = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
  function ate999(x) { if (x === 100) return "cem"; var c = Math.floor(x / 100), r = x % 100, p = []; if (c) p.push(C[c]); if (r) { if (r < 20) p.push(U[r]); else { var d = Math.floor(r / 10), u = r % 10; p.push(D[d] + (u ? " e " + U[u] : "")); } } return p.join(" e "); }
  if (n === 0) return "zero";
  var partes = [], esc = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]], i = 0, grupos = [];
  while (n > 0) { grupos.push(n % 1000); n = Math.floor(n / 1000); }
  for (i = grupos.length - 1; i >= 0; i--) { var g = grupos[i]; if (!g) continue; var t = i === 1 && g === 1 ? "mil" : ate999(g) + (i ? " " + esc[i][g === 1 ? 0 : 1] : ""); partes.push({ t: t, g: g, i: i }); }
  return partes.map(function (p, k) { if (k === 0) return p.t; var sep = (p.g < 100 || p.g % 100 === 0) ? " e " : " "; return sep + p.t; }).join("");
}
function porExtenso(valor) { // "250,00" -> "duzentos e cinquenta reais"
  var v = parseFloat(String(valor || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); if (isNaN(v)) return "";
  var r = Math.floor(v + 1e-9), c = Math.round((v - r) * 100), t = [];
  if (r) t.push(extensoInt(r) + (r === 1 ? " real" : (r % 1000000 === 0 ? " de reais" : " reais")));
  if (c) t.push(extensoInt(c) + (c === 1 ? " centavo" : " centavos"));
  return t.join(" e ");
}

/* ================= fontes do time (guardadas no Fluxo, valem para todos) ================= */
function registrarFonteTime(nome, url) {
  if (FONTES_TIME.indexOf(nome) >= 0) return Promise.resolve();
  FONTES_TIME.push(nome);
  var st = document.createElement("style"); st.textContent = '@font-face{font-family:"' + nome + '";src:url(' + url + ");font-weight:100 900;font-display:block}"; document.head.appendChild(st);
  return document.fonts.load('400 40px "' + nome + '"').catch(function () {}).then(function () { if (P) { if (KIT.auto) regeneraTodas(); renderPreview(); if (UI.tab === "rap") renderPainel(); agendaThumbs(); } });
}

/* ================= projeto: novo, arquivo ================= */
function novaPecaDlg() {
  var esc1 = Object.keys(MODELOS)[0], fm = MODELOS[esc1].fmt;
  var m = modal('<h2>Nova peça</h2><div class="mods" id="nMods">' + Object.keys(MODELOS).map(function (k) { return '<button class="mod' + (k === esc1 ? " on" : "") + '" data-m="' + k + '"><b>' + MODELOS[k].nome + "</b><small>" + MODELOS[k].desc + "</small></button>"; }).join("") + "</div>" +
    '<label class="f"><span>Formato</span><select id="nFmt">' + fmtOptions(fm) + '</select></label><p class="hint" id="nSug"></p>' +
    '<div class="g3" id="nCust" hidden><label class="f"><span>Largura</span><input type="number" id="nW" value="100"></label><label class="f"><span>Altura</span><input type="number" id="nH" value="150"></label><label class="f"><span>Medida</span><select id="nUn"><option value="mm">mm (impresso)</option><option value="px">px (digital)</option></select></label><label class="chk"><input type="checkbox" id="nRed"> Corte redondo</label></div>' +
    '<label class="chk"><input type="checkbox" id="nCopia"' + (peca() ? " checked" : "") + "> Aproveitar textos e fotos da peça atual (se for do mesmo modelo)</label>" +
    '<div class="acts"><button class="btn" data-close>Cancelar</button><button class="btn pri" id="nOk">Criar</button></div>');
  $$("#nMods .mod", m).forEach(function (b) { b.onclick = function () { esc1 = b.dataset.m; $$("#nMods .mod", m).forEach(function (x) { x.classList.toggle("on", x === b); }); $("#nFmt", m).value = MODELOS[esc1].fmt; $("#nCust", m).hidden = true; sug(); }; });
  var sug = function () { var v = MODELOS[esc1].versoes; $("#nSug", m).textContent = v && v.length ? "Formatos pensados para este modelo: " + v.map(function (f) { return FMTS[f].nome; }).join(", ") + "." : ""; }; sug();
  $("#nFmt", m).onchange = function () { $("#nCust", m).hidden = this.value !== "custom"; };
  $("#nOk", m).onclick = function () {
    var f = $("#nFmt", m).value, c = { w: +$("#nW", m).value || 100, h: +$("#nH", m).value || 150, un: $("#nUn", m).value, redondo: $("#nRed", m).checked };
    var n = novaPeca(esc1, f, c), atual = peca();
    if ($("#nCopia", m).checked && atual && atual.modelo === esc1) n.dados = clone(atual.dados);
    P.pecas.push(n); P.atual = P.pecas.length - 1; UI.sel = null; UI.zoom = 0; UI.tab = "rap"; m.remove(); refresh(); commit(true);
  };
}
function arquivoDlg() {
  var m = modal('<h2>Arquivo</h2><div class="xcard"><b>Salvar projeto no computador</b><p>Um arquivo .json com todas as peças, imagens e fontes, para guardar ou mandar para alguém.</p><button class="btn" id="aSal">Baixar projeto</button></div>' +
    '<div class="xcard"><b>Abrir projeto</b><p>Abre um .json salvo antes. O projeto atual é substituído (salve antes se precisar).</p><button class="btn" id="aAbr">Abrir arquivo</button></div>' +
    '<div class="xcard"><b>Limpar imagens não usadas</b><p>Tira do projeto as imagens enviadas que nenhuma peça usa. Deixa o arquivo menor.</p><button class="btn" id="aLimpa">Limpar</button></div>' +
    '<div class="acts"><button class="btn" data-close>Fechar</button></div>');
  $("#aSal", m).onclick = function () { m.remove(); saveFile(slug(P.nome) + ".json", new Blob([JSON.stringify(P)], { type: "application/json" })); };
  $("#aAbr", m).onclick = function () { escolherArquivo(".json,application/json", false, function (fs) { fs[0].text().then(function (t) { abrirDados(JSON.parse(t)); m.remove(); toast("Projeto aberto."); }).catch(function () { toast("Esse arquivo não é um projeto válido."); }); }); };
  $("#aLimpa", m).onclick = function () { var n = limparAssets(); persist(); toast(n ? n + " imagem(ns) removida(s)." : "Nenhuma imagem sobrando."); };
}
function limparAssets() { var s = JSON.stringify(P.pecas), n = 0; Object.keys(P.assets).forEach(function (id) { if (s.indexOf("asset:" + id) < 0) { delete P.assets[id]; n++; } }); return n; }
function hidratar(d) {
  var p = projetoNovo(); p.pecas = [];
  Object.assign(p, d || {}); p.marca = Object.assign(clone(MARCA_PADRAO), (d && d.marca) || {}); p.assets = p.assets || {}; p.fontes = p.fontes || [];
  if (!p.pecas || !p.pecas.length) p.pecas = projetoNovo().pecas;
  p.pecas.forEach(function (x) { x.dados = x.dados || {}; x.layers = x.layers || []; x.custom = x.custom || { w: 100, h: 150, un: "mm" }; if (!MODELOS[x.modelo]) x.modelo = "livre"; var dd = dims(x); x._dims = { w: dd.w, h: dd.h }; });
  if (!(p.atual >= 0 && p.atual < p.pecas.length)) p.atual = 0;
  return p;
}
function abrirDados(d) { P = hidratar(d); UI.sel = null; UI.zoom = 0; UI.hist = []; UI.fut = []; lastSnap = snap(); aplicaFontes().then(refresh); persist(); }

/* ================= início ================= */
function modoSimples() { return !!KIT.simples && !UI.avancado; }
function aplicaModo() {
  document.body.classList.toggle("simples", modoSimples());
  var b = $("#avancado"); if (b) { b.hidden = !KIT.simples; b.classList.toggle("on", !!UI.avancado); b.textContent = UI.avancado ? "Ajuste fino: ligado" : "Ajuste fino"; }
  if (modoSimples() && UI.tab === "cam") UI.tab = "rap";
}
function init() {
  lerKit();
  var top = $(".top"), bt = document.createElement("button"); bt.className = "btn"; bt.id = "avancado"; bt.hidden = true; bt.title = "Mover e editar cada elemento livremente";
  if (top && $("#exportar")) top.insertBefore(bt, $("#exportar"));
  bt.onclick = function () {
    if (!UI.avancado && !confirm("Ajuste fino: você pode mover, redimensionar e editar cada elemento.\n\nA peça que você mexer deixa de se reorganizar sozinha quando mudar os textos. Dá para voltar com \"Voltar ao automático\".")) return;
    UI.avancado = !UI.avancado; UI.sel = null; aplicaModo(); refresh();
  };
  board = $("#board");
  try { if (window.top !== window) $("#voltar").hidden = true; } catch (e) {}
  $$(".tabs button").forEach(function (b) { b.onclick = function () { UI.tab = b.dataset.t; bancoAlvo = null; renderPainel(); }; });
  $$("[data-add]").forEach(function (b) { b.onclick = function () { addCamada(b.dataset.add); }; });
  $("#novaPeca").onclick = novaPecaDlg;
  $("#exportar").onclick = exportar;
  $("#arquivo").onclick = arquivoDlg;
  $("#undo").onclick = undo; $("#redo").onclick = redo;
  $("#novoProj").onclick = function () { if (!confirm("Começar um projeto novo? O atual sai da tela (salve no Fluxo ou baixe antes, se quiser guardar).")) return; var n = projetoNovo(); n.fluxoId = ""; abrirDados(n); };
  $("#projNome").addEventListener("input", function () { P.nome = this.value; commit(); });
  $("#zIn").onclick = function () { UI.zoom = Math.min(3, (UI.zoom || escala) * 1.2); renderPreview(); };
  $("#zOut").onclick = function () { UI.zoom = Math.max(.05, (UI.zoom || escala) / 1.2); renderPreview(); };
  $("#zFit").onclick = function () { UI.zoom = 0; renderPreview(); };
  window.addEventListener("resize", function () { if (!UI.zoom) agendaRender(); });
  document.addEventListener("keydown", function (e) {
    var t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if ((e.ctrlKey || e.metaKey) && !typing && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
    if (typing || $(".modalBg")) return;
    var L = layerSel(); if (!L || modoSimples()) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); acao("del"); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); acao("dup"); return; }
    var st = e.shiftKey ? 10 : 1, mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (mv) { e.preventDefault(); L.x += mv[0]; L.y += mv[1]; renderPreview(); commit(); }
    if (e.key === "Escape") { UI.sel = null; renderCamadas(); desenhaSelecao(); renderPainel(); }
  });
  initArrasto();
  aplicaModo();
  IDB.get("projeto").then(function (s) { return s ? JSON.parse(s) : null; }).catch(function () { return null; }).then(function (d) {
    abrirDados(d || projetoNovo());
    var fl = (KIT.carregarFontes || []).map(function (f) { return document.fonts.load(f).catch(function () {}); });
    Promise.all(fl).then(function () { return document.fonts.ready; }).then(function () { if (KIT.auto) P.pecas.forEach(regenera); renderPreview(); renderPecas(); renderPainel(); });
  });
}
document.addEventListener("DOMContentLoaded", init);
