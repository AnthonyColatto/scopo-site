/* Kit Escola SCOPO · thumbs, posts, carrossel, capa de Reels e slides de aula (usa o motor em ../../estudio/motor.js)
   Manual: preto domina, amarelo em uma coisa só por peça, off-white no texto. Saira Extra Condensed 200/600, JetBrains Mono nas etiquetas, Barlow no corpo.
   Cada camada leva um papel (r) para a troca de tema recolorir tudo de uma vez. */
(function () {
/* ================= marca ================= */
var MARCA = { preto: "#0B0B0A", grafite: "#1C1C1A", linha: "#242422", cinza: "#8E8A80", off: "#F2EFE6", papel: "#E4E0D5", amarelo: "#F9C32D" };
var NOMES = { preto: "Preto", grafite: "Grafite", linha: "Linha", cinza: "Cinza", off: "Off-white", papel: "Papel", amarelo: "Amarelo" };
var DISPLAY = "Saira Extra Condensed", MONO = "JetBrains Mono", BODY = "Barlow";

/* ícones do kit (grade 24, traço 1,5) entram na lista do motor */
var ICONES_KIT = { "gancho": "<circle cx=\"15\" cy=\"4\" r=\"1.75\"/><path d=\"M15 5.75V13a5 5 0 0 1-10 0v-2.5\"/><path d=\"M5 10.5l3 3\"/>", "loop-aberto": "<path d=\"M12 4a8 8 0 1 0 8 8\"/><path d=\"M17.5 14.5L20 12l2.5 2.5\"/><circle cx=\"12\" cy=\"4\" r=\"0.6\" fill=\"currentColor\"/>", "ritmo": "<path d=\"M6.5 21L9.75 3h4.5L17.5 21z\"/><path d=\"M8 15.5h8\"/><path d=\"M12 15.5l5-9\"/>", "re-gancho": "<path d=\"M13.5 2.5L5.5 13.5h6l-1 8 8-11h-6z\"/>", "virada": "<path d=\"M4 20v-6a6 6 0 0 1 6-6h10\"/><path d=\"M16 4l4 4-4 4\"/>", "acao-cta": "<path d=\"M5 5l6.5 15 2.2-6.3L20 11.5z\"/><path d=\"M13.7 13.7L19 19\"/>", "bordao": "<path d=\"M4 18c2.6-.9 4-3 4-6V7H4v5h4\"/><path d=\"M14 18c2.6-.9 4-3 4-6V7h-4v5h4\"/>", "cronometro": "<circle cx=\"12\" cy=\"13.5\" r=\"7.5\"/><path d=\"M12 13.5V9.5\"/><path d=\"M10 2.5h4\"/><path d=\"M12 2.5V6\"/><path d=\"M18.5 6.5l1.5-1.5\"/>", "play": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M10 9.25v5.5L14.75 12z\"/>", "corte": "<circle cx=\"6\" cy=\"6.5\" r=\"2.5\"/><circle cx=\"6\" cy=\"17.5\" r=\"2.5\"/><path d=\"M8.2 7.8L20 17\"/><path d=\"M8.2 16.2L20 7\"/>", "timeline": "<rect x=\"3\" y=\"6\" width=\"7\" height=\"4\" rx=\"1\"/><rect x=\"13\" y=\"6\" width=\"8\" height=\"4\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"10\" height=\"4\" rx=\"1\"/><rect x=\"16\" y=\"14\" width=\"5\" height=\"4\" rx=\"1\"/><path d=\"M11.5 3v18\"/>", "legenda": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"3\"/><path d=\"M7 11h3\"/><path d=\"M12.5 11h4.5\"/><path d=\"M7 15h6\"/><path d=\"M15.5 15H17\"/>", "zona-segura": "<rect x=\"6.5\" y=\"2\" width=\"11\" height=\"20\" rx=\"2.5\"/><path d=\"M6.5 6.5h11\" stroke-dasharray=\"1.5 1.5\"/><path d=\"M6.5 16.5h11\" stroke-dasharray=\"1.5 1.5\"/>", "curva-retencao": "<path d=\"M3 3v18h18\"/><path d=\"M6.5 5.5c1 5 3 7.5 6 8.5 2.5.8 5 .9 7.5 1\"/><circle cx=\"12.5\" cy=\"14\" r=\"1.4\"/>", "teste-ab": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2.5\"/><path d=\"M12 4v16\"/><path d=\"M5.5 15.5l2-7 2 7\"/><path d=\"M6.1 13.3h2.8\"/><path d=\"M14.5 8.5v7h2.25a1.75 1.75 0 0 0 0-3.5H14.5h1.9a1.75 1.75 0 0 0 0-3.5z\"/>", "prompt": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2.5\"/><path d=\"M7 10l3 2.25L7 14.5\"/><path d=\"M12.5 15h4.5\"/>", "ia": "<path d=\"M11 3.5l1.9 5.1L18 10.5l-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z\"/><path d=\"M18.5 15v5\"/><path d=\"M16 17.5h5\"/>", "camera": "<rect x=\"2.5\" y=\"6.5\" width=\"13.5\" height=\"11\" rx=\"2.5\"/><path d=\"M16 10.5l5.5-3v9l-5.5-3\"/>", "microfone": "<rect x=\"9\" y=\"2.5\" width=\"6\" height=\"11.5\" rx=\"3\"/><path d=\"M5.5 11a6.5 6.5 0 0 0 13 0\"/><path d=\"M12 17.5V21\"/><path d=\"M8.5 21h7\"/>", "luz": "<circle cx=\"12\" cy=\"10\" r=\"7\"/><circle cx=\"12\" cy=\"10\" r=\"3.5\"/><path d=\"M12 17v4\"/><path d=\"M9 21h6\"/>", "claquete": "<path d=\"M3.5 10h17v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z\"/><path d=\"M3.2 6.6L19.4 3.3l.7 3.4L3.9 10z\"/><path d=\"M8.3 5.6l2.2 3.3\"/><path d=\"M13.6 4.5l2.2 3.3\"/>", "prova": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M8 12.25l2.75 2.75L16.25 9.5\"/>", "olhar": "<path d=\"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>", "alvo": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1.25\" fill=\"currentColor\"/>", "aulao": "<circle cx=\"9\" cy=\"8\" r=\"3.25\"/><path d=\"M3 20.5c0-3.3 2.7-6 6-6s6 2.7 6 6\"/><circle cx=\"17\" cy=\"9\" r=\"2.5\"/><path d=\"M17 14c2.6 0 4.5 2.2 4.5 5\"/>", "calendario": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"16\" rx=\"2.5\"/><path d=\"M3 10h18\"/><path d=\"M8 3v4\"/><path d=\"M16 3v4\"/><circle cx=\"8\" cy=\"14.5\" r=\".9\" fill=\"currentColor\"/>", "lista-espera": "<path d=\"M9.5 6.5h11\"/><path d=\"M9.5 12h11\"/><path d=\"M9.5 17.5h7\"/><circle cx=\"5\" cy=\"6.5\" r=\"1.25\"/><circle cx=\"5\" cy=\"12\" r=\"1.25\"/><circle cx=\"5\" cy=\"17.5\" r=\"1.25\"/>", "comente": "<path d=\"M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-8.5L6 20.5V17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z\"/><path d=\"M8 10.5h8\"/>", "isca": "<path d=\"M12 3.5v11\"/><path d=\"M7.5 10l4.5 4.5 4.5-4.5\"/><path d=\"M4 20.5h16\"/>", "audio": "<path d=\"M4 10v4\"/><path d=\"M8 7v10\"/><path d=\"M12 3.5v17\"/><path d=\"M16 8v8\"/><path d=\"M20 10.5v3\"/>", "formatos": "<path d=\"M12 3l9 4.75-9 4.75-9-4.75z\"/><path d=\"M3 12.25l9 4.75 9-4.75\"/><path d=\"M3 16.75l9 4.75 9-4.75\"/>", "objeto-3d": "<path d=\"M12 2.5l8.5 4.75v9.5L12 21.5l-8.5-4.75v-9.5z\"/><path d=\"M12 12l8.5-4.75\"/><path d=\"M12 12v9.5\"/><path d=\"M12 12L3.5 7.25\"/>", "seta": "<path d=\"M4 12h16\"/><path d=\"M14 6l6 6-6 6\"/>", "local": "<path d=\"M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z\"/><circle cx=\"12\" cy=\"9.5\" r=\"2.5\"/>", "berrante": "<path d=\"M2.5 10.5C9 11 15 9 18.5 4.5L21.5 11C16 14.5 9 14 2.5 12.5z\"/><path d=\"M2.5 10v3\"/><path d=\"M7 13c.5 3.5 5.5 5 9.5 1.5\"/>", "rec": "<rect x=\"2.5\" y=\"5.5\" width=\"19\" height=\"13\" rx=\"3\"/><circle cx=\"8\" cy=\"12\" r=\"2\" fill=\"currentColor\"/><path d=\"M12.5 10.5h5\"/><path d=\"M12.5 13.5h3\"/>" };
var ICONES_NOMES = {"gancho": "Gancho", "loop-aberto": "Loop aberto", "ritmo": "Ritmo", "re-gancho": "Re-gancho", "virada": "Virada", "acao-cta": "Ação / CTA", "bordao": "Bordão", "cronometro": "3 segundos", "play": "Play", "corte": "Corte", "timeline": "Timeline", "legenda": "Legenda", "zona-segura": "Zona segura 9:16", "curva-retencao": "Curva de retenção", "teste-ab": "Teste A/B", "prompt": "Prompt", "ia": "I.A", "camera": "Câmera", "microfone": "Microfone", "luz": "Luz", "claquete": "Claquete", "prova": "Prova", "olhar": "Olhar de perto", "alvo": "Alvo", "aulao": "Aulão presencial", "calendario": "Calendário", "lista-espera": "Lista de espera", "comente": "Comente a palavra", "isca": "Material grátis", "audio": "Áudio", "formatos": "7 peças", "objeto-3d": "Objeto 3D", "seta": "Seta", "local": "Local", "berrante": "Berrante", "rec": "Gravando"};
var ICONES_MOTOR = Object.assign({}, ICONES); // os do kit primeiro na lista, os do motor continuam valendo
Object.keys(ICONES).forEach(function (k) { delete ICONES[k]; });
Object.assign(ICONES, ICONES_KIT); Object.keys(ICONES_MOTOR).forEach(function (k) { if (!ICONES[k]) ICONES[k] = ICONES_MOTOR[k]; });

FMTS.yt = { nome: "Thumb YouTube 1280×720", w: 1280, h: 720, g: "Digital" };
FMTS.slide = { nome: "Slide de aula 1920×1080", w: 1920, h: 1080, g: "Digital" };
BIBLIO_NOMES.escola = "imagens da Escola";

var ELEMENTOS = [
  "playhead", "cronometro-003", "waveform", "texto-desfocado", "curva-retencao", "regua-timecode", "barra-progresso", "contador-123", "espinha-de-retencao",
  "grifo", "risco", "sublinhado-pincel", "circulo-mao", "seta-pincel", "seta-curva", "seta-fina", "seta-ponto", "rodape-arrasta",
  "selo-presencial", "selo-ao-vivo", "selo-dado-real", "selo-metodo", "selo-giratorio-bordao", "selo-giratorio-turma",
  "etiqueta-gancho-a", "etiqueta-gancho-b", "etiqueta-comente", "etiqueta-rec", "etiqueta-timecode", "etiqueta-numeracao", "etiqueta-rotulo-secao",
  "etiqueta-pilar-retencao", "etiqueta-pilar-ia", "etiqueta-pilar-bastidor",
  "moldura-split-ab", "moldura-antes-depois", "moldura-visor-rec", "moldura-tela-9x16-zonas", "moldura-capsula-foto", "moldura-marcas-de-corte",
  "pilar-retencao-claro", "pilar-ia-claro", "pilar-bastidor-claro", "pilar-retencao-escuro", "pilar-ia-escuro", "pilar-bastidor-escuro",
  "exclamacao-amarela", "exclamacao-preta", "assinatura-escola-scopo", "assinatura-escola-scopo-escura"
];
function rotulo(n) { return n.replace(/-/g, " ").replace(/^./, function (c) { return c.toUpperCase(); }); }
var IMGS = [["img/logo-scopo-claro.png", "Logo SCOPO! claro", 1], ["img/logo-scopo-escuro.png", "Logo SCOPO! escuro", 1], ["img/logo-scopo-preto.png", "Logo SCOPO! todo preto (fundo amarelo)", 1], ["img/foto-modelo.png", "Foto (modelo)", 1]]
  .concat(ELEMENTOS.map(function (n) { return ["img/" + n + ".png", rotulo(n), 1]; }))
  .concat([["img/grao-1080.png", "Textura grão"], ["img/reticula-degrade-1080.png", "Retícula degradê"], ["img/varredura-1080.png", "Varredura"]])
  .concat(["regua", "trilhas", "capsulas"].reduce(function (a, pt) { return a.concat(["preto", "amarelo", "off"].map(function (c) { return ["img/pat-" + pt + "-" + c + ".png", "Pattern " + pt + " " + c]; })); }, []));

/* ================= temas ================= */
var TEMAS = {
  preto: { bg: "@preto", tx: "@off", mu: "@cinza", dest: "@amarelo", linha: "@linha", caixa: "@grafite", caixaTx: "@off", pill: "@amarelo", pillTx: "@preto", logo: "img/logo-scopo-claro.png", pat: "preto" },
  amarelo: { bg: "@amarelo", tx: "@preto", mu: "@preto", dest: "@preto", linha: "@preto", caixa: "@preto", caixaTx: "@off", pill: "@preto", pillTx: "@off", logo: "img/logo-scopo-preto.png", pat: "amarelo" },
  claro: { bg: "@off", tx: "@preto", mu: "@cinza", dest: "@preto", linha: "@papel", caixa: "@papel", caixaTx: "@preto", pill: "@preto", pillTx: "@off", logo: "img/logo-scopo-escuro.png", pat: "off" }
};
var OPS_TEMA = [["preto", "Preto"], ["amarelo", "Amarelo"], ["claro", "Claro"]];
var OPS_PAT = [["", "Liso"], ["regua", "Régua"], ["trilhas", "Trilhas"], ["capsulas", "Cápsulas"]];
function aplicaTema(g, tema, pat, larg) {
  var t = TEMAS[tema] || TEMAS.preto;
  g.bg = pat ? { t: "img", src: "img/pat-" + pat + "-" + t.pat + ".png", fit: "repeat", esc: Math.round(320 / (larg || 1080) * 100), c: t.bg, op: 1 } : { t: "cor", c: t.bg, a: 1 };
  g.layers.forEach(function (L) {
    switch (L.r) {
      case "tx": L.cor = t.tx; L.dest = t.dest; break;
      case "mu": L.cor = t.mu; L.dest = t.dest; break;
      case "dest": L.cor = t.dest; L.dest = t.dest; break;
      case "caixaTx": L.cor = t.caixaTx; L.dest = t.dest === "@preto" ? t.caixaTx : t.dest; break;
      case "linha": L.fill = { t: "cor", c: t.linha, a: 1 }; break;
      case "caixa": L.fill = { t: "cor", c: t.caixa, a: 1 }; break;
      case "contorno": L.bcor = t.tx; break;
      case "pill": L.fundo = t.pill; L.cor = t.pillTx; break;
      case "ic": L.cor = t.dest === "@preto" ? t.tx : t.dest; break;
      case "icTx": L.cor = t.tx; break;
      case "logo": L.src = t.logo; break;
    }
  });
  return g;
}

/* ================= camadas-base ================= */
// texto fino (Saira 200), forte (Saira 600), etiqueta (Mono) e corpo (Barlow)
function fino(n, x, y, w, h, txt, tam, o) { return T(n, x, y, w, h, Object.assign({ txt: txt, fonte: DISPLAY, peso: 200, tam: tam, ls: .08, lh: 1, caixa: true, al: "left", va: "bottom", r: "tx" }, o || {})); }
function forte(n, x, y, w, h, txt, tam, o) { return T(n, x, y, w, h, Object.assign({ txt: txt, fonte: DISPLAY, peso: 600, tam: tam, ls: .03, lh: .92, caixa: true, al: "left", va: "top", r: "tx" }, o || {})); }
function etq(n, x, y, w, h, txt, tam, o) { return T(n, x, y, w, h, Object.assign({ txt: txt, fonte: MONO, peso: 500, tam: tam, ls: .24, lh: 1.2, caixa: true, al: "left", va: "middle", r: "mu" }, o || {})); }
function corpo(n, x, y, w, h, txt, tam, o) { return T(n, x, y, w, h, Object.assign({ txt: txt, fonte: BODY, peso: 400, tam: tam, ls: 0, lh: 1.4, al: "left", va: "top", r: "tx" }, o || {})); }
function logo(x, y, h) { return I("Logo SCOPO!", x, y, Math.round(h * 4.75), h, { src: TEMAS.preto.logo, fit: "contain", px: 0, r: "logo" }); }
function linha(n, x, y, w) { return F(n, x, y, w, 2, { fill: { t: "cor", c: "@linha", a: 1 }, r: "linha" }); }

function escala(d, base) { // devolve S(): leva da base de desenho para o formato real
  var sx = d.w / base[0], sy = d.h / base[1], k = Math.min(sx, sy), L = [];
  function S(o) {
    o.x = Math.round(o.x * sx); o.w = Math.round(o.w * sx); o.y = Math.round(o.y * sy); o.h = Math.round(o.h * sy);
    ["tam", "raio", "blarg"].forEach(function (p) { if (typeof o[p] === "number") o[p] = Math.max(p === "tam" ? 6 : 0, Math.round(o[p] * k * 10) / 10); });
    L.push(o); return o;
  }
  S.L = L; return S;
}

/* ================= presets das 12 thumbs (roteiros da Fase 2) ================= */
var THUMBS = [
  { kicker: "Retenção · 01", fino: "Seu vídeo", forte: "Morre\n*aqui.*", apoio: "", elemento: "img/regua-timecode.png", foto: "img/foto-modelo.png", tema: "preto", dica: "Rosto de espanto olhando para o playhead em 0:03." },
  { kicker: "I.A na edição · 02", fino: "A I.A edita", forte: "*Errado.*", apoio: "Se você deixar", elemento: "", foto: "img/foto-modelo.png", tema: "preto", dica: "Desconfiado, uma sobrancelha erguida. Troque os [00] pelos tempos reais." },
  { kicker: "Retenção · 03", fino: "Mil cabeças", forte: "Um som.", apoio: "O que o ponteiro sabe e seu vídeo não", elemento: "img/waveform.png", foto: "", tema: "preto", dica: "Sem rosto: a boiada entrando em fila é a imagem. Amarelo só no berrante." },
  { kicker: "Retenção · 04", fino: "Use essa", forte: "*Frase.*", apoio: "", elemento: "img/texto-desfocado.png", foto: "img/foto-modelo.png", tema: "preto", dica: "Dedo na boca, cara de segredo. A frase desfocada é o loop aberto." },
  { kicker: "Bastidor e prova · 05", fino: "Mesmo vídeo", forte: "Qual\nsegurou?", apoio: "Começo A ou começo B?", elemento: "", foto: "", tema: "amarelo", dica: "Fundo amarelo quebra a grade. Não revele o vencedor." },
  { kicker: "Retenção · 06", fino: "Sua legenda", forte: "*Espanta*\ngente.", apoio: "", elemento: "img/risco.png", foto: "", tema: "preto", dica: "O erro na tela, riscado. Sem rosto, o celular é o rosto." },
  { kicker: "I.A na edição · 07", fino: "Gravo 1 vez", forte: "Posto\n*7.*", apoio: "", elemento: "img/contador-123.png", foto: "img/foto-modelo.png", tema: "preto", dica: "Leque de 7 peças com a do meio acesa." },
  { kicker: "Bastidor e prova · 08", fino: "Esse vídeo", forte: "Chegou.\n*Saiu.*", apoio: "[cliente] · com autorização", elemento: "img/moldura-antes-depois.png", foto: "", tema: "preto", dica: "Bruto real de um lado, frame final do outro." },
  { kicker: "I.A na edição · 09", fino: "A I.A vai te", forte: "Substituir?", apoio: "", elemento: "img/sublinhado-pincel.png", foto: "img/foto-modelo.png", tema: "claro", dica: "Sério, olhando direto na lente. A thumb pergunta o oposto do título." },
  { kicker: "Retenção · 10", fino: "Seu público", forte: "Desiste\naqui.", apoio: "", elemento: "img/curva-retencao.png", foto: "", tema: "preto", dica: "Texto todo claro: o amarelo vai no vale da curva." },
  { kicker: "I.A na edição · 11", fino: "Efeito no", forte: "Lugar\n*certo.*", apoio: "Uma coisa nova a cada 3 a 5 s", elemento: "img/regua-timecode.png", foto: "", tema: "preto", dica: "Teste sem rosto. Use o objeto 3D real do vídeo." },
  { kicker: "Aulão · 12", fino: "Ao vivo na sua frente", forte: "Sáb 5/12", apoio: "", elemento: "img/selo-presencial.png", foto: "img/foto-modelo.png", tema: "amarelo", dica: "Apontando para a câmera, sorrindo. Confirme data e local." }
];

/* ================= modelos ================= */
var CAMPOS_TEMA = [{ k: "tema", l: "Fundo", t: "seg", ops: OPS_TEMA }, { k: "padrao", l: "Pattern no fundo", t: "seg", ops: OPS_PAT }];
var FOTO = { k: "foto", l: "Foto recortada (PNG sem fundo)", t: "img", contain: true };
var ELEM = { k: "elemento", l: "Elemento do kit", t: "img", biblio: "escola", vazio: "Nenhum" };
var MODELOS = {
  thumb: { nome: "Thumb do YouTube", desc: "1280×720. Até 4 palavras fortes, amarelo em uma só, canto inferior direito livre para a duração.", fmt: "yt", versoes: ["yt"], nomeCampo: "forte", dup: "Duplicar para outro vídeo",
    campos: [{ k: "kicker", l: "Etiqueta (pilar · número)" }, { k: "fino", l: "Linha fina" }, { k: "forte", l: "Palavras fortes (*amarelo*)", t: "area" }, { k: "apoio", l: "Apoio (opcional)" }, FOTO, ELEM].concat(CAMPOS_TEMA),
    dados: Object.assign({ padrao: "" }, THUMBS[0]) },
  post: { nome: "Post de feed", desc: "1080×1350. Ideia em duas camadas: a frase fina prepara, a forte entrega.", fmt: "feed", versoes: ["feed", "quad"], nomeCampo: "forte",
    campos: [{ k: "rotulo", l: "Etiqueta do topo" }, { k: "kicker", l: "Assunto" }, { k: "fino", l: "Frase fina", t: "area" }, { k: "forte", l: "Frase forte (*amarelo*)", t: "area" }, { k: "texto", l: "Apoio", t: "area" }, { k: "rodape", l: "Rodapé" }].concat(CAMPOS_TEMA),
    dados: { rotulo: "Escola", kicker: "Método", fino: "Vídeo não perde\ngente no meio.", forte: "Perde no\n*começo.*", texto: "**Espinha de Retenção, vértebra 1: o gancho.**\nSalve para conferir antes de postar.", rodape: "Corte certo segura gente", tema: "preto", padrao: "" } },
  capa: { nome: "Carrossel · capa", desc: "Primeira lâmina: promessa clara e o convite para arrastar.", fmt: "feed", versoes: ["feed", "quad"], nomeCampo: "forte", dup: "Duplicar",
    campos: [{ k: "contador", l: "Contador (ex.: 01 / 07)" }, { k: "kicker", l: "Assunto" }, { k: "fino", l: "Frase fina", t: "area" }, { k: "forte", l: "Frase forte (*amarelo*)", t: "area" }].concat(CAMPOS_TEMA),
    dados: { contador: "01 / 07", kicker: "Retenção", fino: "3 ganchos\nque seguram", forte: "Até vídeo\n*sem graça.*", tema: "preto", padrao: "regua" } },
  lamina: { nome: "Carrossel · conteúdo", desc: "Uma ideia por lâmina, com o contraste do que não fazer e do que fazer.", fmt: "feed", versoes: ["feed", "quad"], nomeCampo: "forte", dup: "Duplicar para a próxima lâmina",
    campos: [{ k: "contador", l: "Contador" }, { k: "kicker", l: "Etiqueta" }, { k: "fino", l: "Frase fina", t: "area" }, { k: "forte", l: "Frase forte (*amarelo*)", t: "area" }, { k: "nao", l: "Não (exemplo errado)" }, { k: "sim", l: "Sim (exemplo certo)" }].concat(CAMPOS_TEMA),
    dados: { contador: "03 / 07", kicker: "Gancho 02", fino: "Toque na dor", forte: "Antes de\n*falar de você.*", nao: "“Oi, pessoal, hoje vou falar sobre…”", sim: "“Seu vídeo morre nos primeiros 3 segundos.”", tema: "preto", padrao: "" } },
  cta: { nome: "Carrossel · CTA", desc: "Última lâmina: um pedido só. Palavra-chave nos comentários ou link da bio.", fmt: "feed", versoes: ["feed", "quad", "story"], nomeCampo: "palavra", dup: "Duplicar",
    campos: [{ k: "kicker", l: "Chamada" }, { k: "palavra", l: "Palavra-chave" }, { k: "texto", l: "O que a pessoa recebe", t: "area" }, { k: "selo", l: "Selo" }].concat(CAMPOS_TEMA),
    dados: { kicker: "Comente a palavra", palavra: "Gancho", texto: "e receba o checklist de retenção no direct.", selo: "Escola SCOPO", tema: "amarelo", padrao: "capsulas" } },
  reels: { nome: "Capa de Reels / Shorts", desc: "1080×1920 com zonas seguras: nada importante nos 250 px do topo nem nos 340 px da base.", fmt: "story", versoes: ["story"], nomeCampo: "forte",
    campos: [{ k: "kicker", l: "Etiqueta" }, { k: "fino", l: "Linha fina" }, { k: "forte", l: "Palavras fortes (*amarelo*)", t: "area" }, { k: "legenda", l: "Legenda na tela" }, FOTO].concat(CAMPOS_TEMA),
    dados: { kicker: "Retenção · 01", fino: "Seu vídeo", forte: "*Morre aqui.*", legenda: "Perde aqui.", foto: "img/foto-modelo.png", tema: "preto", padrao: "" } },
  aula: { nome: "Slide · abertura de módulo", desc: "1920×1080. Abre cada módulo do curso com o título em duas camadas.", fmt: "slide", versoes: ["slide"], nomeCampo: "forte", dup: "Duplicar para outro módulo",
    campos: [{ k: "curso", l: "Curso · módulo (topo)" }, { k: "kicker", l: "Módulo" }, { k: "fino", l: "Título fino" }, { k: "forte", l: "Título forte (*amarelo*)", t: "area" }, { k: "texto", l: "Apoio" }, { k: "rodape", l: "Rodapé" }].concat(CAMPOS_TEMA),
    dados: { curso: "Corte Certo · Módulo 02 / 06", kicker: "Módulo 02", fino: "O gancho e o", forte: "*Loop aberto.*", texto: "Vértebras 1 e 2 da Espinha de Retenção", rodape: "Escola SCOPO · Turma fundadora 2027", tema: "preto", padrao: "trilhas" } },
  regra: { nome: "Slide · conteúdo", desc: "1920×1080. Uma regra por slide, com um elemento do kit para mostrar.", fmt: "slide", versoes: ["slide"], nomeCampo: "forte", dup: "Duplicar",
    campos: [{ k: "contador", l: "Contador (topo)" }, { k: "kicker", l: "Etiqueta" }, { k: "fino", l: "Frase fina" }, { k: "forte", l: "Frase forte (*amarelo*)", t: "area" }, ELEM, { k: "rodape", l: "Rodapé" }].concat(CAMPOS_TEMA),
    dados: { contador: "02 · 04 / 12", kicker: "Regra", fino: "Uma coisa nova a cada", forte: "3 a 5 segundos.", elemento: "img/regua-timecode.png", rodape: "Corte Certo · Aula 04", tema: "claro", padrao: "" } },
  livre: { nome: "Livre", desc: "Página com a marca. Você monta: fundo, textos, imagens, ícones e elementos.", fmt: "feed", campos: [], dados: {} }
};

/* ================= layouts ================= */
function rodape(S, W, H, M, txt, seta) {
  S(linha("Linha do rodapé", M, H - M - 56, W - M * 2));
  S(etq("Rodapé", M, H - M - 30, W - M * 2 - 80, 30, txt, 15));
  if (seta) S(Ic("Seta", W - M - 40, H - M - 36, 40, 40, { icone: "seta", traco: 1.5, r: "ic" }));
}
function gerarK(modelo, d, p) {
  var dd = (p && p.dados) || MODELOS[modelo].dados, S, W, H, M;
  if (modelo === "thumb") {
    W = 1280; H = 720; M = 64; S = escala(d, [W, H]);
    S(I("Foto", 620, 24, 660, 696, { src: "{foto}", fit: "contain", px: 100, py: 100 }));
    S(etq("Etiqueta", M, 44, 560, 28, "{kicker}", 15));
    S(fino("Linha fina", M, 96, 640, 96, "{fino}", 80));
    S(forte("Palavras fortes", M, 196, 620, 290, "{forte}", 150));
    S(etq("Apoio", M, 500, 560, 28, "{apoio}", 16, { r: "tx" }));
    S(I("Elemento", M, 540, 560, 104, { src: "{elemento}", fit: "contain", px: 0, py: 50 }));
    S(etq("Assinatura", M, 664, 300, 22, "Escola SCOPO", 12));
  } else if (modelo === "post" || modelo === "capa") {
    W = 1080; H = 1350; M = 72; S = escala(d, [W, H]);
    S(logo(M, M, 30));
    S(etq(modelo === "capa" ? "Contador" : "Etiqueta do topo", W / 2, M, W / 2 - M, 30, modelo === "capa" ? "{contador}" : "{rotulo}", 15, { al: "right", r: "dest" }));
    S(etq("Assunto", M, 360, 700, 32, "{kicker}", 17, { ls: .4 }));
    S(fino("Frase fina", M, 404, W - M * 2, 200, "{fino}", 76, { va: "top", lh: 1.08 }));
    S(forte("Frase forte", M, 618, W - M * 2, 300, "{forte}", 132));
    if (modelo === "post") {
      S(Ic("Ícone", M, 980, 52, 52, { icone: "gancho", traco: 1.5, r: "ic" }));
      S(corpo("Apoio", M + 80, 978, W - M * 2 - 80, 110, "{texto}", 26, { r: "mu" }));
    }
    rodape(S, W, H, M, modelo === "capa" ? "Arrasta" : "{rodape}", true);
  } else if (modelo === "lamina") {
    W = 1080; H = 1350; M = 72; S = escala(d, [W, H]);
    S(logo(M, M, 30));
    S(etq("Contador", W / 2, M, W / 2 - M, 30, "{contador}", 15, { al: "right", r: "dest" }));
    S(etq("Etiqueta", M, 250, 700, 32, "{kicker}", 17, { ls: .4 }));
    S(fino("Frase fina", M, 292, W - M * 2, 100, "{fino}", 76, { va: "top" }));
    S(forte("Frase forte", M, 400, W - M * 2, 260, "{forte}", 112));
    S(F("Caixa do não", M, 760, W - M * 2, 136, { fill: { t: "cor", c: "@grafite", a: 1 }, raio: 16, r: "caixa" }));
    S(etq("Rótulo não", M + 32, 784, 300, 24, "Não", 13));
    S(corpo("Exemplo errado", M + 32, 820, W - M * 2 - 64, 56, "{nao}", 27, { r: "mu", va: "middle" }));
    S(F("Risco", M + 28, 846, 500, 3, { fill: { t: "cor", c: "@off", a: .9 }, rot: -2, r: "" }));
    S(F("Caixa do sim", M, 920, W - M * 2, 136, { fill: { t: "nenhum" }, raio: 16, blarg: 2, bcor: "@off", r: "contorno" }));
    S(etq("Rótulo sim", M + 32, 944, 300, 24, "Sim", 13, { r: "tx" }));
    S(corpo("Exemplo certo", M + 32, 980, W - M * 2 - 64, 56, "{sim}", 27, { va: "middle" }));
    rodape(S, W, H, M, "Arrasta", true);
  } else if (modelo === "cta") {
    W = 1080; H = 1350; M = 72; S = escala(d, [W, H]);
    S(I("Logo SCOPO!", (W - 160) / 2, M, 160, 34, { src: TEMAS.preto.logo, fit: "contain", r: "logo" }));
    S(etq("Chamada", M, 470, W - M * 2, 36, "{kicker}", 20, { al: "center", ls: .4, r: "tx" }));
    S(forte("Palavra-chave", M, 530, W - M * 2, 220, "{palavra}", 210, { al: "center", va: "middle" }));
    S(corpo("O que recebe", 160, 770, W - 320, 110, "{texto}", 30, { al: "center" }));
    S(G("Selo", (W - 380) / 2, 1080, 380, 72, { txt: "{selo}", estilo: "cheio", fundo: "@preto", cor: "@off", fonte: MONO, peso: 500, tam: 18, ls: .3, raio: 36, r: "pill" }));
  } else if (modelo === "reels") {
    W = 1080; H = 1920; M = 72; S = escala(d, [W, H]);
    S(I("Foto", 90, 560, 900, 1360, { src: "{foto}", fit: "contain", px: 50, py: 100 }));
    S(etq("Etiqueta", M, 290, 700, 30, "{kicker}", 17));
    S(fino("Linha fina", M, 330, W - M * 2, 100, "{fino}", 88));
    S(forte("Palavras fortes", M, 432, W - M * 2, 260, "{forte}", 150));
    S(G("Legenda na tela", (W - 520) / 2, 1430, 520, 92, { txt: "{legenda}", estilo: "cheio", fundo: "@preto", cor: "@off", fonte: DISPLAY, peso: 600, tam: 52, ls: .02, raio: 8, r: "pill" }));
    S(logo(M, 1600, 34));
    S(F("Guia · zona segura do topo (não exporta)", 0, 250, W, 3, { fill: { t: "cor", c: "@amarelo", a: .8 }, oculto: true, r: "" }));
    S(F("Guia · zona segura da base (não exporta)", 0, H - 340, W, 3, { fill: { t: "cor", c: "@amarelo", a: .8 }, oculto: true, r: "" }));
  } else if (modelo === "aula" || modelo === "regra") {
    W = 1920; H = 1080; M = 128; S = escala(d, [W, H]);
    S(logo(M, 128, 40));
    S(etq("Topo", W / 2, 128, W / 2 - M, 40, modelo === "aula" ? "{curso}" : "{contador}", 20, { al: "right", r: modelo === "aula" ? "mu" : "tx" }));
    if (modelo === "aula") {
      S(etq("Módulo", M, 380, 900, 40, "{kicker}", 26, { ls: .4 }));
      S(fino("Título fino", M, 430, W - M * 2, 130, "{fino}", 124));
      S(forte("Título forte", M, 560, W - M * 2, 200, "{forte}", 200));
      S(Ic("Ícone", M, 820, 60, 60, { icone: "ritmo", traco: 1.5, r: "ic" }));
      S(corpo("Apoio", M + 92, 822, 1200, 56, "{texto}", 30, { va: "middle" }));
    } else {
      S(etq("Etiqueta", M, 270, 900, 40, "{kicker}", 26, { ls: .4 }));
      S(fino("Frase fina", M, 320, W - M * 2, 120, "{fino}", 100));
      S(forte("Frase forte", M, 440, W - M * 2, 180, "{forte}", 176));
      S(I("Elemento", M, 660, W - M * 2, 170, { src: "{elemento}", fit: "contain", px: 0, py: 50 }));
    }
    S(linha("Linha do rodapé", M, H - 150, W - M * 2));
    S(etq("Rodapé", M, H - 124, W - M * 2, 36, "{rodape}", 19));
  } else {
    W = d.w; H = d.h; S = escala(d, [W, H]); M = Math.round(W * .067);
    S(logo(M, M, Math.round(W * .028)));
    S(forte("Título", M, H * .4, W - M * 2, H * .2, "Seu título *aqui.*", Math.round(W * .1)));
    return aplicaTema({ layers: S.L, bg: null }, "preto", "", W);
  }
  return aplicaTema({ layers: S.L, bg: null }, dd.tema, dd.padrao, W);
}

function retema(p) { // troca de fundo sem refazer o layout (mantém o que foi arrastado)
  aplicaTema(p, p.dados.tema, p.dados.padrao, dims(p).w);
}
var PALETAS = {};
Object.keys(MODELOS).forEach(function (m) {
  if (m === "livre") return;
  PALETAS[m] = [
    { nome: "Preto", a: "#0B0B0A", b: "#F9C32D", aplicar: function (p) { p.dados.tema = "preto"; p.dados.padrao = ""; retema(p); } },
    { nome: "Preto com régua", a: "#1C1C1A", b: "#F2EFE6", aplicar: function (p) { p.dados.tema = "preto"; p.dados.padrao = "regua"; retema(p); } },
    { nome: "Amarelo", a: "#F9C32D", b: "#0B0B0A", aplicar: function (p) { p.dados.tema = "amarelo"; p.dados.padrao = ""; retema(p); } },
    { nome: "Amarelo com cápsulas", a: "#F9C32D", b: "#1C1C1A", aplicar: function (p) { p.dados.tema = "amarelo"; p.dados.padrao = "capsulas"; retema(p); } },
    { nome: "Claro", a: "#F2EFE6", b: "#0B0B0A", aplicar: function (p) { p.dados.tema = "claro"; p.dados.padrao = ""; retema(p); } },
    { nome: "Claro com trilhas", a: "#E4E0D5", b: "#0B0B0A", aplicar: function (p) { p.dados.tema = "claro"; p.dados.padrao = "trilhas"; retema(p); } }
  ];
});

window.KIT = {
  id: "escola", nome: "Estúdio Escola SCOPO", idb: "estudio-escola-scopo", pasta: "escola", area: "treinamento", soAdmin: true,
  marca: MARCA, marcaNomes: NOMES, fontes: [DISPLAY, BODY, MONO], imgs: IMGS, modelos: MODELOS, scriptPadrao: DISPLAY,
  alias: { navy: "@preto", navy2: "@grafite", branco: "@off", creme: "@off", ouro: "@amarelo", ouro2: "#FFD666", ouro3: "#D9A31C" },
  iconesNomes: ICONES_NOMES,
  biblio: { escola: ELEMENTOS.map(function (n) { return ["img/" + n + ".png", rotulo(n)]; }) },
  carregarFontes: ['200 40px "Saira Extra Condensed"', '600 40px "Saira Extra Condensed"', '400 40px "Barlow"', '600 40px "Barlow"', '500 40px "JetBrains Mono"'],
  tok: { claro: "@off", escuro: "@preto", dest: "@amarelo", gradNome: "Amarelo", logoClaro: "img/logo-scopo-claro.png", logoEscuro: "img/logo-scopo-escuro.png" },
  inverter: { "@preto": "@off", "@off": "@preto", "@grafite": "@papel", "@papel": "@grafite" },
  paletas: PALETAS,
  onDados: function (p, k) { if (k === "tema" || k === "padrao") retema(p); },
  acoes: function (p) {
    if (p.modelo !== "thumb") return "";
    var at = THUMBS.findIndex(function (t) { return t.forte === p.dados.forte && t.kicker === p.dados.kicker; });
    return '<label class="f"><span>Vídeo dos roteiros</span><select id="escThumb"><option value="">Escolha para preencher tudo…</option>' +
      THUMBS.map(function (t, i) { return '<option value="' + i + '"' + (i === at ? " selected" : "") + ">" + String(i + 1).padStart(2, "0") + " · " + esc(t.fino + " " + t.forte.replace(/[*\n]/g, " ").replace(/\s+/g, " ")) + "</option>"; }).join("") + "</select></label>" +
      (at >= 0 ? '<p class="hint">' + esc(THUMBS[at].dica) + "</p>" : "");
  },
  ligar: function (p, el) {
    var s = $("#escThumb", el); if (!s) return;
    s.onchange = function () {
      var t = THUMBS[+s.value]; if (!t) return;
      ["kicker", "fino", "forte", "apoio", "elemento", "foto", "tema"].forEach(function (k) { p.dados[k] = t[k]; });
      p.nome = "Thumb " + String(+s.value + 1).padStart(2, "0");
      retema(p); renderPreview(); renderPecas(); renderPainel(); commit(true);
    };
  },
  inicial: function () { return [["thumb", "yt"], ["post", "feed"], ["capa", "feed"], ["lamina", "feed"], ["cta", "feed"], ["reels", "story"], ["aula", "slide"], ["regra", "slide"]]; },
  gerar: gerarK
};
})();
