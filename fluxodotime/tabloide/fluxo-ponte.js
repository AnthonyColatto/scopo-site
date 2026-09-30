/* Ponte entre o Estúdio de Tabloide e o Fluxo do Time.
   - Só abre para quem está logado no Fluxo (mesma sessão do Supabase).
   - "Salvar no Fluxo" guarda o projeto (ofertas, visual e banco de imagens) no Supabase,
     na pasta tabloides/, para o time abrir de qualquer computador.
   - "Projetos do time" lista o que foi salvo e abre. */
(function () {
  var cfg = window.FLUXO_CONFIG || {};
  var temBase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var SUPA = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  var BUCKET = "anexos", PASTA = "tabloides";
  var client = null, perfil = null;

  function h(tag, attrs, html) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (html != null) e.innerHTML = html; return e; }
  function aviso(msg) { try { toast(msg); } catch (e) { alert(msg); } }
  function slugP(s) { return String(s || "projeto").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "projeto"; }
  function quando(iso) { var d = new Date(iso); if (isNaN(d)) return ""; var p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function mb(b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }

  // botões no topo do estúdio
  function montarBotoes() {
    var top = document.querySelector(".top"); if (!top || document.getElementById("fxVoltar")) return;
    var voltar = h("a", { id: "fxVoltar", href: "../", class: "btn ghost", title: "Voltar ao Fluxo do Time" }, "← Fluxo");
    top.insertBefore(voltar, top.firstChild);
    if (!temBase) return;
    var abrirBtn = document.querySelector('[data-act="openProject"]');
    var salvar = h("button", { class: "btn", id: "fxSalvar", type: "button", title: "Guardar no Fluxo para o time abrir de qualquer computador" }, "Salvar no Fluxo");
    var lista = h("button", { class: "btn", id: "fxLista", type: "button" }, "Projetos do time");
    if (abrirBtn) { abrirBtn.parentNode.insertBefore(salvar, abrirBtn); abrirBtn.parentNode.insertBefore(lista, abrirBtn); }
    else { top.appendChild(salvar); top.appendChild(lista); }
    salvar.onclick = salvarNoFluxo;
    lista.onclick = listar;
  }

  // porta de entrada: precisa estar logado no Fluxo e liberado
  function portao() {
    if (!temBase) return Promise.resolve();
    var cortina = h("div", { id: "fxPortao", style: "position:fixed;inset:0;z-index:200;background:#050505;color:#fff;display:flex;align-items:center;justify-content:center;font:500 15px system-ui,sans-serif" }, "Verificando acesso ao Fluxo…");
    document.body.appendChild(cortina);
    var fora = function (msg) { cortina.innerHTML = '<div style="text-align:center;max-width:340px;padding:20px"><p style="margin:0 0 14px">' + msg + '</p><a href="../" style="display:inline-block;background:#F5DF00;color:#0a0a0a;font-weight:700;padding:10px 18px;border-radius:4px;text-decoration:none">Entrar no Fluxo</a></div>'; };
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = SUPA; s.onload = res; s.onerror = rej; document.head.appendChild(s); })
      .then(function () {
        client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
        return client.auth.getSession();
      })
      .then(function (r) {
        var sess = r && r.data && r.data.session;
        if (!sess) { fora("Entre no Fluxo do Time para usar o estúdio."); throw { code: "sem-login" }; }
        return client.from("fluxo_perfis").select("email,nome,papel").eq("email", String(sess.user.email || "").toLowerCase()).maybeSingle();
      })
      .then(function (r) {
        if (!r || !r.data) { fora("Seu acesso ao Fluxo ainda não foi liberado."); throw { code: "sem-perfil" }; }
        perfil = r.data; cortina.remove();
      })
      .catch(function (e) { if (!e || !e.code) fora("Não consegui verificar o acesso. Confira a internet e recarregue."); throw e; });
  }

  function pacote() {
    try { syncMem(); } catch (e) {}
    var proj = Object.assign({}, S, { bank: BANK, fluxo: { id: S.fluxoId || "", por: perfil && perfil.nome, em: new Date().toISOString() } });
    return JSON.stringify(proj);
  }

  function salvarNoFluxo() {
    if (!client) return;
    if (!S.fluxoId) { S.fluxoId = Math.random().toString(36).slice(2, 10); try { persist(); } catch (e) {} }
    var id = S.fluxoId, ts = Date.now(), nome = slugP(S.name);
    var path = PASTA + "/" + id + "/" + ts + "__" + nome + ".json";
    var blob = new Blob([pacote()], { type: "application/json" });
    var b = document.getElementById("fxSalvar"); if (b) { b.disabled = true; b.textContent = "Salvando…"; }
    client.storage.from(BUCKET).upload(path, blob, { contentType: "application/json", upsert: false })
      .then(function (r) {
        if (r.error) throw r.error;
        aviso("Projeto salvo no Fluxo (" + mb(blob.size) + ").");
        // tira as versões antigas deste projeto (só consegue quem salvou; as outras ficam)
        return client.storage.from(BUCKET).list(PASTA + "/" + id, { limit: 100 }).then(function (l) {
          var velhos = (l.data || []).filter(function (f) { return f.name !== path.split("/").pop(); }).sort(function (a, b) { return a.name < b.name ? 1 : -1; }).slice(2).map(function (f) { return PASTA + "/" + id + "/" + f.name; });
          if (velhos.length) return client.storage.from(BUCKET).remove(velhos);
        });
      })
      .catch(function (e) { console.error(e); aviso(/size|large|413/i.test(String(e && (e.message || e.statusCode))) ? "Projeto grande demais (limite de 50 MB). Tire imagens que não usa do banco." : "Não salvou no Fluxo. Tente de novo."); })
      .then(function () { if (b) { b.disabled = false; b.textContent = "Salvar no Fluxo"; } });
  }

  function listar() {
    if (!client) return;
    var m = modal('<h2>Projetos do time</h2><p class="hint">Projetos salvos no Fluxo. Abrir traz as ofertas, o visual e o banco de imagens daquele projeto. O projeto que está aberto agora continua no seu navegador até você abrir outro.</p><div id="fxL" class="olist"><p class="hint">Carregando…</p></div><div class="acts"><button class="btn" data-close>Fechar</button></div>');
    var box = m.querySelector("#fxL");
    client.storage.from(BUCKET).list(PASTA, { limit: 200 }).then(function (r) {
      if (r.error) throw r.error;
      var pastas = (r.data || []).filter(function (f) { return !f.id; }); // pastas não têm id
      return Promise.all(pastas.map(function (p) { return client.storage.from(BUCKET).list(PASTA + "/" + p.name, { limit: 100 }).then(function (x) { var fs = (x.data || []).filter(function (f) { return /\.json$/.test(f.name); }).sort(function (a, b) { return a.name < b.name ? 1 : -1; }); return fs.length ? { id: p.name, f: fs[0], versoes: fs.length } : null; }); }));
    }).then(function (itens) {
      itens = itens.filter(Boolean).sort(function (a, b) { return a.f.name < b.f.name ? 1 : -1; });
      if (!itens.length) { box.innerHTML = '<p class="hint">Nenhum projeto salvo ainda. Use "Salvar no Fluxo".</p>'; return; }
      box.innerHTML = itens.map(function (it, i) {
        var nome = it.f.name.replace(/^\d+__/, "").replace(/\.json$/, "").replace(/-/g, " ");
        var ts = +it.f.name.split("__")[0];
        return '<div class="oi" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px"><span><b style="font-weight:600;text-transform:capitalize">' + esc(nome) + '</b><br><small style="color:var(--ui-mute)">salvo ' + quando(ts) + " · " + mb((it.f.metadata && it.f.metadata.size) || 0) + (it.id === S.fluxoId ? " · aberto agora" : "") + '</small></span><button class="btn sm pri" data-fxo="' + i + '">Abrir</button></div>';
      }).join("");
      box.onclick = function (e) {
        var b = e.target.closest("[data-fxo]"); if (!b) return;
        var it = itens[+b.dataset.fxo]; b.disabled = true; b.textContent = "Abrindo…";
        client.storage.from(BUCKET).download(PASTA + "/" + it.id + "/" + it.f.name).then(function (r) {
          if (r.error) throw r.error; return r.data.text();
        }).then(function (txt) {
          var d = JSON.parse(txt);
          if (d.bank) { merge(BANK, d.bank); bankDirty = true; delete d.bank; }
          delete d.fluxo;
          S = hydrate(d); S.fluxoId = it.id; UI.open = null;
          return applyUserFonts().then(function () { refresh(); m.remove(); aviso("Projeto aberto: " + (S.name || "")); });
        }).catch(function (e) { console.error(e); b.disabled = false; b.textContent = "Abrir"; aviso("Não consegui abrir esse projeto."); });
      };
    }).catch(function (e) { console.error(e); box.innerHTML = '<p class="hint">Não consegui listar os projetos. Confira a internet.</p>'; });
  }

  // hydrate() não conhece fluxoId: mantém o campo ao reabrir do navegador
  if (typeof hydrate === "function") {
    var hy = hydrate;
    hydrate = function (d) { var s = hy(d); if (d && d.fluxoId) s.fluxoId = d.fluxoId; return s; };
  }

  montarBotoes();
  portao().catch(function () {});
})();
