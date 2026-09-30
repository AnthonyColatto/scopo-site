/* Sistema de gestão SCOPO · AM e AG
   Tudo que aparece na tela vem da base (Store). Nada fixo no código além do
   conteúdo padrão em defaults.js, usado só no primeiro uso. */
(function () {
  "use strict";

  /* ================= utilidades ================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var iso = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  var today = function () { var d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  var parse = function (s) { if (!s) return null; var p = String(s).split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); };
  var fmt = function (d) { return pad(d.getDate()) + "/" + pad(d.getMonth() + 1); };
  var DOW = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  var DOW_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  var MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var DIAS = [["diario", "Todo dia"], ["seg", "Segunda"], ["ter", "Terça"], ["qua", "Quarta"], ["qui", "Quinta"], ["sex", "Sexta"]];
  var TIPOS = [["celular", "Celular"], ["foco", "Foco"], ["rito", "Rito com time"], ["reuniao", "Reunião empresa"], ["projeto", "Projeto"], ["campo", "Campo / visita"], ["tarefa", "Tarefa"], ["combinado", "Combinado (PJ)"]];
  var STATUS = { aberto: "aberto", andamento: "em andamento", aguardando: "aguardando outro", feito: "feito" };
  var EXTRA_RESP = ["Compras", "TI", "Diretoria"];
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem("scopo.ui." + k); return v == null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("scopo.ui." + k, v); } catch (e) {} }
  };
  var byOrder = function (a, b) { return (a.ordem || 0) - (b.ordem || 0); };
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove("show"); }, 1800); }
  function copy(text) {
    var fallback = function () {
      var ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Copiado"); } catch (e) { toast("Selecione e copie"); } ta.remove();
    };
    try { navigator.clipboard.writeText(text).then(function () { toast("Copiado"); }, fallback); } catch (e) { fallback(); }
  }
  function fail(e) {
    if (e && e.code === "denied") return;
    console.error(e);
    var c = e && (e.code || ""), m = e && (e.message || "");
    toast(c === "quota_exceeded" ? "Base cheia: apague itens antigos" : c === "too_large" ? "Arquivo acima de 50 MB." : (c === "42501" || /row-level security|permission/i.test(m)) ? "Sem permissão para isso." : "Não salvou. Tente de novo.");
  }
  function initials(n) { return String(n || "?").trim().slice(0, 2).toUpperCase(); }

  /* ================= estado ================= */
  var Store = null;
  var S = { pauta: [], pessoas: [], ciclo: [], modelos: [], quadros: [], cartoes: [], config: [], eventos: [], mapas: [], nfs: [], contratos: [], orcamento: [], cooperada: [], cofre: [], visitas: [], eventos_org: [], campanhas: [], reunioes_dir: [], documentos: [], indicadores: [], midias: [], fornecedores: [] };
  var R = {}; // dados como vieram da base; S é o que esta pessoa pode ver
  var loaded = {};
  var view = LS.get("tab", "pauta");
  var me = LS.get("me", "Tony");

  function listas() {
    var c = S.config.find(function (x) { return x.id === "listas"; }) || {};
    var D = (window.GESTAO_DEFAULTS && window.GESTAO_DEFAULTS.config.listas) || {};
    return {
      contas: c.contas || D.contas || ["AM", "AG", "Ambas"],
      reunioes: c.reunioes || D.reunioes || [],
      areas: c.areas || D.areas || [],
      etiquetas: c.etiquetas || D.etiquetas || [],
      tiposEvento: c.tiposEvento || D.tiposEvento || ["Reunião", "Outro"],
      categoriasVerba: c.categoriasVerba || D.categoriasVerba || ["Outros"],
      pagamentos: c.pagamentos || D.pagamentos || ["Boleto", "PIX"],
      categoriasCofre: c.categoriasCofre || D.categoriasCofre || ["Outros"],
      lojas: c.lojas || D.lojas || [],
      setoresVisita: c.setoresVisita || D.setoresVisita || ["Limpeza"],
      tiposEventoOrg: c.tiposEventoOrg || D.tiposEventoOrg || ["Evento"],
      itensCustoEvento: c.itensCustoEvento || D.itensCustoEvento || ["Buffet"],
      canaisCampanha: c.canaisCampanha || D.canaisCampanha || ["Redes sociais"],
      checklistCampanha: c.checklistCampanha || D.checklistCampanha || [],
      categoriasDoc: c.categoriasDoc || D.categoriasDoc || ["Outros"],
      unidades: c.unidades || D.unidades || ["Coronel", "Zahran", "Bandeirantes", "Dourados", "Maracaju", "Golden"],
      categoriasFornecedor: c.categoriasFornecedor || D.categoriasFornecedor || ["Rádio", "TV", "Outdoor e OOH", "Digital", "Jornal e revista", "Gráfica e impressos", "Produção de vídeo", "Eventos e buffet", "Brindes", "PDV e materiais", "Prestador PJ", "Ferramentas", "Outros"],
      tiposMidia: c.tiposMidia || D.tiposMidia || ["Rádio", "TV", "Carro de som", "Outdoor", "Painel de LED", "Digital", "Jornal e revista", "Outro"],
      canaisTrafego: c.canaisTrafego || D.canaisTrafego || ["AM · Meta Ads", "AM · Google Ads", "AG · Meta Ads", "AG · Google Ads"]
    };
  }
  function pessoas() { return S.pessoas.slice().sort(byOrder); }
  // lista de nomes do time, sem as rotinas: membros não leem a ficha dos outros, mas precisam dos nomes
  function equipeDoc() { var c = S.config.find(function (x) { return x.id === "equipe"; }); return (c && c.lista) || []; }
  function nomes() {
    var eq = equipeDoc().map(function (e) { return e.nome; });
    var n = eq.length ? eq.slice() : [];
    pessoas().forEach(function (p) { if (n.indexOf(p.nome) < 0) n.push(p.nome); });
    return n;
  }
  function pessoaMe() { return pessoas().find(function (p) { return p.nome === me; }) || null; }
  function respOpts() { var n = nomes(); EXTRA_RESP.forEach(function (x) { if (n.indexOf(x) < 0) n.push(x); }); return n; }
  function gestor() {
    var g = pessoas().find(function (p) { return p.gestor; }); if (g) return g;
    var e = equipeDoc().find(function (x) { return x.gestor; });
    return e ? { nome: e.nome, semana: [], gestor: true } : pessoas()[0];
  }

  /* ================= acessos e permissões =================
     Espelha as regras do banco (supabase-setup.sql). No Supabase quem manda é o banco;
     aqui a tela só evita que a pessoa tente algo que vai ser recusado. */
  var FIN = ["nfs", "contratos", "orcamento", "cooperada", "indicadores", "midias", "fornecedores"];
  function acessosLista() {
    var c = S.config.find(function (x) { return x.id === "acessos"; });
    var D = window.GESTAO_DEFAULTS && window.GESTAO_DEFAULTS.config.acessos;
    return (c && c.lista) || (D && D.lista) || [];
  }
  function isAdmin() {
    if (!Store) return false;
    if (Store.mode === "supabase") return !!(Store.perfil && Store.perfil.papel === "admin");
    return acessosLista().some(function (a) { return a.nome === me && a.papel === "admin"; });
  }
  function meu(col, d) {
    d = d || {};
    if (col === "pauta") return d.resp === me || d.criadoPor === me || (d.acompanha || []).indexOf(me) >= 0;
    if (col === "cartoes") return (d.resp || []).indexOf(me) >= 0 || d.criadoPor === me || (d.acompanha || []).indexOf(me) >= 0;
    if (col === "eventos") return (d.quem || []).indexOf(me) >= 0 || d.criadoPor === me;
    if (col === "visitas") return d.resp === me || d.criadoPor === me;
    if (col === "pessoas") return d.nome === me;
    return false;
  }
  function canWrite(col, cur, next, op) {
    if (isAdmin()) return true;
    if (FIN.indexOf(col) >= 0) return false;
    if (op === "add") return ["pauta", "cartoes", "eventos", "visitas"].indexOf(col) >= 0 && meu(col, next);
    if (op === "del") { if (col === "cartoes") return !!cur && cur.criadoPor === me; return (col === "pauta" || col === "eventos" || col === "visitas") && meu(col, cur); }
    return meu(col, cur) && meu(col, next);
  }
  function canEdit(col, doc) { return canWrite(col, doc, doc, "upd"); }
  // o que cada um enxerga (mesma regra do banco: fluxo_pode_ler)
  function canRead(col, d) {
    if (isAdmin()) return true;
    d = d || {};
    if (["pauta", "cartoes", "eventos", "pessoas", "visitas"].indexOf(col) >= 0) return meu(col, d);
    if (col === "ciclo") return (d.quem || []).indexOf(me) >= 0;
    if (col === "mapas") return d.compartilhado === true;
    if (col === "cofre") return (d.acesso || []).indexOf(me) >= 0;
    if (["modelos", "quadros", "config"].indexOf(col) >= 0) return true;
    return false;
  }
  function refilter() {
    Object.keys(R).forEach(function (col) { S[col] = isAdmin() ? R[col] : R[col].filter(function (d) { return canRead(col, d); }); });
  }
  // foco: "meu" mostra só o que é da pessoa; "geral" mostra tudo que ela pode ver
  var foco = LS.get("foco", "");
  function focoMeu() { return (foco || (isAdmin() ? "geral" : "meu")) === "meu"; }
  var equipeSyncing = false;
  function syncEquipe() {
    if (!isAdmin() || !loaded.pessoas || !loaded.config || !S.pessoas.length || equipeSyncing) return;
    var lista = pessoas().map(function (p) { return { nome: p.nome, papel: p.papel || "", gestor: !!p.gestor }; });
    if (JSON.stringify(lista) === JSON.stringify(equipeDoc())) return;
    equipeSyncing = true;
    Store.set("config", "equipe", { lista: lista }).then(function () { equipeSyncing = false; }, function () { equipeSyncing = false; });
  }
  function denyToast() { toast("Você só pode alterar o que é seu. Fale com a Ellyn ou o Tony."); }
  function guardStore() {
    var raw = { add: Store.add, set: Store.set, upd: Store.upd, del: Store.del };
    var find = function (col, id) { return (S[col] || []).find(function (x) { return x.id === id; }); };
    var deny = function () { denyToast(); return Promise.reject({ code: "denied" }); };
    Store.add = function (col, d) { return canWrite(col, null, d, "add") ? raw.add(col, d) : deny(); };
    Store.set = function (col, id, d) { var cur = find(col, id); return canWrite(col, cur, d, cur ? "upd" : "add") ? raw.set(col, id, d) : deny(); };
    Store.upd = function (col, id, p) { var cur = find(col, id) || {}; return canWrite(col, cur, Object.assign({}, cur, p), "upd") ? raw.upd(col, id, p) : deny(); };
    Store.del = function (col, id) { var cur = find(col, id); return canWrite(col, cur, cur, "del") ? raw.del(col, id) : deny(); };
  }

  /* ================= datas do ciclo ================= */
  function isBiz(d) { var w = d.getDay(); return w !== 0 && w !== 6; }
  function prevBiz(d) { var x = new Date(d); while (!isBiz(x)) x.setDate(x.getDate() - 1); return x; }
  function nextBiz(d) { var x = new Date(d); while (!isBiz(x)) x.setDate(x.getDate() + 1); return x; }
  function addBiz(d, n) { var x = new Date(d), c = 0, s = n < 0 ? -1 : 1; while (c < Math.abs(n)) { x.setDate(x.getDate() + s); if (isBiz(x)) c++; } return x; }
  function ruleDate(r, y, m) {
    r = r || {}; var n = Number(r.n) || 0, dia = Number(r.dia) || 1;
    var last = new Date(y, m + 1, 0).getDate();
    var clamp = function (d) { return Math.min(Math.max(d, 1), last); };
    if (r.tipo === "util") return addBiz(nextBiz(new Date(y, m, 1)), Math.max(n, 1) - 1);
    if (r.tipo === "ultimo") return addBiz(prevBiz(new Date(y, m, last)), -n);
    if (r.tipo === "antes") return addBiz(prevBiz(new Date(y, m, clamp(dia))), -n);
    if (r.tipo === "semana") { var x = new Date(y, m, clamp(dia)); while (x.getDay() !== n) x.setDate(x.getDate() + 1); return x; }
    return prevBiz(new Date(y, m, clamp(r.tipo === "dia" ? n || dia : dia)));
  }
  function ruleText(r) {
    r = r || {}; var n = Number(r.n) || 0;
    if (r.tipo === "util") return n + "º dia útil";
    if (r.tipo === "ultimo") return n ? n + " dias úteis antes do último dia útil" : "último dia útil";
    if (r.tipo === "antes") return n ? n + " dia" + (n > 1 ? "s" : "") + " úte" + (n > 1 ? "is" : "il") + " antes do dia " + r.dia : "dia " + r.dia;
    if (r.tipo === "semana") return "1ª " + DOW_LONG[n] + " a partir do dia " + r.dia;
    return "dia " + (n || r.dia) + " (ou dia útil anterior)";
  }
  function cycleFor(y, m) {
    return S.ciclo.slice().sort(byOrder).map(function (c) { return Object.assign({}, c, { d: ruleDate(c.regra, y, m) }); })
      .sort(function (a, b) { return a.d - b.d || (a.ordem || 0) - (b.ordem || 0); });
  }

  /* ================= "agora" ================= */
  function toMin(h) { var m = /^(\d{1,2}):(\d{2})/.exec(h || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; }
  function nowBlock() {
    var g = pessoaMe() || (isAdmin() ? gestor() : null); if (!g) return ["", ""];
    var d = new Date(), wd = d.getDay(), mins = d.getHours() * 60 + d.getMinutes();
    if (wd === 0 || wd === 6) return ["Fim de semana", "Sem rotina. Lembrou de algo? Joga na pauta e fecha o celular."];
    var key = DOW[wd];
    var slots = (g.semana || []);
    if (mins < 12 * 60 + 30) {
      if (mins < 7 * 60) return ["Antes do expediente", "Só anote. A pauta segura até amanhã."];
      var reu = slots.find(function (s) { return s.dia === key && s.tipo === "reuniao" && /manh/i.test(s.hora); });
      if (reu) return [reu.titulo, reu.desc];
      var cel = slots.find(function (s) { return (s.dia === "diario" || s.dia === key) && s.tipo === "celular"; });
      return cel ? ["Manhã · " + cel.titulo, cel.desc] : ["Manhã", "Contato e mensagens."];
    }
    var timed = slots.filter(function (s) { return (s.dia === key || s.dia === "diario") && toMin(s.hora) != null; })
      .sort(function (a, b) { return toMin(a.hora) - toMin(b.hora); });
    var cur = null;
    timed.forEach(function (s) { if (toMin(s.hora) <= mins) cur = s; });
    if (mins > 18 * 60 + 15 || !cur) return mins > 18 * 60 ? ["Fora do horário", "A rotina acabou. Anote na pauta e deixe para amanhã."] : ["Almoço", "Pausa."];
    return [DOW[wd] + " " + cur.hora + " · " + cur.titulo, cur.desc];
  }
  function nowHTML() { var n = nowBlock(); if (!n[0]) return ""; return '<div class="now"><span class="dot"></span><div><b>' + esc(n[0]) + "</b><span>" + esc(n[1]) + "</span></div></div>"; }

  /* ================= navegação ================= */
  function showView(v) {
    view = v; LS.set("tab", v);
    $$("#tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === v)); });
    $$("section.view").forEach(function (s) { s.hidden = s.id !== "v-" + v; });
    render();
  }
  $("#tabs").addEventListener("click", function (e) { var b = e.target.closest("button[data-tab]"); if (b) showView(b.dataset.tab); });

  function renderMe() {
    var sel = $("#meSel"); var opts = nomes();
    if (Store && Store.mode === "supabase" && Store.perfil) {
      me = Store.perfil.nome;
      $("#meBox").innerHTML = '<span class="me-name">' + esc(me) + '</span><span class="tag ' + (isAdmin() ? "solid" : "") + '">' + (isAdmin() ? "admin" : "membro") + "</span>";
      return;
    }
    if (opts.indexOf(me) < 0 && opts.length) me = opts[0];
    sel.innerHTML = opts.map(function (n) { return "<option" + (n === me ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("");
  }
  $("#meSel").addEventListener("change", function (e) { me = e.target.value; LS.set("me", me); refilter(); $$("section.view").forEach(function (s) { delete s.dataset.built; }); render(); });
  $("#focoSeg").addEventListener("click", function (e) { var b = e.target.closest("[data-f]"); if (!b) return; foco = b.dataset.f; LS.set("foco", foco); render(); });

  function render() {
    renderMe();
    var adm = isAdmin();
    document.body.classList.toggle("is-admin", adm);
    var tt = $('[data-tab="time"]'); if (tt) tt.textContent = adm ? "Time" : "Meu fluxo";
    var tc = $('[data-tab="cofre"]'); if (tc) tc.hidden = !(adm || S.cofre.length);
    var tv = $('[data-tab="visitas"]'); if (tv) tv.hidden = !(adm || S.visitas.length);
    if (view === "cofre" && !(adm || S.cofre.length)) { view = "pauta"; $$("#tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === view)); }); $$("section.view").forEach(function (s) { s.hidden = s.id !== "v-" + view; }); }
    var fs = $("#focoSeg");
    if (fs) {
      fs.innerHTML = '<button type="button" data-f="meu" aria-pressed="' + focoMeu() + '" title="Mostra só o que é seu">Só meu</button><button type="button" data-f="geral" aria-pressed="' + !focoMeu() + '" title="' + (adm ? "Visão de gestão: tudo do time" : "Tudo que foi liberado para você") + '">' + (adm ? "Geral" : "Tudo") + "</button>";
    }
    if (!adm && (view === "verba" || view === "admin" || view === "eventosorg" || view === "campanhas" || view === "reunioes" || view === "indicadores" || view === "midia" || view === "fornecedores")) { view = "pauta"; $$("#tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === view)); }); $$("section.view").forEach(function (s) { s.hidden = s.id !== "v-" + view; }); }
    backupLembrete(); tabsScrollUpd();
    var fn = { pauta: renderPauta, quadros: renderQuadros, calendario: renderCalendario, mapa: renderMapa, verba: renderVerba, admin: renderAdmin, cofre: renderCofre, visitas: renderVisitas, eventosorg: renderEventosOrg, campanhas: renderCampanhas, reunioes: renderReunioes, indicadores: renderIndicadores, midia: renderMidia, tabloide: renderTabloide, fornecedores: renderFornecedores, semana: renderSemana, ciclo: renderCiclo, time: renderTime, modelos: renderModelos }[view];
    if (fn) fn();
  }

  /* ================= modal ================= */
  var modalClose = null;
  function openModal(html, opts) {
    opts = opts || {};
    $("#modalRoot").innerHTML = '<div class="modal-back" id="mb"><div class="modal ' + (opts.wide ? "wide" : "") + '" role="dialog" aria-modal="true">' + html + "</div></div>";
    modalClose = opts.onClose || null;
    $("#mb").addEventListener("mousedown", function (e) { if (e.target.id === "mb") closeModal(); });
    var f = $("#modalRoot [autofocus]"); if (f) f.focus();
    return $("#modalRoot .modal");
  }
  function closeModal() { var cb = modalClose; modalClose = null; $("#modalRoot").innerHTML = ""; if (cb) cb(); }
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("#mb")) closeModal(); });

  /* ================================================================
     PAUTA VIVA
     ================================================================ */
  var pautaF = { reuniao: LS.get("fR", "*"), conta: "", resp: "", venc: LS.get("fV", ""), de: "", ate: "" };
  var VENC = [["", "Qualquer vencimento"], ["atrasado", "Atrasados"], ["hoje", "Vence hoje"], ["amanha", "Vence amanhã"], ["semana", "Esta semana"], ["proxsemana", "Próxima semana"], ["mes", "Este mês"], ["semprazo", "Sem prazo"], ["periodo", "Período…"]];
  function vencOk(i) {
    var v = pautaF.venc; if (!v) return true;
    var p = parse(i.prazo), t0 = today();
    if (v === "semprazo") return !p;
    if (!p) return false;
    var d = function (n) { var x = new Date(t0); x.setDate(x.getDate() + n); return x; };
    var sow = d(-((t0.getDay() + 6) % 7)); var eow = new Date(sow); eow.setDate(sow.getDate() + 6);
    if (v === "atrasado") return p < t0 && i.status !== "feito";
    if (v === "hoje") return +p === +t0;
    if (v === "amanha") return +p === +d(1);
    if (v === "semana") return p >= sow && p <= eow;
    if (v === "proxsemana") { var a = new Date(eow); a.setDate(a.getDate() + 1); var b = new Date(a); b.setDate(a.getDate() + 6); return p >= a && p <= b; }
    if (v === "mes") return p.getMonth() === t0.getMonth() && p.getFullYear() === t0.getFullYear();
    if (v === "periodo") { var de = parse(pautaF.de), ate = parse(pautaF.ate); return (!de || p >= de) && (!ate || p <= ate); }
    return true;
  }
  var addConta = "Ambas";
  var addAcompSel = "";
  var pautaAba = LS.get("pAba", "todas");
  function acompDe(i) { return Array.isArray(i.acompanha) ? i.acompanha : []; }
  function acompOpts() { var g = pessoas().filter(function (p) { return p.gestor; }).map(function (p) { return p.nome; }); ["Tony", "Ellyn"].forEach(function (n) { if (g.indexOf(n) < 0 && nomes().indexOf(n) >= 0) g.push(n); }); var o = [["", "Sem acompanhamento"]]; nomes().forEach(function (n) { o.push([n, "Acompanha: " + n]); }); if (g.length >= 2) o.push([g.join("|"), "Acompanham: " + g.join(" e ")]); return o; }
  var addRespSel = ""; // só guarda quando a pessoa escolhe; senão o padrão é quem está usando
  var confirmDel = null;

  function renderPauta() {
    var L = listas();
    var el = $("#v-pauta");
    if (!el.dataset.built) {
      el.dataset.built = "1";
      el.innerHTML =
        '<div class="view-head"><div><div class="eyebrow">Pauta viva</div><h2>Tudo que está pendente, num lugar só</h2>' +
        '<p class="muted">De manhã, pelo celular: dê seguimento, delegue e cobre. Tudo que chegar entra aqui primeiro. Se precisa ser discutido, marque a reunião e a pauta dela se monta sozinha.</p></div><div id="pNow"></div></div>' +
        '<form class="card add" id="addForm" autocomplete="off">' +
          '<div class="main"><input type="text" id="addTitle" placeholder="Lembrou de algo? Escreve e aperta Enter" aria-label="Nova pendência"><button class="btn" type="submit">Adicionar <span class="arrow">→</span></button></div>' +
          '<div class="opts"><div class="seg" id="addConta"></div><select id="addResp" aria-label="Responsável"></select><select id="addReuniao" aria-label="Levar para reunião"></select><select id="addArea" aria-label="Frente"></select><input type="date" id="addPrazo" aria-label="Prazo"><select id="addAcomp" aria-label="Acompanhamento" title="Quem acompanha também vê na pauta dele"></select></div>' +
        "</form>" +
        '<div class="seg p-aba" id="pAba"></div>' +
        '<div class="stats" id="pStats"></div>' +
        '<div class="filters"><span class="lbl">Filtrar</span><select id="fR" aria-label="Reunião"></select><select id="fC" aria-label="Conta"></select><select id="fP" aria-label="Responsável"></select><select id="fV" aria-label="Vencimento"></select><span id="fPer" class="row" hidden><input type="date" id="fDe" aria-label="De" style="width:auto"><span class="hint">até</span><input type="date" id="fAte" aria-label="Até" style="width:auto"></span><button type="button" class="linkbtn" id="fMine">só as minhas</button><button type="button" class="linkbtn" id="fClear">limpar filtros</button></div>' +
        '<div id="pMeet"></div><div id="pList"></div>';
      $("#addForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var t = $("#addTitle").value.trim(); if (!t) { $("#addTitle").focus(); return; }
        Store.add("pauta", { titulo: t, conta: addConta, resp: $("#addResp").value, reuniao: $("#addReuniao").value, area: $("#addArea").value || "Outro", prazo: $("#addPrazo").value, status: "aberto", notas: "", acompanha: ($("#addAcomp").value ? $("#addAcomp").value.split("|") : []).filter(function (n) { return n !== $("#addResp").value; }), criadoEm: new Date().toISOString(), criadoPor: me })
          .then(function () { toast("Na pauta"); }, fail);
        $("#addTitle").value = ""; $("#addPrazo").value = ""; $("#addTitle").focus();
      });
      $("#addResp").addEventListener("change", function () { addRespSel = this.value; });
      $("#addAcomp").addEventListener("change", function () { addAcompSel = this.value; });
      $("#pAba").addEventListener("click", function (e) { var b = e.target.closest("button[data-aba]"); if (!b) return; pautaAba = b.dataset.aba; LS.set("pAba", pautaAba); drawPautaList(); });
      $("#addConta").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; addConta = b.dataset.v; $$("#addConta button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); });
      ["fR", "fC", "fP", "fV", "fDe", "fAte"].forEach(function (id) { $("#" + id).addEventListener("change", function () { pautaF.reuniao = $("#fR").value; pautaF.conta = $("#fC").value; pautaF.resp = $("#fP").value; pautaF.venc = $("#fV").value; pautaF.de = $("#fDe").value; pautaF.ate = $("#fAte").value; LS.set("fR", pautaF.reuniao); LS.set("fV", pautaF.venc); $("#fPer").hidden = pautaF.venc !== "periodo"; drawPautaList(); }); });
      $("#fClear").addEventListener("click", function () { pautaF = { reuniao: "*", conta: "", resp: "", venc: "", de: "", ate: "" }; LS.set("fR", "*"); LS.set("fV", ""); renderPauta(); });
      $("#fMine").addEventListener("click", function () { pautaF.resp = me; $("#fP").value = me; drawPautaList(); });
      $("#pList").addEventListener("click", onPautaClick);
    }
    // opções (podem mudar)
    $("#addConta").innerHTML = L.contas.map(function (c) { return '<button type="button" data-v="' + esc(c) + '" aria-pressed="' + (c === addConta) + '">' + esc(c) + "</button>"; }).join("");
    var keepResp = addRespSel || me;
    $("#addResp").innerHTML = respOpts().map(function (n) { return "<option" + (n === keepResp ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("");
    $("#addAcomp").innerHTML = acompOpts().map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === addAcompSel ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
    var keepR = $("#addReuniao").value;
    $("#addReuniao").innerHTML = '<option value="">Sem reunião</option>' + L.reunioes.map(function (r) { return "<option" + (r === keepR ? " selected" : "") + ">" + esc(r) + "</option>"; }).join("");
    var keepA = $("#addArea").value;
    $("#addArea").innerHTML = '<option value="">Frente…</option>' + L.areas.map(function (a) { return "<option" + (a === keepA ? " selected" : "") + ">" + esc(a) + "</option>"; }).join("");
    $("#fR").innerHTML = '<option value="*">Todas as reuniões</option>' + L.reunioes.map(function (r) { return '<option value="' + esc(r) + '"' + (r === pautaF.reuniao ? " selected" : "") + ">" + esc(r) + "</option>"; }).join("");
    if (pautaF.reuniao !== "*" && L.reunioes.indexOf(pautaF.reuniao) < 0) pautaF.reuniao = "*";
    $("#fC").innerHTML = '<option value="">Todas as contas</option>' + L.contas.map(function (c) { return "<option" + (c === pautaF.conta ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("");
    $("#fP").innerHTML = '<option value="">Todo mundo</option>' + respOpts().map(function (n) { return "<option" + (n === pautaF.resp ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("");
    $("#fV").innerHTML = VENC.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === pautaF.venc ? " selected" : "") + ">" + o[1] + "</option>"; }).join("");
    $("#fPer").hidden = pautaF.venc !== "periodo"; $("#fDe").value = pautaF.de; $("#fAte").value = pautaF.ate;
    $("#pNow").innerHTML = nowHTML();
    drawPautaList();
  }

  function pautaItemHTML(i) {
    var t0 = today(), p = parse(i.prazo), late = p && p < t0 && i.status !== "feito";
    return '<li class="item ' + (i.status === "feito" ? "done" : "") + '" data-id="' + esc(i.id) + '">' +
      '<button class="check" data-act="toggle" aria-label="' + (i.status === "feito" ? "Reabrir" : "Marcar como feito") + '"></button>' +
      '<div><div class="t" data-act="edit">' + esc(i.titulo) + "</div>" +
      '<div class="meta"><span class="tag ' + esc(i.conta) + '">' + esc(i.conta) + "</span><span>" + esc(i.resp) + "</span>" +
      (i.area ? "<span>· " + esc(i.area) + "</span>" : "") +
      (p ? '<span class="num ' + (late ? "late-txt" : "") + '">· ' + (late ? "atrasado " : "") + fmt(p) + " " + DOW[p.getDay()] + "</span>" : "") +
      (i.reuniao ? '<span class="tag">' + esc(i.reuniao) + "</span>" : "") +
      (i.cartao ? '<span class="tag solid">no quadro</span>' : "") +
      (acompDe(i).length ? '<span class="tag acomp' + (acompDe(i).indexOf(me) >= 0 ? " eu" : "") + '" title="Acompanhamento">👁 ' + esc(acompDe(i).indexOf(me) >= 0 && i.resp !== me ? "você acompanha" : acompDe(i).join(", ")) + "</span>" : "") +
      (i.notas ? '<span title="Tem anotação">✎</span>' : "") +
      "</div></div>" +
      '<div class="actions">' +
      (i.status !== "feito" ? '<button class="st ' + esc(i.status) + '" data-act="cycle" title="Mudar status">' + esc(STATUS[i.status] || i.status) + "</button>" : "") +
      (confirmDel === i.id ? '<span class="confirm">Apagar? <button class="yes" data-act="del-yes">sim</button><button class="no" data-act="del-no">não</button></span>' : '<button class="x" data-act="del" aria-label="Apagar">✕</button>') +
      "</div></li>";
  }

  function drawPautaList() {
    if (!$("#pList")) return;
    var f = pautaF, t0 = today();
    var wEnd = new Date(t0); wEnd.setDate(t0.getDate() + (7 - t0.getDay()) % 7);
    var segue = function (i) { return acompDe(i).indexOf(me) >= 0; };
    var nAcomp = S.pauta.filter(function (i) { return segue(i) && i.status !== "feito"; }).length;
    if (pautaAba === "acomp" && !S.pauta.some(segue)) pautaAba = "todas";
    $("#pAba").innerHTML = '<button type="button" data-aba="todas" aria-pressed="' + (pautaAba === "todas") + '">Pauta</button><button type="button" data-aba="acomp" aria-pressed="' + (pautaAba === "acomp") + '" title="Itens de outras pessoas que você acompanha">Acompanhamento' + (nAcomp ? " <b>" + nAcomp + "</b>" : "") + "</button>";
    var vis = S.pauta.filter(function (i) { return (f.reuniao === "*" || i.reuniao === f.reuniao) && (!f.conta || i.conta === f.conta) && (!f.resp || i.resp === f.resp) && (pautaAba === "acomp" ? segue(i) : (!focoMeu() || i.resp === me || segue(i))) && vencOk(i); });
    var open = vis.filter(function (i) { return i.status !== "feito"; });
    var byDate = function (a, b) { return (a.prazo || "9999").localeCompare(b.prazo || "9999") || (a.criadoEm || "").localeCompare(b.criadoEm || ""); };
    var late = open.filter(function (i) { var p = parse(i.prazo); return p && p < t0; }).sort(byDate);
    var week = open.filter(function (i) { var p = parse(i.prazo); return p && p >= t0 && p <= wEnd; }).sort(byDate);
    var later = open.filter(function (i) { var p = parse(i.prazo); return p && p > wEnd; }).sort(byDate);
    var nod = open.filter(function (i) { return !i.prazo; }).sort(byDate);
    var done = vis.filter(function (i) { return i.status === "feito"; }).sort(function (a, b) { return (b.feitoEm || "").localeCompare(a.feitoEm || ""); }).slice(0, 15);
    var waiting = open.filter(function (i) { return i.status === "aguardando"; }).length;
    $("#pStats").innerHTML =
      '<div class="stat"><b>' + open.length + "</b><span>abertas</span></div>" +
      '<div class="stat ' + (late.length ? "late" : "") + '"><b>' + late.length + "</b><span>atrasadas</span></div>" +
      '<div class="stat"><b>' + week.length + "</b><span>vencem até domingo</span></div>" +
      '<div class="stat"><b>' + waiting + "</b><span>aguardando outro</span></div>" +
      '<div class="stat"><b>' + nod.length + "</b><span>sem prazo</span></div>";
    if (f.reuniao !== "*") {
      $("#pMeet").innerHTML = '<div class="meetbar"><span>' + esc(f.reuniao) + " · " + open.length + " ponto" + (open.length === 1 ? "" : "s") + ' para levar</span><button class="btn small" id="copyMeet">Copiar pauta para o Whats</button></div>';
      $("#copyMeet").onclick = function () {
        var lines = open.slice().sort(byDate).map(function (i, n) { return (n + 1) + ". [" + i.conta + "] " + i.titulo + (i.resp !== me ? " (" + i.resp + ")" : "") + (i.prazo ? " · prazo " + fmt(parse(i.prazo)) : ""); });
        copy("PAUTA · " + f.reuniao + " · " + fmt(new Date()) + "\n\n" + (lines.join("\n") || "Sem pontos."));
      };
    } else $("#pMeet").innerHTML = "";
    var g = function (title, arr, cls, note) { return arr.length ? '<div class="group ' + (cls || "") + '"><h3>' + title + " <small>" + arr.length + (note || "") + '</small></h3><ul class="items">' + arr.map(pautaItemHTML).join("") + "</ul></div>" : ""; };
    var html = g("Atrasado", late, "late") + g("Até domingo", week) + g("Sem prazo", nod, "", " · dê um prazo ou marque uma reunião") + g("Mais pra frente", later) + g("Feito recentemente", done);
    $("#pList").innerHTML = html || '<div class="empty">' + (loaded.pauta ? "Nada aqui com esses filtros." : "Carregando a pauta…") + "</div>";
  }

  function onPautaClick(e) {
    var b = e.target.closest("[data-act]"); if (!b) return;
    var li = b.closest("li.item"); var id = li && li.dataset.id; var it = S.pauta.find(function (x) { return x.id === id; }); if (!it) return;
    var a = b.dataset.act;
    if (a === "toggle") Store.upd("pauta", id, it.status === "feito" ? { status: "aberto", feitoEm: "" } : { status: "feito", feitoEm: new Date().toISOString() }).catch(fail);
    if (a === "cycle") { var o = ["aberto", "andamento", "aguardando"]; Store.upd("pauta", id, { status: o[(o.indexOf(it.status) + 1) % o.length] }).catch(fail); }
    if (a === "del") { confirmDel = id; drawPautaList(); }
    if (a === "del-no") { confirmDel = null; drawPautaList(); }
    if (a === "del-yes") { confirmDel = null; Store.del("pauta", id).then(function () { toast("Apagado"); }, fail); }
    if (a === "edit") openPautaItem(it);
  }

  function opt(list, cur, blank) { return (blank != null ? '<option value="">' + esc(blank) + "</option>" : "") + list.map(function (x) { return "<option" + (x === cur ? " selected" : "") + ">" + esc(x) + "</option>"; }).join(""); }

  function openPautaItem(it) {
    var L = listas();
    var boards = S.quadros.slice().sort(byOrder);
    openModal(
      '<header><input class="title" id="piT" value="' + esc(it.titulo) + '" aria-label="Título" style="flex:1"><button class="x" data-close aria-label="Fechar">✕</button></header>' +
      '<div class="body"><div class="grid2">' +
        '<div class="field"><label>Conta</label><select id="piC">' + opt(L.contas, it.conta) + "</select></div>" +
        '<div class="field"><label>Responsável</label><select id="piR">' + opt(respOpts(), it.resp) + "</select></div>" +
        '<div class="field"><label>Reunião</label><select id="piM">' + opt(L.reunioes, it.reuniao, "Sem reunião") + "</select></div>" +
        '<div class="field"><label>Frente</label><select id="piA">' + opt(L.areas, it.area, "—") + "</select></div>" +
        '<div class="field"><label>Prazo</label><input type="date" id="piP" value="' + esc(it.prazo || "") + '"></div>' +
        '<div class="field"><label>Status</label><select id="piS">' + Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === it.status ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select></div>" +
      "</div>" +
      '<div class="field"><label>Acompanhamento</label><div class="chips" id="piAc">' + nomes().map(function (n) { return '<button type="button" data-ac="' + esc(n) + '" aria-pressed="' + (acompDe(it).indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") + '</div><p class="hint">Quem acompanha vê o item na pauta dele (aba Acompanhamento). Se alguém marcar como feito, fica feito para todos.</p></div>' +
      '<div class="field"><label>Anotações</label><textarea id="piN" placeholder="Contexto, combinados, links">' + esc(it.notas || "") + "</textarea></div>" +
      (boards.length ? '<div class="field"><label>Virar cartão num quadro</label><div class="row"><select id="piB" style="width:auto">' + boards.map(function (q) { return '<option value="' + esc(q.id) + '">' + esc(q.nome) + "</option>"; }).join("") + '</select><button class="btn ghost small" id="piToCard" type="button">Criar cartão</button></div><p class="hint">O cartão vai para a primeira coluna com título, conta, responsável, prazo e anotações.</p></div>' : "") +
      "</div>" +
      '<footer><span class="hint">Criado por ' + esc(it.criadoPor || "—") + '</span><button class="btn" id="piSave">Salvar <span class="arrow">→</span></button></footer>'
    );
    $("[data-close]").onclick = closeModal;
    $("#piAc").onclick = function (e) { var b = e.target.closest("[data-ac]"); if (b) b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); };
    $("#piSave").onclick = function () {
      var ac = $$("#piAc [data-ac]").filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }).map(function (b) { return b.dataset.ac; }).filter(function (n) { return n !== $("#piR").value; });
      var patch = { titulo: $("#piT").value.trim() || it.titulo, conta: $("#piC").value, resp: $("#piR").value, reuniao: $("#piM").value, area: $("#piA").value, prazo: $("#piP").value, status: $("#piS").value, notas: $("#piN").value };
      if (ac.length || acompDe(it).length) patch.acompanha = ac;
      Store.upd("pauta", it.id, patch)
        .then(function () { toast("Salvo"); }, fail); closeModal();
    };
    var tc = $("#piToCard");
    if (tc) tc.onclick = function () {
      var q = S.quadros.find(function (x) { return x.id === $("#piB").value; }); if (!q || !q.colunas || !q.colunas.length) return;
      var col = q.colunas[0].id;
      var card = { quadro: q.id, coluna: col, ordem: nextOrder(q.id, col), titulo: $("#piT").value.trim() || it.titulo, desc: $("#piN").value, conta: $("#piC").value, resp: [$("#piR").value], prazo: $("#piP").value, etiquetas: [], checklist: [], comentarios: [], criadoEm: new Date().toISOString(), criadoPor: me, pauta: it.id };
      Store.add("cartoes", card).then(function (cid) { Store.upd("pauta", it.id, { cartao: cid, status: it.status === "aberto" ? "andamento" : it.status }); toast("Cartão criado em " + q.nome); }, fail);
      closeModal();
    };
  }

  /* ================================================================
     QUADROS (kanban)
     ================================================================ */
  var boardId = LS.get("board", "");
  var boardF = { conta: "", pessoa: "" };
  var addingIn = null;
  var colMenu = null;

  function currentBoard() {
    var qs = S.quadros.slice().sort(byOrder);
    var q = qs.find(function (x) { return x.id === boardId; }) || qs[0];
    if (q) boardId = q.id;
    return q;
  }
  function cardsOf(qid, cid) {
    return S.cartoes.filter(function (c) { return c.quadro === qid && c.coluna === cid && !c.arquivado; }).sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
  }
  function nextOrder(qid, cid) { var cs = cardsOf(qid, cid); return cs.length ? (cs[cs.length - 1].ordem || 0) + 1000 : 1000; }
  function labelColor(nome) { var e = listas().etiquetas.find(function (x) { return x.nome === nome; }); return e ? e.cor : "#888"; }

  var COL_FEITO = /conclu|feito|finaliz|entregue|pronto|publicad|done/i;
  function colConcluida(q, colId) { var col = ((q && q.colunas) || []).find(function (x) { return x.id === colId; }); return !!(col && COL_FEITO.test(col.nome || "")); }
  // conclui ou reabre o cartão; ao concluir, leva para a coluna de concluídos se o quadro tiver uma
  function concluirCartao(c, feito) {
    if (!canEdit("cartoes", c)) { denyToast(); return; }
    var p = feito ? { concluido: true, concluidoEm: new Date().toISOString(), concluidoPor: me } : { concluido: false, concluidoEm: "", concluidoPor: "" };
    var q = S.quadros.find(function (x) { return x.id === c.quadro; });
    if (feito && q && !colConcluida(q, c.coluna)) { var cf = (q.colunas || []).filter(function (x) { return COL_FEITO.test(x.nome || ""); }).pop(); if (cf) { p.coluna = cf.id; p.ordem = nextOrder(q.id, cf.id); } }
    Object.assign(c, p);
    Store.upd("cartoes", c.id, p).then(function () { toast(feito ? "Cartão concluído" + (p.coluna ? " · movido para " + (q.colunas.find(function (x) { return x.id === p.coluna; }) || {}).nome : "") : "Cartão reaberto"); }, fail);
  }
  function cardHTML(c) {
    var t0 = today(), p = parse(c.prazo);
    var cl = c.checklist || [], ok = cl.filter(function (x) { return x.ok; }).length;
    var due = "";
    if (c.concluido) due = '<span class="badge done" title="Concluído' + (c.concluidoPor ? " por " + esc(c.concluidoPor) : "") + '">✓ ' + (c.concluidoEm ? fmt(new Date(c.concluidoEm)) : "concluído") + "</span>";
    else if (p) {
      var diff = (p - t0) / 864e5, cls = diff < 0 ? "late" : diff <= 1 ? "soon" : "";
      due = '<span class="badge ' + cls + '">◷ ' + fmt(p) + "</span>";
    }
    var nAtt = (c.anexos || []).length;
    return '<div class="kcard' + (c.concluido ? " is-done" : "") + '" data-card="' + esc(c.id) + '" tabindex="0">' +
      '<button type="button" class="kdone' + (c.concluido ? " on" : "") + '" data-kdone title="' + (c.concluido ? "Reabrir" : "Concluir") + '" aria-label="' + (c.concluido ? "Reabrir cartão" : "Concluir cartão") + '"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
      (c.capa ? '<div class="kcover" data-cover="' + esc(c.capa) + '" data-cid="' + esc(c.id) + '"></div>' : "") +
      ((c.etiquetas || []).length ? '<div class="labels">' + c.etiquetas.map(function (l) { return '<i style="background:' + esc(labelColor(l)) + '" title="' + esc(l) + '"></i>'; }).join("") + "</div>" : "") +
      '<div class="kt">' + esc(c.titulo) + "</div>" +
      '<div class="badges">' +
        (c.conta ? '<span class="tag ' + esc(c.conta) + '">' + esc(c.conta) + "</span>" : "") + due +
        (cl.length ? '<span class="badge ' + (ok === cl.length ? "done" : "") + '">☑ ' + ok + "/" + cl.length + "</span>" : "") +
        ((c.comentarios || []).length ? '<span class="badge">✎ ' + c.comentarios.length + "</span>" : "") +
        (c.desc ? '<span class="badge" title="Tem descrição">≡</span>' : "") +
        (nAtt ? '<span class="badge" title="Anexos">⧉ ' + nAtt + "</span>" : "") +
        '<span class="avatars">' + (c.resp || []).map(function (r) { return '<span class="avatar" title="' + esc(r) + '">' + esc(initials(r)) + "</span>"; }).join("") + "</span>" +
      "</div></div>";
  }

  function renderQuadros() {
    var el = $("#v-quadros");
    var qs = S.quadros.slice().sort(byOrder);
    var q = currentBoard();
    var L = listas();
    var head =
      '<div class="view-head"><div><div class="eyebrow">Quadros</div><h2>' + (q ? esc(q.nome) : "Quadros") + "</h2>" +
      '<p class="muted">Arraste os cartões entre as colunas. No celular, segure o cartão por meio segundo e arraste. Clique no cartão para abrir briefing, checklist, prazo e comentários.</p></div></div>' +
      '<div class="boardbar"><div class="boards" role="tablist">' + qs.map(function (x) { return '<button data-board="' + esc(x.id) + '" aria-selected="' + (q && x.id === q.id) + '">' + esc(x.nome) + "</button>"; }).join("") +
      '<button data-newboard class="admin-only">+ Novo quadro</button></div>' +
      '<div class="row"><select id="bfC" style="width:auto"><option value="">Todas as contas</option>' + L.contas.map(function (c) { return "<option" + (c === boardF.conta ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
      '<select id="bfP" style="width:auto"><option value="">Todo mundo</option>' + respOpts().map(function (n) { return "<option" + (n === boardF.pessoa ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + "</select>" +
      (q ? '<button class="icon-btn admin-only" data-editboard>Editar quadro</button>' : "") + "</div></div>";
    if (!q) { el.innerHTML = head + '<div class="empty">' + (loaded.quadros ? "Nenhum quadro ainda. Crie o primeiro." : "Carregando…") + "</div>"; bindBoardBar(); return; }
    var sx = $(".kanban-wrap") ? $(".kanban-wrap").scrollLeft : 0;
    var cols = (q.colunas || []).map(function (col, ci) {
      var cs = cardsOf(q.id, col.id).filter(function (c) { return (!boardF.conta || c.conta === boardF.conta) && (!boardF.pessoa || (c.resp || []).indexOf(boardF.pessoa) >= 0) && (!focoMeu() || (c.resp || []).indexOf(me) >= 0 || c.criadoPor === me || (c.acompanha || []).indexOf(me) >= 0); });
      var menu = colMenu === col.id;
      var empty = cardsOf(q.id, col.id).length === 0;
      return '<div class="col" data-col="' + esc(col.id) + '">' +
        '<header><input value="' + esc(col.nome) + '" data-colname="' + esc(col.id) + '" aria-label="Nome da coluna"' + (isAdmin() ? "" : " readonly") + '><span class="count">' + cs.length + '</span><button class="x admin-only" data-colmenu="' + esc(col.id) + '" aria-label="Opções da coluna">⋯</button></header>' +
        (menu ? '<div class="row" style="padding:0 10px 8px;gap:6px">' +
          (ci > 0 ? '<button class="icon-btn" data-colmove="-1" data-c="' + esc(col.id) + '">← mover</button>' : "") +
          (ci < q.colunas.length - 1 ? '<button class="icon-btn" data-colmove="1" data-c="' + esc(col.id) + '">mover →</button>' : "") +
          (empty ? '<button class="icon-btn" data-coldel="' + esc(col.id) + '">Excluir coluna</button>' : '<span class="hint">Esvazie para excluir</span>') + "</div>" : "") +
        '<div class="cards" data-drop="' + esc(col.id) + '">' + cs.map(cardHTML).join("") + "</div>" +
        "<footer>" + (addingIn === col.id
          ? '<textarea class="newcard" id="newCardT" placeholder="Título do cartão" autofocus></textarea><div class="row"><button class="btn small" data-addok="' + esc(col.id) + '">Adicionar</button><button class="x" data-addcancel>✕</button></div>'
          : '<button class="addcard" data-add="' + esc(col.id) + '">+ Adicionar cartão</button>') + "</footer></div>";
    }).join("");
    el.innerHTML = head + '<div class="kanban-wrap"><div class="kanban">' + cols + '<div class="addcol admin-only"><button class="btn ghost small" data-addcol>+ Nova coluna</button></div></div></div>';
    $(".kanban-wrap").scrollLeft = sx;
    bindBoardBar();
    hydrateCovers();
    var nt = $("#newCardT");
    if (nt) {
      nt.focus();
      nt.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addCardFromInput(); } if (e.key === "Escape") { addingIn = null; renderQuadros(); } });
    }
  }
  function addCardFromInput() {
    var q = currentBoard(); var t = ($("#newCardT").value || "").trim(); if (!t || !q) return;
    var col = addingIn;
    Store.add("cartoes", { quadro: q.id, coluna: col, ordem: nextOrder(q.id, col), titulo: t, desc: "", conta: boardF.conta || "Ambas", resp: boardF.pessoa ? [boardF.pessoa] : [me], prazo: "", etiquetas: [], checklist: [], comentarios: [], criadoEm: new Date().toISOString(), criadoPor: me }).catch(fail);
    $("#newCardT").value = ""; $("#newCardT").focus();
  }
  function saveCols(q, cols) { return Store.upd("quadros", q.id, { colunas: cols }).catch(fail); }
  function bindBoardBar() {
    var el = $("#v-quadros");
    if (el.dataset.bound) return; el.dataset.bound = "1";
    el.addEventListener("click", function (e) {
      var t = e.target, q = currentBoard();
      var b;
      if ((b = t.closest("[data-board]"))) { boardId = b.dataset.board; LS.set("board", boardId); addingIn = null; colMenu = null; renderQuadros(); return; }
      if (t.closest("[data-newboard]")) { openBoardEditor(null); return; }
      if (t.closest("[data-editboard]")) { openBoardEditor(q); return; }
      if ((b = t.closest("[data-add]"))) { addingIn = b.dataset.add; renderQuadros(); return; }
      if ((b = t.closest("[data-addok]"))) { addCardFromInput(); return; }
      if (t.closest("[data-addcancel]")) { addingIn = null; renderQuadros(); return; }
      if ((b = t.closest("[data-colmenu]"))) { colMenu = colMenu === b.dataset.colmenu ? null : b.dataset.colmenu; renderQuadros(); return; }
      if ((b = t.closest("[data-colmove]"))) {
        var cols = q.colunas.slice(), i = cols.findIndex(function (c) { return c.id === b.dataset.c; }), j = i + Number(b.dataset.colmove);
        var tmp = cols[i]; cols[i] = cols[j]; cols[j] = tmp; saveCols(q, cols); return;
      }
      if ((b = t.closest("[data-coldel]"))) { colMenu = null; saveCols(q, q.colunas.filter(function (c) { return c.id !== b.dataset.coldel; })); return; }
      if (t.closest("[data-addcol]")) { var cols2 = (q.colunas || []).concat([{ id: Store.uid(), nome: "Nova coluna" }]); saveCols(q, cols2); return; }
    });
    el.addEventListener("change", function (e) {
      if (e.target.id === "bfC") { boardF.conta = e.target.value; renderQuadros(); }
      if (e.target.id === "bfP") { boardF.pessoa = e.target.value; renderQuadros(); }
    });
    el.addEventListener("focusout", function (e) {
      var inp = e.target.closest("[data-colname]"); if (!inp) return;
      var q = currentBoard(); var v = inp.value.trim();
      var col = q.colunas.find(function (c) { return c.id === inp.dataset.colname; });
      if (col && v && v !== col.nome) saveCols(q, q.colunas.map(function (c) { return c.id === col.id ? { id: c.id, nome: v } : c; }));
    });
    el.addEventListener("keydown", function (e) {
      if (e.target.matches("[data-colname]") && e.key === "Enter") e.target.blur();
      if (e.target.matches(".kcard") && e.key === "Enter") openCard(e.target.dataset.card);
    });
    el.addEventListener("pointerdown", onCardPointerDown);
  }

  function openBoardEditor(q) {
    var isNew = !q;
    var cols = isNew ? [{ id: Store.uid(), nome: "A fazer" }, { id: Store.uid(), nome: "Fazendo" }, { id: Store.uid(), nome: "Aprovação" }, { id: Store.uid(), nome: "Feito" }] : q.colunas;
    var hasCards = !isNew && S.cartoes.some(function (c) { return c.quadro === q.id; });
    openModal(
      '<header><h3>' + (isNew ? "Novo quadro" : "Editar quadro") + '</h3><button class="x" data-close>✕</button></header>' +
      '<div class="body"><div class="field"><label>Nome do quadro</label><input type="text" id="bqN" value="' + esc(isNew ? "" : q.nome) + '" placeholder="Ex: Tráfego · Karine" autofocus></div>' +
      (isNew ? '<div class="field"><label>Colunas (uma por linha)</label><textarea id="bqC">' + esc(cols.map(function (c) { return c.nome; }).join("\n")) + "</textarea></div>" : '<p class="hint">As colunas se editam direto no quadro: clique no nome para renomear e use ⋯ para mover ou excluir.</p>') +
      "</div><footer>" +
      (isNew ? "<span></span>" : (hasCards ? '<span class="hint">Para excluir o quadro, mova ou apague os cartões dele.</span>' : '<button class="btn danger small" id="bqDel">Excluir quadro</button>')) +
      '<button class="btn" id="bqSave">Salvar <span class="arrow">→</span></button></footer>'
    );
    $("[data-close]").onclick = closeModal;
    $("#bqSave").onclick = function () {
      var nome = $("#bqN").value.trim(); if (!nome) { $("#bqN").focus(); return; }
      if (isNew) {
        var names = $("#bqC").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var cs = names.map(function (n) { return { id: Store.uid(), nome: n }; });
        var ord = S.quadros.reduce(function (m, x) { return Math.max(m, x.ordem || 0); }, 0) + 1;
        Store.add("quadros", { nome: nome, colunas: cs, ordem: ord }).then(function (id) { boardId = id; LS.set("board", id); toast("Quadro criado"); }, fail);
      } else Store.upd("quadros", q.id, { nome: nome }).catch(fail);
      closeModal();
    };
    var del = $("#bqDel"); if (del) del.onclick = function () {
      del.outerHTML = '<span class="confirm">Excluir de vez? <button class="yes" id="bqDelYes">sim</button><button class="no" id="bqDelNo">não</button></span>';
      $("#bqDelYes").onclick = function () { Store.del("quadros", q.id).catch(fail); boardId = ""; closeModal(); };
      $("#bqDelNo").onclick = closeModal;
    };
  }

  /* ---------- arrastar cartões (mouse e toque) ---------- */
  var drag = null;
  function onCardPointerDown(e) {
    var card = e.target.closest(".kcard"); if (!card || e.button > 0) return;
    if (e.target.closest("[data-kdone]")) { e.preventDefault(); e.stopPropagation(); var cc = S.cartoes.find(function (x) { return x.id === card.dataset.card; }); if (cc) { concluirCartao(cc, !cc.concluido); renderQuadros(); } return; }
    var st = { id: card.dataset.card, el: card, x: e.clientX, y: e.clientY, type: e.pointerType, started: false, timer: null, pid: e.pointerId };
    drag = st;
    if (st.type !== "mouse") {
      st.timer = setTimeout(function () { if (drag === st) startDrag(st, st.x, st.y); }, 380);
    }
    document.addEventListener("pointermove", onDragMove);
    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragCancel);
  }
  function startDrag(st, x, y) {
    st.started = true;
    var r = st.el.getBoundingClientRect();
    st.dx = x - r.left; st.dy = y - r.top;
    var clone = st.el.cloneNode(true); clone.classList.add("drag-clone"); clone.style.width = r.width + "px";
    document.body.appendChild(clone); st.clone = clone;
    var ph = document.createElement("div"); ph.className = "placeholder"; ph.style.height = r.height + "px";
    st.el.parentNode.insertBefore(ph, st.el); st.ph = ph;
    st.el.style.display = "none";
    moveClone(x, y);
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (_) {}
  }
  function moveClone(x, y) {
    var st = drag; if (!st || !st.clone) return;
    st.clone.style.left = (x - st.dx) + "px"; st.clone.style.top = (y - st.dy) + "px";
    var under = document.elementFromPoint(x, y);
    var list = under && under.closest(".col") ? under.closest(".col").querySelector(".cards") : null;
    $$(".col.drop-hover").forEach(function (c) { c.classList.remove("drop-hover"); });
    if (list) {
      list.closest(".col").classList.add("drop-hover");
      var cards = $$(".kcard", list).filter(function (c) { return c !== st.el; });
      var before = null;
      for (var i = 0; i < cards.length; i++) { var rr = cards[i].getBoundingClientRect(); if (y < rr.top + rr.height / 2) { before = cards[i]; break; } }
      if (before) list.insertBefore(st.ph, before); else list.appendChild(st.ph);
      var lr = list.getBoundingClientRect();
      if (y < lr.top + 40) list.scrollTop -= 12; else if (y > lr.bottom - 40) list.scrollTop += 12;
    }
    var wrap = $(".kanban-wrap"); if (wrap) { var wr = wrap.getBoundingClientRect(); if (x < wr.left + 50) wrap.scrollLeft -= 16; else if (x > wr.right - 50) wrap.scrollLeft += 16; }
  }
  function onDragMove(e) {
    var st = drag; if (!st || e.pointerId !== st.pid) return;
    if (!st.started) {
      var dist = Math.hypot(e.clientX - st.x, e.clientY - st.y);
      if (st.type === "mouse") { if (dist > 5) startDrag(st, e.clientX, e.clientY); }
      else if (dist > 10) { clearTimeout(st.timer); cleanupListeners(); drag = null; }
      return;
    }
    e.preventDefault();
    moveClone(e.clientX, e.clientY);
  }
  function blockTouch(e) { if (drag && drag.started) e.preventDefault(); }
  document.addEventListener("touchmove", blockTouch, { passive: false });
  document.addEventListener("contextmenu", function (e) { if (e.target.closest && e.target.closest(".kcard")) e.preventDefault(); });
  function cleanupListeners() {
    document.removeEventListener("pointermove", onDragMove);
    document.removeEventListener("pointerup", onDragEnd);
    document.removeEventListener("pointercancel", onDragCancel);
  }
  function onDragCancel() {
    var st = drag; if (!st) return;
    clearTimeout(st.timer); cleanupListeners();
    if (st.started) { st.clone.remove(); st.ph.remove(); st.el.style.display = ""; }
    drag = null;
  }
  function onDragEnd(e) {
    var st = drag; if (!st) return;
    clearTimeout(st.timer); cleanupListeners(); drag = null;
    if (!st.started) { if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 8) openCard(st.id); return; }
    $$(".col.drop-hover").forEach(function (c) { c.classList.remove("drop-hover"); });
    var list = st.ph.parentNode; var colId = list && list.dataset.drop;
    var prev = st.ph.previousElementSibling, next = st.ph.nextElementSibling;
    while (prev && !prev.classList.contains("kcard")) prev = prev.previousElementSibling;
    while (next && (!next.classList.contains("kcard") || next === st.el)) next = next.nextElementSibling;
    if (prev === st.el) { prev = prev.previousElementSibling; while (prev && !prev.classList.contains("kcard")) prev = prev.previousElementSibling; }
    st.clone.remove(); st.ph.remove(); st.el.style.display = "";
    if (!colId) return;
    var get = function (el) { return el ? S.cartoes.find(function (c) { return c.id === el.dataset.card; }) : null; };
    var a = get(prev), b = get(next);
    var ordem = a && b ? ((a.ordem || 0) + (b.ordem || 0)) / 2 : a ? (a.ordem || 0) + 1000 : b ? (b.ordem || 0) - 1000 : 1000;
    var card = S.cartoes.find(function (c) { return c.id === st.id; }); if (!card) return;
    if (card.coluna === colId && card.ordem === ordem) return;
    if (!canEdit("cartoes", card)) { denyToast(); renderQuadros(); return; }
    var qd = S.quadros.find(function (x) { return x.id === card.quadro; }), pt = { coluna: colId, ordem: ordem };
    var fim = colConcluida(qd, colId);
    if (fim && !card.concluido) Object.assign(pt, { concluido: true, concluidoEm: new Date().toISOString(), concluidoPor: me });
    if (!fim && card.concluido && colConcluida(qd, card.coluna)) Object.assign(pt, { concluido: false, concluidoEm: "", concluidoPor: "" });
    Object.assign(card, pt); // otimista
    renderQuadros();
    Store.upd("cartoes", st.id, pt).catch(fail);
  }

  /* ---------- cartão aberto ---------- */
  var openCardId = null;
  function openCard(id) {
    var c = S.cartoes.find(function (x) { return x.id === id; }); if (!c) return;
    openCardId = id; cmConf = null; cmEdit = null;
    drawCardModal(c);
  }
  var cmConf = null, cmEdit = null;
  function patchCard(c, p) {
    if (!canWrite("cartoes", c, Object.assign({}, c, p), "upd")) { denyToast(); return; }
    Object.assign(c, p);
    Store.upd("cartoes", c.id, p).catch(fail);
    drawCardModal(c);
  }
  function drawCardModal(c) {
    var L = listas(); var q = S.quadros.find(function (x) { return x.id === c.quadro; }) || currentBoard();
    var cl = c.checklist || [], ok = cl.filter(function (x) { return x.ok; }).length;
    var col = (q.colunas || []).find(function (x) { return x.id === c.coluna; });
    var html =
      '<header><div style="flex:1;min-width:0"><input class="title" id="cT" value="' + esc(c.titulo) + '" aria-label="Título" style="width:100%"><p class="hint" style="padding-left:6px">em <b>' + esc(q.nome) + "</b> · " + esc(col ? col.nome : "—") + '</p></div><button class="x" data-close aria-label="Fechar">✕</button></header>' +
      '<div class="body">' + (c.concluido ? '<div class="c-done-bar">✓ Concluído' + (c.concluidoEm ? " em " + fmt(new Date(c.concluidoEm)) + "/" + new Date(c.concluidoEm).getFullYear() : "") + (c.concluidoPor ? " por " + esc(c.concluidoPor) : "") + (c.prazo ? '<span class="hint"> · prazo era ' + fmt(parse(c.prazo)) + "</span>" : "") + "</div>" : "") + '<div class="m-grid"><div style="display:grid;gap:16px;align-content:start">' +
        '<div class="field"><label>Etiquetas</label><div class="lblpick" id="cL">' + L.etiquetas.map(function (e) { return '<button type="button" data-lbl="' + esc(e.nome) + '" aria-pressed="' + ((c.etiquetas || []).indexOf(e.nome) >= 0) + '" style="background:' + esc(e.cor) + '">' + esc(e.nome) + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><div class="section-title"><label>Descrição / briefing</label><span class="row">' + S.modelos.slice().sort(byOrder).slice(0, 3).map(function (m) { return '<button class="linkbtn" data-tpl="' + esc(m.id) + '">usar: ' + esc(m.titulo.split("·")[0].trim()) + "</button>"; }).join(" ") + '</span></div><textarea id="cD" style="min-height:160px" placeholder="Briefing, referências, links">' + esc(c.desc || "") + "</textarea></div>" +
        '<div class="field" id="cAttWrap"></div>' +
        '<div class="field"><label>Checklist ' + (cl.length ? ok + "/" + cl.length : "") + "</label>" +
          (cl.length ? '<div class="progress"><i style="width:' + Math.round(ok / cl.length * 100) + '%"></i></div>' : "") +
          '<ul class="cl">' + cl.map(function (x) { return '<li class="' + (x.ok ? "ok" : "") + '"><button class="check ' + (x.ok ? "on" : "") + '" data-clt="' + esc(x.id) + '" aria-label="Marcar"></button><span>' + esc(x.t) + '</span><button class="x" data-cld="' + esc(x.id) + '" aria-label="Remover">✕</button></li>'; }).join("") + "</ul>" +
          '<div class="row"><input type="text" id="clNew" placeholder="Adicionar item" style="flex:1"><button class="btn ghost small" id="clAdd">Adicionar</button></div></div>' +
        '<div class="field"><label>Comentários</label><div class="row"><input type="text" id="cmNew" placeholder="Escreva um comentário como ' + esc(me) + '" style="flex:1"><button class="btn ghost small" id="cmAdd">Comentar</button></div>' +
          '<div class="comments">' + (c.comentarios || []).map(function (m, idx) { return [m, idx]; }).reverse().map(function (x) { var m = x[0], idx = x[1], d = new Date(m.em), meuC = m.autor === me, pode = meuC || isAdmin();
            var acts = pode ? '<span class="cm-act">' + (cmConf === idx ? 'Apagar? <button data-cmyes="' + idx + '">sim</button><button data-cmno>não</button>' : (meuC ? '<button data-cmed="' + idx + '">editar</button>' : "") + '<button data-cmdel="' + idx + '">apagar</button>') + "</span>" : "";
            var corpo = cmEdit === idx ? '<div class="row" style="margin-top:4px"><input type="text" data-cmtxt="' + idx + '" value="' + esc(m.texto) + '" style="flex:1"><button class="btn ghost small" data-cmsave="' + idx + '">Salvar</button><button class="linkbtn" data-cmno>cancelar</button></div>' : esc(m.texto) + (m.editadoEm ? ' <span class="hint">(editado)</span>' : "");
            return '<div class="comment"><div class="who"><span><b>' + esc(m.autor) + "</b> · " + fmt(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + "</span>" + acts + "</div>" + corpo + "</div>"; }).join("") + "</div></div>" +
      "</div>" +
      '<div style="display:grid;gap:14px;align-content:start">' +
        '<div class="field"><label>Coluna</label><select id="cCol">' + (q.colunas || []).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === c.coluna ? " selected" : "") + ">" + esc(x.nome) + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>Quadro</label><select id="cQ">' + S.quadros.slice().sort(byOrder).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === c.quadro ? " selected" : "") + ">" + esc(x.nome) + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>Conta</label><div class="seg" id="cC">' + L.contas.map(function (x) { return '<button type="button" data-v="' + esc(x) + '" aria-pressed="' + (x === c.conta) + '">' + esc(x) + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><label>Prazo</label><input type="date" id="cP" value="' + esc(c.prazo || "") + '"></div>' +
        '<div class="field"><label>Responsáveis</label><div class="chips" id="cR">' + respOpts().map(function (n) { return '<button type="button" data-p="' + esc(n) + '" aria-pressed="' + ((c.resp || []).indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") + "</div></div>" +
        '<p class="hint">Criado por ' + esc(c.criadoPor || "—") + (c.criadoEm ? " em " + fmt(new Date(c.criadoEm)) : "") + "</p>" +
      "</div></div></div>" +
      '<footer><div class="row"><button class="btn small ' + (c.concluido ? "ghost" : "") + '" id="cDone">' + (c.concluido ? "Reabrir cartão" : "✓ Concluir") + '</button><button class="btn ghost small" id="cArch">Arquivar</button><span id="cDelWrap"><button class="btn ghost small" id="cDel">Excluir</button></span></div><button class="btn" data-close>Fechar <span class="arrow">→</span></button></footer>';
    if ($("#mb")) { $("#modalRoot .modal").innerHTML = html; } else openModal(html, { wide: true, onClose: function () { openCardId = null; renderQuadros(); } });
    var m = $("#modalRoot .modal");
    attachBlock($("#cAttWrap"), {
      titulo: "Anexos", lista: c.anexos || [], pasta: "cartoes/" + c.id, accept: "image/*,video/*,.pdf,.xlsx,.xls,.csv,.docx,.doc,.pptx",
      podeEditar: canEdit("cartoes", c), capa: c.capa || "", dropTarget: m,
      onChange: function (lista, capa) { patchCard(c, { anexos: lista, capa: capa }); }
    });
    $$("[data-close]", m).forEach(function (b) { b.onclick = closeModal; });
    $("#cT").onchange = function () { var v = this.value.trim(); if (v) patchCard(c, { titulo: v }); };
    $("#cD").onchange = function () { if (!canEdit("cartoes", c)) { denyToast(); return; } Object.assign(c, { desc: this.value }); Store.upd("cartoes", c.id, { desc: this.value }).catch(fail); };
    $("#cL").onclick = function (e) { var b = e.target.closest("[data-lbl]"); if (!b) return; var ls = (c.etiquetas || []).slice(), i = ls.indexOf(b.dataset.lbl); if (i >= 0) ls.splice(i, 1); else ls.push(b.dataset.lbl); patchCard(c, { etiquetas: ls }); };
    $$("[data-tpl]", m).forEach(function (b) { b.onclick = function () { var t = S.modelos.find(function (x) { return x.id === b.dataset.tpl; }); if (!t) return; var v = ($("#cD").value ? $("#cD").value + "\n\n" : "") + t.corpo; patchCard(c, { desc: v }); }; });
    $("#clAdd").onclick = function () { var t = $("#clNew").value.trim(); if (!t) return; patchCard(c, { checklist: (c.checklist || []).concat([{ id: Store.uid(), t: t, ok: false }]) }); setTimeout(function () { var n = $("#clNew"); if (n) n.focus(); }, 0); };
    $("#clNew").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); $("#clAdd").click(); } };
    $$("[data-clt]", m).forEach(function (b) { b.onclick = function () { patchCard(c, { checklist: c.checklist.map(function (x) { return x.id === b.dataset.clt ? { id: x.id, t: x.t, ok: !x.ok } : x; }) }); }; });
    $$("[data-cld]", m).forEach(function (b) { b.onclick = function () { patchCard(c, { checklist: c.checklist.filter(function (x) { return x.id !== b.dataset.cld; }) }); }; });
    var cmBox = $("#modalRoot .comments");
    if (cmBox) cmBox.onclick = function (e) {
      var t = e.target, lista = (c.comentarios || []).slice();
      if (t.dataset.cmdel != null) { cmConf = +t.dataset.cmdel; cmEdit = null; drawCardModal(c); return; }
      if (t.hasAttribute("data-cmno")) { cmConf = null; cmEdit = null; drawCardModal(c); return; }
      if (t.dataset.cmed != null) { cmEdit = +t.dataset.cmed; cmConf = null; drawCardModal(c); var i = $('[data-cmtxt="' + cmEdit + '"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return; }
      if (t.dataset.cmyes != null) { var k = +t.dataset.cmyes; cmConf = null; if (lista[k] && (lista[k].autor === me || isAdmin())) { lista.splice(k, 1); patchCard(c, { comentarios: lista }); toast("Comentário apagado"); } return; }
      if (t.dataset.cmsave != null) { var j = +t.dataset.cmsave, v = ($('[data-cmtxt="' + j + '"]').value || "").trim(); cmEdit = null; if (lista[j] && lista[j].autor === me && v) { lista[j] = Object.assign({}, lista[j], { texto: v, editadoEm: new Date().toISOString() }); patchCard(c, { comentarios: lista }); } else drawCardModal(c); }
    };
    if (cmBox) cmBox.onkeydown = function (e) { if (e.key === "Enter" && e.target.dataset.cmtxt != null) { e.preventDefault(); var b = $('[data-cmsave="' + e.target.dataset.cmtxt + '"]'); if (b) b.click(); } };
    $("#cmAdd").onclick = function () { var t = $("#cmNew").value.trim(); if (!t) return; patchCard(c, { comentarios: (c.comentarios || []).concat([{ autor: me, texto: t, em: new Date().toISOString() }]) }); };
    $("#cmNew").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); $("#cmAdd").click(); } };
    $("#cCol").onchange = function () { patchCard(c, { coluna: this.value, ordem: nextOrder(c.quadro, this.value) }); };
    $("#cQ").onchange = function () { var nq = S.quadros.find(function (x) { return x.id === $("#cQ").value; }); if (!nq || !nq.colunas.length) return; patchCard(c, { quadro: nq.id, coluna: nq.colunas[0].id, ordem: nextOrder(nq.id, nq.colunas[0].id) }); };
    $("#cC").onclick = function (e) { var b = e.target.closest("[data-v]"); if (b) patchCard(c, { conta: b.dataset.v }); };
    $("#cP").onchange = function () { patchCard(c, { prazo: this.value }); };
    $("#cR").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var rs = (c.resp || []).slice(), i = rs.indexOf(b.dataset.p); if (i >= 0) rs.splice(i, 1); else rs.push(b.dataset.p); var pt = { resp: rs }; if (!isAdmin() && rs.indexOf(me) < 0 && c.criadoPor !== me && (c.acompanha || []).indexOf(me) < 0) pt.acompanha = (c.acompanha || []).concat([me]); patchCard(c, pt); if (pt.acompanha) toast("Você segue acompanhando este cartão"); };
    $("#cDone").onclick = function () { concluirCartao(c, !c.concluido); drawCardModal(c); };
    $("#cArch").onclick = function () { Store.upd("cartoes", c.id, { arquivado: true }).then(function () { toast("Arquivado"); }, fail); closeModal(); };
    $("#cDel").onclick = function () {
      $("#cDelWrap").innerHTML = '<span class="confirm">Excluir de vez? <button class="yes" id="cDelY">sim</button><button class="no" id="cDelN">não</button></span>';
      $("#cDelY").onclick = function () { Store.del("cartoes", c.id).then(function () { toast("Excluído"); }, fail); closeModal(); };
      $("#cDelN").onclick = function () { drawCardModal(c); };
    };
  }

  /* ================================================================
     MINHA SEMANA
     ================================================================ */
  function renderSemana() {
    var el = $("#v-semana"), g = pessoaMe() || (isAdmin() ? gestor() : null);
    if (!g) { el.innerHTML = '<div class="empty">' + (loaded.pessoas ? "Sua rotina ainda não foi montada. Peça ao Tony ou à Ellyn para montar seu fluxo." : "Carregando…") + "</div>"; return; }
    var wd = new Date().getDay(), mins = new Date().getHours() * 60 + new Date().getMinutes();
    var slots = g.semana || [];
    var sortS = function (a, b) { var x = toMin(a.hora), y = toMin(b.hora); if (x == null && y == null) return 0; if (x == null) return -1; if (y == null) return 1; return x - y; };
    var slotHTML = function (s, isNow) { return '<div class="slot ' + esc(s.tipo) + (isNow ? " now-slot" : "") + '"><span class="time">' + esc(s.hora || "") + "</span><b>" + esc(s.titulo) + "</b>" + (s.desc ? "<p>" + esc(s.desc) + "</p>" : "") + "</div>"; };
    var daily = slots.filter(function (s) { return s.dia === "diario"; }).sort(sortS);
    var days = DIAS.slice(1).map(function (d, i) {
      var isToday = wd === i + 1;
      var ss = slots.filter(function (s) { return s.dia === d[0]; }).sort(sortS);
      var curIdx = -1;
      if (isToday) ss.forEach(function (s, k) { var t = toMin(s.hora); if (t != null && t <= mins) curIdx = k; });
      return '<article class="day ' + (isToday ? "today" : "") + '"><header><h3>' + d[1] + "</h3>" + (isToday ? '<span class="tag solid">hoje</span>' : "") + "</header>" +
        (ss.length ? ss.map(function (s, k) { return slotHTML(s, k === curIdx && mins < 18 * 60 + 15); }).join("") : '<div class="slot"><p>Livre</p></div>') + "</article>";
    }).join("");
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Minha semana</div><h2>' + (g.gestor ? "Manhã no celular, tarde na mesa" : "Semana de " + esc(g.nome)) + '</h2><p class="muted">' + (g.gestor ? "Quinta de manhã é a exceção, por causa das reuniões. Tudo aqui é editável: horários, blocos e descrições." : "Seus blocos fixos, ritos e combinados. Os marcados com o gestor são os pontos de contato.") + "</p></div>" +
      '<div class="row">' + nowHTML() + (isAdmin() || g.nome === me ? '<button class="btn" id="editWeek">Editar minha semana <span class="arrow">→</span></button>' : "") + "</div></div>" +
      '<div class="legend">' + [["celular", "Celular (manhã)"], ["reuniao", "Reunião com a empresa"], ["rito", "Rito com o time"], ["foco", "Foco (não marque nada)"], ["projeto", "Projeto"]].map(function (x) { return '<span><i class="k-' + x[0] + '"></i>' + x[1] + "</span>"; }).join("") + "</div>" +
      (daily.length ? '<div><div class="lbl" style="margin-bottom:6px">Todo dia</div><div class="dailybar">' + daily.map(function (s) { return slotHTML(s); }).join("") + "</div></div>" : "") +
      '<div class="week">' + days + "</div>" +
      (!g.gestor ? "" : '<div class="rules">' +
        '<div class="rule"><b>Entrada única</b><p>Chegou pedido no Whats, no corredor ou na reunião? Vai para a Pauta viva em 1 minuto. Tarefa de criação e conteúdo vira cartão no quadro.</p></div>' +
        '<div class="rule"><b>Whats é só aviso</b><p>Demanda diária pode ir pelo Whats, mas só vale depois de virar cartão ou tarefa com prazo.</p></div>' +
        '<div class="rule"><b>Semana de visita ao interior</b><p>Depois do dia 15. No dia da viagem, os blocos de foco passam para a manhã seguinte.</p></div>' +
        '<div class="rule"><b>Sexta, 30 minutos</b><p>Fechamento: limpar a pauta, olhar os quadros, deixar a segunda montada. É o hábito que segura o resto.</p></div>' +
      "</div>");
    if ($("#editWeek")) $("#editWeek").onclick = function () { openPersonEditor(g); };
  }

  /* ================================================================
     CICLO DO MÊS
     ================================================================ */
  var monthOffset = 0;
  function renderCiclo() {
    var el = $("#v-ciclo");
    var base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + monthOffset);
    var y = base.getFullYear(), m = base.getMonth();
    var items = cycleFor(y, m).filter(function (it) { return !focoMeu() || (it.quem || []).indexOf(me) >= 0; }), t0 = today().getTime();
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Ciclo do mês</div><h2>' + MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1) + " de " + y + "</h2>" +
      '<p class="muted">Cada marco tem uma regra de data (dia útil, dia fixo, dias antes de um prazo). Muda a regra e as datas de todos os meses se ajustam. Feriados não entram na conta.</p></div>' +
      '<div class="row"><div class="seg"><button id="mPrev">← anterior</button><button id="mNow">hoje</button><button id="mNext">próximo →</button></div><button class="btn admin-only" id="cNew">Novo marco <span class="arrow">→</span></button></div></div>' +
      '<div class="card pad" style="padding-block:4px">' + (items.length ? items.map(function (it) {
        var pa = S.pauta.some(function (p) { return p.ciclo === it.id + "@" + iso(it.d); });
        return '<div class="tl ' + (it.d.getTime() < t0 ? "past" : "") + (it.d.getTime() === t0 ? " is-today" : "") + '">' +
          '<div class="when">' + fmt(it.d) + "<small>" + DOW_LONG[it.d.getDay()] + (it.d.getMonth() !== m ? " · mês anterior" : "") + "</small></div>" +
          '<div><span class="chain">' + esc(it.cadeia || "") + "</span><b>" + esc(it.titulo) + "</b>" + (it.desc ? "<p>" + esc(it.desc) + "</p>" : "") +
          '<div class="who">' + (it.quem || []).map(function (w) { return '<span class="tag">' + esc(w) + "</span>"; }).join("") + '<span class="rule-txt">· ' + esc(ruleText(it.regra)) + "</span></div></div>" +
          '<div class="side"><button class="icon-btn admin-only" data-cedit="' + esc(it.id) + '">Editar</button>' +
          (pa ? '<span class="hint">✓ na pauta</span>' : '<button class="linkbtn" data-cpauta="' + esc(it.id) + '" data-d="' + iso(it.d) + '">+ pauta</button>') + "</div></div>";
      }).join("") : '<div class="empty" style="margin:12px 0">' + (loaded.ciclo ? "Nenhum marco ainda." : "Carregando…") + "</div>") + "</div>";
    $("#mPrev").onclick = function () { monthOffset--; renderCiclo(); };
    $("#mNext").onclick = function () { monthOffset++; renderCiclo(); };
    $("#mNow").onclick = function () { monthOffset = 0; renderCiclo(); };
    $("#cNew").onclick = function () { openCicloEditor(null); };
    $$("[data-cedit]", el).forEach(function (b) { b.onclick = function () { openCicloEditor(S.ciclo.find(function (x) { return x.id === b.dataset.cedit; })); }; });
    $$("[data-cpauta]", el).forEach(function (b) {
      b.onclick = function () {
        var it = S.ciclo.find(function (x) { return x.id === b.dataset.cpauta; }); if (!it) return;
        Store.add("pauta", { titulo: it.titulo, conta: it.conta || "Ambas", resp: (it.quem || [me])[0], reuniao: it.reuniao || "", area: it.area || "Outro", prazo: b.dataset.d, status: "aberto", notas: it.desc || "", criadoEm: new Date().toISOString(), criadoPor: me, ciclo: it.id + "@" + b.dataset.d })
          .then(function () { toast("Na pauta"); }, fail);
      };
    });
  }

  function openCicloEditor(c) {
    var isNew = !c; var L = listas();
    c = c || { titulo: "", desc: "", regra: { tipo: "dia", n: 10, dia: 10 }, quem: [me], cadeia: "", conta: "Ambas", area: "", reuniao: "" };
    var r = Object.assign({ tipo: "dia", n: 0, dia: 10 }, c.regra);
    var quem = (c.quem || []).slice();
    openModal(
      '<header><h3>' + (isNew ? "Novo marco do mês" : "Editar marco") + '</h3><button class="x" data-close>✕</button></header>' +
      '<div class="body">' +
        '<div class="field"><label>O que acontece</label><input type="text" id="ceT" value="' + esc(c.titulo) + '" autofocus></div>' +
        '<div class="field"><label>Detalhe</label><textarea id="ceD" style="min-height:60px">' + esc(c.desc || "") + "</textarea></div>" +
        '<div class="grid2"><div class="field"><label>Regra da data</label><select id="ceR">' +
          [["util", "Nº dia útil do mês"], ["dia", "Dia fixo (ou dia útil anterior)"], ["antes", "X dias úteis antes de um dia"], ["semana", "1º dia da semana a partir de um dia"], ["ultimo", "Último dia útil (menos X)"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === r.tipo ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") +
        '</select></div><div class="field" id="ceNW"></div><div class="field" id="ceDW"></div></div>' +
        '<p class="hint" id="cePrev"></p>' +
        '<div class="field"><label>Quem</label><div class="chips" id="ceQ">' + respOpts().map(function (n) { return '<button type="button" data-p="' + esc(n) + '" aria-pressed="' + (quem.indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") + "</div></div>" +
        '<div class="grid2"><div class="field"><label>Etapa / grupo</label><input type="text" id="ceCad" value="' + esc(c.cadeia || "") + '" placeholder="ex: tabloide 2/6"></div>' +
        '<div class="field"><label>Conta</label><select id="ceC">' + opt(L.contas, c.conta) + "</select></div>" +
        '<div class="field"><label>Frente</label><select id="ceA">' + opt(L.areas, c.area, "—") + "</select></div>" +
        '<div class="field"><label>Reunião</label><select id="ceM">' + opt(L.reunioes, c.reuniao, "Sem reunião") + "</select></div></div>" +
      "</div><footer>" + (isNew ? "<span></span>" : '<span id="ceDelW"><button class="btn ghost small" id="ceDel">Excluir marco</button></span>') + '<button class="btn" id="ceSave">Salvar <span class="arrow">→</span></button></footer>'
    );
    var drawRule = function () {
      var t = $("#ceR").value;
      var nLbl = { util: "Qual dia útil", dia: "Dia do mês", antes: "Quantos dias úteis antes", semana: "Dia da semana", ultimo: "Dias úteis antes do último" }[t];
      $("#ceNW").innerHTML = "<label>" + nLbl + "</label>" + (t === "semana"
        ? '<select id="ceN">' + [1, 2, 3, 4, 5].map(function (i) { return '<option value="' + i + '"' + (Number(r.n) === i ? " selected" : "") + ">" + DOW_LONG[i] + "</option>"; }).join("") + "</select>"
        : '<input type="number" id="ceN" min="0" max="31" value="' + esc(t === "dia" ? (r.n || r.dia) : r.n) + '">');
      $("#ceDW").innerHTML = (t === "antes" || t === "semana") ? '<label>' + (t === "antes" ? "Antes do dia" : "A partir do dia") + '</label><input type="number" id="ceDia" min="1" max="31" value="' + esc(r.dia || 10) + '">' : "";
      var up = function () {
        r = { tipo: $("#ceR").value, n: Number($("#ceN").value) || 0, dia: $("#ceDia") ? Number($("#ceDia").value) || 1 : (Number($("#ceN").value) || 1) };
        var now = new Date(), a = ruleDate(r, now.getFullYear(), now.getMonth()), b = ruleDate(r, now.getFullYear(), now.getMonth() + 1);
        $("#cePrev").textContent = "Fica: " + ruleText(r) + ". Este mês cai em " + fmt(a) + " (" + DOW[a.getDay()] + "), no próximo em " + fmt(b) + " (" + DOW[b.getDay()] + ").";
      };
      $("#ceN").oninput = up; if ($("#ceDia")) $("#ceDia").oninput = up; up();
    };
    $("#ceR").onchange = function () { r.tipo = this.value; drawRule(); };
    drawRule();
    $("[data-close]").onclick = closeModal;
    $("#ceQ").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var i = quem.indexOf(b.dataset.p); if (i >= 0) quem.splice(i, 1); else quem.push(b.dataset.p); b.setAttribute("aria-pressed", String(i < 0)); };
    $("#ceSave").onclick = function () {
      var t = $("#ceT").value.trim(); if (!t) { $("#ceT").focus(); return; }
      var doc = { titulo: t, desc: $("#ceD").value, regra: r, quem: quem, cadeia: $("#ceCad").value.trim(), conta: $("#ceC").value, area: $("#ceA").value, reuniao: $("#ceM").value, ordem: isNew ? S.ciclo.length + 1 : (c.ordem || 0) };
      (isNew ? Store.add("ciclo", doc) : Store.set("ciclo", c.id, doc)).then(function () { toast("Salvo"); }, fail); closeModal();
    };
    var del = $("#ceDel"); if (del) del.onclick = function () {
      $("#ceDelW").innerHTML = '<span class="confirm">Excluir? <button class="yes" id="ceY">sim</button><button class="no" id="ceNo">não</button></span>';
      $("#ceY").onclick = function () { Store.del("ciclo", c.id).catch(fail); closeModal(); };
      $("#ceNo").onclick = closeModal;
    };
  }

  /* ================================================================
     TIME
     ================================================================ */
  var personSel = LS.get("person", "");
  function renderTime() {
    var el = $("#v-time"); var ps = pessoas();
    if (!ps.length) { el.innerHTML = '<div class="empty">' + (loaded.pessoas ? "Nenhuma pessoa cadastrada." : "Carregando…") + "</div>"; return; }
    var p = ps.find(function (x) { return x.id === personSel; }) || ps.find(function (x) { return !x.gestor; }) || ps[0];
    personSel = p.id;
    var open = S.pauta.filter(function (i) { return i.status !== "feito"; });
    var cardsOpen = S.cartoes.filter(function (c) { return !c.arquivado && !c.concluido; });
    var wd = new Date().getDay();
    var isPJ = /pj/i.test(p.vinculo || "");
    var sortS = function (a, b) { var x = toMin(a.hora), y = toMin(b.hora); if (x == null && y == null) return 0; if (x == null) return -1; if (y == null) return 1; return x - y; };
    var days = DIAS.filter(function (d) { return (p.semana || []).some(function (s) { return s.dia === d[0]; }); }).map(function (d) {
      var isToday = d[0] !== "diario" && DOW[wd] === d[0];
      var ss = p.semana.filter(function (s) { return s.dia === d[0]; }).sort(sortS);
      return '<div class="pday ' + (isToday ? "today" : "") + '"><div class="dn">' + d[1] + (isToday ? " · hoje" : "") + "</div><ul>" + ss.map(function (s) {
        return '<li class="' + (s.comTony ? "touch" : "") + '"><span class="tm">' + esc(s.hora || "") + "</span><span>" + esc(s.titulo) + "</span>" + (s.comTony ? '<span class="tag touch">com ' + esc(gestor() ? gestor().nome : "gestor") + "</span>" : "") + (s.desc ? "<p>" + esc(s.desc) + "</p>" : "") + "</li>";
      }).join("") + "</ul></div>";
    }).join("");
    var now = new Date();
    var mon = cycleFor(now.getFullYear(), now.getMonth()).concat(cycleFor(now.getFullYear(), now.getMonth() + 1))
      .filter(function (c) { return (c.quem || []).indexOf(p.nome) >= 0 && c.d >= today(); }).slice(0, 6);
    var mine = open.filter(function (i) { return i.resp === p.nome; }).sort(function (a, b) { return (a.prazo || "9999").localeCompare(b.prazo || "9999"); });
    var myCards = cardsOpen.filter(function (c) { return (c.resp || []).indexOf(p.nome) >= 0; });
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Time</div><h2>O fluxo de cada um, encaixado no seu</h2>' +
      '<p class="muted">Pontos marcados <span class="tag touch">com ' + esc(gestor() ? gestor().nome : "gestor") + '</span> caem no mesmo horário da sua semana. Para quem é PJ, o fluxo mostra só os combinados, entregas e pontos de contato.</p></div>' +
      '<button class="btn ghost admin-only" id="newPerson">+ Pessoa</button></div>' +
      '<div class="pick" role="tablist">' + ps.map(function (x) {
        var n = open.filter(function (i) { return i.resp === x.nome; }).length + cardsOpen.filter(function (c) { return (c.resp || []).indexOf(x.nome) >= 0; }).length;
        return '<button role="tab" data-p="' + esc(x.id) + '" aria-selected="' + (x.id === p.id) + '">' + esc(x.nome) + (n ? '<span class="n">' + n + "</span>" : "") + "</button>";
      }).join("") + "</div>" +
      '<div class="pmeta"><b>' + esc(p.nome) + "</b><span>" + esc(p.papel || "") + '</span><span class="tag ' + (isPJ ? "pj" : "solid") + '">' + esc(p.vinculo || "") + "</span><span>Canal: " + esc(p.canal || "—") + '</span>' + (isAdmin() || p.nome === me ? '<button class="btn small" id="editPerson">Editar fluxo <span class="arrow">→</span></button>' : "") + '</div>' +
      '<div class="pv"><div class="card pad"><h3>' + (p.gestor ? "Sua semana" : isPJ ? "Combinados e pontos de contato" : "Semana de " + esc(p.nome)) + "</h3>" +
        (days ? '<div class="pdays">' + days + "</div>" : '<p class="hint">Sem rotina semanal fixa. Trabalha por demanda, pelos combinados ao lado.</p>') + "</div>" +
      '<div class="side-col">' +
        ((p.entrega || []).length || (p.recebe || []).length ? '<div class="card pad"><h3>Troca com o ' + esc(gestor() ? gestor().nome : "gestor") + '</h3><ul class="handoff">' +
          (p.entrega || []).map(function (x) { return '<li><span class="arrow">entrega · ' + esc(x.quando) + "</span><span>" + esc(x.texto) + "</span></li>"; }).join("") +
          (p.recebe || []).map(function (x) { return '<li><span class="arrow in">recebe · ' + esc(x.quando) + "</span><span>" + esc(x.texto) + "</span></li>"; }).join("") + "</ul></div>" : "") +
        (mon.length ? '<div class="card pad"><h3>Próximos marcos do mês</h3><ul class="mini">' + mon.map(function (c) { return '<li><span class="d">' + fmt(c.d) + "</span><span>" + esc(c.titulo) + "</span></li>"; }).join("") + "</ul></div>" : "") +
        '<div class="card pad"><h3>Em aberto</h3>' + (mine.length || myCards.length ? '<ul class="mini">' +
          mine.slice(0, 8).map(function (i) { return '<li><span class="d">' + (i.prazo ? fmt(parse(i.prazo)) : "—") + '</span><span><span class="tag ' + esc(i.conta) + '">' + esc(i.conta) + "</span> " + esc(i.titulo) + "</span></li>"; }).join("") +
          myCards.slice(0, 8).map(function (c) { var q = S.quadros.find(function (x) { return x.id === c.quadro; }); var col = q && (q.colunas || []).find(function (x) { return x.id === c.coluna; }); return '<li><span class="d">' + (c.prazo ? fmt(parse(c.prazo)) : "—") + "</span><span>" + esc(c.titulo) + ' <span class="hint">· ' + esc(col ? col.nome : "") + "</span></span></li>"; }).join("") +
          "</ul>" : '<p class="hint">Nada aberto em nome de ' + esc(p.nome) + ".</p>") + "</div>" +
      "</div></div>" +
      ((p.frentes || []).length ? '<div><div class="section-title" style="margin:6px 0 10px"><h3>Frentes de ' + esc(p.nome) + ' <span class="hint">· ' + p.frentes.length + '</span></h3></div><div class="frentes">' + p.frentes.map(function (f) {
        return '<div class="frente"><header><b>' + esc(f.nome) + '</b><span class="tag">' + esc(f.cadencia || "") + "</span></header><ul>" + (f.itens || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></div>";
      }).join("") + "</div></div>" : "");
    $$(".pick [data-p]", el).forEach(function (b) { b.onclick = function () { personSel = b.dataset.p; LS.set("person", personSel); renderTime(); }; });
    if ($("#editPerson")) $("#editPerson").onclick = function () { openPersonEditor(p); };
    $("#newPerson").onclick = function () { openPersonEditor(null); };
  }

  function openPersonEditor(p) {
    var isNew = !p;
    var d = JSON.parse(JSON.stringify(p || { nome: "", vinculo: "PJ", papel: "", canal: "", semana: [], entrega: [], recebe: [], frentes: [], mes: [], ordem: S.pessoas.length }));
    d.semana = d.semana || []; d.entrega = d.entrega || []; d.recebe = d.recebe || []; d.frentes = d.frentes || [];
    function sync() {
      var m = $("#modalRoot .modal"); if (!m) return;
      d.nome = $("#peN").value.trim(); d.vinculo = $("#peV").value.trim(); d.papel = $("#peP").value.trim(); d.canal = $("#peC").value.trim();
      d.semana = $$("[data-srow]", m).map(function (row) {
        var g = function (k) { var e = $('[data-k="' + k + '"]', row); return e ? (e.type === "checkbox" ? e.checked : e.value) : ""; };
        return { dia: g("dia"), hora: g("hora").trim(), titulo: g("titulo").trim(), desc: g("desc").trim(), tipo: g("tipo"), comTony: g("comTony") };
      });
      ["entrega", "recebe"].forEach(function (k) {
        d[k] = $$('[data-prow="' + k + '"]', m).map(function (row) { return { quando: $('[data-k="quando"]', row).value.trim(), texto: $('[data-k="texto"]', row).value.trim() }; });
      });
      d.frentes = $$("[data-frow]", m).map(function (row) {
        return { nome: $('[data-k="nome"]', row).value.trim(), cadencia: $('[data-k="cadencia"]', row).value.trim(), itens: $('[data-k="itens"]', row).value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean) };
      });
    }
    function draw() {
      var sel = function (list, cur) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + o[1] + "</option>"; }).join(""); };
      var html =
        '<header><h3>' + (isNew ? "Nova pessoa" : "Fluxo de " + esc(d.nome)) + '</h3><button class="x" data-close>✕</button></header>' +
        '<div class="body">' +
          '<div class="grid2"><div class="field"><label>Nome</label><input type="text" id="peN" value="' + esc(d.nome) + '"></div>' +
          '<div class="field"><label>Vínculo</label><input type="text" id="peV" value="' + esc(d.vinculo || "") + '" placeholder="PJ, Dedicada, Estágio…"></div>' +
          '<div class="field"><label>Papel</label><input type="text" id="peP" value="' + esc(d.papel || "") + '"></div>' +
          '<div class="field"><label>Canal</label><input type="text" id="peC" value="' + esc(d.canal || "") + '"></div></div>' +
          '<div class="field"><div class="section-title"><label>Semana · blocos, ritos e combinados</label><button class="btn ghost small" data-addrow="semana">+ Bloco</button></div>' +
          '<p class="hint">Hora no formato 14:00 para aparecer no "agora". Pode escrever "manhã", "tarde" ou deixar vazio.</p>' +
          '<div class="edit-table">' + d.semana.map(function (s, i) {
            return '<div class="edit-row" data-srow="' + i + '"><select data-k="dia">' + sel(DIAS, s.dia) + '</select><input type="text" data-k="hora" value="' + esc(s.hora || "") + '" placeholder="hora"><input type="text" data-k="titulo" value="' + esc(s.titulo || "") + '" placeholder="O que"><select data-k="tipo">' + sel(TIPOS, s.tipo) + '</select>' +
              (d.gestor ? "<span></span>" : '<label class="ct"><input type="checkbox" data-k="comTony"' + (s.comTony ? " checked" : "") + "> com gestor</label>") +
              '<button class="x" data-delrow="semana" data-i="' + i + '" aria-label="Remover">✕</button><textarea data-k="desc" placeholder="Detalhe">' + esc(s.desc || "") + "</textarea></div>";
          }).join("") + "</div></div>" +
          (d.gestor ? "" : ["entrega", "recebe"].map(function (k) {
            return '<div class="field"><div class="section-title"><label>' + (k === "entrega" ? "Entrega para o gestor" : "Recebe do gestor") + '</label><button class="btn ghost small" data-addrow="' + k + '">+ Linha</button></div><div class="edit-table">' +
              d[k].map(function (x, i) { return '<div class="pair-row" data-prow="' + k + '"><input type="text" data-k="quando" value="' + esc(x.quando) + '" placeholder="quando"><input type="text" data-k="texto" value="' + esc(x.texto) + '" placeholder="o quê"><button class="x" data-delrow="' + k + '" data-i="' + i + '">✕</button></div>'; }).join("") + "</div></div>";
          }).join("")) +
          '<div class="field"><div class="section-title"><label>Frentes de trabalho (checklists)</label><button class="btn ghost small" data-addrow="frentes">+ Frente</button></div><div class="edit-table">' +
            d.frentes.map(function (f, i) { return '<div class="frente-edit" data-frow="' + i + '"><div class="top"><input type="text" data-k="nome" value="' + esc(f.nome) + '" placeholder="Nome da frente"><input type="text" data-k="cadencia" value="' + esc(f.cadencia || "") + '" placeholder="Cadência"><button class="x" data-delrow="frentes" data-i="' + i + '">✕</button></div><textarea data-k="itens" placeholder="Um item por linha">' + esc((f.itens || []).join("\n")) + "</textarea></div>"; }).join("") +
          "</div></div>" +
        "</div>" +
        '<footer>' + (isNew || d.gestor ? "<span></span>" : '<span id="peDelW"><button class="btn ghost small" id="peDel">Remover pessoa</button></span>') + '<button class="btn" id="peSave">Salvar <span class="arrow">→</span></button></footer>';
      if ($("#mb")) $("#modalRoot .modal").innerHTML = html; else openModal(html, { wide: true });
      var m = $("#modalRoot .modal");
      $("[data-close]", m).onclick = closeModal;
      $$("[data-addrow]", m).forEach(function (b) { b.onclick = function () { sync(); var k = b.dataset.addrow; if (k === "semana") d.semana.push({ dia: "seg", hora: "", titulo: "", desc: "", tipo: d.gestor ? "foco" : "combinado", comTony: false }); else if (k === "frentes") d.frentes.push({ nome: "", cadencia: "", itens: [] }); else d[k].push({ quando: "", texto: "" }); draw(); }; });
      $$("[data-delrow]", m).forEach(function (b) { b.onclick = function () { sync(); d[b.dataset.delrow].splice(Number(b.dataset.i), 1); draw(); }; });
      $("#peSave").onclick = function () {
        sync(); if (!d.nome) { $("#peN").focus(); return; }
        d.semana = d.semana.filter(function (s) { return s.titulo; });
        d.entrega = d.entrega.filter(function (x) { return x.texto; }); d.recebe = d.recebe.filter(function (x) { return x.texto; });
        d.frentes = d.frentes.filter(function (f) { return f.nome; });
        var id = d.id; var doc = Object.assign({}, d); delete doc.id;
        (isNew ? Store.add("pessoas", doc).then(function (nid) { personSel = nid; LS.set("person", nid); }) : Store.set("pessoas", id, doc)).then(function () { toast("Salvo"); setTimeout(syncEquipe, 300); }, fail);
        closeModal();
      };
      var del = $("#peDel"); if (del) del.onclick = function () {
        $("#peDelW").innerHTML = '<span class="confirm">Remover ' + esc(d.nome) + '? <button class="yes" id="peY">sim</button><button class="no" id="peNo">não</button></span>';
        $("#peY").onclick = function () { Store.del("pessoas", d.id).catch(fail); personSel = ""; closeModal(); };
        $("#peNo").onclick = function () { sync(); draw(); };
      };
    }
    if (p) d.id = p.id;
    draw();
  }

  /* ================================================================
     MODELOS
     ================================================================ */
  var editingTpl = null;
  function renderModelos() {
    var el = $("#v-modelos"); var ms = S.modelos.slice().sort(byOrder);
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Modelos</div><h2>Briefings e mensagens prontas</h2><p class="muted">Copie e cole no Whats, ou use direto dentro de um cartão. Edite à vontade: o modelo é seu.</p></div><button class="btn admin-only" id="tNew">Novo modelo <span class="arrow">→</span></button></div>' +
      (ms.length ? '<div class="tpls">' + ms.map(function (t) {
        if (editingTpl === t.id) return '<article class="card tpl"><input type="text" id="teT" value="' + esc(t.titulo) + '"><textarea id="teB">' + esc(t.corpo) + '</textarea><div class="row" style="justify-content:space-between"><span id="teDelW"><button class="btn ghost small" id="teDel">Excluir</button></span><span class="row"><button class="btn ghost small" id="teCancel">Cancelar</button><button class="btn small" id="teSave">Salvar</button></span></div></article>';
        return '<article class="card tpl"><div class="head"><h3>' + esc(t.titulo) + '</h3><span class="row"><button class="icon-btn admin-only" data-tedit="' + esc(t.id) + '">Editar</button><button class="btn small" data-tcopy="' + esc(t.id) + '">Copiar</button></span></div><pre>' + esc(t.corpo) + "</pre></article>";
      }).join("") + "</div>" : '<div class="empty">' + (loaded.modelos ? "Nenhum modelo ainda." : "Carregando…") + "</div>");
    $("#tNew").onclick = function () {
      Store.add("modelos", { titulo: "Novo modelo", corpo: "", ordem: ms.length + 1 }).then(function (id) { editingTpl = id; renderModelos(); }, fail);
    };
    $$("[data-tcopy]", el).forEach(function (b) { b.onclick = function () { var t = S.modelos.find(function (x) { return x.id === b.dataset.tcopy; }); if (t) copy(t.corpo); }; });
    $$("[data-tedit]", el).forEach(function (b) { b.onclick = function () { editingTpl = b.dataset.tedit; renderModelos(); }; });
    if (editingTpl && $("#teSave")) {
      $("#teSave").onclick = function () { var id = editingTpl; editingTpl = null; Store.upd("modelos", id, { titulo: $("#teT").value.trim() || "Modelo", corpo: $("#teB").value }).then(function () { toast("Salvo"); }, fail); renderModelos(); };
      $("#teCancel").onclick = function () { editingTpl = null; renderModelos(); };
      $("#teDel").onclick = function () {
        $("#teDelW").innerHTML = '<span class="confirm">Excluir? <button class="yes" id="teY">sim</button><button class="no" id="teN">não</button></span>';
        $("#teY").onclick = function () { var id = editingTpl; editingTpl = null; Store.del("modelos", id).catch(fail); };
        $("#teN").onclick = function () { renderModelos(); };
      };
    }
  }

  /* ================================================================
     CALENDÁRIO
     ================================================================ */
  var calOffset = 0;
  var calF = { pauta: true, cartoes: true, ciclo: true, eventos: true, reunioes: LS.get("calR", "0") === "1", pessoa: "", conta: "" };
  calF.vencimentos = true;

  function calEntries(y, m) {
    var map = {};
    var push = function (d, e) { var k = iso(d); (map[k] = map[k] || []).push(e); };
    var quem = focoMeu() ? me : calF.pessoa;
    var passP = function (who) { return !quem || (Array.isArray(who) ? who.indexOf(quem) >= 0 : who === quem); };
    var passC = function (c) { return !calF.conta || c === calF.conta || c === "Ambas"; };
    if (calF.eventos) S.eventos.forEach(function (e) { var d = parse(e.data); if (d && passP(e.quem || []) && passC(e.conta)) push(d, { k: "evento", id: e.id, t: (e.hora ? e.hora + " " : "") + e.titulo, sort: e.hora || "00", conta: e.conta }); });
    if (calF.pauta) S.pauta.forEach(function (i) { var d = parse(i.prazo); if (d && (passP(i.resp) || (quem && acompDe(i).indexOf(quem) >= 0)) && passC(i.conta)) push(d, { k: "pauta", id: i.id, t: i.titulo, done: i.status === "feito", sort: "50", conta: i.conta }); });
    if (calF.cartoes) S.cartoes.forEach(function (c) { var d = parse(c.prazo); if (d && !c.arquivado && passP(c.resp || []) && passC(c.conta)) push(d, { k: "cartao", id: c.id, t: c.titulo, done: !!c.concluido, sort: "60", cor: (c.etiquetas || []).length ? labelColor(c.etiquetas[0]) : "", conta: c.conta }); });
    if (calF.ciclo) [-1, 0, 1].forEach(function (o) { cycleFor(y, m + o).forEach(function (c) { if (passP(c.quem || []) && passC(c.conta)) push(c.d, { k: "ciclo", id: c.id, t: c.titulo, sort: "40" }); }); });
    if (calF.vencimentos && isAdmin() && !focoMeu()) S.nfs.forEach(function (n) { var d = parse(n.vencimento); if (d && n.status !== "paga" && passC(n.conta)) push(d, { k: "venc", id: n.id, t: brl(n.valor) + " · " + (n.fornecedor || n.descricao || "NF"), sort: "45" }); });
    if (calF.visitas !== false) S.visitas.forEach(function (v) { var d = parse(v.data); if (d && passP(v.resp) && passC(v.conta)) push(d, { k: "visita", id: v.id, t: "Visita · " + (v.loja || ""), sort: "30", conta: v.conta }); });
    if (isAdmin() && !focoMeu()) {
      S.eventos_org.forEach(function (e) { var d = parse(e.data); if (d && e.status !== "cancelado" && passC(e.conta)) push(d, { k: "evorg", id: e.id, t: "★ " + (e.nome || "Evento"), sort: "20", conta: e.conta }); });
      S.reunioes_dir.forEach(function (r) { var d = parse(r.data); if (d) push(d, { k: "reudir", id: r.id, t: (r.hora ? r.hora + " " : "") + (r.tipo || "Reunião"), sort: "15" }); });
      S.campanhas.forEach(function (c) { var d = parse(c.inicio); if (d && c.status !== "cancelada" && passC(c.conta)) push(d, { k: "camp", id: c.id, t: "Campanha · " + c.nome, sort: "25", conta: c.conta }); });
    }
    if (calF.reunioes) {
      var g = pessoaMe(); var reus = g ? (g.semana || []).filter(function (s) { return s.tipo === "reuniao"; }) : [];
      var start = new Date(y, m - 1, 20), end = new Date(y, m + 1, 12);
      for (var d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        var key = DOW[d.getDay()];
        reus.forEach(function (s) { if (s.dia === key) push(new Date(d), { k: "reuniao", id: "", t: (s.hora && s.hora !== "manhã" && s.hora !== "tarde" ? s.hora + " " : "") + s.titulo, sort: toMin(s.hora) != null ? pad(Math.floor(toMin(s.hora) / 60)) : "01" }); });
      }
    }
    Object.keys(map).forEach(function (k) { map[k].sort(function (a, b) { return String(a.sort).localeCompare(String(b.sort)); }); });
    return map;
  }
  function chipHTML(e) {
    var tag = { evento: "", pauta: "", cartao: "", ciclo: "", reuniao: "" }[e.k];
    return '<button class="cchip c-' + e.k + (e.done ? " done" : "") + (e.conta ? " acc-" + esc(e.conta) : "") + '" data-ck="' + e.k + '" data-cid="' + esc(e.id) + '"' + (e.cor ? ' style="--dot:' + esc(e.cor) + '"' : "") + ' title="' + esc(e.t) + '">' + tag + esc(e.t) + "</button>";
  }
  function renderCalendario() {
    var el = $("#v-calendario"); var L = listas();
    var base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + calOffset);
    var y = base.getFullYear(), m = base.getMonth();
    var ent = calEntries(y, m);
    var first = new Date(y, m, 1); var start = new Date(first); start.setDate(1 - first.getDay());
    var t0 = iso(today());
    var cells = "";
    for (var i = 0; i < 42; i++) {
      var d = new Date(start); d.setDate(start.getDate() + i);
      if (i === 35 && d.getMonth() !== m) break;
      var k = iso(d), list = ent[k] || [];
      cells += '<div class="cday' + (d.getMonth() !== m ? " out" : "") + (k === t0 ? " today" : "") + (d.getDay() === 0 || d.getDay() === 6 ? " wknd" : "") + '" data-day="' + k + '">' +
        '<div class="cnum">' + d.getDate() + "</div>" + list.slice(0, 4).map(chipHTML).join("") +
        (list.length > 4 ? '<button class="cmore" data-day-open="' + k + '">+' + (list.length - 4) + " mais</button>" : "") + "</div>";
    }
    // agenda (celular)
    var days = Object.keys(ent).filter(function (k) { var d = parse(k); return d.getMonth() === m && d.getFullYear() === y; }).sort();
    var agenda = days.length ? days.map(function (k) { var d = parse(k); return '<div class="aday' + (k === t0 ? " today" : "") + '"><div class="adate"><b>' + d.getDate() + "</b><span>" + DOW[d.getDay()] + '</span></div><div class="alist">' + ent[k].map(chipHTML).join("") + '<button class="linkbtn" data-day-open="' + k + '">+ adicionar</button></div></div>'; }).join("") : '<div class="empty">Nada neste mês com esses filtros.</div>';
    var tg = function (key, label) { return '<button type="button" data-cf="' + key + '" aria-pressed="' + calF[key] + '">' + label + "</button>"; };
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Calendário</div><h2>' + MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1) + " de " + y + '</h2><p class="muted">Pauta, cartões dos quadros, marcos do ciclo e eventos num lugar só. Clique num dia para adicionar um evento ou uma pendência.</p></div>' +
      '<div class="row"><div class="seg"><button id="calPrev">← anterior</button><button id="calNow">hoje</button><button id="calNext">próximo →</button></div><button class="btn" id="calNew">Novo evento <span class="arrow">→</span></button></div></div>' +
      '<div class="row" style="justify-content:space-between"><div class="chips">' + tg("eventos", "Eventos") + tg("pauta", "Pauta") + tg("cartoes", "Cartões") + tg("ciclo", "Ciclo do mês") + tg("reunioes", "Reuniões fixas") + (isAdmin() ? tg("vencimentos", "Vencimentos de NF") : "") + "</div>" +
      '<div class="row"><select id="calP" style="width:auto"><option value="">Todo mundo</option>' + respOpts().map(function (n) { return "<option" + (n === calF.pessoa ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + "</select>" +
      '<select id="calC" style="width:auto"><option value="">Todas as contas</option>' + L.contas.filter(function (c) { return c !== "Ambas"; }).map(function (c) { return "<option" + (c === calF.conta ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="clegend"><span class="c-evento">Evento</span><span class="c-pauta">Pauta</span><span class="c-cartao">Cartão</span><span class="c-ciclo">Ciclo</span><span class="c-reuniao">Reunião fixa</span></div>' +
      '<div class="cal"><div class="cgrid">' + ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"].map(function (d) { return '<div class="chead">' + d + "</div>"; }).join("") + cells + "</div></div>" +
      '<div class="agenda">' + agenda + "</div>";
    $("#calPrev").onclick = function () { calOffset--; renderCalendario(); };
    $("#calNext").onclick = function () { calOffset++; renderCalendario(); };
    $("#calNow").onclick = function () { calOffset = 0; renderCalendario(); };
    $("#calNew").onclick = function () { openEvento(null, iso(today())); };
    $("#calP").onchange = function () { calF.pessoa = this.value; renderCalendario(); };
    $("#calC").onchange = function () { calF.conta = this.value; renderCalendario(); };
    $$("[data-cf]", el).forEach(function (b) { b.onclick = function () { calF[b.dataset.cf] = !calF[b.dataset.cf]; if (b.dataset.cf === "reunioes") LS.set("calR", calF.reunioes ? "1" : "0"); renderCalendario(); }; });
    el.onclick = function (e) {
      var c = e.target.closest("[data-ck]");
      if (c) {
        var k = c.dataset.ck, id = c.dataset.cid;
        if (k === "evento") openEvento(S.eventos.find(function (x) { return x.id === id; }));
        else if (k === "pauta") { var it = S.pauta.find(function (x) { return x.id === id; }); if (it) openPautaItem(it); }
        else if (k === "cartao") { openCard(id); modalClose = function () { openCardId = null; renderCalendario(); }; }
        else if (k === "ciclo") openCicloEditor(S.ciclo.find(function (x) { return x.id === id; }));
        else if (k === "reuniao") showView("semana");
        else if (k === "reudir") { var rd = S.reunioes_dir.find(function (x) { return x.id === id; }); if (rd) openReuniao(rd); }
        else if (k === "evorg") { var eo = S.eventos_org.find(function (x) { return x.id === id; }); if (eo) openEventoOrg(eo); }
        else if (k === "camp") { var cp = S.campanhas.find(function (x) { return x.id === id; }); if (cp) openCampanha(cp); }
        else if (k === "visita") { var vv = S.visitas.find(function (x) { return x.id === id; }); if (vv) openVisita(vv); }
        else if (k === "venc") { var nf = S.nfs.find(function (x) { return x.id === id; }); if (nf) openNF(nf); }
        return;
      }
      var o = e.target.closest("[data-day-open]") || e.target.closest(".cday");
      if (o) openDay(o.dataset.dayOpen || o.dataset.day, ent);
    };
  }
  function openDay(k, ent) {
    var d = parse(k); var list = ent[k] || [];
    openModal('<header><h3>' + DOW_LONG[d.getDay()] + ", " + fmt(d) + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      (list.length ? '<div class="daylist">' + list.map(chipHTML).join("") + "</div>" : '<p class="hint">Nada marcado neste dia.</p>') +
      '<div class="field"><label>Adicionar neste dia</label><div class="row"><input type="text" id="dayT" placeholder="O que é?" style="flex:1" autofocus></div>' +
      '<div class="row"><button class="btn small" id="dayEv">Como evento</button><button class="btn ghost small" id="dayPa">Como pendência na pauta</button></div></div></div>');
    $("[data-close]").onclick = closeModal;
    $(".daylist") && ($(".daylist").onclick = function (e) { var c = e.target.closest("[data-ck]"); if (!c) return; closeModal(); var ev = new MouseEvent("click", { bubbles: true }); var t = $('#v-calendario [data-ck="' + c.dataset.ck + '"][data-cid="' + c.dataset.cid + '"]'); if (t) t.dispatchEvent(ev); else if (c.dataset.ck === "evento") openEvento(S.eventos.find(function (x) { return x.id === c.dataset.cid; })); });
    $("#dayEv").onclick = function () { var t = $("#dayT").value.trim(); closeModal(); openEvento({ titulo: t, data: k }, k, true); };
    $("#dayPa").onclick = function () {
      var t = $("#dayT").value.trim(); if (!t) { $("#dayT").focus(); return; }
      Store.add("pauta", { titulo: t, conta: "Ambas", resp: me, reuniao: "", area: "Outro", prazo: k, status: "aberto", notas: "", criadoEm: new Date().toISOString(), criadoPor: me }).then(function () { toast("Na pauta"); }, fail);
      closeModal();
    };
    $("#dayT").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); $("#dayEv").click(); } };
  }
  function openEvento(ev, dia, isNewPrefill) {
    var L = listas(); var isNew = !ev || isNewPrefill || !ev.id;
    ev = Object.assign({ titulo: "", data: dia || iso(today()), hora: "", fim: "", tipo: "Reunião", conta: "Ambas", local: "", desc: "", quem: [me] }, ev || {});
    var quem = (ev.quem || []).slice();
    openModal('<header><input class="title" id="evT" value="' + esc(ev.titulo) + '" placeholder="Nome do evento" style="flex:1" autofocus><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Data</label><input type="date" id="evD" value="' + esc(ev.data) + '"></div>' +
      '<div class="field"><label>Início</label><input type="text" id="evH" value="' + esc(ev.hora) + '" placeholder="14:00"></div>' +
      '<div class="field"><label>Fim</label><input type="text" id="evF" value="' + esc(ev.fim || "") + '" placeholder="15:00"></div>' +
      '<div class="field"><label>Tipo</label><select id="evTp">' + opt(listas().tiposEvento, ev.tipo) + "</select></div>" +
      '<div class="field"><label>Conta</label><select id="evC">' + opt(L.contas, ev.conta) + "</select></div>" +
      '<div class="field"><label>Local</label><input type="text" id="evL" value="' + esc(ev.local || "") + '" placeholder="Loja, cidade, link"></div></div>' +
      '<div class="field"><label>Quem participa</label><div class="chips" id="evQ">' + respOpts().map(function (n) { return '<button type="button" data-p="' + esc(n) + '" aria-pressed="' + (quem.indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") + "</div></div>" +
      '<div class="field"><label>Detalhes</label><textarea id="evDs">' + esc(ev.desc || "") + "</textarea></div></div>" +
      "<footer>" + (isNew ? "<span></span>" : '<span id="evDelW"><button class="btn ghost small" id="evDel">Excluir</button></span>') + '<button class="btn" id="evSave">Salvar <span class="arrow">→</span></button></footer>');
    $("[data-close]").onclick = closeModal;
    $("#evQ").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var i = quem.indexOf(b.dataset.p); if (i >= 0) quem.splice(i, 1); else quem.push(b.dataset.p); b.setAttribute("aria-pressed", String(i < 0)); };
    $("#evSave").onclick = function () {
      var t = $("#evT").value.trim(); if (!t) { $("#evT").focus(); return; }
      var doc = { titulo: t, data: $("#evD").value, hora: $("#evH").value.trim(), fim: $("#evF").value.trim(), tipo: $("#evTp").value, conta: $("#evC").value, local: $("#evL").value.trim(), desc: $("#evDs").value, quem: quem, criadoPor: ev.criadoPor || me };
      (isNew ? Store.add("eventos", doc) : Store.set("eventos", ev.id, doc)).then(function () { toast("Salvo"); }, fail); closeModal();
    };
    var del = $("#evDel"); if (del) del.onclick = function () {
      $("#evDelW").innerHTML = '<span class="confirm">Excluir? <button class="yes" id="evY">sim</button><button class="no" id="evN">não</button></span>';
      $("#evY").onclick = function () { Store.del("eventos", ev.id).catch(fail); closeModal(); };
      $("#evN").onclick = closeModal;
    };
  }

  /* ================================================================
     MAPA MENTAL
     ================================================================ */
  var MM_CORES = ["#F5DF00", "#B69CFF", "#5CC8FF", "#FF9F43", "#3DDC84", "#FF7AC6", "#FF5C5C", "#E8E8E8"];
  var mmId = LS.get("mapa", "");
  var mm = null;          // cópia de trabalho {id, titulo, ordem, nos}
  var mmDirty = false, mmEditing = false, mmSel = null;
  var cam = { x: 0, y: 0, z: 1 };
  var present = null;     // {step}
  var mmSaveT = null;
  var fittedFor = null;

  function mmSave() {
    mmDirty = true; clearTimeout(mmSaveT);
    mmSaveT = setTimeout(function () {
      var doc = { titulo: mm.titulo, ordem: mm.ordem || 1, nos: mm.nos, compartilhado: !!mm.compartilhado };
      Store.set("mapas", mm.id, doc).then(function () { mmDirty = false; }, fail);
    }, 450);
  }
  function kids(id) { return mm.nos.filter(function (n) { return n.pai === id; }); }
  function nodeById(id) { return mm.nos.find(function (n) { return n.id === id; }); }
  function rootNode() { return mm.nos.find(function (n) { return !n.pai; }); }
  function depthOf(n) { var d = 0; while (n && n.pai) { n = nodeById(n.pai); d++; } return d; }
  function branchOf(n) { while (n && n.pai && nodeById(n.pai) && nodeById(n.pai).pai) n = nodeById(n.pai); return n; }
  function descCount(id) { return kids(id).reduce(function (s, k) { return s + 1 + descCount(k.id); }, 0); }
  function sideOf(n) {
    var b = branchOf(n); if (!b || !b.pai) return "r";
    if (b.lado) return b.lado;
    var ks = kids(rootNode().id), i = ks.indexOf(b);
    return i < Math.ceil(ks.length / 2) ? "r" : "l";
  }
  function visibleSet() {
    var root = rootNode(); var vis = {};
    var walk = function (n, hideKids) { vis[n.id] = true; if (!hideKids) kids(n.id).forEach(function (k) { walk(k, !present && k.fechado); }); };
    if (!root) return vis;
    if (present) {
      vis[root.id] = true;
      var ks = kids(root.id);
      ks.slice(0, present.step).forEach(function (k) { walk(k, false); });
      return vis;
    }
    walk(root, root.fechado);
    return vis;
  }

  function renderMapa() {
    var el = $("#v-mapa");
    var ms = S.mapas.slice().sort(byOrder);
    var src = ms.find(function (x) { return x.id === mmId; }) || ms[0];
    if (src) mmId = src.id;
    if (src && (!mm || mm.id !== src.id || (!mmDirty && !mmEditing))) mm = JSON.parse(JSON.stringify(src));
    if (!src) mm = null;
    if (mm && !mm.nos) mm.nos = [];
    if (mm && !rootNode()) { mm.nos.push({ id: Store.uid(), pai: null, texto: mm.titulo || "Ideia central", cor: "" }); }
    if (mmEditing && $("#mmWorld")) return; // não atrapalha quem está digitando
    var sig = ms.map(function (x) { return x.id + ":" + x.titulo; }).join("|") + "#" + (mm ? mm.id : "");
    if (mm && $("#mmWorld") && el.dataset.sig === sig) { drawMap(); return; }
    el.dataset.sig = sig;
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Mapa mental</div><h2>' + (mm ? esc(mm.titulo) : "Mapas") + '</h2><p class="muted">Clique para selecionar, dois cliques para escrever. Tab cria um filho, Enter cria um irmão, Delete apaga. Arraste o fundo para mover e use a roda do mouse para zoom.</p></div>' +
      '<div class="row">' + (mm ? '<button class="btn" id="mmPresent">Apresentar <span class="arrow">→</span></button>' : "") + "</div></div>" +
      '<div class="boardbar"><div class="boards">' + ms.map(function (x) { return '<button data-map="' + esc(x.id) + '" aria-selected="' + (mm && x.id === mm.id) + '">' + esc(x.titulo) + "</button>"; }).join("") + '<button data-newmap class="admin-only">+ Novo mapa</button></div>' +
      (mm ? '<div class="row admin-only"><label class="ct"><input type="checkbox" id="mmShare"' + (mm.compartilhado ? " checked" : "") + '> mostrar para o time</label><input type="text" id="mmTitle" value="' + esc(mm.titulo) + '" aria-label="Nome do mapa" style="width:auto;min-width:200px"><span id="mmDelW"><button class="icon-btn" id="mmDel">Excluir mapa</button></span></div>' : "") + "</div>" +
      (mm ? '<div class="mmwrap" id="mmWrap">' +
        '<div class="mmtools admin-only" id="mmTools">' +
          '<button data-mm="child" title="Tab">+ Filho</button><button data-mm="sib" title="Enter">+ Irmão</button><button data-mm="edit" title="F2">Editar</button>' +
          '<span class="mmsep"></span><span class="mmcolors">' + MM_CORES.map(function (c) { return '<button data-mmcor="' + c + '" style="background:' + c + '" aria-label="Cor"></button>'; }).join("") + '<button data-mmcor="" class="nocor" aria-label="Sem cor">∅</button></span>' +
          '<span class="mmsep"></span><button data-mm="up" title="Alt+↑">↑</button><button data-mm="down" title="Alt+↓">↓</button><button data-mm="side">⇄ lado</button><button data-mm="fold">Recolher</button><button data-mm="del">Excluir</button>' +
          '<span class="mmsep"></span><button data-mm="zout">−</button><button data-mm="fit">Centralizar</button><button data-mm="zin">+</button>' +
        "</div>" +
        '<div class="mmstage" id="mmStage" tabindex="0"><div class="mmworld" id="mmWorld"><svg class="mmlinks" id="mmLinks"></svg></div></div>' +
        '<div class="mmpresent" id="mmPres" hidden><button id="pPrev">←</button><span id="pStep"></span><button id="pNext">→</button><button id="pExit">Sair</button></div>' +
      "</div>" : '<div class="empty">' + (loaded.mapas ? (isAdmin() ? 'Nenhum mapa ainda. <button class="linkbtn" data-newmap>Criar o primeiro</button>' : "Nenhum mapa foi compartilhado com você ainda.") : "Carregando…") + "</div>");
    bindMapaBar();
    if (mm) drawMap(true);
  }

  function drawMap(fitIfNew) {
    var world = $("#mmWorld"); if (!world) return;
    var vis = visibleSet();
    $$(".mmnode", world).forEach(function (n) { n.remove(); });
    var root = rootNode();
    var els = {};
    mm.nos.forEach(function (n) {
      if (!vis[n.id]) return;
      var d = depthOf(n); var b = branchOf(n); var cor = n.cor || (b && b.cor) || "#F5DF00";
      var div = document.createElement("div");
      div.className = "mmnode d" + Math.min(d, 2) + (n.id === mmSel ? " sel" : "");
      div.dataset.id = n.id;
      div.style.setProperty("--c", cor);
      var hidden = n.fechado && !present ? descCount(n.id) : 0;
      div.innerHTML = '<span class="mmtxt">' + esc(n.texto) + "</span>" + (hidden ? '<button class="mmfold" data-unfold="' + esc(n.id) + '">+' + hidden + "</button>" : "");
      world.appendChild(div); els[n.id] = div;
    });
    // medidas
    var size = {}; Object.keys(els).forEach(function (id) { size[id] = { w: els[id].offsetWidth, h: els[id].offsetHeight }; });
    var pos = {}, GAP = 14, HG = 56;
    var vk = function (id) { return kids(id).filter(function (k) { return vis[k.id]; }); };
    var subH = {};
    var calcH = function (n) { var ks = vk(n.id); var h = size[n.id].h; if (!ks.length) return (subH[n.id] = h); var s = ks.reduce(function (a, k) { return a + calcH(k); }, 0) + GAP * (ks.length - 1); return (subH[n.id] = Math.max(h, s)); };
    var place = function (n, x, top, side) {
      pos[n.id] = { x: x, y: top + subH[n.id] / 2 };
      var ks = vk(n.id); if (!ks.length) return;
      var tot = ks.reduce(function (a, k) { return a + subH[k.id]; }, 0) + GAP * (ks.length - 1);
      var ky = pos[n.id].y - tot / 2;
      ks.forEach(function (k) { var cx = side === "r" ? x + size[n.id].w / 2 + HG + size[k.id].w / 2 : x - size[n.id].w / 2 - HG - size[k.id].w / 2; place(k, cx, ky, side); ky += subH[k.id] + GAP; });
    };
    if (root && vis[root.id]) {
      pos[root.id] = { x: 0, y: 0 };
      var lv1 = vk(root.id);
      ["r", "l"].forEach(function (side) {
        var grp = lv1.filter(function (k) { return sideOf(k) === side; });
        grp.forEach(calcH);
        var tot = grp.reduce(function (a, k) { return a + subH[k.id]; }, 0) + GAP * 2 * Math.max(grp.length - 1, 0);
        var ky = -tot / 2;
        grp.forEach(function (k) { var cx = side === "r" ? size[root.id].w / 2 + HG * 1.4 + size[k.id].w / 2 : -size[root.id].w / 2 - HG * 1.4 - size[k.id].w / 2; place(k, cx, ky, side); ky += subH[k.id] + GAP * 2; });
      });
    }
    Object.keys(els).forEach(function (id) { var p = pos[id], s = size[id]; if (!p) return; els[id].style.left = (p.x - s.w / 2) + "px"; els[id].style.top = (p.y - s.h / 2) + "px"; });
    // linhas
    var paths = "";
    mm.nos.forEach(function (n) {
      if (!n.pai || !pos[n.id] || !pos[n.pai]) return;
      var a = pos[n.pai], b = pos[n.id], sa = size[n.pai], sb = size[n.id];
      var side = b.x >= a.x ? 1 : -1;
      var x1 = a.x + side * sa.w / 2, y1 = a.y, x2 = b.x - side * sb.w / 2, y2 = b.y, mx = (x1 + x2) / 2;
      var br = branchOf(n); var cor = n.cor || (br && br.cor) || "#F5DF00";
      paths += '<path d="M' + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2 + '" stroke="' + esc(cor) + '" stroke-width="' + (depthOf(n) === 1 ? 2.5 : 1.5) + '" fill="none" opacity=".75"/>';
    });
    $("#mmLinks").innerHTML = paths;
    mm._pos = pos; mm._size = size;
    if (fitIfNew && fittedFor !== mm.id) { fittedFor = mm.id; fitCam(false); } else applyCam(false);
  }
  function applyCam(anim) {
    var w = $("#mmWorld"); if (!w) return;
    w.style.transition = anim ? "transform .45s cubic-bezier(.2,.7,.2,1)" : "none";
    w.style.transform = "translate(" + cam.x + "px," + cam.y + "px) scale(" + cam.z + ")";
  }
  function fitCam(anim) {
    var st = $("#mmStage"); if (!st || !mm || !mm._pos) return;
    var ids = Object.keys(mm._pos); if (!ids.length) return;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    ids.forEach(function (id) { var p = mm._pos[id], s = mm._size[id]; minX = Math.min(minX, p.x - s.w / 2); maxX = Math.max(maxX, p.x + s.w / 2); minY = Math.min(minY, p.y - s.h / 2); maxY = Math.max(maxY, p.y + s.h / 2); });
    var W = st.clientWidth, H = st.clientHeight, padd = 50;
    var z = Math.min((W - padd * 2) / Math.max(maxX - minX, 1), (H - padd * 2) / Math.max(maxY - minY, 1), present ? 1.6 : 1.2);
    z = Math.max(z, 0.25);
    cam.z = z; cam.x = W / 2 - ((minX + maxX) / 2) * z; cam.y = H / 2 - ((minY + maxY) / 2) * z;
    applyCam(anim);
  }

  function mmAdd(kind) {
    var cur = nodeById(mmSel) || rootNode(); if (!cur) return;
    var pai = kind === "sib" && cur.pai ? cur.pai : cur.id;
    var n = { id: Store.uid(), pai: pai, texto: "Nova ideia", cor: "" };
    var parentNode = nodeById(pai); if (parentNode) parentNode.fechado = false;
    if (kind === "sib" && cur.pai) { var i = mm.nos.indexOf(cur); mm.nos.splice(i + 1, 0, n); } else mm.nos.push(n);
    mmSel = n.id; mmSave(); drawMap(); startEdit(n.id, true);
  }
  function mmDelete(id) {
    var n = nodeById(id); if (!n || !n.pai) return;
    var rm = {}; var mark = function (x) { rm[x] = true; kids(x).forEach(function (k) { mark(k.id); }); }; mark(id);
    var sibs = kids(n.pai); var i = sibs.indexOf(n);
    mm.nos = mm.nos.filter(function (x) { return !rm[x.id]; });
    var nx = sibs[i + 1] || sibs[i - 1]; mmSel = nx ? nx.id : n.pai;
    mmSave(); drawMap();
  }
  function mmMove(dir) {
    var n = nodeById(mmSel); if (!n || !n.pai) return;
    var sibs = kids(n.pai); var i = sibs.indexOf(n), j = i + dir; if (j < 0 || j >= sibs.length) return;
    var a = mm.nos.indexOf(n), b = mm.nos.indexOf(sibs[j]); mm.nos[a] = sibs[j]; mm.nos[b] = n;
    mmSave(); drawMap();
  }
  function startEdit(id, selectAll) {
    var el = $('.mmnode[data-id="' + id + '"] .mmtxt'); if (!el) return;
    mmEditing = true; var n = nodeById(id); var old = n.texto;
    el.contentEditable = "true"; el.focus();
    var r = document.createRange(); r.selectNodeContents(el); var s = window.getSelection(); s.removeAllRanges(); if (selectAll) s.addRange(r); else { r.collapse(false); s.addRange(r); }
    var done = function (commit) {
      el.removeEventListener("keydown", kd); el.removeEventListener("blur", bl);
      el.contentEditable = "false"; mmEditing = false;
      var v = el.textContent.trim();
      if (commit && v && v !== old) { n.texto = v; mmSave(); } else el.textContent = old;
      drawMap(); var st = $("#mmStage"); if (st) st.focus();
    };
    var kd = function (e) { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); done(true); } else if (e.key === "Escape") { e.preventDefault(); done(false); } else if (e.key === "Tab") { e.preventDefault(); done(true); mmAdd("child"); } };
    var bl = function () { done(true); };
    el.addEventListener("keydown", kd); el.addEventListener("blur", bl);
  }
  function mmNav(key) {
    var n = nodeById(mmSel) || rootNode(); if (!n) return;
    var side = sideOf(n);
    if (key === "ArrowUp" || key === "ArrowDown") { if (!n.pai) return; var s = kids(n.pai), i = s.indexOf(n) + (key === "ArrowUp" ? -1 : 1); if (s[i]) mmSel = s[i].id; }
    else {
      var towardKids = (key === "ArrowRight") === (side === "r");
      if (!n.pai) { var ks = kids(n.id).filter(function (k) { return sideOf(k) === (key === "ArrowRight" ? "r" : "l"); }); if (ks[0]) mmSel = ks[0].id; }
      else if (towardKids) { var k0 = kids(n.id)[0]; if (k0 && !n.fechado) mmSel = k0.id; }
      else mmSel = n.pai;
    }
    drawMap();
  }
  function setPresent(on) {
    var wrap = $("#mmWrap");
    if (on) {
      present = { step: 0 }; mmSel = null;
      wrap.classList.add("presenting"); $("#mmPres").hidden = false;
      try { if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function () {}); } catch (e) {}
      presentStep(0);
      $("#mmStage").focus();
    } else {
      present = null; wrap.classList.remove("presenting"); $("#mmPres").hidden = true;
      try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
      drawMap(); fitCam(true);
    }
  }
  function presentStep(k) {
    var total = kids(rootNode().id).length;
    present.step = Math.max(0, Math.min(total, k));
    $("#pStep").textContent = present.step + " / " + total;
    drawMap(); fitCam(true);
  }
  document.addEventListener("fullscreenchange", function () { if (!document.fullscreenElement && present) setPresent(false); });

  var mmBound = false;
  function bindMapaBar() {
    var el = $("#v-mapa");
    if (mmBound) return; mmBound = true;
    el.addEventListener("click", function (e) {
      var t = e.target, b;
      if ((b = t.closest("[data-map]"))) { mmId = b.dataset.map; LS.set("mapa", mmId); mm = null; mmSel = null; renderMapa(); return; }
      if (t.closest("[data-newmap]")) {
        var ord = S.mapas.reduce(function (m, x) { return Math.max(m, x.ordem || 0); }, 0) + 1;
        var rid = Store.uid();
        Store.add("mapas", { titulo: "Novo mapa", ordem: ord, nos: [{ id: rid, pai: null, texto: "Ideia central", cor: "" }] }).then(function (id) { mmId = id; LS.set("mapa", id); mm = null; mmSel = rid; renderMapa(); }, fail);
        return;
      }
      if (t.id === "mmPresent") { setPresent(true); return; }
      if (t.id === "pNext") { presentStep(present.step + 1); return; }
      if (t.id === "pPrev") { presentStep(present.step - 1); return; }
      if (t.id === "pExit") { setPresent(false); return; }
      if (t.id === "mmDel") {
        $("#mmDelW").innerHTML = '<span class="confirm">Excluir o mapa? <button class="yes" id="mmDelY">sim</button><button class="no" id="mmDelN">não</button></span>';
        return;
      }
      if (t.id === "mmDelY") { var id = mm.id; mm = null; mmId = ""; el.dataset.sig = ""; Store.del("mapas", id).catch(fail); return; }
      if (t.id === "mmDelN") { el.dataset.sig = ""; renderMapa(); return; }
      if ((b = t.closest("[data-unfold]"))) { var nf = nodeById(b.dataset.unfold); nf.fechado = false; mmSave(); drawMap(); return; }
      if (!isAdmin() && (t.closest("[data-mmcor]") || t.closest("[data-mm]") || t.closest("[data-unfold]"))) return;
      if ((b = t.closest("[data-mmcor]"))) { var nc = nodeById(mmSel); if (nc) { nc.cor = b.dataset.mmcor; mmSave(); drawMap(); } return; }
      if ((b = t.closest("[data-mm]"))) {
        var a = b.dataset.mm, n = nodeById(mmSel);
        if (a === "child") mmAdd("child");
        if (a === "sib") mmAdd("sib");
        if (a === "edit" && n) startEdit(n.id, true);
        if (a === "del" && n) mmDelete(n.id);
        if (a === "up") mmMove(-1);
        if (a === "down") mmMove(1);
        if (a === "fold" && n && kids(n.id).length) { n.fechado = !n.fechado; mmSave(); drawMap(); }
        if (a === "side" && n && n.pai) { var br = branchOf(n); br.lado = sideOf(br) === "r" ? "l" : "r"; mmSave(); drawMap(); }
        if (a === "zin") { zoomAt(1.2); } if (a === "zout") { zoomAt(1 / 1.2); } if (a === "fit") fitCam(true);
        return;
      }
      var node = t.closest(".mmnode");
      if (node && !mmEditing) { if (present) return; mmSel = node.dataset.id; drawMap(); $("#mmStage").focus(); }
    });
    el.addEventListener("dblclick", function (e) { var node = e.target.closest(".mmnode"); if (node && !present && isAdmin()) { mmSel = node.dataset.id; drawMap(); startEdit(node.dataset.id, true); } });
    el.addEventListener("change", function (e) { if (e.target.id === "mmShare" && mm) { mm.compartilhado = e.target.checked; mmSave(); toast(mm.compartilhado ? "O time agora vê este mapa" : "Mapa visível só para admins"); return; } if (e.target.id === "mmTitle" && mm) { mm.titulo = e.target.value.trim() || "Mapa"; mmSave(); var h = $("#v-mapa h2"); if (h) h.textContent = mm.titulo; var bb = $('#v-mapa [data-map="' + mm.id + '"]'); if (bb) bb.textContent = mm.titulo; } });
    el.addEventListener("keydown", function (e) {
      if (!mm || mmEditing || !e.target.closest("#mmStage")) return;
      if (present) {
        if (["ArrowRight", " ", "PageDown", "Enter"].indexOf(e.key) >= 0) { e.preventDefault(); presentStep(present.step + 1); }
        if (["ArrowLeft", "PageUp", "Backspace"].indexOf(e.key) >= 0) { e.preventDefault(); presentStep(present.step - 1); }
        if (e.key === "Escape") setPresent(false);
        return;
      }
      if (!isAdmin()) { if (e.key.indexOf("Arrow") === 0) { e.preventDefault(); mmNav(e.key); } return; }
      if (e.key === "Tab") { e.preventDefault(); mmAdd("child"); }
      else if (e.key === "Enter") { e.preventDefault(); mmAdd("sib"); }
      else if (e.key === "F2" || e.key === " ") { e.preventDefault(); if (mmSel) startEdit(mmSel, true); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (mmSel) mmDelete(mmSel); }
      else if (e.altKey && (e.key === "ArrowUp" || e.key === "ArrowDown")) { e.preventDefault(); mmMove(e.key === "ArrowUp" ? -1 : 1); }
      else if (e.key.indexOf("Arrow") === 0) { e.preventDefault(); mmNav(e.key); }
    });
    // pan e zoom
    var pan = null;
    el.addEventListener("pointerdown", function (e) {
      var st = e.target.closest("#mmStage"); if (!st || e.target.closest(".mmnode")) return;
      pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, id: e.pointerId }; st.setPointerCapture(e.pointerId); st.classList.add("panning");
    });
    el.addEventListener("pointermove", function (e) { if (!pan || e.pointerId !== pan.id) return; cam.x = pan.cx + e.clientX - pan.x; cam.y = pan.cy + e.clientY - pan.y; applyCam(false); });
    var endPan = function () { if (pan) { var st = $("#mmStage"); if (st) st.classList.remove("panning"); } pan = null; };
    el.addEventListener("pointerup", endPan); el.addEventListener("pointercancel", endPan);
    el.addEventListener("wheel", function (e) {
      var st = e.target.closest("#mmStage"); if (!st) return; e.preventDefault();
      var r = st.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
  }
  function zoomAt(f, px, py) {
    var st = $("#mmStage"); if (!st) return;
    if (px == null) { px = st.clientWidth / 2; py = st.clientHeight / 2; }
    var nz = Math.max(0.2, Math.min(3, cam.z * f)); var k = nz / cam.z;
    cam.x = px - (px - cam.x) * k; cam.y = py - (py - cam.y) * k; cam.z = nz; applyCam(false);
  }

  /* ================================================================
     ANEXOS (componente usado nos cartões e na verba)
     ================================================================ */
  function fileKind(a) {
    var t = (a.tipo || "").toLowerCase(), n = (a.nome || "").toLowerCase();
    if (t.indexOf("image/") === 0) return "img";
    if (t.indexOf("video/") === 0) return "video";
    if (/\.pdf$/.test(n) || t === "application/pdf") return "pdf";
    if (/\.(xlsx?|csv|ods)$/.test(n)) return "planilha";
    if (/\.(docx?|odt|rtf)$/.test(n)) return "word";
    if (/\.(pptx?|key)$/.test(n)) return "apresentação";
    return "arquivo";
  }
  function fileSize(b) { b = b || 0; return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function uploadMany(files, pasta) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return Promise.resolve([]);
    toast("Enviando " + files.length + " arquivo" + (files.length > 1 ? "s" : "") + "…");
    var out = [];
    return files.reduce(function (p, f) {
      return p.then(function () {
        if (/^video\//.test(f.type || "") && f.size > VIDEO_AVISO && !window.confirm(f.name + " tem " + fileSize(f.size) + ". Vídeo pesado ocupa o espaço do time rápido. Prefira subir no Drive e colar o link no cartão.\n\nEnviar mesmo assim?")) return;
        return comprimirImagem(f).then(function (f2) {
          return Store.upload(f2, pasta).then(function (m) { m.por = me; out.push(m); }, function (e) {
            toast((e && e.code === "too_large") ? f.name + ": acima de 50 MB" : "Não enviou " + f.name);
          });
        });
      });
    }, Promise.resolve()).then(function () { if (out.length) toast(out.length + " anexo" + (out.length > 1 ? "s" : "") + " enviado" + (out.length > 1 ? "s" : "")); return out; });
  }
  function hydrateMedia(root) {
    $$("[data-src-ref]", root).forEach(function (el) {
      var a = JSON.parse(el.dataset.srcRef);
      Store.fileUrl(a).then(function (u) {
        if (el.tagName === "A") el.href = u; else if (el.tagName === "DIV") el.style.backgroundImage = "url(\"" + u + "\")"; else el.src = u;
      }).catch(function () { el.classList.add("att-missing"); });
    });
  }
  function lightbox(a) {
    Store.fileUrl(a).then(function (u) {
      var k = fileKind(a);
      if (k !== "img" && k !== "video") { window.open(u, "_blank", "noopener"); return; }
      var d = document.createElement("div"); d.className = "lightbox";
      d.innerHTML = (k === "img" ? '<img src="' + esc(u) + '" alt="">' : '<video src="' + esc(u) + '" controls autoplay></video>') +
        '<div class="lb-bar"><span>' + esc(a.nome) + '</span><a href="' + esc(u) + '" target="_blank" rel="noopener">abrir original</a><button>Fechar</button></div>';
      document.body.appendChild(d);
      var close = function () { d.remove(); document.removeEventListener("keydown", kd, true); };
      var kd = function (e) { if (e.key === "Escape") { e.stopPropagation(); close(); } };
      document.addEventListener("keydown", kd, true);
      d.addEventListener("click", function (e) { if (e.target === d || e.target.tagName === "BUTTON") close(); });
    }).catch(function () { toast("Não foi possível abrir o arquivo."); });
  }
  /* cfg: {titulo, lista, pasta, accept, podeEditar, capa, dropTarget, onChange(lista, capa)} */
  function attachBlock(el, cfg) {
    if (!el) return;
    var lista = (cfg.lista || []).slice(), capa = cfg.capa || "";
    var confirmRef = null;
    function draw() {
      el.innerHTML =
        '<div class="section-title"><label>' + esc(cfg.titulo || "Anexos") + (lista.length ? " · " + lista.length : "") + "</label>" +
        (cfg.podeEditar ? '<label class="btn ghost small upl">+ Anexar<input type="file" multiple accept="' + esc(cfg.accept || "") + '" hidden></label>' : "") + "</div>" +
        (lista.length ? '<div class="att-grid">' + lista.map(function (a, i) {
          var k = fileKind(a), ref = JSON.stringify(a);
          var prev = k === "img" ? '<div class="att-thumb" data-src-ref="' + esc(ref) + '"></div>'
            : k === "video" ? '<video class="att-thumb" muted preload="metadata" data-src-ref="' + esc(ref) + '"></video>'
            : '<div class="att-thumb att-file"><b>' + esc(k) + "</b></div>";
          return '<div class="att' + (a.ref === capa ? " is-cover" : "") + '">' +
            '<button class="att-open" data-open="' + i + '" title="Abrir">' + prev + (k === "video" ? '<span class="att-play">▶</span>' : "") + "</button>" +
            '<div class="att-meta"><span class="att-name" title="' + esc(a.nome) + '">' + esc(a.nome) + "</span><span class=\"hint\">" + fileSize(a.tamanho) + (a.local ? " · só neste aparelho" : "") + "</span></div>" +
            (cfg.podeEditar ? '<div class="att-act">' + (cfg.onChange && cfg.capa !== undefined && k === "img" ? '<button data-cover="' + i + '">' + (a.ref === capa ? "tirar capa" : "capa") + "</button>" : "") +
              (confirmRef === a.ref ? '<button class="danger-txt" data-rmy="' + i + '">apagar?</button><button data-rmn>não</button>' : '<button data-rm="' + i + '">remover</button>') + "</div>" : "") +
            "</div>";
        }).join("") + "</div>" : '<p class="hint">' + (cfg.podeEditar ? "Nenhum anexo. Arraste arquivos para cá ou cole um print (Ctrl+V). Até 50 MB por arquivo." : "Nenhum anexo.") + "</p>");
      hydrateMedia(el);
      var inp = $("input[type=file]", el);
      if (inp) inp.onchange = function () { add(inp.files); inp.value = ""; };
    }
    function add(files) {
      if (!cfg.podeEditar) { denyToast(); return; }
      uploadMany(files, cfg.pasta).then(function (ms) { if (!ms.length) return; lista = lista.concat(ms); if (!capa && cfg.capa !== undefined) { var im = ms.find(function (m) { return fileKind(m) === "img"; }); if (im) capa = im.ref; } cfg.onChange(lista, capa); draw(); });
    }
    el.onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.open != null) { lightbox(lista[+b.dataset.open]); return; }
      if (b.dataset.cover != null) { var a = lista[+b.dataset.cover]; capa = capa === a.ref ? "" : a.ref; cfg.onChange(lista, capa); draw(); return; }
      if (b.dataset.rm != null) { confirmRef = lista[+b.dataset.rm].ref; draw(); return; }
      if (b.dataset.rmn != null) { confirmRef = null; draw(); return; }
      if (b.dataset.rmy != null) { var r = lista[+b.dataset.rmy]; lista = lista.filter(function (x) { return x !== r; }); if (capa === r.ref) capa = ""; confirmRef = null; Store.removeFile(r); cfg.onChange(lista, capa); draw(); }
    };
    var tgt = cfg.dropTarget || el;
    if (cfg.podeEditar && !tgt.dataset.dropBound) {
      tgt.dataset.dropBound = "1";
      tgt.addEventListener("dragover", function (e) { if (e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") >= 0) { e.preventDefault(); tgt.classList.add("dropping"); } });
      tgt.addEventListener("dragleave", function (e) { if (e.target === tgt) tgt.classList.remove("dropping"); });
      tgt.addEventListener("drop", function (e) { tgt.classList.remove("dropping"); if (e.dataTransfer && e.dataTransfer.files.length) { e.preventDefault(); tgt._addFiles(e.dataTransfer.files); } });
      tgt.addEventListener("paste", function (e) {
        var fs = Array.prototype.slice.call((e.clipboardData && e.clipboardData.files) || []);
        if (fs.length) { e.preventDefault(); fs = fs.map(function (f, i) { return f.name && f.name !== "image.png" ? f : new File([f], "print-" + Date.now() + "-" + i + ".png", { type: f.type }); }); tgt._addFiles(fs); }
      });
    }
    tgt._addFiles = add;
    draw();
  }
  function hydrateCovers() {
    $$(".kcover[data-cover]").forEach(function (el) {
      var c = S.cartoes.find(function (x) { return x.id === el.dataset.cid; }); if (!c) return;
      var a = (c.anexos || []).find(function (x) { return x.ref === el.dataset.cover; }); if (!a) { el.remove(); return; }
      Store.fileUrl(a).then(function (u) { el.style.backgroundImage = "url(\"" + u + "\")"; }).catch(function () { el.remove(); });
    });
  }

  /* ================================================================
     VERBA E NFs (só admins)
     ================================================================ */
  var vMes = iso(today()).slice(0, 7), vConta = "", vSub = LS.get("vSub", "lanc");
  var vF = { status: "", cat: "", q: "", todos: false }, vSel = {}, coopF = "aberto";
  var NF_ST = [["aguardando", "Aguardando NF"], ["recebida", "NF recebida"], ["contabilidade", "Enviada à contabilidade"], ["paga", "Paga"]];
  var CO_ST = [["negociando", "Negociando"], ["acordado", "Acordado"], ["executada", "Ação feita"], ["comprovada", "Comprovação enviada"], ["cobrada", "Cobrada"], ["recebida", "Recebida"]];
  function stLabel(list, k) { var x = list.find(function (s) { return s[0] === k; }); return x ? x[1] : k; }
  function brl(v) { return (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
  function parseBRL(s) {
    if (typeof s === "number") return s;
    s = String(s || "").replace(/[^\d,.-]/g, "");
    if (s.indexOf(",") >= 0) s = s.replace(/\./g, "").replace(",", ".");
    else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // 20.000 = vinte mil
    var n = parseFloat(s); return isNaN(n) ? 0 : Math.round(n * 100) / 100;
  }
  function numBR(v) { return (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function mesLabel(ym) { var p = ym.split("-"); return MONTHS[+p[1] - 1] + " de " + p[0]; }
  function addMes(ym, n) { var p = ym.split("-"); var d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1); }
  function share(docConta, conta) { if (!conta) return 1; if (docConta === conta) return 1; if (docConta === "Ambas") return 0.5; return 0; }
  function fornecedores() {
    var set = {};
    S.fornecedores.forEach(function (f) { if (f.nome && f.ativo !== false) set[f.nome] = 1; });
    S.nfs.concat(S.contratos, S.cooperada).forEach(function (x) { if (x.fornecedor) set[x.fornecedor] = 1; });
    return Object.keys(set).sort(function (a, b) { return a.localeCompare(b, "pt-BR"); });
  }
  function orcDoc(ym) { var d = S.orcamento.find(function (x) { return x.id === ym; }); return d || { AM: {}, AG: {} }; }
  function tetoOf(ym, conta) { var t = orcDoc(ym).teto || {}; return conta ? Number(t[conta]) || 0 : (Number(t.AM) || 0) + (Number(t.AG) || 0); }
  function orcPayload(cur, patch) { return Object.assign({ AM: Object.assign({}, cur.AM || {}), AG: Object.assign({}, cur.AG || {}), teto: Object.assign({}, cur.teto || {}) }, patch || {}); }
  function openTeto() {
    var t = orcDoc(vMes).teto || {};
    openModal('<header><h3>Orçamento de ' + esc(mesLabel(vMes)) + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<p class="muted">O teto é quanto a verba de marketing permite gastar no mês. Tudo o que for lançado conta contra ele.</p>' +
      '<div class="grid2"><div class="field"><label>Teto AM (R$)</label><input type="text" inputmode="decimal" id="ttAM" value="' + (t.AM ? numBR(t.AM) : "") + '" placeholder="0,00" autofocus></div>' +
      '<div class="field"><label>Teto AG (R$)</label><input type="text" inputmode="decimal" id="ttAG" value="' + (t.AG ? numBR(t.AG) : "") + '" placeholder="0,00"></div></div>' +
      '<p class="hint" id="ttTot"></p></div><footer><button class="btn ghost small" id="ttPrev">Usar o de ' + esc(mesLabel(addMes(vMes, -1))) + '</button><button class="btn" id="ttSave">Salvar <span class="arrow">→</span></button></footer>');
    var tot = function () { $("#ttTot").textContent = "Total do mês: " + brl(parseBRL($("#ttAM").value) + parseBRL($("#ttAG").value)); };
    $("#ttAM").oninput = tot; $("#ttAG").oninput = tot; tot();
    $("[data-close]").onclick = closeModal;
    $("#ttPrev").onclick = function () { var pt = orcDoc(addMes(vMes, -1)).teto || {}; if (!pt.AM && !pt.AG) { toast("O mês anterior não tem teto."); return; } $("#ttAM").value = pt.AM ? numBR(pt.AM) : ""; $("#ttAG").value = pt.AG ? numBR(pt.AG) : ""; tot(); };
    $("#ttSave").onclick = function () {
      Store.set("orcamento", vMes, orcPayload(orcDoc(vMes), { teto: { AM: parseBRL($("#ttAM").value), AG: parseBRL($("#ttAG").value) } })).then(function () { toast("Orçamento do mês salvo"); }, fail);
      closeModal();
    };
  }
  function orcTotal(ym, conta) { var d = orcDoc(ym), t = 0; ["AM", "AG"].forEach(function (c) { if (!conta || conta === c) Object.keys(d[c] || {}).forEach(function (k) { t += Number(d[c][k]) || 0; }); }); return t; }
  function realizado(ym, conta, cat) {
    return S.nfs.filter(function (n) { return n.competencia === ym && (!cat || n.categoria === cat); })
      .reduce(function (t, n) { return t + (Number(n.valor) || 0) * share(n.conta, conta); }, 0);
  }
  function downloadText(nome, texto, tipo) {
    var blob = new Blob(["﻿" + texto], { type: tipo || "text/csv;charset=utf-8" });
    var viaAnchor = function () { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 500); };
    if (window.claude && window.claude.use) window.claude.use("downloads").then(function (d) { if (d) d.save({ filename: nome, data: blob }).catch(function () {}); else viaAnchor(); }, viaAnchor);
    else viaAnchor();
  }
  function csvCell(v) { v = String(v == null ? "" : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  function renderVerba() {
    var el = $("#v-verba");
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var t0 = today(), in7 = new Date(t0); in7.setDate(in7.getDate() + 7);
    var orc = orcTotal(vMes, vConta), real = realizado(vMes, vConta), teto = tetoOf(vMes, vConta), base = teto || orc, saldo = base - real;
    var aguard = S.nfs.filter(function (n) { return n.competencia === vMes && n.status === "aguardando" && share(n.conta, vConta); }).length;
    var aEnviar = S.nfs.filter(function (n) { return n.status === "recebida" && share(n.conta, vConta); }).length;
    var venc = S.nfs.filter(function (n) { var d = parse(n.vencimento); return d && n.status !== "paga" && d < t0 && share(n.conta, vConta); });
    var prox = S.nfs.filter(function (n) { var d = parse(n.vencimento); return d && n.status !== "paga" && d >= t0 && d <= in7 && share(n.conta, vConta); });
    var coopAberto = S.cooperada.filter(function (c) { return c.status !== "recebida"; }).reduce(function (t, c) { return t + Math.max((Number(c.valor) || 0) - (Number(c.recebido) || 0), 0) * share(c.conta, vConta); }, 0);
    var pct = base ? Math.min(real / base * 100, 999) : 0;
    var falta = teto - orc;
    var ativos = S.contratos.filter(function (c) { return c.ativo !== false; }).length;
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Verba e NFs</div><h2>Controle de ' + esc(mesLabel(vMes)) + '</h2><p class="muted">Notas, contratos recorrentes, orçamento por categoria e verba cooperada num lugar só. Só administradores veem esta aba.</p></div>' +
      '<div class="row"><div class="seg"><button id="vPrev">←</button><button id="vNow">mês atual</button><button id="vNext">→</button></div>' +
      '<select id="vConta" style="width:auto"><option value="">AM + AG</option><option' + (vConta === "AM" ? " selected" : "") + '>AM</option><option' + (vConta === "AG" ? " selected" : "") + ">AG</option></select></div></div>" +
      '<div class="vtiles">' +
        '<div class="vtile teto ' + (teto ? "" : "empty") + '"><span>Orçamento do mês · teto' + (vConta ? " " + vConta : "") + "</span><b>" + (teto ? brl(teto) : "não definido") + '</b><small><button class="linkbtn" id="vTeto">' + (teto ? "editar" : "definir o teto") + "</button></small></div>" +
        '<div class="vtile ' + (pct > 100 ? "neg" : pct >= 90 ? "warn" : "") + '"><span>Realizado</span><b>' + brl(real) + '</b><div class="vbar"><i style="width:' + Math.min(pct, 100) + "%" + (pct > 100 ? ";background:var(--late)" : pct >= 90 ? ";background:var(--wait)" : "") + '"></i></div><small>' + (base ? Math.round(pct) + "% " + (teto ? "do teto" : "do orçado") : "sem orçamento no mês") + "</small></div>" +
        '<div class="vtile ' + (saldo < 0 ? "neg" : "") + '"><span>' + (saldo < 0 ? "Acima do teto" : "Disponível") + "</span><b>" + brl(Math.abs(saldo)) + "</b>" + (teto ? "<small>" + (orc ? (falta >= 0 ? brl(falta) + " ainda sem categoria" : brl(-falta) + " a mais nas categorias do que o teto") : "categorias ainda sem valor") + "</small>" : "") + "</div>" +
        '<div class="vtile"><span>Aguardando NF</span><b>' + aguard + "</b><small>neste mês</small></div>" +
        '<div class="vtile ' + (aEnviar ? "warn" : "") + '"><span>A enviar à contabilidade</span><b>' + aEnviar + '</b><small><button class="linkbtn" id="vGoEnviar">ver notas</button></small></div>' +
        '<div class="vtile ' + (venc.length ? "neg" : prox.length ? "warn" : "") + '"><span>Vencimentos</span><b>' + venc.length + " vencida" + (venc.length === 1 ? "" : "s") + "</b><small>" + prox.length + " nos próximos 7 dias</small></div>" +
        '<div class="vtile"><span>Cooperada a receber</span><b>' + brl(coopAberto) + "</b></div>" +
      "</div>" +
      (teto && real > teto ? '<div class="banner warn" style="border-color:var(--late);color:#ffb3b3">Os lançamentos de ' + esc(mesLabel(vMes)) + " passaram o teto em " + brl(real - teto) + ".</div>" : "") +
      '<div class="seg vsub">' + [["lanc", "Lançamentos e NFs"], ["contr", "Contratos recorrentes · " + ativos], ["orc", "Orçamento"], ["coop", "Verba cooperada"]].map(function (x) { return '<button data-vsub="' + x[0] + '" aria-pressed="' + (vSub === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      '<div id="vBody"></div>';
    $("#vTeto").onclick = openTeto;
    $("#vPrev").onclick = function () { vMes = addMes(vMes, -1); vSel = {}; renderVerba(); };
    $("#vNext").onclick = function () { vMes = addMes(vMes, 1); vSel = {}; renderVerba(); };
    $("#vNow").onclick = function () { vMes = iso(today()).slice(0, 7); vSel = {}; renderVerba(); };
    $("#vConta").onchange = function () { vConta = this.value; renderVerba(); };
    $("#vGoEnviar").onclick = function () { vSub = "lanc"; vF = { status: "recebida", cat: "", q: "", todos: true }; renderVerba(); };
    $$("[data-vsub]", el).forEach(function (b) { b.onclick = function () { vSub = b.dataset.vsub; LS.set("vSub", vSub); renderVerba(); }; });
    ({ lanc: drawLanc, contr: drawContratos, orc: drawOrc, coop: drawCoop }[vSub] || drawLanc)();
  }

  /* ---------- lançamentos ---------- */
  function drawLanc() {
    var L = listas(), t0 = today();
    var rows = S.nfs.filter(function (n) {
      return (vF.todos || n.competencia === vMes) && share(n.conta, vConta) && (!vF.status || n.status === vF.status) && (!vF.cat || n.categoria === vF.cat) &&
        (!vF.q || ((n.fornecedor || "") + " " + (n.descricao || "") + " " + (n.numero || "")).toLowerCase().indexOf(vF.q.toLowerCase()) >= 0);
    }).sort(function (a, b) { return (a.vencimento || "9999").localeCompare(b.vencimento || "9999"); });
    var total = rows.reduce(function (t, n) { return t + (Number(n.valor) || 0); }, 0);
    var sel = Object.keys(vSel).filter(function (k) { return vSel[k] && rows.some(function (r) { return r.id === k; }); });
    $("#vBody").innerHTML =
      '<div class="row" style="justify-content:space-between">' +
        '<div class="row"><select id="vfS" style="width:auto"><option value="">Todos os status</option>' + NF_ST.map(function (s) { return '<option value="' + s[0] + '"' + (vF.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select>" +
        '<select id="vfC" style="width:auto"><option value="">Todas as categorias</option>' + opt(L.categoriasVerba, vF.cat).replace('<option value=""></option>', "") + "</select>" +
        '<input type="text" id="vfQ" placeholder="Buscar fornecedor, descrição, nº NF" value="' + esc(vF.q) + '" style="width:240px">' +
        '<label class="ct"><input type="checkbox" id="vfT"' + (vF.todos ? " checked" : "") + "> todos os meses</label></div>" +
        '<div class="row"><button class="btn ghost small" id="vGen">Gerar recorrentes de ' + esc(mesLabel(vMes).split(" de ")[0]) + '</button><button class="btn ghost small" id="vCsv">Baixar planilha (CSV)</button><button class="btn small" id="vNew">+ Lançamento</button></div>' +
      "</div>" +
      (sel.length ? '<div class="bulk"><b>' + sel.length + " selecionada" + (sel.length > 1 ? "s" : "") + '</b><button class="btn small" data-bulk="contabilidade">Marcar como enviadas à contabilidade</button><button class="btn ghost small" data-bulk="paga">Marcar como pagas</button><button class="btn ghost small" id="vCopy">Copiar lista</button><button class="linkbtn" id="vSelClear">limpar</button></div>' : "") +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th><input type="checkbox" id="vAll" aria-label="Selecionar todas"></th><th>Venc.</th><th>Fornecedor / descrição</th><th>Categoria</th><th>Conta</th><th class="r">Valor</th><th>NF</th><th>Status</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (n) {
        var d = parse(n.vencimento), late = d && d < t0 && n.status !== "paga";
        return '<tr data-nf="' + esc(n.id) + '"><td><input type="checkbox" data-sel="' + esc(n.id) + '"' + (vSel[n.id] ? " checked" : "") + "></td>" +
          '<td class="num ' + (late ? "late-txt" : "") + '">' + (d ? fmt(d) : "—") + "</td>" +
          "<td><b>" + esc(n.fornecedor || "—") + "</b>" + (n.descricao ? '<div class="hint">' + esc(n.descricao) + "</div>" : "") + (n.contrato ? '<span class="tag">recorrente</span>' : "") + "</td>" +
          "<td>" + esc(n.categoria || "") + "</td><td><span class=\"tag " + esc(n.conta) + '">' + esc(n.conta || "") + "</span></td>" +
          '<td class="r num">' + brl(n.valor) + "</td><td>" + esc(n.numero || "") + "</td>" +
          '<td><button class="st nf-' + esc(n.status) + '" data-nfst="' + esc(n.id) + '">' + esc(stLabel(NF_ST, n.status)) + "</button></td>" +
          "<td>" + ((n.anexos || []).length ? '<span class="hint">⧉ ' + n.anexos.length + "</span>" : "") + "</td></tr>";
      }).join("") : '<tr><td colspan="9" class="hint" style="text-align:center;padding:22px">Nenhum lançamento' + (vF.todos ? "" : " em " + esc(mesLabel(vMes))) + " com esses filtros.</td></tr>") +
      '</tbody><tfoot><tr><td colspan="5">' + rows.length + ' lançamento' + (rows.length === 1 ? "" : "s") + '</td><td class="r num"><b>' + brl(total) + "</b></td><td colspan=\"3\"></td></tr></tfoot></table></div>";
    var re = function () { drawLanc(); };
    $("#vfS").onchange = function () { vF.status = this.value; re(); };
    $("#vfC").onchange = function () { vF.cat = this.value; re(); };
    $("#vfQ").oninput = function () { vF.q = this.value; clearTimeout(drawLanc._t); drawLanc._t = setTimeout(function () { re(); var q = $("#vfQ"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); };
    $("#vfT").onchange = function () { vF.todos = this.checked; re(); };
    $("#vNew").onclick = function () { openNF(null); };
    $("#vGen").onclick = gerarRecorrentes;
    $("#vCsv").onclick = function () {
      var head = ["Competência", "Vencimento", "Fornecedor", "Descrição", "Categoria", "Conta", "Valor", "Nº NF", "Status", "Pagamento", "Observações"];
      var lines = [head.join(";")].concat(rows.map(function (n) { return [n.competencia, n.vencimento, n.fornecedor, n.descricao, n.categoria, n.conta, numBR(n.valor), n.numero, stLabel(NF_ST, n.status), n.pagamento, n.obs].map(csvCell).join(";"); }));
      downloadText("verba-" + vMes + ".csv", lines.join("\n"));
    };
    $("#vAll").onchange = function () { var on = this.checked; rows.forEach(function (r) { vSel[r.id] = on; }); re(); };
    var body = $("#vBody");
    body.onclick = function (e) {
      var t = e.target;
      if (t.matches("[data-sel]")) { vSel[t.dataset.sel] = t.checked; re(); return; }
      var st = t.closest("[data-nfst]");
      if (st) { var n = S.nfs.find(function (x) { return x.id === st.dataset.nfst; }); var o = NF_ST.map(function (x) { return x[0]; }); Store.upd("nfs", n.id, { status: o[(o.indexOf(n.status) + 1) % o.length] }).catch(fail); return; }
      var b = t.closest("[data-bulk]");
      if (b) { Promise.all(sel.map(function (id) { return Store.upd("nfs", id, { status: b.dataset.bulk }); })).then(function () { toast(sel.length + " atualizada" + (sel.length > 1 ? "s" : "")); vSel = {}; }, fail); return; }
      if (t.id === "vCopy") { copy(sel.map(function (id) { var n = S.nfs.find(function (x) { return x.id === id; }); return "• " + (n.fornecedor || "") + " · NF " + (n.numero || "s/n") + " · " + brl(n.valor) + " · venc. " + (n.vencimento ? fmt(parse(n.vencimento)) : "—"); }).join("\n")); return; }
      if (t.id === "vSelClear") { vSel = {}; re(); return; }
      var tr = t.closest("tr[data-nf]");
      if (tr && !t.closest("input,button")) { var nf = S.nfs.find(function (x) { return x.id === tr.dataset.nf; }); if (nf) openNF(nf); }
    };
  }
  function gerarRecorrentes() {
    var p = vMes.split("-"), y = +p[0], m = +p[1] - 1, last = new Date(y, m + 1, 0).getDate();
    var ini = vMes + "-01", fim = vMes + "-" + pad(last);
    var novos = S.contratos.filter(function (c) {
      return c.ativo !== false && (!c.inicio || c.inicio <= fim) && (!c.fim || c.fim >= ini) &&
        !S.nfs.some(function (n) { return n.contrato === c.id && n.competencia === vMes; });
    });
    if (!novos.length) { toast("Os recorrentes de " + mesLabel(vMes) + " já estão lançados."); return; }
    Promise.all(novos.map(function (c) {
      return Store.add("nfs", { fornecedor: c.fornecedor, descricao: c.objeto || "", categoria: c.categoria, conta: c.conta, valor: Number(c.valor) || 0, competencia: vMes,
        vencimento: c.diaVenc ? vMes + "-" + pad(Math.min(Number(c.diaVenc), last)) : "", numero: "", pagamento: c.pagamento || "", status: "aguardando", contrato: c.id, obs: "", anexos: [], criadoEm: new Date().toISOString(), criadoPor: me });
    })).then(function () { toast(novos.length + " lançamento" + (novos.length > 1 ? "s" : "") + " recorrente" + (novos.length > 1 ? "s" : "") + " criado" + (novos.length > 1 ? "s" : "")); }, fail);
  }
  function fornList(id) { return '<datalist id="' + id + '">' + fornecedores().map(function (f) { return '<option value="' + esc(f) + '">'; }).join("") + "</datalist>"; }
  function delConfirm(wrapSel, label, onYes) {
    var w = $(wrapSel); if (!w) return;
    w.innerHTML = '<span class="confirm">' + label + ' <button class="yes">sim</button><button class="no">não</button></span>';
    $(".yes", w).onclick = onYes; $(".no", w).onclick = closeModal;
  }
  function openNF(n) {
    var L = listas(), isNew = !n;
    var d = Object.assign({ fornecedor: "", descricao: "", categoria: L.categoriasVerba[0], conta: "AM", valor: 0, competencia: vMes, emissao: "", vencimento: "", numero: "", pagamento: L.pagamentos[0] || "", status: "aguardando", contrato: "", obs: "", anexos: [] }, n || {});
    var draftId = isNew ? Store.uid() : n.id;
    openModal('<header><h3>' + (isNew ? "Novo lançamento" : "Lançamento") + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Fornecedor</label><input type="text" id="nfF" list="nfFl" value="' + esc(d.fornecedor) + '" autofocus>' + fornList("nfFl") + "</div>" +
      '<div class="field"><label>Descrição</label><input type="text" id="nfD" value="' + esc(d.descricao) + '" placeholder="ex: spots de outubro"></div>' +
      '<div class="field"><label>Categoria</label><select id="nfC">' + opt(L.categoriasVerba, d.categoria) + "</select></div>" +
      '<div class="field"><label>Conta</label><select id="nfA">' + opt(L.contas, d.conta) + "</select></div>" +
      '<div class="field"><label>Valor (R$)</label><input type="text" inputmode="decimal" id="nfV" value="' + (d.valor ? numBR(d.valor) : "") + '" placeholder="0,00"></div>' +
      '<div class="field"><label>Competência (mês)</label><input type="month" id="nfM" value="' + esc(d.competencia) + '"></div>' +
      '<div class="field"><label>Emissão</label><input type="date" id="nfE" value="' + esc(d.emissao) + '"></div>' +
      '<div class="field"><label>Vencimento</label><input type="date" id="nfVc" value="' + esc(d.vencimento) + '"></div>' +
      '<div class="field"><label>Nº da NF</label><input type="text" id="nfN" value="' + esc(d.numero) + '"></div>' +
      '<div class="field"><label>Pagamento</label><select id="nfP">' + opt(L.pagamentos, d.pagamento, "—") + "</select></div>" +
      '<div class="field"><label>Status</label><select id="nfS">' + NF_ST.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === d.status ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>Contrato</label><select id="nfK"><option value="">Avulso</option>' + S.contratos.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === d.contrato ? " selected" : "") + ">" + esc(c.fornecedor + (c.objeto ? " · " + c.objeto : "")) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label>Observações</label><textarea id="nfO" style="min-height:60px">' + esc(d.obs) + "</textarea></div>" +
      '<div class="field" id="nfAtt"></div>' +
      "</div><footer>" + (isNew ? "<span></span>" : '<span id="nfDelW"><button class="btn ghost small" id="nfDel">Excluir</button></span>') + '<button class="btn" id="nfSave">Salvar <span class="arrow">→</span></button></footer>', { wide: true });
    var anexos = (d.anexos || []).slice();
    attachBlock($("#nfAtt"), { titulo: "NF, boleto, comprovante, planilha", lista: anexos, pasta: "verba/nfs/" + draftId, accept: ".pdf,.xlsx,.xls,.csv,.docx,.doc,image/*,.xml", podeEditar: true, dropTarget: $("#modalRoot .modal"),
      onChange: function (l) { anexos = l; if (!isNew) Store.upd("nfs", n.id, { anexos: l }).catch(fail); } });
    $("[data-close]").onclick = closeModal;
    fornHook($("#nfF"));
    $("#nfK").onchange = function () { var c = S.contratos.find(function (x) { return x.id === $("#nfK").value; }); if (c) { if (!$("#nfF").value) $("#nfF").value = c.fornecedor; if (!parseBRL($("#nfV").value)) $("#nfV").value = numBR(c.valor); $("#nfC").value = c.categoria; $("#nfA").value = c.conta; } };
    $("#nfSave").onclick = function () {
      var f = $("#nfF").value.trim(); if (!f) { $("#nfF").focus(); return; }
      var doc = { fornecedor: f, descricao: $("#nfD").value.trim(), categoria: $("#nfC").value, conta: $("#nfA").value, valor: parseBRL($("#nfV").value), competencia: $("#nfM").value || vMes,
        emissao: $("#nfE").value, vencimento: $("#nfVc").value, numero: $("#nfN").value.trim(), pagamento: $("#nfP").value, status: $("#nfS").value, contrato: $("#nfK").value, obs: $("#nfO").value, anexos: anexos,
        criadoEm: d.criadoEm || new Date().toISOString(), criadoPor: d.criadoPor || me };
      Store.set("nfs", draftId, doc).then(function () { toast("Salvo"); }, fail); closeModal();
    };
    if ($("#nfDel")) $("#nfDel").onclick = function () { delConfirm("#nfDelW", "Excluir lançamento?", function () { (n.anexos || []).forEach(function (a) { Store.removeFile(a); }); Store.del("nfs", n.id).catch(fail); closeModal(); }); };
  }

  /* ---------- contratos recorrentes ---------- */
  function drawContratos() {
    var t0 = today();
    var rows = S.contratos.filter(function (c) { return share(c.conta, vConta); }).sort(function (a, b) { return (b.ativo !== false) - (a.ativo !== false) || (a.fornecedor || "").localeCompare(b.fornecedor || "", "pt-BR"); });
    var mensal = rows.filter(function (c) { return c.ativo !== false; }).reduce(function (t, c) { return t + (Number(c.valor) || 0) * share(c.conta, vConta); }, 0);
    $("#vBody").innerHTML =
      '<div class="row" style="justify-content:space-between"><p class="muted">Contratos que se repetem todo mês: rádio, TV, outdoor, prestadores, ferramentas. Em Lançamentos, "Gerar recorrentes" cria as notas do mês a partir daqui.</p><button class="btn small" id="kNew">+ Contrato</button></div>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fornecedor / objeto</th><th>Categoria</th><th>Conta</th><th class="r">Valor mensal</th><th>Vence dia</th><th>Vigência</th><th>Situação</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (c) {
        var fim = parse(c.fim), dias = fim ? Math.round((fim - t0) / 864e5) : null;
        var sit = c.ativo === false ? '<span class="tag">encerrado</span>' : dias != null && dias < 0 ? '<span class="tag" style="color:var(--late)">vencido</span>' : dias != null && dias <= 45 ? '<span class="tag" style="color:var(--wait)">termina em ' + dias + " dias</span>" : '<span class="tag" style="color:var(--ok)">ativo</span>';
        return '<tr data-k="' + esc(c.id) + '"' + (c.ativo === false ? ' class="off"' : "") + "><td><b>" + esc(c.fornecedor) + "</b>" + (c.objeto ? '<div class="hint">' + esc(c.objeto) + "</div>" : "") + "</td><td>" + esc(c.categoria || "") + '</td><td><span class="tag ' + esc(c.conta) + '">' + esc(c.conta) + '</span></td><td class="r num">' + brl(c.valor) + '</td><td class="num">' + esc(c.diaVenc || "—") + '</td><td class="num">' + (c.inicio ? fmt(parse(c.inicio)) + "/" + c.inicio.slice(2, 4) : "—") + " → " + (fim ? fmt(fim) + "/" + c.fim.slice(2, 4) : "sem fim") + "</td><td>" + sit + "</td><td>" + ((c.anexos || []).length ? '<span class="hint">⧉ ' + c.anexos.length + "</span>" : "") + "</td></tr>";
      }).join("") : '<tr><td colspan="8" class="hint" style="text-align:center;padding:22px">Nenhum contrato ainda.</td></tr>') +
      '</tbody><tfoot><tr><td colspan="3">Total mensal dos ativos</td><td class="r num"><b>' + brl(mensal) + '</b></td><td colspan="4"></td></tr></tfoot></table></div>';
    $("#kNew").onclick = function () { openContrato(null); };
    $("#vBody").onclick = function (e) { var tr = e.target.closest("tr[data-k]"); if (tr) openContrato(S.contratos.find(function (x) { return x.id === tr.dataset.k; })); };
  }
  function openContrato(c) {
    var L = listas(), isNew = !c;
    var d = Object.assign({ fornecedor: "", objeto: "", categoria: L.categoriasVerba[0], conta: "AM", valor: 0, diaVenc: 10, inicio: iso(today()).slice(0, 8) + "01", fim: "", pagamento: L.pagamentos[0] || "", ativo: true, obs: "", anexos: [] }, c || {});
    var id = isNew ? Store.uid() : c.id;
    openModal('<header><h3>' + (isNew ? "Novo contrato recorrente" : "Contrato") + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Fornecedor</label><input type="text" id="kF" list="kFl" value="' + esc(d.fornecedor) + '" autofocus>' + fornList("kFl") + "</div>" +
      '<div class="field"><label>Objeto</label><input type="text" id="kO" value="' + esc(d.objeto) + '" placeholder="ex: 60 spots/mês na rádio X"></div>' +
      '<div class="field"><label>Categoria</label><select id="kC">' + opt(L.categoriasVerba, d.categoria) + "</select></div>" +
      '<div class="field"><label>Conta</label><select id="kA">' + opt(L.contas, d.conta) + "</select></div>" +
      '<div class="field"><label>Valor mensal (R$)</label><input type="text" inputmode="decimal" id="kV" value="' + (d.valor ? numBR(d.valor) : "") + '" placeholder="0,00"></div>' +
      '<div class="field"><label>Vence todo dia</label><input type="number" id="kD" min="1" max="31" value="' + esc(d.diaVenc) + '"></div>' +
      '<div class="field"><label>Início</label><input type="date" id="kI" value="' + esc(d.inicio) + '"></div>' +
      '<div class="field"><label>Fim (vazio = sem prazo)</label><input type="date" id="kFi" value="' + esc(d.fim) + '"></div>' +
      '<div class="field"><label>Pagamento</label><select id="kP">' + opt(L.pagamentos, d.pagamento, "—") + "</select></div>" +
      '<div class="field"><label>Situação</label><label class="ct" style="padding-top:8px"><input type="checkbox" id="kAt"' + (d.ativo !== false ? " checked" : "") + "> contrato ativo</label></div></div>" +
      '<div class="field"><label>Observações (reajuste, multa, contato)</label><textarea id="kOb" style="min-height:60px">' + esc(d.obs) + "</textarea></div>" +
      '<div class="field" id="kAtt"></div></div>' +
      "<footer>" + (isNew ? "<span></span>" : '<span id="kDelW"><button class="btn ghost small" id="kDel">Excluir</button></span>') + '<button class="btn" id="kSave">Salvar <span class="arrow">→</span></button></footer>', { wide: true });
    var anexos = (d.anexos || []).slice();
    attachBlock($("#kAtt"), { titulo: "Contrato, PI, aditivos", lista: anexos, pasta: "verba/contratos/" + id, accept: ".pdf,.docx,.doc,.xlsx,.xls,.csv,image/*", podeEditar: true, dropTarget: $("#modalRoot .modal"),
      onChange: function (l) { anexos = l; if (!isNew) Store.upd("contratos", id, { anexos: l }).catch(fail); } });
    $("[data-close]").onclick = closeModal;
    fornHook($("#kF"));
    $("#kSave").onclick = function () {
      var f = $("#kF").value.trim(); if (!f) { $("#kF").focus(); return; }
      Store.set("contratos", id, { fornecedor: f, objeto: $("#kO").value.trim(), categoria: $("#kC").value, conta: $("#kA").value, valor: parseBRL($("#kV").value), diaVenc: Number($("#kD").value) || "", inicio: $("#kI").value, fim: $("#kFi").value, pagamento: $("#kP").value, ativo: $("#kAt").checked, obs: $("#kOb").value, anexos: anexos, criadoPor: d.criadoPor || me })
        .then(function () { toast("Salvo"); }, fail); closeModal();
    };
    if ($("#kDel")) $("#kDel").onclick = function () { delConfirm("#kDelW", "Excluir contrato? Os lançamentos já gerados ficam.", function () { Store.del("contratos", id).catch(fail); closeModal(); }); };
  }

  /* ---------- orçamento ---------- */
  function drawOrc() {
    var L = listas(), d = orcDoc(vMes);
    var cats = L.categoriasVerba.slice();
    S.nfs.forEach(function (n) { if (n.competencia === vMes && n.categoria && cats.indexOf(n.categoria) < 0) cats.push(n.categoria); });
    var tot = { oAM: 0, rAM: 0, oAG: 0, rAG: 0 };
    var rowsHtml = cats.map(function (cat) {
      var oAM = Number((d.AM || {})[cat]) || 0, oAG = Number((d.AG || {})[cat]) || 0, rAM = realizado(vMes, "AM", cat), rAG = realizado(vMes, "AG", cat);
      tot.oAM += oAM; tot.oAG += oAG; tot.rAM += rAM; tot.rAG += rAG;
      var o = oAM + oAG, r = rAM + rAG, p = o ? r / o * 100 : (r ? 100 : 0);
      return "<tr><td><b>" + esc(cat) + "</b></td>" +
        '<td class="r"><input class="money" data-orc="AM" data-cat="' + esc(cat) + '" value="' + (oAM ? numBR(oAM) : "") + '" placeholder="0,00"></td><td class="r num ' + (rAM > oAM && oAM ? "late-txt" : "") + '">' + brl(rAM) + "</td>" +
        '<td class="r"><input class="money" data-orc="AG" data-cat="' + esc(cat) + '" value="' + (oAG ? numBR(oAG) : "") + '" placeholder="0,00"></td><td class="r num ' + (rAG > oAG && oAG ? "late-txt" : "") + '">' + brl(rAG) + "</td>" +
        '<td class="r num ' + (o - r < 0 ? "late-txt" : "") + '">' + brl(o - r) + '</td><td style="min-width:110px"><div class="vbar"><i style="width:' + Math.min(p, 100) + "%" + (p > 100 ? ";background:var(--late)" : "") + '"></i></div></td></tr>';
    }).join("");
    $("#vBody").innerHTML =
      (function () {
        var t = d.teto || {}, tAM = Number(t.AM) || 0, tAG = Number(t.AG) || 0;
        var cell = function (lbl, teto, dist, real) {
          var diff = teto - dist;
          return '<div class="vtile"><span>' + lbl + "</span><b>" + (teto ? brl(teto) : "sem teto") + "</b><small>Distribuído: " + brl(dist) + (teto ? (diff >= 0 ? " · falta distribuir " + brl(diff) : ' · <span class="late-txt">passou ' + brl(-diff) + "</span>") : "") + "</small><small>Realizado: " + brl(real) + (teto ? " · disponível " + brl(teto - real) : "") + "</small></div>";
        };
        return '<div class="vtiles teto-row">' + cell("Teto AM", tAM, tot.oAM, tot.rAM) + cell("Teto AG", tAG, tot.oAG, tot.rAG) + cell("Teto total", tAM + tAG, tot.oAM + tot.oAG, tot.rAM + tot.rAG) +
          '<div class="vtile" style="justify-content:center;align-content:center"><button class="btn small" id="oTeto">' + (tAM || tAG ? "Editar teto do mês" : "Definir teto do mês") + "</button></div></div>";
      })() +
      '<div class="row" style="justify-content:space-between"><p class="muted">Divida o teto entre as categorias e acompanhe o que já foi lançado. Lançamentos com conta "Ambas" contam metade para cada.</p><button class="btn ghost small" id="oCopy">Copiar teto e categorias de ' + esc(mesLabel(addMes(vMes, -1))) + "</button></div>" +
      '<div class="tbl-wrap"><table class="tbl orc"><thead><tr><th>Categoria</th><th class="r">AM orçado</th><th class="r">AM realizado</th><th class="r">AG orçado</th><th class="r">AG realizado</th><th class="r">Saldo</th><th></th></tr></thead><tbody>' + rowsHtml + "</tbody>" +
      '<tfoot><tr><td>Total</td><td class="r num">' + brl(tot.oAM) + '</td><td class="r num">' + brl(tot.rAM) + '</td><td class="r num">' + brl(tot.oAG) + '</td><td class="r num">' + brl(tot.rAG) + '</td><td class="r num"><b>' + brl(tot.oAM + tot.oAG - tot.rAM - tot.rAG) + "</b></td><td></td></tr></tfoot></table></div>" +
      '<p class="hint">As categorias se editam em Admin &gt; Listas e categorias.</p>';
    $$("[data-orc]").forEach(function (inp) {
      inp.onchange = function () {
        var cur = orcDoc(vMes), nd = orcPayload(cur);
        var v = parseBRL(inp.value); if (v) nd[inp.dataset.orc][inp.dataset.cat] = v; else delete nd[inp.dataset.orc][inp.dataset.cat];
        Store.set("orcamento", vMes, nd).then(function () { toast("Orçamento salvo"); }, fail);
      };
      inp.onkeydown = function (e) { if (e.key === "Enter") inp.blur(); };
    });
    $("#oTeto").onclick = openTeto;
    $("#oCopy").onclick = function () {
      var prev = orcDoc(addMes(vMes, -1));
      if (!Object.keys(prev.AM || {}).length && !Object.keys(prev.AG || {}).length && !prev.teto) { toast("O mês anterior não tem orçamento."); return; }
      Store.set("orcamento", vMes, orcPayload(prev)).then(function () { toast("Teto e categorias copiados"); }, fail);
    };
  }

  /* ---------- verba cooperada ---------- */
  function drawCoop() {
    var t0 = today();
    var rows = S.cooperada.filter(function (c) {
      return share(c.conta, vConta) && (coopF === "todos" || (coopF === "mes" ? c.competencia === vMes : c.status !== "recebida"));
    }).sort(function (a, b) { return (a.prazo || "9999").localeCompare(b.prazo || "9999"); });
    var ac = 0, rc = 0; rows.forEach(function (c) { ac += Number(c.valor) || 0; rc += Number(c.recebido) || 0; });
    $("#vBody").innerHTML =
      '<div class="row" style="justify-content:space-between"><div class="seg">' + [["aberto", "Em aberto"], ["mes", "Ações de " + mesLabel(vMes).split(" de ")[0]], ["todos", "Todos"]].map(function (x) { return '<button data-cf2="' + x[0] + '" aria-pressed="' + (coopF === x[0]) + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      '<button class="btn small" id="cpNew">+ Acordo de verba cooperada</button></div>' +
      '<div class="vtiles small"><div class="vtile"><span>Acordado</span><b>' + brl(ac) + '</b></div><div class="vtile"><span>Recebido</span><b>' + brl(rc) + '</b></div><div class="vtile ' + (ac - rc > 0 ? "warn" : "") + '"><span>A receber</span><b>' + brl(Math.max(ac - rc, 0)) + "</b></div></div>" +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Indústria / fornecedor</th><th>Ação (contrapartida)</th><th>Conta</th><th>Mês</th><th class="r">Acordado</th><th class="r">Recebido</th><th>Cobrar até</th><th>Status</th><th></th></tr></thead><tbody>' +
      (rows.length ? rows.map(function (c) {
        var pz = parse(c.prazo), late = pz && pz < t0 && c.status !== "recebida";
        return '<tr data-cp="' + esc(c.id) + '"><td><b>' + esc(c.fornecedor) + "</b></td><td>" + esc(c.acao || "") + '</td><td><span class="tag ' + esc(c.conta) + '">' + esc(c.conta) + '</span></td><td class="num">' + (c.competencia ? esc(c.competencia.slice(5) + "/" + c.competencia.slice(2, 4)) : "—") + '</td><td class="r num">' + brl(c.valor) + '</td><td class="r num">' + brl(c.recebido) + '</td><td class="num ' + (late ? "late-txt" : "") + '">' + (pz ? fmt(pz) : "—") + '</td><td><button class="st co-' + esc(c.status) + '" data-cpst="' + esc(c.id) + '">' + esc(stLabel(CO_ST, c.status)) + "</button></td><td>" + ((c.anexos || []).length ? '<span class="hint">⧉ ' + c.anexos.length + "</span>" : "") + "</td></tr>";
      }).join("") : '<tr><td colspan="9" class="hint" style="text-align:center;padding:22px">Nenhum acordo com esse filtro.</td></tr>') + "</tbody></table></div>";
    $$("[data-cf2]").forEach(function (b) { b.onclick = function () { coopF = b.dataset.cf2; drawCoop(); }; });
    $("#cpNew").onclick = function () { openCoop(null); };
    $("#vBody").onclick = function (e) {
      var st = e.target.closest("[data-cpst]");
      if (st) { var c = S.cooperada.find(function (x) { return x.id === st.dataset.cpst; }); var o = CO_ST.map(function (x) { return x[0]; }); Store.upd("cooperada", c.id, { status: o[(o.indexOf(c.status) + 1) % o.length] }).catch(fail); return; }
      var tr = e.target.closest("tr[data-cp]"); if (tr) openCoop(S.cooperada.find(function (x) { return x.id === tr.dataset.cp; }));
    };
  }
  function openCoop(c) {
    var L = listas(), isNew = !c;
    var d = Object.assign({ fornecedor: "", acao: "", conta: "AM", valor: 0, recebido: 0, competencia: vMes, prazo: "", status: "negociando", obs: "", anexos: [] }, c || {});
    var id = isNew ? Store.uid() : c.id;
    openModal('<header><h3>' + (isNew ? "Novo acordo de verba cooperada" : "Verba cooperada") + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Indústria / fornecedor</label><input type="text" id="cpF" list="cpFl" value="' + esc(d.fornecedor) + '" autofocus>' + fornList("cpFl") + "</div>" +
      '<div class="field"><label>Conta</label><select id="cpA">' + opt(L.contas, d.conta) + "</select></div>" +
      '<div class="field"><label>Valor acordado (R$)</label><input type="text" inputmode="decimal" id="cpV" value="' + (d.valor ? numBR(d.valor) : "") + '" placeholder="0,00"></div>' +
      '<div class="field"><label>Valor recebido (R$)</label><input type="text" inputmode="decimal" id="cpR" value="' + (d.recebido ? numBR(d.recebido) : "") + '" placeholder="0,00"></div>' +
      '<div class="field"><label>Mês da ação</label><input type="month" id="cpM" value="' + esc(d.competencia) + '"></div>' +
      '<div class="field"><label>Cobrar até</label><input type="date" id="cpP" value="' + esc(d.prazo) + '"></div>' +
      '<div class="field"><label>Status</label><select id="cpS">' + CO_ST.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === d.status ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label>Ação / contrapartida</label><textarea id="cpAc" style="min-height:60px" placeholder="ex: tabloide com 4 produtos da marca + 2 posts">' + esc(d.acao) + "</textarea></div>" +
      '<div class="field"><label>Observações</label><textarea id="cpO" style="min-height:50px">' + esc(d.obs) + "</textarea></div>" +
      '<div class="field" id="cpAtt"></div></div>' +
      "<footer>" + (isNew ? "<span></span>" : '<span id="cpDelW"><button class="btn ghost small" id="cpDel">Excluir</button></span>') + '<button class="btn" id="cpSave">Salvar <span class="arrow">→</span></button></footer>', { wide: true });
    var anexos = (d.anexos || []).slice();
    attachBlock($("#cpAtt"), { titulo: "Acordo e comprovações (fotos, tabloide, planilha)", lista: anexos, pasta: "verba/cooperada/" + id, accept: ".pdf,.docx,.doc,.xlsx,.xls,.csv,image/*,video/*", podeEditar: true, dropTarget: $("#modalRoot .modal"),
      onChange: function (l) { anexos = l; if (!isNew) Store.upd("cooperada", id, { anexos: l }).catch(fail); } });
    $("[data-close]").onclick = closeModal;
    fornHook($("#cpF"));
    $("#cpSave").onclick = function () {
      var f = $("#cpF").value.trim(); if (!f) { $("#cpF").focus(); return; }
      Store.set("cooperada", id, { fornecedor: f, conta: $("#cpA").value, valor: parseBRL($("#cpV").value), recebido: parseBRL($("#cpR").value), competencia: $("#cpM").value, prazo: $("#cpP").value, status: $("#cpS").value, acao: $("#cpAc").value.trim(), obs: $("#cpO").value, anexos: anexos, criadoPor: d.criadoPor || me })
        .then(function () { toast("Salvo"); }, fail); closeModal();
    };
    if ($("#cpDel")) $("#cpDel").onclick = function () { delConfirm("#cpDelW", "Excluir acordo?", function () { Store.del("cooperada", id).catch(fail); closeModal(); }); };
  }

  /* ================================================================
     ADMIN (acessos, listas e categorias)
     ================================================================ */
  var perfisCache = null;
  var LIST_DEFS = [
    ["categoriasVerba", "Categorias de verba", "Usadas em lançamentos, contratos e orçamento."],
    ["pagamentos", "Formas de pagamento", ""],
    ["reunioes", "Reuniões", "Aparecem no filtro da Pauta viva."],
    ["areas", "Frentes / áreas", "Classificam os itens da pauta."],
    ["tiposEvento", "Tipos de evento", "Usados no Calendário."],
    ["categoriasCofre", "Categorias de acessos", "Organizam a aba Acessos."],
    ["lojas", "Lojas", "Usadas nas visitas e no relatório da diretoria."],
    ["setoresVisita", "Setores do checklist de visita", "Cada setor recebe Ótimo, Bom, Regular ou Ruim na visita."],
    ["tiposEventoOrg", "Tipos de evento (aba Eventos)", ""],
    ["itensCustoEvento", "Itens de custo de evento", "Aparecem como sugestão na estimativa de custos."],
    ["canaisCampanha", "Canais de campanha", ""],
    ["checklistCampanha", "Checklist padrão de campanha", "Toda campanha nova começa com estes itens."],
    ["categoriasDoc", "Categorias de documentos", "Organizam os documentos da aba Reuniões."],
    ["categoriasFornecedor", "Categorias de fornecedor", "Organizam a aba Fornecedores."],
    ["tiposMidia", "Tipos de mídia", "Usados na aba Mídia (rádio, TV, outdoor…)."],
    ["unidades", "Unidades (Indicadores)", "Lojas do atendimento Bitrix e das pesquisas NPS."],
    ["canaisTrafego", "Contas de tráfego pago (Indicadores)", "Ex: AM · Meta Ads. Cada uma recebe os números do mês."]
  ];
  // onde cada lista é usada, para renomear junto
  var LIST_USE = {
    categoriasVerba: [["nfs", "categoria"], ["contratos", "categoria"]],
    reunioes: [["pauta", "reuniao"], ["ciclo", "reuniao"]],
    areas: [["pauta", "area"], ["ciclo", "area"]],
    tiposEvento: [["eventos", "tipo"]],
    pagamentos: [["nfs", "pagamento"], ["contratos", "pagamento"]],
    categoriasCofre: [["cofre", "categoria"]],
    lojas: [["visitas", "loja"]],
    tiposEventoOrg: [["eventos_org", "tipo"]],
    categoriasDoc: [["documentos", "categoria"]],
    tiposMidia: [["midias", "tipo"]],
    categoriasFornecedor: [["fornecedores", "categoria"]]
  };
  function saveListas(patch) { var L = listas(); var doc = Object.assign({ contas: L.contas, reunioes: L.reunioes, areas: L.areas, etiquetas: L.etiquetas, tiposEvento: L.tiposEvento, categoriasVerba: L.categoriasVerba, pagamentos: L.pagamentos, categoriasCofre: L.categoriasCofre, lojas: L.lojas, setoresVisita: L.setoresVisita, tiposEventoOrg: L.tiposEventoOrg, itensCustoEvento: L.itensCustoEvento, canaisCampanha: L.canaisCampanha, checklistCampanha: L.checklistCampanha, categoriasDoc: L.categoriasDoc, unidades: L.unidades, canaisTrafego: L.canaisTrafego, tiposMidia: L.tiposMidia, categoriasFornecedor: L.categoriasFornecedor }, patch); return Store.set("config", "listas", doc).catch(fail); }
  function renameEverywhere(key, from, to) {
    var n = 0;
    (LIST_USE[key] || []).forEach(function (u) { S[u[0]].forEach(function (d) { if (d[u[1]] === from) { var p = {}; p[u[1]] = to; Store.upd(u[0], d.id, p).catch(fail); n++; } }); });
    if (key === "etiquetas") S.cartoes.forEach(function (c) { if ((c.etiquetas || []).indexOf(from) >= 0) { Store.upd("cartoes", c.id, { etiquetas: c.etiquetas.map(function (x) { return x === from ? to : x; }) }).catch(fail); n++; } });
    if (key === "setoresVisita") S.visitas.forEach(function (v) { if ((v.notas || {})[from]) { var nn = Object.assign({}, v.notas); nn[to] = nn[from]; delete nn[from]; Store.upd("visitas", v.id, { notas: nn }).catch(fail); n++; } });
    if (key === "unidades" || key === "canaisTrafego") { var sk2 = key === "unidades" ? ["atend", "nps"] : ["trafego"]; S.indicadores.forEach(function (d) { var patch = {}, ch = false; sk2.forEach(function (k) { if (d[k] && d[k][from]) { var o = Object.assign({}, d[k]); o[to] = o[from]; delete o[from]; patch[k] = o; ch = true; } if (/^metas-/.test(d.id) && d[k] && d[k].linhas && d[k].linhas[from]) { var lk = Object.assign({}, d[k].linhas); lk[to] = lk[from]; delete lk[from]; patch[k] = Object.assign({}, patch[k] || d[k], { linhas: lk }); ch = true; } }); if (ch) { Store.upd("indicadores", d.id, patch).catch(fail); n++; } }); }
    if (key === "categoriasVerba") S.orcamento.forEach(function (o) { var ch = false, nd = orcPayload(o); ["AM", "AG"].forEach(function (c) { if (nd[c][from] != null) { nd[c][to] = nd[c][from]; delete nd[c][from]; ch = true; } }); if (ch) { Store.set("orcamento", o.id, nd).catch(fail); n++; } });
    return n;
  }
  function renderAdmin() {
    var el = $("#v-admin");
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var L = listas(), sb = Store.mode === "supabase";
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Admin</div><h2>Acessos, listas e categorias</h2><p class="muted">Só Ellyn e Tony (administradores) veem esta aba.</p></div></div>' +
      '<div class="admin-grid">' +
      '<section class="card pad adm"><h3>Usuários do sistema</h3>' +
        '<p class="muted">' + (sb ? "Libere o email de cada pessoa e ligue ao nome dela no time. Depois ela entra em scopomkt.com.br/fluxodotime/, clica em <b>Primeiro acesso</b> e cria a própria senha." : "Na prévia não há login. Use <b>Você é</b> no topo para ver o sistema como cada pessoa. Os papéis abaixo valem para essa simulação.") + "</p>" +
        '<div id="admPerfis"><p class="hint">Carregando…</p></div>' +
        '<form class="adm-add" id="admAdd"><input type="' + (sb ? "email" : "text") + '" id="aEmail" placeholder="' + (sb ? "email da pessoa" : "email (opcional na prévia)") + '"' + (sb ? " required" : "") + '><select id="aNome">' + opt(nomes(), "") + '</select><select id="aPapel"><option value="membro">membro</option><option value="admin">admin</option></select><button class="btn small" type="submit">Liberar</button></form>' +
        '<details class="perm"><summary>O que cada papel pode fazer</summary><ul>' +
          "<li><b>Admin:</b> vê e altera tudo, inclusive Verba e NFs, Admin, semana, ciclo, modelos, mapas e colunas dos quadros.</li>" +
          "<li><b>Membro:</b> vê o fluxo do time, os quadros, o calendário e a pauta. Cria pendências, cartões e eventos. Só altera o que é dele: itens em que é responsável ou que ele criou, e o próprio fluxo na aba Time. Não vê Verba e NFs.</li>" +
          "<li>Anexos seguem a mesma regra do cartão ou lançamento em que estão.</li></ul></details>" +
      "</section>" +
      '<section class="card pad adm"><h3>Listas e categorias</h3><p class="muted">Clique num item para renomear. Renomear atualiza os itens que já usam esse nome.</p>' +
        LIST_DEFS.map(function (x) { return '<div class="chipedit" data-list="' + x[0] + '"><div class="lbl">' + esc(x[1]) + "</div>" + (x[2] ? '<p class="hint">' + esc(x[2]) + "</p>" : "") + '<div class="ce-items">' + (L[x[0]] || []).map(function (v, i) { return '<span class="ce"><button class="ce-name" data-ren="' + i + '">' + esc(v) + '</button><button class="ce-x" data-del="' + i + '" aria-label="Remover">✕</button></span>'; }).join("") + '</div><input type="text" class="ce-add" placeholder="+ adicionar e Enter"></div>'; }).join("") +
        '<div class="chipedit" data-list="etiquetas"><div class="lbl">Etiquetas dos quadros</div><div class="ce-items">' + L.etiquetas.map(function (e, i) { return '<span class="ce"><input type="color" value="' + esc(e.cor) + '" data-cor="' + i + '" aria-label="Cor"><button class="ce-name" data-ren="' + i + '">' + esc(e.nome) + '</button><button class="ce-x" data-del="' + i + '" aria-label="Remover">✕</button></span>'; }).join("") + '</div><input type="text" class="ce-add" placeholder="+ nova etiqueta e Enter"></div>' +
      "</section>" +
      backupSectionHTML() +
      '<section class="card pad adm"><h3>Conteúdo padrão</h3><p class="muted">Recarrega pessoas, ciclo do mês, modelos, quadros, o mapa padrão e as listas. Pauta, cartões, eventos e toda a parte de verba ficam como estão.</p><span id="admSeedW"><button class="btn ghost small" id="admSeed">Carregar conteúdo padrão</button></span></section>' +
      "</div>";
    drawPerfis();
    bindBackup(el);
    $("#admAdd").onsubmit = function (e) {
      e.preventDefault();
      var p = { email: $("#aEmail").value.trim().toLowerCase(), nome: $("#aNome").value, papel: $("#aPapel").value };
      if (!p.nome) return;
      if (sb) Store.perfis.save(p).then(function () { toast("Liberado. Clique em Convite para copiar a mensagem."); perfisCache = null; drawPerfis(); $("#aEmail").value = ""; }, fail);
      else { var l = acessosLista().filter(function (a) { return a.nome !== p.nome; }).concat([p]); Store.set("config", "acessos", { lista: l }).then(function () { toast("Salvo"); }, fail); }
    };
    $("#admSeed").onclick = function () { delConfirm("#admSeedW", "Sobrescrever com o padrão?", function () { Store.seed(window.GESTAO_DEFAULTS).then(function () { toast("Padrão carregado"); }, fail); renderAdmin(); }); };
    // listas
    $$(".chipedit", el).forEach(function (box) {
      var key = box.dataset.list;
      var get = function () { return (listas()[key] || []).slice(); };
      var nameOf = function (v) { return key === "etiquetas" ? v.nome : v; };
      $(".ce-add", box).onkeydown = function (e) {
        if (e.key !== "Enter") return; e.preventDefault();
        var v = this.value.trim(); if (!v) return; var l = get();
        if (l.some(function (x) { return nameOf(x) === v; })) { toast("Já existe"); return; }
        l.push(key === "etiquetas" ? { nome: v, cor: "#9E9E9E" } : v); var p = {}; p[key] = l; saveListas(p); this.value = "";
      };
      box.onclick = function (e) {
        var b = e.target.closest("[data-del]");
        if (b) { var l = get(); var i = +b.dataset.del; if (b.dataset.sure) { l.splice(i, 1); var p = {}; p[key] = l; saveListas(p); } else { b.dataset.sure = "1"; b.textContent = "apagar?"; b.classList.add("danger-txt"); setTimeout(function () { if (b.isConnected) { delete b.dataset.sure; b.textContent = "✕"; b.classList.remove("danger-txt"); } }, 2500); } return; }
        var r = e.target.closest("[data-ren]");
        if (r) {
          var i2 = +r.dataset.ren, l2 = get(), old = nameOf(l2[i2]);
          var inp = document.createElement("input"); inp.type = "text"; inp.value = old; inp.className = "ce-rename"; r.replaceWith(inp); inp.focus(); inp.select();
          var done = function (ok) {
            var v = inp.value.trim();
            if (ok && v && v !== old) {
              if (key === "etiquetas") l2[i2] = { nome: v, cor: l2[i2].cor }; else l2[i2] = v;
              var p = {}; p[key] = l2; saveListas(p); var n = renameEverywhere(key, old, v); if (n) toast("Renomeado em " + n + " ite" + (n > 1 ? "ns" : "m"));
            } else renderAdmin();
          };
          inp.onkeydown = function (ev) { if (ev.key === "Enter") done(true); if (ev.key === "Escape") done(false); };
          inp.onblur = function () { done(true); };
        }
      };
      $$("[data-cor]", box).forEach(function (c) { c.onchange = function () { var l = get(); l[+c.dataset.cor] = { nome: l[+c.dataset.cor].nome, cor: c.value }; saveListas({ etiquetas: l }); }; });
    });
  }
  function drawPerfis() {
    var box = $("#admPerfis"); if (!box) return;
    var sb = Store.mode === "supabase";
    var show = function (list) {
      box.innerHTML = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>' + (sb ? "Email" : "Pessoa") + "</th>" + (sb ? "<th>Pessoa</th>" : "") + "<th>Papel</th><th></th></tr></thead><tbody>" +
        (list.length ? list.map(function (p, i) {
          return "<tr>" + (sb ? "<td>" + esc(p.email) + '</td><td><select data-pn="' + i + '">' + opt(nomes(), p.nome) + "</select></td>" : "<td><b>" + esc(p.nome) + "</b>" + (p.email ? ' <span class="hint">' + esc(p.email) + "</span>" : "") + "</td>") +
            '<td><select data-pp="' + i + '"><option value="membro"' + (p.papel === "membro" ? " selected" : "") + '>membro</option><option value="admin"' + (p.papel === "admin" ? " selected" : "") + ">admin</option></select></td>" +
            '<td class="row" style="gap:4px;flex-wrap:nowrap">' + (sb ? '<button class="icon-btn" data-inv="' + i + '" title="Copiar mensagem de convite">Convite</button>' : "") + '<button class="x" data-prm="' + i + '" aria-label="Remover acesso">✕</button></td></tr>';
        }).join("") : '<tr><td colspan="4" class="hint">Ninguém liberado ainda.</td></tr>') + "</tbody></table></div>" +
        (sb ? "" : '<p class="hint">Quem não está na lista entra como membro.</p>');
      var save = function (i, patch) {
        var p = Object.assign({}, list[i], patch);
        if (sb) Store.perfis.save(p).then(function () { toast("Salvo"); perfisCache = null; drawPerfis(); }, fail);
        else { var l = list.slice(); l[i] = p; Store.set("config", "acessos", { lista: l }).then(function () { toast("Salvo"); }, fail); }
      };
      $$("[data-inv]", box).forEach(function (b) { b.onclick = function () {
        var p = list[+b.dataset.inv], link = location.origin + location.pathname.replace(/index\.html$/, "");
        copy("Oi, " + p.nome + "! Liberei seu acesso ao Fluxo do Time.\n\n1. Abra " + link + "\n2. Clique em *Primeiro acesso*\n3. Use o email " + p.email + " e crie sua senha\n\nDepois é só entrar por lá sempre que precisar.");
      }; });
      $$("[data-pn]", box).forEach(function (s) { s.onchange = function () { save(+s.dataset.pn, { nome: s.value }); }; });
      $$("[data-pp]", box).forEach(function (s) { s.onchange = function () {
        var i = +s.dataset.pp;
        if (sb && list[i].email === Store.perfil.email && s.value !== "admin") { toast("Você não pode tirar o seu próprio admin."); s.value = "admin"; return; }
        save(i, { papel: s.value }); }; });
      $$("[data-prm]", box).forEach(function (b) { b.onclick = function () {
        var i = +b.dataset.prm;
        if (!b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "remover?"; b.classList.add("danger-txt"); return; }
        if (sb) { if (list[i].email === Store.perfil.email) { toast("Você não pode remover o seu próprio acesso."); return; } Store.perfis.remove(list[i].email).then(function () { toast("Acesso removido"); perfisCache = null; drawPerfis(); }, fail); }
        else { var l = list.slice(); l.splice(i, 1); Store.set("config", "acessos", { lista: l }).catch(fail); }
      }; });
    };
    if (!sb) { show(acessosLista()); return; }
    if (perfisCache) { show(perfisCache); return; }
    Store.perfis.list().then(function (l) { perfisCache = l; show(l); }, function (e) { box.innerHTML = '<p class="hint">Não consegui ler os acessos: ' + esc(e.message || "") + "</p>"; });
  }

  /* ================================================================
     ACESSOS (links, logins, senhas e chaves)
     Admin vê tudo. Cada acesso tem a lista de quem mais pode ver.
     ================================================================ */
  var cfF = { q: "", cat: "", conta: "" }, cfShow = {}, cfTimers = {};
  function gerarSenha(n) {
    var cs = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_", out = "";
    var arr = new Uint32Array(n || 16); (window.crypto || window.msCrypto).getRandomValues(arr);
    for (var i = 0; i < arr.length; i++) out += cs[arr[i] % cs.length];
    return out;
  }
  function safeUrl(u) { u = String(u || "").trim(); if (!u) return ""; if (!/^https?:\/\//i.test(u)) u = "https://" + u; return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }
  function renderCofre() {
    var el = $("#v-cofre"), L = listas(), adm = isAdmin();
    var q = cfF.q.toLowerCase();
    var rows = S.cofre.filter(function (a) {
      return (!cfF.cat || a.categoria === cfF.cat) && (!cfF.conta || a.conta === cfF.conta) &&
        (!q || ((a.titulo || "") + " " + (a.url || "") + " " + (a.usuario || "") + " " + (a.obs || "")).toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) { return (a.titulo || "").localeCompare(b.titulo || "", "pt-BR"); });
    var cats = L.categoriasCofre.slice();
    rows.forEach(function (a) { if (a.categoria && cats.indexOf(a.categoria) < 0) cats.push(a.categoria); });
    var field = function (a, k, label, secret) {
      var v = a[k]; if (!v) return "";
      var shown = !secret || cfShow[a.id + k];
      return '<div class="cf-row"><span class="cf-lbl">' + label + '</span><span class="cf-val ' + (secret ? "mono" : "") + '">' + (shown ? esc(v) : "••••••••") + "</span>" +
        (secret ? '<button class="icon-btn" data-cfshow="' + esc(a.id) + '" data-k="' + k + '">' + (shown ? "ocultar" : "mostrar") + "</button>" : "") +
        '<button class="icon-btn" data-cfcopy="' + esc(a.id) + '" data-k="' + k + '">copiar</button></div>';
    };
    var card = function (a) {
      var u = safeUrl(a.url);
      return '<article class="cf-card">' +
        '<header><div><b>' + esc(a.titulo) + "</b>" + (a.conta ? ' <span class="tag ' + esc(a.conta) + '">' + esc(a.conta) + "</span>" : "") + "</div>" +
        (adm ? '<button class="icon-btn" data-cfedit="' + esc(a.id) + '">Editar</button>' : "") + "</header>" +
        (u ? '<a class="cf-link" href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">' + esc(a.url) + " ↗</a>" : "") +
        field(a, "usuario", "Usuário", false) + field(a, "senha", "Senha", true) + field(a, "chave", "Chave / token", true) +
        (a.obs ? '<p class="hint cf-obs">' + esc(a.obs) + "</p>" : "") +
        '<footer class="hint">' + (adm ? ((a.acesso || []).length ? "Também veem: " + esc(a.acesso.join(", ")) : "Só admins") : "Liberado por " + esc(a.atualizadoPor || "admin")) + (a.atualizadoEm ? " · atualizado " + fmt(new Date(a.atualizadoEm)) : "") + "</footer></article>";
    };
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Acessos</div><h2>Links, logins e chaves</h2><p class="muted">' +
      (adm ? "Admins veem tudo. Em cada acesso você escolhe quem mais do time pode ver." : "Acessos que foram liberados para você. Não repasse por Whats: quem precisa, pede liberação aqui.") + "</p></div>" +
      (adm ? '<button class="btn" id="cfNew">+ Novo acesso <span class="arrow">→</span></button>' : "") + "</div>" +
      '<div class="row"><input type="text" id="cfQ" placeholder="Buscar por nome, site ou usuário" value="' + esc(cfF.q) + '" style="max-width:320px">' +
      '<select id="cfC" style="width:auto"><option value="">Todas as categorias</option>' + cats.map(function (c) { return "<option" + (c === cfF.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
      '<select id="cfA" style="width:auto"><option value="">Todas as contas</option>' + L.contas.map(function (c) { return "<option" + (c === cfF.conta ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div>" +
      (rows.length ? cats.filter(function (c) { return rows.some(function (a) { return (a.categoria || "Outros") === c; }); }).map(function (c) {
        var list = rows.filter(function (a) { return (a.categoria || "Outros") === c; });
        return '<div class="group"><h3>' + esc(c) + " <small>" + list.length + '</small></h3><div class="cf-grid">' + list.map(card).join("") + "</div></div>";
      }).join("") + (function () { var sem = rows.filter(function (a) { return cats.indexOf(a.categoria || "Outros") < 0; }); return sem.length ? '<div class="cf-grid">' + sem.map(card).join("") + "</div>" : ""; })()
      : '<div class="empty">' + (S.cofre.length ? "Nada com esses filtros." : adm ? "Nenhum acesso guardado ainda. Comece pelos que o time mais pede: Meta Business, Google Ads, hospedagem do site." : "Nenhum acesso liberado para você.") + "</div>") +
      (adm ? '<p class="hint">Senhas de banco e de cartão: prefira um gerenciador de senhas. Aqui ficam os acessos de trabalho que o time usa.</p>' : "");
    if ($("#cfNew")) $("#cfNew").onclick = function () { openCofre(null); };
    $("#cfQ").oninput = function () { cfF.q = this.value; clearTimeout(renderCofre._t); renderCofre._t = setTimeout(function () { renderCofre(); var i = $("#cfQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
    $("#cfC").onchange = function () { cfF.cat = this.value; renderCofre(); };
    $("#cfA").onchange = function () { cfF.conta = this.value; renderCofre(); };
    el.onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var find = function (id) { return S.cofre.find(function (x) { return x.id === id; }); };
      if (b.dataset.cfcopy) { var a = find(b.dataset.cfcopy); if (a) copy(a[b.dataset.k] || ""); return; }
      if (b.dataset.cfshow) {
        var key = b.dataset.cfshow + b.dataset.k; cfShow[key] = !cfShow[key];
        clearTimeout(cfTimers[key]); if (cfShow[key]) cfTimers[key] = setTimeout(function () { cfShow[key] = false; if (view === "cofre") renderCofre(); }, 30000);
        renderCofre(); return;
      }
      if (b.dataset.cfedit) { openCofre(find(b.dataset.cfedit)); }
    };
  }
  function openCofre(a) {
    var L = listas(), isNew = !a, id = isNew ? Store.uid() : a.id;
    var d = Object.assign({ titulo: "", categoria: L.categoriasCofre[0] || "Outros", conta: "Ambas", url: "", usuario: "", senha: "", chave: "", obs: "", acesso: [] }, a || {});
    var acesso = (d.acesso || []).slice();
    var adminsNomes = Store.mode === "supabase" ? [] : acessosLista().filter(function (x) { return x.papel === "admin"; }).map(function (x) { return x.nome; });
    var pessoasOpt = nomes().filter(function (n) { return n !== me && adminsNomes.indexOf(n) < 0; });
    openModal('<header><h3>' + (isNew ? "Novo acesso" : "Editar acesso") + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Nome</label><input type="text" id="cfT" value="' + esc(d.titulo) + '" placeholder="ex: Meta Business · AM" autofocus autocomplete="off"></div>' +
      '<div class="field"><label>Categoria</label><select id="cfCat">' + opt(L.categoriasCofre, d.categoria) + "</select></div>" +
      '<div class="field"><label>Conta</label><select id="cfCo">' + opt(L.contas.concat(["SCOPO"]), d.conta) + "</select></div>" +
      '<div class="field"><label>Link</label><input type="text" id="cfU" value="' + esc(d.url) + '" placeholder="business.facebook.com" autocomplete="off"></div>' +
      '<div class="field"><label>Usuário / email</label><input type="text" id="cfUs" value="' + esc(d.usuario) + '" autocomplete="off"></div>' +
      '<div class="field"><label>Senha</label><div class="row" style="flex-wrap:nowrap"><input type="password" id="cfS" value="' + esc(d.senha) + '" autocomplete="new-password"><button type="button" class="icon-btn" id="cfSv">ver</button><button type="button" class="icon-btn" id="cfGen">gerar</button></div></div></div>' +
      '<div class="field"><label>Chave / token / código (opcional)</label><textarea id="cfK" class="mono" style="min-height:60px" autocomplete="off">' + esc(d.chave) + "</textarea></div>" +
      '<div class="field"><label>Observações</label><textarea id="cfO" style="min-height:50px" placeholder="ex: 2 fatores no celular da Ellyn; vence em março">' + esc(d.obs) + "</textarea></div>" +
      '<div class="field"><label>Quem mais pode ver</label><div class="chips" id="cfWho">' + (pessoasOpt.length ? pessoasOpt.map(function (n) { return '<button type="button" data-p="' + esc(n) + '" aria-pressed="' + (acesso.indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") : '<span class="hint">Ninguém além dos admins.</span>') + '</div><p class="hint">Admins sempre veem todos os acessos. Quem não estiver marcado não vê nem sabe que este acesso existe.</p></div>' +
      "</div><footer>" + (isNew ? "<span></span>" : '<span id="cfDelW"><button class="btn ghost small" id="cfDel">Excluir</button></span>') + '<button class="btn" id="cfSave">Salvar <span class="arrow">→</span></button></footer>', { wide: true });
    $("[data-close]").onclick = closeModal;
    $("#cfSv").onclick = function () { var i = $("#cfS"); i.type = i.type === "password" ? "text" : "password"; this.textContent = i.type === "password" ? "ver" : "ocultar"; };
    $("#cfGen").onclick = function () { var i = $("#cfS"); i.value = gerarSenha(16); i.type = "text"; $("#cfSv").textContent = "ocultar"; };
    $("#cfWho").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var i = acesso.indexOf(b.dataset.p); if (i >= 0) acesso.splice(i, 1); else acesso.push(b.dataset.p); b.setAttribute("aria-pressed", String(i < 0)); };
    $("#cfSave").onclick = function () {
      var t = $("#cfT").value.trim(); if (!t) { $("#cfT").focus(); return; }
      Store.set("cofre", id, { titulo: t, categoria: $("#cfCat").value, conta: $("#cfCo").value, url: $("#cfU").value.trim(), usuario: $("#cfUs").value.trim(), senha: $("#cfS").value, chave: $("#cfK").value.trim(), obs: $("#cfO").value.trim(), acesso: acesso, atualizadoEm: new Date().toISOString(), atualizadoPor: me })
        .then(function () { toast("Acesso salvo"); }, fail); closeModal();
    };
    if ($("#cfDel")) $("#cfDel").onclick = function () { delConfirm("#cfDelW", "Excluir este acesso?", function () { Store.del("cofre", id).catch(fail); closeModal(); }); };
  }

  /* ================================================================
     VISITAS ÀS LOJAS (checklist por setor + relatório para a diretoria)
     ================================================================ */
  var NOTAS = [["otimo", "Ótimo", 4], ["bom", "Bom", 3], ["regular", "Regular", 2], ["ruim", "Ruim", 1]];
  var NOTA_V = { otimo: 4, bom: 3, regular: 2, ruim: 1 };
  var NOTA_L = { otimo: "Ótimo", bom: "Bom", regular: "Regular", ruim: "Ruim" };
  var viF = { periodo: "mes", loja: "", conta: "", de: "", ate: "" };
  function visitaScore(v) {
    var ns = Object.keys(v.notas || {}).map(function (k) { return NOTA_V[(v.notas[k] || {}).nota]; }).filter(Boolean);
    if (!ns.length) return null;
    return Math.round(ns.reduce(function (a, b) { return a + b; }, 0) / ns.length / 4 * 100);
  }
  function scoreClass(p) { return p == null ? "" : p >= 85 ? "otimo" : p >= 65 ? "bom" : p >= 45 ? "regular" : "ruim"; }
  function notaFromAvg(avg) { return avg == null ? "" : avg >= 3.5 ? "otimo" : avg >= 2.5 ? "bom" : avg >= 1.5 ? "regular" : "ruim"; }
  function viRange() {
    var t = today(), a = null, b = null;
    if (viF.periodo === "mes") { a = new Date(t.getFullYear(), t.getMonth(), 1); b = new Date(t.getFullYear(), t.getMonth() + 1, 0); }
    else if (viF.periodo === "mespassado") { a = new Date(t.getFullYear(), t.getMonth() - 1, 1); b = new Date(t.getFullYear(), t.getMonth(), 0); }
    else if (viF.periodo === "3m") { a = new Date(t.getFullYear(), t.getMonth() - 2, 1); b = t; }
    else if (viF.periodo === "ano") { a = new Date(t.getFullYear(), 0, 1); b = new Date(t.getFullYear(), 11, 31); }
    else if (viF.periodo === "periodo") { a = parse(viF.de); b = parse(viF.ate); }
    return [a, b];
  }
  function viRangeLabel() {
    var r = viRange();
    if (!r[0] && !r[1]) return "Todo o histórico";
    return (r[0] ? fmt(r[0]) + "/" + r[0].getFullYear() : "início") + " a " + (r[1] ? fmt(r[1]) + "/" + r[1].getFullYear() : "hoje");
  }
  function visitasFiltradas() {
    var r = viRange();
    return S.visitas.filter(function (v) {
      var d = parse(v.data); if (!d) return false;
      return (!r[0] || d >= r[0]) && (!r[1] || d <= r[1]) && (!viF.loja || v.loja === viF.loja) && (!viF.conta || v.conta === viF.conta || v.conta === "Ambas") && (!focoMeu() || v.resp === me);
    }).sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); });
  }
  function setoresDe(list) {
    var set = listas().setoresVisita.slice();
    list.forEach(function (v) { Object.keys(v.notas || {}).forEach(function (k) { if (set.indexOf(k) < 0) set.push(k); }); });
    return set;
  }
  // média por loja × setor no período
  function matriz(list) {
    var lojas = [], m = {};
    list.forEach(function (v) {
      if (lojas.indexOf(v.loja) < 0) lojas.push(v.loja);
      Object.keys(v.notas || {}).forEach(function (s) {
        var n = NOTA_V[(v.notas[s] || {}).nota]; if (!n) return;
        var k = v.loja + "||" + s; (m[k] = m[k] || []).push(n);
      });
    });
    var ord = listas().lojas; lojas.sort(function (a, b) { var ia = ord.indexOf(a), ib = ord.indexOf(b); return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || String(a).localeCompare(String(b), "pt-BR"); });
    return { lojas: lojas, get: function (loja, s) { var a = m[loja + "||" + s]; return a ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; } };
  }
  function renderVisitas() {
    var el = $("#v-visitas"), L = listas();
    var list = visitasFiltradas();
    var setores = setoresDe(list), mx = matriz(list);
    var scores = list.map(visitaScore).filter(function (x) { return x != null; });
    var media = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : null;
    var acTotal = 0, acAbertas = [];
    list.forEach(function (v) { (v.acoes || []).forEach(function (a) { acTotal++; if (!acaoFeita(a)) acAbertas.push({ v: v, a: a }); }); });
    acAbertas.sort(function (x, y) { return (x.a.prazo || "9999").localeCompare(y.a.prazo || "9999") || (y.v.data || "").localeCompare(x.v.data || ""); });
    var criticos = 0; mx.lojas.forEach(function (l) { setores.forEach(function (s) { var a = mx.get(l, s); if (a != null && a < 1.5) criticos++; }); });
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Visitas às lojas</div><h2>Checklist e avaliação por setor</h2><p class="muted">Registre cada visita com o resumo e a nota de cada setor. O painel mostra a média por loja e setor, e o relatório sai em PDF para a diretoria.</p></div>' +
      '<div class="row"><button class="btn ghost" id="viPdf">Relatório em PDF</button><button class="btn" id="viNew">+ Nova visita <span class="arrow">→</span></button></div></div>' +
      (!L.lojas.length ? '<div class="banner warn">Nenhuma loja cadastrada ainda. ' + (isAdmin() ? '<button class="linkbtn" id="viGoLojas">Cadastrar lojas e setores</button>' : "Peça a um admin para cadastrar as lojas.") + "</div>" : "") +
      '<div class="row"><select id="viP" style="width:auto">' + [["mes", "Este mês"], ["mespassado", "Mês passado"], ["3m", "Últimos 3 meses"], ["ano", "Este ano"], ["tudo", "Todo o histórico"], ["periodo", "Período…"]].map(function (o) { return '<option value="' + o[0] + '"' + (viF.periodo === o[0] ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>" +
      (viF.periodo === "periodo" ? '<input type="date" id="viDe" value="' + esc(viF.de) + '" style="width:auto"><span class="hint">até</span><input type="date" id="viAte" value="' + esc(viF.ate) + '" style="width:auto">' : "") +
      '<select id="viL" style="width:auto"><option value="">Todas as lojas</option>' + L.lojas.map(function (l) { return "<option" + (l === viF.loja ? " selected" : "") + ">" + esc(l) + "</option>"; }).join("") + "</select>" +
      '<select id="viC" style="width:auto"><option value="">Todas as contas</option>' + L.contas.filter(function (c) { return c !== "Ambas"; }).map(function (c) { return "<option" + (c === viF.conta ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
      (isAdmin() ? '<button class="linkbtn" id="viCfg">editar lojas e setores</button>' : "") + "</div>" +
      '<div class="vtiles"><div class="vtile"><span>Visitas</span><b>' + list.length + '</b><small>' + esc(viRangeLabel()) + '</small></div><div class="vtile"><span>Lojas visitadas</span><b>' + mx.lojas.length + (L.lojas.length ? " / " + L.lojas.length : "") + '</b></div><div class="vtile nota-' + scoreClass(media) + '"><span>Nota média</span><b>' + (media == null ? "—" : media + "%") + '</b></div><div class="vtile ' + (criticos ? "neg" : "") + '"><span>Pontos críticos</span><b>' + criticos + "</b><small>setores com média Ruim</small></div>" +
      '<div class="vtile"><span>Ações do checklist</span><b>' + acAbertas.length + '</b><small>' + (acTotal ? "em aberto · " + (acTotal - acAbertas.length) + " de " + acTotal + " feitas" : "nenhuma ação criada") + "</small></div></div>" +
      (acAbertas.length ? '<div class="card pad vi-acbox"><div class="section-title"><h3>Checklist das visitas · em aberto <small class="hint">' + acAbertas.length + '</small></h3><button class="btn ghost small" id="viAllPauta">Levar todas para a pauta</button></div><ul class="items vi-acoes">' +
        acAbertas.map(function (x) { var a = x.a, v = x.v, p = parse(a.prazo), late = p && p < today(); return '<li class="item" data-avid="' + esc(v.id) + '" data-aid="' + esc(a.id) + '"><button class="check" data-dtog aria-label="Marcar como feita"></button><div><div class="t">' + esc(a.texto) + '</div><div class="meta"><b>' + esc(v.loja) + "</b><span>visita " + fmt(parse(v.data)) + "</span>" + (a.setor ? '<span class="tag">' + esc(a.setor) + "</span>" : "") + "<span>" + esc(a.resp || v.resp || "") + "</span>" + (p ? '<span class="num ' + (late ? "late-txt" : "") + '">· ' + (late ? "atrasada " : "") + fmt(p) + "</span>" : "") + (a.pautaId ? '<span class="tag solid">na pauta</span>' : '<button class="linkbtn" data-dpauta>virar pauta viva</button>') + "</div></div></li>"; }).join("") + "</ul></div>" : "") +
      (mx.lojas.length ? '<div><div class="lbl" style="margin-bottom:6px">Média por loja e setor no período</div><div class="tbl-wrap"><table class="tbl mtx"><thead><tr><th>Loja</th>' + setores.map(function (s) { return "<th>" + esc(s) + "</th>"; }).join("") + '<th class="r">Nota</th></tr></thead><tbody>' +
        mx.lojas.map(function (l) {
          var vs = list.filter(function (v) { return v.loja === l; }), sc = vs.map(visitaScore).filter(function (x) { return x != null; });
          var ls = sc.length ? Math.round(sc.reduce(function (a, b) { return a + b; }, 0) / sc.length) : null;
          return '<tr data-vloja="' + esc(l) + '"><td><b>' + esc(l) + '</b><div class="hint">' + vs.length + " visita" + (vs.length > 1 ? "s" : "") + " · última " + fmt(parse(vs[0].data)) + "</div></td>" +
            setores.map(function (s) { var a = mx.get(l, s), n = notaFromAvg(a); return '<td><span class="nota ' + n + '">' + (n ? NOTA_L[n] : "—") + "</span></td>"; }).join("") +
            '<td class="r"><span class="nota ' + scoreClass(ls) + '">' + (ls == null ? "—" : ls + "%") + "</span></td></tr>";
        }).join("") + "</tbody></table></div></div>" : "") +
      '<div class="group"><h3>Visitas <small>' + list.length + "</small></h3>" + (list.length ? '<div class="vi-list">' + list.map(function (v) {
        var sc = visitaScore(v), ruins = Object.keys(v.notas || {}).filter(function (k) { return (v.notas[k] || {}).nota === "ruim"; });
        var ac = v.acoes || [], acF = ac.filter(acaoFeita).length, nf = Object.keys(v.notas || {}).reduce(function (t, k) { return t + ((v.notas[k] || {}).fotos || []).length; }, 0) + (v.anexos || []).length;
        return '<button class="vi-item" data-vid="' + esc(v.id) + '"><span class="vi-date"><b>' + fmt(parse(v.data)) + "</b>" + DOW[parse(v.data).getDay()] + '</span><span class="vi-main"><b>' + esc(v.loja || "Sem loja") + "</b>" + (v.conta ? ' <span class="tag ' + esc(v.conta) + '">' + esc(v.conta) + "</span>" : "") + '<span class="hint">' + esc((v.resumo || "").slice(0, 140)) + (ruins.length ? ' · <span class="late-txt">Ruim: ' + esc(ruins.join(", ")) + "</span>" : "") + "</span>" + (ac.length || nf ? '<span class="vi-badges">' + (ac.length ? '<span class="tag' + (acF < ac.length ? "" : " solid") + '">✓ ' + acF + "/" + ac.length + " ações</span>" : "") + (nf ? '<span class="tag">📷 ' + nf + "</span>" : "") + "</span>" : "") + "</span>" +
          '<span class="nota ' + scoreClass(sc) + '">' + (sc == null ? "sem notas" : sc + "%") + "</span></button>";
      }).join("") + "</div>" : '<div class="empty">Nenhuma visita neste período.</div>') + "</div>";
    $("#viNew").onclick = function () { openVisita(null); };
    $("#viPdf").onclick = function () { relatorioVisitas(list); };
    var goCfg = function () { showView("admin"); setTimeout(function () { var b = $('[data-list="lojas"]'); if (b) b.scrollIntoView({ behavior: "smooth", block: "center" }); }, 150); };
    if ($("#viCfg")) $("#viCfg").onclick = goCfg;
    if ($("#viGoLojas")) $("#viGoLojas").onclick = goCfg;
    $("#viP").onchange = function () { viF.periodo = this.value; renderVisitas(); };
    if ($("#viDe")) { $("#viDe").onchange = function () { viF.de = this.value; renderVisitas(); }; $("#viAte").onchange = function () { viF.ate = this.value; renderVisitas(); }; }
    $("#viL").onchange = function () { viF.loja = this.value; renderVisitas(); };
    $("#viC").onchange = function () { viF.conta = this.value; renderVisitas(); };
    if ($("#viAllPauta")) $("#viAllPauta").onclick = function () {
      var alvo = acAbertas.filter(function (x) { return !x.a.pautaId; }); if (!alvo.length) { toast("Todas já estão na pauta"); return; }
      var porV = {};
      alvo.reduce(function (pr, x) { return pr.then(function () { return acaoParaPauta(x.v, x.a).then(function (pid) { porV[x.v.id] = porV[x.v.id] || {}; porV[x.v.id][x.a.id] = pid; }); }); }, Promise.resolve()).then(function () {
        return Promise.all(Object.keys(porV).map(function (vid) { var v = S.visitas.find(function (y) { return y.id === vid; }); return Store.upd("visitas", vid, { acoes: (v.acoes || []).map(function (a) { return porV[vid][a.id] ? Object.assign({}, a, { pautaId: porV[vid][a.id] }) : a; }) }); }));
      }).then(function () { toast(alvo.length + " pendência" + (alvo.length > 1 ? "s" : "") + " na pauta"); }, fail);
    };
    el.onclick = function (e) {
      var li = e.target.closest("[data-aid]");
      if (li) {
        var v0 = S.visitas.find(function (x) { return x.id === li.dataset.avid; }), a0 = v0 && (v0.acoes || []).find(function (x) { return x.id === li.dataset.aid; });
        if (!a0) return;
        if (e.target.closest("[data-dtog]")) { if (!canEdit("visitas", v0)) { denyToast(); return; } marcarAcao(v0, a0.id, true).then(function () { toast("Ação feita"); }, fail); return; }
        if (e.target.closest("[data-dpauta]")) { acaoParaPauta(v0, a0).then(function (pid) { return Store.upd("visitas", v0.id, { acoes: (v0.acoes || []).map(function (x) { return x.id === a0.id ? Object.assign({}, x, { pautaId: pid }) : x; }) }); }).then(function () { toast("Na pauta viva"); }, fail); return; }
        openVisita(v0); return;
      }
      var b = e.target.closest("[data-vid]"); if (b) { openVisita(S.visitas.find(function (x) { return x.id === b.dataset.vid; })); return; }
      var tr = e.target.closest("tr[data-vloja]"); if (tr) { viF.loja = tr.dataset.vloja; renderVisitas(); }
    };
  }
  // ações do checklist: feita aqui ou feita na pauta (quando virou pendência)
  function acaoFeita(a) {
    if (a.feito) return true;
    if (a.pautaId) { var p = S.pauta.find(function (x) { return x.id === a.pautaId; }); if (p && p.status === "feito") return true; }
    return false;
  }
  function acaoParaPauta(v, a) {
    var resp = a.resp || v.resp || me;
    return Store.add("pauta", { titulo: "[" + (v.loja || "Loja") + "] " + a.texto, conta: v.conta || "Ambas", resp: resp, reuniao: "", area: "Loja / VM", prazo: a.prazo || "", status: "aberto",
      notas: "Da visita de " + fmt(parse(v.data)) + (a.setor ? " · setor " + a.setor : "") + ".", acompanha: resp !== me ? [me] : [], visita: v.id, criadoEm: new Date().toISOString(), criadoPor: me });
  }
  function marcarAcao(v, acaoId, feito) {
    var acoes = (v.acoes || []).map(function (a) { return a.id === acaoId ? Object.assign({}, a, { feito: feito, feitoEm: feito ? new Date().toISOString() : "" }) : a; });
    var a = acoes.find(function (x) { return x.id === acaoId; });
    if (a && a.pautaId) { var p = S.pauta.find(function (x) { return x.id === a.pautaId; }); if (p && (p.status === "feito") !== feito) Store.upd("pauta", p.id, feito ? { status: "feito", feitoEm: new Date().toISOString() } : { status: "aberto", feitoEm: "" }).catch(function () {}); }
    return Store.upd("visitas", v.id, { acoes: acoes });
  }
  function openVisita(v) {
    var L = listas(), isNew = !v, id = isNew ? Store.uid() : v.id;
    var d = Object.assign({ loja: viF.loja || L.lojas[0] || "", data: iso(today()), conta: "Ambas", resp: me, resumo: "", notas: {}, anexos: [], acoes: [] }, v || {});
    var notas = JSON.parse(JSON.stringify(d.notas || {}));
    var acoes = JSON.parse(JSON.stringify(d.acoes || []));
    var anexos = (d.anexos || []).slice();
    var setores = L.setoresVisita.slice(); Object.keys(notas).forEach(function (k) { if (setores.indexOf(k) < 0) setores.push(k); });
    var pode = isNew || canEdit("visitas", v);
    var lojasOpt = L.lojas.slice(); if (d.loja && lojasOpt.indexOf(d.loja) < 0) lojasOpt.push(d.loja);
    var limpa = function (s) { var n = notas[s]; if (n && !n.nota && !n.obs && !(n.fotos || []).length) delete notas[s]; };
    function fotosHTML(i) {
      var fs = ((notas[setores[i]] || {}).fotos || []);
      return fs.map(function (a, k) { return '<span class="ck-foto"><button type="button" class="ck-th" data-fopen="' + i + ":" + k + '" data-src-ref="' + esc(JSON.stringify(a)) + '" title="' + esc(a.nome) + '"></button>' + (pode ? '<button type="button" class="ck-fx" data-frm="' + i + ":" + k + '" aria-label="Remover foto">✕</button>' : "") + "</span>"; }).join("");
    }
    function acoesHTML() {
      if (!acoes.length) return '<p class="hint">Nenhuma ação ainda. Use <b>Gerar dos Regular e Ruim</b> ou <b>+ Ação</b>.</p>';
      return '<ul class="items vi-acoes">' + acoes.map(function (a, i) {
        var feita = acaoFeita(a);
        return '<li class="item ' + (feita ? "done" : "") + '" data-ai="' + i + '"><button type="button" class="check ' + (feita ? "on" : "") + '" data-atog="' + i + '" aria-label="' + (feita ? "Reabrir" : "Marcar como feita") + '"></button>' +
          '<div class="vi-a-main"><input type="text" class="vi-a-t" data-ak="texto" value="' + esc(a.texto) + '" placeholder="O que precisa ser feito">' +
          '<div class="meta">' + (a.setor ? '<span class="tag">' + esc(a.setor) + "</span>" : "") +
          '<select data-ak="resp" aria-label="Responsável">' + opt(respOpts(), a.resp || d.resp) + '</select><input type="date" data-ak="prazo" value="' + esc(a.prazo || "") + '" aria-label="Prazo">' +
          (a.pautaId ? '<span class="tag solid">na pauta</span>' : '<button type="button" class="linkbtn" data-apauta="' + i + '">virar pauta viva</button>') + "</div></div>" +
          '<button type="button" class="x" data-adel="' + i + '" aria-label="Remover ação">✕</button></li>';
      }).join("") + "</ul>";
    }
    openModal('<header><h3>' + (isNew ? "Nova visita" : "Visita · " + esc(d.loja)) + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Loja</label><select id="viLo">' + (lojasOpt.length ? opt(lojasOpt, d.loja) : '<option value="">Cadastre as lojas no Admin</option>') + "</select></div>" +
      '<div class="field"><label>Data</label><input type="date" id="viDa" value="' + esc(d.data) + '"></div>' +
      '<div class="field"><label>Conta</label><select id="viCo">' + opt(L.contas, d.conta) + "</select></div>" +
      '<div class="field"><label>Quem visitou</label><select id="viRe">' + opt(nomes(), d.resp) + "</select></div></div>" +
      '<div class="field"><label>Resumo da visita</label><textarea id="viRs" style="min-height:90px" placeholder="Como estava a loja, conversa com o gerente, o que precisa de ação">' + esc(d.resumo) + "</textarea></div>" +
      '<div class="field"><div class="section-title"><label>Avaliação por setor</label><span class="hint" id="viScore"></span></div><div class="ck-list">' +
        setores.map(function (s, i) {
          var n = notas[s] || {};
          return '<div class="ck-row" data-si="' + i + '"><div class="ck-name">' + esc(s) + '</div><div class="ck-opts">' +
            NOTAS.map(function (o) { return '<button type="button" class="ck-b ' + o[0] + '" data-n="' + o[0] + '" aria-pressed="' + (n.nota === o[0]) + '">' + o[1] + "</button>"; }).join("") +
            '</div><input type="text" class="ck-obs" data-obs="' + i + '" value="' + esc(n.obs || "") + '" placeholder="Comentário">' +
            '<div class="ck-fotos"><span class="ck-fl" data-fl="' + i + '">' + fotosHTML(i) + "</span>" +
            (pode ? '<label class="ck-cam" title="Anexar fotos deste setor"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg><span>Anexo</span><input type="file" accept="image/*,video/*" multiple hidden data-fup="' + i + '"></label>' : "") + "</div></div>";
        }).join("") + '</div><p class="hint">Clique de novo na nota para limpar. Setores sem nota não entram na média. As fotos de cada setor saem no relatório.</p></div>' +
      '<div class="field vi-ck"><div class="section-title"><label>Checklist de ações <span class="hint" id="viAcCount"></span></label><span class="row">' +
        (pode ? '<button type="button" class="btn ghost small" id="viGen">Gerar dos Regular e Ruim</button><button type="button" class="btn ghost small" id="viAdd">+ Ação</button>' : "") + "</span></div>" +
        '<div id="viAcoes">' + acoesHTML() + "</div></div>" +
      '<div class="field" id="viAtt"></div>' +
      "</div><footer><span class=\"row\">" + (isNew ? "" : '<span id="viDelW"><button class="btn ghost small" id="viDel">Excluir</button></span>') + (pode ? '<button class="btn ghost small" id="viPauta">Levar ações abertas para a pauta</button>' : "") + '</span><button class="btn" id="viSave">Salvar visita <span class="arrow">→</span></button></footer>', { wide: true });
    var m = $("#modalRoot .modal");
    hydrateMedia(m);
    attachBlock($("#viAtt"), { titulo: "Fotos gerais da visita", lista: anexos, pasta: "visitas/" + id, accept: "image/*,video/*,.pdf", podeEditar: pode, dropTarget: m,
      onChange: function (l) { anexos = l; if (!isNew) Store.upd("visitas", id, { anexos: l }).catch(fail); } });
    var upScore = function () { var p = visitaScore({ notas: notas }); $("#viScore").innerHTML = p == null ? "" : 'Nota da visita: <span class="nota ' + scoreClass(p) + '">' + p + "%</span>"; };
    var upCount = function () { var f = acoes.filter(acaoFeita).length; $("#viAcCount").textContent = acoes.length ? f + " de " + acoes.length + " feitas" : ""; };
    var syncAcoes = function () { $$("#viAcoes [data-ai]").forEach(function (li) { var a = acoes[+li.dataset.ai]; if (!a) return; $$("[data-ak]", li).forEach(function (inp) { a[inp.dataset.ak] = inp.value; }); a.texto = (a.texto || "").trim(); }); };
    var drawAcoes = function () { $("#viAcoes").innerHTML = acoesHTML(); upCount(); };
    var collect = function () { $$(".ck-obs", m).forEach(function (inp) { var s = setores[+inp.dataset.obs], o = inp.value.trim(); if (o) { notas[s] = Object.assign({}, notas[s] || {}, { obs: o }); } else if (notas[s]) { delete notas[s].obs; limpa(s); } }); syncAcoes(); };
    var doc = function () { collect(); return { loja: $("#viLo").value, data: $("#viDa").value || iso(today()), conta: $("#viCo").value, resp: $("#viRe").value, resumo: $("#viRs").value.trim(), notas: notas, anexos: anexos, acoes: acoes.filter(function (a) { return a.texto; }), criadoPor: d.criadoPor || me, criadoEm: d.criadoEm || new Date().toISOString() }; };
    var persist = function (msg) { var x = doc(); if (!x.loja) { toast("Escolha a loja"); return Promise.reject({ code: "denied" }); } return Store.set("visitas", id, x).then(function () { isNew = false; if (msg) toast(msg); return x; }); };
    upScore(); upCount();
    $("[data-close]", m).onclick = closeModal;
    m.addEventListener("change", function (e) {
      var up = e.target.closest("[data-fup]"); if (!up) return;
      var i = +up.dataset.fup, s = setores[i], files = up.files; if (!files || !files.length) return;
      uploadMany(files, "visitas/" + id).then(function (ms) {
        up.value = ""; if (!ms.length) return;
        notas[s] = Object.assign({}, notas[s] || {}); notas[s].fotos = (notas[s].fotos || []).concat(ms);
        var box = $('[data-fl="' + i + '"]', m); box.innerHTML = fotosHTML(i); hydrateMedia(box);
        if (!isNew) { collect(); Store.upd("visitas", id, { notas: notas }).catch(fail); }
      });
    });
    $(".ck-list", m).onclick = function (e) {
      var fo = e.target.closest("[data-fopen]"); if (fo) { var p = fo.dataset.fopen.split(":"); lightbox(notas[setores[+p[0]]].fotos[+p[1]]); return; }
      var fr = e.target.closest("[data-frm]");
      if (fr) { var q = fr.dataset.frm.split(":"), s0 = setores[+q[0]], lista = notas[s0].fotos, rm = lista[+q[1]]; notas[s0].fotos = lista.filter(function (x) { return x !== rm; }); Store.removeFile(rm); limpa(s0); var bx = $('[data-fl="' + q[0] + '"]', m); bx.innerHTML = fotosHTML(+q[0]); hydrateMedia(bx); if (!isNew) { collect(); Store.upd("visitas", id, { notas: notas }).catch(fail); } return; }
      var b = e.target.closest("[data-n]"); if (!b) return;
      var row = b.closest("[data-si]"), s = setores[+row.dataset.si], cur = (notas[s] || {}).nota;
      var nv = cur === b.dataset.n ? "" : b.dataset.n;
      notas[s] = Object.assign({}, notas[s] || {}); if (nv) notas[s].nota = nv; else delete notas[s].nota; limpa(s);
      $$("[data-n]", row).forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.n === nv)); });
      upScore();
    };
    if ($("#viGen")) $("#viGen").onclick = function () {
      collect();
      var novos = setores.filter(function (s) { var n = notas[s] || {}; return (n.nota === "ruim" || n.nota === "regular") && !acoes.some(function (a) { return a.setor === s; }); });
      if (!novos.length) { toast("Nenhum setor Regular ou Ruim sem ação"); return; }
      novos.forEach(function (s) { var n = notas[s]; acoes.push({ id: Store.uid(), texto: (n.nota === "ruim" ? "Corrigir " : "Melhorar ") + s.toLowerCase() + (n.obs ? ": " + n.obs : ""), setor: s, resp: $("#viRe").value || me, prazo: "", feito: false }); });
      drawAcoes(); toast(novos.length + (novos.length > 1 ? " ações" : " ação") + " no checklist");
    };
    if ($("#viAdd")) $("#viAdd").onclick = function () { collect(); acoes.push({ id: Store.uid(), texto: "", setor: "", resp: $("#viRe").value || me, prazo: "", feito: false }); drawAcoes(); var ins = $$("#viAcoes .vi-a-t"); if (ins.length) ins[ins.length - 1].focus(); };
    $("#viAcoes").onclick = function (e) {
      var t = e.target.closest("[data-atog],[data-adel],[data-apauta]"); if (!t) return;
      collect();
      if (t.dataset.atog != null) {
        var a = acoes[+t.dataset.atog], nv = !acaoFeita(a); a.feito = nv; a.feitoEm = nv ? new Date().toISOString() : "";
        if (a.pautaId) { var p = S.pauta.find(function (x) { return x.id === a.pautaId; }); if (p && (p.status === "feito") !== nv) Store.upd("pauta", p.id, nv ? { status: "feito", feitoEm: new Date().toISOString() } : { status: "aberto", feitoEm: "" }).catch(function () {}); }
        drawAcoes(); if (!isNew) Store.upd("visitas", id, { acoes: acoes.filter(function (x) { return x.texto; }) }).catch(fail); return;
      }
      if (t.dataset.adel != null) { acoes.splice(+t.dataset.adel, 1); drawAcoes(); return; }
      if (t.dataset.apauta != null) {
        var ac = acoes[+t.dataset.apauta]; if (!ac.texto) { toast("Escreva a ação primeiro"); return; }
        var vv = doc();
        acaoParaPauta(Object.assign({ id: id }, vv), ac).then(function (pid) { ac.pautaId = pid; drawAcoes(); return persist(); }).then(function () { toast("Na pauta viva"); }, fail);
      }
    };
    if ($("#viPauta")) $("#viPauta").onclick = function () {
      var vv = doc(), abertas = acoes.filter(function (a) { return a.texto && !a.pautaId && !acaoFeita(a); });
      if (!abertas.length) { toast(acoes.length ? "Todas as ações já estão na pauta ou feitas" : "Crie as ações do checklist primeiro"); return; }
      abertas.reduce(function (pr, a) { return pr.then(function () { return acaoParaPauta(Object.assign({ id: id }, vv), a).then(function (pid) { a.pautaId = pid; }); }); }, Promise.resolve())
        .then(function () { drawAcoes(); return persist(); }).then(function () { toast(abertas.length + " pendência" + (abertas.length > 1 ? "s" : "") + " na pauta"); }, fail);
    };
    $("#viSave").onclick = function () { persist("Visita salva").then(function () { closeModal(); }, function (e) { if (!e || e.code !== "denied") fail(e); }); };
    if ($("#viDel")) $("#viDel").onclick = function () { delConfirm("#viDelW", "Excluir esta visita?", function () { anexos.forEach(function (a) { Store.removeFile(a); }); Object.keys(notas).forEach(function (s) { (notas[s].fotos || []).forEach(function (a) { Store.removeFile(a); }); }); Store.del("visitas", id).catch(fail); closeModal(); }); };
  }

  /* ---------- relatório para a diretoria (abre pronto para salvar em PDF) ---------- */
  function relatorioVisitas(list) {
    if (!list.length) { toast("Não há visitas neste período para o relatório."); return; }
    var w = window.open("", "_blank");
    if (!w) { toast("O navegador bloqueou a janela. Libere pop-ups para este site."); return; }
    w.document.write("<p style='font-family:sans-serif;padding:30px'>Montando o relatório…</p>");
    var setores = setoresDe(list), mx = matriz(list);
    var ANEXOS_POR_VISITA = 4;
    var jobs = [];
    list.forEach(function (v) {
      (v.anexos || []).filter(function (a) { return fileKind(a) === "img"; }).slice(0, ANEXOS_POR_VISITA).forEach(function (a) { jobs.push(Store.fileUrl(a).then(function (u) { a._u = u; }, function () {})); });
      Object.keys(v.notas || {}).forEach(function (s) { ((v.notas[s] || {}).fotos || []).filter(function (a) { return fileKind(a) === "img"; }).slice(0, 8).forEach(function (a) { jobs.push(Store.fileUrl(a).then(function (u) { a._u = u; }, function () {})); }); });
    });
    Promise.all(jobs).then(function () {
      var logo = new URL("logo.png", location.href).href;
      var scores = list.map(visitaScore).filter(function (x) { return x != null; });
      var media = scores.length ? Math.round(scores.reduce(function (a, b) { return a + b; }, 0) / scores.length) : null;
      var cell = function (n, txt) { return '<span class="n ' + (n || "") + '">' + (txt || (n ? NOTA_L[n] : "—")) + "</span>"; };
      var byLoja = mx.lojas.map(function (l) {
        var vs = list.filter(function (v) { return v.loja === l; }), sc = vs.map(visitaScore).filter(function (x) { return x != null; });
        var ls = sc.length ? Math.round(sc.reduce(function (a, b) { return a + b; }, 0) / sc.length) : null;
        return '<section class="loja"><div class="lh"><h2>' + esc(l) + '</h2><div class="ls">' + cell(scoreClass(ls), ls == null ? "sem nota" : "Nota " + ls + "%") + '<span class="muted">' + vs.length + " visita" + (vs.length > 1 ? "s" : "") + "</span></div></div>" +
          '<table class="grid"><thead><tr><th>Setor</th><th>Média</th>' + vs.map(function (v) { return "<th>" + fmt(parse(v.data)) + "</th>"; }).join("") + "</tr></thead><tbody>" +
          setores.map(function (s) { return "<tr><td>" + esc(s) + "</td><td>" + cell(notaFromAvg(mx.get(l, s))) + "</td>" + vs.map(function (v) { var n = (v.notas || {})[s] || {}; return "<td>" + cell(n.nota) + (n.obs ? '<div class="obs">' + esc(n.obs) + "</div>" : "") + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>" +
          vs.map(function (v) {
            var fotos = (v.anexos || []).filter(function (a) { return a._u; });
            return '<div class="visita"><h3>Visita de ' + fmt(parse(v.data)) + "/" + v.data.slice(0, 4) + ' <span class="muted">· ' + esc(v.resp || "") + (visitaScore(v) != null ? " · nota " + visitaScore(v) + "%" : "") + "</span></h3>" +
              (v.resumo ? '<p class="resumo">' + esc(v.resumo).replace(/\n/g, "<br>") + "</p>" : "") +
              (function () {
                var ss = setores.filter(function (s) { var n = (v.notas || {})[s] || {}; return n.nota || n.obs || (n.fotos || []).length; });
                if (!ss.length) return "";
                return '<div class="lbl2">Avaliação por setor</div><div class="setores">' + ss.map(function (s) {
                  var n = v.notas[s] || {}, fs = (n.fotos || []).filter(function (a) { return a._u; });
                  return '<div class="setor"><div class="sh"><b>' + esc(s) + "</b>" + cell(n.nota) + "</div>" + (n.obs ? '<div class="sobs">' + esc(n.obs) + "</div>" : "") +
                    (fs.length ? '<div class="fotos">' + fs.map(function (a) { return '<img src="' + esc(a._u) + '" alt="">'; }).join("") + "</div>" : "") + "</div>";
                }).join("") + "</div>";
              })() +
              (fotos.length ? '<div class="lbl2">Fotos gerais da visita</div><div class="fotos">' + fotos.map(function (a) { return '<img src="' + esc(a._u) + '" alt="">'; }).join("") + "</div>" : "") +
((v.acoes || []).length ? '<div class="lbl2">Checklist de ações · ' + v.acoes.filter(acaoFeita).length + " de " + v.acoes.length + ' feitas</div><ul class="acs">' + v.acoes.map(function (a) { var f = acaoFeita(a); return '<li class="' + (f ? "ok" : "") + '"><span class="bx">' + (f ? "✓" : "") + "</span>" + esc(a.texto) + '<span class="muted"> · ' + esc(a.resp || "") + (a.prazo ? " · até " + fmt(parse(a.prazo)) : "") + (a.pautaId ? " · na pauta" : "") + "</span></li>"; }).join("") + "</ul>" : "") + "</div>";
          }).join("") + "</section>";
      }).join("");
      var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório de visitas · ' + esc(viRangeLabel()) + '</title>' +
        '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Work+Sans:wght@400;500;600&display=swap">' +
        "<style>" +
        "@page{size:A4;margin:14mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
        "body{margin:0;font-family:'Work Sans',Arial,sans-serif;color:#141414;font-size:11.5px;line-height:1.45;background:#fff}" +
        "h1,h2,h3{font-family:'Poppins',Arial,sans-serif;margin:0}.muted{color:#6b6b6b;font-weight:400}" +
        ".cover{background:#0a0a0a;color:#fff;padding:22px 26px;border-radius:10px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;border-bottom:4px solid #F5DF00}" +
        ".cover img{height:24px;display:block;margin-bottom:14px}.cover h1{font-size:24px;font-weight:800}.cover .sub{color:#bdbdbd;margin-top:4px}.cover .meta{text-align:right;color:#bdbdbd;font-size:11px}" +
        ".kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.kpi{border:1px solid #e3e3e3;border-radius:8px;padding:10px 12px}.kpi span{display:block;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#6b6b6b;font-weight:600}.kpi b{font-family:'Poppins',Arial;font-size:20px}" +
        "h2.sec{font-size:15px;margin:18px 0 8px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e7e7e7;padding:6px 7px;text-align:left;vertical-align:top}th{font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#6b6b6b;background:#f6f6f6}" +
        ".n{display:inline-block;padding:2px 8px;border-radius:10px;font-weight:600;font-size:10.5px;white-space:nowrap;background:#eee;color:#555}.n.otimo{background:#d8f5e3;color:#11623a}.n.bom{background:#dcecff;color:#174a8a}.n.regular{background:#fff1d1;color:#8a5a00}.n.ruim{background:#ffdcdc;color:#9a1c1c}" +
        ".loja{break-before:page;padding-top:4px}.lh{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #F5DF00;padding-bottom:6px;margin-bottom:10px}.lh h2{font-size:19px}.ls{display:flex;gap:10px;align-items:center}" +
        ".obs{font-size:10px;color:#555;margin-top:2px}.visita{margin-top:14px;break-inside:avoid}.visita h3{font-size:12.5px;margin-bottom:4px}.resumo{margin:0 0 6px;padding:8px 10px;background:#fafafa;border-left:3px solid #F5DF00}" +
        ".fotos{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.fotos img{width:100%;height:110px;object-fit:cover;border-radius:6px}" +
        ".setores{display:grid;gap:8px}.setor{border:1px solid #e7e7e7;border-radius:8px;padding:8px 10px;break-inside:avoid}.setor .sh{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px}.setor .sobs{font-size:10.5px;color:#444;margin-top:3px}.setor .fotos{margin-top:6px}.lbl2{font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#6b6b6b;font-weight:700;margin:10px 0 4px}" +
        ".acs{list-style:none;margin:0;padding:0;display:grid;gap:3px}.acs li{display:flex;gap:6px;align-items:flex-start}.acs .bx{width:12px;height:12px;border:1.5px solid #999;border-radius:3px;display:inline-flex;align-items:center;justify-content:center;font-size:9px;flex:none;margin-top:2px}.acs li.ok{color:#6b6b6b;text-decoration:line-through}.acs li.ok .bx{background:#1f9d57;border-color:#1f9d57;color:#fff}" +
        "@media screen{body{max-width:1100px;margin:0 auto;padding:24px}}" +
        ".foot{margin-top:20px;font-size:10px;color:#8a8a8a;text-align:center}.tip{background:#fff8c6;border:1px solid #f0dc50;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12px}@media print{.tip{display:none}}" +
        "</style></head><body>" +
        '<div class="tip">Na janela de impressão, escolha <b>Salvar como PDF</b> como destino.</div>' +
        '<div class="cover"><div><img src="' + esc(logo) + '" alt="SCOPO"><h1>Relatório de visitas às lojas</h1><div class="sub">' + esc(viRangeLabel()) + (viF.conta ? " · " + esc(viF.conta) : "") + (viF.loja ? " · " + esc(viF.loja) : "") + '</div></div><div class="meta">Gerado em ' + fmt(new Date()) + "/" + new Date().getFullYear() + "<br>por " + esc(me) + "</div></div>" +
        '<div class="kpis"><div class="kpi"><span>Visitas</span><b>' + list.length + '</b></div><div class="kpi"><span>Lojas visitadas</span><b>' + mx.lojas.length + '</b></div><div class="kpi"><span>Nota média</span><b>' + (media == null ? "—" : media + "%") + '</b></div><div class="kpi"><span>Setores avaliados</span><b>' + setores.length + "</b></div></div>" +
        '<h2 class="sec">Visão geral · média por loja e setor</h2><table><thead><tr><th>Loja</th>' + setores.map(function (s) { return "<th>" + esc(s) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        mx.lojas.map(function (l) { return "<tr><td><b>" + esc(l) + "</b></td>" + setores.map(function (s) { return "<td>" + cell(notaFromAvg(mx.get(l, s))) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>" +
        '<p class="muted" style="margin-top:6px">Escala: Ótimo = 4 · Bom = 3 · Regular = 2 · Ruim = 1. Nota em % = média ÷ 4.</p>' +
        byLoja + '<div class="foot">SCOPO · Fluxo do Time · Relatório de visitas</div></body></html>';
      w.document.open(); w.document.write(html); w.document.close();
      var go = function () { try { w.focus(); w.print(); } catch (e) {} };
      var imgs = w.document.images, pend = imgs.length, done = false;
      var fin = function () { if (!done) { done = true; setTimeout(go, 300); } };
      if (!pend) setTimeout(fin, 600);
      Array.prototype.forEach.call(imgs, function (im) { if (im.complete) { if (--pend <= 0) fin(); } else { im.onload = im.onerror = function () { if (--pend <= 0) fin(); }; } });
      setTimeout(fin, 5000);
    });
  }

  /* ================================================================
     RELATÓRIO (base comum para PDFs de eventos e campanhas)
     ================================================================ */
  var REPORT_CSS =
    "@page{size:A4;margin:14mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    "body{margin:0;font-family:'Work Sans',Arial,sans-serif;color:#141414;font-size:11.5px;line-height:1.45;background:#fff}" +
    "@media screen{body{max-width:1100px;margin:0 auto;padding:24px}}" +
    "h1,h2,h3{font-family:'Poppins',Arial,sans-serif;margin:0}.muted{color:#6b6b6b;font-weight:400}" +
    ".cover{background:#0a0a0a;color:#fff;padding:22px 26px;border-radius:10px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;border-bottom:4px solid #F5DF00}" +
    ".cover img{height:24px;display:block;margin-bottom:14px}.cover h1{font-size:24px;font-weight:800}.cover .sub{color:#bdbdbd;margin-top:4px}.cover .meta{text-align:right;color:#bdbdbd;font-size:11px}" +
    ".kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}.kpi{border:1px solid #e3e3e3;border-radius:8px;padding:10px 12px}.kpi span{display:block;font-size:9.5px;letter-spacing:1px;text-transform:uppercase;color:#6b6b6b;font-weight:600}.kpi b{font-family:'Poppins',Arial;font-size:18px}" +
    "h2.sec{font-size:15px;margin:20px 0 8px;padding-bottom:5px;border-bottom:3px solid #F5DF00}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #e7e7e7;padding:6px 7px;text-align:left;vertical-align:top}th{font-size:9.5px;letter-spacing:.8px;text-transform:uppercase;color:#6b6b6b;background:#f6f6f6}td.r,th.r{text-align:right}tfoot td{font-weight:700;background:#fafafa}" +
    ".pill{display:inline-block;padding:2px 8px;border-radius:10px;font-weight:600;font-size:10px;white-space:nowrap;background:#eee;color:#555}" +
    ".p-realizada,.p-realizado{background:#d8f5e3;color:#11623a}.p-noar,.p-confirmado{background:#fff4b3;color:#6b5a00}.p-producao{background:#fff1d1;color:#8a5a00}.p-planejada,.p-planejamento{background:#e8e8ff;color:#3b3b8f}.p-cancelada,.p-cancelado{background:#ffdcdc;color:#9a1c1c}" +
    ".box{border:1px solid #e7e7e7;border-radius:8px;padding:12px 14px;margin-top:12px;break-inside:avoid}.box h3{font-size:14px;margin-bottom:4px}" +
    ".txt{margin:6px 0;padding:8px 10px;background:#fafafa;border-left:3px solid #F5DF00;white-space:pre-wrap}" +
    ".imgs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.imgs img{width:100%;height:120px;object-fit:cover;border-radius:6px}" +
    ".tags span{display:inline-block;border:1px solid #ddd;border-radius:10px;padding:1px 8px;margin:0 4px 4px 0;font-size:10.5px}" +
    ".ck{columns:2;font-size:11px;margin-top:6px}.ck div{break-inside:avoid}.ok{color:#11623a}.no{color:#999}" +
    ".months{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.month{border:1px solid #e3e3e3;border-radius:8px;padding:8px;min-height:90px;break-inside:avoid}.month b{font-family:'Poppins',Arial;font-size:12px;display:block;margin-bottom:4px}.month div{font-size:10.5px;margin-bottom:3px}" +
    ".pb{break-before:page}.names{columns:3;font-size:10.5px}.foot{margin-top:20px;font-size:10px;color:#8a8a8a;text-align:center}" +
    ".tip{background:#fff8c6;border:1px solid #f0dc50;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:12px}@media print{.tip{display:none}}";
  function abrirRelatorio(o) {
    var w = window.open("", "_blank");
    if (!w) { toast("O navegador bloqueou a janela. Libere pop-ups para este site."); return; }
    w.document.write("<p style='font-family:sans-serif;padding:30px'>Montando o relatório…</p>");
    var anexos = o.imagens || [];
    Promise.all(anexos.map(function (a) { return Store.fileUrl(a).then(function (u) { a._u = u; }, function () {}); })).then(function () {
      var logo = o.logo || new URL("logo.png", location.href).href, tm = o.tema || null;
      var temaCss = tm ? ".cover{background:" + tm.bg + ";color:" + tm.fg + ";border-bottom-color:" + tm.ac + "}.cover .sub,.cover .meta{color:" + tm.fg + ";opacity:.8}h2.sec{border-bottom-color:" + tm.ac + "}.txt{border-left-color:" + tm.ac + "}.cover img{height:40px;max-width:220px;object-fit:contain}" : "";
      var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>' + esc(o.titulo) + '</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@600;700;800&family=Work+Sans:wght@400;500;600&display=swap"><style>' + REPORT_CSS + temaCss + "</style></head><body>" +
        '<div class="tip">Na janela de impressão, escolha <b>Salvar como PDF</b> como destino.</div>' +
        '<div class="cover"><div><img src="' + esc(logo) + '" alt="' + esc(o.logoAlt || "SCOPO") + '"><h1>' + esc(o.heading) + '</h1><div class="sub">' + esc(o.sub || "") + '</div></div><div class="meta">Gerado em ' + fmt(new Date()) + "/" + new Date().getFullYear() + "<br>por " + esc(me) + "</div></div>" +
        (o.kpis ? '<div class="kpis">' + o.kpis.map(function (k) { return '<div class="kpi"><span>' + esc(k[0]) + "</span><b>" + k[1] + "</b></div>"; }).join("") + "</div>" : "") +
        o.body() + '<div class="foot">SCOPO · Fluxo do Time · ' + esc(o.titulo) + "</div></body></html>";
      w.document.open(); w.document.write(html); w.document.close();
      var done = false, fin = function () { if (!done) { done = true; setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 300); } };
      var imgs = w.document.images, pend = imgs.length;
      if (!pend) setTimeout(fin, 600);
      Array.prototype.forEach.call(imgs, function (im) { if (im.complete) { if (--pend <= 0) fin(); } else { im.onload = im.onerror = function () { if (--pend <= 0) fin(); }; } });
      setTimeout(fin, 5000);
    });
  }
  function imgsHTML(list, max) { return (list || []).filter(function (a) { return a._u; }).slice(0, max || 4).map(function (a) { return '<img src="' + esc(a._u) + '" alt="">'; }).join(""); }
  function soImagens(list, max) { return (list || []).filter(function (a) { return fileKind(a) === "img"; }).slice(0, max || 4); }

  /* ================================================================
     EVENTOS (profissionais, treinamento, endomarketing) · só admins
     ================================================================ */
  var EVO_ST = [["planejamento", "Planejamento"], ["confirmado", "Confirmado"], ["realizado", "Realizado"], ["cancelado", "Cancelado"]];
  var evoF = { ano: new Date().getFullYear(), status: "", tipo: "" };
  function evoTotais(e) {
    var est = 0, real = 0;
    (e.custos || []).forEach(function (c) { est += (Number(c.qtd) || 0) * (Number(c.unit) || 0); real += Number(c.real) || 0; });
    var captado = (e.cooperada && e.cooperada.tem ? Number(e.cooperada.valor) || 0 : 0) + (e.patrocinios || []).reduce(function (t, p) { return t + (Number(p.valor) || 0); }, 0);
    var base = real || est, pessoas = Number(e.presentes) || Number(e.confirmados) || Number(e.publico) || 0;
    return { est: est, real: real, captado: captado, liquido: base - captado, porPessoa: pessoas ? (base - captado) / pessoas : null, pessoas: pessoas };
  }
  function renderEventosOrg() {
    var el = $("#v-eventosorg"), L = listas();
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var anos = {}; anos[new Date().getFullYear()] = 1; S.eventos_org.forEach(function (e) { if (e.data) anos[e.data.slice(0, 4)] = 1; });
    var list = S.eventos_org.filter(function (e) { return (!evoF.ano || (e.data || "").slice(0, 4) === String(evoF.ano)) && (!evoF.status || e.status === evoF.status) && (!evoF.tipo || e.tipo === evoF.tipo); })
      .sort(function (a, b) { return (a.data || "9999").localeCompare(b.data || "9999"); });
    var tot = { est: 0, real: 0, cap: 0 }; list.forEach(function (e) { var t = evoTotais(e); tot.est += t.est; tot.real += t.real; tot.cap += t.captado; });
    var t0 = iso(today());
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Eventos</div><h2>Eventos de profissionais, treinamento e endomarketing</h2><p class="muted">Estime os custos antes, registre o que foi gasto e o que foi captado depois, e gere o resumo em PDF.</p></div><button class="btn" id="evoNew">+ Novo evento <span class="arrow">→</span></button></div>' +
      '<div class="row"><select id="evoA" style="width:auto">' + Object.keys(anos).sort().map(function (a) { return "<option" + (String(evoF.ano) === a ? " selected" : "") + ">" + a + "</option>"; }).join("") + '<option value=""' + (!evoF.ano ? " selected" : "") + ">Todos os anos</option></select>" +
      '<select id="evoS" style="width:auto"><option value="">Todos os status</option>' + EVO_ST.map(function (s) { return '<option value="' + s[0] + '"' + (evoF.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select>" +
      '<select id="evoT" style="width:auto"><option value="">Todos os tipos</option>' + L.tiposEventoOrg.map(function (t) { return "<option" + (t === evoF.tipo ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>" +
      '<div class="vtiles"><div class="vtile"><span>Eventos</span><b>' + list.length + '</b></div><div class="vtile"><span>Custo estimado</span><b>' + brl(tot.est) + '</b></div><div class="vtile"><span>Custo realizado</span><b>' + brl(tot.real) + '</b></div><div class="vtile"><span>Cooperada + patrocínio</span><b>' + brl(tot.cap) + "</b></div></div>" +
      (list.length ? '<div class="evo-grid">' + list.map(function (e) {
        var t = evoTotais(e), d = parse(e.data), passado = e.data && e.data < t0;
        return '<button class="evo-card" data-evo="' + esc(e.id) + '"><div class="evo-top"><span class="evo-date">' + (d ? "<b>" + pad(d.getDate()) + "</b>" + MONTHS[d.getMonth()].slice(0, 3) : "<b>—</b>sem data") + '</span><span class="pill-st st-' + esc(e.status || "planejamento") + '">' + esc(stLabel(EVO_ST, e.status || "planejamento")) + "</span></div>" +
          "<b class=\"evo-name\">" + esc(e.nome || "Evento") + '</b><span class="hint">' + esc([e.tipo, e.local].filter(Boolean).join(" · ")) + "</span>" +
          '<div class="evo-nums"><span>Estimado <b>' + brl(t.est) + "</b></span><span>Real <b>" + (t.real ? brl(t.real) : "—") + "</b></span>" + (t.captado ? "<span>Captado <b>" + brl(t.captado) + "</b></span>" : "") + "</div>" +
          (passado && e.status !== "realizado" && e.status !== "cancelado" ? '<span class="hint late-txt">Já passou: registre o pós-evento</span>' : "") + "</button>";
      }).join("") + "</div>" : '<div class="empty">Nenhum evento neste filtro.</div>');
    $("#evoNew").onclick = function () { openEventoOrg(null); };
    $("#evoA").onchange = function () { evoF.ano = this.value; renderEventosOrg(); };
    $("#evoS").onchange = function () { evoF.status = this.value; renderEventosOrg(); };
    $("#evoT").onchange = function () { evoF.tipo = this.value; renderEventosOrg(); };
    el.onclick = function (e) { var b = e.target.closest("[data-evo]"); if (b) openEventoOrg(S.eventos_org.find(function (x) { return x.id === b.dataset.evo; })); };
  }
  function openEventoOrg(ev) {
    var L = listas(), isNew = !ev, id = isNew ? Store.uid() : ev.id;
    var d = JSON.parse(JSON.stringify(Object.assign({ nome: "", tipo: L.tiposEventoOrg[0] || "", conta: "Ambas", data: "", horario: "", local: "", publico: "", objetivo: "", status: "planejamento",
      custos: L.itensCustoEvento.slice(0, 3).map(function (n) { return { item: n, qtd: 1, unit: 0, real: 0, fornecedor: "" }; }),
      cooperada: { tem: false, industria: "", valor: 0 }, patrocinios: [], convidados: "", confirmados: "", presentes: "", resumo: "", anexos: [], listaAnexos: [] }, ev || {})));
    function sync() {
      var m = $("#modalRoot .modal"); if (!m) return;
      ["nome", "tipo", "conta", "data", "horario", "local", "publico", "objetivo", "status", "convidados", "confirmados", "presentes", "resumo", "convidadosNomes"].forEach(function (k) { var i = $('[data-ef="' + k + '"]', m); if (i) d[k] = i.value; });
      d.custos = $$("[data-crow]", m).map(function (r) { var g = function (k) { return $('[data-k="' + k + '"]', r).value; }; return { item: g("item").trim(), qtd: Number(String(g("qtd")).replace(",", ".")) || 0, unit: parseBRL(g("unit")), real: parseBRL(g("real")), fornecedor: g("fornecedor").trim() }; });
      d.patrocinios = $$("[data-prow2]", m).map(function (r) { var g = function (k) { return $('[data-k="' + k + '"]', r).value; }; return { empresa: g("empresa").trim(), valor: parseBRL(g("valor")), contrapartida: g("contrapartida").trim() }; });
      d.cooperada = { tem: $("#eCoopTem").checked, industria: $("#eCoopInd").value.trim(), valor: parseBRL($("#eCoopVal").value) };
    }
    function totaisHTML() {
      var t = evoTotais(d);
      return '<div class="vtiles small"><div class="vtile"><span>Estimado</span><b>' + brl(t.est) + '</b></div><div class="vtile"><span>Realizado</span><b>' + (t.real ? brl(t.real) : "—") + '</b></div><div class="vtile"><span>Cooperada + patrocínio</span><b>' + brl(t.captado) + '</b></div><div class="vtile"><span>Custo líquido</span><b>' + brl(t.liquido) + "</b>" + (t.porPessoa != null ? "<small>" + brl(t.porPessoa) + " por pessoa</small>" : "") + "</div></div>";
    }
    function draw() {
      var faltam = L.itensCustoEvento.filter(function (n) { return !d.custos.some(function (c) { return c.item === n; }); });
      var html = '<header><h3>' + (isNew ? "Novo evento" : esc(d.nome || "Evento")) + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
        '<div class="grid2"><div class="field"><label>Nome do evento</label><input type="text" data-ef="nome" value="' + esc(d.nome) + '" placeholder="ex: Encontro de Profissionais AM"></div>' +
        '<div class="field"><label>Tipo</label><select data-ef="tipo">' + opt(L.tiposEventoOrg, d.tipo) + "</select></div>" +
        '<div class="field"><label>Conta</label><select data-ef="conta">' + opt(L.contas, d.conta) + "</select></div>" +
        '<div class="field"><label>Status</label><select data-ef="status">' + EVO_ST.map(function (s) { return '<option value="' + s[0] + '"' + (d.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>Data</label><input type="date" data-ef="data" value="' + esc(d.data) + '"></div>' +
        '<div class="field"><label>Horário</label><input type="text" data-ef="horario" value="' + esc(d.horario) + '" placeholder="19h às 22h"></div>' +
        '<div class="field"><label>Local</label><input type="text" data-ef="local" value="' + esc(d.local) + '"></div>' +
        '<div class="field"><label>Público estimado</label><input type="number" min="0" data-ef="publico" value="' + esc(d.publico) + '"></div></div>' +
        '<div class="field"><label>Objetivo</label><textarea data-ef="objetivo" style="min-height:50px" placeholder="O que o evento precisa entregar">' + esc(d.objetivo) + "</textarea></div>" +
        '<div class="field"><div class="section-title"><label>Estimativa de custos</label><span class="row"><button type="button" class="btn ghost small" id="evFornNew">+ Novo fornecedor</button><button class="btn ghost small" data-add="custo">+ Item</button></span></div>' +
        '<div class="tbl-wrap"><table class="tbl ev-costs"><thead><tr><th>Item</th><th class="r">Qtd</th><th class="r">Valor unit.</th><th class="r">Estimado</th><th class="r">Real (depois)</th><th>Fornecedor</th><th></th></tr></thead><tbody>' +
        d.custos.map(function (c, i) { return '<tr data-crow="' + i + '"><td><input type="text" data-k="item" list="evItens" value="' + esc(c.item) + '"></td><td class="r"><input type="text" inputmode="decimal" data-k="qtd" class="num-in" value="' + esc(c.qtd) + '"></td><td class="r"><input type="text" inputmode="decimal" data-k="unit" class="money" value="' + (c.unit ? numBR(c.unit) : "") + '" placeholder="0,00"></td><td class="r num">' + brl((Number(c.qtd) || 0) * (Number(c.unit) || 0)) + '</td><td class="r"><input type="text" inputmode="decimal" data-k="real" class="money" value="' + (c.real ? numBR(c.real) : "") + '" placeholder="0,00"></td><td><input type="text" data-k="fornecedor" list="evForn" value="' + esc(c.fornecedor) + '"></td><td><button class="x" data-del="custo" data-i="' + i + '">✕</button></td></tr>'; }).join("") +
        '</tbody></table></div>' + fornList("evForn") + '<datalist id="evItens">' + L.itensCustoEvento.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + "</datalist>" +
        (faltam.length ? '<div class="chips" style="margin-top:6px"><span class="hint" style="align-self:center">Adicionar rápido:</span>' + faltam.map(function (n) { return '<button type="button" data-quick="' + esc(n) + '">+ ' + esc(n) + "</button>"; }).join("") + "</div>" : "") + "</div>" +
        '<div class="field"><label>Verba cooperada e patrocínio</label>' +
        '<div class="coop-row"><label class="ct"><input type="checkbox" id="eCoopTem"' + (d.cooperada.tem ? " checked" : "") + '> tem verba cooperada</label><input type="text" id="eCoopInd" placeholder="Indústria" value="' + esc(d.cooperada.industria) + '"><input type="text" inputmode="decimal" id="eCoopVal" class="money" placeholder="Valor" value="' + (d.cooperada.valor ? numBR(d.cooperada.valor) : "") + '"></div>' +
        '<div class="section-title" style="margin-top:8px"><span class="hint">Empresas patrocinadoras</span><button class="btn ghost small" data-add="patro">+ Patrocinador</button></div>' +
        d.patrocinios.map(function (p, i) { return '<div class="pair-row patro" data-prow2="' + i + '"><input type="text" data-k="empresa" value="' + esc(p.empresa) + '" placeholder="Empresa"><input type="text" inputmode="decimal" data-k="valor" class="money" value="' + (p.valor ? numBR(p.valor) : "") + '" placeholder="Valor"><input type="text" data-k="contrapartida" value="' + esc(p.contrapartida) + '" placeholder="Contrapartida (logo no telão, estande…)"><button class="x" data-del="patro" data-i="' + i + '">✕</button></div>'; }).join("") + "</div>" +
        '<div id="evTot">' + totaisHTML() + "</div>" +
        '<div class="evo-post"><div class="lbl">Depois do evento</div>' +
        '<div class="grid2"><div class="field"><label>Convidados</label><input type="number" min="0" data-ef="convidados" value="' + esc(d.convidados) + '"></div><div class="field"><label>Confirmados</label><input type="number" min="0" data-ef="confirmados" value="' + esc(d.confirmados) + '"></div><div class="field"><label>Presentes</label><input type="number" min="0" data-ef="presentes" value="' + esc(d.presentes) + '"></div></div>' +
        '<div class="field"><label>Resumo e resultados</label><textarea data-ef="resumo" style="min-height:80px" placeholder="Como foi, destaques, o que melhorar, resultado comercial">' + esc(d.resumo) + "</textarea></div>" +
        '<div class="field"><label>Nomes dos convidados (opcional, um por linha)</label><textarea data-ef="convidadosNomes" style="min-height:70px" placeholder="Cole aqui a lista, se quiser que ela saia no PDF">' + esc(d.convidadosNomes || "") + "</textarea></div>" +
        '<div class="field" id="evLista"></div><div class="field" id="evFotos"></div></div>' +
        '</div><footer><span class="row">' + (isNew ? "" : '<span id="evoDelW"><button class="btn ghost small" id="evoDel">Excluir</button></span><button class="btn ghost small" id="evoVerba">Levar custos reais para a Verba</button><button class="btn ghost small" id="evoPdf">Resumo em PDF</button>') + '</span><button class="btn" id="evoSave">Salvar <span class="arrow">→</span></button></footer>';
      if ($("#mb")) $("#modalRoot .modal").innerHTML = html; else openModal(html, { wide: true });
      var m = $("#modalRoot .modal");
      attachBlock($("#evLista"), { titulo: "Lista de convidados (planilha, PDF ou Word)", lista: d.listaAnexos || [], pasta: "eventos/" + id, accept: ".xlsx,.xls,.csv,.pdf,.docx,.doc", podeEditar: true, dropTarget: m, onChange: function (l) { d.listaAnexos = l; } });
      attachBlock($("#evFotos"), { titulo: "Fotos e materiais do evento", lista: d.anexos || [], pasta: "eventos/" + id, accept: "image/*,video/*,.pdf", podeEditar: true, onChange: function (l) { d.anexos = l; } });
      $("[data-close]", m).onclick = closeModal;
      $("#evFornNew").onclick = function () { fornRapido("", function () { sync(); draw(); }); };
      $$("[data-add]", m).forEach(function (b) { b.onclick = function () { sync(); if (b.dataset.add === "custo") d.custos.push({ item: "", qtd: 1, unit: 0, real: 0, fornecedor: "" }); else d.patrocinios.push({ empresa: "", valor: 0, contrapartida: "" }); draw(); }; });
      $$("[data-del]", m).forEach(function (b) { b.onclick = function () { sync(); (b.dataset.del === "custo" ? d.custos : d.patrocinios).splice(+b.dataset.i, 1); draw(); }; });
      $$("[data-quick]", m).forEach(function (b) { b.onclick = function () { sync(); d.custos.push({ item: b.dataset.quick, qtd: 1, unit: 0, real: 0, fornecedor: "" }); draw(); }; });
      m.oninput = function (e) { if (e.target.closest(".ev-costs,.coop-row,[data-prow2],.evo-post,[data-ef='publico']")) { sync(); $("#evTot").innerHTML = totaisHTML(); $$("[data-crow]", m).forEach(function (r, i) { r.children[3].textContent = brl((d.custos[i].qtd || 0) * (d.custos[i].unit || 0)); }); } };
      var save = function (then) {
        sync(); if (!d.nome.trim()) { toast("Dê um nome ao evento"); return; }
        var doc = Object.assign({}, d); doc.atualizadoEm = new Date().toISOString(); doc.criadoPor = d.criadoPor || me;
        Store.set("eventos_org", id, doc).then(function () { isNew = false; if (then) then(doc); else toast("Evento salvo"); }, fail);
      };
      $("#evoSave").onclick = function () { save(); closeModal(); };
      if ($("#evoPdf")) $("#evoPdf").onclick = function () { save(function (doc) { relatorioEvento(Object.assign({ id: id }, doc)); }); };
      if ($("#evoVerba")) $("#evoVerba").onclick = function () {
        sync(); var itens = d.custos.filter(function (c) { return c.real > 0 && !c.lancado; });
        if (!itens.length && !(d.cooperada.tem && d.cooperada.valor && !d.cooperada.lancado)) { toast("Nada novo para lançar: preencha a coluna Real."); return; }
        var comp = (d.data || iso(today())).slice(0, 7), jobs = [];
        itens.forEach(function (c) { c.lancado = true; jobs.push(Store.add("nfs", { fornecedor: c.fornecedor || c.item, descricao: d.nome + " · " + c.item, categoria: L.categoriasVerba.indexOf("Eventos") >= 0 ? "Eventos" : L.categoriasVerba[0], conta: d.conta, valor: c.real, competencia: comp, emissao: "", vencimento: "", numero: "", pagamento: "", status: "aguardando", contrato: "", obs: "Evento: " + d.nome, anexos: [], criadoEm: new Date().toISOString(), criadoPor: me })); });
        if (d.cooperada.tem && d.cooperada.valor && !d.cooperada.lancado) { d.cooperada.lancado = true; jobs.push(Store.add("cooperada", { fornecedor: d.cooperada.industria || "Indústria", conta: d.conta, valor: d.cooperada.valor, recebido: 0, competencia: comp, prazo: "", status: "acordado", acao: "Evento: " + d.nome, obs: "", anexos: [], criadoPor: me })); }
        Promise.all(jobs).then(function () { save(function () { toast(jobs.length + " lançamento" + (jobs.length > 1 ? "s" : "") + " criado" + (jobs.length > 1 ? "s" : "") + " em Verba e NFs"); draw(); }); }, fail);
      };
      if ($("#evoDel")) $("#evoDel").onclick = function () { delConfirm("#evoDelW", "Excluir o evento?", function () { (d.anexos || []).concat(d.listaAnexos || []).forEach(function (a) { Store.removeFile(a); }); Store.del("eventos_org", id).catch(fail); closeModal(); }); };
    }
    draw();
  }
  function relatorioEvento(e) {
    var t = evoTotais(e), dt = parse(e.data);
    var fotos = soImagens(e.anexos, 8);
    var nomes = String(e.convidadosNomes || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    abrirRelatorio({
      titulo: "Evento · " + (e.nome || ""), heading: e.nome || "Evento",
      sub: [e.tipo, dt ? DOW_LONG[dt.getDay()] + ", " + fmt(dt) + "/" + dt.getFullYear() : "", e.horario, e.local, e.conta].filter(Boolean).join(" · "),
      imagens: fotos,
      kpis: [["Custo estimado", brl(t.est)], ["Custo realizado", t.real ? brl(t.real) : "—"], ["Cooperada + patrocínio", brl(t.captado)], ["Custo líquido", brl(t.liquido) + (t.porPessoa != null ? '<div class="muted" style="font-size:10px">' + brl(t.porPessoa) + " por pessoa</div>" : "")]],
      body: function () {
        return '<div class="box"><h3>Status: <span class="pill p-' + esc(e.status) + '">' + esc(stLabel(EVO_ST, e.status)) + "</span></h3>" + (e.objetivo ? '<div class="txt">' + esc(e.objetivo) + "</div>" : "") +
          '<div class="muted">Público estimado: ' + (e.publico || "—") + " · Convidados: " + (e.convidados || "—") + " · Confirmados: " + (e.confirmados || "—") + " · Presentes: " + (e.presentes || "—") + "</div></div>" +
          '<h2 class="sec">Custos</h2><table><thead><tr><th>Item</th><th>Fornecedor</th><th class="r">Qtd</th><th class="r">Unitário</th><th class="r">Estimado</th><th class="r">Real</th><th class="r">Diferença</th></tr></thead><tbody>' +
          (e.custos || []).map(function (c) { var es = (c.qtd || 0) * (c.unit || 0), df = c.real ? c.real - es : null; return "<tr><td>" + esc(c.item) + "</td><td>" + esc(c.fornecedor || "") + '</td><td class="r">' + (c.qtd || "") + '</td><td class="r">' + brl(c.unit) + '</td><td class="r">' + brl(es) + '</td><td class="r">' + (c.real ? brl(c.real) : "—") + '</td><td class="r" style="color:' + (df > 0 ? "#9a1c1c" : "#11623a") + '">' + (df == null ? "" : (df > 0 ? "+" : "") + brl(df)) + "</td></tr>"; }).join("") +
          '</tbody><tfoot><tr><td colspan="4">Total</td><td class="r">' + brl(t.est) + '</td><td class="r">' + (t.real ? brl(t.real) : "—") + '</td><td class="r">' + (t.real ? brl(t.real - t.est) : "") + "</td></tr></tfoot></table>" +
          ((e.cooperada && e.cooperada.tem) || (e.patrocinios || []).length ? '<h2 class="sec">Verba cooperada e patrocínio</h2><table><thead><tr><th>Empresa</th><th>Tipo</th><th>Contrapartida</th><th class="r">Valor</th></tr></thead><tbody>' +
            (e.cooperada && e.cooperada.tem ? "<tr><td>" + esc(e.cooperada.industria || "—") + "</td><td>Verba cooperada</td><td></td><td class=\"r\">" + brl(e.cooperada.valor) + "</td></tr>" : "") +
            (e.patrocinios || []).map(function (p) { return "<tr><td>" + esc(p.empresa) + "</td><td>Patrocínio</td><td>" + esc(p.contrapartida || "") + '</td><td class="r">' + brl(p.valor) + "</td></tr>"; }).join("") +
            '</tbody><tfoot><tr><td colspan="3">Total captado</td><td class="r">' + brl(t.captado) + "</td></tr></tfoot></table>" : "") +
          (e.resumo ? '<h2 class="sec">Resumo e resultados</h2><div class="txt">' + esc(e.resumo) + "</div>" : "") +
          (fotos.length ? '<h2 class="sec">Fotos</h2><div class="imgs">' + imgsHTML(fotos, 8) + "</div>" : "") +
          ((e.listaAnexos || []).length ? '<p class="muted" style="margin-top:10px">Lista de convidados anexada no sistema: ' + esc(e.listaAnexos.map(function (a) { return a.nome; }).join(", ")) + "</p>" : "") +
          (nomes.length ? '<h2 class="sec">Convidados</h2><div class="names">' + nomes.map(function (n) { return "<div>" + esc(n) + "</div>"; }).join("") + "</div>" : "");
      }
    });
  }

  /* ================================================================
     CAMPANHAS (planejamento anual) · só admins
     ================================================================ */
  var CA_ST = [["planejada", "Planejada"], ["producao", "Em produção"], ["noar", "No ar"], ["realizada", "Realizada"], ["cancelada", "Cancelada"]];
  var caF = { ano: new Date().getFullYear(), conta: "", modo: LS.get("caModo", "ano"), mes: new Date().getMonth() };
  var caThumbs = {};
  function caMes(c) { return c.mes || (c.inicio || "").slice(0, 7); }
  function campanhasAno(ano) {
    return S.campanhas.filter(function (c) { return String(caMes(c)).slice(0, 4) === String(ano) && (!caF.conta || c.conta === caF.conta || c.conta === "Ambas"); })
      .sort(function (a, b) { return (caMes(a) + (a.inicio || "")).localeCompare(caMes(b) + (b.inicio || "")) || (a.nome || "").localeCompare(b.nome || ""); });
  }
  function caProg(c) { var cl = c.checklist || []; return cl.length ? Math.round(cl.filter(function (x) { return x.ok; }).length / cl.length * 100) : null; }
  function caCardHTML(c, grande) {
    var kv = soImagens(c.kv, 1)[0], p = caProg(c);
    return '<button class="ca-card st-' + esc(c.status || "planejada") + (grande ? " big" : "") + '" data-ca="' + esc(c.id) + '">' +
      (kv ? '<span class="ca-thumb" data-cath="' + esc(c.id) + '"></span>' : "") +
      '<span class="ca-body"><b>' + esc(c.nome) + '</b><span class="ca-meta"><span class="pill-st st-' + esc(c.status || "planejada") + '">' + esc(stLabel(CA_ST, c.status || "planejada")) + "</span>" + (c.conta ? '<span class="tag ' + esc(c.conta) + '">' + esc(c.conta) + "</span>" : "") + "</span>" +
      (grande ? (c.mecanica ? '<span class="hint">' + esc(c.mecanica.slice(0, 160)) + "</span>" : "") + ((c.canais || []).length ? '<span class="hint">' + esc(c.canais.join(" · ")) + "</span>" : "") : "") +
      (p != null ? '<span class="ca-prog"><i style="width:' + p + '%"></i></span>' : "") + "</span></button>";
  }
  function hydrateCaThumbs() {
    $$("[data-cath]").forEach(function (el) {
      var c = S.campanhas.find(function (x) { return x.id === el.dataset.cath; }); var a = c && soImagens(c.kv, 1)[0]; if (!a) return;
      if (caThumbs[a.ref]) { el.style.backgroundImage = "url(\"" + caThumbs[a.ref] + "\")"; return; }
      Store.fileUrl(a).then(function (u) { caThumbs[a.ref] = u; el.style.backgroundImage = "url(\"" + u + "\")"; }).catch(function () {});
    });
  }
  function renderCampanhas() {
    var el = $("#v-campanhas"), L = listas();
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var list = campanhasAno(caF.ano);
    var cnt = function (st) { return list.filter(function (c) { return c.status === st; }).length; };
    var prev = list.reduce(function (t, c) { return t + (Number(c.verbaPrevista) || 0); }, 0), real = list.reduce(function (t, c) { return t + (Number(c.verbaReal) || 0); }, 0);
    var mesAtual = new Date().getFullYear() === Number(caF.ano) ? new Date().getMonth() : -1;
    var body;
    if (caF.modo === "ano") {
      body = '<div class="ca-year">' + MONTHS.map(function (mn, i) {
        var ym = caF.ano + "-" + pad(i + 1), cs = list.filter(function (c) { return caMes(c) === ym; });
        return '<div class="ca-month' + (i === mesAtual ? " now" : "") + '"><header><button class="linkbtn ca-mname" data-mes="' + i + '">' + mn[0].toUpperCase() + mn.slice(1) + '</button><span class="hint">' + (cs.length || "") + '</span><button class="x" data-newin="' + ym + '" title="Nova campanha em ' + mn + '">＋</button></header>' + cs.map(function (c) { return caCardHTML(c, false); }).join("") + "</div>";
      }).join("") + "</div>";
    } else {
      var ym = caF.ano + "-" + pad(caF.mes + 1), cs = list.filter(function (c) { return caMes(c) === ym; });
      body = '<div class="row" style="justify-content:space-between"><div class="seg"><button id="caMP">←</button><button disabled style="min-width:120px">' + MONTHS[caF.mes][0].toUpperCase() + MONTHS[caF.mes].slice(1) + '</button><button id="caMN">→</button></div><div class="row"><button class="btn ghost small" id="caPdfMes">PDF do mês</button><button class="btn small" data-newin="' + ym + '">+ Campanha em ' + MONTHS[caF.mes] + "</button></div></div>" +
        (cs.length ? '<div class="ca-mgrid">' + cs.map(function (c) { return caCardHTML(c, true); }).join("") + "</div>" : '<div class="empty">Nenhuma campanha em ' + MONTHS[caF.mes] + ".</div>");
    }
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Campanhas</div><h2>Planejamento de campanhas ' + esc(caF.ano) + '</h2><p class="muted">O ano inteiro num lugar só: o que está programado, o que está em produção e o que já foi realizado, com KV, checklist e resultado.</p></div>' +
      '<div class="row"><button class="btn ghost" id="caPdfAno">PDF do ano</button><button class="btn" id="caNew">+ Nova campanha <span class="arrow">→</span></button></div></div>' +
      '<div class="row"><div class="seg"><button id="caAP">←</button><button disabled>' + esc(caF.ano) + '</button><button id="caAN">→</button></div>' +
      '<div class="seg"><button data-modo="ano" aria-pressed="' + (caF.modo === "ano") + '">Ano</button><button data-modo="mes" aria-pressed="' + (caF.modo === "mes") + '">Mês</button></div>' +
      '<select id="caC" style="width:auto"><option value="">Todas as contas</option>' + L.contas.filter(function (c) { return c !== "Ambas"; }).map(function (c) { return "<option" + (c === caF.conta ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div>" +
      '<div class="vtiles"><div class="vtile"><span>Campanhas no ano</span><b>' + list.length + '</b></div><div class="vtile"><span>Realizadas</span><b>' + cnt("realizada") + '</b><small>' + cnt("noar") + " no ar agora</small></div><div class=\"vtile\"><span>Programadas</span><b>" + (cnt("planejada") + cnt("producao")) + "</b><small>" + cnt("producao") + ' em produção</small></div><div class="vtile"><span>Verba prevista</span><b>' + brl(prev) + "</b><small>realizada " + brl(real) + "</small></div></div>" +
      body;
    $("#caAP").onclick = function () { caF.ano = Number(caF.ano) - 1; renderCampanhas(); };
    $("#caAN").onclick = function () { caF.ano = Number(caF.ano) + 1; renderCampanhas(); };
    $("#caC").onchange = function () { caF.conta = this.value; renderCampanhas(); };
    $$("[data-modo]", el).forEach(function (b) { b.onclick = function () { caF.modo = b.dataset.modo; LS.set("caModo", caF.modo); renderCampanhas(); }; });
    $("#caNew").onclick = function () { openCampanha(null, caF.modo === "mes" ? caF.ano + "-" + pad(caF.mes + 1) : (mesAtual >= 0 ? caF.ano + "-" + pad(mesAtual + 1) : caF.ano + "-01")); };
    $("#caPdfAno").onclick = function () { relatorioCampanhasAno(caF.ano); };
    if ($("#caPdfMes")) $("#caPdfMes").onclick = function () { relatorioCampanhasMes(caF.ano, caF.mes); };
    if ($("#caMP")) { $("#caMP").onclick = function () { caF.mes = (caF.mes + 11) % 12; if (caF.mes === 11) caF.ano = Number(caF.ano) - 1; renderCampanhas(); }; $("#caMN").onclick = function () { caF.mes = (caF.mes + 1) % 12; if (caF.mes === 0) caF.ano = Number(caF.ano) + 1; renderCampanhas(); }; }
    el.onclick = function (e) {
      var b = e.target.closest("[data-ca]"); if (b) { openCampanha(S.campanhas.find(function (x) { return x.id === b.dataset.ca; })); return; }
      var n = e.target.closest("[data-newin]"); if (n) { openCampanha(null, n.dataset.newin); return; }
      var mm = e.target.closest("[data-mes]"); if (mm) { caF.mes = +mm.dataset.mes; caF.modo = "mes"; LS.set("caModo", "mes"); renderCampanhas(); }
    };
    hydrateCaThumbs();
  }
  function openCampanha(c, ymPadrao) {
    var L = listas(), isNew = !c, id = isNew ? Store.uid() : c.id;
    var d = JSON.parse(JSON.stringify(Object.assign({ nome: "", mes: ymPadrao || iso(today()).slice(0, 7), inicio: "", fim: "", conta: "Ambas", status: "planejada", mecanica: "", oferta: "", canais: [], verbaPrevista: 0, verbaReal: 0, resultado: "",
      checklist: L.checklistCampanha.map(function (t) { return { id: Store.uid(), t: t, ok: false }; }), kv: [], execucao: [] }, c || {})));
    function sync() {
      var m = $("#modalRoot .modal"); if (!m) return;
      ["nome", "mes", "inicio", "fim", "conta", "status", "mecanica", "oferta", "resultado"].forEach(function (k) { var i = $('[data-cf="' + k + '"]', m); if (i) d[k] = i.value; });
      d.verbaPrevista = parseBRL($('[data-cf="verbaPrevista"]', m).value); d.verbaReal = parseBRL($('[data-cf="verbaReal"]', m).value);
    }
    function draw() {
      var ok = d.checklist.filter(function (x) { return x.ok; }).length;
      var html = '<header><h3>' + (isNew ? "Nova campanha" : esc(d.nome || "Campanha")) + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
        '<div class="grid2"><div class="field"><label>Nome da campanha</label><input type="text" data-cf="nome" value="' + esc(d.nome) + '" placeholder="ex: Descontão"></div>' +
        '<div class="field"><label>Mês</label><input type="month" data-cf="mes" value="' + esc(d.mes) + '"></div>' +
        '<div class="field"><label>Início (opcional)</label><input type="date" data-cf="inicio" value="' + esc(d.inicio) + '"></div>' +
        '<div class="field"><label>Fim (opcional)</label><input type="date" data-cf="fim" value="' + esc(d.fim) + '"></div>' +
        '<div class="field"><label>Conta</label><select data-cf="conta">' + opt(L.contas, d.conta) + "</select></div>" +
        '<div class="field"><label>Status</label><select data-cf="status">' + CA_ST.map(function (s) { return '<option value="' + s[0] + '"' + (d.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>Verba prevista (R$)</label><input type="text" inputmode="decimal" data-cf="verbaPrevista" value="' + (d.verbaPrevista ? numBR(d.verbaPrevista) : "") + '" placeholder="0,00"></div>' +
        '<div class="field"><label>Verba realizada (R$)</label><input type="text" inputmode="decimal" data-cf="verbaReal" value="' + (d.verbaReal ? numBR(d.verbaReal) : "") + '" placeholder="0,00"></div></div>' +
        '<div class="field"><label>Mecânica e mensagem</label><textarea data-cf="mecanica" style="min-height:70px" placeholder="Como funciona a campanha, conceito, mensagem principal">' + esc(d.mecanica) + "</textarea></div>" +
        '<div class="field"><label>Oferta e produtos</label><textarea data-cf="oferta" style="min-height:50px" placeholder="Produtos foco, descontos, condições">' + esc(d.oferta) + "</textarea></div>" +
        '<div class="field"><label>Canais</label><div class="chips" id="caCan">' + L.canaisCampanha.map(function (n) { return '<button type="button" data-p="' + esc(n) + '" aria-pressed="' + (d.canais.indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><label>Checklist do que foi feito ' + (d.checklist.length ? ok + "/" + d.checklist.length : "") + "</label>" + (d.checklist.length ? '<div class="progress"><i style="width:' + Math.round(ok / d.checklist.length * 100) + '%"></i></div>' : "") +
          '<ul class="cl">' + d.checklist.map(function (x) { return '<li class="' + (x.ok ? "ok" : "") + '"><button class="check ' + (x.ok ? "on" : "") + '" data-clt="' + esc(x.id) + '"></button><span>' + esc(x.t) + '</span><button class="x" data-cld="' + esc(x.id) + '">✕</button></li>'; }).join("") + "</ul>" +
          '<div class="row"><input type="text" id="caClNew" placeholder="Adicionar item" style="flex:1"><button class="btn ghost small" id="caClAdd">Adicionar</button></div></div>' +
        '<div class="field" id="caKv"></div>' +
        '<div class="field"><label>Resultado</label><textarea data-cf="resultado" style="min-height:60px" placeholder="Vendas, alcance, o que funcionou, o que mudar na próxima">' + esc(d.resultado) + "</textarea></div>" +
        '<div class="field" id="caExec"></div>' +
        '</div><footer><span class="row">' + (isNew ? "" : '<span id="caDelW"><button class="btn ghost small" id="caDel">Excluir</button></span><button class="btn ghost small" id="caDup">Duplicar para outro mês</button>') +
        (d.status !== "realizada" ? '<button class="btn ghost small" id="caDone">Marcar como realizada</button>' : "") + '</span><button class="btn" id="caSave">Salvar <span class="arrow">→</span></button></footer>';
      if ($("#mb")) $("#modalRoot .modal").innerHTML = html; else openModal(html, { wide: true });
      var m = $("#modalRoot .modal");
      attachBlock($("#caKv"), { titulo: "KV e referências", lista: d.kv, pasta: "campanhas/" + id, accept: "image/*,.pdf", podeEditar: true, dropTarget: m, onChange: function (l) { d.kv = l; } });
      attachBlock($("#caExec"), { titulo: "Execução (fotos, peças, prints)", lista: d.execucao, pasta: "campanhas/" + id, accept: "image/*,video/*,.pdf", podeEditar: true, onChange: function (l) { d.execucao = l; } });
      $("[data-close]", m).onclick = closeModal;
      $("#caCan").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var i = d.canais.indexOf(b.dataset.p); if (i >= 0) d.canais.splice(i, 1); else d.canais.push(b.dataset.p); b.setAttribute("aria-pressed", String(i < 0)); };
      $("#caClAdd").onclick = function () { var t = $("#caClNew").value.trim(); if (!t) return; sync(); d.checklist.push({ id: Store.uid(), t: t, ok: false }); draw(); setTimeout(function () { var n = $("#caClNew"); if (n) n.focus(); }, 0); };
      $("#caClNew").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); $("#caClAdd").click(); } };
      $$("[data-clt]", m).forEach(function (b) { b.onclick = function () { sync(); d.checklist.forEach(function (x) { if (x.id === b.dataset.clt) x.ok = !x.ok; }); draw(); }; });
      $$("[data-cld]", m).forEach(function (b) { b.onclick = function () { sync(); d.checklist = d.checklist.filter(function (x) { return x.id !== b.dataset.cld; }); draw(); }; });
      var save = function (msg) {
        sync(); if (!d.nome.trim()) { toast("Dê um nome à campanha"); return false; }
        var doc = Object.assign({}, d); doc.atualizadoEm = new Date().toISOString(); doc.criadoPor = d.criadoPor || me;
        Store.set("campanhas", id, doc).then(function () { toast(msg || "Campanha salva"); }, fail); return true;
      };
      $("#caSave").onclick = function () { if (save()) closeModal(); };
      if ($("#caDone")) $("#caDone").onclick = function () { sync(); d.status = "realizada"; if (save("Campanha marcada como realizada")) closeModal(); };
      if ($("#caDup")) $("#caDup").onclick = function () {
        sync();
        var w = $("#caDup"); w.outerHTML = '<span class="row" id="caDupW"><input type="month" id="caDupM" value="' + esc(d.mes) + '" style="width:auto"><button class="btn small" id="caDupOk">Duplicar</button></span>';
        $("#caDupOk").onclick = function () {
          var ym = $("#caDupM").value; if (!ym) return;
          var copia = JSON.parse(JSON.stringify(d)); copia.mes = ym; copia.inicio = ""; copia.fim = ""; copia.status = "planejada"; copia.verbaReal = 0; copia.resultado = ""; copia.execucao = [];
          copia.checklist = copia.checklist.map(function (x) { return { id: Store.uid(), t: x.t, ok: false }; }); copia.criadoPor = me; copia.atualizadoEm = new Date().toISOString();
          Store.set("campanhas", Store.uid(), copia).then(function () { toast("Campanha duplicada para " + mesLabel(ym)); }, fail); closeModal();
        };
      };
      if ($("#caDel")) $("#caDel").onclick = function () { delConfirm("#caDelW", "Excluir a campanha?", function () { (d.kv || []).concat(d.execucao || []).forEach(function (a) { Store.removeFile(a); }); Store.del("campanhas", id).catch(fail); closeModal(); }); };
    }
    draw();
  }
  function caBlocoPDF(c, imgs) {
    var p = caProg(c);
    return '<div class="box"><h3>' + esc(c.nome) + ' <span class="pill p-' + esc(c.status) + '">' + esc(stLabel(CA_ST, c.status)) + '</span> <span class="muted">' + esc(c.conta || "") + (c.inicio ? " · " + fmt(parse(c.inicio)) + (c.fim ? " a " + fmt(parse(c.fim)) : "") : "") + "</span></h3>" +
      ((c.canais || []).length ? '<div class="tags">' + c.canais.map(function (x) { return "<span>" + esc(x) + "</span>"; }).join("") + "</div>" : "") +
      (c.mecanica ? '<div class="txt">' + esc(c.mecanica) + "</div>" : "") + (c.oferta ? '<div class="muted"><b>Oferta:</b> ' + esc(c.oferta) + "</div>" : "") +
      ((c.verbaPrevista || c.verbaReal) ? '<div class="muted">Verba prevista ' + brl(c.verbaPrevista) + (c.verbaReal ? " · realizada " + brl(c.verbaReal) : "") + "</div>" : "") +
      ((c.checklist || []).length ? '<div class="ck">' + c.checklist.map(function (x) { return '<div class="' + (x.ok ? "ok" : "no") + '">' + (x.ok ? "✔ " : "○ ") + esc(x.t) + "</div>"; }).join("") + '</div><div class="muted">' + p + "% do checklist</div>" : "") +
      (c.resultado ? '<div class="txt"><b>Resultado:</b> ' + esc(c.resultado) + "</div>" : "") +
      (imgs ? '<div class="imgs">' + imgsHTML(soImagens(c.kv, 2).concat(soImagens(c.execucao, 2)), 4) + "</div>" : "") + "</div>";
  }
  function relatorioCampanhasMes(ano, mes) {
    var ym = ano + "-" + pad(mes + 1), cs = campanhasAno(ano).filter(function (c) { return caMes(c) === ym; });
    if (!cs.length) { toast("Nenhuma campanha neste mês."); return; }
    var imgs = []; cs.forEach(function (c) { imgs = imgs.concat(soImagens(c.kv, 2), soImagens(c.execucao, 2)); });
    var prev = cs.reduce(function (t, c) { return t + (Number(c.verbaPrevista) || 0); }, 0);
    abrirRelatorio({ titulo: "Campanhas · " + mesLabel(ym), heading: "Campanhas de " + MONTHS[mes] + " " + ano, sub: (caF.conta || "AM e AG"), imagens: imgs,
      kpis: [["Campanhas", cs.length], ["Realizadas", cs.filter(function (c) { return c.status === "realizada"; }).length], ["No ar / em produção", cs.filter(function (c) { return c.status === "noar" || c.status === "producao"; }).length], ["Verba prevista", brl(prev)]],
      body: function () { return cs.map(function (c) { return caBlocoPDF(c, true); }).join(""); } });
  }
  function relatorioCampanhasAno(ano) {
    var cs = campanhasAno(ano); if (!cs.length) { toast("Nenhuma campanha neste ano."); return; }
    var feitas = cs.filter(function (c) { return c.status === "realizada"; }), prog = cs.filter(function (c) { return ["planejada", "producao", "noar"].indexOf(c.status || "planejada") >= 0; }), canc = cs.filter(function (c) { return c.status === "cancelada"; });
    var imgs = []; feitas.forEach(function (c) { imgs = imgs.concat(soImagens(c.kv, 1)); });
    var prev = cs.reduce(function (t, c) { return t + (Number(c.verbaPrevista) || 0); }, 0), real = cs.reduce(function (t, c) { return t + (Number(c.verbaReal) || 0); }, 0);
    abrirRelatorio({ titulo: "Campanhas " + ano, heading: "Planejamento de campanhas " + ano, sub: (caF.conta || "AM e AG") + " · executadas e programadas", imagens: imgs,
      kpis: [["Campanhas", cs.length], ["Realizadas", feitas.length + (cs.length ? " (" + Math.round(feitas.length / cs.length * 100) + "%)" : "")], ["Programadas", prog.length + (canc.length ? '<div class="muted" style="font-size:10px">' + canc.length + " cancelada(s)</div>" : "")], ["Verba prevista · real", brl(prev) + '<div class="muted" style="font-size:10px">real ' + brl(real) + "</div>"]],
      body: function () {
        return '<h2 class="sec">Visão do ano</h2><div class="months">' + MONTHS.map(function (mn, i) {
          var ms = cs.filter(function (c) { return caMes(c) === ano + "-" + pad(i + 1); });
          return '<div class="month"><b>' + mn[0].toUpperCase() + mn.slice(1) + "</b>" + (ms.length ? ms.map(function (c) { return '<div><span class="pill p-' + esc(c.status) + '">' + esc(stLabel(CA_ST, c.status)) + "</span> " + esc(c.nome) + "</div>"; }).join("") : '<div class="muted">—</div>') + "</div>";
        }).join("") + "</div>" +
        (feitas.length ? '<h2 class="sec pb">Campanhas executadas</h2>' + feitas.map(function (c) { return caBlocoPDF(c, true); }).join("") : "") +
        (prog.length ? '<h2 class="sec pb">Campanhas programadas</h2>' + prog.map(function (c) { return caBlocoPDF(c, false); }).join("") : "");
      } });
  }

  /* ================================================================
     REUNIÕES (diretoria, estratégico) e DOCUMENTOS · só admins
     ================================================================ */
  var RI_ST = [["pendente", "Pendente"], ["andamento", "Em andamento"], ["feito", "Feito"], ["naofeito", "Não vai ser feito"]];
  var reF = { sub: LS.get("reSub", "reunioes"), tipo: "", q: "", cat: "" };
  function riAberto(i) { return i.status !== "feito" && i.status !== "naofeito"; }
  function reuTipos() { var L = listas(); var t = L.reunioes.slice(); ["Diretoria", "Estratégico (Liu)"].forEach(function (x) { if (t.indexOf(x) < 0) t.unshift(x); }); return t; }
  function reunioesOrd() { return S.reunioes_dir.slice().sort(function (a, b) { return ((b.data || "") + (b.hora || "")).localeCompare((a.data || "") + (a.hora || "")); }); }
  function anteriorDe(tipo, antesDe, exceto) { return reunioesOrd().find(function (r) { return r.tipo === tipo && r.id !== exceto && (!antesDe || (r.data || "") <= antesDe); }); }
  function renderReunioes() {
    var el = $("#v-reunioes");
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var head = '<div class="view-head"><div><div class="eyebrow">Reuniões</div><h2>Diretoria, estratégico e documentos</h2><p class="muted">Abra a reunião anterior, veja o que foi feito e o que ficou, e monte a próxima pauta. Os documentos que o estratégico manda ficam guardados aqui.</p></div>' +
      '<div class="row">' + (reF.sub === "reunioes" ? '<button class="btn" id="reNew">+ Nova reunião <span class="arrow">→</span></button>' : '<button class="btn" id="docNew">+ Documento <span class="arrow">→</span></button>') + "</div></div>" +
      '<div class="seg"><button data-resub="reunioes" aria-pressed="' + (reF.sub === "reunioes") + '">Reuniões</button><button data-resub="documentos" aria-pressed="' + (reF.sub === "documentos") + '">Documentos</button></div>';
    var body = reF.sub === "documentos" ? docsHTML() : reunioesHTML();
    el.innerHTML = head + body;
    $$("[data-resub]", el).forEach(function (b) { b.onclick = function () { reF.sub = b.dataset.resub; LS.set("reSub", reF.sub); renderReunioes(); }; });
    if ($("#reNew")) $("#reNew").onclick = function () { novaReuniao(); };
    if ($("#docNew")) $("#docNew").onclick = function () { openDocumento(null); };
    if ($("#reT")) $("#reT").onchange = function () { reF.tipo = this.value; renderReunioes(); };
    if ($("#docQ")) $("#docQ").oninput = function () { reF.q = this.value; clearTimeout(renderReunioes._t); renderReunioes._t = setTimeout(function () { renderReunioes(); var i = $("#docQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
    if ($("#docC")) $("#docC").onchange = function () { reF.cat = this.value; renderReunioes(); };
    el.onclick = function (e) {
      var b = e.target.closest("[data-reu]"); if (b) { openReuniao(S.reunioes_dir.find(function (x) { return x.id === b.dataset.reu; })); return; }
      var st = e.target.closest("[data-pst]");
      if (st) { var r = S.reunioes_dir.find(function (x) { return x.id === st.dataset.pst; }); var o = RI_ST.map(function (x) { return x[0]; }); var itens = (r.pauta || []).map(function (i) { return i.id === st.dataset.item ? Object.assign({}, i, { status: o[(o.indexOf(i.status || "pendente") + 1) % o.length] }) : i; }); Store.upd("reunioes_dir", r.id, { pauta: itens }).catch(fail); return; }
      var d = e.target.closest("[data-doc]"); if (d) { openDocumento(S.documentos.find(function (x) { return x.id === d.dataset.doc; })); return; }
      var a = e.target.closest("[data-abrir]"); if (a) { var src = S.documentos.concat(S.reunioes_dir).find(function (x) { return x.id === a.dataset.abrir; }); var an = src && (src.anexos || [])[+a.dataset.i]; if (an) lightbox(an); }
    };
  }
  function reunioesHTML() {
    var list = reunioesOrd().filter(function (r) { return !reF.tipo || r.tipo === reF.tipo; });
    var abertos = [];
    list.forEach(function (r) { (r.pauta || []).forEach(function (i) { if (riAberto(i) && !i.levadoPara) abertos.push({ r: r, i: i }); }); });
    var t0 = iso(today());
    return '<div class="row"><select id="reT" style="width:auto"><option value="">Todas as reuniões</option>' + reuTipos().map(function (t) { return "<option" + (t === reF.tipo ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select></div>" +
      '<div class="re-cols"><div><div class="lbl" style="margin-bottom:8px">Reuniões</div>' +
      (list.length ? '<div class="re-list">' + list.map(function (r) {
        var p = r.pauta || [], feitos = p.filter(function (i) { return i.status === "feito"; }).length, ab = p.filter(function (i) { return riAberto(i) && !i.levadoPara; }).length, passou = p.filter(function (i) { return i.levadoPara; }).length, dt = parse(r.data);
        return '<button class="re-item" data-reu="' + esc(r.id) + '"><span class="vi-date"><b>' + (dt ? fmt(dt) : "—") + "</b>" + (dt ? DOW[dt.getDay()] : "") + '</span><span class="vi-main"><b>' + esc(r.titulo || r.tipo || "Reunião") + '</b><span class="hint">' + esc(r.tipo || "") + (r.participantes && r.participantes.length ? " · " + esc(r.participantes.join(", ")) : "") + "</span>" +
          (p.length ? '<span class="ca-prog"><i style="width:' + Math.round(feitos / p.length * 100) + '%"></i></span>' : "") + '</span><span class="re-count">' + (p.length ? feitos + "/" + p.length + " feitos" : "sem pauta") + (ab ? '<br><span class="late-txt">' + ab + " em aberto</span>" : "") + (passou ? "<br>" + passou + " passaram adiante" : "") + ((r.anexos || []).length ? "<br>⧉ " + r.anexos.length : "") + "</span></button>";
      }).join("") + "</div>" : '<div class="empty">Nenhuma reunião registrada ainda.</div>') + "</div>" +
      '<div><div class="lbl" style="margin-bottom:8px">Pendências em aberto · ' + abertos.length + "</div>" +
      (abertos.length ? '<div class="re-open">' + abertos.map(function (x) {
        var pz = x.i.prazo, late = pz && pz < t0;
        return '<div class="re-oi"><div><b>' + esc(x.i.texto) + '</b><div class="hint">' + esc(x.r.tipo || "") + " de " + (x.r.data ? fmt(parse(x.r.data)) : "—") + (x.i.resp ? " · " + esc(x.i.resp) : "") + (pz ? ' · <span class="' + (late ? "late-txt" : "") + '">prazo ' + fmt(parse(pz)) + "</span>" : "") + '</div></div><button class="st ri-' + esc(x.i.status || "pendente") + '" data-pst="' + esc(x.r.id) + '" data-item="' + esc(x.i.id) + '">' + esc(stLabel(RI_ST, x.i.status || "pendente")) + "</button></div>";
      }).join("") + "</div>" : '<div class="empty">Nada em aberto. Tudo que foi combinado está resolvido.</div>') + "</div></div>";
  }
  function docsHTML() {
    var L = listas(), q = reF.q.toLowerCase();
    var docs = S.documentos.filter(function (d) { return (!reF.cat || d.categoria === reF.cat) && (!q || ((d.titulo || "") + " " + (d.descricao || "") + " " + (d.origem || "")).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return (b.data || "").localeCompare(a.data || ""); });
    var deReu = [];
    S.reunioes_dir.forEach(function (r) { (r.anexos || []).forEach(function (a, i) { if (!q || (a.nome || "").toLowerCase().indexOf(q) >= 0) deReu.push({ r: r, a: a, i: i }); }); });
    var icon = function (a) { return '<span class="doc-ico">' + esc(fileKind(a).slice(0, 4)) + "</span>"; };
    return '<div class="row"><input type="text" id="docQ" placeholder="Buscar documento" value="' + esc(reF.q) + '" style="max-width:300px"><select id="docC" style="width:auto"><option value="">Todas as categorias</option>' + L.categoriasDoc.map(function (c) { return "<option" + (c === reF.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select></div>" +
      (docs.length ? '<div class="cf-grid">' + docs.map(function (d) {
        return '<article class="cf-card"><header><div><b>' + esc(d.titulo) + '</b><div class="hint">' + esc([d.categoria, d.origem, d.data ? fmt(parse(d.data)) + "/" + d.data.slice(0, 4) : ""].filter(Boolean).join(" · ")) + '</div></div><button class="icon-btn" data-doc="' + esc(d.id) + '">Editar</button></header>' +
          (d.descricao ? '<p class="hint cf-obs">' + esc(d.descricao) + "</p>" : "") +
          ((d.anexos || []).length ? '<div class="doc-files">' + d.anexos.map(function (a, i) { return '<button class="doc-file" data-abrir="' + esc(d.id) + '" data-i="' + i + '">' + icon(a) + '<span>' + esc(a.nome) + '</span><span class="hint">' + fileSize(a.tamanho) + "</span></button>"; }).join("") + "</div>" : '<p class="hint">Sem arquivo anexado.</p>') + "</article>";
      }).join("") + "</div>" : '<div class="empty">' + (S.documentos.length ? "Nada com esse filtro." : "Nenhum documento ainda. Guarde aqui o manual do vendedor, o plano da marca exclusiva e o que mais o estratégico mandar.") + "</div>") +
      (deReu.length ? '<div class="group"><h3>Anexados nas reuniões <small>' + deReu.length + '</small></h3><div class="doc-files">' + deReu.map(function (x) { return '<button class="doc-file" data-abrir="' + esc(x.r.id) + '" data-i="' + x.i + '">' + icon(x.a) + "<span>" + esc(x.a.nome) + '</span><span class="hint">' + esc(x.r.tipo || "") + " " + (x.r.data ? fmt(parse(x.r.data)) : "") + "</span></button>"; }).join("") + "</div></div>" : "");
  }
  function novaReuniao() {
    var tipos = reuTipos();
    openModal('<header><h3>Nova reunião</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Reunião</label><select id="nrT">' + opt(tipos, reF.tipo || tipos[0]) + '</select></div><div class="field"><label>Data</label><input type="date" id="nrD" value="' + iso(today()) + '"></div></div>' +
      '<p class="hint" id="nrInfo"></p><label class="ct"><input type="checkbox" id="nrCarry" checked> trazer as pendências em aberto da reunião anterior</label></div>' +
      '<footer><span></span><button class="btn" id="nrGo">Criar e abrir <span class="arrow">→</span></button></footer>');
    var info = function () {
      var ant = anteriorDe($("#nrT").value, $("#nrD").value), ab = ant ? (ant.pauta || []).filter(function (i) { return riAberto(i) && !i.levadoPara; }).length : 0;
      $("#nrInfo").textContent = ant ? "Reunião anterior: " + fmt(parse(ant.data)) + " · " + (ant.pauta || []).length + " itens, " + ab + " em aberto." : "Primeira reunião deste tipo.";
      $("#nrCarry").disabled = !ab; $("#nrCarry").checked = !!ab;
    };
    $("#nrT").onchange = info; $("#nrD").onchange = info; info();
    $("[data-close]").onclick = closeModal;
    $("#nrGo").onclick = function () {
      var tipo = $("#nrT").value, data = $("#nrD").value || iso(today()), id = Store.uid(), ant = anteriorDe(tipo, data), pauta = [];
      var jobs = [];
      if ($("#nrCarry").checked && ant) {
        var ntrazidos = (ant.pauta || []).filter(function (i) { return riAberto(i) && !i.levadoPara; });
        pauta = ntrazidos.map(function (i) { return { id: Store.uid(), texto: i.texto, resp: i.resp || "", prazo: i.prazo || "", status: i.status === "andamento" ? "andamento" : "pendente", obs: i.obs || "", origem: ant.id, origemData: ant.data }; });
        if (ntrazidos.length) jobs.push(Store.upd("reunioes_dir", ant.id, { pauta: (ant.pauta || []).map(function (i) { return riAberto(i) && !i.levadoPara ? Object.assign({}, i, { levadoPara: id }) : i; }) }));
      }
      var doc = { titulo: tipo + " · " + fmt(parse(data)), tipo: tipo, data: data, hora: "", local: "", participantes: [], pauta: pauta, definicoes: "", anexos: [], status: "agendada", criadoPor: me, criadoEm: new Date().toISOString() };
      jobs.push(Store.set("reunioes_dir", id, doc));
      Promise.all(jobs).then(function () { closeModal(); setTimeout(function () { openReuniao(Object.assign({ id: id }, doc)); }, 50); }, fail);
    };
  }
  function openReuniao(r) {
    if (!r) return;
    var id = r.id, d = JSON.parse(JSON.stringify(r)), L = listas();
    d.pauta = d.pauta || []; d.participantes = d.participantes || []; d.anexos = d.anexos || [];
    var partOpt = nomes().concat(["Diretoria", "Liu"]).filter(function (x, i, a) { return a.indexOf(x) === i; });
    d.participantes.forEach(function (p) { if (partOpt.indexOf(p) < 0) partOpt.push(p); });
    function sync() {
      var m = $("#modalRoot .modal"); if (!m) return;
      ["titulo", "data", "hora", "local", "definicoes", "status"].forEach(function (k) { var i = $('[data-rf="' + k + '"]', m); if (i) d[k] = i.value; });
      $$("[data-ri]", m).forEach(function (row) { var it = d.pauta.find(function (x) { return x.id === row.dataset.ri; }); if (!it) return; it.texto = $('[data-k="texto"]', row).value; it.resp = $('[data-k="resp"]', row).value; it.prazo = $('[data-k="prazo"]', row).value; it.obs = $('[data-k="obs"]', row).value; });
    }
    function save(msg, close) { sync(); Store.set("reunioes_dir", id, Object.assign({}, d, { atualizadoEm: new Date().toISOString() })).then(function () { if (msg) toast(msg); }, fail); if (close) closeModal(); }
    function draw() {
      var ant = anteriorDe(d.tipo, d.data, id);
      var feitos = d.pauta.filter(function (i) { return i.status === "feito"; }).length;
      var html = '<header><div style="flex:1;min-width:0"><input class="title" data-rf="titulo" value="' + esc(d.titulo || "") + '" style="width:100%"><p class="hint" style="padding-left:6px">' + esc(d.tipo || "") + (ant ? ' · <button class="linkbtn" id="reAnt">abrir a anterior (' + fmt(parse(ant.data)) + ")</button>" : "") + '</p></div><button class="x" data-close>✕</button></header><div class="body">' +
        '<div class="grid2"><div class="field"><label>Data</label><input type="date" data-rf="data" value="' + esc(d.data || "") + '"></div><div class="field"><label>Horário</label><input type="text" data-rf="hora" value="' + esc(d.hora || "") + '" placeholder="09:00"></div><div class="field"><label>Local</label><input type="text" data-rf="local" value="' + esc(d.local || "") + '"></div><div class="field"><label>Situação</label><select data-rf="status"><option value="agendada"' + (d.status !== "realizada" ? " selected" : "") + '>Agendada</option><option value="realizada"' + (d.status === "realizada" ? " selected" : "") + ">Realizada</option></select></div></div>" +
        '<div class="field"><label>Participantes</label><div class="chips" id="rePart">' + partOpt.map(function (n) { return '<button type="button" data-p="' + esc(n) + '" aria-pressed="' + (d.participantes.indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><div class="section-title"><label>Pauta · ' + feitos + "/" + d.pauta.length + ' feitos</label><button class="btn ghost small" id="riAdd">+ Item</button></div>' +
        (d.pauta.length ? '<div class="progress"><i style="width:' + Math.round(feitos / d.pauta.length * 100) + '%"></i></div>' : "") +
        '<div class="ri-list">' + (d.pauta.length ? d.pauta.map(function (i) {
          return '<div class="ri-row' + (i.status === "feito" ? " done" : "") + '" data-ri="' + esc(i.id) + '"><div class="ri-main"><input type="text" data-k="texto" value="' + esc(i.texto) + '" placeholder="Assunto ou tarefa">' +
            (i.origemData ? '<span class="tag">da reunião de ' + fmt(parse(i.origemData)) + "</span>" : "") + (i.levadoPara ? '<span class="tag">passou para a próxima</span>' : "") + (i.pautaViva ? '<span class="tag solid">na Pauta viva</span>' : "") + (i.cartao ? '<span class="tag solid">no quadro</span>' : "") + "</div>" +
            '<div class="ri-meta"><select data-k="resp"><option value="">Responsável</option>' + partOpt.concat(nomes()).filter(function (x, k, a) { return a.indexOf(x) === k; }).map(function (n) { return "<option" + (n === i.resp ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + '</select><input type="date" data-k="prazo" value="' + esc(i.prazo || "") + '">' +
            '<div class="seg ri-st">' + RI_ST.map(function (s) { return '<button type="button" data-ist="' + s[0] + '" aria-pressed="' + ((i.status || "pendente") === s[0]) + '">' + s[1] + "</button>"; }).join("") + "</div>" +
            '<button class="icon-btn" data-ipv title="Criar na Pauta viva">→ pauta viva</button><span class="ri-q"><button class="icon-btn" data-iq title="Criar cartão num quadro">→ quadro</button></span><button class="x" data-idel>✕</button></div>' +
            '<input type="text" data-k="obs" class="ri-obs" value="' + esc(i.obs || "") + '" placeholder="Observação / o que foi decidido sobre este item"></div>';
        }).join("") : '<p class="hint">Sem itens ainda. Adicione os assuntos que vão ser tratados.</p>') + "</div></div>" +
        '<div class="field"><label>O que foi definido</label><textarea data-rf="definicoes" style="min-height:110px" placeholder="Decisões da reunião, direcionamentos da diretoria, próximos passos">' + esc(d.definicoes || "") + "</textarea></div>" +
        '<div class="field" id="reAtt"></div>' +
        '</div><footer><span class="row"><span id="reDelW"><button class="btn ghost small" id="reDel">Excluir</button></span><button class="btn ghost small" id="rePdf">Ata em PDF</button></span><button class="btn" id="reSave">Salvar <span class="arrow">→</span></button></footer>';
      if ($("#mb")) $("#modalRoot .modal").innerHTML = html; else openModal(html, { wide: true });
      var m = $("#modalRoot .modal");
      attachBlock($("#reAtt"), { titulo: "Documentos da reunião (Word, PDF, apresentações, planilhas)", lista: d.anexos, pasta: "reunioes/" + id, accept: ".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,image/*", podeEditar: true, dropTarget: m, onChange: function (l) { d.anexos = l; save(); } });
      $("[data-close]", m).onclick = function () { save(); closeModal(); };
      $("#rePart").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var k = d.participantes.indexOf(b.dataset.p); if (k >= 0) d.participantes.splice(k, 1); else d.participantes.push(b.dataset.p); b.setAttribute("aria-pressed", String(k < 0)); };
      $("#riAdd").onclick = function () { sync(); d.pauta.push({ id: Store.uid(), texto: "", resp: "", prazo: "", status: "pendente", obs: "" }); draw(); var rows = $$("[data-ri] [data-k=texto]"); if (rows.length) rows[rows.length - 1].focus(); };
      m.onclick = function (e) {
        var row = e.target.closest("[data-ri]"); if (!row) return;
        var it = d.pauta.find(function (x) { return x.id === row.dataset.ri; }); if (!it) return;
        var b = e.target.closest("[data-ist]"); if (b) { sync(); it.status = b.dataset.ist; draw(); return; }
        if (e.target.closest("[data-idel]")) { sync(); d.pauta = d.pauta.filter(function (x) { return x !== it; }); draw(); return; }
        if (e.target.closest("[data-iq]")) {
          sync(); if (!it.texto.trim()) { toast("Escreva o item primeiro"); return; }
          var qs = S.quadros.slice().sort(byOrder); if (!qs.length) { toast("Nenhum quadro criado ainda"); return; }
          var wrap = e.target.closest(".ri-q");
          wrap.innerHTML = '<select data-qsel style="width:auto">' + qs.map(function (q) { return '<option value="' + esc(q.id) + '">' + esc(q.nome) + "</option>"; }).join("") + '</select><button class="btn small" data-qok>Criar</button>';
          return;
        }
        if (e.target.closest("[data-qok]")) {
          var q = S.quadros.find(function (x) { return x.id === $("[data-qsel]", row).value; }); if (!q || !(q.colunas || []).length) return;
          var col = q.colunas[0].id;
          Store.add("cartoes", { quadro: q.id, coluna: col, ordem: nextOrder(q.id, col), titulo: it.texto, desc: "Da reunião " + (d.titulo || "") + (it.obs ? "\n\n" + it.obs : "") + (d.definicoes ? "\n\nDefinições: " + d.definicoes : ""), conta: "Ambas", resp: it.resp && nomes().indexOf(it.resp) >= 0 ? [it.resp] : [me], prazo: it.prazo || "", etiquetas: [], checklist: [], comentarios: [], criadoEm: new Date().toISOString(), criadoPor: me })
            .then(function (cid) { it.cartao = cid; save("Cartão criado em " + q.nome); draw(); }, fail);
          return;
        }
        if (e.target.closest("[data-ipv]")) {
          sync(); if (!it.texto.trim()) { toast("Escreva o item primeiro"); return; }
          Store.add("pauta", { titulo: it.texto, conta: "Ambas", resp: it.resp && nomes().indexOf(it.resp) >= 0 ? it.resp : me, reuniao: L.reunioes.indexOf(d.tipo) >= 0 ? d.tipo : "", area: "Diretoria", prazo: it.prazo || "", status: "aberto", notas: "Da reunião " + (d.titulo || "") + (it.obs ? ". " + it.obs : ""), criadoEm: new Date().toISOString(), criadoPor: me })
            .then(function () { it.pautaViva = true; save("Criado na Pauta viva"); draw(); }, fail);
        }
      };
      $("#reSave").onclick = function () { save("Reunião salva", true); };
      $("#rePdf").onclick = function () { save(); ataPDF(Object.assign({ id: id }, d)); };
      if ($("#reAnt")) $("#reAnt").onclick = function () { save(); var ant = anteriorDe(d.tipo, d.data, id); closeModal(); setTimeout(function () { openReuniao(ant); }, 50); };
      $("#reDel").onclick = function () { delConfirm("#reDelW", "Excluir a reunião?", function () { d.anexos.forEach(function (a) { Store.removeFile(a); }); Store.del("reunioes_dir", id).catch(fail); closeModal(); }); };
    }
    draw();
  }
  function ataPDF(r) {
    var p = r.pauta || [], dt = parse(r.data);
    var cls = { pendente: "planejada", andamento: "producao", feito: "realizada", naofeito: "cancelada" };
    abrirRelatorio({ titulo: "Ata · " + (r.titulo || ""), heading: r.titulo || "Reunião", sub: [r.tipo, dt ? DOW_LONG[dt.getDay()] + ", " + fmt(dt) + "/" + dt.getFullYear() : "", r.hora, r.local].filter(Boolean).join(" · "),
      kpis: [["Itens na pauta", p.length], ["Feitos", p.filter(function (i) { return i.status === "feito"; }).length], ["Em aberto", p.filter(riAberto).length], ["Participantes", (r.participantes || []).length]],
      body: function () {
        return ((r.participantes || []).length ? '<div class="box"><b>Participantes:</b> ' + esc(r.participantes.join(", ")) + "</div>" : "") +
          '<h2 class="sec">Pauta</h2><table><thead><tr><th>#</th><th>Assunto</th><th>Responsável</th><th>Prazo</th><th>Situação</th></tr></thead><tbody>' +
          (p.length ? p.map(function (i, k) { return "<tr><td>" + (k + 1) + "</td><td><b>" + esc(i.texto) + "</b>" + (i.obs ? '<div class="muted">' + esc(i.obs) + "</div>" : "") + (i.origemData ? '<div class="muted">vem da reunião de ' + fmt(parse(i.origemData)) + "</div>" : "") + "</td><td>" + esc(i.resp || "—") + "</td><td>" + (i.prazo ? fmt(parse(i.prazo)) : "—") + '</td><td><span class="pill p-' + cls[i.status || "pendente"] + '">' + esc(stLabel(RI_ST, i.status || "pendente")) + "</span></td></tr>"; }).join("") : '<tr><td colspan="5" class="muted">Sem itens.</td></tr>') + "</tbody></table>" +
          (r.definicoes ? '<h2 class="sec">O que foi definido</h2><div class="txt">' + esc(r.definicoes) + "</div>" : "") +
          ((r.anexos || []).length ? '<h2 class="sec">Documentos da reunião</h2><div class="tags">' + r.anexos.map(function (a) { return "<span>" + esc(a.nome) + "</span>"; }).join("") + "</div>" : "");
      } });
  }
  function openDocumento(doc) {
    var L = listas(), isNew = !doc, id = isNew ? Store.uid() : doc.id;
    var d = Object.assign({ titulo: "", categoria: L.categoriasDoc[0] || "", origem: "Liu", data: iso(today()), descricao: "", anexos: [] }, doc || {});
    var anexos = (d.anexos || []).slice();
    openModal('<header><h3>' + (isNew ? "Novo documento" : "Documento") + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Nome</label><input type="text" id="dcT" value="' + esc(d.titulo) + '" placeholder="ex: Manual do vendedor" autofocus></div>' +
      '<div class="field"><label>Categoria</label><select id="dcC">' + opt(L.categoriasDoc, d.categoria) + "</select></div>" +
      '<div class="field"><label>Quem enviou</label><input type="text" id="dcO" value="' + esc(d.origem) + '" list="dcOl"><datalist id="dcOl">' + ["Liu", "Diretoria"].concat(nomes()).map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + "</datalist></div>" +
      '<div class="field"><label>Data</label><input type="date" id="dcD" value="' + esc(d.data) + '"></div></div>' +
      '<div class="field"><label>Do que se trata</label><textarea id="dcDs" style="min-height:70px" placeholder="Resumo, versão, o que muda">' + esc(d.descricao) + "</textarea></div>" +
      '<div class="field" id="dcAtt"></div></div>' +
      "<footer>" + (isNew ? "<span></span>" : '<span id="dcDelW"><button class="btn ghost small" id="dcDel">Excluir</button></span>') + '<button class="btn" id="dcSave">Salvar <span class="arrow">→</span></button></footer>', { wide: true });
    attachBlock($("#dcAtt"), { titulo: "Arquivos (Word, PDF, apresentação, planilha)", lista: anexos, pasta: "documentos/" + id, accept: ".pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,image/*", podeEditar: true, dropTarget: $("#modalRoot .modal"), onChange: function (l) { anexos = l; if (!isNew) Store.upd("documentos", id, { anexos: l }).catch(fail); } });
    $("[data-close]").onclick = closeModal;
    $("#dcSave").onclick = function () {
      var t = $("#dcT").value.trim(); if (!t) { $("#dcT").focus(); return; }
      Store.set("documentos", id, { titulo: t, categoria: $("#dcC").value, origem: $("#dcO").value.trim(), data: $("#dcD").value, descricao: $("#dcDs").value.trim(), anexos: anexos, criadoPor: d.criadoPor || me, atualizadoEm: new Date().toISOString() }).then(function () { toast("Documento salvo"); }, fail);
      closeModal();
    };
    if ($("#dcDel")) $("#dcDel").onclick = function () { delConfirm("#dcDelW", "Excluir o documento e os arquivos?", function () { anexos.forEach(function (a) { Store.removeFile(a); }); Store.del("documentos", id).catch(fail); closeModal(); }); };
  }

  /* ================================================================
     TABLOIDE · estúdio de tabloide dentro do Fluxo (pasta tabloide/)
     ================================================================ */
  function renderTabloide() {
    var el = $("#v-tabloide");
    if ($("#tbFrame", el)) return; // não recarrega o estúdio a cada atualização da base
    el.innerHTML = '<div class="tb-head"><div><div class="eyebrow">Tabloide</div><b>Estúdio de tabloide</b><span class="hint"> · monte o A3, as artes de redes e as peças. Use <b>Salvar no Fluxo</b> para o time abrir de qualquer computador.</span></div>' +
      '<a class="btn ghost small" href="tabloide/" target="_blank" rel="noopener">Abrir em tela cheia ↗</a></div>' +
      '<iframe id="tbFrame" class="tb-frame" src="tabloide/" title="Estúdio de tabloide"></iframe>';
  }

  /* ================================================================
     FORNECEDORES · cadastro único usado em Verba, Mídia e Eventos (só admins)
     ================================================================ */
  var fnF = { q: "", cat: "" };
  function fornCad() { return S.fornecedores.slice().sort(function (a, b) { return (a.nome || "").localeCompare(b.nome || "", "pt-BR"); }); }
  function fornPorNome(n) { n = String(n || "").trim().toLowerCase(); if (!n) return null; return S.fornecedores.find(function (f) { return (f.nome || "").trim().toLowerCase() === n; }) || null; }
  function fornUso(nome) {
    var n = String(nome || "").trim().toLowerCase(), eq = function (x) { return String(x || "").trim().toLowerCase() === n; };
    var nfs = S.nfs.filter(function (x) { return eq(x.fornecedor); });
    var mid = S.midias.filter(function (x) { return eq(x.veiculo); });
    var ctr = S.contratos.filter(function (x) { return eq(x.fornecedor); });
    var evs = []; S.eventos_org.forEach(function (e) { (e.custos || []).forEach(function (c) { if (eq(c.fornecedor)) evs.push({ e: e, c: c }); }); });
    var ano = String(new Date().getFullYear());
    var gastoAno = nfs.filter(function (x) { return (x.competencia || "").slice(0, 4) === ano; }).reduce(function (t, x) { return t + (Number(x.valor) || 0); }, 0);
    return { nfs: nfs, mid: mid, ctr: ctr, evs: evs, gastoAno: gastoAno };
  }
  // liga um campo de fornecedor ao cadastro: lista de sugestões + "cadastrar" + preenchimento automático
  function fornHook(input, onPick) {
    if (!input || input.dataset.fornHook) return; input.dataset.fornHook = "1";
    var box = document.createElement("span"); box.className = "forn-hint"; input.insertAdjacentElement("afterend", box);
    var upd = function () {
      var f = fornPorNome(input.value);
      var h = f ? '<span class="ok-txt">✓ cadastrado' + (f.categoria ? " · " + esc(f.categoria) : "") + "</span>" : (input.value.trim() ? '<button type="button" class="linkbtn">+ cadastrar “' + esc(input.value.trim().slice(0, 40)) + '” nos fornecedores</button>' : '<button type="button" class="linkbtn">+ novo fornecedor</button>');
      if (box._h === h) return; box._h = h; box.innerHTML = h;
      var b = $("button", box); if (b) b.onclick = function () { fornRapido(input.value.trim(), function (nf) { input.value = nf.nome; input.dispatchEvent(new Event("input", { bubbles: true })); upd(); if (onPick) onPick(nf); }); };
    };
    input.addEventListener("input", upd);
    input.addEventListener("change", function () { upd(); var f = fornPorNome(input.value); if (f && onPick) onPick(f); });
    upd();
  }
  // cadastro rápido por cima do que estiver aberto (não fecha a janela atual)
  function fornRapido(nome, then) {
    var old = $("#fornPop"); if (old) old.remove();
    var L = listas(), p = document.createElement("div"); p.id = "fornPop"; p.className = "forn-pop";
    p.innerHTML = '<div class="forn-card" role="dialog" aria-modal="true"><div class="section-title"><h3>Novo fornecedor</h3><button class="x" data-fx aria-label="Fechar">✕</button></div>' +
      '<div class="grid2"><div class="field"><label>Nome</label><input type="text" id="frN" value="' + esc(nome || "") + '"></div>' +
      '<div class="field"><label>Categoria</label><select id="frC">' + opt(L.categoriasFornecedor, "", "—") + "</select></div>" +
      '<div class="field"><label>CNPJ</label><input type="text" id="frJ" placeholder="00.000.000/0000-00"></div>' +
      '<div class="field"><label>Contato</label><input type="text" id="frK" placeholder="nome"></div>' +
      '<div class="field"><label>Telefone / WhatsApp</label><input type="text" id="frT"></div>' +
      '<div class="field"><label>Email</label><input type="text" id="frE"></div></div>' +
      '<p class="hint">Os outros dados (PIX, banco, contrato) você completa depois na aba Fornecedores.</p>' +
      '<div class="row" style="justify-content:flex-end"><button class="btn ghost small" data-fx>Cancelar</button><button class="btn small" id="frOk">Cadastrar</button></div></div>';
    document.body.appendChild(p);
    var fechar = function () { p.remove(); };
    $$("[data-fx]", p).forEach(function (b) { b.onclick = fechar; });
    p.addEventListener("mousedown", function (e) { if (e.target === p) fechar(); });
    p.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); fechar(); } });
    $("#frN").focus();
    $("#frOk").onclick = function () {
      var n = $("#frN").value.trim(); if (!n) { $("#frN").focus(); return; }
      if (fornPorNome(n)) { toast("Já existe um fornecedor com esse nome"); fechar(); if (then) then(fornPorNome(n)); return; }
      var doc = { nome: n, categoria: $("#frC").value, cnpj: $("#frJ").value.trim(), contato: $("#frK").value.trim(), telefone: $("#frT").value.trim(), email: $("#frE").value.trim(), razao: "", cidade: "", pix: "", banco: "", obs: "", anexos: [], ativo: true, criadoEm: new Date().toISOString(), criadoPor: me };
      Store.add("fornecedores", doc).then(function (id) { toast("Fornecedor cadastrado"); fechar(); if (then) then(Object.assign({ id: id }, doc)); }, fail);
    };
  }

  function renderFornecedores() {
    var el = $("#v-fornecedores"), L = listas();
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var q = fnF.q.trim().toLowerCase();
    var list = fornCad().filter(function (f) { return (!fnF.cat || f.categoria === fnF.cat) && (!q || [f.nome, f.razao, f.cnpj, f.contato, f.cidade, f.categoria].join(" ").toLowerCase().indexOf(q) >= 0); });
    var cad = {}; S.fornecedores.forEach(function (f) { cad[(f.nome || "").trim().toLowerCase()] = 1; });
    var soltos = {}; S.nfs.concat(S.contratos, S.cooperada).forEach(function (x) { if (x.fornecedor && !cad[x.fornecedor.trim().toLowerCase()]) soltos[x.fornecedor.trim()] = 1; }); S.midias.forEach(function (m) { if (m.veiculo && !cad[m.veiculo.trim().toLowerCase()]) soltos[m.veiculo.trim()] = 1; });
    var nSoltos = Object.keys(soltos).length;
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Fornecedores</div><h2>Cadastro de fornecedores</h2><p class="muted">Um cadastro só para Verba e NFs, Mídia e Eventos. Na ficha de cada um aparece o histórico: notas, veiculações, contratos e custos de eventos.</p></div>' +
      '<div class="row"><button class="btn" id="fnNew">+ Fornecedor <span class="arrow">→</span></button></div></div>' +
      (nSoltos ? '<div class="banner warn fn-soltos"><span>' + nSoltos + " nome" + (nSoltos > 1 ? "s" : "") + " usado" + (nSoltos > 1 ? "s" : "") + ' em lançamentos, contratos ou mídia ainda sem cadastro.</span><button class="btn small" id="fnImp">Cadastrar todos de uma vez</button></div>' : "") +
      '<div class="row"><input type="search" id="fnQ" placeholder="Buscar por nome, CNPJ, contato, cidade" value="' + esc(fnF.q) + '" style="max-width:360px">' +
      '<select id="fnC" style="width:auto"><option value="">Todas as categorias</option>' + L.categoriasFornecedor.map(function (c) { return "<option" + (c === fnF.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
      '<span class="hint">' + list.length + " de " + S.fornecedores.length + "</span></div>" +
      (list.length ? '<div class="tbl-wrap"><table class="tbl fn-tbl"><thead><tr><th>Fornecedor</th><th>Categoria</th><th>Contato</th><th>CNPJ</th><th class="r">Gasto em ' + new Date().getFullYear() + '</th><th class="r">Uso</th></tr></thead><tbody>' +
        list.map(function (f) { var u = fornUso(f.nome); return '<tr data-fn="' + esc(f.id) + '" class="' + (f.ativo === false ? "off" : "") + '"><td><b>' + esc(f.nome) + "</b>" + (f.razao ? '<div class="hint">' + esc(f.razao) + "</div>" : "") + "</td><td>" + (f.categoria ? '<span class="tag">' + esc(f.categoria) + "</span>" : "—") + "</td><td>" + esc([f.contato, f.telefone].filter(Boolean).join(" · ") || "—") + (f.email ? '<div class="hint">' + esc(f.email) + "</div>" : "") + '</td><td class="num">' + esc(f.cnpj || "—") + '</td><td class="r num"><b>' + (u.gastoAno ? brl(u.gastoAno) : "—") + '</b></td><td class="r hint">' + [u.nfs.length ? u.nfs.length + " NF" : "", u.mid.length ? u.mid.length + " mídia" : "", u.ctr.length ? u.ctr.length + " contrato" : "", u.evs.length ? u.evs.length + " evento" : ""].filter(Boolean).join(" · ") + "</td></tr>"; }).join("") +
        "</tbody></table></div>" : '<div class="empty">' + (S.fornecedores.length ? "Nenhum fornecedor com esse filtro." : "Nenhum fornecedor cadastrado ainda.") + "</div>");
    $("#fnNew").onclick = function () { openFornecedor(null); };
    $("#fnQ").oninput = function () { fnF.q = this.value; clearTimeout(renderFornecedores._t); renderFornecedores._t = setTimeout(function () { renderFornecedores(); var i = $("#fnQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); };
    $("#fnC").onchange = function () { fnF.cat = this.value; renderFornecedores(); };
    if ($("#fnImp")) $("#fnImp").onclick = function () {
      var nomes = Object.keys(soltos);
      nomes.reduce(function (pr, n) {
        var m = S.midias.find(function (x) { return (x.veiculo || "").trim() === n; });
        var cat = m ? ({ "Rádio": "Rádio", "TV": "TV", "Digital": "Digital", "Outdoor": "Outdoor e OOH", "Painel de LED": "Outdoor e OOH", "Carro de som": "Outdoor e OOH" }[m.tipo] || "") : "";
        return pr.then(function () { return Store.add("fornecedores", { nome: n, categoria: cat, cnpj: m ? m.cnpjVeiculo || "" : "", contato: m ? m.contato || "" : "", telefone: "", email: "", razao: "", cidade: m ? m.praca || "" : "", pix: "", banco: "", obs: "", anexos: [], ativo: true, criadoEm: new Date().toISOString(), criadoPor: me }); });
      }, Promise.resolve()).then(function () { toast(nomes.length + " fornecedor" + (nomes.length > 1 ? "es" : "") + " cadastrado" + (nomes.length > 1 ? "s" : "")); }, fail);
    };
    el.onclick = function (e) { var r = e.target.closest("tr[data-fn]"); if (r) openFornecedor(S.fornecedores.find(function (x) { return x.id === r.dataset.fn; })); };
  }

  function openFornecedor(fv) {
    var L = listas(), isNew = !fv, id = isNew ? Store.uid() : fv.id;
    var d = Object.assign({ nome: "", razao: "", cnpj: "", categoria: "", contato: "", telefone: "", email: "", cidade: "", pix: "", banco: "", obs: "", anexos: [], ativo: true }, fv || {});
    var anexos = (d.anexos || []).slice(), u = isNew ? null : fornUso(d.nome);
    var cats = L.categoriasFornecedor.slice(); if (d.categoria && cats.indexOf(d.categoria) < 0) cats.push(d.categoria);
    var hist = "";
    if (u) {
      var nfs = u.nfs.slice().sort(function (a, b) { return (b.competencia || "").localeCompare(a.competencia || ""); });
      hist = '<div class="md-block"><div class="lbl">Histórico</div>' +
        '<div class="vtiles small"><div class="vtile"><span>Gasto em ' + new Date().getFullYear() + "</span><b>" + brl(u.gastoAno) + '</b></div><div class="vtile"><span>Notas</span><b>' + u.nfs.length + '</b></div><div class="vtile"><span>Veiculações</span><b>' + u.mid.length + '</b></div><div class="vtile"><span>Contratos</span><b>' + u.ctr.length + "</b></div></div>" +
        (nfs.length ? '<div class="tbl-wrap"><table class="tbl fn-h"><thead><tr><th>Mês</th><th>Descrição</th><th>Conta</th><th class="r">Valor</th><th>Status</th></tr></thead><tbody>' + nfs.slice(0, 12).map(function (n) { return "<tr><td>" + esc(n.competencia ? mesCurto(n.competencia) : "—") + "</td><td>" + esc(n.descricao || n.categoria || "") + "</td><td>" + esc(n.conta || "") + '</td><td class="r num">' + brl(n.valor) + "</td><td>" + esc(stLabel(NF_ST, n.status)) + "</td></tr>"; }).join("") + "</tbody></table></div>" + (nfs.length > 12 ? '<p class="hint">Mostrando as 12 mais recentes.</p>' : "") : "") +
        (u.mid.length ? '<div class="hint">Mídia: ' + u.mid.map(function (m) { return "PI " + esc(m.numero || "—") + " (" + esc(midPeriodo(m)) + ")"; }).join(" · ") + "</div>" : "") +
        (u.ctr.length ? '<div class="hint">Contratos: ' + u.ctr.map(function (c) { return esc(c.objeto || c.categoria || "contrato") + " · " + brl(c.valor); }).join(" · ") + "</div>" : "") +
        (u.evs.length ? '<div class="hint">Eventos: ' + u.evs.map(function (x) { return esc(x.e.nome || "evento") + " · " + esc(x.c.item); }).join(" · ") + "</div>" : "") +
        (!nfs.length && !u.mid.length && !u.ctr.length && !u.evs.length ? '<p class="hint">Ainda não aparece em lançamentos, mídia, contratos ou eventos.</p>' : "") + "</div>";
    }
    var m = openModal('<header><div><div class="eyebrow">Fornecedor</div><h3>' + (isNew ? "Novo fornecedor" : esc(d.nome)) + '</h3></div><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Nome (como aparece nos lançamentos)</label><input type="text" id="fnN" value="' + esc(d.nome) + '" autofocus></div>' +
      '<div class="field"><label>Razão social</label><input type="text" id="fnR" value="' + esc(d.razao) + '"></div>' +
      '<div class="field"><label>CNPJ / CPF</label><input type="text" id="fnJ" value="' + esc(d.cnpj) + '"></div>' +
      '<div class="field"><label>Categoria</label><select id="fnCat">' + opt(cats, d.categoria, "—") + "</select></div>" +
      '<div class="field"><label>Contato</label><input type="text" id="fnK" value="' + esc(d.contato) + '"></div>' +
      '<div class="field"><label>Telefone / WhatsApp</label><input type="text" id="fnT" value="' + esc(d.telefone) + '"></div>' +
      '<div class="field"><label>Email</label><input type="text" id="fnE" value="' + esc(d.email) + '"></div>' +
      '<div class="field"><label>Cidade / UF</label><input type="text" id="fnCi" value="' + esc(d.cidade) + '"></div>' +
      '<div class="field"><label>Endereço</label><input type="text" id="fnEnd" value="' + esc(d.endereco || "") + '"></div>' +
      '<div class="field"><label>Inscrição estadual</label><input type="text" id="fnIE" value="' + esc(d.inscricao || "") + '"></div>' +
      '<div class="field"><label>Chave PIX</label><input type="text" id="fnP" value="' + esc(d.pix) + '"></div>' +
      '<div class="field"><label>Banco, agência e conta</label><input type="text" id="fnB" value="' + esc(d.banco) + '"></div></div>' +
      '<div class="field"><label>Observações</label><textarea id="fnO" style="min-height:60px" placeholder="Prazo de pagamento, o que costuma fornecer, avaliação">' + esc(d.obs) + "</textarea></div>" +
      '<label class="ind-checks"><input type="checkbox" id="fnA"' + (d.ativo !== false ? " checked" : "") + "> Fornecedor ativo</label>" +
      '<div class="field" id="fnAtt"></div>' + hist + "</div>" +
      '<footer><span class="row">' + (isNew ? "" : '<span id="fnDelW"><button class="btn ghost small" id="fnDel">Excluir</button></span>') + '</span><button class="btn" id="fnSave">Salvar <span class="arrow">→</span></button></footer>', { wide: true });
    attachBlock($("#fnAtt"), { titulo: "Contrato, proposta, cartão CNPJ, tabela de preços", lista: anexos, pasta: "verba/fornecedores/" + id, accept: ".pdf,.docx,.doc,.xlsx,.xls,.csv,image/*", podeEditar: true, dropTarget: m, onChange: function (l) { anexos = l; if (!isNew) Store.upd("fornecedores", id, { anexos: l }).catch(fail); } });
    $("[data-close]", m).onclick = closeModal;
    $("#fnSave").onclick = function () {
      var n = $("#fnN").value.trim(); if (!n) { $("#fnN").focus(); return; }
      var dup = fornPorNome(n); if (dup && dup.id !== id) { toast("Já existe um fornecedor com esse nome"); return; }
      var doc = { nome: n, razao: $("#fnR").value.trim(), cnpj: $("#fnJ").value.trim(), categoria: $("#fnCat").value, contato: $("#fnK").value.trim(), telefone: $("#fnT").value.trim(), email: $("#fnE").value.trim(), cidade: $("#fnCi").value.trim(), endereco: $("#fnEnd").value.trim(), inscricao: $("#fnIE").value.trim(), pix: $("#fnP").value.trim(), banco: $("#fnB").value.trim(), obs: $("#fnO").value.trim(), anexos: anexos, ativo: $("#fnA").checked, criadoEm: d.criadoEm || new Date().toISOString(), criadoPor: d.criadoPor || me, atualizadoEm: new Date().toISOString() };
      var antigo = d.nome, n2 = 0;
      Store.set("fornecedores", id, doc).then(function () {
        if (!isNew && antigo && antigo !== n) { // renomeou: atualiza onde o nome antigo aparece
          ["nfs", "contratos", "cooperada"].forEach(function (col) { S[col].forEach(function (x) { if (x.fornecedor === antigo) { Store.upd(col, x.id, { fornecedor: n }).catch(fail); n2++; } }); });
          S.midias.forEach(function (x) { if (x.veiculo === antigo) { Store.upd("midias", x.id, { veiculo: n }).catch(fail); n2++; } });
          S.eventos_org.forEach(function (e) { if ((e.custos || []).some(function (c) { return c.fornecedor === antigo; })) { Store.upd("eventos_org", e.id, { custos: e.custos.map(function (c) { return c.fornecedor === antigo ? Object.assign({}, c, { fornecedor: n }) : c; }) }).catch(fail); n2++; } });
        }
        toast("Fornecedor salvo" + (n2 ? " · nome atualizado em " + n2 + " registro" + (n2 > 1 ? "s" : "") : ""));
      }, fail);
      closeModal();
    };
    if ($("#fnDel")) $("#fnDel").onclick = function () { delConfirm("#fnDelW", "Excluir o cadastro? (lançamentos ficam)", function () { anexos.forEach(function (a) { Store.removeFile(a); }); Store.del("fornecedores", id).catch(fail); closeModal(); }); };
  }

  /* ================================================================
     MÍDIA · PI no modelo da planilha (grade de inserções por dia), empresas com logo,
     dados do veículo e do cliente, e-mails da NF, observações prontas, Verba (só admins)
     ================================================================ */
  var MID_ST = [["previsto", "Previsto"], ["negociando", "Negociando"], ["aprovado", "Aprovado"], ["pi", "PI enviado"], ["noar", "No ar"], ["comprovado", "Comprovado"], ["cancelado", "Cancelado"]];
  var MID_CAT = { "Rádio": "Mídia · rádio", "TV": "Mídia · TV", "Outdoor": "Mídia · outdoor e OOH", "Painel de LED": "Mídia · outdoor e OOH", "Carro de som": "Mídia · outdoor e OOH", "Digital": "Mídia digital · anúncios", "Jornal e revista": "Mídia · jornal e revista" };
  var MID_QTD = { "Outdoor": 1, "Digital": 1, "Jornal e revista": 1 }; // tipos que costumam ir por quantidade (placas, peças), não por dia
  var MID_FMT = { "Rádio": ['15"', '30"', '60"'], "TV": ['15"', '30"', '60"', '120"'], "Outdoor": ["PLACAS", "Bonificadas"], "Painel de LED": ['15"', '30"'], "Carro de som": ["HORAS"], "Digital": ["Feed", "Stories", "Reels"], "Jornal e revista": ["1/4 pág.", "1/2 pág.", "Página"] };
  var DOW1 = ["D", "S", "T", "Q", "Q", "S", "S"];
  var OBS_PADRAO = [
    "VENCIMENTO PADRÃO: 15 DIAS FORA O MÊS (OU SEJA, SEMPRE PARA O DIA 15 DO MÊS SEGUINTE).",
    "NOTA FISCAL + DADOS DE PAGAMENTO devem ser DIRECIONADAS AOS SETORES: MARKETING e FATURAMENTO.",
    "Emitir a NF NO MOMENTO DA CONTRATAÇÃO.",
    "Encaminhar a NF para o e-mail do marketing.",
    "ATENÇÃO: Notas fiscais emitidas fora do prazo solicitado podem ter a data de vencimento alterada."
  ];
  var midF = { mes: iso(today()).slice(0, 7), tipo: "", conta: "", status: "" };

  /* ---------- empresas (anunciantes) e modelos de observação ---------- */
  function midDados() {
    var c = S.config.find(function (x) { return x.id === "midiaDados"; }) || {};
    var emp = c.empresas;
    if (!emp) { // converte o formato antigo (AM/AG soltos) para a lista de empresas
      emp = ["AM", "AG"].map(function (k) { var x = c[k] || {}; return { id: k, nome: k, razao: x.razao || "", logo: x.logo || "", cor: x.corDestaque || (k === "AM" ? "#FFD400" : "#B69CFF"), corTexto: "#111111", contato: x.contato || "", emails: x.email ? [x.email] : [], vencDia: 15,
        filiais: x.razao || x.cnpj ? [{ id: "f1", nome: "Principal", razao: x.razao || "", endereco: [x.endereco, x.cidade].filter(Boolean).join(" - "), cnpj: x.cnpj || "", ie: "" }] : [], assinatura: { mostrar: false, nome: x.contato || "", cargo: "Marketing" } }; });
    }
    var modelos = c.modelosObs || OBS_PADRAO.map(function (t, i) { return { id: "o" + i, texto: t, padrao: true }; });
    return { empresas: emp, modelosObs: modelos, raw: c };
  }
  function midEmpresa(id) { var dd = midDados(); return dd.empresas.find(function (e) { return e.id === id; }) || dd.empresas[0] || { id: "", nome: "", filiais: [], emails: [] }; }
  function salvarMidDados(dd) { var doc = Object.assign({}, dd.raw || {}, { empresas: dd.empresas, modelosObs: dd.modelosObs, v: 2 }); delete doc.id; return Store.set("config", "midiaDados", doc); }

  /* ---------- cálculo ---------- */
  function midLinhas(m) {
    if (m.linhas) return m.linhas;
    return (m.itens || []).map(function (i) { return { programa: i.desc || "", formato: i.dur || "", modo: "qtd", det: [i.det, i.dias].filter(Boolean).join(" · "), qtd: Number(i.qtd) || 0, unit: Number(i.unit) || 0, dias: {} }; });
  }
  function linhaIns(l) { if (l.modo === "qtd") return Number(l.qtd) || 0; var t = 0; Object.keys(l.dias || {}).forEach(function (k) { t += Number(l.dias[k]) || 0; }); return t; }
  function midTot(m) {
    var ls = midLinhas(m), bruto = 0, ins = 0;
    ls.forEach(function (l) { var n = linhaIns(l); ins += n; bruto += n * (Number(l.unit) || 0); });
    var desc = Math.min(100, Math.max(0, Number(m.desconto) || 0));
    var liq = Number(m.valorFechado) ? Number(m.valorFechado) : bruto * (1 - desc / 100);
    var coop = m.cooperada && m.cooperada.tem ? Number(m.cooperada.valor) || 0 : 0;
    return { bruto: bruto, desc: desc, liquido: liq, ins: ins, coop: coop, custo: liq - coop };
  }
  function diasDoMes(ym) { var p = ym.split("-"); return new Date(+p[0], +p[1], 0).getDate(); }
  // período automático: do primeiro ao último dia com inserção na grade
  function midPeriodoAuto(m) {
    var ym = m.mesGrade; if (!ym) return null; var min = 99, max = 0;
    midLinhas(m).forEach(function (l) { if (l.modo === "qtd") return; Object.keys(l.dias || {}).forEach(function (k) { if (Number(l.dias[k])) { min = Math.min(min, +k); max = Math.max(max, +k); } }); });
    return max ? [ym + "-" + pad(min), ym + "-" + pad(max)] : null;
  }
  function midNoMes(m, ym) {
    if (m.mesGrade === ym || m.competencia === ym) return true;
    var a = (m.inicio || "").slice(0, 7), b = (m.fim || m.inicio || "").slice(0, 7);
    return !!a && a <= ym && ym <= b;
  }
  function midComp(m) { return m.competencia || m.mesGrade || (m.inicio || iso(today())).slice(0, 7); }
  function midCategoria(tipo) { var L = listas(), c = MID_CAT[tipo]; if (c && L.categoriasVerba.indexOf(c) >= 0) return c; var mi = L.categoriasVerba.find(function (x) { return /m[ií]dia/i.test(x); }); return mi || L.categoriasVerba[0] || "Outros"; }
  function midProxNum(ano) {
    var max = 0; S.midias.forEach(function (m) { var r = String(m.numero || "").match(/^(\d{4})\/(\d+)$/); if (r && r[1] === String(ano)) max = Math.max(max, +r[2]); });
    return ano + "/" + String(max + 1).padStart(3, "0");
  }
  function midStLabel(k) { return stLabel(MID_ST, k); }
  function midPeriodo(m) { var a = parse(m.inicio), b = parse(m.fim); if (!a && !b) return m.mesGrade ? mesLabel(m.mesGrade) : "sem período"; if (a && b) return fmt(a) + " a " + fmt(b) + "/" + b.getFullYear(); return fmt(a || b) + "/" + (a || b).getFullYear(); }
  function midVencAuto(m) { var e = midEmpresa(m.empresa), dia = Number(e.vencDia) || 15, ym = addMes(m.mesGrade || midComp(m), 1); return ym + "-" + pad(Math.min(dia, diasDoMes(ym))); }

  /* ---------- lista ---------- */
  function renderMidia() {
    var el = $("#v-midia"), L = listas();
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var ym = midF.mes;
    var list = S.midias.filter(function (m) { return midNoMes(m, ym); }).filter(function (m) { return (!midF.tipo || m.tipo === midF.tipo) && (!midF.conta || m.conta === midF.conta || m.conta === "Ambas") && (!midF.status || m.status === midF.status); })
      .sort(function (a, b) { return (a.inicio || "9999").localeCompare(b.inicio || "9999"); });
    var ativos = list.filter(function (m) { return m.status !== "cancelado"; });
    var soma = function (arr) { return arr.reduce(function (t, m) { return t + midTot(m).liquido; }, 0); };
    var previsto = soma(ativos), fechado = soma(ativos.filter(function (m) { return ["aprovado", "pi", "noar", "comprovado"].indexOf(m.status) >= 0; })), lancado = soma(ativos.filter(function (m) { return m.nfId; }));
    var teto = tetoOf(ym, midF.conta || null), gastoMes = realizado(ym, midF.conta || null);
    var porTipo = {}; ativos.forEach(function (m) { porTipo[m.tipo || "Outro"] = (porTipo[m.tipo || "Outro"] || 0) + midTot(m).liquido; });
    var tipos = Object.keys(porTipo).sort(function (a, b) { return porTipo[b] - porTipo[a]; }), maxT = Math.max.apply(null, tipos.map(function (t) { return porTipo[t]; }).concat([1]));
    var pendPI = ativos.filter(function (m) { return m.status === "aprovado" && !m.piEm; }).length;
    var semComp = ativos.filter(function (m) { return m.status === "noar" && m.fim && m.fim < iso(today()); }).length;
    el.innerHTML =
      '<div class="view-head"><div><div class="eyebrow">Mídia</div><h2>Plano e controle de mídia</h2><p class="muted">Monte o PI no mesmo modelo da planilha: grade de inserções por dia, dados do veículo e do cliente, e-mails da NF e observações. Gere o PDF com a logo da empresa e leve o valor para a Verba.</p></div>' +
      '<div class="row"><label class="btn ghost small" title="Lê PIs antigos em Excel e cria as veiculações">Importar planilhas de PI<input type="file" accept=".xlsx,.xls" multiple hidden id="mdImp"></label><button class="btn ghost small" id="mdDados">Empresas e modelos</button><button class="btn ghost small" id="mdPlano">Plano do mês em PDF</button><button class="btn" id="mdNew">+ Novo PI <span class="arrow">→</span></button></div></div>' +
      '<div class="ind-bar"><div class="ind-mes"><button class="btn ghost small" data-mdmes="-1" aria-label="Mês anterior">‹</button><b>' + esc(mesLabel(ym).replace(/^./, function (c) { return c.toUpperCase(); })) + '</b><button class="btn ghost small" data-mdmes="1" aria-label="Próximo mês">›</button></div>' +
        '<div class="row"><select id="mdT" style="width:auto"><option value="">Todos os tipos</option>' + L.tiposMidia.map(function (t) { return "<option" + (t === midF.tipo ? " selected" : "") + ">" + esc(t) + "</option>"; }).join("") + "</select>" +
        '<select id="mdC" style="width:auto"><option value="">AM e AG</option>' + L.contas.filter(function (c) { return c !== "Ambas"; }).map(function (c) { return "<option" + (c === midF.conta ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") + "</select>" +
        '<select id="mdS" style="width:auto"><option value="">Todos os status</option>' + MID_ST.map(function (s) { return '<option value="' + s[0] + '"' + (midF.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="vtiles"><div class="vtile"><span>Previsto no mês</span><b>' + brl(previsto) + "</b><small>" + ativos.length + " PI" + (ativos.length === 1 ? "" : "s") + '</small></div>' +
        '<div class="vtile"><span>Fechado</span><b>' + brl(fechado) + '</b><small>aprovado, PI enviado, no ar ou comprovado</small></div>' +
        '<div class="vtile"><span>Já na Verba</span><b>' + brl(lancado) + "</b><small>" + (previsto - lancado > 0.5 ? brl(previsto - lancado) + " ainda não lançado" : "tudo lançado") + "</small></div>" +
        '<div class="vtile ' + (teto && gastoMes > teto ? "neg" : "") + '"><span>Orçamento do mês' + (midF.conta ? " · " + esc(midF.conta) : "") + "</span><b>" + (teto ? brl(teto) : "sem teto") + "</b><small>" + (teto ? "lançado na Verba: " + brl(gastoMes) + " (" + Math.round(gastoMes / teto * 100) + "%)" : "defina em Verba e NFs") + "</small></div></div>" +
      (pendPI || semComp ? '<div class="banner warn">' + [pendPI ? pendPI + " aprovado" + (pendPI > 1 ? "s" : "") + " sem PI gerado" : "", semComp ? semComp + " já terminou e falta a comprovação" : ""].filter(Boolean).join(" · ") + "</div>" : "") +
      (tipos.length ? '<section class="card pad md-tipos"><div class="section-title"><h3>Por tipo de mídia</h3><span class="hint">valor líquido previsto no mês</span></div>' + tipos.map(function (t) { return '<div class="md-bar"><span>' + esc(t) + '</span><div class="ind-btrack"><i class="fill" style="left:0;width:' + Math.max(1, porTipo[t] / maxT * 100) + '%;background:var(--brand)"></i></div><b>' + brl(porTipo[t]) + '</b><span class="hint">' + (previsto ? Math.round(porTipo[t] / previsto * 100) : 0) + "%</span></div>"; }).join("") + "</section>" : "") +
      (list.length ? '<div class="tbl-wrap"><table class="tbl md-tbl"><thead><tr><th>PI</th><th>Veículo</th><th>Tipo</th><th>Empresa</th><th>Praça</th><th>Período</th><th class="r">Inserções</th><th class="r">Líquido</th><th>Status</th><th></th></tr></thead><tbody>' +
        list.map(function (m) { var t = midTot(m), e = midEmpresa(m.empresa || m.conta); return '<tr data-md="' + esc(m.id) + '" class="' + (m.status === "cancelado" ? "off" : "") + '"><td class="num">' + esc(m.numero || "—") + "</td><td><b>" + esc(m.veiculo || "Sem veículo") + "</b>" + (m.campanha ? '<div class="hint">' + esc(m.campanha) + "</div>" : "") + "</td><td>" + esc(m.tipo || "") + '</td><td><span class="tag">' + esc(e.nome || m.conta || "") + "</span></td><td>" + esc(m.praca || "—") + '</td><td class="num">' + esc(midPeriodo(m)) + '</td><td class="r num">' + (t.ins || "—") + '</td><td class="r num"><b>' + brl(t.liquido) + '</b></td><td><span class="pill-st st-' + esc(m.status) + '">' + esc(midStLabel(m.status)) + '</span></td><td class="md-flags">' + (m.piEm ? '<span class="tag" title="PI gerado">PI</span>' : "") + (m.nfId ? '<span class="tag solid" title="Lançado na Verba">Verba</span>' : "") + ((m.comprovacao || []).length ? '<span class="tag" title="Comprovação anexada">✓ comp.</span>' : "") + "</td></tr>"; }).join("") +
        '</tbody><tfoot><tr><td colspan="7">Total do filtro</td><td class="r num">' + brl(previsto) + '</td><td colspan="2"></td></tr></tfoot></table></div>'
        : '<div class="empty">Nenhum PI em ' + esc(mesLabel(ym)) + '. <button class="btn small" id="mdNew2">Criar o primeiro</button> ou importe as planilhas que vocês já usam.</div>');
    $("#mdNew").onclick = function () { openMidia(null); };
    if ($("#mdNew2")) $("#mdNew2").onclick = function () { openMidia(null); };
    $("#mdDados").onclick = function () { midDadosModal(); };
    $("#mdPlano").onclick = function () { midPlanoPdf(ym, list); };
    $("#mdImp").onchange = function () { var fs = Array.prototype.slice.call(this.files || []); this.value = ""; if (fs.length) midImportar(fs); };
    $$("[data-mdmes]", el).forEach(function (b) { b.onclick = function () { midF.mes = addMes(midF.mes, +b.dataset.mdmes); renderMidia(); }; });
    $("#mdT").onchange = function () { midF.tipo = this.value; renderMidia(); };
    $("#mdC").onchange = function () { midF.conta = this.value; renderMidia(); };
    $("#mdS").onchange = function () { midF.status = this.value; renderMidia(); };
    el.onclick = function (e) { var r = e.target.closest("tr[data-md]"); if (r) openMidia(S.midias.find(function (x) { return x.id === r.dataset.md; })); };
  }

  /* ---------- PI (janela de edição) ---------- */
  function midNovo() {
    var L = listas(), dd = midDados(), conta = midF.conta || "AM", e = dd.empresas.find(function (x) { return x.id === conta; }) || dd.empresas[0] || {};
    var tipo = midF.tipo || L.tiposMidia[0] || "Rádio", ym = midF.mes;
    return { numero: "", empresa: e.id || "", filial: (e.filiais && e.filiais[0] && e.filiais[0].id) || "", conta: ["AM", "AG"].indexOf(e.id) >= 0 ? e.id : conta, tipo: tipo, status: "previsto",
      veiculo: "", praca: "", campanha: "", contatoVeiculo: "", contatoMkt: e.contato || me, emissao: iso(today()), mesGrade: ym,
      linhas: [{ programa: "", formato: (MID_FMT[tipo] || [""])[0], modo: MID_QTD[tipo] ? "qtd" : "dias", dias: {}, qtd: 0, unit: 0, det: "" }],
      desconto: 0, valorFechado: 0, pagamento: "", vencimento: "", vencAuto: true, competencia: ym, categoria: midCategoria(tipo),
      emails: (e.emails || []).slice(), obs: dd.modelosObs.filter(function (o) { return o.padrao; }).map(function (o) { return o.texto; }).join("\n"), obsVeiculo: "",
      veiculoDados: { razao: "", endereco: "", cnpj: "", ie: "" }, assinatura: Object.assign({ mostrar: false, nome: e.contato || me, cargo: "Marketing" }, e.assinatura || {}),
      cooperada: { tem: false, industria: "", valor: 0 }, anexos: [], comprovacao: [] };
  }
  function openMidia(mv, copia) {
    var L = listas(), isNew = !mv || !!copia, id = isNew ? Store.uid() : mv.id;
    var d = JSON.parse(JSON.stringify(Object.assign(midNovo(), mv || {})));
    if (!d.linhas) d.linhas = midLinhas(d);
    if (!d.mesGrade) d.mesGrade = (d.inicio || d.competencia || midF.mes).slice(0, 7);
    if (!d.empresa) d.empresa = d.conta && d.conta !== "Ambas" ? d.conta : midDados().empresas[0].id;
    if (!d.veiculoDados) d.veiculoDados = { razao: "", endereco: d.cnpjVeiculo ? "" : "", cnpj: d.cnpjVeiculo || "", ie: "" };
    if (copia && copia !== "import") { d.numero = ""; d.status = "previsto"; d.nfId = ""; d.piEm = ""; d.comprovacao = []; d.anexos = []; d.lancadoValor = 0; d.emissao = iso(today()); if (d.cooperada) d.cooperada.lancado = false; }
    var dist = null; // linha com o assistente de distribuição aberto
    function sync() {
      var m = $("#modalRoot .modal"); if (!m) return;
      $$("[data-mf]", m).forEach(function (i) { var k = i.dataset.mf; if (i.type === "checkbox") return; d[k] = i.value; });
      d.desconto = Number(String(d.desconto || "").replace(",", ".")) || 0;
      d.valorFechado = parseBRL(d.valorFechado);
      $$("[data-vd]", m).forEach(function (i) { d.veiculoDados[i.dataset.vd] = i.value.trim(); });
      d.linhas = $$("[data-lrow]", m).map(function (r, i) {
        var g = function (k) { var x = $('[data-k="' + k + '"]', r); return x ? x.value : ""; }, old = d.linhas[i] || {};
        var l = { programa: g("programa").trim(), formato: g("formato").trim(), modo: old.modo || "dias", unit: parseBRL(g("unit")), det: g("det").trim(), qtd: Number(String(g("qtd")).replace(",", ".")) || 0, dias: {} };
        $$("[data-dia]", r).forEach(function (c) { var n = parseInt(c.value, 10); if (n > 0) l.dias[c.dataset.dia] = n; });
        return l;
      });
      d.emails = $$("[data-em]", m).filter(function (c) { return c.checked; }).map(function (c) { return c.value; });
      d.assinatura = { mostrar: $("#mdAssOn").checked, nome: $("#mdAssN").value.trim(), cargo: $("#mdAssC").value.trim() };
      d.vencAuto = $("#mdVencAuto").checked;
      d.cooperada = { tem: $("#mdCoopTem").checked, industria: $("#mdCoopInd").value.trim(), valor: parseBRL($("#mdCoopVal").value), lancado: d.cooperada && d.cooperada.lancado };
      if (d.vencAuto) d.vencimento = midVencAuto(d);
      var pa = midPeriodoAuto(d); if (pa) { d.inicio = pa[0]; d.fim = pa[1]; }
    }
    function totaisHTML() {
      var t = midTot(d), comp = d.competencia || midComp(d), contas = d.conta === "Ambas" ? ["AM", "AG"] : [d.conta];
      var orc = contas.map(function (c) {
        var teto = tetoOf(comp, c), jaLanc = realizado(comp, c), este = t.liquido * (d.conta === "Ambas" ? 0.5 : 1), depois = jaLanc - (d.nfId ? este : 0) + este;
        return '<div class="md-orc-l"><b>' + esc(c) + "</b><span>teto " + (teto ? brl(teto) : "não definido") + "</span><span>já lançado " + brl(jaLanc) + "</span><span>com este " + brl(depois) + "</span>" + (teto ? '<span class="' + (depois > teto ? "late-txt" : "ok-txt") + '">' + (depois > teto ? "passa " + brl(depois - teto) + " do teto" : "sobra " + brl(teto - depois)) + "</span>" : "") + "</div>";
      }).join("");
      return '<div class="vtiles small"><div class="vtile"><span>Inserções / unidades</span><b>' + t.ins + '</b></div><div class="vtile"><span>Valor tabela</span><b>' + brl(t.bruto) + '</b></div><div class="vtile"><span>Valor líquido do plano</span><b>' + brl(t.liquido) + "</b>" + (d.valorFechado ? "<small>pacote fechado</small>" : t.desc ? "<small>" + numBR(t.desc).replace(/,00$/, "") + "% de desconto</small>" : "") + "</div></div>" +
        '<div class="md-orc"><div class="lbl">Orçamento de ' + esc(mesLabel(comp)) + " (Verba e NFs)</div>" + orc + "</div>";
    }
    function gradeHTML() {
      var n = diasDoMes(d.mesGrade), p = d.mesGrade.split("-"), dow = function (k) { return new Date(+p[0], +p[1] - 1, k).getDay(); };
      var dias = []; for (var k = 1; k <= n; k++) dias.push(k);
      var head = '<tr><th rowspan="2" class="md-g-prog">Programação</th><th rowspan="2">Formato</th>' + dias.map(function (k) { return '<th class="md-g-d' + (dow(k) === 0 ? " dom" : "") + '">' + k + "</th>"; }).join("") + '<th rowspan="2" class="r">Total</th><th rowspan="2" class="r">Valor unit.</th><th rowspan="2" class="r">Total R$</th><th rowspan="2"></th></tr>' +
        "<tr>" + dias.map(function (k) { return '<th class="md-g-w' + (dow(k) === 0 ? " dom" : "") + '">' + DOW1[dow(k)] + "</th>"; }).join("") + "</tr>";
      var fmts = (MID_FMT[d.tipo] || []);
      var body = d.linhas.map(function (l, i) {
        var ins = linhaIns(l);
        var cells = l.modo === "qtd"
          ? '<td colspan="' + n + '" class="md-g-qtd"><div class="md-g-qrow"><input type="text" data-k="det" value="' + esc(l.det || "") + '" placeholder="Período e detalhes (ex.: BI 20 · placas 213, 231, 115…)"><label>Qtd <input type="text" inputmode="numeric" data-k="qtd" class="num-in" value="' + esc(l.qtd || "") + '"></label></div></td>'
          : dias.map(function (k) { var v = (l.dias || {})[k]; return '<td class="md-g-c' + (dow(k) === 0 ? " dom" : "") + '"><input type="text" inputmode="numeric" data-dia="' + k + '" value="' + (v || "") + '" aria-label="Dia ' + k + '"></td>'; }).join("");
        return '<tr data-lrow="' + i + '"><td class="md-g-prog"><input type="text" data-k="programa" value="' + esc(l.programa) + '" placeholder="' + (l.modo === "qtd" ? "ex.: BI 20 (05/05 a 18/05)" : "ex.: Jornal da Record") + '"></td>' +
          '<td><input type="text" data-k="formato" list="mdFmts" value="' + esc(l.formato) + '" style="width:74px"></td>' + cells +
          '<td class="r num" data-ltot>' + ins + '</td><td class="r"><input type="text" inputmode="decimal" data-k="unit" class="money" value="' + (l.unit ? numBR(l.unit) : "") + '" placeholder="0,00" style="width:84px"></td><td class="r num" data-lval>' + brl(ins * (Number(l.unit) || 0)) + "</td>" +
          '<td class="md-g-act">' + (l.modo === "qtd" ? "" : '<button type="button" class="linkbtn" data-ldist="' + i + '" title="Distribuir inserções nos dias">⚡</button>') + '<button type="button" class="linkbtn" data-lmodo="' + i + '" title="' + (l.modo === "qtd" ? "Usar a grade de dias" : "Usar quantidade (placas, peças)") + '">' + (l.modo === "qtd" ? "▦" : "#") + '</button><button type="button" class="linkbtn" data-ldup="' + i + '" title="Duplicar linha">⧉</button><button type="button" class="x" data-ldel="' + i + '" aria-label="Remover linha">✕</button></td></tr>' +
          (dist === i ? '<tr class="md-dist"><td colspan="' + (n + 6) + '"><div class="md-dist-in"><b>Distribuir</b><label>Total de inserções <input type="text" inputmode="numeric" id="dsTot" value="' + (ins || "") + '" class="num-in"></label><label>de <input type="number" id="dsDe" min="1" max="' + n + '" value="1" class="num-in"></label><label>até <input type="number" id="dsAte" min="1" max="' + n + '" value="' + n + '" class="num-in"></label>' +
            '<span class="chips" id="dsDow">' + ["D", "S", "T", "Q", "Q", "S", "S"].map(function (x, w) { return '<button type="button" data-w="' + w + '" aria-pressed="' + (w >= 1 && w <= 6) + '" title="' + ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][w] + '">' + x + "</button>"; }).join("") + "</span>" +
            '<button type="button" class="btn small" id="dsGo">Distribuir</button><button type="button" class="linkbtn" id="dsZero">limpar dias</button><button type="button" class="linkbtn" id="dsX">fechar</button><span class="hint">Divide igual entre os dias marcados; a sobra vai para os primeiros dias.</span></div></td></tr>' : "");
      }).join("");
      var tot = dias.map(function (k) { var s = 0; d.linhas.forEach(function (l) { if (l.modo !== "qtd") s += Number((l.dias || {})[k]) || 0; }); return '<td class="md-g-c tot' + (dow(k) === 0 ? " dom" : "") + '">' + (s || "") + "</td>"; }).join("");
      return '<div class="tbl-wrap md-grid-wrap"><table class="tbl md-grid"><thead>' + head + "</thead><tbody>" + body + '</tbody><tfoot><tr><td colspan="2" class="r">TOTAL</td>' + tot + '<td class="r num">' + midTot(d).ins + '</td><td></td><td class="r num">' + brl(midTot(d).bruto) + "</td><td></td></tr></tfoot></table></div>" +
        '<datalist id="mdFmts">' + fmts.map(function (f) { return '<option value="' + esc(f) + '">'; }).join("") + "</datalist>";
    }
    function draw() {
      var dd = midDados(), emp = midEmpresa(d.empresa), tipos = L.tiposMidia.slice(); if (d.tipo && tipos.indexOf(d.tipo) < 0) tipos.push(d.tipo);
      var filiais = emp.filiais || [], fil = filiais.find(function (f) { return f.id === d.filial; }) || filiais[0] || {};
      var emails = (emp.emails || []).slice(); (d.emails || []).forEach(function (x) { if (emails.indexOf(x) < 0) emails.push(x); });
      var campanhas = S.campanhas.map(function (c) { return c.titulo || c.nome; }).filter(Boolean);
      var html = '<header><div><div class="eyebrow">Pedido de inserção' + (d.numero ? " · " + esc(d.numero) : "") + "</div><h3>" + (isNew ? "Novo PI" : esc(d.veiculo || "PI")) + '</h3></div><button class="x" data-close>✕</button></header><div class="body">' +
        '<div class="md-steps"><span class="on">1 · Previsão</span><span class="' + (["aprovado", "pi", "noar", "comprovado"].indexOf(d.status) >= 0 ? "on" : "") + '">2 · Aprovação e PI</span><span class="' + (["noar", "comprovado"].indexOf(d.status) >= 0 ? "on" : "") + '">3 · No ar</span><span class="' + (d.status === "comprovado" ? "on" : "") + '">4 · Comprovação</span></div>' +
        '<div class="md-head">' +
          '<div class="md-logo md-logo-lg">' + (emp.logo ? '<img src="' + esc(emp.logo) + '" alt="">' : '<span class="hint">sem logo</span>') + "</div>" +
          '<div class="grid2 md-head-f"><div class="field"><label>Empresa (anunciante)</label><select id="mdEmp">' + dd.empresas.map(function (e) { return '<option value="' + esc(e.id) + '"' + (e.id === emp.id ? " selected" : "") + ">" + esc(e.nome || e.id) + "</option>"; }).join("") + "</select></div>" +
          '<div class="field"><label>Faturar para (CNPJ)</label><select id="mdFil">' + (filiais.length ? filiais.map(function (f) { return '<option value="' + esc(f.id) + '"' + (f.id === fil.id ? " selected" : "") + ">" + esc(f.nome + (f.cnpj ? " · " + f.cnpj : "")) + "</option>"; }).join("") : '<option value="">Cadastre em Empresas e modelos</option>') + "</select></div>" +
          '<div class="field"><label>PI nº</label><input type="text" data-mf="numero" value="' + esc(d.numero) + '" placeholder="automático"></div>' +
          '<div class="field"><label>Emissão</label><input type="date" data-mf="emissao" value="' + esc(d.emissao || "") + '"></div></div></div>' +
        '<div class="grid2"><div class="field"><label>Mídia</label><select data-mf="tipo" id="mdTipo">' + opt(tipos, d.tipo) + "</select></div>" +
          '<div class="field"><label>Veículo</label><input type="text" data-mf="veiculo" list="mdForn" value="' + esc(d.veiculo) + '" placeholder="ex.: MS RECORD"><datalist id="mdForn">' + fornecedores().concat(S.midias.map(function (x) { return x.veiculo; })).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).map(function (f) { return '<option value="' + esc(f) + '">'; }).join("") + "</datalist></div>" +
          '<div class="field"><label>Praça</label><input type="text" data-mf="praca" list="mdPracas" value="' + esc(d.praca) + '" placeholder="Campo Grande"><datalist id="mdPracas">' + ["Campo Grande", "Dourados", "Maracaju"].concat(S.midias.map(function (x) { return x.praca; })).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).map(function (f) { return '<option value="' + esc(f) + '">'; }).join("") + "</datalist></div>" +
          '<div class="field"><label>Campanha</label><input type="text" data-mf="campanha" list="mdCamp" value="' + esc(d.campanha) + '"><datalist id="mdCamp">' + campanhas.map(function (c) { return '<option value="' + esc(c) + '">'; }).join("") + "</datalist></div>" +
          '<div class="field"><label>Contato marketing</label><input type="text" data-mf="contatoMkt" value="' + esc(d.contatoMkt || "") + '"></div>' +
          '<div class="field"><label>Contato no veículo</label><input type="text" data-mf="contatoVeiculo" value="' + esc(d.contatoVeiculo || "") + '"></div>' +
          '<div class="field"><label>Status</label><select data-mf="status">' + MID_ST.map(function (s) { return '<option value="' + s[0] + '"' + (d.status === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
          '<div class="field"><label>Conta na Verba</label><select data-mf="conta">' + opt(L.contas, d.conta) + "</select></div></div>" +
        '<div class="field"><div class="section-title"><label>Programação · ' + esc(mesLabel(d.mesGrade)) + '</label><span class="row"><input type="month" id="mdMes" value="' + esc(d.mesGrade) + '" style="width:auto"><button type="button" class="btn ghost small" data-ladd="dias">+ Linha</button><button type="button" class="btn ghost small" data-ladd="qtd">+ Linha por quantidade</button><button type="button" class="btn ghost small" data-ladd="bonus">+ Bônus</button></span></div>' +
          '<p class="hint" style="margin:0 0 6px">Digite quantas inserções vão em cada dia (ou use ⚡ para distribuir sozinho). Outdoor e peças usam <b>#</b> quantidade. Totais e valores se calculam sozinhos.</p>' + gradeHTML() + "</div>" +
        '<div class="md-block"><div class="lbl">Valores</div><div class="grid2">' +
          '<div class="field"><label>Valor líquido do plano / pacote (R$)</label><input type="text" inputmode="decimal" data-mf="valorFechado" class="money" value="' + (d.valorFechado ? numBR(d.valorFechado) : "") + '" placeholder="deixe vazio para somar a grade"></div>' +
          '<div class="field"><label>Ou desconto sobre a tabela (%)</label><input type="text" inputmode="decimal" data-mf="desconto" value="' + (d.desconto ? String(d.desconto).replace(".", ",") : "") + '" placeholder="0"></div>' +
          '<div class="field"><label>Mês da verba (competência)</label><input type="month" data-mf="competencia" value="' + esc(d.competencia || midComp(d)) + '"></div>' +
          '<div class="field"><label>Categoria na Verba</label><select data-mf="categoria">' + opt(L.categoriasVerba, d.categoria || midCategoria(d.tipo)) + "</select></div></div>" +
          '<div id="mdTot">' + totaisHTML() + "</div></div>" +
        '<div class="md-cols3">' +
          '<div class="md-block"><div class="lbl">Instrução de faturamento</div>' +
            '<div class="field"><label>NF enviada aos e-mails</label><div class="md-emails">' + (emails.length ? emails.map(function (x) { return '<label class="ind-checks"><input type="checkbox" data-em value="' + esc(x) + '"' + ((d.emails || []).indexOf(x) >= 0 ? " checked" : "") + "> " + esc(x) + "</label>"; }).join("") : '<span class="hint">Cadastre os e-mails em Empresas e modelos.</span>') + '</div><div class="row"><input type="email" id="mdEmNew" placeholder="outro e-mail" style="flex:1"><button type="button" class="btn ghost small" id="mdEmAdd">+</button></div></div>' +
            '<div class="field"><label>Vencimento</label><input type="date" data-mf="vencimento" value="' + esc(d.vencAuto ? midVencAuto(d) : d.vencimento || "") + '"' + (d.vencAuto ? " disabled" : "") + '><label class="ind-checks"><input type="checkbox" id="mdVencAuto"' + (d.vencAuto ? " checked" : "") + "> automático (dia " + (Number(emp.vencDia) || 15) + " do mês seguinte)</label></div>" +
            '<div class="field"><label>Forma de pagamento</label><select data-mf="pagamento">' + opt(L.pagamentos, d.pagamento, "—") + "</select></div></div>" +
          '<div class="md-block"><div class="lbl">Dados do veículo</div>' +
            [["razao", "Razão social"], ["endereco", "Endereço"], ["cnpj", "CNPJ"], ["ie", "Inscrição"]].map(function (f) { return '<div class="field"><label>' + f[1] + '</label><input type="text" data-vd="' + f[0] + '" value="' + esc(d.veiculoDados[f[0]] || "") + '"></div>'; }).join("") +
            '<button type="button" class="linkbtn" id="mdVdSave">guardar no cadastro de fornecedores</button></div>' +
          '<div class="md-block"><div class="lbl">Dados do cliente</div>' + (fil.razao || fil.cnpj ? '<div class="md-cli"><b>' + esc(fil.razao || emp.razao || "") + "</b>" + (fil.endereco ? "<span>" + esc(fil.endereco) + "</span>" : "") + (fil.cnpj ? "<span>CNPJ " + esc(fil.cnpj) + "</span>" : "") + (fil.ie ? "<span>Inscrição " + esc(fil.ie) + "</span>" : "") + "</div>" : '<p class="hint">Cadastre razão social, endereço e CNPJ em <b>Empresas e modelos</b>.</p>') +
            '<button type="button" class="linkbtn" id="mdEmpEdit">✎ editar dados da empresa</button></div></div>' +
        '<div class="field"><div class="section-title"><label>Observações ao veículo</label><span class="chips md-modelos">' + dd.modelosObs.map(function (o, i) { return '<button type="button" data-om="' + i + '" title="' + esc(o.texto) + '">+ ' + esc(o.texto.slice(0, 28)) + (o.texto.length > 28 ? "…" : "") + "</button>"; }).join("") + '</span></div>' +
          '<textarea data-mf="obsVeiculo" style="min-height:48px" placeholder="Específico deste PI (ex.: concentrar os spots de sábado entre 7h e 11h)">' + esc(d.obsVeiculo || "") + "</textarea>" +
          '<textarea data-mf="obs" style="min-height:96px;margin-top:6px">' + esc(d.obs || "") + '</textarea><p class="hint">Os modelos entram no texto e você edita à vontade. Os marcados como padrão já vêm em todo PI novo.</p></div>' +
        '<div class="md-block"><div class="lbl">Assinatura no PDF</div><div class="md-idv"><label class="ind-checks"><input type="checkbox" id="mdAssOn"' + (d.assinatura && d.assinatura.mostrar ? " checked" : "") + '> mostrar assinatura</label><input type="text" id="mdAssN" value="' + esc((d.assinatura || {}).nome || "") + '" placeholder="Nome" style="width:auto"><input type="text" id="mdAssC" value="' + esc((d.assinatura || {}).cargo || "") + '" placeholder="Cargo" style="width:auto"></div></div>' +
        '<details class="md-mais"' + ((d.anexos || []).length || (d.comprovacao || []).length || (d.cooperada && d.cooperada.tem) ? " open" : "") + '><summary>Anexos, comprovação e verba cooperada</summary>' +
          '<div class="coop-row"><label class="ct"><input type="checkbox" id="mdCoopTem"' + (d.cooperada.tem ? " checked" : "") + '> tem verba cooperada</label><input type="text" id="mdCoopInd" placeholder="Indústria" value="' + esc(d.cooperada.industria) + '"><input type="text" inputmode="decimal" id="mdCoopVal" class="money" placeholder="Valor" value="' + (d.cooperada.valor ? numBR(d.cooperada.valor) : "") + '"></div>' +
          '<div class="field" id="mdAtt"></div><div class="field" id="mdComp"></div></details>' +
        '</div><footer><span class="row">' + (isNew ? "" : '<span id="mdDelW"><button class="btn ghost small" id="mdDel">Excluir</button></span><button class="btn ghost small" id="mdDup">Duplicar</button>') +
          '<button class="btn ghost small" id="mdPi">Gerar PI em PDF</button><button class="btn ghost small" id="mdVerba">' + (d.nfId ? "Atualizar na Verba" : "Levar para a Verba") + "</button></span>" +
          '<button class="btn" id="mdSave">Salvar <span class="arrow">→</span></button></footer>';
      if ($("#mb")) $("#modalRoot .modal").innerHTML = html; else openModal(html, { wide: true });
      var m = $("#modalRoot .modal"); m.classList.add("md-modal");
      attachBlock($("#mdAtt"), { titulo: "Proposta, mapa de programação, planilhas", lista: d.anexos || [], pasta: "midia/" + id, accept: ".xlsx,.xls,.csv,.pdf,.docx,.doc,.pptx,image/*", podeEditar: true, dropTarget: m, onChange: function (l) { d.anexos = l; if (!isNew) Store.upd("midias", id, { anexos: l }).catch(fail); } });
      attachBlock($("#mdComp"), { titulo: "Comprovação de veiculação (checking, fotos, relatórios)", lista: d.comprovacao || [], pasta: "midia/" + id, accept: "image/*,video/*,.pdf,.xlsx,.xls,.mp3,.wav,audio/*", podeEditar: true, onChange: function (l) { d.comprovacao = l; if (!isNew) Store.upd("midias", id, { comprovacao: l }).catch(fail); } });
      $("[data-close]", m).onclick = closeModal;
      fornHook($('[data-mf="veiculo"]', m), function (f) {
        sync(); var vd = d.veiculoDados; if (!vd.razao) vd.razao = f.razao || ""; if (!vd.cnpj) vd.cnpj = f.cnpj || ""; if (!vd.endereco) vd.endereco = [f.endereco, f.cidade].filter(Boolean).join(" - "); if (!vd.ie) vd.ie = f.inscricao || "";
        if (!d.contatoVeiculo) d.contatoVeiculo = f.contato || ""; if (!d.praca) d.praca = f.cidade || "";
        ["razao", "endereco", "cnpj", "ie"].forEach(function (k) { var i = $('[data-vd="' + k + '"]', m); if (i && !i.value) i.value = vd[k]; });
        var cv = $('[data-mf="contatoVeiculo"]', m); if (cv && !cv.value) cv.value = d.contatoVeiculo; var pr = $('[data-mf="praca"]', m); if (pr && !pr.value) pr.value = d.praca;
      });
      var recalc = function () { sync(); $$("[data-lrow]", m).forEach(function (r, i) { var l = d.linhas[i], n = linhaIns(l); $("[data-ltot]", r).textContent = n; $("[data-lval]", r).textContent = brl(n * (Number(l.unit) || 0)); }); var tf = $(".md-grid tfoot", m); if (tf) { var nd = diasDoMes(d.mesGrade), cs = tf.querySelectorAll("td"); for (var k = 1; k <= nd; k++) { var s = 0; d.linhas.forEach(function (l) { if (l.modo !== "qtd") s += Number((l.dias || {})[k]) || 0; }); cs[k].textContent = s || ""; } cs[nd + 1].textContent = midTot(d).ins; cs[nd + 3].textContent = brl(midTot(d).bruto); } $("#mdTot").innerHTML = totaisHTML(); };
      m.oninput = function (e) { if (e.target.closest(".md-grid,[data-mf='desconto'],[data-mf='valorFechado'],.coop-row")) recalc(); };
      m.onchange = function (e) { if (e.target.closest("[data-mf='competencia'],[data-mf='conta']")) { sync(); $("#mdTot").innerHTML = totaisHTML(); } };
      // grade: setas e Enter andam entre os dias
      $(".md-grid", m).addEventListener("keydown", function (e) {
        var c = e.target.closest("[data-dia]"); if (!c) return; var r = c.closest("tr"), k = +c.dataset.dia, ri = +r.dataset.lrow, go = null;
        if (e.key === "ArrowRight") go = [ri, k + 1]; if (e.key === "ArrowLeft") go = [ri, k - 1]; if (e.key === "ArrowDown" || e.key === "Enter") go = [ri + 1, k]; if (e.key === "ArrowUp") go = [ri - 1, k];
        if (go) { var t = $('[data-lrow="' + go[0] + '"] [data-dia="' + go[1] + '"]', m); if (t) { e.preventDefault(); t.focus(); t.select(); } }
      });
      $("#mdEmp").onchange = function () { sync(); var e = midEmpresa(this.value); d.empresa = e.id; d.filial = (e.filiais[0] || {}).id || ""; d.emails = (e.emails || []).slice(); if (!d.contatoMkt || d.contatoMkt === me) d.contatoMkt = e.contato || me; d.assinatura = Object.assign({ mostrar: false, nome: e.contato || me, cargo: "Marketing" }, e.assinatura || {}); if (["AM", "AG"].indexOf(e.id) >= 0) d.conta = e.id; draw(); };
      $("#mdFil").onchange = function () { sync(); d.filial = this.value; draw(); };
      $("#mdTipo").onchange = function () { sync(); d.categoria = midCategoria(d.tipo); draw(); };
      $("#mdMes").onchange = function () { if (!/^\d{4}-\d{2}$/.test(this.value)) return; sync(); var ant = d.mesGrade; d.mesGrade = this.value; if (!d.competencia || d.competencia === ant) d.competencia = this.value; var nd = diasDoMes(d.mesGrade); d.linhas.forEach(function (l) { Object.keys(l.dias || {}).forEach(function (k) { if (+k > nd) delete l.dias[k]; }); }); draw(); };
      $$("[data-ladd]", m).forEach(function (b) { b.onclick = function () { sync(); var t = b.dataset.ladd; d.linhas.push({ programa: t === "bonus" ? "BÔNUS " : "", formato: (MID_FMT[d.tipo] || [""])[t === "bonus" && d.tipo === "Outdoor" ? 1 : 0] || "", modo: t === "qtd" || (t === "bonus" && MID_QTD[d.tipo]) ? "qtd" : "dias", dias: {}, qtd: 0, unit: 0, det: "" }); draw(); var ins = $$('[data-k="programa"]', $("#modalRoot .modal")); if (ins.length) ins[ins.length - 1].focus(); }; });
      $(".md-grid", m).onclick = function (e) {
        var b = e.target.closest("[data-ldel],[data-ldup],[data-lmodo],[data-ldist]"); if (!b) return; sync();
        if (b.dataset.ldel != null) { d.linhas.splice(+b.dataset.ldel, 1); if (!d.linhas.length) d.linhas.push({ programa: "", formato: "", modo: "dias", dias: {}, qtd: 0, unit: 0, det: "" }); dist = null; draw(); return; }
        if (b.dataset.ldup != null) { var i = +b.dataset.ldup; d.linhas.splice(i + 1, 0, JSON.parse(JSON.stringify(d.linhas[i]))); draw(); return; }
        if (b.dataset.lmodo != null) { var l = d.linhas[+b.dataset.lmodo]; if (l.modo === "qtd") { l.modo = "dias"; } else { l.qtd = linhaIns(l); l.modo = "qtd"; l.dias = {}; } dist = null; draw(); return; }
        if (b.dataset.ldist != null) { dist = dist === +b.dataset.ldist ? null : +b.dataset.ldist; draw(); }
      };
      if (dist != null && $("#dsGo")) {
        $("#dsDow").onclick = function (e) { var x = e.target.closest("[data-w]"); if (x) x.setAttribute("aria-pressed", String(x.getAttribute("aria-pressed") !== "true")); };
        $("#dsX").onclick = function () { dist = null; sync(); draw(); };
        $("#dsZero").onclick = function () { sync(); d.linhas[dist].dias = {}; draw(); };
        $("#dsGo").onclick = function () {
          sync(); var tot = parseInt($("#dsTot").value, 10) || 0, de = Math.max(1, +$("#dsDe").value || 1), ate = Math.min(diasDoMes(d.mesGrade), +$("#dsAte").value || 31);
          var ws = $$("#dsDow [data-w]").filter(function (x) { return x.getAttribute("aria-pressed") === "true"; }).map(function (x) { return +x.dataset.w; });
          var p = d.mesGrade.split("-"), dias = []; for (var k = de; k <= ate; k++) if (ws.indexOf(new Date(+p[0], +p[1] - 1, k).getDay()) >= 0) dias.push(k);
          if (!tot || !dias.length) { toast("Informe o total e pelo menos um dia"); return; }
          var base = Math.floor(tot / dias.length), sobra = tot - base * dias.length, dd2 = {};
          dias.forEach(function (k, i) { var n = base + (i < sobra ? 1 : 0); if (n) dd2[k] = n; });
          d.linhas[dist].dias = dd2; dist = null; draw(); toast(tot + " inserções em " + dias.length + " dias");
        };
      }
      $("#mdVencAuto").onchange = function () { sync(); draw(); };
      $("#mdEmAdd").onclick = function () { var v = $("#mdEmNew").value.trim().toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(v)) { toast("E-mail inválido"); return; } sync(); if ((d.emails || []).indexOf(v) < 0) d.emails.push(v); var dd = midDados(), e = dd.empresas.find(function (x) { return x.id === d.empresa; }); if (e && (e.emails || []).indexOf(v) < 0) { e.emails = (e.emails || []).concat([v]); salvarMidDados(dd).catch(fail); } draw(); };
      $$("[data-om]", m).forEach(function (b) { b.onclick = function () { var dd = midDados(), t = dd.modelosObs[+b.dataset.om].texto, ta = $('[data-mf="obs"]', m); if (ta.value.indexOf(t) >= 0) { toast("Já está no texto"); return; } ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + t; sync(); }; });
      $("#mdEmpEdit").onclick = function () { sync(); var snap = JSON.parse(JSON.stringify(d)); midDadosModal(function () { openMidiaDraft(snap); }, d.empresa); };
      $("#mdVdSave").onclick = function () {
        sync(); var nome = d.veiculo.trim(); if (!nome) { toast("Preencha o veículo"); return; }
        var f = fornPorNome(nome), vd = d.veiculoDados, patch = { razao: vd.razao, cnpj: vd.cnpj, endereco: vd.endereco, inscricao: vd.ie, contato: d.contatoVeiculo || (f && f.contato) || "", cidade: (f && f.cidade) || d.praca || "" };
        (f ? Store.upd("fornecedores", f.id, patch) : Store.add("fornecedores", Object.assign({ nome: nome, categoria: d.tipo || "", telefone: "", email: "", pix: "", banco: "", obs: "", anexos: [], ativo: true, criadoEm: new Date().toISOString(), criadoPor: me }, patch))).then(function () { toast(f ? "Cadastro do fornecedor atualizado" : "Fornecedor cadastrado"); }, fail);
      };
      var save = function (then) {
        sync(); if (!d.veiculo.trim()) { toast("Preencha o veículo"); $('[data-mf="veiculo"]', m).focus(); return; }
        if (!d.numero) d.numero = midProxNum((d.mesGrade || iso(today())).slice(0, 4));
        if (!d.competencia) d.competencia = midComp(d);
        d.cnpjVeiculo = d.veiculoDados.cnpj; d.contato = d.contatoVeiculo;
        var doc = JSON.parse(JSON.stringify(d)); delete doc.id; delete doc.itens; doc.atualizadoEm = new Date().toISOString(); doc.criadoPor = d.criadoPor || me;
        Store.set("midias", id, doc).then(function () { isNew = false; if (then) then(doc); else toast("PI salvo"); }, fail);
      };
      $("#mdSave").onclick = function () { save(); closeModal(); };
      $("#mdPi").onclick = function () { save(function (doc) { if (!doc.piEm) { d.piEm = new Date().toISOString(); if (["previsto", "negociando", "aprovado"].indexOf(d.status) >= 0) d.status = "pi"; Store.upd("midias", id, { piEm: d.piEm, status: d.status }).catch(fail); } midPiPdf(Object.assign({ id: id }, d)); draw(); }); };
      $("#mdVerba").onclick = function () {
        sync(); var t = midTot(d);
        if (!t.liquido) { toast("Preencha a programação ou o valor do plano"); return; }
        if (!d.veiculo.trim()) { toast("Preencha o veículo"); return; }
        var comp = d.competencia || midComp(d);
        if (!d.numero) d.numero = midProxNum((d.mesGrade || iso(today())).slice(0, 4));
        var nf = { fornecedor: d.veiculo, descricao: "PI " + d.numero + " · " + (d.tipo || "Mídia") + (d.campanha ? " · " + d.campanha : "") + (d.praca ? " · " + d.praca : "") + " · " + midPeriodo(d), categoria: d.categoria || midCategoria(d.tipo), conta: d.conta, valor: t.liquido, competencia: comp, vencimento: d.vencimento || "", pagamento: d.pagamento || "", obs: "Lançado da aba Mídia", midia: id };
        var jobs = [], existe = d.nfId && S.nfs.find(function (x) { return x.id === d.nfId; });
        if (existe) jobs.push(Store.upd("nfs", d.nfId, nf).then(function () { return "upd"; }));
        else jobs.push(Store.add("nfs", Object.assign({ emissao: "", numero: "", status: "aguardando", contrato: "", anexos: [], criadoEm: new Date().toISOString(), criadoPor: me }, nf)).then(function (nid) { d.nfId = nid; return "add"; }));
        if (d.cooperada.tem && d.cooperada.valor && !d.cooperada.lancado) { d.cooperada.lancado = true; jobs.push(Store.add("cooperada", { fornecedor: d.cooperada.industria || "Indústria", conta: d.conta, valor: d.cooperada.valor, recebido: 0, competencia: comp, prazo: "", status: "acordado", acao: "Mídia PI " + d.numero + " · " + d.veiculo, obs: "", anexos: [], criadoPor: me })); }
        Promise.all(jobs).then(function (r) { d.lancadoValor = t.liquido; save(function () { toast(r[0] === "upd" ? "Lançamento atualizado em Verba e NFs" : "Lançado em Verba e NFs (" + mesLabel(comp) + ")" + (jobs.length > 1 ? " + cooperada" : "")); draw(); }); }, fail);
      };
      if ($("#mdDup")) $("#mdDup").onclick = function () { sync(); var src = JSON.parse(JSON.stringify(d)); closeModal(); setTimeout(function () { openMidia(src, true); toast("Cópia: ajuste o mês e salve"); }, 30); };
      if ($("#mdDel")) $("#mdDel").onclick = function () { delConfirm("#mdDelW", d.nfId ? "Excluir? (o lançamento na Verba fica)" : "Excluir o PI?", function () { (d.anexos || []).concat(d.comprovacao || []).forEach(function (a) { Store.removeFile(a); }); Store.del("midias", id).catch(fail); closeModal(); }); };
    }
    // reabre com o rascunho depois de editar a empresa
    openMidiaDraft = function (snap) { d = snap; draw(); };
    draw();
  }
  var openMidiaDraft = function () {};

  function logoDataURL(file, max) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) { rej(); return; }
      var r = new FileReader(); r.onerror = rej;
      r.onload = function () { var im = new Image(); im.onerror = rej; im.onload = function () { var k = Math.min(1, (max || 600) / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL("image/png")); }; im.src = r.result; };
      r.readAsDataURL(file);
    });
  }

  /* ---------- empresas e modelos ---------- */
  function midDadosModal(depois, focoEmp) {
    var dd = JSON.parse(JSON.stringify(midDados())), sel = focoEmp || (dd.empresas[0] || {}).id;
    function draw() {
      var e = dd.empresas.find(function (x) { return x.id === sel; }) || dd.empresas[0];
      var m = openModal('<header><div><div class="eyebrow">Mídia</div><h3>Empresas e modelos do PI</h3></div><button class="x" data-close>✕</button></header><div class="body">' +
        '<div class="row md-emp-tabs">' + dd.empresas.map(function (x) { return '<button type="button" class="chipbtn" data-es="' + esc(x.id) + '" aria-pressed="' + (x.id === (e && e.id)) + '">' + esc(x.nome || x.id) + "</button>"; }).join("") + '<button type="button" class="btn ghost small" id="deAdd">+ Empresa</button></div>' +
        (e ? '<div class="md-block"><div class="md-idv"><div class="md-logo md-logo-lg">' + (e.logo ? '<img src="' + esc(e.logo) + '" alt="">' : '<span class="hint">sem logo</span>') + '</div><label class="btn ghost small">Trocar logo<input type="file" accept="image/*" hidden id="deLogo"></label>' + (e.logo ? '<button type="button" class="linkbtn" id="deLogoRm">tirar logo</button>' : "") +
          '<span class="md-cores"><label>Cor de destaque <input type="color" id="deCor" value="' + esc(e.cor || "#FFD400") + '"></label><label>Texto sobre a cor <input type="color" id="deCorT" value="' + esc(e.corTexto || "#111111") + '"></label></span></div>' +
          '<div class="grid2"><div class="field"><label>Nome curto</label><input type="text" id="deNome" value="' + esc(e.nome || "") + '"></div><div class="field"><label>Contato de marketing</label><input type="text" id="deCont" value="' + esc(e.contato || "") + '"></div>' +
          '<div class="field"><label>Vencimento: dia do mês seguinte</label><input type="number" min="1" max="31" id="deVenc" value="' + esc(e.vencDia || 15) + '"></div><div class="field"><label>Assinatura padrão</label><input type="text" id="deAssN" value="' + esc((e.assinatura || {}).nome || "") + '" placeholder="Nome"></div>' +
          '<div class="field"><label>Cargo na assinatura</label><input type="text" id="deAssC" value="' + esc((e.assinatura || {}).cargo || "") + '"></div><div class="field"><label>&nbsp;</label><label class="ind-checks"><input type="checkbox" id="deAssOn"' + ((e.assinatura || {}).mostrar ? " checked" : "") + "> assinatura ligada por padrão</label></div></div>" +
          '<div class="field"><label>E-mails que recebem a NF (um por linha)</label><textarea id="deEm" style="min-height:70px">' + esc((e.emails || []).join("\n")) + "</textarea></div>" +
          '<div class="field"><div class="section-title"><label>Dados de faturamento (CNPJs)</label><button type="button" class="btn ghost small" id="deFilAdd">+ CNPJ / filial</button></div>' +
          (e.filiais || []).map(function (f, i) { return '<div class="md-fil" data-fi="' + i + '"><input type="text" data-ff="nome" value="' + esc(f.nome || "") + '" placeholder="Nome (Matriz, Dourados…)"><input type="text" data-ff="razao" value="' + esc(f.razao || "") + '" placeholder="Razão social"><input type="text" data-ff="endereco" value="' + esc(f.endereco || "") + '" placeholder="Endereço"><input type="text" data-ff="cnpj" value="' + esc(f.cnpj || "") + '" placeholder="CNPJ"><input type="text" data-ff="ie" value="' + esc(f.ie || "") + '" placeholder="Inscrição"><button type="button" class="x" data-fdel="' + i + '" aria-label="Remover">✕</button></div>'; }).join("") + "</div>" +
          (dd.empresas.length > 1 ? '<button type="button" class="linkbtn danger-txt" id="deDel">remover esta empresa</button>' : "") + "</div>" : "") +
        '<div class="md-block"><div class="lbl">Modelos de observação ao veículo</div><p class="hint">Edite à vontade. Os marcados como <b>padrão</b> entram sozinhos em todo PI novo.</p>' +
          dd.modelosObs.map(function (o, i) { return '<div class="md-om" data-oi="' + i + '"><label class="ind-checks" title="padrão"><input type="checkbox" data-op' + (o.padrao ? " checked" : "") + "> padrão</label><textarea data-ot>" + esc(o.texto) + '</textarea><button type="button" class="x" data-odel="' + i + '" aria-label="Remover">✕</button></div>'; }).join("") +
          '<button type="button" class="btn ghost small" id="deObsAdd">+ Modelo</button></div>' +
        '</div><footer><span></span><button class="btn" id="deSave">Salvar <span class="arrow">→</span></button></footer>', { wide: true });
      var coletar = function () {
        if (e) {
          e.nome = $("#deNome").value.trim() || e.id; e.contato = $("#deCont").value.trim(); e.vencDia = +$("#deVenc").value || 15; e.cor = $("#deCor").value; e.corTexto = $("#deCorT").value;
          e.assinatura = { nome: $("#deAssN").value.trim() || e.contato || "", cargo: $("#deAssC").value.trim(), mostrar: $("#deAssOn").checked };
          e.emails = $("#deEm").value.split(/[\n,;]+/).map(function (x) { return x.trim().toLowerCase(); }).filter(function (x) { return /\S+@\S+/.test(x); });
          e.filiais = $$("[data-fi]", m).map(function (r, i) { var o = { id: (e.filiais[i] && e.filiais[i].id) || Store.uid() }; $$("[data-ff]", r).forEach(function (x) { o[x.dataset.ff] = x.value.trim(); }); return o; });
        }
        dd.modelosObs = $$("[data-oi]", m).map(function (r, i) { return { id: (dd.modelosObs[i] || {}).id || Store.uid(), texto: $("[data-ot]", r).value.trim(), padrao: $("[data-op]", r).checked }; }).filter(function (o) { return o.texto; });
      };
      $("[data-close]", m).onclick = function () { closeModal(); if (depois) depois(); };
      $$("[data-es]", m).forEach(function (b) { b.onclick = function () { coletar(); sel = b.dataset.es; draw(); }; });
      $("#deAdd").onclick = function () { coletar(); var nome = window.prompt("Nome curto da nova empresa (ex.: Golden, Loja X)"); nome = (nome || "").trim(); if (!nome) return; var nid = nome.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || Store.uid(); dd.empresas.push({ id: nid, nome: nome, razao: "", logo: "", cor: "#FFD400", corTexto: "#111111", contato: me, emails: [], vencDia: 15, filiais: [], assinatura: { mostrar: false, nome: me, cargo: "Marketing" } }); sel = nid; draw(); };
      if (e) {
        $("#deLogo").onchange = function () { var f = this.files[0]; coletar(); logoDataURL(f, 700).then(function (u) { e.logo = u; draw(); }, function () { toast("Use uma imagem PNG ou JPG"); }); };
        if ($("#deLogoRm")) $("#deLogoRm").onclick = function () { coletar(); e.logo = ""; draw(); };
        $("#deFilAdd").onclick = function () { coletar(); e.filiais.push({ id: Store.uid(), nome: "", razao: e.razao || "", endereco: "", cnpj: "", ie: "" }); draw(); };
        $$("[data-fdel]", m).forEach(function (b) { b.onclick = function () { coletar(); e.filiais.splice(+b.dataset.fdel, 1); draw(); }; });
        if ($("#deDel")) $("#deDel").onclick = function () { coletar(); dd.empresas = dd.empresas.filter(function (x) { return x !== e; }); sel = dd.empresas[0].id; draw(); };
      }
      $("#deObsAdd").onclick = function () { coletar(); dd.modelosObs.push({ id: Store.uid(), texto: "Novo modelo de observação", padrao: false }); draw(); };
      $$("[data-odel]", m).forEach(function (b) { b.onclick = function () { coletar(); dd.modelosObs.splice(+b.dataset.odel, 1); draw(); }; });
      $("#deSave").onclick = function () { coletar(); salvarMidDados(dd).then(function () { toast("Empresas e modelos salvos"); if (depois) setTimeout(depois, 60); }, fail); closeModal(); };
    }
    draw();
  }

  /* ---------- PDF do PI (paisagem, no modelo da planilha) ---------- */
  function midPiPdf(d) {
    var e = midEmpresa(d.empresa), fil = (e.filiais || []).find(function (f) { return f.id === d.filial; }) || (e.filiais || [])[0] || {};
    var t = midTot(d), ls = midLinhas(d), ym = d.mesGrade || midComp(d), n = diasDoMes(ym), p = ym.split("-");
    var dow = function (k) { return new Date(+p[0], +p[1] - 1, k).getDay(); }, dias = []; for (var k = 1; k <= n; k++) dias.push(k);
    var cor = e.cor || "#FFD400", corT = e.corTexto || "#111", vd = d.veiculoDados || {};
    var w = window.open("", "_blank"); if (!w) { toast("O navegador bloqueou a janela. Libere pop-ups para este site."); return; }
    var dataBR = function (s) { var x = parse(s); return x ? fmt(x) + "/" + x.getFullYear() : "—"; };
    var linhasHTML = ls.map(function (l, i) {
      var ins = linhaIns(l), cells = l.modo === "qtd" ? '<td colspan="' + n + '" class="det">' + esc(l.det || "") + "</td>" : dias.map(function (k) { var v = (l.dias || {})[k]; return '<td class="c' + (dow(k) === 0 ? " dom" : "") + '">' + (v || "") + "</td>"; }).join("");
      return "<tr>" + (i === 0 ? '<td class="per" rowspan="' + ls.length + '">' + esc(MONTHS[+p[1] - 1].toUpperCase()) + "</td>" : "") + '<td class="prog">' + esc(l.programa) + '</td><td class="fmt">' + esc(l.formato) + "</td>" + cells + '<td class="r">' + (ins || "") + '</td><td class="r">' + (l.unit ? brl(l.unit) : "—") + '</td><td class="r">' + brl(ins * (Number(l.unit) || 0)) + "</td>" + (i === 0 ? '<td class="plano" rowspan="' + ls.length + '">' + brl(t.liquido) + "</td>" : "") + "</tr>";
    }).join("");
    var temDias = ls.some(function (l) { return l.modo !== "qtd"; });
    var totDia = dias.map(function (k) { var s = 0; ls.forEach(function (l) { if (l.modo !== "qtd") s += Number((l.dias || {})[k]) || 0; }); return '<td class="c tot' + (dow(k) === 0 ? " dom" : "") + '">' + (temDias ? s : "") + "</td>"; }).join("");
    var obs = [d.obsVeiculo, d.obs].filter(Boolean).join("\n").split("\n").filter(function (x) { return x.trim(); });
    var html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>PI ' + esc(d.numero || "") + " · " + esc(d.veiculo || "") + "</title>" +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700;800&display=swap"><style>' +
      "@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font-family:'Work Sans',Arial,sans-serif;color:#141414;font-size:9px;line-height:1.3;background:#fff}@media screen{body{max-width:1180px;margin:0 auto;padding:18px}}" +
      ".tip{background:#fff8c6;border:1px solid #f0dc50;padding:6px 10px;border-radius:5px;margin-bottom:10px;font-size:11px}@media print{.tip{display:none}}" +
      ".top{display:flex;align-items:center;gap:18px;margin-bottom:8px}.top img{height:46px;max-width:200px;object-fit:contain}.top h1{font-size:17px;margin:0;font-weight:800;letter-spacing:.5px}.top .num{margin-left:auto;text-align:right;font-size:10px;color:#444}.top .num b{font-size:13px;color:#141414}" +
      ".info{display:grid;grid-template-columns:1.2fr 1fr .8fr;border:1px solid #cfcfcf;margin-bottom:8px}.info div{padding:4px 7px;border-bottom:1px solid #e3e3e3;border-right:1px solid #e3e3e3}.info b{font-weight:700}.info .hl{background:" + cor + ";color:" + corT + ";font-weight:800;font-size:11px}" +
      "table.g{width:100%;border-collapse:collapse;table-layout:fixed}.g th,.g td{border:1px solid #cfcfcf;padding:2px 2px;text-align:center;overflow:hidden}.g thead th{background:" + cor + ";color:" + corT + ";font-weight:700;font-size:8px}.g .dom{background:#f1f1f1}.g thead .dom{filter:brightness(.92)}" +
      ".g td.prog{text-align:left;font-weight:600;padding-left:4px}.g td.fmt{font-size:8px}.g td.det{text-align:left;padding-left:6px;font-weight:600}.g td.r{text-align:right;padding-right:4px;white-space:nowrap}.g td.per{background:" + cor + ";color:" + corT + ";font-weight:800;writing-mode:vertical-rl;transform:rotate(180deg);font-size:10px}" +
      ".g td.plano{background:" + cor + ";color:" + corT + ";font-weight:800;font-size:12px}.g tfoot td{font-weight:800;background:#fafafa}.g .c{font-weight:600}" +
      ".bot{display:grid;grid-template-columns:.9fr 1.3fr 1.5fr;gap:10px;margin-top:10px}.box{border:1px solid #cfcfcf;padding:7px 9px}.box h3{margin:0 0 5px;font-size:9px;letter-spacing:.6px;text-transform:uppercase}.box .kv{display:grid;grid-template-columns:auto 1fr;gap:1px 8px}.box .kv span{color:#555}.hlb{background:" + cor + ";color:" + corT + ";padding:1px 5px;font-weight:800}" +
      ".venc{font-size:14px;font-weight:800;margin-top:4px}.obs div{margin-bottom:3px}.sign{display:flex;justify-content:flex-end;margin-top:26px}.sign div{border-top:1px solid #141414;padding-top:4px;min-width:240px;text-align:center;font-size:9.5px}" +
      "</style></head><body><div class=\"tip\">Na janela de impressão, escolha <b>Salvar como PDF</b> e o papel <b>A4 deitado</b>.</div>" +
      '<div class="top">' + (e.logo ? '<img src="' + esc(e.logo) + '" alt="">' : "") + '<h1>PEDIDO DE INSERÇÃO</h1><div class="num">PI nº <b>' + esc(d.numero || "—") + "</b><br>Emissão: " + esc(dataBR(d.emissao)) + "</div></div>" +
      '<div class="info"><div><b>Contato Marketing:</b> ' + esc(d.contatoMkt || "") + "</div><div><b>Contato Veículo:</b> " + esc(d.contatoVeiculo || "") + "</div><div><b>Emissão:</b> " + esc(dataBR(d.emissao)) + "</div>" +
        '<div><b>MÍDIA:</b> ' + esc((d.tipo || "").toUpperCase()) + '</div><div class="hl">' + esc((d.veiculo || "").toUpperCase()) + '</div><div class="hl">PRAÇA: ' + esc((d.praca || "").toUpperCase()) + "</div>" +
        '<div style="grid-column:1/-1"><b>CAMPANHA:</b> ' + esc(d.campanha || "") + "</div></div>" +
      '<table class="g"><colgroup><col style="width:22px"><col style="width:120px"><col style="width:44px">' + dias.map(function () { return "<col>"; }).join("") + '<col style="width:34px"><col style="width:56px"><col style="width:64px"><col style="width:72px"></colgroup><thead><tr><th rowspan="2">MÊS</th><th rowspan="2">PROGRAMAÇÃO</th><th rowspan="2">FORMATO</th>' + dias.map(function (k) { return '<th class="' + (dow(k) === 0 ? "dom" : "") + '">' + k + "</th>"; }).join("") + '<th rowspan="2">TOTAL</th><th rowspan="2">VALOR UNIT.</th><th rowspan="2">TOTAL POR FORMATO</th><th rowspan="2">VALOR LÍQUIDO DO PLANO</th></tr><tr>' + dias.map(function (k) { return '<th class="' + (dow(k) === 0 ? "dom" : "") + '">' + DOW1[dow(k)] + "</th>"; }).join("") + "</tr></thead><tbody>" + linhasHTML +
        '</tbody><tfoot><tr><td></td><td colspan="2" class="r">TOTAL</td>' + totDia + '<td class="r">' + t.ins + '</td><td></td><td class="r">' + brl(t.bruto) + '</td><td class="r">' + brl(t.liquido) + "</td></tr></tfoot></table>" +
      '<div class="bot"><div class="box"><h3>Instrução de faturamento</h3><div>NF enviada aos seguintes e-mails:</div>' + (d.emails || []).map(function (x) { return "<div><b>" + esc(x) + "</b></div>"; }).join("") + '<div style="margin-top:6px">VENCIMENTO:</div><div class="venc">' + esc(dataBR(d.vencimento)) + "</div>" + (d.pagamento ? "<div>Pagamento: " + esc(d.pagamento) + "</div>" : "") + "</div>" +
        '<div class="box"><h3>Dados do veículo</h3><div class="kv"><span>Razão social</span><b>' + esc(vd.razao || d.veiculo || "") + "</b><span>Endereço</span><span>" + esc(vd.endereco || "") + "</span><span>CNPJ</span><span>" + esc(vd.cnpj || "") + "</span><span>Inscrição</span><span>" + esc(vd.ie || "") + '</span></div><h3 style="margin-top:8px">Dados do cliente</h3><div class="kv"><span>Razão social</span><b>' + esc(fil.razao || e.razao || "") + "</b><span>Endereço</span><span>" + esc(fil.endereco || "") + "</span><span>CNPJ</span><span>" + esc(fil.cnpj || "") + "</span><span>Inscrição</span><span>" + esc(fil.ie || "") + "</span></div></div>" +
        '<div class="box obs"><h3>Observações ao veículo</h3>' + obs.map(function (x, i) { return "<div>" + (i === 0 && d.obsVeiculo ? '<span class="hlb">' + esc(x) + "</span>" : esc(x)) + "</div>"; }).join("") + "</div></div>" +
      (d.assinatura && d.assinatura.mostrar ? '<div class="sign"><div><b>' + esc(d.assinatura.nome || "") + "</b><br>" + esc(d.assinatura.cargo || "") + (e.nome ? " · " + esc(fil.razao || e.razao || e.nome) : "") + "</div></div>" : "") +
      "</body></html>";
    w.document.open(); w.document.write(html); w.document.close();
    var done = false, fin = function () { if (!done) { done = true; setTimeout(function () { try { w.focus(); w.print(); } catch (x) {} }, 300); } };
    var imgs = w.document.images, pend = imgs.length; if (!pend) setTimeout(fin, 600);
    Array.prototype.forEach.call(imgs, function (im) { if (im.complete) { if (--pend <= 0) fin(); } else { im.onload = im.onerror = function () { if (--pend <= 0) fin(); }; } });
    setTimeout(fin, 4000);
  }

  function midPlanoPdf(ym, list) {
    var ativos = list.filter(function (m) { return m.status !== "cancelado"; });
    if (!ativos.length) { toast("Nenhum PI neste filtro."); return; }
    var tot = ativos.reduce(function (s, m) { return s + midTot(m).liquido; }, 0), lanc = ativos.filter(function (m) { return m.nfId; }).reduce(function (s, m) { return s + midTot(m).liquido; }, 0);
    var porTipo = {}; ativos.forEach(function (m) { porTipo[m.tipo || "Outro"] = (porTipo[m.tipo || "Outro"] || 0) + midTot(m).liquido; });
    abrirRelatorio({
      titulo: "Plano de mídia · " + mesLabel(ym), heading: "Plano de mídia · " + mesLabel(ym),
      sub: [midF.conta || "AM e AG", midF.tipo, midF.status ? midStLabel(midF.status) : ""].filter(Boolean).join(" · "),
      kpis: [["PIs", String(ativos.length)], ["Valor líquido", brl(tot)], ["Já na Verba", brl(lanc)], ["Teto do mês", tetoOf(ym, midF.conta || null) ? brl(tetoOf(ym, midF.conta || null)) : "—"]],
      body: function () {
        return '<h2 class="sec">Por tipo de mídia</h2><table><thead><tr><th>Tipo</th><th class="r">Valor líquido</th><th class="r">% do plano</th></tr></thead><tbody>' + Object.keys(porTipo).sort(function (a, b) { return porTipo[b] - porTipo[a]; }).map(function (k) { return "<tr><td>" + esc(k) + '</td><td class="r">' + brl(porTipo[k]) + '</td><td class="r">' + Math.round(porTipo[k] / tot * 100) + "%</td></tr>"; }).join("") + "</tbody></table>" +
          '<h2 class="sec">PIs</h2><table><thead><tr><th>PI</th><th>Veículo</th><th>Tipo</th><th>Praça</th><th>Período</th><th>Campanha</th><th class="r">Inserções</th><th class="r">Líquido</th><th>Status</th></tr></thead><tbody>' +
          ativos.map(function (m) { var t = midTot(m); return "<tr><td>" + esc(m.numero || "—") + "</td><td><b>" + esc(m.veiculo || "") + "</b></td><td>" + esc(m.tipo || "") + "</td><td>" + esc(m.praca || "") + "</td><td>" + esc(midPeriodo(m)) + "</td><td>" + esc(m.campanha || "—") + '</td><td class="r">' + (t.ins || "—") + '</td><td class="r">' + brl(t.liquido) + '</td><td><span class="pill">' + esc(midStLabel(m.status)) + "</span></td></tr>"; }).join("") +
          '</tbody><tfoot><tr><td colspan="7">Total</td><td class="r">' + brl(tot) + "</td><td></td></tr></tfoot></table>";
      }
    });
  }

  /* ---------- importar planilhas de PI (.xlsx) ---------- */
  var libsP = {};
  function carregarLib(url, glob) { if (window[glob]) return Promise.resolve(); if (!libsP[url]) libsP[url] = new Promise(function (res, rej) { var s = document.createElement("script"); s.src = url; s.onload = res; s.onerror = function () { libsP[url] = null; rej(); }; document.head.appendChild(s); }); return libsP[url]; }
  function midLerPlanilha(file) {
    return Promise.all([carregarLib("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "XLSX"), carregarLib("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "JSZip")]).then(function () { return file.arrayBuffer(); }).then(function (buf) {
      var wb = window.XLSX.read(buf, { type: "array", cellDates: true }), ws = wb.Sheets[wb.SheetNames[0]];
      var R = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
      var txt = function (v) { return v instanceof Date ? v : String(v == null ? "" : v).trim(); };
      var find = function (re) { for (var r = 0; r < R.length; r++) for (var c = 0; c < R[r].length; c++) { var v = R[r][c]; if (typeof v === "string" && re.test(v)) return [r, c]; } return null; };
      var depois = function (pos, re, lim) { if (!pos) return ""; var row = R[pos[0]], v = String(row[pos[1]] || ""); var m = v.match(re); if (m && m[1] && m[1].trim()) return m[1].trim(); for (var c = pos[1] + 1; c < Math.min(row.length, lim || 9999); c++) { if (txt(row[c]) !== "" && !(typeof row[c] === "string" && /:\s*$/.test(row[c]))) return txt(row[c]); } return ""; };
      var d = midNovo(); d.linhas = [];
      d.contatoMkt = depois(find(/contato\s+marketing/i), /contato\s+marketing\s*:\s*(.*)$/i) || d.contatoMkt;
      d.contatoVeiculo = depois(find(/contato\s+ve[ií]culo/i), /contato\s+ve[ií]culo\s*:\s*(.*)$/i);
      var em = depois(find(/^emiss[aã]o/i), /emiss[aã]o\s*:\s*(.*)$/i); if (em instanceof Date) d.emissao = iso(em);
      var mp = find(/^m[ií]dia\s*:/i); if (mp) { var tp = String(R[mp[0]][mp[1]]).replace(/^m[ií]dia\s*:\s*/i, "").trim().toLowerCase(); d.tipo = /r[aá]dio/.test(tp) ? "Rádio" : /tv|televis/.test(tp) ? "TV" : /outdoor|busdoor|front/.test(tp) ? "Outdoor" : /led|painel/.test(tp) ? "Painel de LED" : /carro/.test(tp) ? "Carro de som" : /digital|internet/.test(tp) ? "Digital" : /jornal|revista/.test(tp) ? "Jornal e revista" : tp.replace(/^./, function (c) { return c.toUpperCase(); }); d.veiculo = depois(mp, /^$/) ; }
      d.praca = String(depois(find(/^pra[cç]a\s*:/i), /pra[cç]a\s*:\s*(.*)$/i) || "").toLowerCase().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); });
      d.campanha = depois(find(/^campanha\s*:/i), /campanha\s*:\s*(.*)$/i);
      d.categoria = midCategoria(d.tipo);
      // grade
      var hp = find(/^programa[cç][aã]o$/i); var ano = (d.emissao || iso(today())).slice(0, 4), mesN = null;
      if (hp) {
        var hr = hp[0], head = R[hr], cProg = hp[1], cFmt = cProg + 1, dayRow = R[hr + 1] || [], dayCols = {};
        dayRow.forEach(function (v, c) { var n = Number(v); if (n >= 1 && n <= 31 && Math.floor(n) === n && c > cFmt) dayCols[c] = n; });
        var colOf = function (re) { for (var c = 0; c < head.length; c++) if (re.test(String(head[c] || ""))) return c; return -1; };
        var cUnit = colOf(/valor\s+unit/i), cTotF = colOf(/total\s+por\s+formato/i), cPac = colOf(/pacote|valor.*plano/i), cPer = hp[1] - 1;
        var dcols = Object.keys(dayCols).map(Number), first = Math.min.apply(null, dcols), last = Math.max.apply(null, dcols), pacote = 0;
        for (var r = hr + 3; r < R.length; r++) {
          var row = R[r], fmtV = txt(row[cFmt]), prog = txt(row[cProg]), per = txt(row[cPer]);
          if (/^total$/i.test(String(fmtV)) || /instru[cç][aã]o de faturamento|dados do ve/i.test(row.join(" "))) break;
          var mesTxt = String(per || "").toLowerCase(), mi = MONTHS.indexOf(mesTxt); if (mi >= 0) mesN = mi + 1;
          if (!prog && !fmtV) { if (cPac >= 0 && Number(row[cPac])) pacote = Math.max(pacote, Number(row[cPac])); continue; }
          var l = { programa: String(prog || ""), formato: String(fmtV || ""), modo: "dias", dias: {}, qtd: 0, unit: cUnit >= 0 ? Number(row[cUnit]) || 0 : 0, det: "" }, textos = [];
          for (var c = first; c <= last; c++) { var v = row[c]; if (v === "" || v == null) continue; if (typeof v === "number" && dayCols[c]) { if (v > 0) l.dias[dayCols[c]] = v; } else textos.push(String(v).trim()); }
          if (textos.length && !Object.keys(l.dias).length) {
            l.modo = "qtd"; l.det = textos.join(" · ");
            var totF = cTotF >= 0 ? Number(row[cTotF]) || 0 : 0; l.qtd = l.unit && totF ? Math.round(totF / l.unit) : (l.det.match(/\d+/g) || []).length;
          }
          if (/b[oô]nus|bonific/i.test(l.programa + " " + l.formato)) l.unit = l.unit || 0;
          if (cPac >= 0 && Number(row[cPac])) pacote = Math.max(pacote, Number(row[cPac]));
          d.linhas.push(l);
        }
        if (pacote) d.valorFechado = pacote;
      }
      if (!mesN) { var em2 = parse(d.emissao); mesN = em2 ? em2.getMonth() + 1 : new Date().getMonth() + 1; }
      d.mesGrade = ano + "-" + pad(mesN); d.competencia = d.mesGrade;
      // rodapé
      var opos = find(/observa[cç][oõ]es ao ve[ií]culo/i), lim = opos ? opos[1] : 9999;
      var bloco = function (re) { var p = find(re); if (!p) return null; var o = { razao: depois(p, /:\s*(.+)$/, lim) }; for (var r = p[0] + 1; r < Math.min(R.length, p[0] + 5); r++) { var row = R[r], fim = false; for (var c = 0; c < Math.min(row.length, lim); c++) { var k = String(row[c] || ""); if (/^endere/i.test(k)) o.endereco = depois([r, c], /:\s*(.+)$/, lim); else if (/^cnpj/i.test(k)) o.cnpj = String(depois([r, c], /:\s*(.+)$/, lim)); else if (/^inscri/i.test(k)) o.ie = String(depois([r, c], /:\s*(.+)$/, lim)); else if (/dados do/i.test(k)) { fim = true; break; } } if (fim) break; } return o; };
      var vd = bloco(/dados do ve[ií]culo/i), cli = bloco(/dados do cliente/i);
      if (vd) d.veiculoDados = { razao: String(vd.razao || ""), endereco: String(vd.endereco || ""), cnpj: String(vd.cnpj || ""), ie: String(vd.ie || "") };
      var emails = []; R.forEach(function (row) { row.forEach(function (v) { var m = String(v || "").match(/[\w.+-]+@[\w-]+\.[\w.]+/g); if (m) m.forEach(function (x) { x = x.toLowerCase(); if (emails.indexOf(x) < 0) emails.push(x); }); }); });
      var vp = find(/^vencimento\s*:?\s*$/i); if (vp) { var vv = R[vp[0] + 1] && R[vp[0] + 1][vp[1]]; if (vv instanceof Date) { d.vencimento = iso(vv); d.vencAuto = false; } }
      var op = find(/observa[cç][oõ]es ao ve[ií]culo/i), obs = [];
      if (op) { var first0 = String(R[op[0]][op[1]]).replace(/observa[cç][oõ]es ao ve[ií]culo\s*:?\s*/i, "").trim(); if (first0) d.obsVeiculo = first0; for (var r2 = op[0] + 1; r2 < Math.min(R.length, op[0] + 14); r2++) { var t2 = String(R[r2][op[1]] || "").trim(); if (t2) obs.push(t2); } }
      if (obs.length) d.obs = obs.join("\n");
      // logo embutida na planilha
      return window.JSZip.loadAsync(buf).then(function (z) { var f = Object.keys(z.files).find(function (n) { return /^xl\/media\/.+\.(png|jpe?g)$/i.test(n); }); return f ? z.file(f).async("base64").then(function (b) { return "data:image/" + (/png$/i.test(f) ? "png" : "jpeg") + ";base64," + b; }) : ""; }).catch(function () { return ""; })
        .then(function (logo) { return { d: d, cli: cli, emails: emails, logo: logo }; });
    });
  }
  function midImportar(files) {
    toast("Lendo " + files.length + " planilha" + (files.length > 1 ? "s" : "") + "…");
    var res = [];
    files.reduce(function (pr, f) { return pr.then(function () { return midLerPlanilha(f).then(function (r) { res.push(r); }, function (e) { console.error(e); toast("Não consegui ler " + f.name); }); }); }, Promise.resolve()).then(function () {
      if (!res.length) return;
      // empresa: acha pelo CNPJ (raiz) ou pela razão social; senão usa a primeira
      var dd = midDados(), mudou = false;
      res.forEach(function (r) {
        var c = r.cli || {}, raiz = String(c.cnpj || "").replace(/\D/g, "").slice(0, 8), razao = String(c.razao || "").toLowerCase();
        var e = dd.empresas.find(function (x) { return (x.filiais || []).some(function (f) { return raiz && String(f.cnpj || "").replace(/\D/g, "").slice(0, 8) === raiz; }) || (razao && (x.razao || "").toLowerCase() === razao); }) || dd.empresas.find(function (x) { return x.id === (midF.conta || "AM"); }) || dd.empresas[0];
        if (!e.razao && c.razao) { e.razao = c.razao; mudou = true; }
        if (!e.logo && r.logo) { e.logo = r.logo; mudou = true; }
        var fil = (e.filiais || []).find(function (f) { return c.cnpj && String(f.cnpj).replace(/\D/g, "") === String(c.cnpj).replace(/\D/g, ""); });
        if (!fil && (c.razao || c.cnpj)) { fil = { id: Store.uid(), nome: /dourados/i.test(c.endereco || "") ? "Dourados" : (e.filiais || []).length ? "Filial " + ((e.filiais || []).length + 1) : "Matriz", razao: c.razao || "", endereco: c.endereco || "", cnpj: c.cnpj || "", ie: String(c.ie || "") }; e.filiais = (e.filiais || []).concat([fil]); mudou = true; }
        r.emails.forEach(function (x) { if ((e.emails || []).indexOf(x) < 0) { e.emails = (e.emails || []).concat([x]); mudou = true; } });
        if (!e.contato && r.d.contatoMkt) { e.contato = r.d.contatoMkt; mudou = true; }
        var modelos = dd.modelosObs.map(function (o) { return o.texto.toLowerCase(); });
        String(r.d.obs || "").split("\n").forEach(function (t) { t = t.trim(); if (t && modelos.indexOf(t.toLowerCase()) < 0 && dd.modelosObs.length < 20) { dd.modelosObs.push({ id: Store.uid(), texto: t, padrao: false }); modelos.push(t.toLowerCase()); mudou = true; } });
        r.d.empresa = e.id; r.d.filial = fil ? fil.id : ""; r.d.emails = r.emails.slice(); if (["AM", "AG"].indexOf(e.id) >= 0) r.d.conta = e.id;
        var pa = midPeriodoAuto(r.d); if (pa) { r.d.inicio = pa[0]; r.d.fim = pa[1]; }
        if (r.d.vencAuto) r.d.vencimento = midVencAuto(r.d);
      });
      var jobs = [];
      if (mudou) jobs.push(salvarMidDados(dd));
      // fornecedores com os dados do veículo
      res.forEach(function (r) { var d = r.d, vd = d.veiculoDados; if (!d.veiculo) return; var f = fornPorNome(d.veiculo), patch = { razao: vd.razao, cnpj: vd.cnpj, endereco: vd.endereco, inscricao: vd.ie, contato: d.contatoVeiculo || "" }; if (f) jobs.push(Store.upd("fornecedores", f.id, patch)); else jobs.push(Store.add("fornecedores", Object.assign({ nome: d.veiculo, categoria: d.tipo === "Outdoor" ? "Outdoor e OOH" : d.tipo, cidade: d.praca || "", telefone: "", email: "", pix: "", banco: "", obs: "", anexos: [], ativo: true, criadoEm: new Date().toISOString(), criadoPor: me }, patch))); });
      Promise.all(jobs).then(function () {
        if (res.length === 1) { openMidia(res[0].d, "import"); toast("Planilha lida: confira e salve"); return; }
        var seq = {}; var ps = res.map(function (r) { var d = r.d, ano = d.mesGrade.slice(0, 4); if (seq[ano] == null) seq[ano] = +midProxNum(ano).split("/")[1]; else seq[ano]++; d.numero = ano + "/" + String(seq[ano]).padStart(3, "0"); d.status = "pi"; d.criadoPor = me; d.atualizadoEm = new Date().toISOString(); var id = Store.uid(); return Store.set("midias", id, d).then(function () { return d; }); });
        return Promise.all(ps).then(function (ds) { midF.mes = ds[0].mesGrade; toast(ds.length + " PIs importados em " + mesLabel(ds[0].mesGrade)); renderMidia(); });
      }, fail);
    });
  }

  /* ================================================================
     INDICADORES · atendimento Bitrix, pesquisas NPS e tráfego pago (só admins)
     Um documento por mês ("2026-09") com { atend, nps, trafego }.
     Metas em documentos "metas-AAAA-MM": valem daquele mês em diante.
     ================================================================ */
  var IND_SECS = {
    atend: {
      nome: "Atendimento Bitrix", curto: "Atendimento", linhas: "unidades", linhaNome: "Loja", obs: "Observações",
      metrics: [
        { k: "atendimentos", l: "Atendimentos", dir: "up", f: "int", agg: "sum" },
        { k: "qualidade", l: "Qualidade do atendimento", dir: "up", f: "pct", agg: "wavg", w: "atendimentos", hint: "% de avaliações positivas" },
        { k: "tempo", l: "Tempo de resposta", dir: "down", f: "min", agg: "wavg", w: "atendimentos", hint: "em minutos" },
        { k: "ignoradas", l: "Mensagens ignoradas", dir: "down", f: "int", agg: "sum" }
      ]
    },
    nps: {
      nome: "Pesquisas NPS", curto: "NPS", linhas: "unidades", linhaNome: "Loja", obs: "O que os clientes disseram",
      metrics: [
        { k: "npsAtend", l: "NPS atendimento", dir: "up", f: "nps", agg: "wavg", w: "respostas", hint: "de -100 a 100" },
        { k: "npsGeral", l: "NPS geral", dir: "up", f: "nps", agg: "wavg", w: "respostas", hint: "de -100 a 100" },
        { k: "promotores", l: "Promotores", dir: "up", f: "pct", agg: "wavg", w: "respostas" },
        { k: "neutros", l: "Neutros", dir: "down", f: "pct", agg: "wavg", w: "respostas" },
        { k: "detratores", l: "Detratores", dir: "down", f: "pct", agg: "wavg", w: "respostas" },
        { k: "respostas", l: "Respostas", dir: "up", f: "int", agg: "sum" }
      ]
    },
    trafego: {
      nome: "Tráfego pago", curto: "Tráfego", linhas: "canaisTrafego", linhaNome: "Conta / plataforma", obs: "Campanhas e observações do mês",
      metrics: [
        { k: "investimento", l: "Investimento", dir: "teto", f: "brl", agg: "sum", hint: "meta = orçamento do mês" },
        { k: "impressoes", l: "Impressões", dir: "up", f: "int", agg: "sum" },
        { k: "alcance", l: "Alcance", dir: "up", f: "int", agg: "sum" },
        { k: "cliques", l: "Cliques", dir: "up", f: "int", agg: "sum" },
        { k: "conversoes", l: "Leads / conversas", dir: "up", f: "int", agg: "sum" },
        { k: "vendas", l: "Vendas atribuídas", dir: "up", f: "brl", agg: "sum" },
        { k: "ctr", l: "CTR", dir: "up", f: "pct2", calc: function (g) { return g.impressoes ? g.cliques / g.impressoes * 100 : null; }, need: ["cliques", "impressoes"] },
        { k: "cpc", l: "Custo por clique", dir: "down", f: "brl", calc: function (g) { return g.cliques ? g.investimento / g.cliques : null; }, need: ["investimento", "cliques"] },
        { k: "cpl", l: "Custo por lead", dir: "down", f: "brl", calc: function (g) { return g.conversoes ? g.investimento / g.conversoes : null; }, need: ["investimento", "conversoes"] },
        { k: "roas", l: "ROAS", dir: "up", f: "x", calc: function (g) { return g.investimento ? g.vendas / g.investimento : null; }, need: ["vendas", "investimento"], hint: "vendas ÷ investimento" }
      ]
    }
  };
  var indF = { sec: LS.get("indSec", "atend"), mes: iso(today()).slice(0, 7), metric: {}, hist: 6 };
  (function () { var d = today(); if (d.getDate() <= 10) indF.mes = addMes(indF.mes, -1); })(); // no começo do mês, o foco é fechar o anterior
  if (!IND_SECS[indF.sec]) indF.sec = "atend";

  function indSec() { return IND_SECS[indF.sec]; }
  function indInputs(sec) { return sec.metrics.filter(function (m) { return !m.calc; }); }
  function indLinhas(secKey) { var L = listas(); return (L[IND_SECS[secKey].linhas] || []).slice(); }
  function indMesDoc(ym) { return S.indicadores.find(function (x) { return x.id === ym; }) || null; }
  function indRow(secKey, ym, linha) { var d = indMesDoc(ym); return (d && d[secKey] && d[secKey][linha]) || null; }
  function indNum(v) { return v === "" || v == null || isNaN(Number(v)) ? null : Number(v); }
  function indTemDados(secKey, ym) { var d = indMesDoc(ym); if (!d || !d[secKey]) return false; return Object.keys(d[secKey]).some(function (k) { var r = d[secKey][k]; return r && indInputs(IND_SECS[secKey]).some(function (m) { return indNum(r[m.k]) != null; }); }); }

  // valor de uma linha (loja/conta) num mês, incluindo os calculados
  function indValLinha(secKey, ym, linha, m) {
    var r = indRow(secKey, ym, linha); if (!r) return null;
    if (!m.calc) return indNum(r[m.k]);
    var g = {}; indInputs(IND_SECS[secKey]).forEach(function (x) { g[x.k] = indNum(r[x.k]) || 0; });
    if (m.need.some(function (k) { return indNum(r[k]) == null; })) return null;
    return m.calc(g);
  }
  // valor do grupo (todas as linhas)
  function indValGrupo(secKey, ym, m) {
    var sec = IND_SECS[secKey], linhas = indLinhas(secKey);
    var d = indMesDoc(ym); if (!d || !d[secKey]) return null;
    // considera também linhas que existem nos dados mas saíram da lista
    Object.keys(d[secKey]).forEach(function (k) { if (linhas.indexOf(k) < 0) linhas.push(k); });
    if (m.calc) {
      var g = {}, ok = true;
      m.need.forEach(function (k) { var mm = sec.metrics.find(function (x) { return x.k === k; }); var v = indValGrupo(secKey, ym, mm); if (v == null) ok = false; g[k] = v || 0; });
      return ok ? m.calc(g) : null;
    }
    var vals = linhas.map(function (l) { var r = d[secKey][l]; return r ? { v: indNum(r[m.k]), w: m.w ? indNum(r[m.w]) : null } : null; }).filter(function (x) { return x && x.v != null; });
    if (!vals.length) return null;
    if (m.agg === "sum") return vals.reduce(function (t, x) { return t + x.v; }, 0);
    var sw = vals.reduce(function (t, x) { return t + (x.w || 0); }, 0);
    if (sw > 0) return vals.reduce(function (t, x) { return t + x.v * (x.w || 0); }, 0) / sw;
    return vals.reduce(function (t, x) { return t + x.v; }, 0) / vals.length;
  }
  function indVal(secKey, ym, linha, m) { return linha ? indValLinha(secKey, ym, linha, m) : indValGrupo(secKey, ym, m); }

  // metas: documento "metas-AAAA-MM" mais recente que não passa do mês (ou o mais antigo, se todos forem depois)
  function indMetasDoc(ym) {
    var docs = S.indicadores.filter(function (x) { return /^metas-\d{4}-\d{2}$/.test(x.id); }).sort(function (a, b) { return a.id.localeCompare(b.id); });
    if (!docs.length) return null;
    var ok = docs.filter(function (x) { return x.id.slice(6) <= ym; });
    return ok.length ? ok[ok.length - 1] : docs[0];
  }
  function indMeta(secKey, ym, linha, m) {
    var md = indMetasDoc(ym), s = md && md[secKey]; if (!s) return null;
    var g = indNum((s.geral || {})[m.k]);
    if (!linha) {
      if (g != null) return g;
      if (m.agg === "sum") { var tot = 0, any = false; indLinhas(secKey).forEach(function (l) { var v = indNum(((s.linhas || {})[l] || {})[m.k]); if (v != null) { tot += v; any = true; } }); return any ? tot : null; }
      return null;
    }
    var u = indNum(((s.linhas || {})[linha] || {})[m.k]);
    if (u != null) return u;
    return m.agg === "sum" ? null : g; // taxas e médias herdam a meta do grupo; totais não
  }
  // % em relação à meta (100 = bateu)
  function indPct(v, meta, m) {
    if (v == null || meta == null) return null;
    if (m.dir === "down") { if (v <= 0) return meta > 0 ? 200 : 100; return meta / v * 100; }
    if (meta === 0) return null;
    return v / meta * 100;
  }
  function indStatus(pct, m) {
    if (pct == null) return null;
    if (m.dir === "teto") return pct <= 100 ? "ok" : pct <= 110 ? "warn" : "late";
    return pct >= 100 ? "ok" : pct >= 85 ? "warn" : "late";
  }
  var IND_ST_LABEL = { ok: "Na meta", warn: "Perto da meta", late: "Abaixo da meta" };
  function indStLabel(st, m) { if (m.dir === "teto") return { ok: "Dentro do orçamento", warn: "Pouco acima", late: "Estourou" }[st]; return IND_ST_LABEL[st]; }

  function indFmt(v, f) {
    if (v == null || isNaN(v)) return "—";
    if (f === "int") return Math.round(v).toLocaleString("pt-BR");
    if (f === "pct") return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%";
    if (f === "pct2") return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "%";
    if (f === "nps") return Math.round(v).toLocaleString("pt-BR");
    if (f === "brl") return brl(v);
    if (f === "brl0") return Math.abs(v) >= 1000 ? "R$ " + (v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : "R$ " + Math.round(v);
    if (f === "x") return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "x";
    if (f === "min") { if (v < 60) return v.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " min"; var h = Math.floor(v / 60), mi = Math.round(v - h * 60); return h + "h" + (mi ? " " + pad(mi) + "min" : ""); }
    return String(v);
  }
  // variação contra o mês anterior, já dizendo se foi para o lado bom
  function indDelta(v, p, m) {
    if (v == null || p == null) return null;
    var diff = v - p, txt;
    if (m.f === "pct" || m.f === "pct2") txt = (diff >= 0 ? "+" : "−") + Math.abs(diff).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " p.p.";
    else if (m.f === "nps") txt = (diff >= 0 ? "+" : "−") + Math.abs(Math.round(diff)) + " pts";
    else if (m.f === "min") txt = (diff >= 0 ? "+" : "−") + indFmt(Math.abs(diff), "min");
    else if (p === 0) txt = diff === 0 ? "0%" : "novo";
    else { var pc = diff / Math.abs(p) * 100; txt = (pc >= 0 ? "+" : "−") + Math.abs(pc).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%"; }
    if (Math.abs(diff) < 1e-9) txt = "igual";
    var bom = Math.abs(diff) < 1e-9 ? null : m.dir === "up" ? diff > 0 : diff < 0;
    if (m.dir === "teto") bom = null; // gastar mais ou menos não é bom nem ruim por si só
    return { txt: txt, bom: bom, seta: Math.abs(diff) < 1e-9 ? "=" : diff > 0 ? "▲" : "▼" };
  }
  function indDeltaHTML(d, vs) { if (!d) return '<span class="ind-delta">sem mês anterior</span>'; return '<span class="ind-delta ' + (d.bom === true ? "bom" : d.bom === false ? "ruim" : "") + '">' + d.seta + " " + esc(d.txt) + (vs ? ' <span class="muted">' + esc(vs) + "</span>" : "") + "</span>"; }
  function indPctHTML(pct, m) {
    if (pct == null) return "";
    var st = indStatus(pct, m), shown = indPctTxt(pct) + "%";
    return '<span class="ind-pill st-' + st + '" title="' + esc(indStLabel(st, m)) + '">' + (st === "ok" ? "✓ " : st === "warn" ? "• " : "! ") + shown + "</span>";
  }
  function indPctTxt(p) { if (p > 999) return ">999"; var r = Math.round(p); if (r === 100 && p < 100) r = 99; return String(r); }
  function indNice(mn, mx) { var span = mx - mn || 1, raw = span / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag, st = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag; var a = Math.floor(mn / st) * st, b = Math.ceil(mx / st) * st, t = []; for (var v = a; v <= b + st / 2; v += st) t.push(Math.round(v * 1e6) / 1e6); return t; }
  function indMeses(ym, n) { var out = []; for (var i = n - 1; i >= 0; i--) out.push(addMes(ym, -i)); return out; }
  function mesCurto(ym) { var p = ym.split("-"); return MONTHS[+p[1] - 1].slice(0, 3) + "/" + p[0].slice(2); }

  // minigráfico de linha (uma série) para os cartões
  function indSpark(secKey, ym, m) {
    var ms = indMeses(ym, 6), vals = ms.map(function (x) { return indValGrupo(secKey, x, m); });
    var pts = vals.map(function (v, i) { return v == null ? null : [i, v]; }).filter(Boolean);
    if (pts.length < 2) return '<div class="ind-spark empty">evolução aparece com 2 meses de dados</div>';
    var W = 150, H = 34, P = 4, mn = Math.min.apply(null, pts.map(function (p) { return p[1]; })), mx = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    if (mx === mn) { mx += 1; mn -= 1; }
    var X = function (i) { return P + i * (W - 2 * P) / 5; }, Y = function (v) { return H - P - (v - mn) / (mx - mn) * (H - 2 * P); };
    var path = pts.map(function (p, i) { return (i ? "L" : "M") + X(p[0]).toFixed(1) + " " + Y(p[1]).toFixed(1); }).join(" ");
    var last = pts[pts.length - 1];
    return '<svg class="ind-spark" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Últimos 6 meses"><path d="' + path + '"/>' +
      pts.map(function (p) { return '<circle class="hit" cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="9"><title>' + esc(mesCurto(ms[p[0]]) + ": " + indFmt(p[1], m.f)) + "</title></circle>"; }).join("") +
      '<circle class="dot" cx="' + X(last[0]) + '" cy="' + Y(last[1]) + '" r="3"/></svg>';
  }

  // gráfico de evolução do grupo com a linha da meta
  function indLinha(secKey, ym, m, n) {
    var ms = indMeses(ym, n), vals = ms.map(function (x) { return indValGrupo(secKey, x, m); }), metas = ms.map(function (x) { return indMeta(secKey, x, null, m); });
    if (vals.filter(function (v) { return v != null; }).length < 1) return '<div class="empty">Sem dados nos últimos ' + n + " meses.</div>";
    var W = Math.max(320, Math.min(1400, (($("#v-indicadores") || {}).clientWidth || 1000) - 40)), H = 240, L = 70, Rr = 18, T = 18, B = 30;
    var all = vals.concat(metas).filter(function (v) { return v != null; });
    var mn = Math.min.apply(null, all), mx = Math.max.apply(null, all);
    if (m.f !== "nps" || mn >= 0) mn = Math.min(0, mn);
    if (mx === mn) mx = mn + 1;
    var ticks = indNice(mn, mx); mn = ticks[0]; mx = ticks[ticks.length - 1];
    var X = function (i) { return L + (n === 1 ? (W - L - Rr) / 2 : i * (W - L - Rr) / (n - 1)); }, Y = function (v) { return T + (1 - (v - mn) / (mx - mn)) * (H - T - B); };
    var grid = ticks.map(function (t) { return '<line class="g" x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text class="ax" x="' + (L - 8) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + esc(indFmt(t, m.f === "brl" ? "brl0" : m.f)) + "</text>"; }).join("");
    var every = Math.ceil(n / Math.max(2, Math.floor((W - L) / 64))); var xl = ms.map(function (x, i) { if (i % every && i !== n - 1) return ""; return '<text class="ax" x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + mesCurto(x) + "</text>"; }).join("");
    var seg = function (arr, cls) {
      var d = "", pen = false;
      arr.forEach(function (v, i) { if (v == null) { pen = false; return; } d += (pen ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1) + " "; pen = true; });
      return d ? '<path class="' + cls + '" d="' + d + '"/>' : "";
    };
    var dots = vals.map(function (v, i) { if (v == null) return ""; var mt = metas[i], pc = indPct(v, mt, m); return '<g class="pt"><circle class="dot" cx="' + X(i) + '" cy="' + Y(v) + '" r="4"/><circle class="hit" cx="' + X(i) + '" cy="' + Y(v) + '" r="14"><title>' + esc(mesLabel(ms[i]) + "\n" + m.l + ": " + indFmt(v, m.f) + (mt != null ? "\nMeta: " + indFmt(mt, m.f) + " (" + indPctTxt(pc) + "%)" : "")) + "</title></circle></g>"; }).join("");
    var lastI = -1; vals.forEach(function (v, i) { if (v != null) lastI = i; });
    var lab = lastI >= 0 ? '<text class="vl" x="' + Math.min(X(lastI), W - Rr - 4) + '" y="' + (Y(vals[lastI]) - 10) + '" text-anchor="' + (lastI === n - 1 ? "end" : "middle") + '">' + esc(indFmt(vals[lastI], m.f)) + "</text>" : "";
    var temMeta = metas.some(function (v) { return v != null; });
    return '<div class="ind-legend"><span><i class="sw serie"></i>' + esc(m.l) + " (grupo)</span>" + (temMeta ? '<span><i class="sw meta"></i>Meta</span>' : "") + "</div>" +
      '<svg class="ind-line" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Evolução de ' + esc(m.l) + '">' + grid + xl + seg(metas, "meta") + seg(vals, "serie") + dots + lab + "</svg>";
  }

  function renderIndicadores() {
    var el = $("#v-indicadores");
    if (!isAdmin()) { el.innerHTML = '<div class="empty">Esta área é só para administradores.</div>'; return; }
    var sk = indF.sec, sec = indSec(), ym = indF.mes, prev = addMes(ym, -1), linhas = indLinhas(sk);
    var mk = indF.metric[sk] || sec.metrics[0].k, m = sec.metrics.find(function (x) { return x.k === mk; }) || sec.metrics[0];
    var tem = indTemDados(sk, ym);
    if (!tem && !indF.auto && S.indicadores.length) { // na primeira abertura, vai para o último mês com dados
      indF.auto = true;
      var ult = S.indicadores.filter(function (x) { return /^\d{4}-\d{2}$/.test(x.id) && x.id <= ym && indTemDados(sk, x.id); }).map(function (x) { return x.id; }).sort().pop();
      if (ult) { indF.mes = ult; return renderIndicadores(); }
    }
    if (tem) indF.auto = true;
    var head = '<div class="view-head"><div><div class="eyebrow">Indicadores</div><h2>' + esc(sec.nome) + '</h2><p class="muted">Lance os números do mês, defina as metas e acompanhe o grupo e cada ' + (sk === "trafego" ? "conta" : "loja") + " contra a meta e contra os meses anteriores.</p></div>" +
      '<div class="row"><button class="btn ghost small" id="inMetas">Metas</button><button class="btn ghost small" id="inPdf">Resumo em PDF</button><button class="btn" id="inLancar">Lançar dados do mês <span class="arrow">→</span></button></div></div>' +
      '<div class="ind-bar"><div class="seg">' + Object.keys(IND_SECS).map(function (k) { return '<button data-insec="' + k + '" aria-pressed="' + (k === sk) + '">' + esc(IND_SECS[k].nome) + "</button>"; }).join("") + "</div>" +
      '<div class="ind-mes"><button class="btn ghost small" data-inmes="-1" aria-label="Mês anterior">‹</button><b>' + esc(mesLabel(ym).replace(/^./, function (c) { return c.toUpperCase(); })) + '</b><button class="btn ghost small" data-inmes="1" aria-label="Próximo mês">›</button><input type="month" id="inMesPick" value="' + ym + '" aria-label="Escolher mês"></div></div>';
    if (!linhas.length) {
      el.innerHTML = head + '<div class="empty">Cadastre ' + (sk === "trafego" ? "as contas / plataformas de tráfego" : "as unidades") + ' para começar. <button class="btn small" id="inAddLinha">+ ' + (sk === "trafego" ? "conta" : "unidade") + "</button></div>";
      indBind(el); return;
    }
    if (!tem) {
      el.innerHTML = head + '<div class="empty">Ainda não há dados de ' + esc(sec.curto) + " em " + esc(mesLabel(ym)) + '. <button class="btn small" id="inLancar2">Lançar agora</button>' + (indTemDados(sk, prev) ? '<p class="hint" style="margin-top:8px">' + esc(mesLabel(prev)) + " já tem dados. Use ‹ para ver.</p>" : "") + "</div>";
      indBind(el); return;
    }

    // 1. cartões do grupo
    var cards = sec.metrics.map(function (x) {
      var v = indValGrupo(sk, ym, x), p = indValGrupo(sk, prev, x), mt = indMeta(sk, ym, null, x), pc = indPct(v, mt, x), st = indStatus(pc, x);
      return '<button class="ind-card' + (x.k === m.k ? " on" : "") + '" data-inmetric="' + x.k + '"><span class="lbl">' + esc(x.l) + (x.calc ? ' <em title="calculado">calc.</em>' : "") + "</span>" +
        '<b class="v">' + esc(indFmt(v, x.f)) + "</b>" +
        (mt != null ? '<div class="ind-meta"><div class="ind-track"><i class="st-' + st + '" style="width:' + Math.max(2, Math.min(100, x.dir === "teto" ? pc : pc)) + '%"></i></div><small>meta ' + esc(indFmt(mt, x.f)) + " · " + indPctHTML(pc, x) + " " + esc(indStLabel(st, x)) + "</small></div>" : '<small class="muted">sem meta</small>') +
        indDeltaHTML(indDelta(v, p, x), "vs " + mesCurto(prev)) + indSpark(sk, ym, x) + "</button>";
    }).join("");

    // 2. loja x loja no indicador escolhido
    var rows = linhas.map(function (l) { var v = indValLinha(sk, ym, l, m), mt = indMeta(sk, ym, l, m); return { l: l, v: v, mt: mt, pc: indPct(v, mt, m), p: indValLinha(sk, prev, l, m) }; });
    var comV = rows.filter(function (r) { return r.v != null; });
    var ordem = comV.slice().sort(function (a, b) { return m.dir === "down" ? a.v - b.v : b.v - a.v; });
    var semV = rows.filter(function (r) { return r.v == null; });
    var escala = Math.max.apply(null, comV.map(function (r) { return Math.abs(r.v); }).concat(comV.map(function (r) { return r.mt != null ? Math.abs(r.mt) : 0; }))) || 1;
    var neg = comV.some(function (r) { return r.v < 0; });
    var bars = ordem.map(function (r, i) {
      var w = Math.abs(r.v) / escala * (neg ? 50 : 100), st = indStatus(r.pc, m), left = neg ? (r.v < 0 ? 50 - w : 50) : 0;
      var tick = r.mt != null ? '<i class="tick" style="left:' + ((neg ? 50 + (r.mt / escala) * 50 : Math.abs(r.mt) / escala * 100)) + '%" title="Meta: ' + esc(indFmt(r.mt, m.f)) + '"></i>' : "";
      return '<div class="ind-brow" title="' + esc(r.l + ": " + indFmt(r.v, m.f) + (r.mt != null ? " · meta " + indFmt(r.mt, m.f) : "")) + '"><span class="n"><em>' + (i + 1) + "º</em> " + esc(r.l) + '</span><div class="ind-btrack">' + (neg ? '<i class="zero"></i>' : "") + '<i class="fill ' + (st ? "st-" + st : "") + '" style="left:' + left + "%;width:" + Math.max(w, 0.8) + '%"></i>' + tick + '</div><span class="v">' + esc(indFmt(r.v, m.f)) + "</span><span>" + (indPctHTML(r.pc, m) || '<span class="muted small">sem meta</span>') + "</span><span>" + indDeltaHTML(indDelta(r.v, r.p, m)) + "</span></div>";
    }).join("") + semV.map(function (r) { return '<div class="ind-brow off"><span class="n">' + esc(r.l) + '</span><div class="ind-btrack"></div><span class="v muted">sem dados</span><span></span><span></span></div>'; }).join("");
    var lojaxloja = '<section class="card pad ind-box"><div class="ind-box-h"><h3>' + (sk === "trafego" ? "Conta x conta" : "Loja x loja") + ' · <span class="hl">' + esc(m.l) + '</span></h3><span class="muted small">' + (m.dir === "down" ? "menor é melhor" : m.dir === "teto" ? "meta = orçamento" : "maior é melhor") + " · a marca | é a meta · clique nos cartões acima para trocar o indicador</span></div>" + bars + "</section>";

    // 3. NPS: distribuição de promotores, neutros e detratores
    var dist = "";
    if (sk === "nps") {
      var seg3 = function (r, lab) {
        var d = indNum(r.detratores), n = indNum(r.neutros), p = indNum(r.promotores);
        if (d == null && n == null && p == null) return "";
        d = d || 0; n = n || 0; p = p || 0; var t = d + n + p || 1;
        var part = function (v, c, nome) { var w = v / t * 100; return w > 0 ? '<i class="' + c + '" style="width:' + w + '%" title="' + esc(nome + ": " + indFmt(v, "pct")) + '">' + (w >= 9 ? indFmt(v, "pct") : "") + "</i>" : ""; };
        return '<div class="ind-drow"><span class="n">' + esc(lab) + '</span><div class="ind-stack">' + part(d, "det", "Detratores") + part(n, "neu", "Neutros") + part(p, "pro", "Promotores") + "</div></div>";
      };
      var gr = {}; ["detratores", "neutros", "promotores"].forEach(function (k) { gr[k] = indValGrupo("nps", ym, sec.metrics.find(function (x) { return x.k === k; })); });
      dist = '<section class="card pad ind-box"><div class="ind-box-h"><h3>Promotores, neutros e detratores</h3><div class="ind-legend"><span><i class="sw det"></i>Detratores</span><span><i class="sw neu"></i>Neutros</span><span><i class="sw pro"></i>Promotores</span></div></div>' +
        seg3(gr, "Grupo") + linhas.map(function (l) { return seg3(indRow("nps", ym, l) || {}, l); }).join("") + "</section>";
    }

    // 4. evolução do grupo + mês a mês por loja
    var ms = indMeses(ym, indF.hist);
    var evo = '<section class="card pad ind-box"><div class="ind-box-h"><h3>Evolução · <span class="hl">' + esc(m.l) + '</span></h3><div class="seg">' + [6, 12].map(function (n) { return '<button data-inhist="' + n + '" aria-pressed="' + (indF.hist === n) + '">' + n + " meses</button>"; }).join("") + "</div></div>" + indLinha(sk, ym, m, indF.hist) +
      '<div class="tbl-wrap" style="margin-top:14px"><table class="tbl ind-tbl"><thead><tr><th>' + esc(sec.linhaNome) + "</th>" + ms.map(function (x) { return '<th class="r">' + mesCurto(x) + "</th>"; }).join("") + '<th class="r">vs mês anterior</th></tr></thead><tbody>' +
      [null].concat(linhas).map(function (l) {
        return "<tr" + (l ? "" : ' class="grp"') + "><td>" + (l ? esc(l) : "<b>Grupo</b>") + "</td>" + ms.map(function (x) { var v = indVal(sk, x, l, m), mt = indMeta(sk, x, l, m), st = indStatus(indPct(v, mt, m), m); return '<td class="r num' + (st ? " c-" + st : "") + '"' + (mt != null && v != null ? ' title="Meta ' + esc(indFmt(mt, m.f)) + '"' : "") + ">" + esc(indFmt(v, m.f)) + "</td>"; }).join("") +
          '<td class="r">' + (indDelta(indVal(sk, ym, l, m), indVal(sk, prev, l, m), m) ? indDeltaHTML(indDelta(indVal(sk, ym, l, m), indVal(sk, prev, l, m), m)) : '<span class="muted small">—</span>') + "</td></tr>";
      }).join("") + '</tbody></table></div><p class="hint">Cor da célula: verde bateu a meta, âmbar chegou perto (85% ou mais), vermelho ficou abaixo. Sem cor = sem meta.</p></section>';

    // 5. tabela completa do mês
    var full = '<section class="card pad ind-box"><div class="ind-box-h"><h3>Todos os indicadores · ' + esc(mesLabel(ym)) + '</h3><button class="btn ghost small" id="inLancar3">Editar números</button></div><div class="tbl-wrap"><table class="tbl ind-tbl"><thead><tr><th>' + esc(sec.linhaNome) + "</th>" + sec.metrics.map(function (x) { return '<th class="r">' + esc(x.l) + "</th>"; }).join("") + "</tr></thead><tbody>" +
      linhas.map(function (l) { return "<tr><td>" + esc(l) + "</td>" + sec.metrics.map(function (x) { var v = indValLinha(sk, ym, l, x); return '<td class="r num">' + esc(indFmt(v, x.f)) + "<br>" + indPctHTML(indPct(v, indMeta(sk, ym, l, x), x), x) + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody><tfoot><tr><td>Grupo</td>' + sec.metrics.map(function (x) { var v = indValGrupo(sk, ym, x); return '<td class="r num">' + esc(indFmt(v, x.f)) + "<br>" + indPctHTML(indPct(v, indMeta(sk, ym, null, x), x), x) + "</td>"; }).join("") + "</tr></tfoot></table></div></section>";

    // 6. comentários / observações
    var obs = linhas.map(function (l) { var r = indRow(sk, ym, l); return r && r.obs ? '<div class="ind-obs"><b>' + esc(l) + "</b><p>" + esc(r.obs) + "</p></div>" : ""; }).join("");
    var obsBox = '<section class="card pad ind-box"><div class="ind-box-h"><h3>' + esc(sec.obs) + '</h3></div>' + (obs ? '<div class="ind-obs-grid">' + obs + "</div>" : '<p class="muted">Nada registrado neste mês. Use <b>Lançar dados do mês</b> para escrever.</p>') + "</section>";

    var nCom = linhas.filter(function (l) { var r = indRow(sk, ym, l); return r && indInputs(sec).some(function (x) { return indNum(r[x.k]) != null; }); }).length;
    var aviso = nCom < linhas.length ? '<div class="banner warn">' + nCom + " de " + linhas.length + " " + (sk === "trafego" ? "contas" : "lojas") + " com dados em " + esc(mesLabel(ym)) + ". O total do grupo considera só as lançadas.</div>" : "";
    el.innerHTML = head + aviso + '<div class="ind-cards">' + cards + "</div>" + lojaxloja + dist + evo + full + obsBox;
    indBind(el);
  }

  function indBind(el) {
    $$("[data-insec]", el).forEach(function (b) { b.onclick = function () { indF.sec = b.dataset.insec; LS.set("indSec", indF.sec); renderIndicadores(); }; });
    $$("[data-inmes]", el).forEach(function (b) { b.onclick = function () { indF.mes = addMes(indF.mes, +b.dataset.inmes); renderIndicadores(); }; });
    if ($("#inMesPick")) $("#inMesPick").onchange = function () { if (/^\d{4}-\d{2}$/.test(this.value)) { indF.mes = this.value; renderIndicadores(); } };
    $$("[data-inmetric]", el).forEach(function (b) { b.onclick = function () { indF.metric[indF.sec] = b.dataset.inmetric; renderIndicadores(); }; });
    $$("[data-inhist]", el).forEach(function (b) { b.onclick = function () { indF.hist = +b.dataset.inhist; renderIndicadores(); }; });
    ["#inLancar", "#inLancar2", "#inLancar3"].forEach(function (s) { if ($(s)) $(s).onclick = function () { indLancar(indF.sec, indF.mes); }; });
    if ($("#inMetas")) $("#inMetas").onclick = function () { indMetasModal(indF.sec, indF.mes); };
    if ($("#inPdf")) $("#inPdf").onclick = function () { indPdfModal(); };
    if ($("#inAddLinha")) $("#inAddLinha").onclick = function () { indNovaLinha(indF.sec, renderIndicadores); };
  }

  function indNovaLinha(sk, then) {
    var sec = IND_SECS[sk], L = listas(), key = sec.linhas;
    var nome = window.prompt(sk === "trafego" ? "Nome da conta / plataforma (ex: AM · Meta Ads)" : "Nome da nova unidade");
    nome = (nome || "").trim(); if (!nome) return;
    if ((L[key] || []).indexOf(nome) >= 0) { toast("Já existe"); return; }
    var patch = {}; patch[key] = (L[key] || []).concat([nome]);
    saveListas(patch).then(function () { toast(sk === "trafego" ? "Conta adicionada" : "Unidade adicionada"); if (then) setTimeout(then, 50); });
  }

  function indInputVal(v, m) {
    if (v == null || v === "") return "";
    if (m.f === "brl") return numBR(v);
    return String(v).replace(".", ",");
  }
  function indParse(s, m) {
    s = String(s || "").trim(); if (!s) return null;
    if (m.f === "brl") return parseBRL(s);
    if (m.f === "min") { var hm = s.match(/^(\d+)\s*[h:]\s*(\d{1,2})?/i); if (hm && /[h:]/i.test(s)) return +hm[1] * 60 + (+hm[2] || 0); }
    s = s.replace(/[%\s]/g, "");
    if (m.f === "int") s = s.replace(/\./g, "");
    s = s.replace(",", ".");
    var n = parseFloat(s); return isNaN(n) ? null : n;
  }

  function indLancar(sk, ym0) {
    var sec = IND_SECS[sk], ins = indInputs(sec), ym = ym0;
    var draw = function () {
      var linhas = indLinhas(sk), d = indMesDoc(ym), dados = (d && d[sk]) || {};
      var copiar = !indTemDados(sk, ym) && indTemDados(sk, addMes(ym, -1));
      var m = openModal('<header><div><div class="eyebrow">' + esc(sec.nome) + '</div><h3>Lançar dados do mês</h3></div><button class="x" data-close>✕</button></header><div class="body">' +
        '<div class="row"><div class="field"><label>Mês</label><input type="month" id="ilMes" value="' + ym + '"></div><p class="hint" style="flex:1;min-width:220px">' +
        (sk === "atend" ? "Números do relatório de atendimento do Bitrix. Tempo em minutos (ou 1h20). Qualidade em %." : sk === "nps" ? "Resultado da pesquisa de cada loja. NPS de -100 a 100; promotores, neutros e detratores em %." : "Números do gerenciador de anúncios. CTR, custo por clique, custo por lead e ROAS são calculados sozinhos.") + " Deixe em branco o que não tiver.</p></div>" +
        (linhas.length ? '<div class="tbl-wrap"><table class="tbl ind-in"><thead><tr><th>' + esc(sec.linhaNome) + "</th>" + ins.map(function (x) { return "<th>" + esc(x.l) + (x.hint ? '<small>' + esc(x.hint) + "</small>" : "") + "</th>"; }).join("") + "</tr></thead><tbody>" +
          linhas.map(function (l, i) { var r = dados[l] || {}; return '<tr><td><b>' + esc(l) + "</b></td>" + ins.map(function (x) { return '<td><input type="text" inputmode="decimal" data-l="' + i + '" data-k="' + x.k + '" value="' + esc(indInputVal(r[x.k], x)) + '" placeholder="' + (x.f === "brl" ? "0,00" : x.f === "min" ? "min" : x.f === "pct" ? "%" : "") + '"></td>'; }).join("") + "</tr>"; }).join("") +
          "</tbody></table></div>" : '<div class="empty">Nenhuma ' + (sk === "trafego" ? "conta" : "unidade") + " cadastrada.</div>") +
        '<div class="row"><button class="btn ghost small" id="ilAdd">+ ' + (sk === "trafego" ? "conta / plataforma" : "unidade") + "</button>" + (copiar ? '<span class="hint">' + esc(mesLabel(ym)) + " está vazio.</span>" : "") + "</div>" +
        '<details class="ind-obs-in"' + (linhas.some(function (l) { return dados[l] && dados[l].obs; }) ? " open" : "") + "><summary>" + esc(sec.obs) + " (por " + (sk === "trafego" ? "conta" : "loja") + ")</summary>" +
          linhas.map(function (l, i) { return '<div class="field"><label>' + esc(l) + '</label><textarea data-obs="' + i + '" placeholder="' + (sk === "nps" ? "Elogios, reclamações, frases que se repetem" : sk === "trafego" ? "Campanhas no ar, o que funcionou, o que mudou" : "O que explica o resultado") + '">' + esc((dados[l] || {}).obs || "") + "</textarea></div>"; }).join("") + "</details>" +
        "</div><footer><span></span><button class=\"btn\" id=\"ilSave\">Salvar <span class=\"arrow\">→</span></button></footer>", { wide: true });
      $("[data-close]", m).onclick = closeModal;
      $("#ilMes").onchange = function () { if (/^\d{4}-\d{2}$/.test(this.value)) { ym = this.value; draw(); } };
      $("#ilAdd").onclick = function () { indNovaLinha(sk, draw); };
      // colar uma coluna vinda de planilha: distribui para as linhas de baixo
      $$("input[data-k]", m).forEach(function (inp) {
        inp.addEventListener("paste", function (e) {
          var t = (e.clipboardData || window.clipboardData).getData("text"); if (!/[\n\t]/.test(t)) return;
          e.preventDefault();
          var linhasTxt = t.replace(/\r/g, "").split("\n").filter(function (x) { return x !== ""; });
          var li = +inp.dataset.l, ki = ins.findIndex(function (x) { return x.k === inp.dataset.k; });
          linhasTxt.forEach(function (row, a) { row.split("\t").forEach(function (cell, b) { var target = $('input[data-l="' + (li + a) + '"][data-k="' + ((ins[ki + b] || {}).k) + '"]', m); if (target) target.value = cell.trim(); }); });
        });
      });
      $("#ilSave").onclick = function () {
        var out = {};
        linhas.forEach(function (l, i) {
          var r = {}, any = false;
          ins.forEach(function (x) { var v = indParse($('input[data-l="' + i + '"][data-k="' + x.k + '"]', m).value, x); if (v != null) { r[x.k] = v; any = true; } });
          var o = $('textarea[data-obs="' + i + '"]', m).value.trim(); if (o) { r.obs = o; any = true; }
          if (any) out[l] = r;
        });
        // mantém o que é de linhas que saíram da lista
        Object.keys(dados).forEach(function (k) { if (linhas.indexOf(k) < 0) out[k] = dados[k]; });
        var patch = {}; patch[sk] = out; patch.atualizadoEm = new Date().toISOString(); patch.atualizadoPor = me;
        var cur = indMesDoc(ym);
        (cur ? Store.upd("indicadores", ym, patch) : Store.set("indicadores", ym, patch)).then(function () { toast("Dados de " + mesLabel(ym) + " salvos"); }, fail);
        indF.mes = ym; closeModal(); renderIndicadores();
      };
    };
    draw();
  }

  function indMetasModal(sk, ym0) {
    var sec = IND_SECS[sk], ym = ym0;
    var draw = function () {
      var linhas = indLinhas(sk), md = indMetasDoc(ym), s = (md && md[sk]) || {}, g = s.geral || {}, ls = s.linhas || {};
      var vigente = md ? md.id.slice(6) : null;
      var m = openModal('<header><div><div class="eyebrow">' + esc(sec.nome) + '</div><h3>Metas</h3></div><button class="x" data-close>✕</button></header><div class="body">' +
        '<div class="row"><div class="field"><label>Valem a partir de</label><input type="month" id="imMes" value="' + ym + '"></div><p class="hint" style="flex:1;min-width:240px">' +
        (vigente ? "Metas em vigor desde " + esc(mesLabel(vigente)) + ". Salvar aqui cria metas novas a partir do mês escolhido; os meses anteriores continuam com as metas antigas." : "Ainda não há metas. Elas valem para o mês escolhido em diante (e para os anteriores, até você criar outras).") + "</p></div>" +
        '<p class="hint">Linha <b>Grupo</b> é a meta do grupo inteiro. Nas lojas, deixe em branco para usar a do grupo (vale para taxas, notas e tempo; totais como atendimentos e respostas precisam de meta por loja, ou o grupo soma as metas das lojas).</p>' +
        '<div class="tbl-wrap"><table class="tbl ind-in"><thead><tr><th></th>' + sec.metrics.map(function (x) { return "<th>" + esc(x.l) + '<small>' + (x.dir === "down" ? "máximo" : x.dir === "teto" ? "orçamento" : "mínimo") + (x.hint ? " · " + esc(x.hint) : "") + "</small></th>"; }).join("") + "</tr></thead><tbody>" +
        '<tr class="grp"><td><b>Grupo</b></td>' + sec.metrics.map(function (x) { return '<td><input type="text" inputmode="decimal" data-l="-1" data-k="' + x.k + '" value="' + esc(indInputVal(g[x.k], x)) + '"></td>'; }).join("") + "</tr>" +
        linhas.map(function (l, i) { var r = ls[l] || {}; return "<tr><td>" + esc(l) + "</td>" + sec.metrics.map(function (x) { return '<td><input type="text" inputmode="decimal" data-l="' + i + '" data-k="' + x.k + '" value="' + esc(indInputVal(r[x.k], x)) + '" placeholder="' + (x.agg === "sum" ? "" : "grupo") + '"></td>'; }).join("") + "</tr>"; }).join("") +
        "</tbody></table></div></div><footer><span></span><button class=\"btn\" id=\"imSave\">Salvar metas <span class=\"arrow\">→</span></button></footer>", { wide: true });
      $("[data-close]", m).onclick = closeModal;
      $("#imMes").onchange = function () { if (/^\d{4}-\d{2}$/.test(this.value)) { ym = this.value; } };
      $("#imSave").onclick = function () {
        var geral = {}, porLinha = {};
        sec.metrics.forEach(function (x) { var v = indParse($('input[data-l="-1"][data-k="' + x.k + '"]', m).value, x); if (v != null) geral[x.k] = v; });
        linhas.forEach(function (l, i) { var r = {}, any = false; sec.metrics.forEach(function (x) { var v = indParse($('input[data-l="' + i + '"][data-k="' + x.k + '"]', m).value, x); if (v != null) { r[x.k] = v; any = true; } }); if (any) porLinha[l] = r; });
        var id = "metas-" + ym, cur = S.indicadores.find(function (x) { return x.id === id; });
        var base = cur ? {} : (function () { var ef = indMetasDoc(ym) || {}, o = {}; Object.keys(IND_SECS).forEach(function (k) { if (ef[k]) o[k] = ef[k]; }); return o; })(); // herda as metas das outras abas
        var doc = Object.assign({}, cur || {}, base); delete doc.id;
        doc[sk] = { geral: geral, linhas: porLinha }; doc.atualizadoEm = new Date().toISOString(); doc.atualizadoPor = me;
        Store.set("indicadores", id, doc).then(function () { toast("Metas salvas"); }, fail);
        closeModal(); renderIndicadores();
      };
    };
    draw();
  }

  function indPdfModal() {
    var ym = indF.mes;
    var m = openModal('<header><h3>Resumo em PDF</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="field"><label>Mês</label><input type="month" id="ipMes" value="' + ym + '"></div>' +
      '<div class="field"><label>O que entra</label><div class="ind-checks">' + Object.keys(IND_SECS).map(function (k) { return '<label><input type="checkbox" data-ipsec="' + k + '"' + (k === indF.sec ? " checked" : "") + "> " + esc(IND_SECS[k].nome) + "</label>"; }).join("") + "</div></div>" +
      '<div class="field"><label>Comparar com</label><select id="ipHist"><option value="3">3 meses anteriores</option><option value="6" selected>6 meses anteriores</option><option value="12">12 meses anteriores</option></select></div>' +
      '<label class="ind-checks"><input type="checkbox" id="ipObs" checked> Incluir comentários e observações</label>' +
      '<p class="hint">Abre o relatório numa janela nova. Na janela de impressão, escolha <b>Salvar como PDF</b>.</p></div>' +
      '<footer><span></span><button class="btn" id="ipGo">Gerar PDF <span class="arrow">→</span></button></footer>');
    $("[data-close]", m).onclick = closeModal;
    $("#ipGo").onclick = function () {
      var mes = /^\d{4}-\d{2}$/.test($("#ipMes").value) ? $("#ipMes").value : ym;
      var secs = $$("[data-ipsec]", m).filter(function (c) { return c.checked; }).map(function (c) { return c.dataset.ipsec; });
      if (!secs.length) { toast("Escolha pelo menos uma parte"); return; }
      var hist = +$("#ipHist").value, comObs = $("#ipObs").checked;
      closeModal();
      indRelatorio(mes, secs, hist, comObs);
    };
  }

  function indRelatorio(ym, secs, hist, comObs) {
    var prev = addMes(ym, -1), ms = indMeses(ym, hist + 1);
    var pct = function (v, mt, x) { var p = indPct(v, mt, x); if (p == null) return ""; var st = indStatus(p, x); return '<span class="pill p-' + st + '">' + indPctTxt(p) + "% · " + esc(indStLabel(st, x)) + "</span>"; };
    var dl = function (v, p, x) { var d = indDelta(v, p, x); if (!d) return '<span class="muted">—</span>'; return '<span class="' + (d.bom === true ? "ok" : d.bom === false ? "bad" : "") + '">' + d.seta + " " + esc(d.txt) + "</span>"; };
    var kpis = [];
    secs.forEach(function (sk) { var sec = IND_SECS[sk]; sec.metrics.filter(function (x) { return !x.calc; }).slice(0, sk === "trafego" ? 1 : 2).forEach(function (x) { var v = indValGrupo(sk, ym, x), mt = indMeta(sk, ym, null, x), p = indPct(v, mt, x); kpis.push([x.l, esc(indFmt(v, x.f)) + (p != null ? ' <small style="font-size:11px;color:#6b6b6b">' + indPctTxt(p) + "% da meta</small>" : "")]); }); });
    if (secs.indexOf("trafego") >= 0) { var ro = IND_SECS.trafego.metrics.find(function (x) { return x.k === "roas"; }); kpis.push(["ROAS", esc(indFmt(indValGrupo("trafego", ym, ro), "x"))]); }
    abrirRelatorio({
      titulo: "Indicadores " + mesLabel(ym), heading: "Indicadores · " + mesLabel(ym),
      sub: secs.map(function (k) { return IND_SECS[k].nome; }).join(" · "),
      kpis: kpis.slice(0, 8),
      body: function () {
        var css = "<style>.p-ok{background:#d8f5e3;color:#11623a}.p-warn{background:#fff1d1;color:#8a5a00}.p-late{background:#ffdcdc;color:#9a1c1c}span.ok{color:#11623a;font-weight:600}span.bad{color:#9a1c1c;font-weight:600}.c-ok{background:#eefaf2}.c-warn{background:#fff8e6}.c-late{background:#fff0f0}" +
          ".bars{margin-top:6px}.bar{display:grid;grid-template-columns:130px 1fr 90px 120px;gap:8px;align-items:center;margin:4px 0;font-size:11px}.bt{position:relative;height:12px;background:#f1f1f1;border-radius:3px}.bt i{position:absolute;top:0;bottom:0;left:0;border-radius:3px;background:#141414}.bt i.ok{background:#1f9d57}.bt i.warn{background:#d99a00}.bt i.late{background:#d64545}.bt b{position:absolute;top:-3px;bottom:-3px;width:2px;background:#141414}" +
          ".stk{display:flex;height:16px;border-radius:3px;overflow:hidden;gap:2px}.stk i{display:flex;align-items:center;justify-content:center;color:#fff;font-style:normal;font-size:9.5px;font-weight:600}.stk .det{background:#d64545}.stk .neu{background:#9a9a9a}.stk .pro{background:#1f9d57}.lg span{display:inline-flex;align-items:center;gap:4px;margin-right:12px;font-size:10.5px}.lg i{width:10px;height:10px;border-radius:2px;display:inline-block}" +
          ".cm{columns:2;gap:12px}.cm .box{margin-top:0;margin-bottom:10px}td small{color:#6b6b6b}</style>";
        return css + secs.map(function (sk, si) {
          var sec = IND_SECS[sk], linhas = indLinhas(sk);
          if (!indTemDados(sk, ym)) return '<h2 class="sec' + (si ? " pb" : "") + '">' + esc(sec.nome) + '</h2><p class="muted">Sem dados lançados em ' + esc(mesLabel(ym)) + ".</p>";
          var h = '<h2 class="sec' + (si ? " pb" : "") + '">' + esc(sec.nome) + " · grupo</h2>" +
            "<table><thead><tr><th>Indicador</th><th class=\"r\">" + mesCurto(ym) + '</th><th class="r">Meta</th><th>% da meta</th><th class="r">' + mesCurto(prev) + "</th><th>Variação</th></tr></thead><tbody>" +
            sec.metrics.map(function (x) { var v = indValGrupo(sk, ym, x), p = indValGrupo(sk, prev, x), mt = indMeta(sk, ym, null, x); return "<tr><td><b>" + esc(x.l) + '</b></td><td class="r">' + esc(indFmt(v, x.f)) + '</td><td class="r">' + esc(indFmt(mt, x.f)) + "</td><td>" + pct(v, mt, x) + '</td><td class="r">' + esc(indFmt(p, x.f)) + "</td><td>" + dl(v, p, x) + "</td></tr>"; }).join("") + "</tbody></table>";
          h += '<h2 class="sec">' + (sk === "trafego" ? "Conta x conta" : "Loja x loja") + "</h2><table><thead><tr><th>" + esc(sec.linhaNome) + "</th>" + sec.metrics.map(function (x) { return '<th class="r">' + esc(x.l) + "</th>"; }).join("") + "</tr></thead><tbody>" +
            linhas.map(function (l) { return "<tr><td><b>" + esc(l) + "</b></td>" + sec.metrics.map(function (x) { var v = indValLinha(sk, ym, l, x), mt = indMeta(sk, ym, l, x), p = indPct(v, mt, x), st = indStatus(p, x); return '<td class="r' + (st ? " c-" + st : "") + '">' + esc(indFmt(v, x.f)) + (p != null ? "<br><small>" + indPctTxt(p) + "% meta</small>" : "") + "</td>"; }).join("") + "</tr>"; }).join("") +
            "</tbody></table>";
          // barras do indicador principal
          var main = sec.metrics[0], rows = linhas.map(function (l) { var v = indValLinha(sk, ym, l, main); return { l: l, v: v, mt: indMeta(sk, ym, l, main) }; }).filter(function (r) { return r.v != null; }).sort(function (a, b) { return main.dir === "down" ? a.v - b.v : b.v - a.v; });
          var esc2 = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.v); }).concat(rows.map(function (r) { return r.mt ? Math.abs(r.mt) : 0; }))) || 1;
          if (rows.length && !rows.some(function (r) { return r.v < 0; })) h += '<div class="box"><h3>' + esc(main.l) + ' por ' + (sk === "trafego" ? "conta" : "loja") + '</h3><div class="muted" style="font-size:10.5px">a barra preta vertical é a meta</div><div class="bars">' + rows.map(function (r) { var p = indPct(r.v, r.mt, main), st = indStatus(p, main); return '<div class="bar"><span>' + esc(r.l) + '</span><div class="bt"><i class="' + (st || "") + '" style="width:' + (r.v / esc2 * 100) + '%"></i>' + (r.mt != null ? '<b style="left:' + (r.mt / esc2 * 100) + '%"></b>' : "") + "</div><span><b>" + esc(indFmt(r.v, main.f)) + "</b></span><span>" + pct(r.v, r.mt, main) + "</span></div>"; }).join("") + "</div></div>";
          if (sk === "nps") {
            var sg = function (r, lab) { var d = indNum(r.detratores) || 0, n = indNum(r.neutros) || 0, p = indNum(r.promotores) || 0, t = d + n + p; if (!t) return ""; var pt = function (v, c) { var w = v / t * 100; return w > 0 ? '<i class="' + c + '" style="width:' + w + '%">' + (w >= 8 ? Math.round(v) + "%" : "") + "</i>" : ""; }; return '<div class="bar" style="grid-template-columns:130px 1fr"><span>' + esc(lab) + '</span><div class="stk">' + pt(d, "det") + pt(n, "neu") + pt(p, "pro") + "</div></div>"; };
            var gr = {}; ["detratores", "neutros", "promotores"].forEach(function (k) { gr[k] = indValGrupo("nps", ym, sec.metrics.find(function (x) { return x.k === k; })); });
            h += '<div class="box"><h3>Promotores, neutros e detratores</h3><div class="lg"><span><i style="background:#d64545"></i>Detratores</span><span><i style="background:#9a9a9a"></i>Neutros</span><span><i style="background:#1f9d57"></i>Promotores</span></div><div class="bars">' + sg(gr, "Grupo") + linhas.map(function (l) { return sg(indRow("nps", ym, l) || {}, l); }).join("") + "</div></div>";
          }
          // comparativo com meses anteriores
          var comp = sec.metrics.filter(function (x) { return !x.calc || sk === "trafego"; }).slice(0, sk === "trafego" ? 10 : 6);
          h += '<h2 class="sec">Grupo mês a mês</h2><table><thead><tr><th>Indicador</th>' + ms.map(function (x) { return '<th class="r">' + mesCurto(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
            comp.map(function (x) { return "<tr><td><b>" + esc(x.l) + "</b></td>" + ms.map(function (mm) { var v = indValGrupo(sk, mm, x), st = indStatus(indPct(v, indMeta(sk, mm, null, x), x), x); return '<td class="r' + (st ? " c-" + st : "") + '">' + esc(indFmt(v, x.f)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
          h += '<h2 class="sec">' + esc(main.l) + " por " + (sk === "trafego" ? "conta" : "loja") + ", mês a mês</h2><table><thead><tr><th>" + esc(sec.linhaNome) + "</th>" + ms.map(function (x) { return '<th class="r">' + mesCurto(x) + "</th>"; }).join("") + "</tr></thead><tbody>" +
            linhas.map(function (l) { return "<tr><td><b>" + esc(l) + "</b></td>" + ms.map(function (mm) { var v = indValLinha(sk, mm, l, main), st = indStatus(indPct(v, indMeta(sk, mm, l, main), main), main); return '<td class="r' + (st ? " c-" + st : "") + '">' + esc(indFmt(v, main.f)) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
          if (comObs) { var ob = linhas.map(function (l) { var r = indRow(sk, ym, l); return r && r.obs ? '<div class="box"><h3>' + esc(l) + '</h3><div class="txt">' + esc(r.obs) + "</div></div>" : ""; }).join(""); if (ob) h += '<h2 class="sec">' + esc(sec.obs) + '</h2><div class="cm">' + ob + "</div>"; }
          return h;
        }).join("") + '<p class="muted" style="margin-top:14px;font-size:10px">Cores: verde bateu a meta, âmbar chegou a 85% ou mais, vermelho ficou abaixo. Em investimento, a meta é o orçamento: verde é dentro dele.</p>';
      }
    });
  }

  /* ================================================================
     BACKUP (só admins) · baixa tudo num arquivo e restaura se precisar
     ================================================================ */
  function backupInfo() { return S.config.find(function (x) { return x.id === "backup"; }) || null; }
  function diasDesde(isoStr) { if (!isoStr) return null; return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000); }
  function baixarBackup() {
    if (!isAdmin()) return;
    toast("Montando o backup…");
    var perfisP = Store.mode === "supabase" && Store.perfis ? Store.perfis.list().catch(function () { return []; }) : Promise.resolve([]);
    perfisP.then(function (perfis) {
      var dados = {}, total = 0;
      Object.keys(S).forEach(function (col) {
        var list = R[col] || S[col] || [];
        dados[col] = list.map(function (d) { return Object.assign({}, d); });
        total += list.length;
      });
      var agora = new Date();
      var pacote = { app: "Fluxo do Time · SCOPO", formato: 1, geradoEm: agora.toISOString(), por: me, itens: total, perfis: perfis, dados: dados,
        aviso: "Os anexos (fotos, PDFs, planilhas) continuam no Supabase; aqui ficam os textos e a lista de anexos." };
      var blob = new Blob([JSON.stringify(pacote)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "fluxo-do-time-backup-" + iso(agora) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      Store.set("config", "backup", { em: agora.toISOString(), por: me, itens: total }).catch(function () {});
      toast("Backup baixado: " + total + " itens");
    });
  }
  function restaurarBackup(file, done) {
    var rd = new FileReader();
    rd.onload = function () {
      var p;
      try { p = JSON.parse(rd.result); } catch (e) { toast("Arquivo inválido"); return; }
      if (!p || !p.dados || p.app !== "Fluxo do Time · SCOPO") { toast("Este arquivo não é um backup do Fluxo do Time"); return; }
      var cols = Object.keys(p.dados).filter(function (c) { return S[c] && Array.isArray(p.dados[c]); });
      var n = cols.reduce(function (t, c) { return t + p.dados[c].length; }, 0);
      var m = openModal('<header><h3>Restaurar backup</h3><button class="x" data-close>✕</button></header><div class="body">' +
        '<p>Backup de <b>' + esc(fmt(new Date(p.geradoEm))) + "/" + new Date(p.geradoEm).getFullYear() + "</b>, feito por " + esc(p.por || "—") + ", com <b>" + n + " itens</b>.</p>" +
        '<p class="muted">Cada item do backup volta como estava naquele dia. O que foi criado depois do backup continua no sistema (nada é apagado). Itens alterados depois do backup voltam para a versão do backup.</p>' +
        '<div class="field"><label>Para confirmar, escreva RESTAURAR</label><input type="text" id="rbOk" autocomplete="off"></div><p class="hint" id="rbSt"></p></div>' +
        '<footer><span></span><button class="btn danger" id="rbGo">Restaurar</button></footer>');
      $("[data-close]", m).onclick = closeModal;
      $("#rbGo").onclick = function () {
        if ($("#rbOk").value.trim().toUpperCase() !== "RESTAURAR") { $("#rbOk").focus(); return; }
        $("#rbGo").disabled = true;
        var feitos = 0, erros = 0, fila = [];
        cols.forEach(function (c) { p.dados[c].forEach(function (d) { if (d && d.id && !(c === "config" && d.id === "backup")) fila.push([c, d]); }); });
        fila.reduce(function (pr, it) {
          return pr.then(function () {
            var doc = Object.assign({}, it[1]), id = doc.id; delete doc.id;
            return Store.set(it[0], id, doc).then(function () { feitos++; }, function () { erros++; }).then(function () { if (feitos % 10 === 0 && $("#rbSt")) $("#rbSt").textContent = feitos + " de " + fila.length + "…"; });
          });
        }, Promise.resolve()).then(function () {
          closeModal(); toast("Restaurado: " + feitos + " itens" + (erros ? " (" + erros + " com erro)" : ""));
          if (done) done();
        });
      };
    };
    rd.readAsText(file);
  }
  function backupSectionHTML() {
    var b = backupInfo(), d = b ? diasDesde(b.em) : null;
    return '<section class="card pad adm" id="admBackup"><h3>Backup</h3>' +
      '<p class="muted">Baixa tudo do sistema (pauta, quadros, verba, reuniões, campanhas, eventos, indicadores, acessos) num arquivo. Guarde no Drive. Faça pelo menos uma vez por semana.</p>' +
      '<p class="bk-last ' + (d == null || d > 7 ? "late" : "ok") + '">' + (b ? "Último backup: " + esc(fmt(new Date(b.em))) + " (" + (d === 0 ? "hoje" : d === 1 ? "ontem" : "há " + d + " dias") + "), por " + esc(b.por || "—") + ", " + (b.itens || 0) + " itens." : "Nenhum backup feito ainda.") + "</p>" +
      '<div class="row"><button class="btn small" id="bkDown">Baixar backup <span class="arrow">↓</span></button><label class="btn ghost small bk-up">Restaurar de um arquivo<input type="file" accept=".json,application/json" id="bkUp" hidden></label></div>' +
      '<p class="hint">Os anexos continuam guardados no Supabase; o backup leva os textos e a referência de cada anexo.</p></section>';
  }
  function bindBackup(el) {
    if ($("#bkDown", el)) $("#bkDown", el).onclick = baixarBackup;
    if ($("#bkUp", el)) $("#bkUp", el).onchange = function () { var f = this.files[0]; this.value = ""; if (f) restaurarBackup(f); };
  }
  // lembrete para admins quando o último backup passou de 7 dias
  function backupLembrete() {
    var box = $("#bkBanner");
    if (!box) { box = document.createElement("div"); box.id = "bkBanner"; var bb = $("#bootBanner"); if (!bb) return; bb.parentNode.insertBefore(box, bb.nextSibling); }
    if (!isAdmin() || !loaded.config || !S.pessoas.length || view === "admin") { box.innerHTML = ""; return; }
    var b = backupInfo(), d = b ? diasDesde(b.em) : null;
    if (d != null && d <= 7) { box.innerHTML = ""; return; }
    if (LS.get("bkAdiado", "") === iso(today())) { box.innerHTML = ""; return; }
    box.innerHTML = '<div class="banner warn bk-banner"><span>' + (b ? "Faz " + d + " dias do último backup." : "Você ainda não fez nenhum backup do sistema.") + ' Leva 2 segundos.</span><span class="row"><button class="btn small" id="bkNow">Baixar backup</button><button class="btn ghost small" id="bkLater">Amanhã</button></span></div>';
    $("#bkNow").onclick = function () { baixarBackup(); box.innerHTML = ""; };
    $("#bkLater").onclick = function () { LS.set("bkAdiado", iso(today())); box.innerHTML = ""; };
  }

  /* ================================================================
     ANEXOS MAIS LEVES · reduz fotos antes de subir
     ================================================================ */
  var IMG_MAX_LADO = 2000, IMG_QUAL = 0.82, IMG_MIN_BYTES = 350 * 1024;
  function comprimirImagem(f) {
    return new Promise(function (res) {
      if (!f || !/^image\/(jpeg|png|webp|heic|heif)$/i.test(f.type || "") || f.size < IMG_MIN_BYTES) { res(f); return; }
      var url = URL.createObjectURL(f), img = new Image();
      var fim = function (out) { URL.revokeObjectURL(url); res(out); };
      img.onerror = function () { fim(f); };
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, IMG_MAX_LADO / Math.max(w, h));
          var c = document.createElement("canvas"); c.width = Math.round(w * k); c.height = Math.round(h * k);
          var ctx = c.getContext("2d");
          var png = /png/i.test(f.type);
          if (!png) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          var tipo = "image/webp";
          var test = c.toDataURL("image/webp", 0.1);
          if (test.indexOf("data:image/webp") !== 0) { if (png) { fim(f); return; } tipo = "image/jpeg"; } // sem webp: png fica como está (transparência)
          c.toBlob(function (bl) {
            if (!bl || bl.size >= f.size * 0.9) { fim(f); return; }
            var nome = f.name.replace(/\.[^.]+$/, "") + (tipo === "image/webp" ? ".webp" : ".jpg");
            var nf; try { nf = new File([bl], nome, { type: tipo, lastModified: Date.now() }); } catch (e) { bl.name = nome; nf = bl; }
            fim(nf);
          }, tipo, IMG_QUAL);
        } catch (e) { fim(f); }
      };
      img.src = url;
    });
  }
  var VIDEO_AVISO = 15 * 1024 * 1024;

  /* ================================================================
     ABAS · setas para rolar no computador
     ================================================================ */
  function initTabsScroll() {
    var tabs = $("#tabs"); if (!tabs || tabs.parentNode.classList.contains("tabs-wrap")) return;
    var wrap = document.createElement("div"); wrap.className = "tabs-wrap";
    tabs.parentNode.insertBefore(wrap, tabs); wrap.appendChild(tabs);
    var mk = function (dir) { var b = document.createElement("button"); b.type = "button"; b.className = "tabs-arrow " + (dir < 0 ? "left" : "right"); b.setAttribute("aria-label", dir < 0 ? "Ver abas anteriores" : "Ver mais abas"); b.innerHTML = dir < 0 ? "‹" : "›"; b.onclick = function () { tabs.scrollBy({ left: dir * Math.max(200, tabs.clientWidth * 0.6), behavior: "smooth" }); }; return b; };
    var L = mk(-1), Rr = mk(1); wrap.insertBefore(L, tabs); wrap.appendChild(Rr);
    var upd = function () {
      var max = tabs.scrollWidth - tabs.clientWidth;
      var ini = tabs.scrollLeft > 4, fim = tabs.scrollLeft < max - 4;
      wrap.classList.toggle("can-left", ini); wrap.classList.toggle("can-right", max > 4 && fim);
    };
    tabs.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", upd);
    // rodinha do mouse rola as abas para o lado
    tabs.addEventListener("wheel", function (e) {
      if (tabs.scrollWidth <= tabs.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault(); tabs.scrollLeft += e.deltaY;
    }, { passive: false });
    // arrastar com o mouse
    var dragX = null, startL = 0, moved = false;
    tabs.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse") return; dragX = e.clientX; startL = tabs.scrollLeft; moved = false; });
    window.addEventListener("pointermove", function (e) { if (dragX == null) return; var dx = e.clientX - dragX; if (Math.abs(dx) > 5) { moved = true; tabs.scrollLeft = startL - dx; } });
    window.addEventListener("pointerup", function () { dragX = null; });
    tabs.addEventListener("click", function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);
    if (window.ResizeObserver) new ResizeObserver(upd).observe(tabs);
    tabsScrollUpd = function () { upd(); var sel = $('#tabs button[aria-selected="true"]'); if (sel && !sel.hidden) { var l = sel.offsetLeft - tabs.offsetLeft, r = l + sel.offsetWidth; if (l < tabs.scrollLeft + 30 || r > tabs.scrollLeft + tabs.clientWidth - 30) tabs.scrollTo({ left: Math.max(0, l - 40), behavior: "smooth" }); } };
    setTimeout(tabsScrollUpd, 50);
  }
  var tabsScrollUpd = function () {};

  /* ================================================================
     CONTA (antigo Ajustes)
     ================================================================ */
  $("#openSettings").onclick = function () {
    var modo = { claude: "Prévia no Claude: base compartilhada da prévia.", supabase: "Base do time no Supabase, com login.", local: "Só neste navegador. Para o time usar a mesma base, preencha o config.js (veja o guia)." }[Store ? Store.mode : "local"];
    openModal('<header><h3>Sua conta</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<p><b>' + esc(me) + '</b> · <span class="tag ' + (isAdmin() ? "solid" : "") + '">' + (isAdmin() ? "admin" : "membro") + "</span>" + (Store && Store.perfil ? ' <span class="hint">' + esc(Store.perfil.email) + "</span>" : "") + "</p>" +
      '<p class="hint">' + esc(modo) + "</p>" +
      (isAdmin() ? '<p class="muted">Listas, categorias, etiquetas e acessos ficam na aba <b>Admin</b>.</p>' : "") +
      '</div><footer><span>' + (Store && Store.logout ? '<button class="btn ghost small" id="stOut">Sair</button>' : "") + "</span>" + (isAdmin() ? '<button class="btn" id="stAdm">Abrir Admin <span class="arrow">→</span></button>' : '<button class="btn" data-close>Fechar</button>') + "</footer>");
    $$("[data-close]").forEach(function (b) { b.onclick = closeModal; });
    if ($("#stOut")) $("#stOut").onclick = function () { Store.logout(); };
    if ($("#stAdm")) $("#stAdm").onclick = function () { closeModal(); showView("admin"); };
  };

  /* ================================================================
     boot
     ================================================================ */
  $$("#tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === view)); });
  $$("section.view").forEach(function (s) { s.hidden = s.id !== "v-" + view; });

  initTabsScroll();
  var renderSoon = (function () { var t = null; return function () { if (t) return; t = requestAnimationFrame(function () { t = null; if (!drag || !drag.started) { if ($("#mb") && (openCardId || ["verba", "cofre", "visitas", "eventosorg", "campanhas", "reunioes", "indicadores", "midia", "fornecedores"].indexOf(view) >= 0)) return; if (view === "tabloide" && $("#tbFrame")) return; render(); } }); }; })();

  window.GestaoStore.init().then(function (st) {
    Store = st;
    guardStore();
    if (Store.mode === "supabase" && Store.perfil) { me = Store.perfil.nome; }
    render();
    Object.keys(S).forEach(function (col) {
      Store.sub(col, function (list) {
        R[col] = list; S[col] = isAdmin() ? list : list.filter(function (d) { return canRead(col, d); }); loaded[col] = true;
        if (col === "config" && Store.mode !== "supabase") refilter(); // na prévia, papéis vêm da config
        if (col === "pessoas" || col === "config") syncEquipe();
        if (Store.mode !== "local" && loaded.pessoas && loaded.modelos && !S.pessoas.length && !S.modelos.length) {
          $("#bootBanner").innerHTML = '<div class="banner warn" style="margin-bottom:16px">A base está vazia. ' + (isAdmin() ? '<button class="btn small" id="bootSeed">Carregar conteúdo padrão</button>' : "Peça a um administrador para carregar o conteúdo inicial.") + "</div>";
          if ($("#bootSeed")) $("#bootSeed").onclick = function () { Store.seed(window.GESTAO_DEFAULTS).then(function () { $("#bootBanner").innerHTML = ""; toast("Padrão carregado"); }, fail); };
        } else if (col === "pessoas" && S.pessoas.length) $("#bootBanner").innerHTML = "";
        renderSoon();
      }, function () { $("#bootBanner").innerHTML = '<div class="banner warn">A conexão com a base caiu. Recarregue a página.</div>'; });
    });
    setInterval(function () { if (view === "pauta" && $("#pNow")) $("#pNow").innerHTML = nowHTML(); }, 60000);
  }).catch(function (e) {
    console.error(e);
    $("#bootBanner").innerHTML = '<div class="banner warn">Não consegui conectar à base. Confira a internet e o config.js, e recarregue.</div>';
  });
})();
