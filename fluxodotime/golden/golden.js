/* Materiais Golden · estúdio de peças da Alvorada Golden (feed, story, aniversariante, impressos)
   Tudo roda no navegador. Projeto fica no IndexedDB; "Salvar no Fluxo" guarda no Supabase (ponte.js). */
"use strict";
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function slug(s) { return String(s || "golden").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "golden"; }
function toast(msg) { var t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); }
function modal(html) { var bg = document.createElement("div"); bg.className = "modalBg"; bg.innerHTML = '<div class="modal">' + html + "</div>"; document.body.appendChild(bg); bg.addEventListener("click", function (e) { if (e.target === bg || e.target.closest("[data-close]")) bg.remove(); }); return bg; }

/* ================= formatos ================= */
var BASE_DPI = 150; // impressos: 1 mm = 150/25,4 px na edição; exporta em 300 dpi
var FMTS = {
  feed: { nome: "Feed 1080×1350", w: 1080, h: 1350 },
  story: { nome: "Story 1080×1920", w: 1080, h: 1920 },
  quad: { nome: "Quadrado 1080×1080", w: 1080, h: 1080 },
  a4: { nome: "A4 · 21×29,7 cm", mm: [210, 297] },
  a4h: { nome: "A4 deitado", mm: [297, 210] },
  a5: { nome: "A5 · 14,8×21 cm", mm: [148, 210] },
  a3: { nome: "A3 · 29,7×42 cm", mm: [297, 420] },
  fili: { nome: "Filipeta 10×21 cm", mm: [100, 210] },
  c1015: { nome: "Cartão 10×15 cm", mm: [100, 150] },
  custom: { nome: "Personalizado" }
};
function dims(p) {
  var f = FMTS[p.fmt] || FMTS.feed, mm = f.mm, w = f.w, h = f.h;
  if (p.fmt === "custom") { var c = p.custom || {}; if (c.un === "px") { w = +c.w || 1080; h = +c.h || 1080; mm = null; } else mm = [+c.w || 100, +c.h || 150]; }
  if (mm) { w = Math.round(mm[0] / 25.4 * BASE_DPI); h = Math.round(mm[1] / 25.4 * BASE_DPI); }
  return { w: w, h: h, mm: mm || null };
}
function fmtNome(p) { if (p.fmt !== "custom") return FMTS[p.fmt].nome; var c = p.custom || {}; return "Personalizado " + c.w + "×" + c.h + (c.un === "px" ? " px" : " mm"); }

/* ================= marca ================= */
var MARCA_PADRAO = { navy: "#0c1333", navy2: "#1c2a5e", ouro: "#c9a05c", ouro2: "#f0d48e", ouro3: "#9c7333", creme: "#ecebe6", branco: "#ffffff", grafite: "#5c5c5c" };
var MARCA_NOMES = { navy: "Azul", navy2: "Azul claro", ouro: "Ouro", ouro2: "Ouro claro", ouro3: "Ouro escuro", creme: "Creme", branco: "Branco", grafite: "Grafite" };
var FONTES = ["Poppins", "Montserrat", "Playfair Display", "Cormorant Garamond", "Bebas Neue", "Allura", "Great Vibes", "Ms Madi", "Ephesis", "Corinthia", "Pinyon Script"];
var IMGS_MARCA = [
  ["img/logo-branco.png", "Logo branco", 1], ["img/logo-azul.png", "Logo azul", 1], ["img/navy.jpg", "Azul texturizado"], ["img/topo.jpg", "Linhas creme"],
  ["img/ouro-fosco.jpg", "Ouro fosco"], ["img/ouro-foil.jpg", "Ouro brilho"], ["img/granito.jpg", "Granito"], ["img/amb-1.jpg", "Ambiente (exemplo)"],
  ["img/amb-2.jpg", "Ambiente 2 (exemplo)"], ["img/peca-1.jpg", "Peça (exemplo)"], ["img/foto-modelo.jpg", "Foto (modelo)"]
];
var LEGAL = "Ofertas válidas de {validade}, ou enquanto durarem os estoques – prevalecendo o que ocorrer primeiro. Durante esse período, as compras podem ser parceladas em até 06 vezes sem juros no cartão de crédito, mediante aprovação da administradora do cartão. Importante: produtos em oferta não entram nesta condição, pois já possuem desconto aplicado. Para mais informações sobre formas de pagamento e produtos participantes, consulte nossos vendedores ou entre em contato pelo telefone (67) 3345-4020. Reservamo-nos o direito de corrigir eventuais erros de digitação, com ofertas disponíveis para consulta na entrada da loja.";

/* ================= modelos ================= */
var MODELOS = {
  promo: { nome: "Promoção", desc: "Faixa azul com PROMOÇÃO, foto de ambiente, produto, selo dourado e preço.", fmt: "story",
    campos: [["chamada", "Chamada"], ["produto", "Produto", "area"], ["marca", "Marca / fabricante"], ["selo", "Selo (ex.: SOMENTE, POR APENAS)"], ["preco", "Preço", "preco"], ["unid", "Unidade (ex.: M2) – opcional"], ["ambiente", "Foto do ambiente", "img"], ["validade", "Validade (vai no texto legal)"], ["legal", "Texto legal", "area"]],
    dados: { chamada: "PROMOÇÃO", produto: "PORCELANATO\nAREIA 84X84\nACETINADO", marca: "ELIANE", selo: "SOMENTE", preco: "88,90", unid: "", ambiente: "img/amb-2.jpg", validade: "25/07 a 27/07/2026", legal: LEGAL } },
  ofertas: { nome: "Ofertas", desc: "Foto de ambiente inteira, caixa OFERTAS, painel com a peça, código, DE/POR e preço.", fmt: "story",
    campos: [["chamada", "Chamada"], ["codigo", "Código"], ["tipo", "Tipo (1ª linha, em negrito)"], ["produto", "Descrição", "area"], ["marca", "Marca / fabricante"], ["de", "Preço DE (sem R$)"], ["preco", "Preço POR", "preco"], ["unid", "Unidade (ex.: M2)"], ["ambiente", "Foto do ambiente", "img"], ["peca", "Foto da peça", "img"], ["validade", "Validade (vai no texto legal)"], ["legal", "Texto legal", "area"]],
    dados: { chamada: "OFERTAS", codigo: "Cód. 223.486", tipo: "PORCELANATO", produto: "87,7X87,7 A 61713\nALQUIMIA GR NAT\nRETIFICADO", marca: "PORTINARI", de: "128,96", preco: "86,45", unid: "M2", ambiente: "img/amb-2.jpg", peca: "img/peca-1.jpg", validade: "10/08 a 30/09/2026", legal: LEGAL } },
  aniver: { nome: "Aniversariante", desc: "Cartão com foto, nome e mensagem. Sai em A4 pronto para gráfica (ou feed/story).", fmt: "a4",
    campos: [["foto", "Foto", "img"], ["titulo", "Título"], ["nome", "Nome"], ["mensagem", "Mensagem", "area"]],
    dados: { foto: "img/foto-modelo.jpg", titulo: "Feliz Aniversário,", nome: "**Nome** Sobrenome", mensagem: "Um novo ano, uma nova\noportunidade para você\n*brilhar ainda mais.*" } },
  livre: { nome: "Livre", desc: "Página em branco com a marca. Você monta: fundo, cores, textos, imagens.", fmt: "a4", campos: [], dados: {} }
};

