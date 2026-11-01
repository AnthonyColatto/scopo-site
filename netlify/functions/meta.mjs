/* Indicadores · Instagram e Meta Ads
   Ponte entre o Fluxo do Time e a Graph API da Meta.

   Variáveis de ambiente na Netlify:
     META_TOKEN         token de longa duração do Usuário do sistema do Business (marcar como secret)
     META_CONTAS        opcional. Uma linha por cliente: "Nome | conta de anúncios | id do Instagram"
                        ex: Alvorada | act_1234567890 | 17841400000000000
                        Use "-" quando o cliente não tiver uma das duas. Sem esta variável,
                        a função lista sozinha tudo o que o token enxerga.
     META_API_VERSION   opcional (padrão v24.0)

   Quem chama precisa estar logado no Fluxo do Time e ver Indicadores. O token nunca chega ao navegador.

   GET /api/meta?parte=contas
   GET /api/meta?parte=instagram&conta=<id do IG>&dias=28
   GET /api/meta?parte=anuncios&conta=act_<id>&dias=28 */

import { portaria, periodos, somaDias, DIAS_OK } from "../lib/acesso.mjs";

const V = process.env.META_API_VERSION || "v24.0";
const GRAPH = "https://graph.facebook.com/" + V + "/";

/* ---------- chamadas à Graph API ---------- */
function erroMeta(e, status) {
  const c = e && e.code;
  if (c === 190) return "O token da Meta venceu ou foi revogado. Gere um novo no Usuário do sistema e troque o META_TOKEN na Netlify.";
  if (c === 10 || c === 200 || (c >= 200 && c < 300)) return "O token não tem permissão para esta conta. No Business, atribua a conta ao Usuário do sistema e gere o token com as permissões do passo a passo.";
  if (c === 4 || c === 17 || c === 32 || c === 613) return "A Meta pediu uma pausa (limite de consultas). Tente de novo em alguns minutos.";
  return (e && (e.error_user_msg || e.message)) || "A Meta respondeu " + status;
}
async function graph(caminho, params) {
  const u = new URL(caminho.startsWith("http") ? caminho : GRAPH + caminho);
  Object.entries(params || {}).forEach(([k, v]) => { if (v != null) u.searchParams.set(k, typeof v === "object" ? JSON.stringify(v) : v); });
  u.searchParams.set("access_token", process.env.META_TOKEN);
  const r = await fetch(u);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) { const err = new Error(erroMeta(d.error, r.status)); err.meta = d.error; throw err; }
  return d;
}
const tenta = (p, padrao) => p.catch(() => padrao); // partes opcionais não derrubam o painel

// cache curto na memória da função: o painel recarrega a cada 10 min e várias pessoas olham juntas
const cache = new Map();
async function guardado(chave, ms, fn) {
  const c = cache.get(chave);
  if (c && Date.now() - c.t < ms) return c.v;
  const v = await fn();
  cache.set(chave, { t: Date.now(), v });
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  return v;
}

/* ---------- contas ---------- */
function contasFixas() {
  return String(process.env.META_CONTAS || "").split(/\r?\n|;/).map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0])
    .map(([nome, ads, ig]) => ({ nome, ads: ads && ads !== "-" ? (/^act_/.test(ads) ? ads : "act_" + ads.replace(/\D/g, "")) : null, ig: ig && ig !== "-" ? ig.replace(/\D/g, "") : null }));
}
async function contas() {
  const fixas = contasFixas();
  if (fixas.length) {
    return {
      instagram: fixas.filter((c) => c.ig).map((c) => ({ id: c.ig, nome: c.nome })),
      anuncios: fixas.filter((c) => c.ads).map((c) => ({ id: c.ads, nome: c.nome }))
    };
  }
  const [ads, pags] = await Promise.all([
    tenta(graph("me/adaccounts", { fields: "name,account_status,currency", limit: 100 }), { data: [] }),
    tenta(graph("me/accounts", { fields: "name,instagram_business_account{id,username}", limit: 100 }), { data: [] })
  ]);
  return {
    instagram: (pags.data || []).filter((p) => p.instagram_business_account).map((p) => ({ id: p.instagram_business_account.id, nome: p.name + " · @" + p.instagram_business_account.username })),
    anuncios: (ads.data || []).filter((a) => a.account_status !== 101).map((a) => ({ id: a.id, nome: a.name }))
  };
}
async function confere(lista, id) { // só aceita contas que o painel listaria
  const c = await guardado("contas", 30 * 60e3, contas);
  if (!c[lista].some((x) => x.id === id)) throw new Error("Conta não encontrada para este token: " + id);
}

