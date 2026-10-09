/* Kit Materiais Golden · marca, modelos e layouts da Alvorada Golden (usa o motor em ../estudio/motor.js) */
(function () {
/* ================= marca ================= */
var MARCA_PADRAO = { navy: "#0c1333", navy2: "#1c2a5e", ouro: "#c9a05c", ouro2: "#f0d48e", ouro3: "#9c7333", creme: "#ecebe6", branco: "#ffffff", grafite: "#5c5c5c" };
var MARCA_NOMES = { navy: "Azul", navy2: "Azul claro", ouro: "Ouro", ouro2: "Ouro claro", ouro3: "Ouro escuro", creme: "Creme", branco: "Branco", grafite: "Grafite" };
var FONTES = ["Poppins", "Montserrat", "Playfair Display", "Cormorant Garamond", "Bebas Neue", "Allura", "Great Vibes", "Ms Madi", "Ephesis", "Corinthia", "Pinyon Script"];
var IMGS_MARCA = [
  ["img/logo-branco.png", "Logo branco", 1], ["img/logo-azul.png", "Logo azul", 1], ["img/logo-azul-total.png", "Logo todo azul", 1], ["img/navy.jpg", "Azul texturizado"], ["img/topo.jpg", "Linhas creme"],
  ["img/ouro-fosco.jpg", "Ouro fosco"], ["img/ouro-foil.jpg", "Ouro brilho"], ["img/granito.jpg", "Granito"], ["img/amb-1.jpg", "Ambiente (exemplo)"],
  ["img/amb-2.jpg", "Ambiente 2 (exemplo)"], ["img/peca-1.jpg", "Peça (exemplo)"], ["img/foto-modelo.jpg", "Foto (modelo)"]
];
var LEGAL = "Ofertas válidas de {validade}, ou enquanto durarem os estoques – prevalecendo o que ocorrer primeiro. Durante esse período, as compras podem ser parceladas em até 06 vezes sem juros no cartão de crédito, mediante aprovação da administradora do cartão. Importante: produtos em oferta não entram nesta condição, pois já possuem desconto aplicado. Para mais informações sobre formas de pagamento e produtos participantes, consulte nossos vendedores ou entre em contato pelo telefone (67) 3345-4020. Reservamo-nos o direito de corrigir eventuais erros de digitação, com ofertas disponíveis para consulta na entrada da loja.";

/* ================= modelos ================= */
var MODELOS = {
  promo: { nome: "Promoção", desc: "Faixa azul com PROMOÇÃO, foto de ambiente, produto, selo dourado e preço.", fmt: "story", nomeCampo: "produto", versoes: ["story", "feed", "quad", "a4"],
    campos: [["chamada", "Chamada"], ["produto", "Produto", "area"], ["marca", "Marca / fabricante"], ["selo", "Selo (ex.: SOMENTE, POR APENAS)"], ["preco", "Preço", "preco"], ["unid", "Unidade (ex.: M2) – opcional"], ["ambiente", "Foto do ambiente", "img"], ["validade", "Validade (vai no texto legal)"], ["legal", "Texto legal", "area"]],
    dados: { chamada: "PROMOÇÃO", produto: "PORCELANATO\nAREIA 84X84\nACETINADO", marca: "ELIANE", selo: "SOMENTE", preco: "88,90", unid: "", ambiente: "img/amb-2.jpg", validade: "25/07 a 27/07/2026", legal: LEGAL } },
  ofertas: { nome: "Ofertas", desc: "Foto de ambiente inteira, caixa OFERTAS, painel com a peça, código, DE/POR e preço.", fmt: "story", nomeCampo: "produto", versoes: ["story", "feed", "quad", "a4"],
    campos: [["chamada", "Chamada"], ["codigo", "Código"], ["tipo", "Tipo (1ª linha, em negrito)"], ["produto", "Descrição", "area"], ["marca", "Marca / fabricante"], ["de", "Preço DE (sem R$)"], ["preco", "Preço POR", "preco"], ["unid", "Unidade (ex.: M2)"], ["ambiente", "Foto do ambiente", "img"], ["peca", "Foto da peça", "img"], ["validade", "Validade (vai no texto legal)"], ["legal", "Texto legal", "area"]],
    dados: { chamada: "OFERTAS", codigo: "Cód. 223.486", tipo: "PORCELANATO", produto: "87,7X87,7 A 61713\nALQUIMIA GR NAT\nRETIFICADO", marca: "PORTINARI", de: "128,96", preco: "86,45", unid: "M2", ambiente: "img/amb-2.jpg", peca: "img/peca-1.jpg", validade: "10/08 a 30/09/2026", legal: LEGAL } },
  aniver: { nome: "Aniversariante", desc: "Cartão com foto, nome e mensagem. Sai em A4 pronto para gráfica (ou feed/story).", fmt: "a4", versoes: ["a4", "a5", "story", "feed"], nomeCampo: "nome", dup: "Duplicar para outra pessoa",
    campos: [["foto", "Foto", "img"], ["titulo", "Título"], ["nome", "Nome"], ["mensagem", "Mensagem", "area"]],
    dados: { foto: "img/foto-modelo.jpg", titulo: "Feliz Aniversário,", nome: "**Nome** Sobrenome", mensagem: "Um novo ano, uma nova\noportunidade para você\n*brilhar ainda mais.*" } },
  obrigado: { nome: "Cartão de obrigado", desc: "Obrigado pela preferência. Redondo ou quadrado de 5 a 20 cm, com recorte.", fmt: "r10", versoes: ["r5", "r10", "r15", "r20", "q5", "q10", "q15", "q20", "story", "feed"], dup: "Duplicar",
    campos: [["titulo", "Título (manuscrito)"], ["sub", "Frase"], ["msg", "Mensagem pequena (opcional)", "area"]],
    dados: { titulo: "Obrigado", sub: "pela preferência", msg: "" } },
  tag: { nome: "Tag de presente", desc: "Tag com Para / De, furo para a fita e a marca. Redonda, quadrada ou 5×9 cm.", fmt: "tag59", nomeCampo: "para", versoes: ["tag59", "r5", "r10", "q5", "q10"], dup: "Duplicar",
    campos: [["titulo", "Título (manuscrito)"], ["para", "Para"], ["de", "De"], ["msg", "Mensagem (opcional)", "area"]],
    dados: { titulo: "Um presente para você", para: "", de: "Alvorada Golden", msg: "" } },
  livre: { nome: "Livre", desc: "Página em branco com a marca. Você monta: fundo, cores, textos, imagens.", fmt: "a4", campos: [], dados: {} }
};

function gerarG(modelo, d) {
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

// cartão de obrigado e tag de presente (base 1000×1000; tag alta 1000×1800)
function gerarCartoes(modelo, d) {
  var W = d.w, H = d.h, alta = H / W > 1.4, base = alta ? [1000, 1800] : [1000, 1000 * H / W], sx = W / base[0], sy = H / base[1], k = Math.min(sx, sy), L = [], red = d.redondo;
  function S(o) { o.x = Math.round(o.x * sx); o.w = Math.round(o.w * sx); o.y = Math.round(o.y * sy); o.h = Math.round(o.h * sy); ["tam", "ctam", "cin", "clarg", "blarg", "raio"].forEach(function (p) { if (typeof o[p] === "number") o[p] = Math.max(p === "tam" ? 4 : 0, Math.round(o[p] * k * 10) / 10); }); L.push(o); return o; }
  var bh = base[1], cy = bh / 2;
  if (modelo === "obrigado") {
    var bg = { t: "img", src: "img/navy.jpg", fit: "cover", c: "@navy" };
    if (red) { S(F("Aro dourado", 45, 45 * bh / 1000, 910, bh - 90 * bh / 1000, { fill: { t: "nenhum" }, raio: 500, blarg: 7, bcor: "@ouro" })); S(F("Aro fino", 75, 75 * bh / 1000, 850, bh - 150 * bh / 1000, { fill: { t: "nenhum" }, raio: 500, blarg: 2, bcor: "@ouro" })); }
    else { S(F("Moldura", 50, 50, 900, bh - 100, { fill: { t: "nenhum" }, blarg: 3, bcor: "@ouro", cantos: true, ctam: 70, cin: 18, clarg: 5, ccor: "@ouro" })); }
    var temMsg = true;
    S(T("Título", 110, cy - 250, 780, 260, { txt: "{titulo}", fonte: "Ms Madi", tam: 230, cor: "@ouro", lh: 1 }));
    S(T("Frase", 150, cy + 10, 700, 70, { txt: "{sub}", peso: 500, tam: 40, ls: .28, caixa: true }));
    S(F("Divisor", 440, cy + 100, 120, 4, { fill: { t: "ouro", ang: 90 } }));
    S(T("Mensagem", 200, cy + 120, 600, 90, { txt: "{msg}", tam: 28, lh: 1.35, cor: "@creme" }));
    S(I("Logo", 330, cy + 205, 340, 120, { src: "img/logo-branco.png", fit: "contain" }));
    return { layers: L, bg: bg };
  }
  // tag
  var bgT = { t: "img", src: "img/topo.jpg", fit: "cover", c: "@creme", op: .9 };
  if (alta) {
    S(F("Faixa azul", 0, 0, 1000, 520, { fill: { t: "img", src: "img/navy.jpg", c: "@navy" } }));
    S(F("Filete dourado", 0, 520, 1000, 14, { fill: OURO }));
    S(F("Furo (marcação)", 440, 70, 120, 120, { fill: { t: "cor", c: "@creme", a: 1 }, raio: 60, blarg: 4, bcor: "@ouro" }));
    S(T("Título", 70, 230, 860, 260, { txt: "{titulo}", fonte: "Ms Madi", tam: 150, cor: "@ouro", lh: .95 }));
    S(T("Para", 90, 650, 820, 90, { txt: "Para: **{para}**", tam: 56, cor: "@navy", al: "left" }));
    S(F("Linha do para", 90, 745, 820, 3, { fill: { t: "cor", c: "@ouro", a: 1 } }));
    S(T("De", 90, 820, 820, 90, { txt: "De: **{de}**", tam: 56, cor: "@navy", al: "left" }));
    S(F("Linha do de", 90, 915, 820, 3, { fill: { t: "cor", c: "@ouro", a: 1 } }));
    S(T("Mensagem", 90, 980, 820, 420, { txt: "{msg}", tam: 46, cor: "@navy", lh: 1.4, va: "top" }));
    S(I("Logo", 230, 1500, 540, 190, { src: "img/logo-azul.png", fit: "contain" }));
    return { layers: L, bg: bgT };
  }
  if (red) S(F("Aro dourado", 40, 40 * bh / 1000, 920, bh - 80 * bh / 1000, { fill: { t: "nenhum" }, raio: 500, blarg: 6, bcor: "@ouro" }));
  else S(F("Moldura", 45, 45, 910, bh - 90, { fill: { t: "nenhum" }, blarg: 3, bcor: "@ouro", cantos: true, ctam: 60, cin: 16, clarg: 4, ccor: "@ouro" }));
  S(F("Furo (marcação)", 460, 85 * bh / 1000, 80, 80, { fill: { t: "cor", c: "@creme", a: 1 }, raio: 40, blarg: 3, bcor: "@ouro" }));
  S(T("Título", 120, cy - 290, 760, 190, { txt: "{titulo}", fonte: "Ms Madi", tam: 120, cor: "@ouro3", lh: .95 }));
  S(T("Para", 180, cy - 80, 640, 70, { txt: "Para: **{para}**", tam: 44, cor: "@navy", al: "left" }));
  S(F("Linha do para", 180, cy - 4, 640, 3, { fill: { t: "cor", c: "@ouro", a: 1 } }));
  S(T("De", 180, cy + 40, 640, 70, { txt: "De: **{de}**", tam: 44, cor: "@navy", al: "left" }));
  S(F("Linha do de", 180, cy + 116, 640, 3, { fill: { t: "cor", c: "@ouro", a: 1 } }));
  S(T("Mensagem", 200, cy + 140, 600, 60, { txt: "{msg}", tam: 30, cor: "@navy", lh: 1.3 }));
  S(I("Logo", 340, cy + 210, 320, 110, { src: "img/logo-azul.png", fit: "contain" }));
  return { layers: L, bg: bgT };
}

// combinações de cores prontas (por nome de camada)
function porNome(p, nome, fn) { p.layers.forEach(function (L) { if (L.nome === nome) fn(L); }); }
function cores(p, mapa) { Object.keys(mapa).forEach(function (n) { porNome(p, n, function (L) { var v = mapa[n]; if (typeof v === "function") v(L); else Object.assign(L, clone(v)); }); }); }
var PALETAS = {
  aniver: [
    { nome: "Azul e dourado", a: "#0c1333", b: "#c9a05c", aplicar: function (p) { p.bg = { t: "img", src: "img/topo.jpg", fit: "cover", c: "@creme" }; cores(p, { "Cartão azul": { fill: { t: "img", src: "img/navy.jpg", c: "@navy" } }, "Título": { cor: "@ouro" }, "Nome": { cor: "@branco" }, "Mensagem": { cor: "@branco", dest: "@ouro" }, "Logo": { src: "img/logo-branco.png" }, "Barra dourada de cima": { fill: OURO }, "Barra dourada de baixo": { fill: OURO }, "Detalhe dourado": { fill: OURO } }); } },
    { nome: "Claro e dourado", a: "#ffffff", b: "#9c7333", aplicar: function (p) { p.bg = { t: "img", src: "img/topo.jpg", fit: "cover", c: "@creme" }; cores(p, { "Cartão azul": { fill: { t: "cor", c: "@branco", a: 1 } }, "Título": { cor: "@ouro3" }, "Nome": { cor: "@navy" }, "Mensagem": { cor: "@navy", dest: "@ouro3" }, "Logo": { src: "img/logo-azul.png" }, "Barra dourada de cima": { fill: OURO }, "Barra dourada de baixo": { fill: OURO }, "Detalhe dourado": { fill: OURO } }); } },
    { nome: "Dourado", a: "#f0d48e", b: "#0c1333", aplicar: function (p) { p.bg = { t: "img", src: "img/navy.jpg", fit: "cover", c: "@navy" }; cores(p, { "Cartão azul": { fill: { t: "ouro", ang: 120 } }, "Título": { cor: "@navy" }, "Nome": { cor: "@navy" }, "Mensagem": { cor: "@navy", dest: "@navy" }, "Logo": { src: "img/logo-azul-total.png" }, "Barra dourada de cima": { fill: { t: "cor", c: "@navy", a: 1 } }, "Barra dourada de baixo": { fill: { t: "cor", c: "@navy", a: 1 } }, "Detalhe dourado": { fill: { t: "cor", c: "@navy", a: 1 } } }); } },
    { nome: "Noite", a: "#1c2a5e", b: "#ecebe6", aplicar: function (p) { p.bg = { t: "img", src: "img/navy.jpg", fit: "cover", c: "@navy" }; cores(p, { "Cartão azul": { fill: { t: "cor", c: "@creme", a: 1 } }, "Título": { cor: "@ouro3" }, "Nome": { cor: "@navy" }, "Mensagem": { cor: "@navy", dest: "@ouro3" }, "Logo": { src: "img/logo-azul.png" }, "Barra dourada de cima": { fill: OURO }, "Barra dourada de baixo": { fill: OURO }, "Detalhe dourado": { fill: OURO } }); } }
  ],
  obrigado: [
    { nome: "Azul e dourado", a: "#0c1333", b: "#c9a05c", aplicar: function (p) { p.bg = { t: "img", src: "img/navy.jpg", fit: "cover", c: "@navy" }; cores(p, { "Título": { cor: "@ouro" }, "Frase": { cor: "@branco" }, "Mensagem": { cor: "@creme" }, "Logo": { src: "img/logo-branco.png" }, "Aro dourado": { bcor: "@ouro" }, "Aro fino": { bcor: "@ouro" }, "Moldura": { bcor: "@ouro", ccor: "@ouro" } }); } },
    { nome: "Creme e azul", a: "#ecebe6", b: "#0c1333", aplicar: function (p) { p.bg = { t: "img", src: "img/topo.jpg", fit: "cover", c: "@creme" }; cores(p, { "Título": { cor: "@ouro3" }, "Frase": { cor: "@navy" }, "Mensagem": { cor: "@navy" }, "Logo": { src: "img/logo-azul.png" }, "Aro dourado": { bcor: "@ouro" }, "Aro fino": { bcor: "@navy" }, "Moldura": { bcor: "@ouro", ccor: "@navy" } }); } },
    { nome: "Dourado", a: "#f0d48e", b: "#0c1333", aplicar: function (p) { p.bg = { t: "img", src: "img/ouro-fosco.jpg", fit: "cover", c: "@ouro" }; cores(p, { "Título": { cor: "@navy" }, "Frase": { cor: "@navy" }, "Mensagem": { cor: "@navy" }, "Logo": { src: "img/logo-azul-total.png" }, "Aro dourado": { bcor: "@navy" }, "Aro fino": { bcor: "@navy" }, "Moldura": { bcor: "@navy", ccor: "@navy" }, "Divisor": { fill: { t: "cor", c: "@navy", a: 1 } } }); } }
  ],
  tag: [
    { nome: "Creme e azul", a: "#ecebe6", b: "#0c1333", aplicar: function (p) { p.bg = { t: "img", src: "img/topo.jpg", fit: "cover", c: "@creme", op: .9 }; cores(p, { "Para": { cor: "@navy" }, "De": { cor: "@navy" }, "Mensagem": { cor: "@navy" }, "Logo": { src: "img/logo-azul.png" } }); } },
    { nome: "Azul e dourado", a: "#0c1333", b: "#c9a05c", aplicar: function (p) { p.bg = { t: "img", src: "img/navy.jpg", fit: "cover", c: "@navy" }; cores(p, { "Título": { cor: "@ouro" }, "Para": { cor: "@branco" }, "De": { cor: "@branco" }, "Mensagem": { cor: "@creme" }, "Logo": { src: "img/logo-branco.png" }, "Furo (marcação)": { fill: { t: "cor", c: "@navy2", a: 1 } } }); } },
    { nome: "Dourado", a: "#f0d48e", b: "#0c1333", aplicar: function (p) { p.bg = { t: "img", src: "img/ouro-fosco.jpg", fit: "cover", c: "@ouro" }; cores(p, { "Título": { cor: "@navy" }, "Para": { cor: "@navy" }, "De": { cor: "@navy" }, "Mensagem": { cor: "@navy" }, "Logo": { src: "img/logo-azul-total.png" }, "Linha do para": { fill: { t: "cor", c: "@navy", a: 1 } }, "Linha do de": { fill: { t: "cor", c: "@navy", a: 1 } } }); } }
  ]
};

window.KIT = {
  id: "golden", nome: "Materiais Golden", idb: "materiais-golden", pasta: "golden", area: "golden",
  marca: MARCA_PADRAO, marcaNomes: MARCA_NOMES, fontes: FONTES, imgs: IMGS_MARCA, modelos: MODELOS, scriptPadrao: "Ms Madi",
  tok: { claro: "@branco", escuro: "@navy", dest: "@ouro", gradNome: "Dourado", logoClaro: "img/logo-branco.png", logoEscuro: "img/logo-azul.png" },
  inverter: { "@navy": "@branco", "@branco": "@navy", "@navy2": "@creme", "@creme": "@navy2" },
  inverterImg: { "img/navy.jpg": { t: "cor", c: "@creme", a: 1 }, "img/topo.jpg": { t: "img", src: "img/navy.jpg", fit: "cover", c: "@navy" } },
  paletas: PALETAS,
  inicial: function () { return [["promo", "story"], ["ofertas", "story"], ["aniver", "a4"], ["obrigado", "r10"], ["tag", "tag59"]]; },
  gerar: function (m, d) { return m === "obrigado" || m === "tag" ? gerarCartoes(m, d) : gerarG(m, d); }
};
})();