// camada: tipo texto | img | forma | preco | tag
function T(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "texto", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, txt: "", fonte: "Poppins", peso: 400, tam: 40, cor: "@branco", dest: "@ouro", al: "center", va: "middle", caixa: false, ita: false, ls: 0, lh: 1.15, sombra: 0, fit: true, linhas: false }, o || {}); }
function I(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "img", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, src: "", fit: "cover", zoom: 1, px: 50, py: 50, raio: 0, bcor: "@branco", blarg: 0, sombra: 0 }, o || {}); }
function F(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "forma", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, fill: { t: "cor", c: "@navy", a: 1 }, raio: 0, bcor: "@ouro", blarg: 0, sombra: 0, cantos: false, ccor: "@ouro", ctam: 40, cin: 20, clarg: 3 }, o || {}); }
function P$(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "preco", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, moeda: "R$", valor: "{preco}", unid: "{unid}", fonte: "Poppins", peso: 700, tam: 150, cor: "@branco", al: "left", sombra: 0 }, o || {}); }
function G(nome, x, y, w, h, o) { return Object.assign({ id: uid(), tipo: "tag", nome: nome, x: x, y: y, w: w, h: h, rot: 0, op: 1, txt: "", estilo: "ouro", fundo: "@ouro", cor: "@navy", fonte: "Poppins", peso: 800, tam: 30, ls: 0, raio: 4, blarg: 3, caixa: true, sombra: 0 }, o || {}); }
var OURO = { t: "ouro", ang: 100 };

