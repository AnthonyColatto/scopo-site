/* Indicadores · Perfil de Empresa no Google (Google Maps / Busca)
   Ponte entre o Fluxo do Time e as APIs do Perfil de Empresa.

   Usa o mesmo cliente OAuth do Google Ads (projeto scopo-dashboard). O login que gerou o
   refresh token precisa ser proprietário ou administrador dos perfis, e o projeto precisa
   ter o acesso às APIs do Perfil de Empresa aprovado pelo Google (antes disso a cota é 0).

   Variáveis de ambiente na Netlify:
     GADS_CLIENT_ID, GADS_CLIENT_SECRET   as mesmas do Google Ads
     GBP_REFRESH_TOKEN    refresh token com o escopo business.manage (secret).
                          Sem ela, tenta o GADS_REFRESH_TOKEN (se ele tiver os dois escopos).
     GBP_LOCAIS           opcional. Uma linha por perfil: "Nome | accounts/123/locations/456".
                          Sem ela, a função lista os perfis que o login administra.
     GBP_ATRASO           opcional: dias de atraso dos dados do Google (padrão 3)

   GET /api/gbp?parte=contas
   GET /api/gbp?parte=dados&conta=<conta>_<local>&dias=28 */

import { portaria, hojeISO, somaDias, DIAS_OK } from "../lib/acesso.mjs";

const ATRASO = Number(process.env.GBP_ATRASO || 3);
const REFRESH = process.env.GBP_REFRESH_TOKEN || process.env.GADS_REFRESH_TOKEN;

/* ---------- token ---------- */
let tok = null;
async function token() {
  if (tok && tok.exp > Date.now() + 60000) return tok.v;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: process.env.GADS_CLIENT_ID, client_secret: process.env.GADS_CLIENT_SECRET, refresh_token: REFRESH })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error === "invalid_grant" ? "O login do Perfil de Empresa venceu. Gere um novo refresh token no OAuth Playground e troque o GBP_REFRESH_TOKEN." : "Google recusou o login: " + (d.error_description || d.error || r.status));
  tok = { v: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return tok.v;
}

