/* Peças com layout automático (Cartaz e Cards): marcas, fundos e blocos que se reorganizam sozinhos.
   Usado por cartaz/kit.js e cards/kit.js, depois do motor.js. */
var PECAS = (function () {
  "use strict";
  var A = "../endomarketing/img/", GP = "../golden/img/", M = "../marcas/";
  var TEMAS = {
    am: { nome: "Alvorada", fonte: "Gotham", script: "Ms Madi", logoClaro: A + "logo-am-branco.png", logoEscuro: A + "logo-am.png",
      marca: { navy: "#14207a", navy2: "#2638c4", ouro: "#fcd205", ouro2: "#ffe36b", ouro3: "#f2b600", creme: "#f5f6fa", branco: "#ffffff", grafite: "#6d7396", ciano: "#4ebdef", laranja: "#f0471d" } },
    golden: { nome: "Golden", fonte: "Poppins", script: "Ms Madi", logoClaro: GP + "logo-branco.png", logoEscuro: GP + "logo-azul.png",
      marca: { navy: "#0c1333", navy2: "#1c2a5e", ouro: "#c9a05c", ouro2: "#f0d48e", ouro3: "#9c7333", creme: "#f4f1ea", branco: "#ffffff", grafite: "#5c5c5c", ciano: "#8aa0d8", laranja: "#b8873b" } }
  };
  var NOMES = { navy: "Azul escuro", navy2: "Azul", ouro: "Destaque (amarelo/ouro)", ouro2: "Destaque claro", ouro3: "Destaque escuro", creme: "Fundo claro", branco: "Branco", grafite: "Cinza", ciano: "Ciano", laranja: "Laranja / selo" };

  // fundos prontos de cada marca; escuro = textos claros
  var FUNDOS = {
    am: [["degrade", "Azul degradê", "linear-gradient(160deg,#1f78e0,#0a1650 55%)", 1], ["azul", "Azul Alvorada", "#1d2fae", 1], ["azul-onda", "Azul com onda amarela", "linear-gradient(160deg,#ffd400 40%,#1d2fae 41%)", 1], ["azul-foto", "Azul sobre foto", "#25307a", 1], ["noite", "Azul noite (convites)", "#18245e", 1], ["amarelo", "Amarelo", "#fcd205", 0], ["branco", "Branco", "#f5f6fa", 0]],
    golden: [["noite", "Azul noite", "#141d45", 1], ["noite-foto", "Azul sobre foto", "#1f2a52", 1], ["creme", "Creme claro", "#f4f1ea", 0], ["dourado", "Dourado", "linear-gradient(120deg,#9c7333,#f0d48e,#c9a05c)", 0]]
  };
  function fundosOps(tema) { return (FUNDOS[tema] || FUNDOS.am).map(function (f) { return [f[0], f[1], f[2]]; }); }
  function escuro(tema, f) { var x = (FUNDOS[tema] || FUNDOS.am).find(function (y) { return y[0] === f; }); return x ? !!x[3] : true; }
  // cores de texto conforme o fundo
  function esquema(tema, f) {
    var e = escuro(tema, f);
    if (tema === "golden") return e ? { tx: "@branco", sub: "@creme", dest: "@ouro", forte: "@ouro2", chipF: "@ouro", chipT: "@navy", box: "@ouro", boxT: "@navy", linha: "@ouro", logo: TEMAS.golden.logoClaro, escuro: true }
      : { tx: "@navy", sub: "@grafite", dest: "@ouro3", forte: "@navy", chipF: "@navy", chipT: "@branco", box: "@navy", boxT: "@branco", linha: "@ouro", logo: f === "dourado" ? GP + "logo-azul-total.png" : TEMAS.golden.logoEscuro, escuro: false };
    return e ? { tx: "@branco", sub: "@branco", dest: "@ouro", forte: "@ouro", chipF: "@navy2", chipT: "@ouro", box: "@ouro", boxT: "@navy", linha: "@ouro", logo: TEMAS.am.logoClaro, escuro: true }
      : f === "amarelo" ? { tx: "@navy", sub: "@navy", dest: "@navy2", forte: "@navy", chipF: "@navy", chipT: "@ouro", box: "@navy", boxT: "@branco", linha: "@navy", logo: TEMAS.am.logoEscuro, escuro: false }
      : { tx: "@navy", sub: "@navy", dest: "@navy2", forte: "@navy2", chipF: "@navy", chipT: "@ouro", box: "@ouro", boxT: "@navy", linha: "@ouro", logo: TEMAS.am.logoEscuro, escuro: false };
  }
  // camadas do fundo (imagem, sobreposições e detalhes)
  function fundo(tema, f, W, H, d, L) {
    var u = W / 1000, foto = d.fundoFoto;
    if (tema === "golden") {
      if (f === "creme") { L.push(I("Linhas do fundo", 0, 0, W, H, { src: M + "linhas-claras.png", lock: true })); detalhesOuro(W, H, L, "@ouro"); return { t: "cor", c: "@creme", a: 1 }; }
      if (f === "dourado") return { t: "img", src: GP + "ouro-fosco.jpg", fit: "cover", c: "@ouro" };
      if (f === "noite-foto" && foto) { L.push(F("Véu azul", 0, 0, W, H, { fill: { t: "grad", c1: "@navy", a1: .78, c2: "@navy", a2: .96, ang: 180 }, lock: true })); detalhesOuro(W, H, L, "@ouro"); return { t: "img", src: foto, fit: "cover", c: "@navy" }; }
      L.push(I("Linhas do fundo", 0, 0, W, H, { src: M + "linhas-arq.png", lock: true, op: .9 })); detalhesOuro(W, H, L, "@ouro");
      return { t: "img", src: M + "golden-noite.jpg", fit: "cover", c: "@navy" };
    }
    if (f === "amarelo") { L.push(I("Cubos do fundo", 0, 0, W, H, { src: M + "cubos-linhas.png", fit: "cover", lock: true, op: .55 })); return { t: "grad", c1: "@ouro", a1: 1, c2: "@ouro3", a2: 1, ang: 160 }; }
    if (f === "branco") return { t: "cor", c: "@creme", a: 1 };
    if (f === "noite") return { t: "img", src: M + "am-noite.jpg", fit: "cover", c: "@navy" };
    if (f === "degrade") { L.push(I("Cubos do topo", 0, 0, W * .835, W * .192, { src: M + "cubos-topo.png", fit: "fill", lock: true, op: .4 })); return { t: "img", src: M + "cartaz-azul.jpg", fit: "cover", px: 0, py: 0, c: "@navy" }; }
    if (f === "azul-foto" && foto) { L.push(F("Véu azul", 0, 0, W, H, { fill: { t: "grad", c1: "@navy2", a1: .82, c2: "@navy", a2: .94, ang: 180 }, lock: true })); return { t: "img", src: foto, fit: "cover", c: "@navy" }; }
    L.push(I("Cubos do fundo", 0, 0, W, H, { src: M + "cubos-linhas.png", fit: "cover", lock: true, op: .7 }));
    if (f === "azul-onda") L.push(I("Onda amarela", 0, 0, W, Math.round(Math.min(H * .42, W * .95)), { src: M + "onda-amarela.png", fit: "cover", px: 50, py: 100, lock: true }));
    return { t: "img", src: M + "am-azul.jpg", fit: "cover", c: "@navy" };
  }
  function detalhesOuro(W, H, L, c) {
    var u = W / 1000;
    L.push(F("Filete dourado de cima", W * .52, -40 * u, W * .7, 9 * u, { fill: { t: "grad", c1: c, a1: 0, c2: c, a2: 1, ang: 90 }, rot: 18, lock: true }));
    L.push(F("Filete dourado de baixo", -W * .2, H - 70 * u, W * .7, 9 * u, { fill: { t: "grad", c1: c, a1: 1, c2: c, a2: 0, ang: 90 }, rot: 14, lock: true }));
  }
  // faixas amarelas inclinadas (topo e base) do estilo Alvorada
  function faixas(W, H, L, topo, base) {
    var u = W / 1000;
    if (topo) L.push(F("Faixa amarela de cima", W * .25, -26 * u, W * .9, 40 * u, { fill: { t: "grad", c1: "@ouro", a1: 1, c2: "@ouro3", a2: 1, ang: 90 }, rot: 2.2, lock: true }));
    if (base) L.push(F("Faixa amarela de baixo", -W * .1, H - 26 * u, W * 1.2, 70 * u, { fill: { t: "grad", c1: "@ouro", a1: 1, c2: "@ouro3", a2: 1, ang: 90 }, rot: -2.5, lock: true }));
  }

  // sequência vertical: blocos com altura conhecida; encolhe tudo se não couber
  function Coluna(x, y, w, hMax, alinhar) { this.x = x; this.y = y; this.w = w; this.hMax = hMax; this.b = []; this.al = alinhar || "meio"; }
  Coluna.prototype.add = function (h, fn, gap) { this.b.push({ h: h, fn: fn, gap: gap || 0 }); return this; };
  Coluna.prototype.montar = function () {
    var tot = this.b.reduce(function (s, b) { return s + b.h + b.gap; }, 0), sc = tot > this.hMax ? this.hMax / tot : 1;
    var y = this.y + (this.al === "meio" ? (this.hMax - tot * sc) / 2 : this.al === "base" ? this.hMax - tot * sc : 0), x = this.x, w = this.w;
    this.b.forEach(function (b) { y += b.gap * sc; b.fn(y, sc, x, w); y += b.h * sc; });
    return sc;
  };
  // altura de um texto já com quebra de linha
  function alt(txt, o) { return txt ? medeTexto(txt, o).h : 0; }
  function txt(nome, x, y, w, h, o) { return T(nome, x, y, w, h, Object.assign({ fit: true, lh: 1.12 }, o)); }

  // logos do rodapé (parceiros + clube + loja), centralizados e com a mesma altura visual
  function rodape(W, y, h, d, esq, L, tema) {
    var u = W / 1000, itens = [];
    if (d.parc1) itens.push(["Logo do parceiro 1", d.parc1, 2.6]);
    if (d.parc2) itens.push(["Logo do parceiro 2", d.parc2, 2.6]);
    if (d.clube && tema !== "golden") itens.push(["Clube dos Profissionais", M + "clube.png", 2.2]);
    if (d.loja !== false && !(d.clube && tema !== "golden")) itens.push(["Logo", esq.logo, 3.4]);
    if (!itens.length) return;
    var gap = 50 * u, larg = itens.map(function (i) { return h * i[2]; }), tot = larg.reduce(function (a, b) { return a + b; }, 0) + gap * (itens.length - 1), k = Math.min(1, (W - 100 * u) / tot);
    var x = (W - tot * k) / 2;
    itens.forEach(function (it, n) { L.push(I(it[0], Math.round(x), Math.round(y + h * (1 - k) / 2), Math.round(larg[n] * k), Math.round(h * k), { src: it[1], fit: "contain" })); x += (larg[n] + gap) * k; });
  }
  // botão / chamada com estilos prontos
  var BOTOES = [["cheio", "Cheio", "#fcd205"], ["pilula3d", "Pílula com relevo", "#ffd400"], ["contorno", "Contorno", "transparent"], ["tracejado", "Tracejado", "transparent"], ["texto", "Só texto", "transparent"]];
  function botao(nome, x, y, w, h, texto, est, esq, o) {
    o = o || {}; var cheio = est === "cheio" || est === "pilula3d";
    return G(nome, x, y, w, h, Object.assign({ txt: texto, estilo: est === "texto" ? "nada" : est, blarg: est === "texto" ? 0 : Math.max(2, h * .05), fundo: cheio ? esq.box : esq.tx, fundo2: "@navy", cor: cheio ? esq.boxT : esq.tx, raio: est === "pilula3d" ? h / 2 : (o.raio != null ? o.raio : h * .18), caixa: false, multi: true, marc: true }, o));
  }
  // ---------- biblioteca: personas, padrões de rodapé e logos de parceiros ----------
  var PERSONA0 = M + "persona-alvorinho.png", PADRAO0 = M + "padrao-mosaico.png";
  var BIBLIO = {
    personas: [[PERSONA0, "Alvorinho"], [M + "mascote-coracao.png", "Alvorinho coração"], [M + "mascote-bracos.png", "Alvorinho (meio corpo)"]],
    padroes: [[PADRAO0, "Mosaico colorido"], [M + "mosaico-faixa.png", "Cubos"]],
    parceiros: [[M + "deca.svg", "Deca"], [M + "amanco.png", "Amanco"], [M + "wavin.png", "Wavin"], [M + "eliane.png", "Eliane"], [M + "clube.png", "Clube dos Profissionais"]]
  };
  var CORPO_INTEIRO = {}; CORPO_INTEIRO[PERSONA0] = 1721 / 640;
  function personaCampos(se) { return [{ k: "persona", l: "Persona", t: "img", contain: true, biblio: "personas", vazio: "Sem persona", auto: true, se: se }, { k: "personaTam", l: "Tamanho da persona", t: "seg", ops: [["p", "Pequena"], ["m", "Média"], ["g", "Grande"]], se: function (d, p) { return (!se || se(d, p)) && d.persona !== "" && !(d.persona === "auto" && p.tema === "golden"); } }]; }
  function padraoCampos() { return [{ k: "padrao", l: "Padrão do rodapé", t: "img", biblio: "padroes", vazio: "Sem padrão", auto: true }, { k: "padraoAlt", l: "Altura do padrão", t: "seg", ops: [["p", "Fina"], ["m", "Média"], ["g", "Alta"]], se: function (d, p) { return d.padrao !== "" && !(d.padrao === "auto" && p.tema === "golden"); } }]; }
  function personaSrc(d, tema) { var v = d.persona == null ? (d.mascote ? (d.mascote === "coracao" ? M + "mascote-coracao.png" : PERSONA0) : "") : d.persona; if (v === "auto") return tema === "golden" ? "" : PERSONA0; return v; }
  function padraoSrc(d, tema) { var v = d.padrao == null ? (d.mosaico === false ? "" : "auto") : d.padrao; if (v === "auto") return tema === "golden" ? "" : PADRAO0; return v; }
  function campo(d, k, val) { return d[k] === val ? val : "{" + k + "}"; } // valor fixo quando "auto"
  // desenha a persona: corpo inteiro é cortado na cintura pela borda; as outras ficam apoiadas no rodapé
  function persona(L, d, tema, x, visivel, w, H, lado) {
    var src = personaSrc(d, tema); if (!src) return null;
    var k = { p: .78, m: 1, g: 1.22 }[d.personaTam || "m"]; w *= k; visivel *= k;
    var asp = CORPO_INTEIRO[src], top = H - visivel, xx = lado === "dir" ? x - w : x, s = d.persona === "auto" || d.persona == null ? src : "{persona}";
    if (asp) L.push(I("Persona", xx, top, w, w * asp, { src: s, fit: "contain", px: 50, py: 0 }));
    else L.push(I("Persona", xx, top, w, visivel, { src: s, fit: "contain", px: lado === "dir" ? 100 : 0, py: 100 }));
    return { x: xx, w: w, top: top };
  }
  function padrao(L, d, tema, W, H) {
    var src = padraoSrc(d, tema); if (!src) return 0;
    var h = W * { p: .055, m: .0815, g: .11 }[d.padraoAlt || "m"];
    L.push(I("Padrão do rodapé", 0, H - h, W, h, { src: d.padrao === "auto" || d.padrao == null ? src : "{padrao}", fit: "cover", px: 0, py: 0, lock: true }));
    return h;
  }
  // QR do WhatsApp
  function waLink(num, txt) { var n = String(num || "").replace(/\D/g, ""); if (!n) return ""; if (n.length <= 11) n = "55" + n; return "https://wa.me/" + n + (txt ? "?text=" + encodeURIComponent(txt) : ""); }
  var qrCache = {};
  function qrURL(texto, cor) {
    var key = texto + "|" + cor; if (qrCache[key]) return qrCache[key];
    if (!window.qrcode || !texto) return "";
    var q = qrcode(0, "M"); q.addData(texto); q.make();
    var n = q.getModuleCount(), m = 2, s = 10, c = document.createElement("canvas"); c.width = c.height = (n + m * 2) * s;
    var g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.fillStyle = cor || "#0b1550";
    for (var r = 0; r < n; r++) for (var k = 0; k < n; k++) if (q.isDark(r, k)) g.fillRect((k + m) * s, (r + m) * s, s, s);
    return (qrCache[key] = c.toDataURL("image/png"));
  }
  // bloco QR + legenda (largura w); devolve a altura
  function qrBloco(L, d, x, y, w, esq, fonte, al) {
    var link = waLink(d.whats, d.whatsMsg); if (!link) return 0;
    var t = w * .13, qh = w;
    L.push(F("Fundo do QR", x - w * .06, y - w * .06, w * 1.12, w * 1.12, { fill: { t: "cor", c: "@branco", a: 1 }, raio: w * .1, sombra: 1 }));
    L.push(I("QR do WhatsApp", x, y, w, w, { src: qrURL(link, "#0b1550"), fit: "contain" }));
    if (d.whatsTxt) L.push(T("Legenda do QR", x - w * .5, y + qh + w * .12, w * 2, t * 2.3, { txt: "{whatsTxt}", fonte: fonte, peso: 700, tam: t, cor: esq.tx, lh: 1.1, al: "center", va: "top", fit: true }));
    return qh + w * .12 + (d.whatsTxt ? t * 2.3 : 0);
  }
  var whatsCampos = [{ t: "grupo", l: "WhatsApp (opcional)", dica: "Preencha o número e aparece um QR code que abre a conversa." }, { k: "whats", l: "Número do WhatsApp", ph: "67 99999-9999" }, { k: "whatsMsg", l: "Mensagem que já vem escrita", ph: "Olá! Vi o cartaz e quero saber mais.", se: function (d) { return !!d.whats; } }, { k: "whatsTxt", l: "Legenda do QR", ph: "Chame no WhatsApp", se: function (d) { return !!d.whats; } }];
  // contagem regressiva (dd/mm até hoje)
  function faltam(dataTxt) {
    var m = String(dataTxt || "").match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{2,4}))?/); if (!m) return null;
    var hoje = new Date(); hoje.setHours(0, 0, 0, 0); var a = m[3] ? +m[3] : hoje.getFullYear(); if (a < 100) a += 2000;
    var dt = new Date(a, +m[2] - 1, +m[1]); if (!m[3] && dt < hoje) dt.setFullYear(a + 1);
    return Math.round((dt - hoje) / 864e5);
  }
  function faltamTxt(n) { return n == null || n < 0 ? "" : n === 0 ? "É HOJE!" : n === 1 ? "É AMANHÃ!" : "FALTAM " + n + " DIAS"; }

  return { BIBLIO: BIBLIO, PERSONA0: PERSONA0, personaCampos: personaCampos, padraoCampos: padraoCampos, personaSrc: personaSrc, padraoSrc: padraoSrc, persona: persona, padrao: padrao, waLink: waLink, qrURL: qrURL, qrBloco: qrBloco, whatsCampos: whatsCampos, faltam: faltam, faltamTxt: faltamTxt,
    TEMAS: TEMAS, NOMES: NOMES, FUNDOS: FUNDOS, fundosOps: fundosOps, esquema: esquema, fundo: fundo, faixas: faixas, Coluna: Coluna, alt: alt, txt: txt, rodape: rodape, BOTOES: BOTOES, botao: botao, M: M, A: A, G: GP };
})();
