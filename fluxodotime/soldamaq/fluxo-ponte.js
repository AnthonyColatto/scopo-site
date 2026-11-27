/* Ponte entre o Tabloide Soldamaq (tabloide + desdobres) e o Fluxo do Time.
   - Só abre para quem está logado no Fluxo (mesma sessão do Supabase) e tem acesso à área "soldamaq".
   - "Salvar no FLUXO" guarda o projeto inteiro (lâminas, desdobres, marcas, fontes e as imagens usadas)
     em anexos/soldamaq/<id>/, para o time abrir de qualquer computador. Cada imagem vai num arquivo próprio
     (anexos/soldamaq/<id>/img/<hash>), só uma vez; o .json do projeto fica leve e sobe rápido.
   - Guarda também no navegador (IndexedDB, sem o limite de 5 MB do localStorage) e salva sozinho
     no navegador a cada alteração, para não perder trabalho se a aba fechar.
   - "Projetos do time" lista o que foi salvo e abre. */
(function () {
  var cfg = window.FLUXO_CONFIG || {};
  var temBase = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  var SUPA = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  var BUCKET = "anexos", PASTA = "soldamaq", AREA = "soldamaq", LOCAL = "soldamaq-tabloide", ULTIMO = "soldamaq-ultimo";
  var client = null, perfil = null;

  function h(tag, attrs, html) { var e = document.createElement(tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (html != null) e.innerHTML = html; return e; }
  function escH(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function slugP(s) { return String(s || "projeto").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "projeto"; }
  function quando(ts) { var d = new Date(ts); if (isNaN(d)) return ""; var p = function (n) { return String(n).padStart(2, "0"); }; return p(d.getDate()) + "/" + p(d.getMonth() + 1) + " " + p(d.getHours()) + ":" + p(d.getMinutes()); }
  function mb(b) { return b > 1048576 ? (b / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(b / 1024)) + " KB"; }
  // cópia no navegador: IndexedDB aguenta projetos grandes; o localStorage (5 MB) fica só para os pequenos.
  // Projeto grande demais para o localStorage: apaga a cópia antiga dele para ela não voltar no lugar da nova.
  var dbP = null;
  function db() { if (!dbP) dbP = new Promise(function (res, rej) { var r = indexedDB.open("soldamaq", 1); r.onupgradeneeded = function () { r.result.createObjectStore("kv"); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); return dbP; }
  function idbSet(k, v) { return db().then(function (d) { return new Promise(function (res, rej) { var t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = function () { res(true); }; t.onerror = function () { rej(t.error); }; }); }); }
  function idbGet(k) { return db().then(function (d) { return new Promise(function (res, rej) { var q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { rej(q.error); }; }); }); }
  function guardarLocal(json) {
    var ok = true; try { localStorage.setItem(LOCAL, json); } catch (e) { ok = false; try { localStorage.removeItem(LOCAL); } catch (x) {} }
    return idbSet(LOCAL, json).then(function () { return true; }, function (e) { console.error(e); return ok; });
  }
  function carimbo(json) { try { var o = JSON.parse(json); return { ts: Date.parse((o.fluxo && o.fluxo.em) || o.savedAt) || 0, id: o.project && o.project.fluxoId }; } catch (e) { return { ts: 0 }; } }
  function comTempo(p, ms, msg) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error(msg || "tempo esgotado")); }, ms); })]); }
  function emLotes(lista, n, fn) { var i = 0; function prox() { if (i >= lista.length) return Promise.resolve(); var k = i++; return fn(lista[k], k).then(prox); } var w = []; for (var j = 0; j < Math.min(n, lista.length); j++) w.push(prox()); return Promise.all(w); }
  function paraBlob(dataURL) { return fetch(dataURL).then(function (r) { return r.blob(); }); }
  function paraDataURL(blob) { return new Promise(function (res, rej) { var fr = new FileReader(); fr.onload = function () { res(fr.result); }; fr.onerror = function () { rej(fr.error); }; fr.readAsDataURL(blob); }); }
  function hashDe(blob) { return blob.arrayBuffer().then(function (b) { return crypto.subtle.digest("SHA-256", b); }).then(function (d) { return Array.from(new Uint8Array(d)).slice(0, 16).map(function (x) { return x.toString(16).padStart(2, "0"); }).join(""); }); }
  var EXT = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg", "image/gif": "gif", "font/ttf": "ttf", "font/otf": "otf", "font/woff": "woff", "font/woff2": "woff2" };
  function marcarUltimo(id) { try { localStorage.setItem(ULTIMO, id); } catch (e) {} }
  // assinatura do projeto como está no FLUXO: se a cópia do navegador for diferente, ela tem alterações não salvas
  var SYNC = "soldamaq-sync";
  function assin(p) { var s = JSON.stringify(p), x = 0; for (var i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x + ":" + s.length; }
  function marcarSync(id, p) { try { localStorage.setItem(SYNC, id + "|" + assin(p)); } catch (e) {} }
  function sujo(raw) { try { var o = JSON.parse(raw), p = o.project; return localStorage.getItem(SYNC) !== (p && p.fluxoId) + "|" + assin(p); } catch (e) { return true; } }
  function lerUltimo() { try { return localStorage.getItem(ULTIMO); } catch (e) { return null; } }
  function tsArq(f) { return +String(f.name).split("__")[0] || 0; }
  // versões salvas de um projeto, da mais nova para a mais antiga
  function versoes(id) { return client.storage.from(BUCKET).list(PASTA + "/" + id, { limit: 100 }).then(function (x) { return (x.data || []).filter(function (f) { return /\.json$/.test(f.name); }).sort(function (a, c) { return a.name < c.name ? 1 : -1; }); }); }
  // todos os projetos do time, cada um com a versão mais nova, do mais recente para o mais antigo
  function projetos() {
    return client.storage.from(BUCKET).list(PASTA, { limit: 200 }).then(function (r) {
      if (r.error) throw r.error;
      var pastas = (r.data || []).filter(function (f) { return !f.id; }); // pastas não têm id
      return Promise.all(pastas.map(function (p) { return versoes(p.name).then(function (fs) { return fs.length ? { id: p.name, f: fs[0] } : null; }); }));
    }).then(function (itens) { return itens.filter(Boolean).sort(function (a, c) { return a.f.name < c.f.name ? 1 : -1; }); });
  }
  // baixa o projeto e as imagens que ficaram em arquivos separados
  function abrir(it, aviso) {
    var t = aviso === false ? null : toast("Abrindo o projeto do FLUXO…", 0);
    return client.storage.from(BUCKET).download(PASTA + "/" + it.id + "/" + it.f.name).then(function (r) { if (r.error) throw r.error; return r.data.text(); })
      .then(function (txt) {
        var o = JSON.parse(txt), refs = o.assetRefs || {}, ks = Object.keys(refs), feitos = 0; o.assets = o.assets || {};
        return emLotes(ks, 6, function (k) {
          return comTempo(client.storage.from(BUCKET).download(o.assetsDir + "/" + refs[k]), 120000, "imagem demorou").then(function (r) { if (r.error) throw r.error; return paraDataURL(r.data); })
            .then(function (u) { o.assets[k] = u; feitos++; if (t) t.firstChild.innerHTML = "Abrindo o projeto do FLUXO · imagens " + feitos + "/" + ks.length + "…"; });
        }).then(function () { delete o.assetRefs; delete o.assetsDir; return JSON.stringify(o); });
      })
      .then(function (txt) { loadJSON(txt); P.fluxoId = it.id; marcarUltimo(it.id); marcarSync(it.id, P); return guardarLocal(projectJSON()); })
      .then(function (v) { if (t) t.remove(); return v; }, function (e) { if (t) t.remove(); throw e; });
  }

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

  var salvando = false;
  function salvarNoFluxo() {
    if (!client || salvando) return;
    salvando = true;
    if (!P.fluxoId) P.fluxoId = Math.random().toString(36).slice(2, 10);
    var json = projectJSON(), o = JSON.parse(json), agora = Date.now();
    o.fluxo = { por: perfil && perfil.nome, em: new Date(agora).toISOString() };
    json = JSON.stringify(o);
    var id = P.fluxoId, dir = PASTA + "/" + id, imgDir = dir + "/img", path = dir + "/" + agora + "__" + slugP(P.name) + ".json";
    var b = document.getElementById("b-save"), txt = function (s) { b.textContent = s; };
    b.disabled = true; txt("Salvando…");
    var local = guardarLocal(json);   // primeiro no navegador: se a internet cair, o trabalho fica aqui
    var ids = Object.keys(o.assets || {}), refs = {}, feitas = 0, ja = {};
    // o que já subiu deste projeto não sobe de novo
    var listarImgs = function (off) { return client.storage.from(BUCKET).list(imgDir, { limit: 1000, offset: off }).then(function (r) { (r.data || []).forEach(function (f) { ja[f.name] = 1; }); if ((r.data || []).length === 1000) return listarImgs(off + 1000); }); };
    comTempo(listarImgs(0), 60000).catch(function () {})
      .then(function () {
        return emLotes(ids, 4, function (k) {
          return paraBlob(o.assets[k]).then(function (blob) {
            return hashDe(blob).then(function (hx) {
              var nome = hx + "." + (EXT[blob.type] || "bin"); refs[k] = nome;
              if (ja[nome]) return;
              var tenta = function (n) {
                return comTempo(client.storage.from(BUCKET).upload(imgDir + "/" + nome, blob, { contentType: blob.type || "application/octet-stream", upsert: false }), 120000, "imagem demorou")
                  .then(function (r) { if (r.error && !/exist|duplicate|409/i.test(String(r.error.message || r.error.statusCode || r.error.error))) throw r.error; ja[nome] = 1; })
                  .catch(function (e) { if (n < 2) return tenta(n + 1); throw e; });
              };
              return tenta(0);
            });
          }).then(function () { feitas++; txt("Salvando imagens " + feitas + "/" + ids.length + "…"); });
        });
      })
      .then(function () {
        o.assets = {}; o.assetRefs = refs; o.assetsDir = imgDir;
        var blob = new Blob([JSON.stringify(o)], { type: "application/json" }); txt("Salvando projeto…");
        return comTempo(client.storage.from(BUCKET).upload(path, blob, { contentType: "application/json", upsert: false }), 120000, "projeto demorou").then(function (r) {
          if (r.error) throw r.error;
          marcarUltimo(id); marcarSync(id, o.project); toast("Projeto salvo no FLUXO às " + new Date(agora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) + " (" + ids.length + " imagens). Já dá para abrir em outra aba ou computador.", 7000);
          // mantém as 3 versões mais recentes deste projeto (só .json; as imagens ficam para as versões que usam)
          return client.storage.from(BUCKET).list(dir, { limit: 100 }).then(function (l) {
            var velhos = (l.data || []).filter(function (f) { return /\.json$/.test(f.name) && f.name !== path.split("/").pop(); }).sort(function (a, c) { return a.name < c.name ? 1 : -1; }).slice(2).map(function (f) { return dir + "/" + f.name; });
            if (velhos.length) return client.storage.from(BUCKET).remove(velhos);
          }).catch(function () {});
        });
      })
      .catch(function (e) {
        console.error(e);
        return local.then(function (ok) {
          var t = toast("<b>Não salvou no FLUXO</b> (" + escH(String((e && (e.message || e.statusCode)) || "erro")) + "). " + (ok ? "O trabalho está guardado neste navegador. " : "") + "Tente de novo ou use Exportar › Salvar projeto.", 0);
          var x = h("button", { class: "btn sm", type: "button" }, "Ok"); x.onclick = function () { t.remove(); }; t.appendChild(x);
        });
      })
      .then(function () { salvando = false; b.disabled = false; txt("Salvar no FLUXO"); });
  }

  function listar() {
    if (!client) return;
    var box = h("div", { class: "fx-lista" }, '<p class="hint">Carregando…</p>');
    var intro = h("p", { class: "hint", style: "margin:0 0 10px" }, "Projetos Soldamaq salvos no Fluxo. Abrir troca o projeto da tela pelo escolhido, com lâminas, desdobres e imagens.");
    var wrap = h("div"); wrap.appendChild(intro); wrap.appendChild(box);
    var m = modal("Projetos do time", wrap);
    projetos().then(function (itens) {
      if (!itens.length) { box.innerHTML = '<p class="hint">Nenhum projeto salvo ainda. Use "Salvar no FLUXO".</p>'; return; }
      box.innerHTML = itens.map(function (it, i) {
        var nome = it.f.name.replace(/^\d+__/, "").replace(/\.json$/, "").replace(/-/g, " "), ts = +it.f.name.split("__")[0];
        return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-top:1px solid rgba(255,255,255,.08)"><span><b style="font-weight:600;text-transform:capitalize">' + escH(nome) + '</b><br><small style="opacity:.6">salvo ' + quando(ts) + " · " + mb((it.f.metadata && it.f.metadata.size) || 0) + (it.id === P.fluxoId ? " · aberto agora" : "") + '</small></span><button class="btn sm pri" data-fxo="' + i + '">Abrir</button></div>';
      }).join("");
      box.onclick = function (e) {
        var b = e.target.closest("[data-fxo]"); if (!b) return;
        var it = itens[+b.dataset.fxo]; b.disabled = true; b.textContent = "Abrindo…";
        abrir(it)
          .then(function () { m.close(); toast("Projeto aberto: " + escH(P.name || "")); })
          .catch(function (er) { console.error(er); b.disabled = false; b.textContent = "Abrir"; toast("Não consegui abrir esse projeto."); });
      };
    }).catch(function (e) { console.error(e); box.innerHTML = '<p class="hint">Não consegui listar os projetos. Confira a internet.</p>'; });
  }

  // ao entrar: abre a cópia mais nova entre o navegador (IndexedDB) e o FLUXO (pode ter sido salva em outro computador).
  // Sem nada neste navegador, abre o mais recente do time. Nunca troca o que a pessoa já começou a mexer
  // nem um projeto diferente do aberto sem perguntar.
  function oferecer(x, nome, msg) { var t = toast(msg, 15000); var b = h("button", { class: "btn sm", type: "button" }, "Abrir"); b.onclick = function () { t.remove(); abrir(x).then(function () { toast("Projeto aberto: " + escH(P.name || nome)); }, function (e) { console.error(e); toast("Não consegui abrir esse projeto."); }); }; t.appendChild(b); }
  function retomar() {
    if (!client) return;
    var h0 = hist.i, aviso = toast("Procurando o último projeto salvo…", 0), fim = function () { aviso.remove(); };
    var localTs = 0, localId = null, localRaw = null;
    try { localRaw = localStorage.getItem(LOCAL); var c0 = carimbo(localRaw || "null"); localTs = c0.ts; localId = c0.id; } catch (e) {}
    idbGet(LOCAL).catch(function () { return null; }).then(function (raw) {
      if (!raw) return;
      var c = carimbo(raw);
      if (c.ts > localTs && hist.i === h0) { loadJSON(raw); h0 = hist.i; localRaw = raw; localTs = c.ts; localId = c.id; toast("Reabri o último projeto deste navegador: <b>" + escH(P.name || "") + "</b>.", 6000); }
    }).then(function () {
      var id = localId || lerUltimo() || P.fluxoId;
      return (id ? versoes(id).then(function (fs) { return fs.length ? { id: id, f: fs[0] } : null; }) : Promise.resolve(null))
        .then(function (x) { return x || (localTs ? null : projetos().then(function (l) { return l[0] || null; })); });
    }).then(function (x) {
      if (!x) return;
      if (localTs && tsArq(x.f) <= localTs) return; // o deste navegador já é o mais novo
      var nome = x.f.name.replace(/^\d+__/, "").replace(/\.json$/, "").replace(/-/g, " ");
      if (hist.i !== h0 || (localTs && P.fluxoId !== x.id)) return oferecer(x, nome, "Há uma versão mais nova de <b>" + escH(nome) + "</b> no FLUXO (salva " + quando(tsArq(x.f)) + "). ");
      if (localTs && sujo(localRaw)) return oferecer(x, nome, "Este navegador tem alterações que não foram para o FLUXO, e lá há uma versão de <b>" + escH(nome) + "</b> salva " + quando(tsArq(x.f)) + ". Abrir troca a da tela por ela. ");
      return abrir(x, false).then(function () { toast("Abri o projeto salvo no FLUXO: <b>" + escH(P.name || nome) + "</b> (salvo " + quando(tsArq(x.f)) + "). Outros estão em Projetos.", 7000); });
    }).catch(function (e) { console.error(e); }).then(fim, fim);
  }

  // salva sozinho no navegador alguns segundos depois de cada alteração
  var autoT = null;
  function autoSalvar() { clearTimeout(autoT); autoT = setTimeout(function () { try { guardarLocal(projectJSON()); } catch (e) { console.error(e); } }, 4000); }
  if (typeof window.commit === "function") { var orig = window.commit; window.commit = function () { var r = orig.apply(this, arguments); autoSalvar(); return r; }; }
  window.addEventListener("pagehide", function () { if (autoT) { clearTimeout(autoT); try { var j = projectJSON(); localStorage.setItem(LOCAL, j); } catch (e) {} } });

  montarBotoes();
  portao().then(retomar).catch(function () {});
})();