function erroGbp(d, status) {
  const e = (d && d.error) || {}, msg = String(e.message || ""), det = JSON.stringify(e.details || []);
  if (/SERVICE_DISABLED|has not been used in project|is disabled/i.test(msg + det)) {
    const api = (msg.match(/([a-z]+\.googleapis\.com)/) || [])[1];
    return "Falta ativar uma API no Google Cloud" + (api ? " (" + api + ")" : "") + ". Abra a Biblioteca de APIs do projeto scopo-dashboard e clique em Ativar.";
  }
  if (/ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient.*scope/i.test(msg + det)) return "O refresh token não tem a permissão do Perfil de Empresa. Gere outro no OAuth Playground com o escopo business.manage.";
  if (status === 429 || /RATE_LIMIT|quota/i.test(msg + det)) return "O Google ainda não liberou o acesso às APIs do Perfil de Empresa para o projeto (cota zero). É só aguardar a aprovação do pedido.";
  if (status === 403) return "Este login não administra este perfil. Adicione o e-mail que gerou o token como administrador do perfil no Google.";
  if (status === 404) return "Perfil não encontrado. Ele pode ter sido removido ou trocado de dono.";
  return msg || "O Google respondeu " + status;
}
async function chama(url) {
  const r = await fetch(url, { headers: { authorization: "Bearer " + (await token()) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(erroGbp(d, r.status));
  return d;
}

/* ---------- perfis ---------- */
// marca do perfil: a primeira palavra que não é genérica ("Ferragem Alvorada · Centro" → alvorada)
const GENERICAS = /^(loja|lojas|casa|grupo|ferragem|ferragens|materiais|material|comercio|comércio|construcao|construção|de|da|do|das|dos|e|unidade|filial|matriz|ltda|me)$/i;
const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
function marca(titulo) {
  const w = String(titulo || "").split(/[\s·\-|,/]+/).find((x) => x.length >= 4 && !GENERICAS.test(norm(x)));
  return w ? { k: norm(w).replace(/[^a-z0-9]/g, ""), nome: w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() } : null;
}
// junta as unidades da mesma marca numa opção "todas as unidades", que vem primeiro
function comGrupos(locais) {
  const g = new Map();
  locais.forEach((l) => { const m = marca(l.titulo || l.nome); if (!m) return; l.grupo = m.k; if (!g.has(m.k)) g.set(m.k, { nome: m.nome, n: 0 }); g.get(m.k).n++; });
  const out = [];
  g.forEach((v, k) => { if (v.n >= 2) out.push({ id: "g_" + k, nome: v.nome + " · todas as unidades (" + v.n + ")", todas: true }); });
  return { locais: out.concat(locais.map((l) => ({ id: l.id, nome: l.nome, grupo: l.grupo }))) };
}
const MASK = "name,title,storefrontAddress,metadata,websiteUri,categories";
const idDe = (conta, local) => conta.split("/")[1] + "_" + local.split("/").pop();
async function contas() {
  const fixas = String(process.env.GBP_LOCAIS || "").split(/\r?\n|;/).map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0] && /accounts\/\d+\/locations\/\d+/.test(p[1] || ""));
  if (fixas.length) return comGrupos(fixas.map(([nome, c]) => { const m = c.match(/accounts\/(\d+)\/locations\/(\d+)/); return { id: m[1] + "_" + m[2], nome }; }));
  const acs = [];
  let pt = "";
  do {
    const d = await chama("https://mybusinessaccountmanagement.googleapis.com/v1/accounts?pageSize=20" + (pt ? "&pageToken=" + pt : ""));
    acs.push(...(d.accounts || [])); pt = d.nextPageToken;
  } while (pt && acs.length < 100);
  const vistos = new Set(), locais = [];
  for (const a of acs) {
    let p = "";
    do {
      const d = await chama("https://mybusinessbusinessinformation.googleapis.com/v1/" + a.name + "/locations?pageSize=100&readMask=name,title,storefrontAddress" + (p ? "&pageToken=" + p : "")).catch(() => ({}));
      for (const l of d.locations || []) {
        if (vistos.has(l.name)) continue;
        vistos.add(l.name);
        const cidade = l.storefrontAddress && l.storefrontAddress.locality;
        locais.push({ id: idDe(a.name, l.name), titulo: l.title, nome: l.title + (cidade ? " · " + cidade : "") + (l.storefrontAddress && l.storefrontAddress.sublocality ? " · " + l.storefrontAddress.sublocality : "") });
      }
      p = d.nextPageToken;
    } while (p && locais.length < 200);
  }
  return comGrupos(locais);
}

/* ---------- desempenho ---------- */
const MET = {
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: "buscaMobile", BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: "buscaDesktop",
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: "mapsMobile", BUSINESS_IMPRESSIONS_DESKTOP_MAPS: "mapsDesktop",
  CALL_CLICKS: "ligacoes", BUSINESS_DIRECTION_REQUESTS: "rotas", WEBSITE_CLICKS: "site",
  BUSINESS_CONVERSATIONS: "conversas", BUSINESS_BOOKINGS: "reservas"
};
const N = (v) => (v == null ? 0 : Number(v) || 0);
const parteData = (iso, k) => { const [y, m, d] = iso.split("-"); return k + ".year=" + +y + "&" + k + ".month=" + +m + "&" + k + ".day=" + +d; };
const isoDe = (o) => o.year + "-" + String(o.month).padStart(2, "0") + "-" + String(o.day).padStart(2, "0");
function soma(dias) {
  const t = { buscaMobile: 0, buscaDesktop: 0, mapsMobile: 0, mapsDesktop: 0, ligacoes: 0, rotas: 0, site: 0, conversas: 0, reservas: 0 };
  dias.forEach((d) => Object.keys(t).forEach((k) => { t[k] += d[k] || 0; }));
  t.busca = t.buscaMobile + t.buscaDesktop; t.maps = t.mapsMobile + t.mapsDesktop;
  t.celular = t.buscaMobile + t.mapsMobile; t.computador = t.buscaDesktop + t.mapsDesktop;
  t.visualizacoes = t.busca + t.maps;
  t.acoes = t.ligacoes + t.rotas + t.site + t.conversas + t.reservas;
  return t;
}
async function desempenho(loc, de, ate) {
  const q = Object.keys(MET).map((m) => "dailyMetrics=" + m).join("&") + "&" + parteData(de, "dailyRange.startDate") + "&" + parteData(ate, "dailyRange.endDate");
  const d = await chama("https://businessprofileperformance.googleapis.com/v1/locations/" + loc + ":fetchMultiDailyMetricsTimeSeries?" + q);
  const porDia = {};
  for (const g of d.multiDailyMetricTimeSeries || []) for (const s of g.dailyMetricTimeSeries || []) {
    const k = MET[s.dailyMetric]; if (!k) continue;
    for (const v of (s.timeSeries && s.timeSeries.datedValues) || []) { const iso = isoDe(v.date); (porDia[iso] = porDia[iso] || { iso })[k] = N(v.value); }
  }
  return porDia;
}

/* ---------- termos de busca (mensais) ---------- */
function meses(dias) {
  const h = hojeISO(), y = +h.slice(0, 4), m = +h.slice(5, 7), n = dias >= 90 ? 3 : 1;
  const mes = (k) => { const d = new Date(Date.UTC(y, m - 1 - k, 1)); return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }; };
  return { atual: { de: mes(n), ate: mes(1) }, anterior: { de: mes(2 * n), ate: mes(n + 1) } };
}
async function termos(loc, r) {
  const q = "monthlyRange.startMonth.year=" + r.de.year + "&monthlyRange.startMonth.month=" + r.de.month + "&monthlyRange.endMonth.year=" + r.ate.year + "&monthlyRange.endMonth.month=" + r.ate.month + "&pageSize=100";
  const d = await chama("https://businessprofileperformance.googleapis.com/v1/locations/" + loc + "/searchkeywords/impressions/monthly?" + q);
  return (d.searchKeywordsCounts || []).map((t) => {
    const iv = t.insightsValue || {};
    return { termo: t.searchKeyword, v: iv.value != null ? N(iv.value) : null, menosDe: iv.threshold != null ? N(iv.threshold) : null };
  });
}

