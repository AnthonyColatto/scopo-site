/* Kit Endomarketing · peças do RH na identidade da Alvorada Materiais de Construção
   (aniversariante, certificado de tempo de casa, cheque, voucher, plaquinhas e assinatura de e-mail).
   Usa o motor em ../estudio/motor.js */
(function () {
var MARCA = { navy: "#233063", navy2: "#4763b8", ouro: "#fcd205", ouro2: "#ffe36b", ouro3: "#e9b800", ciano: "#4ebdef", laranja: "#f0471d", laranja2: "#f89c0e", creme: "#fbfcfc", branco: "#ffffff", grafite: "#6d7396" };
var NOMES = { navy: "Azul escuro", navy2: "Azul", ouro: "Amarelo", ouro2: "Amarelo claro", ouro3: "Amarelo escuro", ciano: "Ciano", laranja: "Laranja", laranja2: "Laranja claro", creme: "Fundo claro", branco: "Branco", grafite: "Cinza" };
var FONTES = ["Gotham", "Poppins", "Montserrat", "Ms Madi", "Allura", "Great Vibes", "Pinyon Script", "Bebas Neue"];
var IMGS = [
  ["img/logo-am.png", "Logo", 1], ["img/logo-am-branco.png", "Logo (fundo escuro)", 1], ["img/mosaico-1.png", "Mosaico 1", 1], ["img/mosaico-2.png", "Mosaico 2", 1],
  ["img/mascote.png", "Mascote", 1], ["img/cubos.jpg", "Fundo de cubos"], ["img/marca-rh.png", "Marca do RH", 1], ["../golden/img/foto-modelo.jpg", "Foto (modelo)"]
];
var UNIDADES = [
  "*Campo Grande*\n**Av. Eduardo Elias Zahran, 1119**\nVila Santa Dorotheia\n(67) 3345-4000",
  "\n**Av. Coronel Antonino, 1171**\nCoronel Antonino\n(67) 3320-2500",
  "\n**Av. Bandeirantes, 3398**\nVila Bandeirante\n(67) 3041-7250",
  "*Dourados*\n**Av. Marcelino Pires, 6245**\nVila São Francisco\n(67) 3033-8888"
];
var TEXTO_CERT = "A Alvorada Materiais de Construção concede este certificado em reconhecimento ao seu notável desempenho e comprometimento com suas atividades, assim como a contribuição com seu departamento ao longo {periodo}. Parabenizamos você por sua dedicação em construir sonhos com a gente.";

var MODELOS = {
  aniver: { nome: "Aniversariante", desc: "Foto, nome e mensagem com o mascote. Story, feed ou A4 para imprimir.", fmt: "story", versoes: ["story", "feed", "a4", "a5"], nomeCampo: "primeiro", dup: "Duplicar para outra pessoa",
    campos: [["foto", "Foto", "img"], ["titulo", "Título (manuscrito)", "area"], ["primeiro", "Primeiro nome"], ["sobrenome", "Sobrenome"], ["mensagem", "Mensagem", "area"]],
    dados: { foto: "../golden/img/foto-modelo.jpg", titulo: "Feliz\naniversário!", primeiro: "Nome", sobrenome: "Sobrenome", mensagem: "Que seu dia seja\nrepleto de sorrisos\ne alegrias. Confie\nnos seus sonhos e construa\num ano cheio de conquistas\ne momentos especiais.\n**Você merece!**" } },
  certificado: { nome: "Certificado", desc: "Tempo de casa ou reconhecimento. A4 deitado, com assinaturas e unidades.", fmt: "a4h", versoes: ["a4h", "a5h"], nomeCampo: "nome", dup: "Duplicar para outra pessoa",
    campos: [["nome", "Nome"], ["tempo", "Tempo de casa (anos)"], ["titulo", "Título (manuscrito)"], ["texto", "Texto · {periodo} vira “dos últimos cinco anos”", "area"], ["assinante1", "Assinatura 1 · nome"], ["cargo1", "Assinatura 1 · cargo"], ["ass1", "Assinatura 1 · imagem (opcional)", "img"], ["assinante2", "Assinatura 2 · nome"], ["cargo2", "Assinatura 2 · cargo"], ["ass2", "Assinatura 2 · imagem (opcional)", "img"]],
    dados: { nome: "Nome do Colaborador", tempo: "5", titulo: "Certificado", texto: TEXTO_CERT, assinante1: "Edson Luiz", cargo1: "Diretor Financeiro", ass1: "", assinante2: "Fabio Angelo", cargo2: "Diretor Comercial", ass2: "", linhaTempo: "05 ANOS DE ALVORADA", periodo: "dos últimos cinco anos" } },
  cheque: { nome: "Cheque", desc: "Cheque-presente com valor e valor por extenso automático. A5 deitado.", fmt: "a5h", versoes: ["a5h", "c1510", "feed"], nomeCampo: "para", dup: "Duplicar",
    campos: [["valor", "Valor (R$)"], ["extenso", "Por extenso (preenche sozinho)"], ["para", "Para (opcional)"], ["titulo", "Título (manuscrito)"], ["cargo", "Quem assina (cargo)"], ["ass", "Assinatura · imagem (opcional)", "img"]],
    dados: { valor: "250,00", extenso: "duzentos e cinquenta reais", para: "", titulo: "Cheque", cargo: "Diretor Financeiro", ass: "" } },
  voucher: { nome: "Voucher", desc: "Prêmio com o mascote: jantar, folga, vale-presente. 10×10 cm ou redes.", fmt: "q10", versoes: ["q10", "q15", "c1510", "feed", "story"], nomeCampo: "premio", dup: "Duplicar",
    campos: [["titulo", "Título (manuscrito)"], ["chamada", "Chamada"], ["premio", "Prêmio", "area"], ["valor", "Valor (deixe vazio para não mostrar)"], ["validade", "Validade / regras (opcional)"], ["para", "Para (opcional)"]],
    dados: { titulo: "Parabéns!", chamada: "VOCÊ GANHOU:", premio: "Um jantar\nem família", valor: "250,00", validade: "", para: "" } },
  plaquinha: { nome: "Plaquinha", desc: "Placa de mesa, de porta ou de setor, com nome e cargo.", fmt: "plaq207", versoes: ["plaq207", "plaq3010", "plaq2015", "a5h"], nomeCampo: "titulo", dup: "Duplicar para outra pessoa",
    campos: [["titulo", "Nome ou setor"], ["sub", "Cargo ou complemento"]],
    dados: { titulo: "Nome Sobrenome", sub: "Recursos Humanos" } },
  assinatura: { nome: "Assinatura de e-mail", desc: "Assinatura para Gmail e Outlook. Copia pronta para colar ou baixa em imagem.", fmt: "email", versoes: ["email"], nomeCampo: "nome", dup: "Duplicar para outra pessoa",
    campos: [["nome", "Nome"], ["cargo", "Cargo"], ["telefone", "Telefone"], ["whats", "WhatsApp (opcional)"], ["email", "E-mail"], ["site", "Site"], ["unidade", "Unidade / endereço"]],
    dados: { nome: "Nome Sobrenome", cargo: "Cargo · Setor", telefone: "(67) 3345-4000", whats: "", email: "nome@alvoradams.com.br", site: "alvoradams.com.br", unidade: "Av. Eduardo Elias Zahran, 1119 · Campo Grande, MS" } },
  livre: { nome: "Livre", desc: "Página em branco na identidade. Comunicados, cartazes do RH, avisos.", fmt: "a4", versoes: ["a4", "story", "feed"], campos: [], dados: {} }
};

var GOT = "Gotham";
function gerarAM(modelo, d) {
  var W = d.w, H = d.h, r = H / W, L = [], bg;
  var bases = { aniver: r >= 1.55 ? [1080, 1920] : [1080, 1350], certificado: [1754, 1240], cheque: [1240, 874], voucher: r > 1.4 ? [1000, 1780] : [1000, 1000], plaquinha: r > .5 ? [1181, 886] : [1181, 413], assinatura: [1200, 400], livre: [1240, 1754] };
  var base = bases[modelo] || [1000, 1000];
  var sx = W / base[0], sy = H / base[1], k = Math.min(sx, sy);
  function S(o) { o.x = Math.round(o.x * sx); o.w = Math.round(o.w * sx); o.y = Math.round(o.y * sy); o.h = Math.round(o.h * sy); ["tam", "ctam", "cin", "clarg", "blarg", "raio"].forEach(function (p) { if (typeof o[p] === "number") o[p] = Math.max(p === "tam" ? 4 : 0, Math.round(o[p] * k * 10) / 10); }); L.push(o); return o; }
  function Tx(nome, x, y, w, h, o) { return T(nome, x, y, w, h, Object.assign({ fonte: GOT, cor: "@navy", dest: "@navy2", fit: true }, o || {})); }
  var M1 = "img/mosaico-1.png", M2 = "img/mosaico-2.png";
  if (modelo === "aniver") {
    bg = { t: "cor", c: "@branco", a: 1 };
    var st = base[1] === 1920;
    S(F("Faixa amarela", 0, st ? 1830 : 1290, 1080, st ? 90 : 60, { fill: { t: "cor", c: "@ouro", a: 1 } }));
    S(I("Mosaico do topo", 800, -40, 300, st ? 640 : 470, { src: M1, fit: "contain", px: 100, py: 0 }));
    S(I("Mosaico da esquerda", -30, st ? 1140 : 790, 170, st ? 440 : 330, { src: M2, fit: "contain", px: 0, py: 50 }));
    S(Tx("Título", 130, st ? 60 : 40, 760, st ? 400 : 290, { txt: "{titulo}", fonte: "Ms Madi", tam: st ? 230 : 170, cor: "@navy2", al: "left", lh: .82 }));
    S(F("Fundo da foto", 640, st ? 480 : 345, 410, st ? 430 : 330, { fill: { t: "cor", c: "@ouro", a: 1 }, raio: 34, rot: -7 }));
    S(I("Foto", 668, st ? 440 : 318, 400, st ? 440 : 330, { src: "{foto}", raio: 34 }));
    S(Tx("Primeiro nome", 150, st ? 560 : 395, 470, st ? 86 : 66, { txt: "{primeiro}", peso: 500, ita: true, tam: st ? 70 : 54, al: "left" }));
    S(Tx("Sobrenome", 150, st ? 640 : 455, 470, st ? 96 : 74, { txt: "{sobrenome}", peso: 900, tam: st ? 78 : 60, al: "left" }));
    S(Tx("Mensagem", 160, st ? 950 : 700, 820, st ? 470 : 340, { txt: "{mensagem}", peso: 300, tam: st ? 48 : 36, lh: 1.6, al: "left", va: "top" }));
    S(I("Mascote", -20, st ? 1350 : 905, 560, st ? 570 : 445, { src: "img/mascote.png", fit: "contain", px: 0, py: 100 }));
    S(I("Logo", 560, st ? 1450 : 1010, 480, st ? 104 : 86, { src: "img/logo-am.png", fit: "contain" }));
    S(Tx("Confia", 555, st ? 1560 : 1100, 190, st ? 96 : 76, { txt: "Confia.", fonte: "Ms Madi", tam: st ? 84 : 66, al: "left" }));
    S(Tx("Slogan", 745, st ? 1570 : 1108, 320, st ? 86 : 68, { txt: "Que o seu sonho\na gente constrói.", peso: 700, tam: st ? 32 : 25, al: "left", lh: 1.15 }));
  } else if (modelo === "certificado") {
    bg = { t: "cor", c: "@creme", a: 1 };
    S(I("Mosaico do topo", 1500, 0, 254, 530, { src: M1, fit: "contain", px: 100, py: 0 }));
    S(I("Mosaico de baixo", 0, 830, 170, 410, { src: M2, fit: "contain", px: 0, py: 100 }));
    S(I("Logo", 570, 58, 615, 132, { src: "img/logo-am.png", fit: "contain" }));
    S(Tx("Título", 260, 200, 1234, 300, { txt: "{titulo}", fonte: "Ms Madi", tam: 300, cor: "@ouro", lh: 1 }));
    S(Tx("Nome", 170, 405, 1414, 118, { txt: "{nome}", peso: 700, tam: 102 }));
    S(Tx("Tempo de casa", 170, 515, 1414, 70, { txt: "{linhaTempo}", peso: 700, tam: 54, cor: "@navy2", caixa: true }));
    S(Tx("Texto", 165, 615, 1424, 200, { txt: "{texto}", peso: 400, tam: 33, lh: 1.38, al: "justify" }));
    [[165, 1], [925, 2]].forEach(function (a) {
      S(I("Assinatura " + a[1] + " (imagem)", a[0] + 170, 840, 320, 100, { src: "{ass" + a[1] + "}", fit: "contain", py: 100 }));
      S(F("Linha da assinatura " + a[1], a[0], 945, 660, 2, { fill: { t: "cor", c: "@navy", a: .55 } }));
      S(Tx("Assinante " + a[1], a[0], 958, 660, 48, { txt: "{assinante" + a[1] + "}", tam: 34 }));
      S(Tx("Cargo " + a[1], a[0], 1004, 660, 46, { txt: "{cargo" + a[1] + "}", tam: 32 }));
    });
    UNIDADES.forEach(function (u, i) { S(Tx("Unidade " + (i + 1), [345, 650, 905, 1185][i], 1080, 270, 110, { txt: u, peso: 400, tam: 16, lh: 1.3, al: "left", va: "top", fit: false })); });
    S(F("Divisor das unidades", 1160, 1085, 2, 100, { fill: { t: "cor", c: "@navy", a: .5 } }));
    S(I("Marca do RH", 1470, 1040, 240, 150, { src: "img/marca-rh.png", fit: "contain" }));
  } else if (modelo === "cheque") {
    bg = { t: "cor", c: "@creme", a: 1 };
    S(I("Mosaico do topo", 1030, -10, 210, 380, { src: M1, fit: "contain", px: 100, py: 0 }));
    S(I("Mosaico de baixo", 0, 540, 150, 334, { src: M2, fit: "contain", px: 0, py: 100 }));
    S(Tx("Título", 280, 20, 680, 230, { txt: "{titulo}", fonte: "Ms Madi", tam: 230, cor: "@ouro", lh: 1 }));
    S(I("Logo", 265, 175, 720, 170, { src: "img/logo-am.png", fit: "contain" }));
    S(Tx("Valor", 220, 430, 800, 115, { txt: "R$ {valor}", peso: 700, tam: 96, cor: "@navy2" }));
    S(Tx("Por extenso", 170, 540, 900, 70, { txt: "({extenso})", peso: 400, tam: 44, cor: "@navy2" }));
    S(Tx("Para", 220, 615, 800, 50, { txt: "{para}", peso: 500, tam: 32 }));
    S(I("Assinatura (imagem)", 470, 640, 300, 80, { src: "{ass}", fit: "contain", py: 100 }));
    S(F("Linha da assinatura", 380, 725, 480, 2, { fill: { t: "cor", c: "@navy", a: .7 } }));
    S(Tx("Cargo", 380, 738, 480, 46, { txt: "{cargo}", tam: 30 }));
  } else if (modelo === "voucher") {
    bg = { t: "img", src: "img/cubos.jpg", fit: "cover", c: "@creme" };
    var al = base[1] > 1000, Y = function (y) { return al ? y * 1.78 : y; };
    S(I("Mosaico do topo", 820, -30, 200, al ? 600 : 420, { src: M1, fit: "contain", px: 100, py: 0 }));
    S(I("Mosaico de baixo", -20, Y(770), 130, al ? 480 : 320, { src: M2, fit: "contain", px: 0, py: 100 }));
    S(Tx("Título", 60, Y(60), 720, 230, { txt: "{titulo}", fonte: "Ms Madi", tam: 200, cor: "@ouro", al: "left", lh: 1, rot: -5 }));
    S(Tx("Chamada", 170, Y(250), 620, 90, { txt: "{chamada}", peso: 900, tam: 64, al: "left" }));
    S(Tx("Prêmio", 70, Y(390), 640, 240, { txt: "{premio}", peso: 700, tam: 104, cor: "@navy2", al: "left", lh: .98, va: "top" }));
    S(Tx("Valor", 70, Y(640), 600, 60, { txt: "No valor de R$ {valor}", peso: 400, tam: 42, al: "left" }));
    S(Tx("Para", 70, Y(700), 600, 50, { txt: "{para}", peso: 500, tam: 30, al: "left" }));
    S(I("Logo", 70, Y(770), 430, 100, { src: "img/logo-am.png", fit: "contain", px: 0 }));
    S(Tx("Validade", 70, Y(880), 470, 80, { txt: "{validade}", tam: 22, al: "left", va: "top", cor: "@grafite" }));
    S(I("Mascote", 540, al ? 1080 : 450, 480, al ? 700 : 550, { src: "img/mascote.png", fit: "contain", px: 100, py: 100 }));
  } else if (modelo === "plaquinha") {
    bg = { t: "cor", c: "@branco", a: 1 };
    if (base[1] === 413) {
      S(F("Faixa amarela", 0, 383, 1181, 30, { fill: { t: "cor", c: "@ouro", a: 1 } }));
      S(I("Mosaico", 1010, -10, 180, 380, { src: M1, fit: "contain", px: 100, py: 0 }));
      S(I("Logo", 45, 40, 330, 72, { src: "img/logo-am.png", fit: "contain", px: 0 }));
      S(Tx("Nome ou setor", 45, 140, 940, 130, { txt: "{titulo}", peso: 900, tam: 96, al: "left" }));
      S(Tx("Cargo", 45, 272, 940, 66, { txt: "{sub}", peso: 500, tam: 46, cor: "@navy2", al: "left" }));
    } else {
      S(F("Faixa amarela", 0, 836, 1181, 50, { fill: { t: "cor", c: "@ouro", a: 1 } }));
      S(I("Mosaico do topo", 960, -20, 230, 480, { src: M1, fit: "contain", px: 100, py: 0 }));
      S(I("Mosaico de baixo", -10, 470, 150, 360, { src: M2, fit: "contain", px: 0, py: 100 }));
      S(I("Logo", 290, 90, 600, 130, { src: "img/logo-am.png", fit: "contain" }));
      S(Tx("Nome ou setor", 120, 330, 940, 200, { txt: "{titulo}", peso: 900, tam: 120 }));
      S(Tx("Cargo", 120, 540, 940, 90, { txt: "{sub}", peso: 500, tam: 60, cor: "@navy2" }));
    }
  } else if (modelo === "assinatura") {
    bg = { t: "cor", c: "@branco", a: 1 };
    S(I("Logo", 30, 120, 380, 110, { src: "img/logo-am.png", fit: "contain" }));
    S(F("Divisor", 440, 55, 6, 290, { fill: { t: "cor", c: "@ouro", a: 1 } }));
    S(Tx("Nome", 480, 50, 640, 62, { txt: "{nome}", peso: 700, tam: 46, al: "left" }));
    S(Tx("Cargo", 480, 110, 640, 46, { txt: "{cargo}", tam: 30, cor: "@navy2", al: "left" }));
    S(Tx("Contatos", 480, 172, 640, 120, { txt: "{telefone}{whatsSep}\n{email}\n**{site}**", tam: 25, lh: 1.5, al: "left", va: "top" }));
    S(Tx("Unidade", 480, 300, 680, 46, { txt: "{unidade}", tam: 21, cor: "@grafite", al: "left" }));
    S(I("Mosaico", 1110, -30, 100, 230, { src: M1, fit: "contain", px: 100, py: 0 }));
  } else {
    bg = { t: "cor", c: "@creme", a: 1 };
    S(F("Faixa amarela", 0, 1704, 1240, 50, { fill: { t: "cor", c: "@ouro", a: 1 } }));
    S(I("Mosaico do topo", 1000, -20, 250, 520, { src: M1, fit: "contain", px: 100, py: 0 }));
    S(I("Mosaico de baixo", -10, 1250, 170, 420, { src: M2, fit: "contain", px: 0, py: 100 }));
    S(I("Logo", 330, 90, 580, 125, { src: "img/logo-am.png", fit: "contain" }));
    S(Tx("Título", 110, 380, 1020, 160, { txt: "Título do comunicado", peso: 900, tam: 90 }));
    S(Tx("Texto", 150, 600, 940, 600, { txt: "Escreva aqui. Use **dois asteriscos** para negrito e *um asterisco* para destacar em azul.", tam: 40, lh: 1.5, va: "top" }));
  }
  return { layers: L, bg: bg };
}

// cálculos automáticos: valor por extenso, tempo de casa, whats
function onDados(p, k) {
  var d = p.dados;
  if (p.modelo === "cheque") {
    if (k === "extenso") d.extensoManual = !!String(d.extenso || "").trim();
    if (k === "valor" && !d.extensoManual) d.extenso = porExtenso(d.valor);
  }
  if (p.modelo === "certificado" && k === "tempo") {
    var n = parseInt(String(d.tempo).replace(/\D/g, ""), 10) || 0;
    d.linhaTempo = (n < 10 ? "0" : "") + n + (n === 1 ? " ANO" : " ANOS") + " DE ALVORADA";
    d.periodo = n === 1 ? "do último ano" : "dos últimos " + extensoInt(n) + " anos";
  }
  if (p.modelo === "assinatura" && (k === "whats" || k === "telefone")) d.whatsSep = String(d.whats || "").trim() ? "  ·  WhatsApp " + d.whats : "";
}

// assinatura de e-mail: copiar em HTML (Gmail, Outlook) com o logo hospedado no site
function htmlAssinatura(p) {
  var d = p.dados, m = (window.P && P.marca) || MARCA, e = function (s) { return esc(String(s || "")); };
  var logo = new URL("img/logo-am.png", location.href).href;
  var linha = function (t, cor, tam, peso) { return t ? '<div style="font-family:Arial,Helvetica,sans-serif;font-size:' + tam + "px;line-height:1.45;color:" + cor + ";font-weight:" + (peso || 400) + '">' + t + "</div>" : ""; };
  return '<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>' +
    '<td style="padding:6px 16px 6px 0;vertical-align:middle"><img src="' + logo + '" width="190" alt="Alvorada Materiais de Construção" style="display:block;width:190px;height:auto;border:0"></td>' +
    '<td style="border-left:3px solid ' + m.ouro + ';padding:4px 0 4px 16px;vertical-align:middle">' +
    linha(e(d.nome), m.navy, 16, 700) + linha(e(d.cargo), m.navy2, 13) +
    linha(e(d.telefone) + (d.whats ? " · WhatsApp " + e(d.whats) : ""), m.navy, 12) +
    linha(d.email ? '<a href="mailto:' + e(d.email) + '" style="color:' + m.navy + ';text-decoration:none">' + e(d.email) + "</a>" : "", m.navy, 12) +
    linha(d.site ? '<a href="https://' + e(String(d.site).replace(/^https?:\/\//, "")) + '" style="color:' + m.navy + ';text-decoration:none;font-weight:700">' + e(d.site) + "</a>" : "", m.navy, 12) +
    linha(e(d.unidade), m.grafite, 11) + "</td></tr></table>";
}
function copiarHTML(html, texto) {
  if (navigator.clipboard && window.ClipboardItem) return navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([texto], { type: "text/plain" }) })]);
  return new Promise(function (res, rej) { var div = document.createElement("div"); div.contentEditable = "true"; div.innerHTML = html; div.style.cssText = "position:fixed;left:-9999px"; document.body.appendChild(div); var r = document.createRange(); r.selectNodeContents(div); var s = getSelection(); s.removeAllRanges(); s.addRange(r); var ok = document.execCommand("copy"); s.removeAllRanges(); div.remove(); ok ? res() : rej(); });
}
function acoes(p) {
  if (p.modelo !== "assinatura") return "";
  return '<div class="xcard" style="margin-top:6px"><b>Usar no e-mail</b><p>Copie e cole direto nas configurações de assinatura do Gmail ou do Outlook. O logo vem do site, então funciona em qualquer computador.</p><div class="row"><button class="btn sm pri" id="assCopiar">Copiar assinatura</button><button class="btn sm" id="assHtml">Baixar .html</button></div><p class="hint" style="margin:6px 0 0">Gmail: Configurações › Ver todas › Geral › Assinatura › colar. Outlook: Configurações › E-mail › Assinaturas › colar. Para a versão em imagem, use Exportar › PNG.</p></div>';
}
function ligar(p, el) {
  var b = el.querySelector("#assCopiar"), h = el.querySelector("#assHtml");
  if (b) b.onclick = function () { var d = p.dados; copiarHTML(htmlAssinatura(p), [d.nome, d.cargo, d.telefone, d.email, d.site].filter(Boolean).join("\n")).then(function () { toast("Assinatura copiada. Cole nas configurações do e-mail."); }, function () { toast("Não consegui copiar. Use Baixar .html."); }); };
  if (h) h.onclick = function () { saveFile("assinatura-" + slug(p.dados.nome) + ".html", new Blob(['<!doctype html><meta charset="utf-8"><title>Assinatura</title><body style="margin:24px">' + htmlAssinatura(p) + "</body>"], { type: "text/html" })); };
}

// combinações de cores: troca a partir das cores originais da peça (pode alternar à vontade)
var PAPEIS = ["cor", "dest", "fundo", "bcor", "ccor"];
function guardaOriginal(p) {
  if (p._orig && p.layers.some(function (L) { return p._orig.L[L.id]; })) return; p._orig = { bg: clone(p.bg), L: {} };
  p.layers.forEach(function (L) { var o = {}; PAPEIS.forEach(function (k) { if (L[k] != null) o[k] = L[k]; }); if (L.fill) o.fill = clone(L.fill); if (L.src) o.src = L.src; p._orig.L[L.id] = o; });
}
function paleta(mapa, bg, logo) {
  return function (p) {
    guardaOriginal(p);
    var tr = function (v) { return mapa[v] !== undefined ? mapa[v] : v; };
    p.layers.forEach(function (L) {
      var o = p._orig.L[L.id]; if (!o) return;
      PAPEIS.forEach(function (k) { if (o[k] != null) L[k] = tr(o[k]); });
      if (o.fill) { L.fill = clone(o.fill); ["c", "c1", "c2"].forEach(function (k) { if (L.fill[k]) L.fill[k] = tr(L.fill[k]); }); }
      if (o.src === "img/logo-am.png" || o.src === "img/logo-am-branco.png") L.src = logo || o.src;
    });
    p.bg = bg ? clone(bg) : clone(p._orig.bg);
  };
}
var PAL = [
  { nome: "Claro", a: "#ffffff", b: "#233063", aplicar: paleta({}, null, "img/logo-am.png") },
  { nome: "Azul", a: "#233063", b: "#fcd205", aplicar: paleta({ "@navy": "@branco", "@navy2": "@ouro", "@grafite": "@ouro2" }, { t: "cor", c: "@navy", a: 1 }, "img/logo-am-branco.png") },
  { nome: "Azul médio", a: "#4763b8", b: "#ffffff", aplicar: paleta({ "@navy": "@branco", "@navy2": "@ouro", "@grafite": "@branco" }, { t: "cor", c: "@navy2", a: 1 }, "img/logo-am-branco.png") },
  { nome: "Amarelo", a: "#fcd205", b: "#233063", aplicar: paleta({ "@ouro": "@navy", "@navy2": "@navy" }, { t: "cor", c: "@ouro", a: 1 }, "img/logo-am.png") }
];
var PALETAS = {}; Object.keys(MODELOS).forEach(function (k) { PALETAS[k] = PAL; });

window.KIT = {
  id: "endomarketing", nome: "Endomarketing", idb: "endomarketing-am", pasta: "endomarketing", area: "endomarketing",
  marca: MARCA, marcaNomes: NOMES, fontes: FONTES, imgs: IMGS, modelos: MODELOS, scriptPadrao: "Ms Madi",
  tok: { claro: "@branco", escuro: "@navy", dest: "@navy2", gradNome: "Amarelo", logoClaro: "img/logo-am-branco.png", logoEscuro: "img/logo-am.png" },
  inverter: { "@navy": "@branco", "@branco": "@navy", "@creme": "@navy", "@navy2": "@ouro" },
  paletas: PALETAS, onDados: onDados, acoes: acoes, ligar: ligar,
  inicial: function () { return [["aniver", "story"], ["certificado", "a4h"], ["cheque", "a5h"], ["voucher", "q10"], ["plaquinha", "plaq207"], ["assinatura", "email"]]; },
  gerar: gerarAM
};
})();
