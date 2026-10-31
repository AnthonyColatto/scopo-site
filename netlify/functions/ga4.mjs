/* Indicadores · Site (GA4)
   Ponte entre o Fluxo do Time e a Google Analytics Data API.

   A chave da conta de serviço mora só aqui, em variáveis de ambiente da Netlify:
     GA4_CREDENTIALS   conteúdo inteiro do JSON da conta de serviço (marcar como secret)
     GA4_PROPERTY_ID   número da propriedade GA4 (ex: 412345678)
     GA4_SITE_NOME     opcional, nome exibido (ex: alvoradams.com.br)

   Quem chama precisa estar logado no Fluxo do Time (token do Supabase) e ser admin
   ou ter permissão de ver Indicadores. Nada da chave do Google chega ao navegador.

   GET /api/ga4?parte=agora               tempo real (últimos 30 minutos)
   GET /api/ga4?parte=periodo&dias=28     período, comparado com o período anterior */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mooqaphunigosvbgyxdb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_ejtkxZejpP9YcHZH60ehWw_9huIuRHC";
const GA = "https://analyticsdata.googleapis.com/v1beta/properties/";

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" }
});

/* ---------- quem está pedindo ---------- */
async function autorizado(req) {
  const tok = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!tok) return false;
  const h = { apikey: SUPABASE_KEY, authorization: "Bearer " + tok };
  const u = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: h });
  if (!u.ok) return false;
  const email = String((await u.json()).email || "").toLowerCase();
  if (!email) return false;
  const p = await fetch(SUPABASE_URL + "/rest/v1/fluxo_perfis?select=papel,permissoes&email=eq." + encodeURIComponent(email), { headers: h });
  if (!p.ok) return false;
  const perfil = (await p.json())[0];
  if (!perfil) return false;
  if (perfil.papel === "admin") return true;
  const v = (perfil.permissoes || {}).indicadores;
  return v === "ver" || v === "editar";
}

/* ---------- token do Google (conta de serviço, JWT assinado aqui) ---------- */
let googleTok = null;
const b64url = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
async function tokenGoogle() {
  if (googleTok && googleTok.exp > Date.now() + 60000) return googleTok.v;
  const cred = JSON.parse(process.env.GA4_CREDENTIALS);
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({ iss: cred.client_email, scope: "https://www.googleapis.com/auth/analytics.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const { createSign } = await import("node:crypto");
  const sig = b64url(createSign("RSA-SHA256").update(head + "." + claim).sign(cred.private_key));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: head + "." + claim + "." + sig })
  });
  const d = await r.json();
  if (!r.ok) throw new Error("Google recusou a conta de serviço: " + (d.error_description || d.error || r.status));
  googleTok = { v: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return googleTok.v;
}
async function ga(metodo, corpo) {
  const r = await fetch(GA + process.env.GA4_PROPERTY_ID + ":" + metodo, {
    method: "POST",
    headers: { authorization: "Bearer " + (await tokenGoogle()), "content-type": "application/json" },
    body: JSON.stringify(corpo)
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || "GA4 respondeu " + r.status);
  return d;
}

/* ---------- formatos de saída enxutos ---------- */
const num = (v) => (v == null ? null : Number(v));
const linhas = (rep) => (rep.rows || []).map((r) => ({
  d: (r.dimensionValues || []).map((x) => x.value),
  m: (r.metricValues || []).map((x) => num(x.value))
}));

async function agora() {
  const top = (dim, n) => ga("runRealtimeReport", { dimensions: [{ name: dim }], metrics: [{ name: "activeUsers" }], limit: n, orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }] });
  const [total, minutos, paginas, aparelhos, cidades] = await Promise.all([
    ga("runRealtimeReport", { metrics: [{ name: "activeUsers" }, { name: "screenPageViews" }] }),
    ga("runRealtimeReport", { dimensions: [{ name: "minutesAgo" }], metrics: [{ name: "activeUsers" }], limit: 30 }),
    top("unifiedScreenName", 6),
    top("deviceCategory", 4),
    top("city", 6)
  ]);
  const t = linhas(total)[0];
  const serie = new Array(30).fill(0);
  linhas(minutos).forEach((r) => { const i = Number(r.d[0]); if (i >= 0 && i < 30) serie[29 - i] = r.m[0]; }); // mais antigo → agora
  const lista = (rep) => linhas(rep).map((r) => ({ nome: r.d[0], v: r.m[0] }));
  return {
    usuarios: t ? t.m[0] : 0,
    views: t ? t.m[1] : 0,
    porMinuto: serie,
    paginas: lista(paginas),
    aparelhos: lista(aparelhos),
    cidades: lista(cidades).filter((c) => c.nome && c.nome !== "(not set)")
  };
}