/* ---------- avaliações ---------- */
const ESTRELAS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
async function avaliacoes(conta, loc) {
  const out = []; let pt = "", media = null, total = null;
  do {
    const d = await chama("https://mybusiness.googleapis.com/v4/accounts/" + conta + "/locations/" + loc + "/reviews?pageSize=50&orderBy=updateTime%20desc" + (pt ? "&pageToken=" + pt : ""));
    if (media == null) { media = d.averageRating != null ? Number(d.averageRating) : null; total = d.totalReviewCount != null ? Number(d.totalReviewCount) : null; }
    out.push(...(d.reviews || [])); pt = d.nextPageToken;
  } while (pt && out.length < 200);
  return {
    media, total,
    lista: out.map((r) => ({
      nota: ESTRELAS[r.starRating] || null, texto: r.comment ? r.comment.replace(/\(Translated by Google\)[\s\S]*$/, "").replace(/\(Original\)\s*/, "").trim() : "",
      autor: (r.reviewer && !r.reviewer.isAnonymous && r.reviewer.displayName) || "Cliente", data: r.createTime, respondida: !!(r.reviewReply && r.reviewReply.comment)
    }))
  };
}

async function dados(id, dias) {
  const [conta, loc] = id.split("_");
  const ate = somaDias(hojeISO(), -ATRASO), de = somaDias(ate, -(dias - 1)), deAnt = somaDias(de, -dias), ateAnt = somaDias(de, -1);
  const M = meses(dias);
  const [info, pd, tA, tP, av] = await Promise.all([
    chama("https://mybusinessbusinessinformation.googleapis.com/v1/locations/" + loc + "?readMask=" + MASK).catch(() => ({})),
    desempenho(loc, deAnt, ate),
    termos(loc, M.atual).catch(() => []),
    termos(loc, M.anterior).catch(() => []),
    avaliacoes(conta, loc).catch((e) => ({ erro: String(e.message || e) }))
  ]);
  const lista = (ini, fim) => { const a = []; for (let d = ini; d <= fim; d = somaDias(d, 1)) a.push(Object.assign({ iso: d }, pd[d] || {})); return a; };
  const dA = lista(de, ate), dP = lista(deAnt, ateAnt);
  const atual = soma(dA), anterior = soma(dP);
  const ls = av.lista || [], noPer = (a, b) => ls.filter((r) => r.data && r.data.slice(0, 10) >= a && r.data.slice(0, 10) <= b);
  const rA = noPer(de, hojeISO()), rP = noPer(deAnt, ateAnt);
  const med = (arr) => { const c = arr.filter((r) => r.nota); return c.length ? c.reduce((t, r) => t + r.nota, 0) / c.length : null; };
  if (!av.erro) { atual.novasAval = rA.length; atual.notaPeriodo = med(rA); anterior.novasAval = rP.length; anterior.notaPeriodo = med(rP); }
  const end = info.storefrontAddress || {};
  const mt = info.metadata || {};
  const antes = new Map(tP.map((t) => [t.termo, t.v]));
  const mesTxt = (o) => String(o.month).padStart(2, "0") + "/" + o.year;
  return {
    dias, periodo: { de, ate }, atraso: ATRASO,
    perfil: {
      id, nome: info.title || "", categoria: info.categories && info.categories.primaryCategory && info.categories.primaryCategory.displayName,
      endereco: [(end.addressLines || []).join(", "), end.sublocality, end.locality].filter(Boolean).join(" · "),
      site: info.websiteUri || "", maps: mt.mapsUri || "", pedirAvaliacao: mt.newReviewUri || "",
      nota: av.media != null ? av.media : null, avaliacoes: av.total != null ? av.total : null
    },
    atual, anterior,
    diario: dA.map((d) => { const t = soma([d]); return { data: d.iso.replace(/-/g, ""), visualizacoes: t.visualizacoes, acoes: t.acoes, rotas: t.rotas, ligacoes: t.ligacoes, site: t.site }; }),
    termos: tA.sort((a, b) => (b.v || b.menosDe || 0) - (a.v || a.menosDe || 0)).slice(0, 40).map((t) => Object.assign(t, { antes: antes.has(t.termo) ? antes.get(t.termo) : undefined })),
    termosMeses: M.atual.de.month === M.atual.ate.month ? mesTxt(M.atual.ate) : mesTxt(M.atual.de) + " a " + mesTxt(M.atual.ate),
    avaliacoes: av.erro ? { erro: av.erro } : {
      media: av.media, total: av.total,
      semResposta: ls.filter((r) => !r.respondida).length,
      semRespostaRuins: ls.filter((r) => !r.respondida && r.nota && r.nota <= 3).length,
      dist: [5, 4, 3, 2, 1].map((n) => ({ n, q: ls.filter((r) => r.nota === n).length })),
      lidas: ls.length,
      ultimas: ls.slice(0, 8)
    }
  };
}

