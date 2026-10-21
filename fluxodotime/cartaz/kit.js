/* Kit Cartaz · cartaz de oferta (Alvorada e Golden) com layout automático.
   Você preenche os campos; o cartaz se reorganiza sozinho e nunca desalinha. */
(function () {
var X = PECAS, M = X.M;
function num(v) { var n = parseFloat(String(v || "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isNaN(n) ? 0 : n; }
function brl(n) { return n.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
var LEGAL = "Ofertas válidas enquanto durarem os estoques. Imagens meramente ilustrativas.";
var sim = function (k) { return function (d) { return !!d[k]; }; };

var MODELOS = {
  cartaz: { nome: "Cartaz de oferta", desc: "Produto, código, descrição, marca, preço DE/POR ou parcelado, brinde, QR do WhatsApp e texto legal.", fmt: "a4", versoes: ["a5", "a4", "a3", "story", "feed"], nomeCampo: "descricao", dup: "Duplicar para outro produto",
    campos: [
      { t: "grupo", l: "Produto" },
      { k: "chamada", l: "Chamada (linha de cima)", ph: "OFERTA" },
      { k: "destaque", l: "Destaque (linha colorida)", ph: "ex.: DECA, IMPERDÍVEL, DA SEMANA" },
      { k: "produto", l: "Foto do produto", t: "img", contain: true },
      { k: "codigo", l: "Código", ph: "27.347 | 227.297" },
      { k: "descricao", l: "Descrição", t: "area" },
      { k: "marca", l: "Marca (aparece em texto)", ph: "DECA" },
      { k: "tag", l: "Tag (opcional)", ph: "LANÇAMENTO, ÚLTIMAS UNIDADES…" },
      { t: "grupo", l: "Preço" },
      { k: "modo", l: "Tipo de preço", t: "seg", ops: [["por", "Só POR"], ["depor", "DE / POR"], ["parcelado", "Parcelado"]] },
      { k: "de", l: "Preço DE", se: function (d) { return d.modo === "depor"; } },
      { k: "chamadaPreco", l: "Frase do preço", ph: "POR APENAS, SOMENTE…", se: function (d) { return d.modo !== "parcelado"; } },
      { k: "preco", l: "Preço POR", t: "preco", se: function (d) { return d.modo !== "parcelado"; } },
      { k: "preco", l: "Valor total", t: "preco", se: function (d) { return d.modo === "parcelado"; }, dica: "As parcelas são calculadas sozinhas." },
      { k: "parcelas", l: "Número de parcelas", t: "num", min: 1, se: function (d) { return d.modo === "parcelado"; } },
      { k: "unid", l: "Unidade (UN, M², CX) · opcional" },
      { t: "grupo", l: "Brinde ou selo" },
      { k: "brinde", l: "Mostrar brinde (ex.: Ganhe a argamassa)", t: "tog" },
      { k: "brindeTit", l: "Chamada", ph: "GANHE", se: sim("brinde") },
      { k: "brindeTxt", l: "O que ganha", ph: "A ARGAMASSA", se: sim("brinde") },
      { k: "brindeImg", l: "Foto do brinde (opcional)", t: "img", contain: true, se: sim("brinde") },
      { k: "brindeEstilo", l: "Formato", t: "seg", ops: [["selo", "Selo redondo"], ["fita", "Faixa"], ["etiqueta", "Etiqueta"]], se: sim("brinde") }]
      .concat(X.whatsCampos, [
      { t: "grupo", l: "Visual" },
      { k: "fundo", l: "Fundo", t: "estilos", ops: function (d, p) { return X.fundosOps(p.tema || "am"); } },
      { k: "fundoFoto", l: "Foto do fundo", t: "img", se: function (d) { return /foto/.test(d.fundo || ""); } },
      { k: "canto", l: "Canto amarelo", t: "tog", se: function (d, p) { return p.tema !== "golden"; } }],
      X.personaCampos(), X.padraoCampos(), [
      { k: "legal", l: "Texto legal (embaixo da logo)", t: "area", rows: 3 }]),
    dados: { chamada: "OFERTA", destaque: "DECA", produto: M + "produto-exemplo.png", codigo: "27.347 | 227.297", descricao: "Bacia com caixa acoplada Izy - Deca", marca: "DECA", tag: "", modo: "depor", de: "686,17", chamadaPreco: "POR APENAS", preco: "499,00", parcelas: 10, unid: "",
      brinde: false, brindeTit: "GANHE", brindeTxt: "A ARGAMASSA", brindeImg: "", brindeEstilo: "selo", whats: "", whatsMsg: "Olá! Vi a oferta no cartaz e quero saber mais.", whatsTxt: "Chame no WhatsApp",
      fundo: "degrade", fundoFoto: "", canto: true, persona: "auto", personaTam: "m", padrao: "auto", padraoAlt: "m", legal: LEGAL } },
  livre: { nome: "Livre", desc: "Página em branco com a marca, para montar do seu jeito no Ajuste fino.", fmt: "a4", campos: [], dados: {} }
};

// largura do preço (R$ + inteiro + centavos) para alinhar as frases de cima
function largPreco(valor, o) {
  var v = String(valor || "").trim(), m = v.match(/^(.*?)[,](\d{1,2})$/), i = m ? m[1] : v, c = m ? m[2] : "";
  var wi = medeTexto(i + (c ? "," : ""), { fonte: o.fonte, peso: o.peso, tam: o.tam }).larg * .98, wc = c ? medeTexto(c, { fonte: o.fonte, peso: o.peso, tam: o.tam * .5 }).larg + o.tam * .02 : 0;
  var wm = medeTexto("R$", { fonte: o.fonte, peso: o.peso, tam: o.tam * o.mtam }).larg + o.tam * .06;
  return { tot: wi + wc + wm, dig: wi + wc };
}

function gerarCartaz(modelo, dm, p) {
  var tema = (p && p.tema) || "am", d = (p && p.dados) || MODELOS.cartaz.dados, W = dm.w, H = dm.h, u = W / 1000, r = H / W, L = [], TT = X.TEMAS[tema], gold = tema === "golden";
  var fs = X.FUNDOS[tema].map(function (f) { return f[0]; }), f = fs.indexOf(d.fundo) >= 0 ? d.fundo : fs[0], es = X.esquema(tema, f);
  var FT = fonteKit("txt", TT.fonte), FTit = fonteKit("tit", gold ? "Poppins" : TT.fonte), FS = fonteKit("scr", TT.script);
  if (modelo === "livre") { var bg0 = X.fundo(tema, f, W, H, d, L); L.push(I("Logo", W * .3, H * .82, W * .4, W * .12, { src: es.logo, fit: "contain" })); return { layers: L, bg: bg0 }; }
  var bg = X.fundo(tema, f, W, H, d, L), pad = 62 * u, alto = r > 1.6, largo = r < 1.32;
  if (!gold && es.escuro && d.canto !== false) L.push(I("Canto amarelo", 0, 0, W * .111, W * .2047, { src: M + "canto-amarelo.png", fit: "contain", px: 0, py: 0, lock: true }));

  // ---------- rodapé: padrão, persona, logo, legal e QR ----------
  var padL = [], padH = X.padrao(padL, d, tema, W, H);
  var pvis = alto ? W * .46 : largo ? Math.min(W * .34, H * .3) : W * .4, pw = alto ? W * .3 : largo ? W * .21 : W * .25;
  var perL = [], per = X.persona(perL, d, tema, W * .044, pvis, pw, H);
  var legal = String(d.legal || "").trim(), lgT = Math.max(12, 15 * u);
  var temQR = !!X.waLink(d.whats), qrW = (alto ? 150 : 118) * u;
  var lx = per ? per.x + per.w * .98 : pad, lRight = W - pad - (temQR ? qrW + 40 * u : 0), lw = lRight - lx;
  if (alto && per) { lx = per.x + per.w * .9; lw = lRight - lx; }
  var logoH = (gold ? 74 : 77) * u * (alto ? 1.25 : 1), lgH = legal ? X.alt(legal, { fonte: FT, tam: lgT, w: lw, lh: 1.25 }) : 0;
  var logoBottom = H - padH - (legal ? lgH + 18 * u : 0) - (padH ? 26 : 40) * u, logoTop = logoBottom - logoH;
  var footL = [];
  footL.push(I("Logo", lx, logoTop, lw, logoH, { src: es.logo, fit: "contain" }));
  if (legal) footL.push(X.txt("Texto legal", lx, logoBottom + 12 * u, lw, lgH + 4, { txt: "{legal}", fonte: FT, tam: lgT, cor: es.sub, lh: 1.25, op: .85 }));
  if (temQR) X.qrBloco(footL, d, W - pad - qrW, logoTop + (logoH - qrW) / 2 - 18 * u, qrW, es, FT);

  // ---------- título ----------
  var tTop = H * (alto ? .075 : .105), t1 = String(d.chamada || "").trim(), t2 = String(d.destaque || "").trim(), y = tTop, titL = [];
  var maxT = W - 2 * 113 * u;
  if (t1) {
    var o1 = gold ? { fonte: FTit, peso: 300, tam: 128 * u, ls: .22, caixa: true } : { fonte: FTit, peso: 900, ita: true, tam: 196 * u * (alto ? .88 : 1), caixa: true, ls: -.01 };
    var k1 = Math.min(1, maxT / Math.max(medeTexto(t1, o1).larg, 1)); o1.tam *= k1;
    titL.push(X.txt("Chamada", pad * .5, y, W - pad, o1.tam * 1.02, Object.assign({ txt: "{chamada}", cor: gold ? "@branco" : es.tx, lh: 1, fit: true }, o1))); y += o1.tam * (gold ? 1.05 : .96);
  }
  if (t2) {
    var o2 = gold ? { fonte: FS, peso: 400, tam: 170 * u } : { fonte: FTit, peso: 900, ita: true, tam: 150 * u * (alto ? .88 : 1), caixa: true, ls: -.01 };
    var k2 = Math.min(1, maxT / Math.max(medeTexto(t2, o2).larg, 1)); o2.tam *= k2;
    titL.push(X.txt("Destaque", pad * .5, y - (gold ? o2.tam * .35 : 0), W - pad, o2.tam * 1.05, Object.assign({ txt: "{destaque}", cor: es.dest, lh: 1 }, o2))); y += o2.tam * (gold ? .75 : 1);
  }

  // ---------- preço (grupo alinhado à direita, como no PSD) ----------
  var pr = num(d.preco), modo = d.modo || "por", pc = Math.max(1, parseInt(d.parcelas, 10) || 1);
  var pT = (alto ? 250 : largo ? 200 : 262) * u, pO = { fonte: FT, peso: 900, tam: pT, mtam: .19 };
  var valor = modo === "parcelado" ? brl(pr / pc) : String(d.preco || "");
  var pCentro = alto && !per, lp = largPreco(valor, pO), maxP = pCentro ? W - 2 * pad : alto ? W - pad - (per.x + per.w * .95) : W * .7; if (lp.tot > maxP) { pO.tam = pT = pT * maxP / lp.tot; lp = largPreco(valor, pO); }
  var precoL = [], pr0 = W - pad, deT = (alto ? 62 : 56) * u, porT = (alto ? 36 : 32) * u;
  // linhas de cima do preço
  var linhas = [];
  if (modo === "depor" && d.de) linhas.push({ n: "Preço DE", t: "DE: R$ {de}", tam: deT, cor: es.tx });
  if (modo === "parcelado") linhas.push({ n: "Parcelas", t: pc + "x de", tam: deT, cor: es.tx });
  else if (d.chamadaPreco) linhas.push({ n: "Frase do preço", t: "{chamadaPreco}", tam: porT, cor: es.dest });
  var baixo = [];
  if (modo === "parcelado") { baixo.push({ n: "Sem juros", t: "SEM JUROS", tam: porT, cor: es.dest }); baixo.push({ n: "Total", t: "TOTAL: R$ " + brl(pr) + (d.unid ? " / " + d.unid : ""), tam: porT * .85, cor: es.tx }); }
  var altLin = function (ls) { return ls.reduce(function (s, x) { return s + x.tam * 1.12; }, 0); };
  var priceH = pT * .8, grupoH = 8 * u + altLin(linhas) + priceH + (baixo.length ? 14 * u + altLin(baixo) : 0);
  var gBottom = logoTop - (alto ? 70 : 46) * u, gTop = gBottom - grupoH;
  var gx = pCentro ? (W - lp.tot) / 2 : pr0 - lp.tot, dx = gx + lp.tot - lp.dig + (pCentro ? 0 : pT * .3), al = pCentro ? "center" : "left";
  var yy = gTop;
  linhas.forEach(function (x, n) { if (n === linhas.length - 1) yy += 8 * u; precoL.push(T(x.n, pCentro ? pad : dx, yy, pCentro ? W - 2 * pad : pr0 - dx, x.tam * 1.15, { txt: x.t, fonte: FT, peso: 900, tam: x.tam, cor: x.cor, caixa: true, al: al, va: "top", lh: 1, fit: true })); yy += x.tam * 1.12; });
  precoL.push(P$("Preço", gx - 10 * u, yy + pT * (pCentro ? .07 : .015), lp.tot + 20 * u, priceH + pT * .1, { virg: true, sup: .01, valor: modo === "parcelado" ? valor : "{preco}", unid: modo === "parcelado" ? "" : "{unid}", tam: pT, cor: es.dest, al: "right", fonte: FT, peso: 900, mtam: .19, mcor: es.tx }));
  yy += priceH + 20 * u;
  baixo.forEach(function (x) { precoL.push(T(x.n, pCentro ? pad : dx, yy, pCentro ? W - 2 * pad : pr0 - dx, x.tam * 1.15, { txt: x.t, fonte: FT, peso: 900, tam: x.tam, cor: x.cor, caixa: true, al: al, va: "top", lh: 1, fit: true })); yy += x.tam * 1.12; });

  // ---------- meio: foto + informações ----------
  var mTop = y + (alto ? 30 : 14) * u, mBot = gTop - (alto ? 30 : 34) * u, imgB, info, cw, alI;
  if (alto) {
    var mH = mBot - mTop; imgB = { x: pad, y: mTop, w: W - 2 * pad, h: mH * .55 };
    info = new X.Coluna(pad, mTop + mH * .57, W - 2 * pad, mH * .43, "base"); alI = "center";
  } else {
    var pTop = t2 && !gold ? y - o2.tam * .55 : mTop; imgB = { x: W * .045, y: pTop, w: W * .46, h: gTop - 6 * u - pTop };
    info = new X.Coluna(W * .54, mTop, W - pad - W * .54, mBot - mTop, "meio"); alI = "left";
  }
  cw = info.w;
  var prodL = [], fotoAlto = function () { // story: a foto ocupa todo o espaço que sobra acima das informações
    var tot = info.b.reduce(function (s, b) { return s + b.h + b.gap; }, 0); if (tot > mH * .6) return;
    info.hMax = tot; info.y = mBot - tot; imgB.h = info.y - 24 * u - imgB.y;
  };
  var poeFoto = function () { if (d.produto) prodL.push(I("Foto do produto", imgB.x, imgB.y, imgB.w, imgB.h, { src: "{produto}", fit: "contain", px: 50, py: alto ? 50 : 100 })); };
  var infoL = [], txc = es.tx;
  var bloco = function (nome, texto, o, campo) {
    if (!texto) return; var h = X.alt(texto, Object.assign({ w: cw }, o));
    info.add(h, function (y2, sc, x, w) { infoL.push(X.txt(nome, x, y2, w, h * sc + 2, Object.assign({ txt: campo || texto, cor: txc, al: alI, va: "top" }, o, { tam: o.tam * sc }))); }, o.gap || 0);
  };
  if (d.marca) { var mt = (alto ? 30 : 26) * u, mw2 = medeTexto(d.marca, { fonte: FT, peso: 700, tam: mt, caixa: true, ls: .08 }).larg + mt * 1.6; info.add(mt * 1.9, function (y2, sc, x, w) { infoL.push(G("Marca", alI === "center" ? x + (w - mw2 * sc) / 2 : x, y2, mw2 * sc, mt * 1.7 * sc, { txt: "{marca}", estilo: "contorno", fundo: es.tx, cor: es.tx, fonte: FT, peso: 700, tam: mt * sc, ls: .08, raio: 4 * u, blarg: Math.max(1.5, 2 * u) })); }, 0); }
  if (d.codigo) bloco("Código", "CÓD.: " + d.codigo, { fonte: FT, peso: 500, tam: (alto ? 38 : 34) * u, gap: 16 * u }, "CÓD.: {codigo}");
  bloco("Descrição", d.descricao, { fonte: FT, peso: gold ? 600 : 900, tam: (gold ? 50 : 60) * u * (alto ? 1.15 : 1), lh: 1, caixa: true, gap: 10 * u }, "{descricao}");
  if (d.tag) { var tt = 26 * u, tw = medeTexto(d.tag, { fonte: FT, peso: 800, tam: tt, caixa: true }).larg + tt * 1.6; info.add(tt * 1.9, function (y2, sc, x, w) { infoL.push(G("Tag", alI === "center" ? x + (w - tw * sc) / 2 : x, y2, tw * sc, tt * 1.75 * sc, { txt: "{tag}", estilo: "cheio", fundo: es.box, cor: es.boxT, fonte: FT, peso: 800, tam: tt * sc, raio: 40 * u })); }, 18 * u); }

  if (alto) { if (d.brinde && d.brindeEstilo !== "selo") info.add(0, function () {}, 0); fotoAlto(); }
  poeFoto();
  // brinde
  var brL = [];
  if (d.brinde) {
    var est = d.brindeEstilo || "selo";
    if (est === "selo") {
      var sd = Math.min(250 * u, imgB.w * .48), sx = alto ? W - pad - sd : imgB.x, sy = imgB.y + (alto ? 0 : 4 * u);
      brL.push(F("Selo do brinde", sx, sy, sd, sd, { fill: { t: "cor", c: "@laranja", a: 1 }, raio: sd / 2, rot: -10, sombra: 1, blarg: Math.max(3, 6 * u), bcor: "@branco" }));
      brL.push(T("Selo · chamada", sx + sd * .1, sy + sd * .2, sd * .8, sd * .27, { txt: "{brindeTit}", fonte: FT, peso: 900, ita: !gold, tam: sd * .21, cor: "@branco", caixa: true, rot: -10, fit: true, lh: 1, va: "bottom" }));
      brL.push(T("Selo · brinde", sx + sd * .1, sy + sd * .49, sd * .8, sd * .3, { txt: "{brindeTxt}", fonte: FT, peso: 800, tam: sd * .115, cor: "@branco", caixa: true, rot: -10, fit: true, lh: 1.05, va: "top" }));
      if (d.brindeImg) brL.push(I("Foto do brinde", sx + sd * .55, sy + sd * .62, sd * .62, sd * .62, { src: "{brindeImg}", fit: "contain", py: 100 }));
    } else {
      var fh = (alto ? 70 : 60) * u, txt2 = (d.brindeTit || "") + " " + (d.brindeTxt || "");
      var poeBrinde = function (y2, sc, x, w) {
        var ww = est === "fita" ? w : Math.min(w, medeTexto(txt2, { fonte: FT, peso: 800, tam: 28 * u, caixa: true }).larg + fh * 1.6), xx = alI === "center" ? x + (w - ww) / 2 : x;
        if (est === "fita") brL.push(F("Faixa do brinde", xx - 12 * u, y2, ww + 24 * u, fh * sc, { fill: { t: "cor", c: "@laranja", a: 1 }, rot: -2, sombra: 1 }));
        else brL.push(F("Etiqueta do brinde", xx, y2, ww, fh * sc, { fill: { t: "cor", c: "@laranja", a: 1 }, raio: fh * sc / 2, sombra: 1 }));
        var ic = fh * sc * .58, tx0 = xx + fh * sc * .45, tW = medeTexto(txt2, { fonte: FT, peso: 800, tam: 28 * u * sc, caixa: true }).larg, cx0 = est === "fita" ? xx + (ww - (ic + 14 * u + tW)) / 2 : tx0;
        brL.push(Ic("Ícone do brinde", cx0, y2 + (fh * sc - ic) / 2, ic, ic, { icone: "presente", cor: "@branco", traco: 2 }));
        brL.push(T("Brinde", cx0 + ic + 14 * u, y2, Math.min(tW + 10 * u, ww - (cx0 - xx) - ic - 20 * u), fh * sc, { txt: "**{brindeTit}** {brindeTxt}", fonte: FT, peso: 600, tam: 28 * u * sc, cor: "@branco", caixa: true, al: "left", rot: est === "fita" ? -2 : 0, fit: true }));
        if (d.brindeImg) brL.push(I("Foto do brinde", xx + ww - fh * sc * 1.5, y2 - fh * sc * .9, fh * sc * 1.6, fh * sc * 1.6, { src: "{brindeImg}", fit: "contain" }));
      };
      if (alto) poeBrinde(imgB.y + imgB.h - fh * 1.2, 1, W * .12, W * .76);
      else info.add(fh, poeBrinde, 28 * u);
    }
  }
  info.montar();
  // ordem das camadas: produto por baixo da persona; textos por cima
  L = L.concat(prodL, padL, perL, titL, infoL, precoL, brL, footL);
  return { layers: L, bg: bg };
}

window.KIT = {
  id: "cartaz", nome: "Cartazes", idb: "cartazes-fluxo", pasta: "cartaz", area: "cartaz",
  marca: X.TEMAS.am.marca, marcaNomes: X.NOMES, temas: X.TEMAS, temaPadrao: "am",
  fontes: ["Gotham", "Poppins", "Montserrat", "Ms Madi", "Allura", "Bebas Neue"], scriptPadrao: "Ms Madi",
  imgs: [[X.A + "logo-am.png", "Logo Alvorada", 1], [X.A + "logo-am-branco.png", "Logo Alvorada (fundo escuro)", 1], [X.G + "logo-branco.png", "Logo Golden (fundo escuro)", 1], [X.G + "logo-azul.png", "Logo Golden", 1],
    [M + "persona-alvorinho.png", "Alvorinho", 1], [M + "mascote-coracao.png", "Alvorinho coração", 1], [M + "padrao-mosaico.png", "Padrão mosaico"], [M + "cartaz-azul.jpg", "Fundo azul degradê"], [M + "produto-exemplo.png", "Produto (exemplo)", 1], [M + "am-azul.jpg", "Fundo azul"], [M + "golden-noite.jpg", "Fundo Golden"]],
  modelos: MODELOS, auto: true, simples: true,
  biblio: X.BIBLIO,
  fontesKit: { tit: ["Fonte do título", "Gotham (Golden: Poppins)"], txt: ["Fonte dos textos e do preço", "Gotham (Golden: Poppins)"], scr: ["Fonte manuscrita (Golden)", "Ms Madi"] },
  carregarFontes: ["900 40px Gotham", "900 italic 40px Gotham", "700 40px Gotham", "500 40px Gotham", "400 40px Gotham", "300 40px Poppins", "600 40px Poppins", "400 40px \"Ms Madi\""],
  tok: { claro: "@branco", escuro: "@navy", dest: "@ouro", gradNome: "Destaque", logoClaro: X.A + "logo-am-branco.png", logoEscuro: X.A + "logo-am.png" },
  inicial: function () { return [["cartaz", "a4"]]; },
  gerar: gerarCartaz
};
})();
