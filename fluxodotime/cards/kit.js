/* Kit Cards · treinamentos, ações de loja, eventos e convites (Alvorada e Golden), com layout automático. */
(function () {
var X = PECAS, M = X.M;
var MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
var sim = function (k) { return function (d) { return !!d[k]; }; }, igual = function (k, v) { return function (d) { return [].concat(v).indexOf(d[k]) >= 0; }; };
var contagemCampo = { k: "contagem", l: "Mostrar contagem regressiva (FALTAM X DIAS)", t: "tog", dica: "Conta a partir de hoje até a data (dd/mm). A conta é refeita sempre que abrir o projeto." };
var fundoCampo = { k: "fundo", l: "Fundo", t: "estilos", ops: function (d, p) { return X.fundosOps(p.tema || "am"); } };
var fotoFundo = { k: "fundoFoto", l: "Foto do fundo", t: "img", se: function (d) { return /foto/.test(d.fundo || ""); } };
var logosCampos = [
  { t: "grupo", l: "Logos do rodapé", dica: "Ficam alinhados sozinhos, na mesma altura." },
  { k: "parc1", l: "Logo do parceiro 1 (PNG sem fundo)", t: "img", contain: true, biblio: "parceiros", vazio: "Nenhum" },
  { k: "parc2", l: "Logo do parceiro 2", t: "img", contain: true, biblio: "parceiros", vazio: "Nenhum" },
  { k: "clube", l: "Clube dos Profissionais", t: "tog", se: function (d, p) { return p.tema !== "golden"; } },
  { k: "loja", l: "Logo da loja", t: "tog" }
];
var botaoCampos = [
  { k: "cta", l: "Chamada final / botão", ph: "Confirme sua presença com o gerente!" },
  { k: "botao", l: "Estilo do botão", t: "estilos", ops: X.BOTOES, se: sim("cta") }
];

var MODELOS = {
  evento: { nome: "Treinamento / evento", desc: "Título em duas linhas, texto, lista de conteúdos, data, hora, local, botão e logos dos parceiros.", fmt: "story", versoes: ["story", "feed", "quad", "a4"], nomeCampo: "titulo2", dup: "Duplicar",
    campos: [
      { t: "grupo", l: "Textos" },
      { k: "titulo1", l: "Título · linha 1" }, { k: "titulo2", l: "Título · linha 2 (destaque)" },
      { k: "texto", l: "Texto", t: "area", dica: "**negrito** para destacar nomes." },
      { k: "seta", l: "Setinha antes da lista", t: "tog" },
      { k: "listaTit", l: "Título da lista" }, { k: "lista", l: "Itens da lista (um por linha)", t: "area", rows: 5 },
      { t: "grupo", l: "Data e local" },
      { k: "data", l: "Data", ph: "15/09" }, { k: "hora", l: "Hora", ph: "19h" }, { k: "local", l: "Local", ph: "Alvorada Zahran, 1.119" },
      { k: "dataEstilo", l: "Como mostrar", t: "seg", ops: [["caixa", "Caixa"], ["linha", "Linha com ícones"], ["calendario", "Calendário"]] },
      contagemCampo,
      { t: "grupo", l: "Botão" }].concat(botaoCampos, X.whatsCampos, logosCampos, [
      { t: "grupo", l: "Visual" }, fundoCampo, fotoFundo,
      { k: "faixas", l: "Faixas inclinadas em cima e embaixo", t: "tog", se: function (d, p) { return p.tema !== "golden"; } },
      { k: "decor", l: "Quadradinhos decorativos", t: "tog" }]),
    dados: { titulo1: "TREINAMENTO", titulo2: "TÉCNICO", texto: "A **Alvorada**, em parceria com a **Amanco**, convida você para um treinamento técnico com informações, aplicações e dicas para o dia a dia da obra.", seta: true,
      listaTit: "CONTEÚDOS DO TREINAMENTO:", lista: "Linha de esgoto\nCPVC\nMangueira corrugada\nLinha soldável\nCaixa de inspeção\nAdesivos\nBenefícios e diferenciais Amanco",
      data: "15/09", hora: "19h", local: "Alvorada Zahran, 1.119", dataEstilo: "caixa", cta: "Confirme sua presença com o gerente!", botao: "texto",
      parc1: M + "amanco.png", parc2: M + "wavin.png", clube: true, loja: true, fundo: "azul", fundoFoto: "", faixas: true, decor: true } },
  acao: { nome: "Ação de loja", desc: "Título em arte ou em texto, frase com destaque, mensagem, data e mascote. Ex.: Sábado Acerte o Alvo.", fmt: "story", versoes: ["story", "feed", "quad"], nomeCampo: "destaque", dup: "Duplicar",
    campos: [
      { t: "grupo", l: "Título" },
      { k: "tituloModo", l: "Título", t: "seg", ops: [["arte", "Arte pronta (PNG)"], ["texto", "Texto"]] },
      { k: "tituloArte", l: "Arte do título (PNG sem fundo)", t: "img", contain: true, se: igual("tituloModo", "arte") },
      { k: "titulo1", l: "Linha pequena", se: igual("tituloModo", "texto") }, { k: "titulo2", l: "Linha grande", t: "area", rows: 2, se: igual("tituloModo", "texto") },
      { t: "grupo", l: "Frase" },
      { k: "frase1", l: "Antes do destaque" }, { k: "destaque", l: "Destaque" }, { k: "frase2", l: "Depois do destaque" },
      { k: "destEstilo", l: "Destaque como", t: "seg", ops: [["botao", "Botão"], ["cor", "Texto colorido"]] },
      { k: "italico", l: "Frase em itálico", t: "tog" },
      { t: "grupo", l: "Mensagem e data" },
      { k: "mensagem", l: "Mensagem", t: "area" },
      { k: "caixa", l: "Caixa da mensagem", t: "seg", ops: [["azul", "Azul"], ["tracejada", "Tracejada"], ["nenhuma", "Sem caixa"]] },
      { k: "data", l: "Data (opcional)", ph: "06/09 ou 06 DE SETEMBRO" }, { k: "contagem", l: "Mostrar contagem regressiva", t: "tog", se: function (d) { return X.faltam(d.data) != null; }, dica: "Precisa da data com dia/mês (ex.: 06/09)." }, { k: "hora", l: "Horário (opcional)", ph: "A partir das 08:00h" },
      { t: "grupo", l: "Visual" }, fundoCampo, fotoFundo,
      { k: "parc1", l: "Logo de parceiro (opcional)", t: "img", contain: true, biblio: "parceiros", vazio: "Nenhum" }].concat(X.personaCampos()),
    dados: { tituloModo: "arte", tituloArte: M + "titulo-arte-exemplo.png", titulo1: "SÁBADO", titulo2: "ACERTE O ALVO", frase1: "NA ALVORADA,", destaque: "O SÁBADO", frase2: "É UM DIA ESPECIAL!", destEstilo: "botao", italico: true,
      mensagem: "Promoções, brindes e brincadeiras em todas as nossas lojas.", caixa: "azul", data: "", hora: "", fundo: "azul-onda", fundoFoto: "", persona: M + "mascote-coracao.png", personaTam: "m", parc1: "", contagem: false } },
  convite: { nome: "Convite", desc: "Convite de WhatsApp (completo) ou convite impresso duplo: capa (externo) e miolo (interno).", fmt: "story", versoes: ["story", "feed", "a5", "c1015"], nomeCampo: "titulo", dup: "Duplicar",
    campos: [
      { k: "layout", l: "Tipo", t: "seg", ops: [["completo", "Completo / WhatsApp"], ["capa", "Capa (externo)"], ["interno", "Miolo (interno)"]] },
      { t: "grupo", l: "Textos" },
      { k: "logoEvento", l: "Logo do evento (opcional)", t: "img", contain: true, se: igual("layout", ["completo", "capa"]) },
      { k: "script", l: "Palavra manuscrita", ph: "Convite" }, { k: "titulo", l: "Título", ph: "ESPECIAL" },
      { k: "texto", l: "Texto", t: "area", se: igual("layout", ["completo", "interno"]) },
      { k: "foto1", l: "Foto 1", t: "img", se: igual("layout", "interno") }, { k: "foto2", l: "Foto 2 (opcional)", t: "img", se: igual("layout", "interno") },
      { t: "grupo", l: "Data e local", se: igual("layout", ["completo", "interno"]) },
      { k: "data", l: "Data (dd/mm)", ph: "10/07", se: igual("layout", ["completo", "interno"]) }, { k: "hora", l: "Hora", ph: "20H", se: igual("layout", ["completo", "interno"]) },
      { k: "local", l: "Local", se: igual("layout", ["completo", "interno"]) },
      { k: "dataEstilo", l: "Como mostrar a data", t: "seg", ops: [["calendario", "Calendário"], ["caixa", "Caixa"], ["linha", "Linha"]], se: igual("layout", ["completo", "interno"]) },
      { k: "contagem", l: "Mostrar contagem regressiva", t: "tog", se: igual("layout", ["completo", "interno"]) },
      { k: "fecho", l: "Frase final", t: "area", se: igual("layout", "completo"), dica: "**negrito** e *destaque*." },
      { t: "grupo", l: "Visual e logos" }, fundoCampo, fotoFundo,
      { k: "moldura", l: "Moldura de linhas finas", t: "tog" },
      { k: "parc1", l: "Logo do parceiro (opcional)", t: "img", contain: true, biblio: "parceiros", vazio: "Nenhum" }, { k: "loja", l: "Logo da loja", t: "tog" }].concat(X.whatsCampos),
    dados: { layout: "completo", logoEvento: "", script: "Convite", titulo: "ESPECIAL", texto: "Uma noite especial para celebrar e descobrir que vem mais novidades por aí.", foto1: "../golden/img/amb-2.jpg", foto2: "../golden/img/amb-1.jpg",
      data: "10/07", hora: "A PARTIR DAS 20H", local: "BARÔ BISTRO | RUA DA PAZ, 201", dataEstilo: "calendario", fecho: "Campanha **Alvorada Conectar 2026**\nconcluída com sucesso.\n***Aliás, com o seu sucesso.***", fundo: "noite", fundoFoto: "", moldura: true, parc1: "", loja: true } },
  livre: { nome: "Livre", desc: "Página com fundo e logo da marca, para montar no Ajuste fino.", fmt: "story", campos: [{ t: "grupo", l: "Visual" }, fundoCampo, fotoFundo], dados: { fundo: "azul" } }
};

function dataParts(s) { var m = String(s || "").match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})/); if (!m) return null; return { d: +m[1], m: +m[2] - 1 }; }
function chipsAlt(linhas, tam, w, gap, fonte) { // quantas linhas os botõezinhos ocupam
  var rows = 1, x = 0; linhas.forEach(function (l) { var cw = medeTexto(l, { fonte: fonte, peso: 700, tam: tam, caixa: true }).larg + tam * 1.5; if (x && x + cw > w) { rows++; x = 0; } x += cw + gap; });
  return rows * tam * 1.62 + (rows - 1) * gap * .8;
}