/* ---------- todas as unidades de uma marca ---------- */
async function emLotes(itens, n, fn) { const out = []; for (let i = 0; i < itens.length; i += n) out.push(...(await Promise.all(itens.slice(i, i + n).map(fn)))); return out; }
async function grupo(chave, nome, unidades, dias) {
  const res = await emLotes(unidades, 4, (u) => dados(u.id, dias).then((d) => Object.assign(d, { _nome: u.nome }), (e) => ({ _nome: u.nome, _erro: String(e.message || e) })));
  const ok = res.filter((r) => !r._erro);
  if (!ok.length) throw new Error(res[0] ? res[0]._erro : "Nenhuma unidade respondeu.");
  const somaT = (q) => {
    const t = {};
    ok.forEach((r) => Object.keys(r[q]).forEach((k) => { if (k !== "notaPeriodo" && typeof r[q][k] === "number") t[k] = (t[k] || 0) + r[q][k]; }));
    const c = ok.filter((r) => r[q].novasAval > 0 && r[q].notaPeriodo != null);
    if (ok.some((r) => r[q].novasAval != null)) t.notaPeriodo = c.length ? c.reduce((s, r) => s + r[q].notaPeriodo * r[q].novasAval, 0) / c.reduce((s, r) => s + r[q].novasAval, 0) : null;
    return t;
  };
  const dia = new Map();
  ok.forEach((r) => r.diario.forEach((d) => { const x = dia.get(d.data) || { data: d.data }; Object.keys(d).forEach((k) => { if (k !== "data") x[k] = (x[k] || 0) + d[k]; }); dia.set(d.data, x); }));
  const tm = new Map();
  ok.forEach((r) => r.termos.forEach((t) => {
    const x = tm.get(t.termo) || { termo: t.termo, v: null, menosDe: null, antes: undefined };
    if (t.v != null) x.v = (x.v || 0) + t.v; else if (t.menosDe != null && x.v == null) x.menosDe = Math.max(x.menosDe || 0, t.menosDe);
    if (t.antes != null) x.antes = (x.antes || 0) + t.antes;
    tm.set(t.termo, x);
  }));
  const avs = ok.map((r) => r.avaliacoes).filter((a) => a && !a.erro);
  const totAv = avs.reduce((s, a) => s + (a.total || 0), 0);
  const avaliacoes = avs.length ? {
    media: totAv ? avs.reduce((s, a) => s + (a.media || 0) * (a.total || 0), 0) / totAv : null, total: totAv,
    semResposta: avs.reduce((s, a) => s + a.semResposta, 0), semRespostaRuins: avs.reduce((s, a) => s + a.semRespostaRuins, 0),
    dist: [5, 4, 3, 2, 1].map((n) => ({ n, q: avs.reduce((s, a) => s + (a.dist.find((d) => d.n === n) || { q: 0 }).q, 0) })),
    lidas: avs.reduce((s, a) => s + a.lidas, 0),
    ultimas: ok.flatMap((r) => (r.avaliacoes && r.avaliacoes.ultimas ? r.avaliacoes.ultimas.map((u) => Object.assign({ unidade: r._nome }, u)) : [])).sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 10)
  } : { erro: "Não deu para ler as avaliações das unidades." };
  const p0 = ok[0];
  return {
    dias, periodo: p0.periodo, atraso: p0.atraso, todas: true,
    perfil: { id: "g_" + chave, nome: nome + " · todas as unidades", categoria: p0.perfil.categoria, endereco: ok.length + " unidades" + (res.length > ok.length ? " (" + (res.length - ok.length) + " sem dados)" : ""), nota: avaliacoes.media, avaliacoes: avaliacoes.total },
    atual: somaT("atual"), anterior: somaT("anterior"),
    diario: [...dia.values()].sort((a, b) => a.data.localeCompare(b.data)),
    termos: [...tm.values()].sort((a, b) => (b.v || b.menosDe || 0) - (a.v || a.menosDe || 0)).slice(0, 40),
    termosMeses: p0.termosMeses,
    avaliacoes,
    unidades: res.map((r) => r._erro ? { nome: r._nome, erro: r._erro } : {
      nome: r._nome, id: r.perfil.id, visualizacoes: r.atual.visualizacoes, acoes: r.atual.acoes, acoesAnt: r.anterior.acoes,
      rotas: r.atual.rotas, ligacoes: r.atual.ligacoes, site: r.atual.site,
      nota: r.avaliacoes && r.avaliacoes.media, avaliacoes: r.avaliacoes && r.avaliacoes.total, novasAval: r.atual.novasAval,
      semResposta: r.avaliacoes && r.avaliacoes.semResposta, semRespostaRuins: r.avaliacoes && r.avaliacoes.semRespostaRuins
    })
  };
}

