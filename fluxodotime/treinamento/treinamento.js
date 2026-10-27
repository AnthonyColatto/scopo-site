/* Treinamento · Escola SCOPO (só admin)
   - Passo a passo e status dos roteiros ficam no banco do Fluxo: fluxo_docs, col "config", id "treinamento".
   - Sem banco configurado (prévia local), guarda neste navegador.
   - O conteúdo fixo (passos, roteiros, legendas, textos) vem de dados.js; a lista do kit, de kit/manifesto.js. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function n2(i) { return String(i).padStart(2, "0"); }

  var cfg = window.FLUXO_CONFIG || {};
  var temBase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var SUPA = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  var TABLE = "fluxo_docs", COL = "config", ID = "treinamento", LS = "fluxo-treinamento";
  var client = null, perfil = null, existe = false;
  var st = { mapa: {}, roteiros: {} };

  /* ================= acesso ================= */
  function fora(msg) {
    var c = $("#cortina"); c.hidden = false;
    c.innerHTML = '<div><p></p><a class="btn pri" href="../" target="_top">Voltar ao Fluxo</a></div>'; $("p", c).textContent = msg;
  }
  function portao() {
    if (!temBase) return Promise.resolve();
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = SUPA; s.onload = res; s.onerror = rej; document.head.appendChild(s); })
      .then(function () { client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey); return client.auth.getSession(); })
      .then(function (r) {
        var sess = r && r.data && r.data.session;
        if (!sess) { fora("Entre no Fluxo do Time para abrir o Treinamento."); throw { code: "sem-login" }; }
        return client.from("fluxo_perfis").select("email,nome,papel").eq("email", String(sess.user.email || "").toLowerCase()).maybeSingle();
      })
      .then(function (r) {
        perfil = r && r.data;
        if (!perfil || perfil.papel !== "admin") { fora("O Treinamento é só para administradores do Fluxo."); throw { code: "sem-permissao" }; }
      })
      .catch(function (e) { if (!e || !e.code) fora("Não consegui verificar o acesso. Confira a internet e recarregue."); throw e; });
  }

  /* ================= progresso ================= */
  function sync(t) { $("#sync").textContent = t; }
  function lerLocal() { try { return JSON.parse(localStorage.getItem(LS) || "null"); } catch (e) { return null; } }
  function gravarLocal() { try { localStorage.setItem(LS, JSON.stringify(st)); } catch (e) {} }
  function normal(d) { d = d || {}; return { mapa: d.mapa || {}, roteiros: d.roteiros || {} }; }
  function carregar() {
    if (!client) { st = normal(lerLocal()); sync("Prévia: salvo neste navegador"); return Promise.resolve(); }
    sync("Carregando…");
    return client.from(TABLE).select("data").eq("col", COL).eq("id", ID).maybeSingle().then(function (r) {
      if (r.error) throw r.error;
      existe = !!r.data; st = normal(r.data && r.data.data); gravarLocal(); sync("Salvo no Fluxo");
    }).catch(function () { st = normal(lerLocal()); sync("Sem conexão: usando o que está neste navegador"); });
  }
  var fila = Promise.resolve();
  function salvar() {
    gravarLocal();
    if (!client) return;
    sync("Salvando…");
    fila = fila.then(function () {
      var now = new Date().toISOString(), d = JSON.parse(JSON.stringify(st));
      d.atualizado = { em: now, por: perfil && perfil.nome };
      var q = existe ? client.from(TABLE).update({ data: d, updated_at: now }).eq("col", COL).eq("id", ID).select("id")
        : client.from(TABLE).insert({ col: COL, id: ID, data: d, updated_at: now }).select("id");
      return q.then(function (r) { if (r.error) throw r.error; if (!r.data || !r.data.length) throw new Error("negado"); existe = true; sync("Salvo no Fluxo"); });
    }).catch(function (e) { console.error(e); sync("Não salvou no Fluxo. A marcação ficou neste navegador."); });
  }
  function marca(v) { return v ? { em: new Date().toISOString(), por: (perfil && perfil.nome) || "" } : null; }
  function quando(o) { if (!o || !o.em) return ""; var d = new Date(o.em); return n2(d.getDate()) + "/" + n2(d.getMonth() + 1) + (o.por ? " · " + o.por.split(" ")[0] : ""); }

  /* ================= abas ================= */
  var ABAS = ["mapa", "roteiros", "estudio", "kit", "textos"];
  function abrir(aba) {
    if (ABAS.indexOf(aba) < 0) aba = "mapa";
    $$("#abas button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.aba === aba)); });
    ABAS.forEach(function (a) { $("#a-" + a).hidden = a !== aba; });
    if (aba === "estudio" && !$("#estFrame")) $("#estBox").innerHTML = '<iframe id="estFrame" class="est-frame" src="estudio/" title="Estúdio Escola SCOPO"></iframe>';
    if (aba === "kit" && !$("#kitBox").firstChild) montarKit();
    if (aba === "textos" && !$("#textosBox").firstChild) montarTextos();
    try { sessionStorage.setItem(LS + "-aba", aba); } catch (e) {}
    if (history.replaceState) history.replaceState(null, "", "#" + aba);
    window.scrollTo(0, 0);
  }
  $("#abas").addEventListener("click", function (e) { var b = e.target.closest("button[data-aba]"); if (b) abrir(b.dataset.aba); });

  /* ================= passo a passo ================= */
  var TODOS = [];
  FASES.forEach(function (f) { f.passos.forEach(function (p) { TODOS.push({ id: p[0], tit: p[1], desc: p[2], tempo: p[3], fase: f }); }); });
  var CHECK = '<svg viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="#0B0B0A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function montarMapa() {
    var box = $("#fases"), i = 0;
    FASES.forEach(function (f) {
      var s = el("section", "fase"); s.dataset.fase = f.n;
      var topo = el("div", "fase-topo"), linha = el("div", "fase-topo-linha");
      linha.appendChild(el("div", "tag", f.datas)); linha.appendChild(el("div", "contagem"));
      var h = el("h3", "fase-tit"); h.appendChild(el("span", "fino-i", f.fino + " ")); h.appendChild(el("span", "forte-i", f.forte));
      topo.appendChild(linha); topo.appendChild(h); topo.appendChild(el("p", "fase-desc", f.desc)); s.appendChild(topo);
      var ol = el("ol", "passos");
      f.passos.forEach(function (p) {
        i++;
        var li = el("li", "passo"); li.dataset.id = p[0];
        var lb = el("label"), inp = el("input"); inp.type = "checkbox";
        var cx = el("span", "caixa"); cx.innerHTML = CHECK;
        var tx = el("span", "txt"); tx.appendChild(el("strong", null, p[1])); tx.appendChild(el("span", null, p[2])); tx.appendChild(el("span", "quem"));
        lb.appendChild(inp); lb.appendChild(cx); lb.appendChild(el("span", "num", n2(i))); lb.appendChild(tx); lb.appendChild(el("span", "tempo", p[3]));
        inp.addEventListener("change", function () { marcarPasso(p[0], inp.checked); });
        li.appendChild(lb); ol.appendChild(li);
      });
      s.appendChild(ol);
      if (f.gate) { var g = el("div", "portao"); g.appendChild(el("div", "losango")); var gp = el("p"); gp.appendChild(el("b", null, "Portão")); gp.appendChild(document.createTextNode(f.gate)); g.appendChild(gp); s.appendChild(g); }
      box.appendChild(s);
    });
    $("#mTotal").textContent = TODOS.length;
    $("#mProxBtn").addEventListener("click", function () { var p = TODOS.find(function (t) { return !st.mapa[t.id]; }); if (p) marcarPasso(p.id, true); });
  }
  function marcarPasso(id, v) { if (v) st.mapa[id] = marca(true); else delete st.mapa[id]; pintarMapa(); salvar(); }
  function pintarMapa() {
    var feitos = TODOS.filter(function (t) { return st.mapa[t.id]; }).length, prox = TODOS.find(function (t) { return !st.mapa[t.id]; });
    $("#mFeitos").textContent = feitos; $("#mBarra").style.width = (feitos / TODOS.length * 100) + "%";
    $("#mFase").textContent = prox ? prox.fase.fino.replace(" ·", "") + " · " + prox.fase.forte : "Mapa completo";
    $$(".passo").forEach(function (li) {
      var v = st.mapa[li.dataset.id];
      $("input", li).checked = !!v; li.classList.toggle("agora", !!prox && prox.id === li.dataset.id);
      $(".quem", li).textContent = v && v.em ? "Feito em " + quando(v) : "";
    });
    FASES.forEach(function (f) {
      var s = $('[data-fase="' + f.n + '"]'), k = f.passos.filter(function (p) { return st.mapa[p[0]]; }).length;
      $(".contagem", s).textContent = k + " / " + f.passos.length; s.classList.toggle("completa", k === f.passos.length);
    });
    if (prox) {
      $("#mProxTag").textContent = "Seu próximo passo · " + prox.fase.fino.replace(" ·", "") + " · " + prox.tempo;
      $("#mProxTit").textContent = prox.tit; $("#mProxDesc").textContent = prox.desc; $("#mProxBtn").hidden = false;
    } else {
      $("#mProxTag").textContent = "Mapa completo"; $("#mProxTit").textContent = "Curso no ar e ecossistema girando.";
      $("#mProxDesc").textContent = "Todos os passos estão feitos. Hora de abrir a próxima escada."; $("#mProxBtn").hidden = true;
    }
  }

  /* ================= roteiros ================= */
  var TIPO = { busca: ["busca", "Busca"], comp: ["comp", "Compartilhável"], teste: ["", "Teste"], conv: ["conv", "Conversão"] };
  var ETAPAS = [["g", "Gravado"], ["e", "Editado"], ["p", "Publicado"]];
  function montarRoteiros() {
    var box = $("#semanas");
    SEMANAS.forEach(function (s, si) {
      var sec = el("section", "semana"), topo = el("div", "semana-topo");
      topo.appendChild(el("div", "tag", s.datas));
      var h = el("h3", "fase-tit"); h.appendChild(el("span", "fino-i", s.n + " · ")); h.appendChild(el("span", "forte-i", s.fase)); topo.appendChild(h);
      topo.appendChild(el("p", null, s.desc)); sec.appendChild(topo);
      ROTEIROS.filter(function (r) { return r.sem === si; }).forEach(function (r) { sec.appendChild(ficha(r)); });
      box.appendChild(sec);
    });
    $("#rProxBtn").addEventListener("click", function () { var d = $("#f-" + this.dataset.id); if (d) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "start" }); } });
  }
  function ficha(r) {
    var i = ROTEIROS.indexOf(r) + 1, d = el("details", "ficha"); d.id = "f-" + r.id; d.dataset.id = r.id;
    var sm = el("summary"); sm.appendChild(el("span", "f-num", n2(i) + " / 12"));
    var t = el("span", "f-tit"); t.appendChild(el("strong", null, r.tit));
    var meta = el("span", "f-meta"), tp = TIPO[r.tipo];
    [[r.data, ""], [tp[1], tp[0]], [r.pilar, ""], [r.dur, ""]].forEach(function (c) { meta.appendChild(el("span", "chip " + c[1], c[0])); });
    t.appendChild(meta); sm.appendChild(t);
    var est = el("span", "f-estado"); est.setAttribute("aria-hidden", "true");
    ETAPAS.forEach(function (k) { var x = el("i"); x.dataset.k = k[0]; est.appendChild(x); }); sm.appendChild(est);
    d.appendChild(sm);

    var c = el("div", "f-corpo"), topo = el("div", "f-topo");
    var g = el("div", "gancho"); g.appendChild(el("div", "tag", "Gancho A · " + r.tec));
    var q = el("q"); q.appendChild(document.createTextNode(r.gA[0] + " ")); q.appendChild(el("b", null, r.gA[1])); g.appendChild(q);
    topo.appendChild(g);
    var th = el("div", "thumb"), src = "kit/thumbs/thumb-" + n2(i) + ".png", im = el("img"); im.src = src; im.alt = "Thumb do vídeo " + n2(i); im.loading = "lazy";
    th.appendChild(im); var a = el("a", null, "Baixar a thumb ↓"); a.href = src; a.download = "thumb-" + n2(i) + ".png"; th.appendChild(a);
    var ae = el("a", null, "Editar no estúdio →"); ae.href = "#estudio"; ae.addEventListener("click", function (e) { e.preventDefault(); abrir("estudio"); }); th.appendChild(ae);
    topo.appendChild(th); c.appendChild(topo);

    var tw = el("div", "tabela"), tb = el("table"), thead = el("thead"), hr = el("tr");
    ["Tempo", "Fala", "Tela"].forEach(function (x) { hr.appendChild(el("th", null, x)); }); thead.appendChild(hr); tb.appendChild(thead);
    var tbody = el("tbody");
    r.linhas.forEach(function (l) { var tr = el("tr"), td = el("td", "t", l[0]); td.appendChild(el("b", null, l[1])); tr.appendChild(td); tr.appendChild(el("td", null, l[2])); tr.appendChild(el("td", "tela", l[3])); tbody.appendChild(tr); });
    tb.appendChild(tbody); tw.appendChild(tb); c.appendChild(tw);

    var info = el("div", "info");
    [["Gancho B · para os Shorts", r.gB], ["O que só a gente tem", r.dif], ["Desdobramentos", r.atom], ["Antes de gravar", r.nota]].forEach(function (k) { var dv = el("div"); dv.appendChild(el("div", "tag", k[0])); dv.appendChild(el("p", null, k[1])); info.appendChild(dv); });
    c.appendChild(info);

    var lg = LEGENDAS[r.id];
    if (lg) {
      var box = el("div", "legenda"), lt = el("div", "legenda-topo"); lt.appendChild(el("div", "tag", "Legenda pronta"));
      var bt = el("button", "btn copiar", "Copiar legenda"); bt.type = "button";
      bt.addEventListener("click", function () { copiar(lg.cap, bt, "Copiar legenda"); });
      lt.appendChild(bt); box.appendChild(lt);
      box.appendChild(el("pre", null, lg.cap));
      var bs = el("p", "busca"); bs.appendChild(el("b", null, "Título de busca · ")); bs.appendChild(document.createTextNode(lg.busca)); box.appendChild(bs);
      var bt2 = el("button", "btn copiar", "Copiar título"); bt2.type = "button"; bt2.style.justifySelf = "start";
      bt2.addEventListener("click", function () { copiar(lg.busca, bt2, "Copiar título"); }); box.appendChild(bt2);
      c.appendChild(box);
    }

    var s = el("div", "status");
    ETAPAS.forEach(function (k) {
      var l = el("label"), inp = el("input"); inp.type = "checkbox"; inp.dataset.k = k[0];
      inp.addEventListener("change", function () { var o = Object.assign({}, st.roteiros[r.id] || {}); if (inp.checked) o[k[0]] = marca(true); else delete o[k[0]]; st.roteiros[r.id] = o; pintarRoteiros(); salvar(); });
      l.appendChild(inp); l.appendChild(document.createTextNode(k[1])); s.appendChild(l);
    });
    c.appendChild(s); d.appendChild(c);
    return d;
  }
  function copiar(txt, bt, rot) {
    var ok = function () { bt.textContent = "Copiado"; bt.classList.add("ok"); setTimeout(function () { bt.textContent = rot; bt.classList.remove("ok"); }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, function () { velho(); });
    else velho();
    function velho() { var ta = el("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) {} ta.remove(); }
  }
  function pintarRoteiros() {
    var s = function (r) { return st.roteiros[r.id] || {}; };
    var pub = ROTEIROS.filter(function (r) { return s(r).p; }).length, grav = ROTEIROS.filter(function (r) { return s(r).g; }).length, edit = ROTEIROS.filter(function (r) { return s(r).e; }).length;
    $("#rPub").textContent = pub; $("#rBarra").style.width = (pub / ROTEIROS.length * 100) + "%";
    $("#rResumo").textContent = grav + " gravados · " + edit + " editados";
    var prox = ROTEIROS.find(function (r) { return !s(r).g; });
    ROTEIROS.forEach(function (r) {
      var d = $("#f-" + r.id), o = s(r);
      $$(".f-estado i", d).forEach(function (x) { x.classList.toggle("on", !!o[x.dataset.k]); });
      $$(".status input", d).forEach(function (x) { x.checked = !!o[x.dataset.k]; });
      d.classList.toggle("agora", !!prox && prox.id === r.id);
    });
    var b = $("#rProxBtn");
    if (prox) {
      $("#rProxTag").textContent = "Próximo a gravar · " + prox.data; $("#rProxTit").textContent = prox.tit;
      $("#rProxDesc").textContent = "Gancho A: " + prox.gA.join(" ") + " Grave também o Gancho B: " + prox.gB; b.dataset.id = prox.id; b.hidden = false;
    } else {
      $("#rProxTag").textContent = "Todos gravados"; $("#rProxTit").textContent = "Os 12 vídeos estão gravados.";
      $("#rProxDesc").textContent = "Agora é editar, publicar e levar todo mundo para o aulão."; b.hidden = true;
    }
  }

  /* ================= kit ================= */
  var ICON_SVG = function (body) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>"; };
  function secao(tit, n) { var s = el("section", "kit-sec"), h = el("h2", null, tit); if (n != null) h.appendChild(el("span", "n", n)); s.appendChild(h); return s; }
  function montarKit() {
    var box = $("#kitBox"), K = window.KIT_ARQ || {};
    // ícones: desenho inline para herdar a cor; o clique baixa o SVG claro
    var s1 = secao("Ícones", K.icones.length + " · grade 24, traço 1,5"), g1 = el("div", "g-ic");
    var corpos = K.corpos || {};
    K.icones.forEach(function (ic) {
      var a = el("a", "ic"); a.href = "kit/icones/svg-claro/" + ic[0] + ".svg"; a.download = ic[0] + ".svg"; a.title = "Baixar " + ic[1];
      a.innerHTML = corpos[ic[0]] ? ICON_SVG(corpos[ic[0]]) : '<img src="kit/icones/svg-claro/' + ic[0] + '.svg" alt="" width="40" height="40">';
      a.appendChild(el("span", null, ic[1])); g1.appendChild(a);
    });
    s1.appendChild(g1);
    var dl = el("p", "lead"); dl.style.fontSize = "15px"; dl.innerHTML = 'Versão para fundo claro em <a href="kit/icones/svg-escuro/" target="_blank">svg-escuro</a>.'; s1.appendChild(dl);
    box.appendChild(s1);

    var s2 = secao("Pilares", "3"), g2 = el("div", "g-pil");
    K.pilares.forEach(function (p) {
      var c = el("div", "pil"), im = el("img"); im.src = "kit/icones/pilares/" + p[0] + "-claro.svg"; im.alt = "";
      c.appendChild(im); c.appendChild(el("h4", null, p[1])); c.appendChild(el("p", null, p[2]));
      var lk = el("div", "links");
      ["claro", "escuro"].forEach(function (v) { ["svg", "png"].forEach(function (x) { var a = el("a", null, v + "." + x); a.href = "kit/icones/pilares/" + p[0] + "-" + v + "." + x; a.download = ""; lk.appendChild(a); }); });
      c.appendChild(lk); g2.appendChild(c);
    });
    s2.appendChild(g2); box.appendChild(s2);

    var NG = { selos: "Selos", etiquetas: "Etiquetas", setas: "Setas", molduras: "Molduras", marcadores: "Marcadores", marca: "Marca" };
    var tot = Object.keys(K.elementos).reduce(function (a, k) { return a + K.elementos[k].length; }, 0);
    var s3 = secao("Elementos", tot + " · SVG e PNG");
    Object.keys(K.elementos).forEach(function (gk) {
      var gr = el("div", "grupo"); gr.appendChild(el("div", "tag", NG[gk] || gk));
      var g = el("div", "g-el");
      K.elementos[gk].forEach(function (n) {
        var a = el("a", "el"); a.href = "kit/elementos/" + gk + "/" + n + ".svg"; a.download = n + ".svg"; a.title = "Baixar SVG";
        var pv = el("div", "pv"), im = el("img"); im.src = "kit/elementos/" + gk + "/" + n + ".png"; im.alt = ""; im.loading = "lazy";
        if (n.indexOf("preta") >= 0 || n.indexOf("escuro") >= 0) pv.style.background = "#F2EFE6";
        pv.appendChild(im); a.appendChild(pv); a.appendChild(el("span", null, n.replace(/-/g, " "))); g.appendChild(a);
      });
      gr.appendChild(g); s3.appendChild(gr);
    });
    box.appendChild(s3);

    var s4 = secao("Patterns", "3 · tile para repetir e fundo 1080×1350"), g4 = el("div", "g-pat");
    K.patterns.forEach(function (p) {
      var c = el("div", "pat"), am = el("div", "amostras");
      ["preto", "amarelo", "off"].forEach(function (v) { var a = el("a"); a.href = "kit/patterns/" + p[0] + "/fundo-" + v + "-1080x1350.png"; a.download = ""; a.title = "Baixar fundo " + v; a.style.backgroundImage = "url(kit/patterns/" + p[0] + "/tile-" + v + ".png)"; am.appendChild(a); });
      c.appendChild(am); c.appendChild(el("h4", null, p[1])); c.appendChild(el("p", null, p[2]));
      var lk = el("p"); lk.className = "tag"; lk.innerHTML = 'Tiles: <a href="kit/patterns/' + p[0] + '/tile-preto.svg" download>preto</a> · <a href="kit/patterns/' + p[0] + '/tile-amarelo.svg" download>amarelo</a> · <a href="kit/patterns/' + p[0] + '/tile-off.svg" download>off</a>';
      c.appendChild(lk); g4.appendChild(c);
    });
    s4.appendChild(g4);
    var gt = el("div", "g-img");
    K.texturas.forEach(function (t) { var a = el("a"); a.href = "kit/patterns/texturas/" + t + ".png"; a.download = ""; var im = el("img"); im.src = a.href; im.alt = ""; im.loading = "lazy"; a.appendChild(im); a.appendChild(el("span", null, "Textura · " + t.replace(/-1080$/, "").replace(/-/g, " "))); gt.appendChild(a); });
    s4.appendChild(gt); box.appendChild(s4);

    [["Thumbs dos 12 vídeos", "thumbs", K.thumbs], ["Aplicações de referência", "aplicacoes", K.aplicacoes]].forEach(function (x) {
      var s = secao(x[0], x[2].length), g = el("div", "g-img");
      x[2].forEach(function (n) { var a = el("a"); a.href = "kit/" + x[1] + "/" + n + ".png"; a.download = ""; var im = el("img"); im.src = a.href; im.alt = ""; im.loading = "lazy"; a.appendChild(im); a.appendChild(el("span", null, n.replace(/^\d+-/, "").replace(/-/g, " "))); g.appendChild(a); });
      s.appendChild(g); box.appendChild(s);
    });
  }

  /* ================= textos ================= */
  function montarTextos() {
    var box = $("#textosBox"), g = el("div", "g-txt"), grupos = {};
    TEXTOS.forEach(function (t) { (grupos[t[3]] = grupos[t[3]] || []).push(t); });
    Object.keys(grupos).forEach(function (k) {
      var gr = el("div", "txt-grupo"); gr.appendChild(el("div", "tag", k));
      grupos[k].forEach(function (t) { var a = el("a", "doc"); a.href = t[2]; a.target = "_blank"; a.rel = "noopener"; a.appendChild(el("strong", null, t[0])); a.appendChild(el("span", "seta", "↗")); a.appendChild(el("p", null, t[1])); gr.appendChild(a); });
      g.appendChild(gr);
    });
    box.appendChild(g);
  }

  /* ================= início ================= */
  portao().then(function () {
    $("#cortina").hidden = true;
    montarMapa(); montarRoteiros();
    return carregar();
  }).then(function () {
    pintarMapa(); pintarRoteiros();
    var pr = ROTEIROS.find(function (r) { return !(st.roteiros[r.id] && st.roteiros[r.id].g); }); if (pr) $("#f-" + pr.id).open = true;
    var a = (location.hash || "").slice(1); if (!a) { try { a = sessionStorage.getItem(LS + "-aba"); } catch (e) {} }
    abrir(a || "mapa");
    // outro admin pode ter marcado algo: recarrega ao voltar para a aba
    window.addEventListener("focus", function () { if (client) carregar().then(function () { pintarMapa(); pintarRoteiros(); }); });
  }).catch(function () {});
})();
