/* Indicadores · Google Ads
   Ponte entre o Fluxo do Time e a API do Google Ads.

   Variáveis de ambiente na Netlify (todas como secret, menos as duas últimas):
     GADS_DEVELOPER_TOKEN     token de desenvolvedor (Central de API da conta de administrador)
     GADS_CLIENT_ID           ID do cliente OAuth (Google Cloud)
     GADS_CLIENT_SECRET       chave secreta do cliente OAuth
     GADS_REFRESH_TOKEN       token de atualização gerado no OAuth Playground
     GADS_LOGIN_CUSTOMER_ID   opcional: ID da conta de administrador (MCC), ex: 123-456-7890
     GADS_CONTAS              opcional. Uma linha por cliente: "Nome | 123-456-7890".
                              Sem ela, a função lista as contas que o login enxerga.

   GET /api/gads?parte=contas
   GET /api/gads?parte=dados&conta=1234567890&dias=28 */

import { portaria, periodos, DIAS_OK } from "../lib/acesso.mjs";

const VERSOES = process.env.GADS_API_VERSION ? [process.env.GADS_API_VERSION] : ["v25", "v26", "v24", "v23"];
let versao = null; // a primeira que responder fica guardada
const soNum = (s) => String(s || "").replace(/\D/g, "");
const MCC = soNum(process.env.GADS_LOGIN_CUSTOMER_ID);

/* ---------- token (OAuth com refresh token) ---------- */
let tok = null;
async function token() {
  if (tok && tok.exp > Date.now() + 60000) return tok.v;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: process.env.GADS_CLIENT_ID, client_secret: process.env.GADS_CLIENT_SECRET, refresh_token: process.env.GADS_REFRESH_TOKEN })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error === "invalid_grant" ? "O login do Google Ads venceu. Gere um novo refresh token no OAuth Playground e troque o GADS_REFRESH_TOKEN." : "Google recusou o login: " + (d.error_description || d.error || r.status));
  tok = { v: d.access_token, exp: Date.now() + d.expires_in * 1000 };
  return tok.v;
}

function erroAds(d, status) {
  const det = d && d.error && d.error.details && d.error.details[0] && d.error.details[0].errors && d.error.details[0].errors[0];
  const cod = det && det.errorCode ? Object.values(det.errorCode)[0] : "";
  if (cod === "DEVELOPER_TOKEN_NOT_APPROVED") return "O token de desenvolvedor ainda está em modo de teste. Peça o Acesso básico na Central de API do Google Ads.";
  if (cod === "USER_PERMISSION_DENIED") return "Este login não tem acesso a esta conta. Confira o GADS_LOGIN_CUSTOMER_ID (a conta de administrador) e se a conta do cliente está ligada a ela.";
  if (cod === "CUSTOMER_NOT_ENABLED") return "Esta conta do Google Ads está desativada ou cancelada.";
  return (det && det.message) || (d && d.error && d.error.message) || "Google Ads respondeu " + status;
}
async function chama(caminho, corpo, cid) {
  const h = { authorization: "Bearer " + (await token()), "developer-token": process.env.GADS_DEVELOPER_TOKEN, "content-type": "application/json" };
  if (MCC && cid !== MCC) h["login-customer-id"] = MCC;
  for (const v of versao ? [versao] : VERSOES) {
    const r = await fetch("https://googleads.googleapis.com/" + v + "/" + caminho, { method: corpo ? "POST" : "GET", headers: h, body: corpo ? JSON.stringify(corpo) : undefined });
    if (r.status === 404 && !versao) continue; // versão já desligada: tenta a próxima
    versao = v;
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(erroAds(d, r.status));
    return d;
  }
  throw new Error("Nenhuma versão da API do Google Ads respondeu. Defina GADS_API_VERSION com a versão atual.");
}
async function gaql(cid, q) {
  const out = []; let pageToken;
  do {
    const d = await chama("customers/" + cid + "/googleAds:search", { query: q, pageToken }, cid);
    out.push(...(d.results || [])); pageToken = d.nextPageToken;
  } while (pageToken && out.length < 2000);
  return out;
}

/* ---------- contas ---------- */
async function contas() {
  const fixas = String(process.env.GADS_CONTAS || "").split(/\r?\n|;/).map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0] && soNum(p[1]));
  if (fixas.length) return { contas: fixas.map(([nome, id]) => ({ id: soNum(id), nome })) };
  if (MCC) {
    const r = await gaql(MCC, "SELECT customer_client.id, customer_client.descriptive_name, customer_client.status FROM customer_client WHERE customer_client.manager = false AND customer_client.status = 'ENABLED'");
    return { contas: r.map((x) => ({ id: String(x.customerClient.id), nome: x.customerClient.descriptiveName || String(x.customerClient.id) })) };
  }
  const l = await chama("customers:listAccessibleCustomers");
  const ids = (l.resourceNames || []).map((n) => n.split("/")[1]);
  const nomes = await Promise.all(ids.map((id) => gaql(id, "SELECT customer.descriptive_name, customer.manager FROM customer LIMIT 1").then((r) => r[0] && r[0].customer, () => null)));
  return { contas: ids.map((id, i) => ({ id, nome: (nomes[i] && nomes[i].descriptiveName) || id, mcc: nomes[i] && nomes[i].manager })).filter((c) => !c.mcc && c.nome) };
}