/* ---------- Instagram ---------- */
// limites do dia em MS (UTC-4), em segundos, como a API pede
const ts = (iso) => Math.floor(new Date(iso + "T04:00:00Z").getTime() / 1000);
function janelas(de, ate) { // a API de insights aceita no máximo 30 dias por consulta
  const out = []; let a = de;
  while (a <= ate) { const b = [somaDias(a, 29), ate].sort()[0]; out.push({ since: ts(a), until: Math.min(ts(somaDias(b, 1)), Math.floor(Date.now() / 1000)) }); a = somaDias(b, 1); }
  return out;
}
const IG_TOTAIS = ["reach", "views", "accounts_engaged", "total_interactions", "likes", "comments", "shares", "saves", "profile_links_taps"];
async function igTotais(ig, per) {
  const soma = {};
  const umaJanela = async (j) => {
    let data;
    try { data = (await graph(ig + "/insights", { metric: IG_TOTAIS.join(","), period: "day", metric_type: "total_value", since: j.since, until: j.until })).data; }
    catch (e) { // uma métrica fora do ar derruba a consulta toda: pede uma por uma
      data = (await Promise.all(IG_TOTAIS.map((m) => tenta(graph(ig + "/insights", { metric: m, period: "day", metric_type: "total_value", since: j.since, until: j.until }).then((d) => d.data), [])))).flat();
    }
    (data || []).forEach((x) => { const v = x.total_value && x.total_value.value; if (v != null) soma[x.name] = (soma[x.name] || 0) + v; });
    const f = await tenta(graph(ig + "/insights", { metric: "follows_and_unfollows", period: "day", metric_type: "total_value", breakdown: "follow_type", since: j.since, until: j.until }), null);
    const br = f && f.data && f.data[0] && f.data[0].total_value && f.data[0].total_value.breakdowns;
    ((br && br[0] && br[0].results) || []).forEach((r) => {
      const k = r.dimension_values && r.dimension_values[0];
      if (k === "FOLLOWER") soma.follows = (soma.follows || 0) + r.value;
      if (k === "NON_FOLLOWER") soma.unfollows = (soma.unfollows || 0) + r.value;
    });
  };
  const js = janelas(per.de, per.ate);
  await Promise.all(js.map(umaJanela));
  return {
    alcance: soma.reach ?? null, views: soma.views ?? null, contasEngajadas: soma.accounts_engaged ?? null, interacoes: soma.total_interactions ?? null,
    curtidas: soma.likes ?? null, comentarios: soma.comments ?? null, compartilhamentos: soma.shares ?? null, salvos: soma.saves ?? null,
    cliquesLink: soma.profile_links_taps ?? null, novosSeg: soma.follows ?? null, deixaram: soma.unfollows ?? null,
    aprox: js.length > 1 // alcance e contas engajadas somados por janela contam a mesma pessoa mais de uma vez
  };
}
async function igDiario(ig, per) {
  const dias = {};
  const dia = (end) => somaDias(String(end).slice(0, 10), -1).replace(/-/g, ""); // end_time é o fim do dia
  await Promise.all(janelas(per.de, per.ate).map(async (j) => {
    const r = await tenta(graph(ig + "/insights", { metric: "reach", period: "day", since: j.since, until: j.until }), { data: [] });
    ((r.data[0] || {}).values || []).forEach((v) => { (dias[dia(v.end_time)] = dias[dia(v.end_time)] || {}).alcance = v.value; });
    const f = await tenta(graph(ig + "/insights", { metric: "follower_count", period: "day", since: j.since, until: j.until }), { data: [] });
    ((f.data[0] || {}).values || []).forEach((v) => { (dias[dia(v.end_time)] = dias[dia(v.end_time)] || {}).seguidores = v.value; });
  }));
  const ini = per.de.replace(/-/g, ""), fim = per.ate.replace(/-/g, "");
  return Object.keys(dias).filter((d) => d >= ini && d <= fim).sort().map((d) => ({ data: d, alcance: dias[d].alcance ?? 0, seguidores: dias[d].seguidores ?? 0 }));
}
async function igPosts(ig, per, ant) {
  const lista = [];
  let url = ig + "/media", params = { fields: "id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp,like_count,comments_count", limit: 50 };
  for (let pag = 0; pag < 6 && url; pag++) { // volta até o começo do período anterior
    const d = await graph(url, params);
    lista.push(...(d.data || []));
    const ult = lista[lista.length - 1];
    if (!ult || ult.timestamp.slice(0, 10) < ant.de) break;
    url = d.paging && d.paging.next; params = null;
  }
  const doDia = (p) => new Date(p.timestamp).toLocaleDateString("en-CA", { timeZone: "America/Campo_Grande" });
  const atuais = lista.filter((p) => doDia(p) >= per.de && doDia(p) <= per.ate).slice(0, 60);
  const anteriores = lista.filter((p) => doDia(p) >= ant.de && doDia(p) <= ant.ate);
  const insights = async (p) => {
    const pede = (ms) => graph(p.id + "/insights", { metric: ms }).then((d) => Object.fromEntries((d.data || []).map((x) => [x.name, x.values && x.values[0] ? x.values[0].value : x.total_value && x.total_value.value])));
    return pede("reach,views,saved,shares,total_interactions").catch(() => tenta(pede("reach,saved,shares,total_interactions"), {}));
  };
  const ins = await Promise.all(atuais.map(insights));
  const tipo = (p) => (p.media_product_type === "REELS" ? "REELS" : p.media_type === "CAROUSEL_ALBUM" ? "CARROSSEL" : p.media_type === "VIDEO" ? "VIDEO" : "FOTO");
  return {
    posts: atuais.map((p, i) => {
      const x = ins[i] || {};
      return {
        id: p.id, tipo: tipo(p), legenda: String(p.caption || "").slice(0, 160), link: p.permalink,
        thumb: p.media_type === "VIDEO" ? p.thumbnail_url || null : p.media_url || p.thumbnail_url || null,
        data: p.timestamp, curtidas: p.like_count ?? null, comentarios: p.comments_count ?? null,
        alcance: x.reach ?? null, views: x.views ?? null, salvos: x.saved ?? null, compart: x.shares ?? null,
        interacoes: x.total_interactions ?? ((p.like_count || 0) + (p.comments_count || 0))
      };
    }),
    postsAnterior: anteriores.length
  };
}
async function instagram(ig, dias) {
  const { atual, anterior } = periodos(dias);
  const [perfil, tAtual, tAnt, diario, posts] = await Promise.all([
    graph(ig, { fields: "username,name,profile_picture_url,followers_count,follows_count,media_count" }),
    igTotais(ig, atual), igTotais(ig, anterior), igDiario(ig, atual), igPosts(ig, atual, anterior)
  ]);
  tAtual.posts = posts.posts.length; tAnt.posts = posts.postsAnterior;
  return {
    dias, periodo: atual,
    perfil: { usuario: perfil.username, nome: perfil.name, foto: perfil.profile_picture_url || null, seguidores: perfil.followers_count, seguindo: perfil.follows_count, totalPosts: perfil.media_count },
    atual: tAtual, anterior: tAnt, diario, posts: posts.posts
  };
}

