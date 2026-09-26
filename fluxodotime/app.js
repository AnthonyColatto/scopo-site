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
  var S = { pauta: [], pessoas: [], ciclo: [], modelos: [], quadros: [], cartoes: [], config: [], eventos: [], mapas: [], nfs: [], contratos: [], orcamento: [], cooperada: [], cofre: [], visitas: [] };
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
      setoresVisita: c.setoresVisita || D.setoresVisita || ["Limpeza"]
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
  var FIN = ["nfs", "contratos", "orcamento", "cooperada"];
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
    if (col === "pauta") return d.resp === me || d.criadoPor === me;
    if (col === "cartoes") return (d.resp || []).indexOf(me) >= 0 || d.criadoPor === me;
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
    if (!adm && (view === "verba" || view === "admin")) { view = "pauta"; $$("#tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === view)); }); $$("section.view").forEach(function (s) { s.hidden = s.id !== "v-" + view; }); }
    var fn = { pauta: renderPauta, quadros: renderQuadros, calendario: renderCalendario, mapa: renderMapa, verba: renderVerba, admin: renderAdmin, cofre: renderCofre, visitas: renderVisitas, semana: renderSemana, ciclo: renderCiclo, time: renderTime, modelos: renderModelos }[view];
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
          '<div class="opts"><div class="seg" id="addConta"></div><select id="addResp" aria-label="Responsável"></select><select id="addReuniao" aria-label="Levar para reunião"></select><select id="addArea" aria-label="Frente"></select><input type="date" id="addPrazo" aria-label="Prazo"></div>' +
        "</form>" +
        '<div class="stats" id="pStats"></div>' +
        '<div class="filters"><span class="lbl">Filtrar</span><select id="fR" aria-label="Reunião"></select><select id="fC" aria-label="Conta"></select><select id="fP" aria-label="Responsável"></select><select id="fV" aria-label="Vencimento"></select><span id="fPer" class="row" hidden><input type="date" id="fDe" aria-label="De" style="width:auto"><span class="hint">até</span><input type="date" id="fAte" aria-label="Até" style="width:auto"></span><button type="button" class="linkbtn" id="fMine">só as minhas</button><button type="button" class="linkbtn" id="fClear">limpar filtros</button></div>' +
        '<div id="pMeet"></div><div id="pList"></div>';
      $("#addForm").addEventListener("submit", function (e) {
        e.preventDefault();
        var t = $("#addTitle").value.trim(); if (!t) { $("#addTitle").focus(); return; }
        Store.add("pauta", { titulo: t, conta: addConta, resp: $("#addResp").value, reuniao: $("#addReuniao").value, area: $("#addArea").value || "Outro", prazo: $("#addPrazo").value, status: "aberto", notas: "", criadoEm: new Date().toISOString(), criadoPor: me })
          .then(function () { toast("Na pauta"); }, fail);
        $("#addTitle").value = ""; $("#addPrazo").value = ""; $("#addTitle").focus();
      });
      $("#addResp").addEventListener("change", function () { addRespSel = this.value; });
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
    var vis = S.pauta.filter(function (i) { return (f.reuniao === "*" || i.reuniao === f.reuniao) && (!f.conta || i.conta === f.conta) && (!f.resp || i.resp === f.resp) && (!focoMeu() || i.resp === me) && vencOk(i); });
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
      '<div class="field"><label>Anotações</label><textarea id="piN" placeholder="Contexto, combinados, links">' + esc(it.notas || "") + "</textarea></div>" +
      (boards.length ? '<div class="field"><label>Virar cartão num quadro</label><div class="row"><select id="piB" style="width:auto">' + boards.map(function (q) { return '<option value="' + esc(q.id) + '">' + esc(q.nome) + "</option>"; }).join("") + '</select><button class="btn ghost small" id="piToCard" type="button">Criar cartão</button></div><p class="hint">O cartão vai para a primeira coluna com título, conta, responsável, prazo e anotações.</p></div>' : "") +
      "</div>" +
      '<footer><span class="hint">Criado por ' + esc(it.criadoPor || "—") + '</span><button class="btn" id="piSave">Salvar <span class="arrow">→</span></button></footer>'
    );
    $("[data-close]").onclick = closeModal;
    $("#piSave").onclick = function () {
      Store.upd("pauta", it.id, { titulo: $("#piT").value.trim() || it.titulo, conta: $("#piC").value, resp: $("#piR").value, reuniao: $("#piM").value, area: $("#piA").value, prazo: $("#piP").value, status: $("#piS").value, notas: $("#piN").value })
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

  function cardHTML(c) {
    var t0 = today(), p = parse(c.prazo);
    var cl = c.checklist || [], ok = cl.filter(function (x) { return x.ok; }).length;
    var due = "";
    if (p) {
      var diff = (p - t0) / 864e5, cls = diff < 0 ? "late" : diff <= 1 ? "soon" : "";
      due = '<span class="badge ' + cls + '">◷ ' + fmt(p) + "</span>";
    }
    var nAtt = (c.anexos || []).length;
    return '<div class="kcard" data-card="' + esc(c.id) + '" tabindex="0">' +
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
      var cs = cardsOf(q.id, col.id).filter(function (c) { return (!boardF.conta || c.conta === boardF.conta) && (!boardF.pessoa || (c.resp || []).indexOf(boardF.pessoa) >= 0) && (!focoMeu() || (c.resp || []).indexOf(me) >= 0); });
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
    Store.add("cartoes", { quadro: q.id, coluna: col, ordem: nextOrder(q.id, col), titulo: t, desc: "", conta: boardF.conta || "Ambas", resp: boardF.pessoa ? [boardF.pessoa] : [], prazo: "", etiquetas: [], checklist: [], comentarios: [], criadoEm: new Date().toISOString(), criadoPor: me }).catch(fail);
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
    card.coluna = colId; card.ordem = ordem; // otimista
    renderQuadros();
    Store.upd("cartoes", st.id, { coluna: colId, ordem: ordem }).catch(fail);
  }

  /* ---------- cartão aberto ---------- */
  var openCardId = null;
  function openCard(id) {
    var c = S.cartoes.find(function (x) { return x.id === id; }); if (!c) return;
    openCardId = id;
    drawCardModal(c);
  }
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
      '<div class="body"><div class="m-grid"><div style="display:grid;gap:16px;align-content:start">' +
        '<div class="field"><label>Etiquetas</label><div class="lblpick" id="cL">' + L.etiquetas.map(function (e) { return '<button type="button" data-lbl="' + esc(e.nome) + '" aria-pressed="' + ((c.etiquetas || []).indexOf(e.nome) >= 0) + '" style="background:' + esc(e.cor) + '">' + esc(e.nome) + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><div class="section-title"><label>Descrição / briefing</label><span class="row">' + S.modelos.slice().sort(byOrder).slice(0, 3).map(function (m) { return '<button class="linkbtn" data-tpl="' + esc(m.id) + '">usar: ' + esc(m.titulo.split("·")[0].trim()) + "</button>"; }).join(" ") + '</span></div><textarea id="cD" style="min-height:160px" placeholder="Briefing, referências, links">' + esc(c.desc || "") + "</textarea></div>" +
        '<div class="field" id="cAttWrap"></div>' +
        '<div class="field"><label>Checklist ' + (cl.length ? ok + "/" + cl.length : "") + "</label>" +
          (cl.length ? '<div class="progress"><i style="width:' + Math.round(ok / cl.length * 100) + '%"></i></div>' : "") +
          '<ul class="cl">' + cl.map(function (x) { return '<li class="' + (x.ok ? "ok" : "") + '"><button class="check ' + (x.ok ? "on" : "") + '" data-clt="' + esc(x.id) + '" aria-label="Marcar"></button><span>' + esc(x.t) + '</span><button class="x" data-cld="' + esc(x.id) + '" aria-label="Remover">✕</button></li>'; }).join("") + "</ul>" +
          '<div class="row"><input type="text" id="clNew" placeholder="Adicionar item" style="flex:1"><button class="btn ghost small" id="clAdd">Adicionar</button></div></div>' +
        '<div class="field"><label>Comentários</label><div class="row"><input type="text" id="cmNew" placeholder="Escreva um comentário como ' + esc(me) + '" style="flex:1"><button class="btn ghost small" id="cmAdd">Comentar</button></div>' +
          '<div class="comments">' + (c.comentarios || []).slice().reverse().map(function (m) { var d = new Date(m.em); return '<div class="comment"><div class="who"><b>' + esc(m.autor) + "</b> · " + fmt(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + "</div>" + esc(m.texto) + "</div>"; }).join("") + "</div></div>" +
      "</div>" +
      '<div style="display:grid;gap:14px;align-content:start">' +
        '<div class="field"><label>Coluna</label><select id="cCol">' + (q.colunas || []).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === c.coluna ? " selected" : "") + ">" + esc(x.nome) + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>Quadro</label><select id="cQ">' + S.quadros.slice().sort(byOrder).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === c.quadro ? " selected" : "") + ">" + esc(x.nome) + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>Conta</label><div class="seg" id="cC">' + L.contas.map(function (x) { return '<button type="button" data-v="' + esc(x) + '" aria-pressed="' + (x === c.conta) + '">' + esc(x) + "</button>"; }).join("") + "</div></div>" +
        '<div class="field"><label>Prazo</label><input type="date" id="cP" value="' + esc(c.prazo || "") + '"></div>' +
        '<div class="field"><label>Responsáveis</label><div class="chips" id="cR">' + respOpts().map(function (n) { return '<button type="button" data-p="' + esc(n) + '" aria-pressed="' + ((c.resp || []).indexOf(n) >= 0) + '">' + esc(n) + "</button>"; }).join("") + "</div></div>" +
        '<p class="hint">Criado por ' + esc(c.criadoPor || "—") + (c.criadoEm ? " em " + fmt(new Date(c.criadoEm)) : "") + "</p>" +
      "</div></div></div>" +
      '<footer><div class="row"><button class="btn ghost small" id="cArch">Arquivar</button><span id="cDelWrap"><button class="btn ghost small" id="cDel">Excluir</button></span></div><button class="btn" data-close>Fechar <span class="arrow">→</span></button></footer>';
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
    $("#cmAdd").onclick = function () { var t = $("#cmNew").value.trim(); if (!t) return; patchCard(c, { comentarios: (c.comentarios || []).concat([{ autor: me, texto: t, em: new Date().toISOString() }]) }); };
    $("#cmNew").onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); $("#cmAdd").click(); } };
    $("#cCol").onchange = function () { patchCard(c, { coluna: this.value, ordem: nextOrder(c.quadro, this.value) }); };
    $("#cQ").onchange = function () { var nq = S.quadros.find(function (x) { return x.id === $("#cQ").value; }); if (!nq || !nq.colunas.length) return; patchCard(c, { quadro: nq.id, coluna: nq.colunas[0].id, ordem: nextOrder(nq.id, nq.colunas[0].id) }); };
    $("#cC").onclick = function (e) { var b = e.target.closest("[data-v]"); if (b) patchCard(c, { conta: b.dataset.v }); };
    $("#cP").onchange = function () { patchCard(c, { prazo: this.value }); };
    $("#cR").onclick = function (e) { var b = e.target.closest("[data-p]"); if (!b) return; var rs = (c.resp || []).slice(), i = rs.indexOf(b.dataset.p); if (i >= 0) rs.splice(i, 1); else rs.push(b.dataset.p); patchCard(c, { resp: rs }); };
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
    var cardsOpen = S.cartoes.filter(function (c) { return !c.arquivado; });
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
    if (calF.pauta) S.pauta.forEach(function (i) { var d = parse(i.prazo); if (d && passP(i.resp) && passC(i.conta)) push(d, { k: "pauta", id: i.id, t: i.titulo, done: i.status === "feito", sort: "50", conta: i.conta }); });
    if (calF.cartoes) S.cartoes.forEach(function (c) { var d = parse(c.prazo); if (d && !c.arquivado && passP(c.resp || []) && passC(c.conta)) push(d, { k: "cartao", id: c.id, t: c.titulo, sort: "60", cor: (c.etiquetas || []).length ? labelColor(c.etiquetas[0]) : "", conta: c.conta }); });
    if (calF.ciclo) [-1, 0, 1].forEach(function (o) { cycleFor(y, m + o).forEach(function (c) { if (passP(c.quem || []) && passC(c.conta)) push(c.d, { k: "ciclo", id: c.id, t: c.titulo, sort: "40" }); }); });
    if (calF.vencimentos && isAdmin() && !focoMeu()) S.nfs.forEach(function (n) { var d = parse(n.vencimento); if (d && n.status !== "paga" && passC(n.conta)) push(d, { k: "venc", id: n.id, t: brl(n.valor) + " · " + (n.fornecedor || n.descricao || "NF"), sort: "45" }); });
    if (calF.visitas !== false) S.visitas.forEach(function (v) { var d = parse(v.data); if (d && passP(v.resp) && passC(v.conta)) push(d, { k: "visita", id: v.id, t: "Visita · " + (v.loja || ""), sort: "30", conta: v.conta }); });
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
        return Store.upload(f, pasta).then(function (m) { m.por = me; out.push(m); }, function (e) {
          toast((e && e.code === "too_large") ? f.name + ": acima de 50 MB" : "Não enviou " + f.name);
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
    ["setoresVisita", "Setores do checklist de visita", "Cada setor recebe Ótimo, Bom, Regular ou Ruim na visita."]
  ];
  // onde cada lista é usada, para renomear junto
  var LIST_USE = {
    categoriasVerba: [["nfs", "categoria"], ["contratos", "categoria"]],
    reunioes: [["pauta", "reuniao"], ["ciclo", "reuniao"]],
    areas: [["pauta", "area"], ["ciclo", "area"]],
    tiposEvento: [["eventos", "tipo"]],
    pagamentos: [["nfs", "pagamento"], ["contratos", "pagamento"]],
    categoriasCofre: [["cofre", "categoria"]],
    lojas: [["visitas", "loja"]]
  };
  function saveListas(patch) { var L = listas(); var doc = Object.assign({ contas: L.contas, reunioes: L.reunioes, areas: L.areas, etiquetas: L.etiquetas, tiposEvento: L.tiposEvento, categoriasVerba: L.categoriasVerba, pagamentos: L.pagamentos, categoriasCofre: L.categoriasCofre, lojas: L.lojas, setoresVisita: L.setoresVisita }, patch); return Store.set("config", "listas", doc).catch(fail); }
  function renameEverywhere(key, from, to) {
    var n = 0;
    (LIST_USE[key] || []).forEach(function (u) { S[u[0]].forEach(function (d) { if (d[u[1]] === from) { var p = {}; p[u[1]] = to; Store.upd(u[0], d.id, p).catch(fail); n++; } }); });
    if (key === "etiquetas") S.cartoes.forEach(function (c) { if ((c.etiquetas || []).indexOf(from) >= 0) { Store.upd("cartoes", c.id, { etiquetas: c.etiquetas.map(function (x) { return x === from ? to : x; }) }).catch(fail); n++; } });
    if (key === "setoresVisita") S.visitas.forEach(function (v) { if ((v.notas || {})[from]) { var nn = Object.assign({}, v.notas); nn[to] = nn[from]; delete nn[from]; Store.upd("visitas", v.id, { notas: nn }).catch(fail); n++; } });
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
      '<section class="card pad adm"><h3>Conteúdo padrão</h3><p class="muted">Recarrega pessoas, ciclo do mês, modelos, quadros, o mapa padrão e as listas. Pauta, cartões, eventos e toda a parte de verba ficam como estão.</p><span id="admSeedW"><button class="btn ghost small" id="admSeed">Carregar conteúdo padrão</button></span></section>' +
      "</div>";
    drawPerfis();
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
      '<div class="vtiles"><div class="vtile"><span>Visitas</span><b>' + list.length + '</b><small>' + esc(viRangeLabel()) + '</small></div><div class="vtile"><span>Lojas visitadas</span><b>' + mx.lojas.length + (L.lojas.length ? " / " + L.lojas.length : "") + '</b></div><div class="vtile nota-' + scoreClass(media) + '"><span>Nota média</span><b>' + (media == null ? "—" : media + "%") + '</b></div><div class="vtile ' + (criticos ? "neg" : "") + '"><span>Pontos críticos</span><b>' + criticos + "</b><small>setores com média Ruim</small></div></div>" +
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
        return '<button class="vi-item" data-vid="' + esc(v.id) + '"><span class="vi-date"><b>' + fmt(parse(v.data)) + "</b>" + DOW[parse(v.data).getDay()] + '</span><span class="vi-main"><b>' + esc(v.loja || "Sem loja") + "</b>" + (v.conta ? ' <span class="tag ' + esc(v.conta) + '">' + esc(v.conta) + "</span>" : "") + '<span class="hint">' + esc((v.resumo || "").slice(0, 140)) + (ruins.length ? ' · <span class="late-txt">Ruim: ' + esc(ruins.join(", ")) + "</span>" : "") + "</span></span>" +
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
    el.onclick = function (e) {
      var b = e.target.closest("[data-vid]"); if (b) { openVisita(S.visitas.find(function (x) { return x.id === b.dataset.vid; })); return; }
      var tr = e.target.closest("tr[data-vloja]"); if (tr) { viF.loja = tr.dataset.vloja; renderVisitas(); }
    };
  }
  function openVisita(v) {
    var L = listas(), isNew = !v, id = isNew ? Store.uid() : v.id;
    var d = Object.assign({ loja: viF.loja || L.lojas[0] || "", data: iso(today()), conta: "Ambas", resp: me, resumo: "", notas: {}, anexos: [] }, v || {});
    var notas = JSON.parse(JSON.stringify(d.notas || {}));
    var setores = L.setoresVisita.slice(); Object.keys(notas).forEach(function (k) { if (setores.indexOf(k) < 0) setores.push(k); });
    var pode = isNew || canEdit("visitas", v);
    var lojasOpt = L.lojas.slice(); if (d.loja && lojasOpt.indexOf(d.loja) < 0) lojasOpt.push(d.loja);
    openModal('<header><h3>' + (isNew ? "Nova visita" : "Visita · " + esc(d.loja)) + '</h3><button class="x" data-close>✕</button></header><div class="body">' +
      '<div class="grid2"><div class="field"><label>Loja</label><select id="viLo">' + (lojasOpt.length ? opt(lojasOpt, d.loja) : '<option value="">Cadastre as lojas no Admin</option>') + "</select></div>" +
      '<div class="field"><label>Data</label><input type="date" id="viDa" value="' + esc(d.data) + '"></div>' +
      '<div class="field"><label>Conta</label><select id="viCo">' + opt(L.contas, d.conta) + "</select></div>" +
      '<div class="field"><label>Quem visitou</label><select id="viRe">' + opt(nomes(), d.resp) + "</select></div></div>" +
      '<div class="field"><label>Resumo da visita</label><textarea id="viRs" style="min-height:90px" placeholder="Como estava a loja, conversa com o gerente, o que precisa de ação">' + esc(d.resumo) + "</textarea></div>" +
      '<div class="field"><div class="section-title"><label>Checklist por setor</label><span class="hint" id="viScore"></span></div><div class="ck-list">' +
        setores.map(function (s, i) {
          var n = notas[s] || {};
          return '<div class="ck-row" data-si="' + i + '"><div class="ck-name">' + esc(s) + '</div><div class="ck-opts">' +
            NOTAS.map(function (o) { return '<button type="button" class="ck-b ' + o[0] + '" data-n="' + o[0] + '" aria-pressed="' + (n.nota === o[0]) + '">' + o[1] + "</button>"; }).join("") +
            '</div><input type="text" class="ck-obs" data-obs="' + i + '" value="' + esc(n.obs || "") + '" placeholder="Observação (opcional)"></div>';
        }).join("") + '</div><p class="hint">Clique de novo na nota para limpar. Setores sem nota não entram na média.</p></div>' +
      '<div class="field" id="viAtt"></div>' +
      "</div><footer><span class=\"row\">" + (isNew ? "" : '<span id="viDelW"><button class="btn ghost small" id="viDel">Excluir</button></span>') + '<button class="btn ghost small" id="viPauta">Levar os "Ruim" para a pauta</button></span><button class="btn" id="viSave">Salvar visita <span class="arrow">→</span></button></footer>', { wide: true });
    var anexos = (d.anexos || []).slice();
    attachBlock($("#viAtt"), { titulo: "Fotos da visita", lista: anexos, pasta: "visitas/" + id, accept: "image/*,video/*,.pdf", podeEditar: pode, dropTarget: $("#modalRoot .modal"),
      onChange: function (l) { anexos = l; if (!isNew) Store.upd("visitas", id, { anexos: l }).catch(fail); } });
    var upScore = function () { var p = visitaScore({ notas: notas }); $("#viScore").innerHTML = p == null ? "" : 'Nota da visita: <span class="nota ' + scoreClass(p) + '">' + p + "%</span>"; };
    var collect = function () { $$(".ck-obs").forEach(function (inp) { var s = setores[+inp.dataset.obs], o = inp.value.trim(); if (o) { notas[s] = Object.assign({}, notas[s] || {}, { obs: o }); } else if (notas[s]) { delete notas[s].obs; if (!notas[s].nota) delete notas[s]; } }); };
    upScore();
    $("[data-close]").onclick = closeModal;
    $(".ck-list").onclick = function (e) {
      var b = e.target.closest("[data-n]"); if (!b) return;
      var row = b.closest("[data-si]"), s = setores[+row.dataset.si], cur = (notas[s] || {}).nota;
      var nv = cur === b.dataset.n ? "" : b.dataset.n;
      notas[s] = Object.assign({}, notas[s] || {}); if (nv) notas[s].nota = nv; else delete notas[s].nota; if (!notas[s].nota && !notas[s].obs) delete notas[s];
      $$("[data-n]", row).forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.n === nv)); });
      upScore();
    };
    var doc = function () { collect(); return { loja: $("#viLo").value, data: $("#viDa").value || iso(today()), conta: $("#viCo").value, resp: $("#viRe").value, resumo: $("#viRs").value.trim(), notas: notas, anexos: anexos, criadoPor: d.criadoPor || me, criadoEm: d.criadoEm || new Date().toISOString() }; };
    $("#viSave").onclick = function () {
      var x = doc(); if (!x.loja) { toast("Escolha a loja"); return; }
      Store.set("visitas", id, x).then(function () { toast("Visita salva"); isNew = false; }, fail); closeModal();
    };
    $("#viPauta").onclick = function () {
      var x = doc(); var ruins = Object.keys(x.notas).filter(function (k) { return x.notas[k].nota === "ruim"; });
      if (!ruins.length) { toast("Nenhum setor marcado como Ruim"); return; }
      Promise.all(ruins.map(function (s) {
        return Store.add("pauta", { titulo: "[" + x.loja + "] " + s + (x.notas[s].obs ? ": " + x.notas[s].obs : ""), conta: x.conta, resp: me, reuniao: "", area: "Loja / VM", prazo: "", status: "aberto", notas: "Da visita de " + fmt(parse(x.data)) + ".", criadoEm: new Date().toISOString(), criadoPor: me });
      })).then(function () { toast(ruins.length + " pendência" + (ruins.length > 1 ? "s" : "") + " na pauta"); }, fail);
    };
    if ($("#viDel")) $("#viDel").onclick = function () { delConfirm("#viDelW", "Excluir esta visita?", function () { anexos.forEach(function (a) { Store.removeFile(a); }); Store.del("visitas", id).catch(fail); closeModal(); }); };
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
    list.forEach(function (v) { (v.anexos || []).filter(function (a) { return fileKind(a) === "img"; }).slice(0, ANEXOS_POR_VISITA).forEach(function (a) { jobs.push(Store.fileUrl(a).then(function (u) { a._u = u; }, function () {})); }); });
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
              (fotos.length ? '<div class="fotos">' + fotos.map(function (a) { return '<img src="' + esc(a._u) + '" alt="">'; }).join("") + "</div>" : "") + "</div>";
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

  var renderSoon = (function () { var t = null; return function () { if (t) return; t = requestAnimationFrame(function () { t = null; if (!drag || !drag.started) { if ($("#mb") && (openCardId || view === "verba" || view === "cofre" || view === "visitas")) return; render(); } }); }; })();

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
