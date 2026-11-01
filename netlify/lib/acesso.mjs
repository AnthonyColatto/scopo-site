/* Peças comuns das funções dos Indicadores (Meta, Google Ads):
   resposta em JSON e conferência de quem está pedindo (login do Fluxo do Time). */

const SUPABASE_URL = process.env.SUPABASE_URL || "https://mooqaphunigosvbgyxdb.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_ejtkxZejpP9YcHZH60ehWw_9huIuRHC";

export const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" }
});

// admin, ou quem tem permissão de ver Indicadores
export async function autorizado(req) {
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

// porta de entrada: confere método, configuração e login antes de rodar `fn`
export async function portaria(req, faltando, fn) {
  if (req.method !== "GET") return json(405, { erro: "Método não permitido" });
  if (faltando) return json(503, { erro: "config", msg: faltando });
  try {
    if (!(await autorizado(req))) return json(401, { erro: "acesso", msg: "Entre no Fluxo do Time com um usuário que vê Indicadores." });
  } catch (e) {
    return json(502, { erro: "login", msg: "Não deu para conferir o login agora." });
  }
  try {
    return json(200, Object.assign({ em: new Date().toISOString() }, await fn(new URL(req.url))));
  } catch (e) {
    return json(502, { erro: "api", msg: String((e && e.message) || e) });
  }
}

/* ---------- datas (fuso de Mato Grosso do Sul) ---------- */
const FUSO = process.env.FUSO || "America/Campo_Grande";
export function hojeISO() { return new Date().toLocaleDateString("en-CA", { timeZone: FUSO }); } // AAAA-MM-DD
export function somaDias(iso, n) { const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
// período atual = últimos `dias` dias até hoje; anterior = os `dias` dias antes dele
export function periodos(dias) {
  const ate = hojeISO(), de = somaDias(ate, -(dias - 1));
  return { atual: { de, ate }, anterior: { de: somaDias(de, -dias), ate: somaDias(de, -1) } };
}
export const DIAS_OK = (v) => ([7, 28, 90].includes(Number(v)) ? Number(v) : 28);