const FALTA = ["GADS_CLIENT_ID", "GADS_CLIENT_SECRET"].filter((k) => !process.env[k]).concat(REFRESH ? [] : ["GBP_REFRESH_TOKEN"]);
const cache = new Map();
export default (req) => portaria(req, FALTA.length ? "Faltam nas variáveis da Netlify: " + FALTA.join(", ") + "." : null, async (url) => {
  const parte = url.searchParams.get("parte"), dias = DIAS_OK(url.searchParams.get("dias")), id = String(url.searchParams.get("conta") || "").replace(/[^\d_]/g, "");
  const chave = parte === "contas" ? "contas" : String(url.searchParams.get("conta") || "") + "|" + dias, c = cache.get(chave);
  if (c && Date.now() - c.t < (parte === "contas" ? 30 : 10) * 60e3) return c.v;
  let v;
  if (parte === "contas") v = await contas();
  else {
    if (!cache.get("contas")) cache.set("contas", { t: Date.now(), v: await contas() });
    const lista = cache.get("contas").v.locais;
    const esc = String(url.searchParams.get("conta") || "");
    if (/^g_[a-z0-9]+$/.test(esc)) {
      const g = lista.find((x) => x.id === esc), un = lista.filter((x) => !x.todas && "g_" + x.grupo === esc);
      if (!g || !un.length) throw new Error("Escolha um perfil da lista.");
      v = await grupo(esc.slice(2), g.nome.split(" · ")[0], un, dias);
    } else {
      if (!lista.some((x) => x.id === id)) throw new Error("Escolha um perfil da lista.");
      v = await dados(id, dias);
    }
  }
  cache.set(chave, { t: Date.now(), v });
  return v;
});

export const config = { path: "/api/gbp" };
