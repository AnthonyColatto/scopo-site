/* Ponte entre o Tabloide Soldamaq (tabloide + desdobres) e o Fluxo do Time.
   - Só abre para quem está logado no Fluxo (mesma sessão do Supabase) e tem acesso à área "soldamaq".
   - "Salvar no FLUXO" guarda o projeto inteiro (lâminas, desdobres, marcas, fontes e as imagens usadas)
     em anexos/soldamaq/<id>/, para o time abrir de qualquer computador. Guarda também no navegador.
   - "Projetos do time" lista o que foi salvo e abre. */
(function () {
  var cfg = window.FLUXO_CONFIG || {};
  var temBase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var SUPA = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  var BUCKET = "anexos", PASTA = "soldamaq", AREA = "soldamaq", LOCAL = "soldamaq-tabloide";
  var client = null, perfil = null;

  function h(tag, attrs, html) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (html != null) e.innerHTML = html; return e; }
  function escH(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function slugP(s) { return String(s || "projeto").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "projeto"; }
  function quando(ts) { var d = new Date(ts); if (isNaN(d)) return ""; var p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function mb(b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  function guardarLocal(json) { try { localStorage.setItem(LOCAL, json); return true; } catch (e) { return false; } }

  // botões no topo do editor
  function montarBotoes() {
    var top = document.querySelector(".top"); if (!top || top.dataset.fx) return; top.dataset.fx = "1";
    // dentro do Fluxo (iframe) o menu já está em volta; o "voltar" só aparece em tela cheia
    if (window.top === window) {
      var voltar = h("a", { id: "fxVoltar", href: "../", class: "btn ghost", title: "Voltar ao Fluxo do Time", style: "text-decoration:none;color:inherit" }, "← Fluxo");
      top.insertBefore(voltar, top.firstChild);
    }
    if (!temBase) return;
    var salvar = document.getElementById("b-save");
    var lista = h("button", { class: "btn", id: "fxLista", type: "button", title: "Projetos Soldamaq salvos pelo time" }, "Projetos");
    salvar.parentNode.insertBefore(lista, salvar);
    salvar.title = "Guardar no Fluxo para o time abrir de qualquer computador";
    salvar.onclick = salvarNoFluxo;
    lista.onclick = listar;
  }

  // porta de entrada: precisa estar logado no Fluxo e liberado
  function portao() {
    if (!temBase) return Promise.resolve();
    var cortina = h("div", { id: "fxPortao", style: "position:fixed;inset:0;z-index:500;background:#0b0f0c;color:#fff;display:flex;align-items:center;justify-content:center;font:500 15px Montserrat,system-ui,sans-serif" }, "Verificando acesso ao Fluxo…");
    document.body.appendChild(cortina);
    var fora = function (msg) { cortina.innerHTML = '<div style="text-align:center;max-width:340px;padding:20px"><p style="margin:0 0 14px">' + msg + '</p><a href="../" target="_top" style="display:inline-block;background:#F5DF00;color:#0a0a0a;font-weight:700;padding:10px 18px;border-radius:4px;text-decoration:none">Entrar no Fluxo</a></div>'; };
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = SUPA; s.onload = res; s.onerror = rej; document.head.appendChild(s); })
      .then(function () { client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey); return client.auth.getSession(); })
      .then(function (r) {
        var sess = r && r.data && r.data.session;
        if (!sess) { fora("Entre no Fluxo do Time para usar o Tabloide Soldamaq."); throw { code: "sem-login" }; }
        return client.from("fluxo_perfis").select("email,nome,papel,permissoes").eq("email", String(sess.user.email || "").toLowerCase()).maybeSingle();
      })
      .then(function (r) {
        if (!r || !r.data) { fora("Seu acesso ao Fluxo ainda não foi liberado."); throw { code: "sem-perfil" }; }
        perfil = r.data;
        if (perfil.papel !== "admin" && perfil.permissoes && perfil.permissoes[AREA] === "nenhum") { fora("Você não tem acesso ao ambiente Soldamaq. Fale com o Tony ou a Ellyn."); throw { code: "sem-permissao" }; }
        cortina.remove();
      })
      .catch(function (e) { if (!e || !e.code) fora("Não consegui verificar o acesso. Confira a internet e recarregue."); throw e; });
  }

  function salvarNoFluxo() {
    if (!client) return;
    if (!P.fluxoId) P.fluxoId = Math.random().toString(36).slice(2, 10);
    var json = projectJSON(), o = JSON.parse(json);
    o.fluxo = { por: perfil && perfil.nome, em: new Date().toISOString() };
    json = JSON.stringify(o);
    guardarLocal(json);
    var id = P.fluxoId, path = PASTA + "/" + id + "/" + Date.now() + "__" + slugP(P.name) + ".json";
    var blob = new Blob([json], { type: "application/json" });
    var b = document.getElementById("b-save"); b.disabled = true; b.textContent = "Salvando…";
    client.storage.from(BUCKET).upload(path, blob, { contentType: "application/json", upsert: false })
      .then(function (r) {
        if (r.error) throw r.error;
        toast("Projeto salvo no FLUXO (" + mb(blob.size) + ").");
        // mantém as 3 versões mais recentes deste projeto (só apaga quem tem permissão; as outras ficam)
        return client.storage.from(BUCKET).list(PASTA + "/" + id, { limit: 100 }).then(function (l) {
          var velhos = (l.data || []).filter(function (f) { return f.name !== path.split("/").pop(); }).sort(function (a, c) { return a.name < c.name ? 1 : -1; }).slice(2).map(function (f) { return PASTA + "/" + id + "/" + f.name; });
          if (velhos.length) return client.storage.from(BUCKET).remove(velhos);
        });
      })
      .catch(function (e) { console.error(e); toast(/size|large|413/i.test(String(e && (e.message || e.statusCode))) ? "Projeto grande demais (limite de 50 MB). Tire da biblioteca as imagens que não usa." : "Não salvou no FLUXO. Ficou só neste navegador; tente de novo."); })
      .then(function () { b.disabled = false; b.textContent = "Salvar no FLUXO"; });
  }

  function listar() {
    if (!client) return;
    var box = h("div", { class: "fx-lista" }, '<p class="hint">Carregando…</p>');
    var intro = h("p", { class: "hint", style: "margin:0 0 10px" }, "Projetos Soldamaq salvos no Fluxo. Abrir troca o projeto da tela pelo escolhido, com lâminas, desdobres e imagens.");
    var wrap = h("div"); wrap.appendChild(intro); wrap.appendChild(box);
    var m = modal("Projetos do time", wrap);
    client.storage.from(BUCKET).list(PASTA, { limit: 200 }).then(function (r) {
      if (r.error) throw r.error;
      var pastas = (r.data || []).filter(function (f) { return !f.id; }); // pastas não têm id
      return Promise.all(pastas.map(function (p) { return client.storage.from(BUCKET).list(PASTA + "/" + p.name, { limit: 100 }).then(function (x) { var fs = (x.data || []).filter(function (f) { return /\.json$/.test(f.name); }).sort(function (a, c) { return a.name < c.name ? 1 : -1; }); return fs.length ? { id: p.name, f: fs[0] } : null; }); }));
    }).then(function (itens) {
      itens = itens.filter(Boolean).sort(function (a, c) { return a.f.name < c.f.name ? 1 : -1; });
      if (!itens.length) { box.innerHTML = '<p class="hint">Nenhum projeto salvo ainda. Use "Salvar no FLUXO".</p>'; return; }
      box.innerHTML = itens.map(function (it, i) {
        var nome = it.f.name.replace(/^\d+__/, "").replace(/\.json$/, "").replace(/-/g, " "), ts = +it.f.name.split("__")[0];
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08)"><span><b style="font-weight:600;text-transform:capitalize">' + escH(nome) + '</b><br><small style="opacity:.6">salvo ' + quando(ts) + " · " + mb((it.f.metadata && it.f.metadata.size) || 0) + (it.id === P.fluxoId ? " · aberto agora" : "") + '</small></span><button class="btn sm pri" data-fxo="' + i + '">Abrir</button></div>';
      }).join("");
      box.onclick = function (e) {
        var b = e.target.closest("[data-fxo]"); if (!b) return;
        var it = itens[+b.dataset.fxo]; b.disabled = true; b.textContent = "Abrindo…";
        client.storage.from(BUCKET).download(PASTA + "/" + it.id + "/" + it.f.name).then(function (r) { if (r.error) throw r.error; return r.data.text(); })
          .then(function (txt) { loadJSON(txt); P.fluxoId = it.id; guardarLocal(projectJSON()); m.close(); toast("Projeto aberto: " + escH(P.name || "")); })
          .catch(function (er) { console.error(er); b.disabled = false; b.textContent = "Abrir"; toast("Não consegui abrir esse projeto."); });
      };
    }).catch(function (e) { console.error(e); box.innerHTML = '<p class="hint">Não consegui listar os projetos. Confira a internet.</p>'; });
  }

  montarBotoes();
  portao().catch(function () {});
})();