/* ---------- dados da conta ---------- */
const N = (v) => (v == null ? 0 : Number(v));
const micros = (v) => N(v) / 1e6;
const entre = (p) => "segments.date BETWEEN '" + p.de + "' AND '" + p.ate + "'";
const TIPO = { SEARCH: "Pesquisa", PERFORMANCE_MAX: "Performance Max", DISPLAY: "Display", VIDEO: "YouTube", SHOPPING: "Shopping", DEMAND_GEN: "Demand Gen", LOCAL: "Local", SMART: "Inteligente", MULTI_CHANNEL: "App" };
function totais(r) {
  const m = (r[0] && r[0].metrics) || {};
  return { custo: micros(m.costMicros), impressoes: N(m.impressions), cliques: N(m.clicks), conversoes: N(m.conversions), valorConv: N(m.conversionsValue) };
}
async function dados(cid, dias) {
  const { atual, anterior } = periodos(dias);
  const TOT = "SELECT metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM customer WHERE ";
  const CAMP = "SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign_budget.amount_micros, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value";
  const IS = ", metrics.search_impression_share, metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share";
  const ONDE = " FROM campaign WHERE " + entre(atual) + " AND campaign.status != 'REMOVED' AND metrics.impressions > 0 ORDER BY metrics.cost_micros DESC LIMIT 15";
  const [cli, tA, tP, dia, camp, termos] = await Promise.all([
    gaql(cid, "SELECT customer.descriptive_name, customer.currency_code FROM customer LIMIT 1"),
    gaql(cid, TOT + entre(atual)), gaql(cid, TOT + entre(anterior)),
    gaql(cid, "SELECT segments.date, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM customer WHERE " + entre(atual) + " ORDER BY segments.date"),
    gaql(cid, CAMP + IS + ONDE).catch(() => gaql(cid, CAMP + ONDE)), // parcela de impressões só existe em algumas campanhas
    gaql(cid, "SELECT search_term_view.search_term, metrics.clicks, metrics.impressions, metrics.conversions, metrics.cost_micros FROM search_term_view WHERE " + entre(atual) + " AND metrics.clicks > 0 ORDER BY metrics.cost_micros DESC LIMIT 20").catch(() => [])
  ]);
  const c = (cli[0] && cli[0].customer) || {};
  const pct = (v) => (v == null ? null : Number(v) * 100);
  return {
    dias, periodo: atual,
    conta: { id: cid, nome: c.descriptiveName || cid, moeda: c.currencyCode || "BRL" },
    atual: totais(tA), anterior: totais(tP),
    diario: dia.map((r) => ({ data: r.segments.date.replace(/-/g, ""), custo: micros(r.metrics.costMicros), cliques: N(r.metrics.clicks), conversoes: N(r.metrics.conversions) })),
    campanhas: camp.map((r) => ({
      id: r.campaign.id, nome: r.campaign.name, status: r.campaign.status, tipo: TIPO[r.campaign.advertisingChannelType] || r.campaign.advertisingChannelType,
      orcDia: r.campaignBudget ? micros(r.campaignBudget.amountMicros) : null,
      custo: micros(r.metrics.costMicros), impressoes: N(r.metrics.impressions), cliques: N(r.metrics.clicks), conversoes: N(r.metrics.conversions), valorConv: N(r.metrics.conversionsValue),
      parcela: pct(r.metrics.searchImpressionShare), perdaOrc: pct(r.metrics.searchBudgetLostImpressionShare), perdaRank: pct(r.metrics.searchRankLostImpressionShare)
    })),
    termos: termos.map((r) => ({ termo: r.searchTermView.searchTerm, cliques: N(r.metrics.clicks), impressoes: N(r.metrics.impressions), conversoes: N(r.metrics.conversions), custo: micros(r.metrics.costMicros) }))
  };
}

const FALTA = ["GADS_DEVELOPER_TOKEN", "GADS_CLIENT_ID", "GADS_CLIENT_SECRET", "GADS_REFRESH_TOKEN"].filter((k) => !process.env[k]);
const cache = new Map();
export default (req) => portaria(req, FALTA.length ? "Faltam nas variáveis da Netlify: " + FALTA.join(", ") + "." : null, async (url) => {
  const parte = url.searchParams.get("parte"), dias = DIAS_OK(url.searchParams.get("dias")), cid = soNum(url.searchParams.get("conta"));
  const chave = parte === "contas" ? "contas" : cid + "|" + dias, c = cache.get(chave);
  if (c && Date.now() - c.t < (parte === "contas" ? 30 : 5) * 60e3) return c.v;
  let v;
  if (parte === "contas") v = await contas();
  else {
    if (!cache.get("contas")) cache.set("contas", { t: Date.now(), v: await contas() });
    const lista = cache.get("contas").v.contas;
    if (!lista.some((x) => x.id === cid)) throw new Error("Escolha uma conta do Google Ads.");
    v = await dados(cid, dias);
  }
  cache.set(chave, { t: Date.now(), v });
  return v;
});

export const config = { path: "/api/gads" };
