/* Ponte Materiais Golden ↔ Fluxo do Time
   - Só abre para quem está logado no Fluxo (mesma sessão do Supabase).
   - "Salvar no Fluxo" guarda o projeto em anexos/golden/<id>/ para o time abrir de qualquer computador.
   - "Projetos do time" lista e abre. */
(function () {
  var cfg = window.FLUXO_CONFIG || {};
  var temBase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var SUPA = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  var BUCKET = "anexos", PASTA = "golden";
  var client = null, perfil = null;
  function quando(ts) { var d = new Date(ts); if (isNaN(d)) return ""; var p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function mb(b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }

  function portao() {
    if (!temBase) return Promise.resolve();
    var cortina = document.createElement("div");
    cortina.style.cssText = "position:fixed;inset:0;z-index:400;background:#070a16;color:#fff;display:flex;align-items:center;justify-content:center;font:500 15px Poppins,system-ui,sans-serif";
    cortina.textContent = "Verificando acesso ao Fluxo…"; document.body.appendChild(cortina);
    var fora = function (msg) { cortina.innerHTML = '<div style="text-align:center;max-width:340px;padding:20px"><p style="margin:0 0 14px">' + msg + '</p><a href="../" style="display:inline-block;background:#F5DF00;color:#0a0a0a;font-weight:700;padding:10px 18px;border-radius:4px;text-decoration:none">Entrar no Fluxo</a></div>'; };
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = SUPA; s.onload = res; s.onerror = rej; document.head.appendChild(s); })
      .then(function () { client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey); return client.auth.getSession(); })
      .then(function (r) {
        var sess = r && r.data && r.data.session;
        if (!sess) { fora("Entre no Fluxo do Time para usar os Materiais Golden."); throw { code: "sem-login" }; }
        return client.from("fluxo_perfis").select("email,nome,papel,permissoes").eq("email", String(sess.user.email || "").toLowerCase()).maybeSingle();
      })
      .then(function (r) {
        if (!r || !r.data) { fora("Seu acesso ao Fluxo ainda não foi liberado."); throw { code: "sem-perfil" }; }
        perfil = r.data;
        if (perfil.papel !== "admin" && perfil.permissoes && perfil.permissoes.golden === "nenhum") { fora("Você não tem acesso aos Materiais Golden. Fale com o Tony ou a Ellyn."); throw { code: "sem-permissao" }; }
        cortina.remove();
        $("#fxSalvar").hidden = false; $("#fxLista").hidden = false;
      })
      .catch(function (e) { if (!e || !e.code) fora("Não consegui verificar o acesso. Confira a internet e recarregue."); throw e; });
  }

  function salvarNoFluxo() {
    if (!client) return;
    if (!P.fluxoId) { P.fluxoId = uid(); persist(); }
    limparAssets();
    var id = P.fluxoId, nome = slug(P.nome), path = PASTA + "/" + id + "/" + Date.now() + "__" + nome + ".json";
    var dados = Object.assign({}, P, { fluxo: { por: perfil && perfil.nome, em: new Date().toISOString() } });
    var blob = new Blob([JSON.stringify(dados)], { type: "application/json" });
    var b = $("#fxSalvar"); b.disabled = true; b.textContent = "Salvando…";
    client.storage.from(BUCKET).upload(path, blob, { contentType: "application/json", upsert: false })
      .then(function (r) {
        if (r.error) throw r.error;
        toast("Projeto salvo no Fluxo (" + mb(blob.size) + ").");
        return client.storage.from(BUCKET).list(PASTA + "/" + id, { limit: 100 }).then(function (l) {
          var velhos = (l.data || []).filter(function (f) { return f.name !== path.split("/").pop(); }).sort(function (a, c) { return a.name < c.name ? 1 : -1; }).slice(2).map(function (f) { return PASTA + "/" + id + "/" + f.name; });
          if (velhos.length) return client.storage.from(BUCKET).remove(velhos);
        });
      })
      .catch(function (e) { console.error(e); toast(/size|large|413/i.test(String(e && (e.message || e.statusCode))) ? "Projeto grande demais (limite 50 MB). Use Arquivo > Limpar imagens não usadas." : "Não salvou no Fluxo. Tente de novo."); })
      .then(function () { b.disabled = false; b.textContent = "Salvar no Fluxo"; });
  }

  function listar() {
    if (!client) return;
    var m = modal('<h2>Projetos do time</h2><p class="hint">Materiais Golden salvos no Fluxo. Abrir troca o projeto da tela pelo escolhido (o atual continua salvo no Fluxo se você salvou).</p><div id="fxL" class="olist"><p class="hint">Carregando…</p></div><div class="acts"><button class="btn" data-close>Fechar</button></div>');
    var box = $("#fxL", m);
    client.storage.from(BUCKET).list(PASTA, { limit: 200 }).then(function (r) {
      if (r.error) throw r.error;
      var pastas = (r.data || []).filter(function (f) { return !f.id; });
      return Promise.all(pastas.map(function (p) { return client.storage.from(BUCKET).list(PASTA + "/" + p.name, { limit: 100 }).then(function (x) { var fs = (x.data || []).filter(function (f) { return /\.json$/.test(f.name); }).sort(function (a, c) { return a.name < c.name ? 1 : -1; }); return fs.length ? { id: p.name, f: fs[0] } : null; }); }));
    }).then(function (itens) {
      itens = itens.filter(Boolean).sort(function (a, c) { return a.f.name < c.f.name ? 1 : -1; });
      if (!itens.length) { box.innerHTML = '<p class="hint">Nenhum projeto salvo ainda. Use "Salvar no Fluxo".</p>'; return; }
      box.innerHTML = itens.map(function (it, i) {
        var nome = it.f.name.replace(/^\d+__/, "").replace(/\.json$/, "").replace(/-/g, " "), ts = +it.f.name.split("__")[0];
        return '<div class="oi" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px"><span><b style="font-weight:600;text-transform:capitalize">' + esc(nome) + '</b><br><small style="color:var(--mu)">salvo ' + quando(ts) + " · " + mb((it.f.metadata && it.f.metadata.size) || 0) + (it.id === P.fluxoId ? " · aberto agora" : "") + '</small></span><button class="btn sm pri" data-fxo="' + i + '">Abrir</button></div>';
      }).join("");
      box.onclick = function (e) {
        var b = e.target.closest("[data-fxo]"); if (!b) return;
        var it = itens[+b.dataset.fxo]; b.disabled = true; b.textContent = "Abrindo…";
        client.storage.from(BUCKET).download(PASTA + "/" + it.id + "/" + it.f.name).then(function (r) { if (r.error) throw r.error; return r.data.text(); })
          .then(function (txt) { var d = JSON.parse(txt); delete d.fluxo; d.fluxoId = it.id; abrirDados(d); m.remove(); toast("Projeto aberto: " + (d.nome || "")); })
          .catch(function (er) { console.error(er); b.disabled = false; b.textContent = "Abrir"; toast("Não consegui abrir esse projeto."); });
      };
    }).catch(function (e) { console.error(e); box.innerHTML = '<p class="hint">Não consegui listar os projetos. Confira a internet.</p>'; });
  }

  $("#fxSalvar").onclick = salvarNoFluxo;
  $("#fxLista").onclick = listar;
  portao().catch(function () {});
})();