function gerarCards(modelo, dm, p) {
  var tema = (p && p.tema) || "am", d = (p && p.dados) || MODELOS[modelo].dados, W = dm.w, H = dm.h, u = W / 1000, r = H / W, L = [], TT = X.TEMAS[tema], gold = tema === "golden";
  var fs = X.FUNDOS[tema].map(function (f) { return f[0]; }), f = fs.indexOf(d.fundo) >= 0 ? d.fundo : (modelo === "convite" && !gold ? "noite" : fs[0]), es = X.esquema(tema, f), FT = fonteKit("txt", TT.fonte), FTit = fonteKit("tit", gold ? "Poppins" : TT.fonte), FS = fonteKit("scr", TT.script);
  var bg = X.fundo(tema, f, W, H, d, L), pad = 60 * u;
  if (modelo === "livre") { L.push(I("Logo", W * .25, H * .85, W * .5, W * .14, { src: es.logo, fit: "contain" })); return { layers: L, bg: bg }; }
  var titOpts = function (n) { return gold ? (n === 1 ? { fonte: FTit, peso: 300, ls: .3, caixa: true } : { fonte: FS, peso: 400 }) : { fonte: FTit, peso: 900, caixa: true }; };
  var faltamTxt = d.contagem ? X.faltamTxt(X.faltam(d.data)) : "";
  var pilula = function (col, gap) { // contagem regressiva
    if (!faltamTxt) return; var th = 40 * u, tw = medeTexto(faltamTxt, { fonte: FT, peso: 900, tam: th, caixa: true, ls: .04 }).larg + th * 1.8;
    col.add(th * 1.75, function (y, sc, x, w) { L.push(G("Contagem regressiva", x + (w - tw * sc) / 2, y, tw * sc, th * 1.75 * sc, { txt: faltamTxt, estilo: "cheio", fundo: es.box, cor: es.boxT, fonte: FT, peso: 900, tam: th * sc, ls: .04, raio: th * sc, caixa: true, sombra: 1 })); }, gap || 0);
  };
  var qr = function (col, gap) { // QR do WhatsApp
    if (!X.waLink(d.whats)) return; var qw = (r > 1.5 ? 190 : 150) * u, qh = qw * 1.12 + (d.whatsTxt ? qw * .13 * 2.3 + qw * .12 : 0);
    col.add(qh, function (y, sc, x, w) { var q = qw * sc; X.qrBloco(L, d, x + (w - q) / 2, y + q * .06, q, es, FT); }, gap || 0);
  };
  var ajusta = function (t, o, maxW) { var w = medeTexto(t, o).larg; if (w > maxW) o.tam *= maxW / w; return o; };

  if (modelo === "evento") {
    if (!gold && d.faixas) X.faixas(W, H, L, true, true);
    if (d.decor) { L.push(F("Quadradinho", 50 * u, 105 * u, 26 * u, 26 * u, { fill: { t: "nenhum" }, blarg: Math.max(2, 3 * u), bcor: es.tx, raio: 5 * u })); L.push(F("Quadrado", 94 * u, 145 * u, 62 * u, 62 * u, { fill: { t: "cor", c: es.box, a: 1 }, raio: 6 * u })); }
    var logH = 110 * u, footY = H - (d.faixas && !gold ? 120 : 80) * u - logH;
    X.rodape(W, footY, logH, d, es, L, tema);
    var col = new X.Coluna(pad, (r > 1.5 ? 200 : 140) * u, W - 2 * pad, footY - (r > 1.5 ? 230 : 160) * u, "meio"), cw = W - 2 * pad;
    pilula(col, 0);
    if (d.titulo1) { var o1 = ajusta(d.titulo1, Object.assign({ tam: gold ? 70 * u : 118 * u }, titOpts(1)), cw); col.add(o1.tam * 1.02, function (y, sc, x, w) { L.push(X.txt("Título 1", x, y, w, o1.tam * 1.05 * sc, Object.assign({ txt: "{titulo1}", cor: es.tx, lh: 1 }, o1, { tam: o1.tam * sc }))); }); }
    if (d.titulo2) { var o2 = ajusta(d.titulo2, Object.assign({ tam: gold ? 170 * u : 205 * u, ls: gold ? 0 : -.01 }, titOpts(2)), cw); col.add(o2.tam * (gold ? .9 : .95), function (y, sc, x, w) { L.push(X.txt("Título 2", x, y - (gold ? o2.tam * .2 * sc : 0), w, o2.tam * 1.08 * sc, Object.assign({ txt: "{titulo2}", cor: es.dest, lh: 1 }, o2, { tam: o2.tam * sc }))); }, 4 * u); }
    if (d.texto) { var ot = { fonte: FT, peso: gold ? 300 : 400, tam: 41 * u, lh: 1.22, w: cw * .92 }, ht = X.alt(d.texto, ot); col.add(ht, function (y, sc, x, w) { L.push(X.txt("Texto", x + w * .04, y, w * .92, ht * sc + 4, { txt: "{texto}", fonte: FT, peso: ot.peso, tam: ot.tam * sc, lh: 1.22, cor: es.tx, dest: es.tx })); }, 50 * u); }
    if (d.seta) col.add(80 * u, function (y, sc, x, w) { L.push(Ic("Setinha", x + w / 2 - 40 * u * sc, y, 80 * u * sc, 80 * u * sc, { icone: "setabaixo", cor: es.dest, traco: 2.6 })); }, 34 * u);
    if (d.listaTit) { var ol = ajusta(d.listaTit, { fonte: FT, peso: gold ? 500 : 900, tam: 46 * u, caixa: true, ls: gold ? .12 : 0 }, cw); col.add(ol.tam * 1.15, function (y, sc, x, w) { L.push(X.txt("Título da lista", x, y, w, ol.tam * 1.2 * sc, { txt: "{listaTit}", fonte: FT, peso: ol.peso, tam: ol.tam * sc, cor: es.tx, caixa: true, ls: ol.ls })); }, 34 * u); }
    var itens = String(d.lista || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    if (itens.length) { var chT = 37 * u, chH = chipsAlt(itens, chT, cw, 14 * u, FT); col.add(chH, function (y, sc, x, w) { L.push(Ch("Lista", x, y, w, chH * sc + 4, { txt: "{lista}", fonte: FT, tam: chT * sc, cor: gold ? es.chipF : es.chipT, fundo: es.chipF, gap: 14 * u * sc, estilo: gold ? "contorno" : "cheio", caixa: true })); }, 22 * u); }
    dataBloco(col, d, es, FT, u, W, L, gold, 80 * u);
    botaoBloco(col, d, es, FT, u, L, 64 * u);
    col.montar();
    return { layers: L, bg: bg };
  }

  if (modelo === "acao") {
    var onda = f === "azul-onda", corT1 = onda ? "@navy2" : es.dest, corT2 = onda ? "@navy" : es.tx;
    var perL = [], per = X.persona(perL, d, tema, -14 * u, Math.min(H * .34, 640 * u), Math.min(H * .34, 640 * u) * .56, H + 10 * u), masc = !!per, mw = per ? per.x + per.w : 0;
    if (per && X.personaSrc(d, tema) === X.PERSONA0) { perL = []; per = X.persona(perL, d, tema, 0, Math.min(H * .3, W * .55), W * .3, H); mw = per.x + per.w; }
    var lgH = 120 * u, lgY = H - 90 * u - lgH, lgX = masc ? mw * .82 : pad, lgW = W - lgX - pad;
    if (d.parc1) { L.push(I("Logo", lgX, lgY, lgW * .55, lgH, { src: es.logo, fit: "contain" })); L.push(I("Logo do parceiro 1", lgX + lgW * .6, lgY, lgW * .4, lgH, { src: "{parc1}", fit: "contain" })); }
    else L.push(I("Logo", lgX, lgY, lgW, lgH, { src: es.logo, fit: "contain" }));
    var c2 = new X.Coluna(pad, 70 * u, W - 2 * pad, lgY - 100 * u, "topo"), cw2 = W - 2 * pad, ita = !!d.italico;
    if (d.tituloModo === "arte" && d.tituloArte) { var ah = Math.min(H * .4, W * .78); c2.add(ah, function (y, sc, x, w) { L.push(I("Arte do título", x, y, w, ah * sc, { src: "{tituloArte}", fit: "contain" })); }); }
    else {
      var ondaH = Math.round(Math.min(H * .42, W * .95)), tc = c2;
      if (onda) { tc = new X.Coluna(pad + cw2 * .08, 40 * u, cw2 * .84, ondaH * .56 - 40 * u, "meio"); var c2y = ondaH * .92; c2.hMax -= c2y - c2.y; c2.y = c2y; }
      if (d.titulo1) { var a1 = ajusta(d.titulo1, Object.assign({ tam: gold ? 70 * u : 100 * u, ls: .08 }, titOpts(1)), cw2); tc.add(a1.tam * 1.05, function (y, sc, x, w) { L.push(X.txt("Título 1", x, y, w, a1.tam * 1.1 * sc, Object.assign({ txt: "{titulo1}", cor: corT1, lh: 1 }, a1, { tam: a1.tam * sc }))); }, 30 * u); }
      if (d.titulo2) { var a2 = { fonte: gold ? FS : FTit, peso: gold ? 400 : 900, tam: (gold ? 180 : 190) * u, caixa: !gold, lh: .95, w: cw2 }, h2 = X.alt(d.titulo2, a2); tc.add(h2, function (y, sc, x, w) { L.push(X.txt("Título 2", x, y, w, h2 * sc + 4, { txt: "{titulo2}", fonte: a2.fonte, peso: a2.peso, tam: a2.tam * sc, caixa: !gold, lh: .95, cor: corT2, sombra: gold || onda ? 0 : 2 })); }); }
      if (tc !== c2) tc.montar();
    }
    pilula(c2, 40 * u);
    var fo = { fonte: FT, peso: gold ? 600 : 900, tam: 92 * u, caixa: true, ita: ita, lh: 1.05 };
    if (d.frase1) { var f1 = ajusta(d.frase1, Object.assign({}, fo), cw2); c2.add(f1.tam * 1.08, function (y, sc, x, w) { L.push(X.txt("Frase 1", x, y, w, f1.tam * 1.1 * sc, Object.assign({ txt: "{frase1}", cor: es.tx }, f1, { tam: f1.tam * sc }))); }, 60 * u); }
    if (d.destaque) {
      if (d.destEstilo === "botao") { var dt = ajusta(d.destaque, Object.assign({}, fo, { tam: 84 * u }), cw2 * .8), bw = medeTexto(d.destaque, dt).larg + dt.tam * 1.3, bh = dt.tam * 1.32; c2.add(bh, function (y, sc, x, w) { L.push(G("Destaque", x + (w - bw * sc) / 2, y, bw * sc, bh * sc, { txt: "{destaque}", estilo: "pilula3d", fundo: es.box, fundo2: "@ouro3", cor: es.boxT, fonte: FT, peso: 900, ita: ita, tam: dt.tam * sc, raio: 22 * u * sc, sombra: 1 })); }, 14 * u); }
      else { var dc = ajusta(d.destaque, Object.assign({}, fo), cw2); c2.add(dc.tam * 1.08, function (y, sc, x, w) { L.push(X.txt("Destaque", x, y, w, dc.tam * 1.1 * sc, Object.assign({ txt: "{destaque}", cor: es.dest }, dc, { tam: dc.tam * sc }))); }, 6 * u); }
    }
    if (d.frase2) { var f2 = ajusta(d.frase2, Object.assign({}, fo), cw2); c2.add(f2.tam * 1.08, function (y, sc, x, w) { L.push(X.txt("Frase 2", x, y, w, f2.tam * 1.1 * sc, Object.assign({ txt: "{frase2}", cor: es.tx }, f2, { tam: f2.tam * sc }))); }, 14 * u); }
    if (d.mensagem) {
      var bx = masc ? W * .3 : W * .14, bww = W - bx - (masc ? pad * .7 : W * .14), mo = { fonte: FT, peso: d.caixa === "azul" ? 900 : 700, ita: d.caixa === "azul" && ita, tam: 52 * u, lh: 1.08, w: bww - 80 * u }, mhh = X.alt(d.mensagem, mo) + 70 * u;
      c2.add(mhh, function (y, sc, x, w) {
        if (d.caixa === "azul") L.push(F("Caixa da mensagem", bx, y, bww, mhh * sc, { fill: { t: "grad", c1: "@navy2", a1: 1, c2: "#1f6fe8", a2: 1, ang: 100 }, raio: 26 * u, sombra: 2 }));
        if (d.caixa === "tracejada") L.push(G("Caixa da mensagem", bx, y, bww, mhh * sc, { txt: "", estilo: "tracejado", fundo: es.tx, blarg: Math.max(1.5, 2.2 * u), raio: 0 }));
        L.push(X.txt("Mensagem", bx + 40 * u, y + 35 * u * sc, bww - 80 * u, (mhh - 70 * u) * sc + 4, { txt: "{mensagem}", fonte: FT, peso: mo.peso, ita: mo.ita, tam: mo.tam * sc, lh: 1.08, cor: "@branco" === es.tx || d.caixa === "azul" ? "@branco" : es.tx }));
      }, 50 * u);
    }
    if (d.data || d.hora) {
      c2.add(250 * u, function (y, sc, x, w) {
        var cx = masc ? W * .28 + (W * .72 - pad) / 2 : W / 2;
        L.push(Ic("Ícone do calendário", cx - 45 * u * sc, y, 90 * u * sc, 90 * u * sc, { icone: "calendario", cor: es.tx }));
        if (d.data) L.push(X.txt("Data", cx - 400 * u, y + 105 * u * sc, 800 * u, 80 * u * sc, { txt: "{data}", fonte: FT, peso: gold ? 600 : 900, tam: 70 * u * sc, cor: es.tx, caixa: true }));
        if (d.hora) L.push(X.txt("Hora", cx - 400 * u, y + 185 * u * sc, 800 * u, 50 * u * sc, { txt: "{hora}", fonte: FT, peso: 500, tam: 38 * u * sc, cor: es.tx }));
      }, 40 * u);
    }
    c2.montar();
    L = L.concat(perL);
    return { layers: L, bg: bg };
  }

  // ---------- convite ----------
  var lay = d.layout || "completo";
  if (d.moldura) { L.push(F("Moldura de fora", 36 * u, 36 * u, W - 72 * u, H - 72 * u, { fill: { t: "nenhum" }, blarg: Math.max(1, 1.6 * u), bcor: es.escuro ? "@branco" : "@ouro", op: es.escuro ? .35 : .6, lock: true })); L.push(F("Moldura de dentro", 62 * u, 62 * u, W - 124 * u, H - 124 * u, { fill: { t: "nenhum" }, blarg: Math.max(1, 1.4 * u), bcor: es.escuro ? "@branco" : "@ouro", op: es.escuro ? .22 : .45, lock: true })); }
  var scriptCor = gold ? "@ouro" : (es.escuro ? "#8fa3ff" : "@navy2");
  if (lay === "capa") {
    var cc = new X.Coluna(pad * 1.5, H * .12, W - 3 * pad, H * .62, "meio");
    if (d.logoEvento) cc.add(170 * u, function (y, sc, x, w) { L.push(I("Logo do evento", x, y, w, 170 * u * sc, { src: "{logoEvento}", fit: "contain" })); }, 0);
    if (d.titulo) { var ct = ajusta(d.titulo, { fonte: FT, peso: 300, tam: 150 * u, ls: .2, caixa: true }, W - 3 * pad); cc.add(ct.tam * 1.05, function (y, sc, x, w) { L.push(X.txt("Título", x, y, w, ct.tam * 1.1 * sc, Object.assign({ txt: "{titulo}", cor: es.tx, lh: 1 }, ct, { tam: ct.tam * sc }))); }, 40 * u); }
    if (d.script) { var cs = ajusta(d.script, { fonte: FS, peso: 400, tam: 170 * u }, W - 3 * pad); cc.add(cs.tam * .7, function (y, sc, x, w) { L.push(X.txt("Palavra manuscrita", x + w * .08, y - cs.tam * .32 * sc, w, cs.tam * 1.1 * sc, { txt: "{script}", fonte: FS, tam: cs.tam * sc, cor: scriptCor, lh: 1 })); }); }
    cc.montar();
    rodapeConvite(W, H, u, d, es, L, H - 220 * u, 120 * u);
    return { layers: L, bg: bg };
  }
  if (lay === "interno") {
    var fy = 120 * u, fh2 = H * .4;
    if (d.foto2) { L.push(F("Moldura foto 1", pad + 26 * u, fy - 26 * u, W * .56, fh2, { fill: { t: "nenhum" }, blarg: Math.max(1, 2 * u), bcor: "@ouro", op: .7 })); L.push(I("Foto 1", pad, fy, W * .56, fh2, { src: "{foto1}", sombra: 1 })); L.push(F("Moldura foto 2", W * .7 + 20 * u, fy + 30 * u, W * .26, fh2 * .92, { fill: { t: "nenhum" }, blarg: Math.max(1, 2 * u), bcor: "@ouro", op: .7 })); L.push(I("Foto 2", W * .68, fy + 60 * u, W * .26, fh2 * .92, { src: "{foto2}", sombra: 1 })); }
    else if (d.foto1) { L.push(F("Moldura foto 1", pad + 26 * u, fy - 26 * u, W - 2 * pad, fh2, { fill: { t: "nenhum" }, blarg: Math.max(1, 2 * u), bcor: "@ouro", op: .7 })); L.push(I("Foto 1", pad, fy, W - 2 * pad, fh2, { src: "{foto1}", sombra: 1 })); }
    var ci = new X.Coluna(pad * 1.4, fy + fh2 + 80 * u, W - 2.8 * pad, H - (fy + fh2 + 80 * u) - 260 * u, "meio");
    pilula(ci, 0);
    if (d.texto) { var oti = { fonte: FT, peso: gold ? 300 : 400, tam: 36 * u, lh: 1.35, w: W - 2.8 * pad }, hti = X.alt(d.texto, oti); ci.add(hti, function (y, sc, x, w) { L.push(X.txt("Texto", x, y, w, hti * sc + 4, { txt: "{texto}", fonte: oti.fonte, peso: oti.peso, tam: oti.tam * sc, lh: 1.35, cor: es.sub, dest: es.forte })); }); }
    dataBloco(ci, d, es, FT, u, W, L, gold, 50 * u, true);
    if (d.local) { var olc = { fonte: FT, peso: 400, tam: 24 * u, w: W - 2.8 * pad }, hl = X.alt(d.local, olc); ci.add(hl, function (y, sc, x, w) { L.push(X.txt("Local", x, y, w, hl * sc + 4, { txt: "{local}", fonte: olc.fonte, tam: olc.tam * sc, cor: es.sub })); }, 26 * u); }
    ci.montar();
    rodapeConvite(W, H, u, d, es, L, H - 200 * u, 95 * u);
    return { layers: L, bg: bg };
  }
  // completo (WhatsApp / story)
  var lgH2 = 130 * u, lgY2 = H - 150 * u - lgH2;
  rodapeConvite(W, H, u, d, es, L, lgY2, lgH2);
  var cp = new X.Coluna(pad * 1.6, 120 * u, W - 3.2 * pad, lgY2 - 170 * u, "meio"), cwp = W - 3.2 * pad;
  if (d.logoEvento) cp.add(220 * u, function (y, sc, x, w) { L.push(I("Logo do evento", x, y, w, 220 * u * sc, { src: "{logoEvento}", fit: "contain" })); }, 0);
  pilula(cp, 0);
  if (d.script) { var ps = ajusta(d.script, { fonte: FS, tam: 230 * u }, cwp); cp.add(ps.tam * .72, function (y, sc, x, w) { L.push(X.txt("Palavra manuscrita", x, y, w, ps.tam * 1.1 * sc, { txt: "{script}", fonte: FS, tam: ps.tam * sc, cor: scriptCor, lh: 1 })); }, 50 * u); }
  if (d.titulo) { var pt = ajusta(d.titulo, { fonte: FT, peso: gold ? 200 : 300, tam: 150 * u, ls: .12, caixa: true }, cwp); cp.add(pt.tam * 1.02, function (y, sc, x, w) { L.push(X.txt("Título", x, y, w, pt.tam * 1.08 * sc, Object.assign({ txt: "{titulo}", cor: es.tx, lh: 1 }, pt, { tam: pt.tam * sc }))); }); }
  if (d.texto) { var po = { fonte: FT, peso: 300, tam: 33 * u, lh: 1.3, w: cwp * .9 }, ph = X.alt(d.texto, po); cp.add(ph, function (y, sc, x, w) { L.push(X.txt("Texto", x + w * .05, y, w * .9, ph * sc + 4, { txt: "{texto}", fonte: po.fonte, peso: 300, tam: po.tam * sc, lh: 1.3, cor: es.tx })); }, 30 * u); }
  dataBloco(cp, d, es, FT, u, W, L, gold, 70 * u, true);
  if (d.local) { var pl = ajusta(d.local, { fonte: FT, peso: 400, tam: 32 * u, ls: .08, caixa: true }, cwp); cp.add(pl.tam * 1.2, function (y, sc, x, w) { L.push(X.txt("Local", x, y, w, pl.tam * 1.3 * sc, Object.assign({ txt: "{local}", cor: es.tx }, pl, { tam: pl.tam * sc }))); }, 50 * u); }
  if (d.fecho) {
    cp.add(4 * u, function (y, sc, x, w) { L.push(F("Linha", x + w * .05, y, w * .9, Math.max(2, 3 * u), { fill: { t: "grad", c1: es.escuro ? "@branco" : "@ouro", a1: 0, c2: es.escuro ? "@branco" : "@ouro", a2: .9, ang: 90, esp: true } })); }, 40 * u);
    var pf = { fonte: FT, peso: 400, tam: 46 * u, lh: 1.18, w: cwp }, hf = X.alt(d.fecho, pf); cp.add(hf, function (y, sc, x, w) { L.push(X.txt("Frase final", x, y, w, hf * sc + 4, { txt: "{fecho}", fonte: pf.fonte, tam: pf.tam * sc, lh: 1.18, cor: es.tx, dest: es.tx, ita: false })); }, 46 * u);
  }
  qr(cp, 50 * u);
  cp.montar();
  return { layers: L, bg: bg };
}

// data: caixa amarela com ícones, linha simples ou calendário de 3 dias
function dataBloco(col, d, es, FT, u, W, L, gold, gap, convite) {
  if (!d.data && !d.hora) return;
  var est = d.dataEstilo || "caixa", dp = dataParts(d.data);
  if (est === "calendario" && dp) {
    var tw = 170 * u, th = 170 * u, lado = 150 * u, hh = th + (d.hora ? 100 * u : 0);
    col.add(hh, function (y, sc, x, w) {
      var cx = x + w / 2, mes = MESES[dp.m] || "";
      [[-1, dp.d - 5], [1, dp.d + 7]].forEach(function (s) { var dd = Math.min(31, Math.max(1, s[1])), xx = cx + s[0] * (tw / 2 + lado / 2) * sc - lado / 2 * sc;
        L.push(F("Dia apagado", xx, y + 14 * u * sc, lado * sc, (th - 14 * u) * sc, { fill: { t: "nenhum" }, blarg: Math.max(1, 1.5 * u), bcor: es.tx, op: .18 }));
        L.push(X.txt("Mês apagado", xx, y + 18 * u * sc, lado * sc, 30 * u * sc, { txt: mes, fonte: FT, peso: 400, tam: 22 * u * sc, cor: es.tx, op: .2, ls: .06 }));
        L.push(X.txt("Dia apagado (número)", xx, y + 50 * u * sc, lado * sc, 110 * u * sc, { txt: String(dd), fonte: FT, peso: 400, tam: 100 * u * sc, cor: es.tx, op: .18, lh: 1 })); });
      L.push(F("Dia", cx - tw / 2 * sc, y, tw * sc, th * sc, { fill: { t: "cor", c: es.escuro ? "@navy" : "@branco", a: es.escuro ? .55 : 1 }, blarg: Math.max(1.5, 2 * u), bcor: es.escuro ? "@branco" : "@ouro" }));
      L.push(F("Linha do mês", cx - tw / 2 * sc, y + 42 * u * sc, tw * sc, Math.max(1, 1.5 * u), { fill: { t: "cor", c: es.escuro ? "@branco" : "@ouro", a: 1 } }));
      L.push(X.txt("Mês", cx - tw / 2 * sc, y + 6 * u * sc, tw * sc, 34 * u * sc, { txt: mes, fonte: FT, peso: 500, tam: 24 * u * sc, cor: es.tx, ls: .06 }));
      L.push(X.txt("Dia (número)", cx - tw / 2 * sc, y + 48 * u * sc, tw * sc, 118 * u * sc, { txt: String(dp.d).padStart(2, "0"), fonte: FT, peso: 500, tam: 110 * u * sc, cor: es.tx, lh: 1 }));
      if (d.hora) { var hw = 470 * u; L.push(G("Hora", cx - hw / 2 * sc, y + (th + 24 * u) * sc, hw * sc, 64 * u * sc, { txt: "{hora}", estilo: "contorno", fundo: es.tx, cor: es.tx, fonte: FT, peso: 400, tam: 36 * u * sc, ls: .08, blarg: Math.max(1, 1.5 * u), raio: 0, caixa: true })); }
    }, gap);
    return;
  }
  if (est === "linha" || convite) {
    var lh2 = 70 * u;
    col.add(lh2, function (y, sc, x, w) {
      var t = [d.data, d.hora].filter(Boolean).join("  |  "), o = { fonte: FT, peso: gold ? 400 : 700, tam: 40 * u * sc, ls: .04, caixa: true }, tw2 = medeTexto(t, o).larg + 120 * u * sc, x0 = x + (w - tw2) / 2;
      if (est === "linha") { L.push(Ic("Ícone do calendário", x0, y + 8 * u * sc, 48 * u * sc, 48 * u * sc, { icone: "calendario", cor: es.dest })); L.push(X.txt("Data e hora", x0 + 66 * u * sc, y, tw2, lh2 * sc, Object.assign({ txt: t, cor: es.tx, al: "left" }, o))); }
      else L.push(G("Data e hora", x + (w - (tw2 - 40 * u * sc)) / 2, y, tw2 - 40 * u * sc, lh2 * sc, { txt: t, estilo: "contorno", fundo: es.forte, cor: es.forte, fonte: FT, peso: 400, tam: o.tam, ls: .06, blarg: Math.max(1, 1.5 * u), raio: 0, caixa: true }));
    }, gap);
    if (est === "linha" && d.local && !convite) col.add(50 * u, function (y, sc, x, w) { L.push(X.txt("Local", x, y, w, 50 * u * sc, { txt: "Local: {local}", fonte: FT, peso: 400, tam: 34 * u * sc, cor: es.tx })); }, 12 * u);
    return;
  }
  // caixa
  var bw2 = Math.min(W * .72, 760 * u), bh2 = (d.local ? 200 : 140) * u;
  col.add(bh2, function (y, sc, x, w) {
    var bx2 = x + (w - bw2 * sc) / 2, s = sc;
    L.push(F("Caixa da data", bx2, y, bw2 * s, bh2 * s, { fill: { t: "cor", c: es.box, a: 1 }, sombra: 2, raio: gold ? 0 : 2 * u }));
    var linha = (d.data ? 1 : 0) + (d.hora ? 1 : 0), ic = 96 * u * s, fsz = 92 * u * s, ox = bx2 + 50 * u * s, oy = y + 26 * u * s;
    var wD = d.data ? medeTexto(d.data, { fonte: FT, peso: 900, tam: fsz }).larg : 0, wH = d.hora ? medeTexto(d.hora, { fonte: FT, peso: 900, tam: fsz }).larg : 0;
    var tot = (d.data ? ic + 14 * u * s + wD : 0) + (d.hora ? ic + 14 * u * s + wH : 0) + (linha > 1 ? 50 * u * s : 0), k = Math.min(1, (bw2 * s - 80 * u * s) / tot);
    ic *= k; fsz *= k; wD *= k; wH *= k; ox = bx2 + (bw2 * s - tot * k) / 2;
    if (d.data) { L.push(Ic("Ícone do calendário", ox, oy + (100 * u * s - ic) / 2, ic, ic, { icone: "calendario", cor: es.boxT, traco: 2.2 })); ox += ic + 14 * u * s * k; L.push(T("Data", ox, oy, wD + 10, 100 * u * s, { txt: "{data}", fonte: FT, peso: 900, tam: fsz, cor: es.boxT, al: "left", fit: false })); ox += wD + 50 * u * s * k; }
    if (d.hora) { L.push(Ic("Ícone do relógio", ox, oy + (100 * u * s - ic) / 2, ic, ic, { icone: "relogio", cor: es.boxT, traco: 2.2 })); ox += ic + 14 * u * s * k; L.push(T("Hora", ox, oy, wH + 10, 100 * u * s, { txt: "{hora}", fonte: FT, peso: 900, tam: fsz, cor: es.boxT, al: "left", fit: false })); }
    if (d.local) L.push(X.txt("Local", bx2 + 20 * u * s, y + 128 * u * s, bw2 * s - 40 * u * s, 56 * u * s, { txt: "Local: {local}", fonte: FT, peso: 500, tam: 38 * u * s, cor: es.boxT }));
  }, gap);
}
// botão/chamada; com WhatsApp preenchido, o QR fica ao lado do botão (não empurra o resto)
function botaoBloco(col, d, es, FT, u, L, gap) {
  var est = d.botao || "texto", o = { fonte: FT, peso: est === "texto" ? 500 : 800, tam: 44 * u }, tw = medeTexto(d.cta || "", o).larg, bh = 44 * u * (est === "texto" ? 1.4 : 2);
  var temQR = !!X.waLink(d.whats), qw = 150 * u, qrH = qw * 1.12 + (d.whatsTxt ? qw * .43 : 0), hh = temQR ? Math.max(bh, qrH) : bh;
  if (!d.cta && !temQR) return;
  col.add(hh, function (y, sc, x, w) {
    var area = temQR ? w - qw * sc - 50 * u * sc : w, ax = x;
    if (d.cta) { var o2 = Object.assign({}, o, { tam: o.tam * sc, w: area }); var multi = temQR && tw * sc > area - 40 * u * sc, bhh = multi ? X.alt(d.cta, Object.assign({}, o2, { w: area - 60 * u * sc, lh: 1.1 })) + 40 * u * sc : bh * sc, bw = Math.min(area, tw * sc + (est === "texto" ? 20 : 120) * u * sc);
      L.push(X.botao("Botão", ax + (area - bw) / 2, y + (hh * sc - bhh) / 2, bw, bhh, "{cta}", est, es, { fonte: FT, peso: o.peso, tam: o.tam * sc, sombra: est === "cheio" || est === "pilula3d" ? 1 : 0 })); }
    if (temQR) X.qrBloco(L, d, x + w - qw * sc - (d.cta ? 0 : (w - qw * sc) / 2), y + qw * sc * .06, qw * sc, es, FT);
  }, gap);
}
function rodapeConvite(W, H, u, d, es, L, y, h) {
  var itens = []; if (d.loja !== false) itens.push(["Logo", es.logo, 3.5]); if (d.parc1) itens.push(["Logo do parceiro 1", "{parc1}", 2.6]);
  if (!itens.length) return;
  var gap = 60 * u, larg = itens.map(function (i) { return h * i[2]; }), tot = larg.reduce(function (a, b) { return a + b; }, 0) + gap * (itens.length - 1), k = Math.min(1, (W - 160 * u) / tot), x = (W - tot * k) / 2;
  itens.forEach(function (it, n) { L.push(I(it[0], x, y + h * (1 - k) / 2, larg[n] * k, h * k, { src: it[1], fit: "contain" })); x += (larg[n] + gap) * k; });
  if (itens.length > 1) L.push(F("Divisor dos logos", (W - tot * k) / 2 + larg[0] * k + gap * k / 2 - 1, y + h * .2, Math.max(1, 1.5 * u), h * .6 * k, { fill: { t: "cor", c: es.tx, a: .35 } }));
}

window.KIT = {
  id: "cards", nome: "Cards", idb: "cards-fluxo", pasta: "cards", area: "cards",
  marca: X.TEMAS.am.marca, marcaNomes: X.NOMES, temas: X.TEMAS, temaPadrao: "am",
  fontes: ["Gotham", "Poppins", "Montserrat", "Ms Madi", "Allura", "Great Vibes", "Bebas Neue"], scriptPadrao: "Ms Madi",
  imgs: [[X.A + "logo-am.png", "Logo Alvorada", 1], [X.A + "logo-am-branco.png", "Logo Alvorada (fundo escuro)", 1], [X.G + "logo-branco.png", "Logo Golden (fundo escuro)", 1], [X.G + "logo-azul.png", "Logo Golden", 1],
    [M + "clube.png", "Clube dos Profissionais", 1], [M + "amanco.png", "Amanco (exemplo)", 1], [M + "wavin.png", "Wavin (exemplo)", 1], [M + "eliane.png", "Eliane (exemplo)", 1],
    [M + "persona-alvorinho.png", "Alvorinho", 1], [M + "mascote-coracao.png", "Alvorinho coração", 1], [M + "deca.svg", "Deca", 1], [M + "titulo-arte-exemplo.png", "Arte de título (exemplo)", 1], [M + "am-azul.jpg", "Fundo azul"], [M + "am-noite.jpg", "Fundo azul noite"], [M + "golden-noite.jpg", "Fundo Golden"]],
  modelos: MODELOS, auto: true, simples: true,
  biblio: X.BIBLIO,
  fontesKit: { tit: ["Fonte dos títulos", "Gotham (Golden: Poppins)"], txt: ["Fonte dos textos", "Gotham (Golden: Poppins)"], scr: ["Fonte manuscrita", "Ms Madi"] },
  carregarFontes: ["900 40px Gotham", "700 40px Gotham", "500 40px Gotham", "400 40px Gotham", "300 40px Gotham", "300 40px Poppins", "400 40px Poppins", "600 40px Poppins", "400 40px \"Ms Madi\""],
  tok: { claro: "@branco", escuro: "@navy", dest: "@ouro", gradNome: "Destaque", logoClaro: X.A + "logo-am-branco.png", logoEscuro: X.A + "logo-am.png" },
  acoes: function (p) { return p.modelo === "convite" ? '<div class="xcard" style="margin-top:8px"><b>Convite impresso duplo</b><p>Cria a capa (externo) e o miolo (interno) em A5, com os mesmos textos.</p><button class="btn sm" id="parConvite">Criar capa + miolo</button></div>' : ""; },
  ligar: function (p, el) {
    var b = el.querySelector("#parConvite"); if (!b) return;
    b.onclick = function () { ["capa", "interno"].forEach(function (l, i) { var n = novaPeca("convite", "a5"); n.tema = p.tema; n.dados = clone(p.dados); n.dados.layout = l; if (l === "capa" || l === "interno") n.dados.fundo = l === "capa" ? (p.tema === "golden" ? "noite" : "noite") : (p.tema === "golden" ? "creme" : "branco"); n.nome = "Convite · " + (l === "capa" ? "capa" : "miolo"); regenera(n); P.pecas.splice(P.atual + 1 + i, 0, n); }); P.atual++; refresh(); commit(true); toast("Capa e miolo criados em A5."); };
  },
  inicial: function () { return [["evento", "story"], ["acao", "story"], ["convite", "story"]]; },
  gerar: gerarCards
};
})();