function gerar(modelo, d) {
  var W = d.w, H = d.h, r = H / W, L = [], bg;
  // base de desenho: story (1080×1920), feed (1080×1350), quadrado/horizontal (1080×1080); A4 para o aniversariante
  var base = modelo === "aniver" ? [1240, 1754] : r >= 1.55 ? [1080, 1920] : r >= 1.12 ? [1080, 1350] : [1080, 1080];
  var sx = W / base[0], sy = H / base[1], k = Math.min(sx, sy), story = base[1] === 1920, quad = base[1] === 1080 && modelo !== "aniver";
  function S(o) { // escala x/y/w/h e tamanhos de fonte da base para o formato real
    o.x = Math.round(o.x * sx); o.w = Math.round(o.w * sx); o.y = Math.round(o.y * sy); o.h = Math.round(o.h * sy);
    ["tam", "ctam", "cin", "clarg", "blarg", "raio"].forEach(function (p) { if (typeof o[p] === "number") o[p] = Math.max(p === "tam" ? 6 : 0, Math.round(o[p] * k * 10) / 10); });
    L.push(o); return o;
  }
  if (modelo === "promo") {
    bg = { t: "cor", c: "@navy", a: 1 };
    var topo = story ? 330 : quad ? 230 : 270, foot = story ? 1320 : quad ? 860 : 1090, hb = base[1];
    S(F("Faixa do topo", 0, 0, 1080, topo, { fill: { t: "grad", c1: "@navy", a1: 1, c2: "@navy2", a2: 1, ang: 160 }, lock: true }));
    S(F("Filete dourado 1", -150, story ? 40 : 30, 560, 14, { fill: OURO, rot: -24 }));
    S(F("Filete dourado 2", -160, story ? 84 : 66, 440, 5, { fill: OURO, rot: -24 }));
    S(T("Chamada", 240, story ? 36 : 22, 600, story ? 72 : 58, { txt: "{chamada}", peso: 500, tam: story ? 46 : 38, ls: .22, linhas: true }));
    S(I("Logo", 270, story ? 112 : 84, 540, story ? 196 : quad ? 130 : 160, { src: "img/logo-branco.png", fit: "contain" }));
    S(I("Foto do ambiente", 0, topo, 1080, foot - topo, { src: "{ambiente}" }));
    S(F("Sombra atrás do texto", 420, topo + (foot - topo) * .3, 660, (foot - topo) * .7, { fill: { t: "grad", c1: "@navy", a1: 0, c2: "@navy", a2: .62, ang: 120 }, lock: true }));
    var py = story ? 720 : quad ? 470 : 590, ef = story ? 1 : .86;
    S(T("Produto", 560, py, 490, 250 * ef, { txt: "{produto}", peso: 700, tam: 58 * ef, al: "left", va: "bottom", lh: 1.05, caixa: true, sombra: 1 }));
    S(T("Marca", 560, py + 254 * ef, 490, 52 * ef, { txt: "{marca}", peso: 300, tam: 36 * ef, al: "left", ls: .06, caixa: true, sombra: 1 }));
    S(G("Selo", 560, py + 318 * ef, 290, 62 * ef, { txt: "{selo}", tam: 34 * ef }));
    S(P$("Preço", 545, py + 384 * ef, 520, 180 * ef, { tam: 170 * ef, sombra: 1 }));
    S(F("Filete do rodapé", 0, foot, 1080, 6, { fill: OURO }));
    if (story) S(F("Brilho", -300, 1420, 1700, 140, { fill: { t: "grad", c1: "@branco", a1: 0, c2: "@branco", a2: .07, ang: 90, esp: true }, rot: -12, lock: true }));
    S(T("Texto legal", 40, story ? 1560 : foot + 30, 640, story ? 250 : hb - foot - 50, { txt: "{legal}", tam: story ? 18 : 14.5, al: "left", lh: 1.35 }));
    S(I("Logo do rodapé", 720, story ? 1610 : foot + 40, 320, story ? 150 : hb - foot - 75, { src: "img/logo-branco.png", fit: "contain" }));
    S(F("Filete final", 0, hb - 12, 1080, 12, { fill: OURO }));
  } else if (modelo === "ofertas") {
    bg = { t: "cor", c: "@navy", a: 1 };
    var hb2 = base[1];
    if (story) {
      S(I("Foto do ambiente", 0, 0, 1080, 1610, { src: "{ambiente}" }));
      S(F("Caixa OFERTAS", 140, 95, 800, 420, { fill: { t: "cor", c: "@navy", a: .97 }, cantos: true, ctam: 46, cin: 24, clarg: 3 }));
      S(T("Chamada", 160, 130, 760, 116, { txt: "{chamada}", peso: 300, tam: 98, ls: .3 }));
      S(I("Logo", 260, 250, 560, 210, { src: "img/logo-branco.png", fit: "contain" }));
      S(F("Painel do produto", 45, 1245, 990, 345, { fill: { t: "cor", c: "@creme", a: .96 }, raio: 3, sombra: 2 }));
      S(I("Foto da peça", 80, 1268, 320, 300, { src: "{peca}", sombra: 2 }));
      S(T("Código", 440, 1270, 560, 32, { txt: "{codigo}", tam: 22, cor: "@grafite", al: "left" }));
      S(T("Tipo", 440, 1302, 560, 52, { txt: "{tipo}", peso: 700, tam: 42, cor: "@navy", al: "left", caixa: true }));
      S(T("Descrição", 440, 1354, 560, 116, { txt: "{produto}", peso: 500, tam: 32, cor: "@navy", al: "left", va: "top", lh: 1.1, caixa: true }));
      S(T("Marca", 440, 1470, 560, 34, { txt: "{marca}", tam: 24, cor: "@grafite", al: "left", ls: .12, caixa: true }));
      S(G("DE / POR", 440, 1512, 330, 50, { txt: "DE: R$ {de} POR:", estilo: "contorno", cor: "@navy", fundo: "@navy", peso: 600, tam: 25, raio: 2, caixa: true }));
      S(P$("Preço", 700, 1478, 330, 118, { tam: 104, cor: "@navy", al: "right" }));
      S(F("Faixa dourada", 0, 1610, 1080, 14, { fill: OURO }));
      S(T("Texto legal", 40, 1650, 620, 240, { txt: "{legal}", tam: 18, al: "left", lh: 1.35 }));
      S(I("Logo do rodapé", 700, 1700, 340, 150, { src: "img/logo-branco.png", fit: "contain" }));
    } else {
      var q = quad ? .82 : 1, fy = quad ? 900 : 1195;
      S(I("Foto do ambiente", 0, 0, 1080, fy, { src: "{ambiente}" }));
      S(F("Caixa OFERTAS", 200, 45, 680, quad ? 250 : 300, { fill: { t: "cor", c: "@navy", a: .97 }, cantos: true, ctam: 40, cin: 20, clarg: 3 }));
      S(T("Chamada", 215, quad ? 64 : 72, 650, quad ? 80 : 94, { txt: "{chamada}", peso: 300, tam: quad ? 64 : 78, ls: .3 }));
      S(I("Logo", 320, quad ? 140 : 162, 440, quad ? 135 : 160, { src: "img/logo-branco.png", fit: "contain" }));
      var pY = quad ? 610 : 850, pH = quad ? 275 : 330;
      S(F("Painel do produto", 40, pY, 1000, pH, { fill: { t: "cor", c: "@creme", a: .96 }, raio: 3, sombra: 2 }));
      S(I("Foto da peça", 68, pY + 22, 290 * q, pH - 44, { src: "{peca}", sombra: 2 }));
      var tx = quad ? 340 : 400;
      S(T("Código", tx, pY + 22, 620, 28, { txt: "{codigo}", tam: 20 * q, cor: "@grafite", al: "left" }));
      S(T("Tipo", tx, pY + 50, 620, 46 * q, { txt: "{tipo}", peso: 700, tam: 36 * q, cor: "@navy", al: "left", caixa: true }));
      S(T("Descrição", tx, pY + 50 + 46 * q, 620, 96 * q, { txt: "{produto}", peso: 500, tam: 27 * q, cor: "@navy", al: "left", va: "top", lh: 1.1, caixa: true }));
      S(T("Marca", tx, pY + 50 + 144 * q, 620, 30 * q, { txt: "{marca}", tam: 21 * q, cor: "@grafite", al: "left", ls: .12, caixa: true }));
      S(G("DE / POR", tx, pY + pH - 62 * q, 300 * q, 44 * q, { txt: "DE: R$ {de} POR:", estilo: "contorno", cor: "@navy", fundo: "@navy", peso: 600, tam: 22 * q, raio: 2, caixa: true }));
      S(P$("Preço", 690, pY + pH - 118 * q, 330, 106 * q, { tam: 96 * q, cor: "@navy", al: "right" }));
      S(F("Faixa dourada", 0, fy, 1080, 10, { fill: OURO }));
      S(T("Texto legal", 40, fy + 22, 640, hb2 - fy - 34, { txt: "{legal}", tam: quad ? 12.5 : 14.5, al: "left", lh: 1.33 }));
      S(I("Logo do rodapé", 730, fy + 30, 300, hb2 - fy - 52, { src: "img/logo-branco.png", fit: "contain" }));
    }
  } else if (modelo === "aniver") {
    bg = { t: "img", src: "img/topo.jpg", fit: "cover", c: "@creme" };
    S(F("Cartão azul", 178, 36, 884, 1542, { fill: { t: "img", src: "img/navy.jpg", c: "@navy" }, sombra: 1, lock: true }));
    S(F("Barra dourada de cima", 225, 0, 790, 66, { fill: OURO }));
    S(F("Barra dourada de baixo", 225, 1688, 790, 66, { fill: OURO }));
    S(I("Foto", 293, 66, 650, 578, { src: "{foto}" }));
    S(F("Detalhe dourado", 281, 600, 46, 46, { fill: OURO }));
    S(T("Título", 178, 655, 884, 150, { txt: "{titulo}", fonte: "Ms Madi", tam: 118, cor: "@ouro", lh: 1 }));
    S(T("Nome", 220, 790, 800, 80, { txt: "{nome}", tam: 56 }));
    S(T("Mensagem", 240, 950, 760, 260, { txt: "{mensagem}", tam: 46, lh: 1.45 }));
    S(I("Logo", 420, 1335, 400, 140, { src: "img/logo-branco.png", fit: "contain" }));
  } else {
    bg = { t: "cor", c: "@creme", a: 1 };
    var b0 = base;
    S(F("Faixa azul", 0, 0, b0[0], b0[1] * .18, { fill: { t: "cor", c: "@navy", a: 1 } }));
    S(F("Filete dourado", 0, b0[1] * .18, b0[0], 8, { fill: OURO }));
    S(I("Logo", b0[0] * .3, b0[1] * .03, b0[0] * .4, b0[1] * .12, { src: "img/logo-branco.png", fit: "contain" }));
    S(T("Título", b0[0] * .08, b0[1] * .3, b0[0] * .84, b0[1] * .12, { txt: "Seu título aqui", peso: 700, tam: 72, cor: "@navy" }));
    S(T("Texto", b0[0] * .12, b0[1] * .44, b0[0] * .76, b0[1] * .3, { txt: "Escreva aqui. Use **dois asteriscos** para negrito e *um asterisco* para destacar em dourado.", tam: 34, cor: "@navy", lh: 1.45, va: "top" }));
  }
  return { layers: L, bg: bg };
}
function novaPeca(modelo, fmt, custom) {
  var M = MODELOS[modelo], p = { id: uid(), nome: M.nome, modelo: modelo, fmt: fmt || M.fmt, custom: custom || { w: 100, h: 150, un: "mm" }, dados: clone(M.dados) };
  var dd = dims(p), g = gerar(modelo, dd); p.layers = g.layers; p.bg = g.bg; p._dims = { w: dd.w, h: dd.h }; p.nome = M.nome + " · " + fmtNome(p).split(" ")[0];
  return p;
}