const METRICAS = ["activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate", "averageSessionDuration", "keyEvents"];
async function periodo(dias) {
  const atual = { startDate: dias + "daysAgo", endDate: "today", name: "atual" };
  const ant = { startDate: dias * 2 + "daysAgo", endDate: dias + 1 + "daysAgo", name: "anterior" };
  const lim = (dim, met, n) => ({ dateRanges: [atual], dimensions: [{ name: dim }], metrics: [{ name: met }], limit: n, orderBys: [{ metric: { metricName: met }, desc: true }] });
  const b = await ga("batchRunReports", {
    requests: [
      { dateRanges: [atual, ant], metrics: METRICAS.map((name) => ({ name })) },
      { dateRanges: [atual], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }], orderBys: [{ dimension: { dimensionName: "date" } }], limit: 400 },
      { dateRanges: [atual, ant], dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], limit: 40, orderBys: [{ metric: { metricName: "sessions" }, desc: true }] },
      lim("pagePath", "screenPageViews", 8),
      lim("city", "activeUsers", 8)
    ]
  });
  const [tot, dia, canais, paginas, cidades] = b.reports;
  // com duas datas, o GA devolve uma linha por período, marcada pela dimensão dateRange
  const porPeriodo = {};
  linhas(tot).forEach((r) => { porPeriodo[r.d[0] || "atual"] = r.m; });
  const obj = (arr) => Object.fromEntries(METRICAS.map((k, i) => [k, arr ? arr[i] : null]));
  const lista = (rep) => linhas(rep).map((r) => ({ nome: r.d[0], v: r.m[0] }));
  // canais: separa o período atual do anterior (a 2ª dimensão é o nome do período)
  const canaisAtual = [], canaisAnt = {};
  linhas(canais).forEach((r) => { if (r.d[1] === "anterior") canaisAnt[r.d[0]] = r.m[0]; else canaisAtual.push({ nome: r.d[0], v: r.m[0] }); });
  return {
    dias,
    atual: obj(porPeriodo.atual),
    anterior: obj(porPeriodo.anterior),
    diario: linhas(dia).map((r) => ({ data: r.d[0], usuarios: r.m[0], sessoes: r.m[1], views: r.m[2] })),
    canais: canaisAtual.slice(0, 8),
    canaisAnt,
    paginas: lista(paginas),
    cidades: lista(cidades).filter((c) => c.nome && c.nome !== "(not set)")
  };
}

export default async (req) => {
  if (req.method !== "GET") return json(405, { erro: "Método não permitido" });
  if (!process.env.GA4_CREDENTIALS || !process.env.GA4_PROPERTY_ID) return json(503, { erro: "config", msg: "Faltam GA4_CREDENTIALS e/ou GA4_PROPERTY_ID nas variáveis da Netlify." });
  try {
    if (!(await autorizado(req))) return json(401, { erro: "acesso", msg: "Entre no Fluxo do Time com um usuário que vê Indicadores." });
  } catch (e) {
    return json(502, { erro: "login", msg: "Não deu para conferir o login agora." });
  }
  const url = new URL(req.url);
  const site = process.env.GA4_SITE_NOME || "";
  try {
    if (url.searchParams.get("parte") === "agora") return json(200, Object.assign({ site, em: new Date().toISOString() }, await agora()));
    const dias = [7, 28, 90].includes(Number(url.searchParams.get("dias"))) ? Number(url.searchParams.get("dias")) : 28;
    return json(200, Object.assign({ site, em: new Date().toISOString() }, await periodo(dias)));
  } catch (e) {
    return json(502, { erro: "ga4", msg: String(e.message || e) });
  }
};

export const config = { path: "/api/ga4" };