/* ---------- Meta Ads ---------- */
const ACOES = {
  conversas: ["onsite_conversion.messaging_conversation_started_7d"],
  leads: ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"],
  compras: ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"],
  lpv: ["landing_page_view", "omni_landing_page_view"],
  engajamento: ["post_engagement", "page_engagement"]
};
function acao(lista, tipos) { // o primeiro tipo que existir (são versões do mesmo resultado; não somar)
  for (const t of tipos) { const a = (lista || []).find((x) => x.action_type === t); if (a) return Number(a.value) || 0; }
  return 0;
}
function linhaAds(r) {
  const n = (k) => (r[k] == null ? null : Number(r[k]));
  return {
    investimento: n("spend") || 0, impressoes: n("impressions") || 0, alcance: n("reach"), frequencia: n("frequency"),
    cliquesLink: n("inline_link_clicks") || 0,
    conversas: acao(r.actions, ACOES.conversas), leads: acao(r.actions, ACOES.leads), compras: acao(r.actions, ACOES.compras),
    valorCompras: acao(r.action_values, ACOES.compras), lpv: acao(r.actions, ACOES.lpv), engajamento: acao(r.actions, ACOES.engajamento)
  };
}
// o "resultado" de cada campanha depende do objetivo dela
function resultado(obj, l) {
  const o = String(obj || "");
  const ordem = /LEAD/.test(o) ? [["leads", "leads"], ["conversas", "conversas"]]
    : /SALES|CONVERSIONS|PRODUCT_CATALOG/.test(o) ? [["compras", "compras"], ["conversas", "conversas"], ["leads", "leads"]]
    : /ENGAGEMENT|MESSAGES|POST_ENGAGEMENT|PAGE_LIKES/.test(o) ? [["conversas", "conversas"], ["engajamento", "engajamentos"]]
    : /TRAFFIC|LINK_CLICKS/.test(o) ? [["lpv", "visualizações da página"], ["cliquesLink", "cliques no link"]]
    : /AWARENESS|REACH|BRAND|VIDEO_VIEWS/.test(o) ? [["alcance", "pessoas alcançadas"]]
    : [["conversas", "conversas"], ["leads", "leads"], ["compras", "compras"], ["cliquesLink", "cliques no link"]];
  for (const [k, nome] of ordem) if (l[k]) return { v: l[k], nome };
  return { v: 0, nome: ordem[0][1] };
}
const OBJETIVO = { OUTCOME_ENGAGEMENT: "Engajamento", OUTCOME_LEADS: "Cadastros", OUTCOME_SALES: "Vendas", OUTCOME_TRAFFIC: "Tráfego", OUTCOME_AWARENESS: "Reconhecimento", OUTCOME_APP_PROMOTION: "App", MESSAGES: "Mensagens", LINK_CLICKS: "Tráfego", CONVERSIONS: "Conversões", REACH: "Alcance", BRAND_AWARENESS: "Reconhecimento", POST_ENGAGEMENT: "Engajamento", LEAD_GENERATION: "Cadastros", VIDEO_VIEWS: "Visualizações de vídeo" };