/* ================= estado ================= */
function projetoNovo() { return { v: 1, nome: "Materiais Golden", marca: clone(MARCA_PADRAO), pecas: [novaPeca("promo", "story"), novaPeca("ofertas", "story"), novaPeca("aniver", "a4")], atual: 0, assets: {}, fontes: [] }; }
var P = null, UI = { sel: null, tab: "rap", zoom: 0, hist: [], fut: [] };
function peca() { return P.pecas[P.atual] || P.pecas[0]; }
function layerSel() { var p = peca(); return p && UI.sel ? p.layers.find(function (l) { return l.id === UI.sel; }) : null; }

var IDB = {
  db: null,
  open: function () { var me = this; if (me.db) return Promise.resolve(me.db); return new Promise(function (res, rej) { var r = indexedDB.open("materiais-golden", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { me.db = r.result; res(me.db); }; r.onerror = function () { rej(r.error); }; }); },
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
function cor(c) { if (!c) return "transparent"; if (c[0] === "@") return P.marca[c.slice(1)] || "#000"; return c; }
function rgba(c, a) { c = cor(c); if (a == null || a >= 1 || !/^#[0-9a-f]{6}$/i.test(c)) return c; var n = parseInt(c.slice(1), 16); return "rgba(" + (n >> 16) + "," + (n >> 8 & 255) + "," + (n & 255) + "," + (+a).toFixed(3) + ")"; }
function ouroGrad(ang) { var m = P.marca; return "linear-gradient(" + (ang == null ? 100 : ang) + "deg," + m.ouro3 + " 0%," + m.ouro + " 28%," + m.ouro2 + " 50%," + m.ouro + " 72%," + m.ouro3 + " 100%)"; }
function srcURL(s) { if (!s) return ""; if (s.indexOf("asset:") === 0) return P.assets[s.slice(6)] || ""; return s; }
function dado(p, s) { // troca {campo} pelos dados da peça (duas passadas: o legal usa {validade})
  var f = function (t) { return String(t == null ? "" : t).replace(/\{(\w+)\}/g, function (m, k) { return p.dados && p.dados[k] != null ? p.dados[k] : ""; }); };
  return f(f(s));
}
function marcacao(t, destCor) { // **negrito**  *destaque dourado*
  return esc(t).replace(/\*\*([\s\S]+?)\*\*/g, "<b>$1</b>").replace(/\*([^*\n][\s\S]*?)\*/g, '<b style="color:' + destCor + '">$1</b>');
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
  var d = dims(p), pg = document.createElement("div");
  pg.className = "pg" + (edit ? " edit" : ""); pg.style.width = d.w + "px"; pg.style.height = d.h + "px";
  var b = p.bg || { t: "cor", c: "#fff" };
  if (b.t === "img") { pg.style.background = cor(b.c || "@creme"); var bi = document.createElement("div"); bi.className = "bgimg"; var u = srcURL(b.src); if (u) { bi.style.backgroundImage = 'url("' + u + '")'; bi.style.backgroundSize = b.fit === "repeat" ? (b.esc || 30) + "%" : b.fit === "contain" ? "contain" : "cover"; bi.style.backgroundRepeat = b.fit === "repeat" ? "repeat" : "no-repeat"; bi.style.backgroundPosition = "center"; bi.style.opacity = b.op == null ? 1 : b.op; } pg.appendChild(bi); }
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
  inn.style.color = cor(L.cor); inn.style.textAlign = L.al; inn.style.lineHeight = L.lh; inn.style.letterSpacing = (L.ls || 0) + "em";
  if (L.ita) inn.style.fontStyle = "italic";
  if (L.sombra) inn.style.textShadow = SOMBRAS[L.sombra] || "";
  var t = dado(p, L.txt); if (L.caixa) t = t.toLocaleUpperCase("pt-BR");
  var html = marcacao(t, cor(L.dest || "@ouro"));
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
  if (L.moeda) h += '<span style="font-size:' + (t * .3).toFixed(1) + "px;line-height:1;align-self:center;margin-right:" + (t * .06).toFixed(1) + "px;margin-top:" + (t * .08).toFixed(1) + 'px">' + esc(L.moeda) + "</span>";
  h += '<span style="font-size:' + t + "px;line-height:.86;letter-spacing:-.02em\">" + esc(pr.i) + "</span>";
  if (pr.c || un) h += '<span class="cl" style="margin-left:' + (t * .02).toFixed(1) + 'px">' + (pr.c ? '<span style="font-size:' + (t * .44).toFixed(1) + 'px;line-height:1">,' + esc(pr.c) + "</span>" : "") + (un ? '<span style="font-size:' + (t * .2).toFixed(1) + "px;line-height:1;margin-top:" + (t * .04).toFixed(1) + "px;padding-left:" + (t * .1).toFixed(1) + 'px">' + esc(un) + "</span>" : "") + "</span>";
  box.innerHTML = h; el.appendChild(box);
}
function desenhaTag(L, el, p) {
  var box = document.createElement("div"); box.className = "tag";
  box.style.borderRadius = (L.raio || 0) + "px";
  if (L.estilo === "ouro") box.style.backgroundImage = ouroGrad(100);
  else if (L.estilo === "cheio") box.style.background = cor(L.fundo);
  else box.style.border = (L.blarg || 2) + "px solid " + cor(L.fundo);
  var s = document.createElement("span"); var t = dado(p, L.txt); if (L.caixa) t = t.toLocaleUpperCase("pt-BR");
  s.textContent = t; s.style.fontFamily = '"' + L.fonte + '", Poppins, sans-serif'; s.style.fontWeight = L.peso; s.style.fontSize = L.tam + "px"; s.style.color = cor(L.cor); s.style.letterSpacing = (L.ls || 0) + "em"; s.style.lineHeight = 1;
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
  $("#fmtLbl").textContent = fmtNome(p) + (d.mm ? " · sai em 300 dpi com sangria" : " · " + d.w + "×" + d.h + " px");
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
    montar(p, host, false);
    el.onclick = function () { if (P.atual === +el.dataset.i) return; P.atual = +el.dataset.i; UI.sel = null; UI.zoom = 0; if (UI.tab === "cam") UI.tab = "rap"; refresh(); commit(); };
  });
}
var TIPO_IC = { texto: "T", img: "▣", forma: "■", preco: "$", tag: "◆" };
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
    Object.keys(MARCA_PADRAO).map(function (k) { return '<button class="sw' + (val === "@" + k ? " on" : "") + '" title="' + MARCA_NOMES[k] + '" data-tok="' + path + '" data-v="@' + k + '" style="background:' + P.marca[k] + '"></button>'; }).join("") + "</div></div>";
}
function num(path, v, rot, o) { o = o || {}; return '<label class="f"><span>' + rot + '</span><input type="number" data-n="' + path + '" value="' + (Math.round((+v || 0) * 100) / 100) + '"' + (o.step ? ' step="' + o.step + '"' : "") + (o.min != null ? ' min="' + o.min + '"' : "") + "></label>"; }
function rng(path, v, rot, min, max, step, fmt) { return '<div class="f"><span>' + rot + '</span><div class="rg"><input type="range" data-r="' + path + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '"><output>' + (fmt ? fmt(v) : v) + "</output></div></div>"; }
function seg(path, v, ops, rot) { return '<div class="f">' + (rot ? "<span>" + rot + "</span>" : "") + '<div class="seg">' + ops.map(function (o) { return '<button data-s="' + path + '" data-v="' + o[0] + '" class="' + (String(v) === String(o[0]) ? "on" : "") + '">' + o[1] + "</button>"; }).join("") + "</div></div>"; }
function chk(path, v, rot) { return '<label class="chk"><input type="checkbox" data-k="' + path + '"' + (v ? " checked" : "") + "> " + rot + "</label>"; }
function sel(path, v, ops, rot) { return '<label class="f"><span>' + rot + '</span><select data-sel="' + path + '">' + ops.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(v) === String(o[0]) ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; }
function fontesOps() { return P.fontes.map(function (f) { return [f.nome, f.nome + " (sua)"]; }).concat(FONTES.map(function (f) { return [f, f]; })); }
function imgCampo(path, src, rot, contain) {
  var u = srcURL(src);
  return '<div class="f"><span>' + rot + '</span><div class="imgpick"><div class="pv' + (contain ? " ct" : "") + '" style="background-image:url(&quot;' + esc(u) + '&quot;)"></div><div style="display:flex;flex-direction:column;gap:5px"><button class="btn sm" data-up="' + path + '">Enviar imagem</button><button class="btn sm" data-lib="' + path + '">Escolher do banco</button></div></div></div>';
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
  if (!M.campos.length) return h + '<p class="hint">Peça livre: escolha uma camada na arte (ou na lista de camadas) e edite na aba <b>Camada</b>. Use os botões <b>+ Texto, + Imagem, + Forma</b> para montar. Fundo, cores e formato ficam na aba <b>Página</b>.</p></div>';
  M.campos.forEach(function (c) {
    var k = c[0], v = p.dados[k] == null ? "" : p.dados[k];
    if (c[2] === "img") h += imgCampo("D." + k, v, c[1]);
    else if (c[2] === "area") h += '<label class="f"><span>' + esc(c[1]) + '</span><textarea data-t="D.' + k + '" rows="' + (k === "legal" ? 6 : 3) + '">' + esc(v) + "</textarea></label>";
    else h += '<label class="f"><span>' + esc(c[1]) + '</span><input type="text" data-t="D.' + k + '" value="' + esc(v) + '"></label>';
  });
  if (p.modelo === "promo") { var tom = p.dados.tom || "claro"; h += '<div class="f"><span>Texto sobre a foto</span><div class="seg"><button data-tom="claro" class="' + (tom === "claro" ? "on" : "") + '">Branco (foto escura)</button><button data-tom="escuro" class="' + (tom === "escuro" ? "on" : "") + '">Azul (foto clara)</button></div></div>'; }
  h += '<p class="hint">Dica: <b>**texto**</b> deixa em negrito e <b>*texto*</b> destaca em dourado. Enter quebra a linha.</p>';
  if (M.campos.some(function (c) { return c[0] === "legal" || c[0] === "validade"; })) h += '<button class="btn sm" id="legalTodas">Usar esta validade e texto legal em todas as peças</button>';
  h += "</div><div class=\"sec\"><h3>Atalhos</h3><div style=\"display:flex;flex-wrap:wrap;gap:6px\">" +
    '<button class="btn sm" id="dupProd">' + (p.modelo === "aniver" ? "Duplicar para outra pessoa" : "Duplicar para outro produto") + '</button>' +
    (p.fmt !== "story" ? '<button class="btn sm" data-ver="story">Criar versão Story</button>' : "") +
    (p.fmt !== "feed" ? '<button class="btn sm" data-ver="feed">Criar versão Feed</button>' : "") +
    (p.modelo === "aniver" && p.fmt !== "a4" ? '<button class="btn sm" data-ver="a4">Criar versão A4 (gráfica)</button>' : "") +
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
      corCampo("L.cor", L.cor, "Cor do texto") + corCampo("L.dest", L.dest || "@ouro", "Cor do destaque (*texto*)") +
      seg("L.al", L.al, [["left", "Esq."], ["center", "Centro"], ["right", "Dir."]], "Alinhamento") +
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
      seg("L.estilo", L.estilo, [["ouro", "Dourado"], ["cheio", "Cor"], ["contorno", "Contorno"]], "Estilo") +
      (L.estilo !== "ouro" ? corCampo("L.fundo", L.fundo, L.estilo === "contorno" ? "Cor do contorno" : "Cor do fundo") : "") +
      corCampo("L.cor", L.cor, "Cor do texto") + sel("L.fonte", L.fonte, fontesOps(), "Fonte") +
      '<div class="g3">' + sel("L.peso", L.peso, [[400, "Regular"], [500, "Medium"], [600, "SemiBold"], [700, "Bold"], [800, "ExtraBold"]], "Peso") + num("L.tam", L.tam, "Tamanho") + num("L.raio", L.raio, "Cantos") + "</div>" +
      num("L.ls", L.ls, "Espaço entre letras (em)", { step: .01 }) + chk("L.caixa", L.caixa, "CAIXA ALTA");
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
  var h = seg(path + ".t", f.t, [["cor", "Cor"], ["grad", "Degradê"], ["ouro", "Dourado"], ["img", "Imagem"], ["nenhum", "Nada"]], "Preenchimento");
  if (f.t === "cor") h += corCampo(path + ".c", f.c || "@navy", "Cor") + rng(path + ".a", f.a == null ? 1 : f.a, "Transparência da cor", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; });
  else if (f.t === "grad") h += '<div class="g2"><div>' + corCampo(path + ".c1", f.c1 || "@navy", "Cor 1") + rng(path + ".a1", f.a1 == null ? 1 : f.a1, "Opacidade 1", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; }) + "</div><div>" + corCampo(path + ".c2", f.c2 || "@navy2", "Cor 2") + rng(path + ".a2", f.a2 == null ? 1 : f.a2, "Opacidade 2", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; }) + "</div></div>" + rng(path + ".ang", f.ang || 0, "Ângulo", 0, 360, 1, function (v) { return v + "°"; }) + chk(path + ".esp", f.esp, "Espelhado (cor 1 → cor 2 → cor 1)");
  else if (f.t === "ouro") h += rng(path + ".ang", f.ang == null ? 100 : f.ang, "Ângulo do brilho", 0, 360, 1, function (v) { return v + "°"; }) + '<p class="hint">Usa as cores Ouro da aba Página.</p>';
  else if (f.t === "img") h += imgCampo(path + ".src", f.src, "Imagem / textura") + seg(path + ".fit", f.fit || "cover", [["cover", "Preencher"], ["repeat", "Repetir (padrão)"]], "Como aplicar") + (f.fit === "repeat" ? rng(path + ".esc", f.esc || 40, "Tamanho do padrão", 5, 100, 1, function (v) { return v + "%"; }) : "");
  return h;
}
function painelPagina(p) {
  var b = p.bg || {};
  var h = '<div class="sec"><h3>Peça</h3><label class="f"><span>Nome da peça</span><input type="text" data-t="PC.nome" value="' + esc(p.nome) + '"></label>' +
    sel("PC.fmt", p.fmt, Object.keys(FMTS).map(function (k) { return [k, FMTS[k].nome]; }), "Formato");
  if (p.fmt === "custom") h += '<div class="g3">' + num("PC.custom.w", p.custom.w, "Largura") + num("PC.custom.h", p.custom.h, "Altura") + sel("PC.custom.un", p.custom.un, [["mm", "mm (impresso)"], ["px", "px (digital)"]], "Medida") + "</div>";
  h += '<p class="hint">' + (dims(p).mm ? "Impresso: exporta em 300 dpi, com sangria e marcas de corte para a gráfica." : "Digital: exporta em PNG/JPG no tamanho certo para postar.") + (p.modelo !== "livre" ? " Ao trocar o formato, o layout do modelo é refeito (textos e fotos ficam)." : " Ao trocar o formato, tudo é reposicionado na mesma proporção.") + "</p>" +
    '<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm" id="pcDup">Duplicar peça</button><button class="btn sm" id="pcUp">↑ Subir</button><button class="btn sm" id="pcDown">↓ Descer</button><button class="btn sm dan" id="pcDel">Excluir peça</button></div></div>';
  h += '<div class="sec"><h3>Fundo</h3>' + seg("B.t", b.t, [["cor", "Cor"], ["grad", "Degradê"], ["ouro", "Dourado"], ["img", "Imagem / textura"]]);
  if (b.t === "img") h += imgCampo("B.src", b.src, "Imagem do fundo") + seg("B.fit", b.fit || "cover", [["cover", "Preencher"], ["contain", "Caber"], ["repeat", "Repetir"]], "Como aplicar") + (b.fit === "repeat" ? rng("B.esc", b.esc || 30, "Tamanho do padrão", 5, 100, 1, function (v) { return v + "%"; }) : "") + rng("B.op", b.op == null ? 1 : b.op, "Opacidade da imagem", 0, 1, .01, function (v) { return Math.round(v * 100) + "%"; }) + corCampo("B.c", b.c || "@creme", "Cor por baixo da imagem");
  else if (b.t === "cor") h += corCampo("B.c", b.c, "Cor");
  else if (b.t === "grad") h += '<div class="g2">' + corCampo("B.c1", b.c1 || "@navy", "Cor 1") + corCampo("B.c2", b.c2 || "@navy2", "Cor 2") + "</div>" + rng("B.ang", b.ang || 0, "Ângulo", 0, 360, 1, function (v) { return v + "°"; }) + chk("B.esp", b.esp, "Espelhado");
  else if (b.t === "ouro") h += rng("B.ang", b.ang == null ? 100 : b.ang, "Ângulo do brilho", 0, 360, 1, function (v) { return v + "°"; });
  h += rng("B.escurece", b.escurece || 0, "Escurecer o fundo", 0, .8, .01, function (v) { return Math.round(v * 100) + "%"; }) + "</div>";
  h += '<div class="sec"><h3>Cores da marca <button class="btn sm" id="marcaReset">Padrão</button></h3><p class="hint">Valem para todas as peças do projeto. Mudou aqui, muda em tudo que usa a cor da marca.</p><div class="g2">' +
    Object.keys(MARCA_PADRAO).map(function (k) { return '<label class="f"><span>' + MARCA_NOMES[k] + '</span><div class="cor"><input type="color" data-c="M.' + k + '" value="' + P.marca[k] + '"><small style="color:var(--mu)">' + P.marca[k] + "</small></div></label>"; }).join("") + "</div></div>";
  h += '<div class="sec"><h3>Fontes</h3><p class="hint">Envie a <b>Authentic</b> (ou outra .otf/.ttf/.woff) e ela aparece na lista de fontes de todas as camadas. Sem ela, o título do aniversariante usa Ms Madi, parecida.</p>' +
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
  var p = peca();
  function mudou(path, reabrir) {
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
  $$("[data-s]", el).forEach(function (b) { b.addEventListener("click", function () { var v = b.dataset.v; if (/sombra$/.test(b.dataset.s)) v = +v; setv(b.dataset.s, v); if (/fill\.t$|^B\.t$/.test(b.dataset.s)) completaFill(b.dataset.s.replace(/\.t$/, ""), v); mudou(b.dataset.s, true); }); });
  $$("[data-c]", el).forEach(function (i) { i.addEventListener("input", function () { setv(i.dataset.c, i.value); $$('[data-tok="' + i.dataset.c + '"]', el).forEach(function (s) { s.classList.remove("on"); }); var sm = i.parentNode.querySelector("small"); if (sm) sm.textContent = i.value; mudou(i.dataset.c); }); });
  $$("[data-tok]", el).forEach(function (b) { b.addEventListener("click", function () { setv(b.dataset.tok, b.dataset.v); mudou(b.dataset.tok, true); }); });
  $$("[data-up]", el).forEach(function (b) { b.onclick = function () { escolherArquivo("image/*", false, function (fs) { addImagens(fs).then(function (ids) { if (ids[0]) { setv(b.dataset.up, "asset:" + ids[0]); mudou(b.dataset.up, true); } }); }); }; });
  $$("[data-lib]", el).forEach(function (b) { b.onclick = function () { abrirBancoPara(b.dataset.lib); }; });
  $$("[data-ac]", el).forEach(function (b) { b.onclick = function () { acao(b.dataset.ac); }; });
  $$("[data-ver]", el).forEach(function (b) { b.onclick = function () { var n = novaPeca(p.modelo, b.dataset.ver); n.dados = clone(p.dados); n.bg = clone(p.bg); P.pecas.splice(P.atual + 1, 0, n); P.atual++; UI.sel = null; UI.zoom = 0; refresh(); commit(true); toast("Versão " + FMTS[b.dataset.ver].nome + " criada."); }; });
  $$("[data-tom]", el).forEach(function (bt) { bt.onclick = function () {
    var t = bt.dataset.tom; p.dados.tom = t;
    p.layers.forEach(function (L) {
      if (["Produto", "Marca", "Preço"].indexOf(L.nome) >= 0) { L.cor = t === "escuro" ? "@navy" : "@branco"; L.sombra = t === "escuro" ? 0 : 1; }
      if (L.nome === "Sombra atrás do texto") L.oculto = t === "escuro";
    });
    renderPreview(); renderCamadas(); renderPainel(); commit(true);
  }; });
  var x;
  if ((x = $("#dupProd", el))) x.onclick = function () { duplicarPeca(p); toast("Peça duplicada. Troque produto, foto e preço."); };
  if ((x = $("#resetMod", el))) x.onclick = function () { if (!confirm("Recolocar tudo na posição do modelo? Textos, fotos e preço continuam.")) return; var g = gerar(p.modelo, dims(p)); p.layers = g.layers; p.bg = g.bg; UI.sel = null; refresh(); commit(true); };
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
function duplicarPeca(p) { var n = clone(p); n.id = uid(); n.layers.forEach(function (l) { l.id = uid(); }); n.nome = p.nome + " (2)"; P.pecas.splice(P.atual + 1, 0, n); P.atual++; UI.sel = null; refresh(); commit(true); }
function usoAsset(id) { var s = JSON.stringify(P.pecas); return s.indexOf("asset:" + id) >= 0; }
function trocaFormato(p) {
  var antes = p._dims || null, d = dims(p);
  if (p.modelo !== "livre") { var g = gerar(p.modelo, d); p.layers = g.layers; p.bg = p.bg || g.bg; UI.sel = null; }
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
  return Promise.all(fs.map(comprimir)).then(function (urls) { var ids = []; urls.forEach(function (u) { if (!u) return; var id = uid(); P.assets[id] = u; ids.push(id); }); persist(); b.remove(); if (urls.some(function (u) { return !u; })) toast("Alguma imagem não abriu (formato não suportado)."); return ids; });
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
      return aplicaFontes().then(function () {
        // se for uma fonte de assinatura (ex.: Authentic), já aplica nos títulos do aniversariante
        var scr = lst.find(function (f) { return /authentic|signature|script|hand/i.test(f.nome); });
        if (scr) P.pecas.forEach(function (p) { p.layers.forEach(function (L) { if (L.tipo === "texto" && L.fonte === "Ms Madi") L.fonte = scr.nome; }); });
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
  var fim = function () { if (!drag) return; var mexeu = drag.tipo === "res" || drag.moveu; drag = null; mostraGuias([]); if (mexeu) { renderPainel(); commit(); } };
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
  renderCamadas(); renderPreview(); renderPainel(); commit(true);
}
function addCamada(tipo) {
  var p = peca(), d = dims(p), k = d.w / 1080, w = Math.round(d.w * .6), h = Math.round(d.h * .12), x = Math.round((d.w - w) / 2), y = Math.round((d.h - h) / 2), n;
  var claro = (function () { var b = p.bg || {}; var c = cor(b.c || b.c1 || "#fff"); if (b.t === "ouro") return true; if (!/^#/.test(c)) return true; var v = parseInt(c.slice(1), 16); return ((v >> 16) * .3 + (v >> 8 & 255) * .59 + (v & 255) * .11) > 150; })();
  if (tipo === "texto") n = T("Texto", x, y, w, h, { txt: "Novo texto", tam: Math.round(54 * k), cor: claro ? "@navy" : "@branco" });
  else if (tipo === "img") { n = I("Imagem", x, Math.round(d.h * .3), w, Math.round(d.h * .3), { src: "img/amb-1.jpg" }); }
  else if (tipo === "forma") n = F("Forma", x, y, w, h, { fill: { t: "cor", c: "@navy", a: 1 } });
  else if (tipo === "logo") n = I("Logo", Math.round(d.w * .3), Math.round(d.h * .04), Math.round(d.w * .4), Math.round(d.w * .13), { src: claro ? "img/logo-azul.png" : "img/logo-branco.png", fit: "contain" });
  else if (tipo === "preco") n = P$("Preço", x, y, w, Math.round(170 * k), { valor: "99,90", unid: "", tam: Math.round(150 * k), cor: claro ? "@navy" : "@branco" });
  else if (tipo === "tag") n = G("Selo", x, y, Math.round(300 * k), Math.round(62 * k), { txt: "SOMENTE", tam: Math.round(32 * k) });
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
  var fs = {}; p.layers.forEach(function (L) { if (L.fonte) [300, 400, 500, 600, 700, 800].forEach(function (w) { fs[w + ' 40px "' + L.fonte + '"'] = 1; }); });
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
  var p = peca(), print = !!dims(p).mm, pp = P.printPrefs || (P.printPrefs = { bleed: 3, marks: true, dpi: 300 });
  var m = modal('<h2>Exportar</h2>' +
    '<div class="f"><span>O que exportar</span><div class="seg" id="xEsc"><button data-v="uma" class="on">Esta peça</button><button data-v="todas">Todas as peças (' + P.pecas.length + ")</button></div></div>" +
    '<div class="xcard" id="xcPrint"' + (print ? "" : " hidden") + '><b>PDF para gráfica</b><p>Tamanho final exato, com sangria (o fundo continua além do corte) e marcas de corte. 300 dpi.</p>' +
    '<div class="row"><label class="f"><span>Sangria</span><select id="xBleed">' + [0, 2, 3, 5].map(function (v) { return '<option value="' + v + '"' + (pp.bleed === v ? " selected" : "") + ">" + (v ? v + " mm" : "sem sangria") + "</option>"; }).join("") + '</select></label>' +
    '<label class="f"><span>Resolução</span><select id="xDpi"><option value="300"' + (pp.dpi === 300 ? " selected" : "") + '>300 dpi</option><option value="200"' + (pp.dpi === 200 ? " selected" : "") + '>200 dpi (arquivo menor)</option></select></label></div>' +
    '<label class="chk"><input type="checkbox" id="xMarks"' + (pp.marks ? " checked" : "") + "> Marcas de corte e informações da página</label>" +
    '<button class="btn pri" id="xPdf">Gerar PDF para gráfica</button></div>' +
    '<div class="xcard"><b>Imagem para redes</b><p>PNG (máxima qualidade) ou JPG (mais leve, ideal para Instagram e WhatsApp). Várias peças saem num .zip.</p><div class="row"><button class="btn" id="xPng">Gerar PNG</button><button class="btn" id="xJpg">Gerar JPG</button></div></div>' +
    '<div class="xcard"><b>PDF digital</b><p>Para mandar por WhatsApp ou email. Sem sangria, arquivo leve.</p><button class="btn" id="xWeb">Gerar PDF digital</button></div>' +
    '<p class="hint">O PDF sai em RGB. Se a gráfica pedir CMYK, mande o PDF para mim na conversa que eu converto no perfil que ela pedir.</p>' +
    '<div class="acts"><button class="btn" data-close>Fechar</button></div>');
  var escopo = "uma";
  $$("#xEsc button", m).forEach(function (b) { b.onclick = function () { escopo = b.dataset.v; $$("#xEsc button", m).forEach(function (x) { x.classList.toggle("on", x === b); }); var lista = escopo === "uma" ? [p] : P.pecas; $("#xcPrint", m).hidden = !lista.some(function (x) { return dims(x).mm; }); }; });
  var lista = function () { return escopo === "uma" ? [p] : P.pecas.slice(); };
  $("#xPdf", m).onclick = function () { P.printPrefs = { bleed: +$("#xBleed", m).value, marks: $("#xMarks", m).checked, dpi: +$("#xDpi", m).value }; persist(); var l = lista().filter(function (x) { return dims(x).mm; }); m.remove(); gerarPDF(l, P.printPrefs); };
  $("#xWeb", m).onclick = function () { var l = lista(); m.remove(); gerarPDF(l, { bleed: 0, marks: false, web: true, dpi: 110 }); };
  $("#xPng", m).onclick = function () { var l = lista(); m.remove(); gerarImgs(l, "png"); };
  $("#xJpg", m).onclick = function () { var l = lista(); m.remove(); gerarImgs(l, "jpg"); };
}
function escalaDe(p, dpi) { var d = dims(p); return d.mm ? (d.mm[0] / 25.4 * dpi) / d.w : 1; }
function gerarPDF(lista, o) {
  if (!lista.length) return toast("Nenhuma peça de impresso selecionada.");
  var b = busy(), jsPDF = window.jspdf.jsPDF, pdf = null, i = 0, bl = o.bleed || 0, slugMm = o.marks ? 10 : 0, q = o.web ? .82 : .95;
  var passo = function () {
    if (i >= lista.length) { b.textContent = "Preparando o arquivo…"; return saveFile(slug(P.nome) + (o.web ? "-digital" : "-grafica") + ".pdf", pdf.output("blob")); }
    var p = lista[i], d = dims(p), mm = d.mm || [d.w * 25.4 / 96, d.h * 25.4 / 96];
    b.textContent = "Gerando página " + (i + 1) + " de " + lista.length + "…";
    var sc = d.mm ? escalaDe(p, o.dpi || 300) : (o.web ? 1 : 2);
    return renderCanvas(p, sc).then(function (c) {
      var bpx = d.mm ? Math.round(bl / mm[0] * c.width) : 0, b2 = d.mm ? bl : 0; c = bleedCanvas(c, bpx);
      var img = c.toDataURL("image/jpeg", q), pw = mm[0] + 2 * (b2 + (d.mm ? slugMm : 0)), ph = mm[1] + 2 * (b2 + (d.mm ? slugMm : 0)), ox = d.mm ? slugMm : 0, ori = pw > ph ? "landscape" : "portrait";
      if (!pdf) pdf = new jsPDF({ unit: "mm", format: [pw, ph], orientation: ori, compress: true }); else pdf.addPage([pw, ph], ori);
      pdf.addImage(img, "JPEG", ox, ox, mm[0] + 2 * b2, mm[1] + 2 * b2, undefined, o.web ? "MEDIUM" : "FAST");
      if (o.marks && d.mm) cropMarks(pdf, ox + b2, ox + b2, mm[0], mm[1], b2, P.nome + " · " + p.nome + " · " + mm[0] + "×" + mm[1] + " mm · sangria " + b2 + " mm · " + (o.dpi || 300) + " dpi · " + new Date().toLocaleDateString("pt-BR"));
      i++; return passo();
    });
  };
  passo().catch(function (e) { console.error(e); toast("A exportação falhou. Tente 200 dpi ou uma peça por vez."); }).then(function () { b.remove(); $("#stage").innerHTML = ""; });
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
    var p = lista[i]; b.textContent = "Gerando imagem " + (i + 1) + " de " + lista.length + "…";
    return renderCanvas(p, dims(p).mm ? escalaDe(p, 300) : 1).then(function (c) {
      if (tipo === "jpg") { var c2 = document.createElement("canvas"); c2.width = c.width; c2.height = c.height; var g = c2.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(c, 0, 0); c = c2; }
      return new Promise(function (r) { c.toBlob(r, mime, .92); });
    }).then(function (bb) { blobs.push(bb); i++; return passo(); });
  };
  passo().catch(function (e) { console.error(e); toast("A exportação falhou. Tente de novo."); }).then(function () { b.remove(); $("#stage").innerHTML = ""; });
}

/* ================= projeto: novo, arquivo ================= */
function novaPecaDlg() {
  var esc1 = "promo", fm = "story";
  var m = modal('<h2>Nova peça</h2><div class="mods" id="nMods">' + Object.keys(MODELOS).map(function (k) { return '<button class="mod' + (k === esc1 ? " on" : "") + '" data-m="' + k + '"><b>' + MODELOS[k].nome + "</b><small>" + MODELOS[k].desc + "</small></button>"; }).join("") + "</div>" +
    '<label class="f"><span>Formato</span><select id="nFmt">' + Object.keys(FMTS).map(function (k) { return '<option value="' + k + '"' + (k === fm ? " selected" : "") + ">" + FMTS[k].nome + "</option>"; }).join("") + '</select></label>' +
    '<div class="g3" id="nCust" hidden><label class="f"><span>Largura</span><input type="number" id="nW" value="100"></label><label class="f"><span>Altura</span><input type="number" id="nH" value="150"></label><label class="f"><span>Medida</span><select id="nUn"><option value="mm">mm (impresso)</option><option value="px">px (digital)</option></select></label></div>' +
    '<label class="chk"><input type="checkbox" id="nCopia"' + (peca() ? " checked" : "") + "> Aproveitar textos e fotos da peça atual (se for do mesmo modelo)</label>" +
    '<div class="acts"><button class="btn" data-close>Cancelar</button><button class="btn pri" id="nOk">Criar</button></div>');
  $$("#nMods .mod", m).forEach(function (b) { b.onclick = function () { esc1 = b.dataset.m; $$("#nMods .mod", m).forEach(function (x) { x.classList.toggle("on", x === b); }); $("#nFmt", m).value = MODELOS[esc1].fmt; $("#nCust", m).hidden = true; }; });
  $("#nFmt", m).onchange = function () { $("#nCust", m).hidden = this.value !== "custom"; };
  $("#nOk", m).onclick = function () {
    var f = $("#nFmt", m).value, c = { w: +$("#nW", m).value || 100, h: +$("#nH", m).value || 150, un: $("#nUn", m).value };
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
function init() {
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
    var L = layerSel(); if (!L) return;
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); acao("del"); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") { e.preventDefault(); acao("dup"); return; }
    var st = e.shiftKey ? 10 : 1, mv = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (mv) { e.preventDefault(); L.x += mv[0]; L.y += mv[1]; renderPreview(); commit(); }
    if (e.key === "Escape") { UI.sel = null; renderCamadas(); desenhaSelecao(); renderPainel(); }
  });
  initArrasto();
  IDB.get("projeto").then(function (s) { return s ? JSON.parse(s) : null; }).catch(function () { return null; }).then(function (d) {
    abrirDados(d || projetoNovo());
    document.fonts.ready.then(function () { renderPreview(); renderPecas(); });
  });
}
document.addEventListener("DOMContentLoaded", init);