async function anuncios(act, dias) {
  const { atual, anterior } = periodos(dias);
  const tr = (p) => ({ since: p.de, until: p.ate });
  const CAMPOS = "spend,impressions,reach,frequency,inline_link_clicks,actions,action_values";
  const [conta, tot, totAnt, dia, camp, campAnt, status, plat] = await Promise.all([
    graph(act, { fields: "name,currency,account_status" }),
    graph(act + "/insights", { fields: CAMPOS, time_range: tr(atual), level: "account" }),
    graph(act + "/insights", { fields: CAMPOS, time_range: tr(anterior), level: "account" }),
    graph(act + "/insights", { fields: "spend,impressions,inline_link_clicks,actions", time_range: tr(atual), time_increment: 1, level: "account", limit: 100 }),
    graph(act + "/insights", { fields: "campaign_id,campaign_name,objective," + CAMPOS, time_range: tr(atual), level: "campaign", limit: 50, sort: "spend_descending" }),
    tenta(graph(act + "/insights", { fields: "campaign_id,objective," + CAMPOS, time_range: tr(anterior), level: "campaign", limit: 50 }), { data: [] }),
    tenta(graph(act + "/campaigns", { fields: "name,effective_status,daily_budget,lifetime_budget", limit: 100 }), { data: [] }),
    tenta(graph(act + "/insights", { fields: CAMPOS, time_range: tr(atual), level: "account", breakdowns: "publisher_platform" }), { data: [] })
  ]);
  const vazio = linhaAds({});
  const sts = Object.fromEntries((status.data || []).map((c) => [c.id, c]));
  const ant = Object.fromEntries((campAnt.data || []).map((c) => { const l = linhaAds(c); return [c.campaign_id, resultado(c.objective, l).v ? l.investimento / resultado(c.objective, l).v : null]; }));
  const resTotal = (l) => l.conversas + l.leads + l.compras; // "contatos": as três formas de o cliente levantar a mão
  const A = tot.data[0] ? linhaAds(tot.data[0]) : vazio, P = totAnt.data[0] ? linhaAds(totAnt.data[0]) : vazio;
  A.contatos = resTotal(A); P.contatos = resTotal(P);
  return {
    dias, periodo: atual,
    conta: { id: act, nome: conta.name, moeda: conta.currency, ativa: conta.account_status === 1 },
    atual: A, anterior: P,
    diario: (dia.data || []).map((r) => { const l = linhaAds(r); return { data: r.date_start.replace(/-/g, ""), investimento: l.investimento, cliques: l.cliquesLink, contatos: resTotal(l) }; }),
    campanhas: (camp.data || []).map((c) => {
      const l = linhaAds(c), res = resultado(c.objective, l), s = sts[c.campaign_id] || {};
      return {
        id: c.campaign_id, nome: c.campaign_name, objetivo: OBJETIVO[c.objective] || c.objective, status: s.effective_status || null,
        orcDia: s.daily_budget ? Number(s.daily_budget) / 100 : null,
        investimento: l.investimento, impressoes: l.impressoes, alcance: l.alcance, frequencia: l.frequencia, cliques: l.cliquesLink,
        resultados: res.v, resultadoNome: res.nome, custoRes: res.v ? l.investimento / res.v : null, custoResAnt: ant[c.campaign_id] ?? null
      };
    }),
    plataformas: (plat.data || []).map((r) => { const l = linhaAds(r); return { nome: r.publisher_platform, investimento: l.investimento, impressoes: l.impressoes, cliques: l.cliquesLink, contatos: resTotal(l) }; }).filter((p) => p.investimento > 0)
  };
}

export default (req) => portaria(req, process.env.META_TOKEN ? null : "Falta o META_TOKEN nas variáveis da Netlify.", async (url) => {
  const parte = url.searchParams.get("parte"), conta = String(url.searchParams.get("conta") || "").trim(), dias = DIAS_OK(url.searchParams.get("dias"));
  if (parte === "contas") return guardado("contas", 30 * 60e3, contas);
  if (!/^(act_)?\d{5,25}$/.test(conta)) throw new Error("Escolha uma conta.");
  if (parte === "instagram") { await confere("instagram", conta); return guardado("ig|" + conta + "|" + dias, 5 * 60e3, () => instagram(conta, dias)); }
  if (parte === "anuncios") { await confere("anuncios", conta); return guardado("ads|" + conta + "|" + dias, 5 * 60e3, () => anuncios(conta, dias)); }
  throw new Error("Parte desconhecida.");
});

export const config = { path: "/api/meta" };
