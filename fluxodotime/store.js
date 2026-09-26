/* Camada de dados do Fluxo do Time.
   A tela só conversa com esta API; trocar onde os dados moram não mexe no app.

   Ordem de escolha:
   1. Supabase, se config.js estiver preenchido (base do time, com login e permissões no banco).
   2. Banco da prévia, quando a página roda dentro do Claude.
   3. localStorage (só neste navegador).

   API:
     Store.mode                       "supabase" | "claude" | "local"
     Store.perfil                     {email, nome, papel} no Supabase; null nos outros modos
     Store.sub(col, cb, onErr)        cb(lista de {id, ...dados})
     Store.add / set / upd / del
     Store.seed(defaults)
     Store.upload(file, pasta)        -> {ref, nome, tipo, tamanho, em}
     Store.fileUrl(anexo)             -> Promise<url>
     Store.removeFile(anexo)
     Store.perfis.list/save/remove    gestão de acessos (só no Supabase)
     Store.logout()
*/
(function () {
  var COLS = ["pauta", "pessoas", "ciclo", "modelos", "quadros", "cartoes", "config", "eventos", "mapas",
    "nfs", "contratos", "orcamento", "cooperada", "cofre", "visitas"];
  var SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/dist/umd/supabase.js";
  var TABLE = "fluxo_docs", PERFIS = "fluxo_perfis", BUCKET = "anexos";
  var MAX_BYTES = 50 * 1024 * 1024;

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function safeName(n) { return String(n || "arquivo").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-").slice(-80); }
  function meta(file, ref, extra) {
    return Object.assign({ ref: ref, nome: file.name || "arquivo", tipo: file.type || "", tamanho: file.size || 0, em: new Date().toISOString() }, extra || {});
  }
  function tooBig(file) {
    if (file.size > MAX_BYTES) return Promise.reject({ code: "too_large", message: "Arquivo acima de 50 MB." });
    return null;
  }

  /* ---------- arquivos no próprio navegador (IndexedDB) ---------- */
  var IDB = (function () {
    var dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        try {
          var r = indexedDB.open("scopo-fluxo-anexos", 1);
          r.onupgradeneeded = function () { r.result.createObjectStore("f"); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
        } catch (e) { rej(e); }
      });
      return dbp;
    }
    function tx(mode, fn) { return open().then(function (db) { return new Promise(function (res, rej) { var t = db.transaction("f", mode); var q = fn(t.objectStore("f")); t.oncomplete = function () { res(q && q.result); }; t.onerror = function () { rej(t.error); }; }); }); }
    var urls = {};
    return {
      put: function (key, blob) { return tx("readwrite", function (s) { return s.put(blob, key); }); },
      url: function (key) { if (urls[key]) return Promise.resolve(urls[key]); return tx("readonly", function (s) { return s.get(key); }).then(function (b) { if (!b) throw new Error("não encontrado"); urls[key] = URL.createObjectURL(b); return urls[key]; }); },
      del: function (key) { return tx("readwrite", function (s) { return s.delete(key); }); }
    };
  })();
  function localUpload(file) {
    var key = "idb:" + uid() + "-" + safeName(file.name);
    return IDB.put(key, file).then(function () { return meta(file, key, { local: true }); });
  }

  /* ---------- localStorage ---------- */
  function LocalAdapter() {
    var KEY = "scopo.fluxo.v1", data = {}, subs = {};
    function load() {
      try { data = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem("scopo.gestao.v1") || "{}") || {}; } catch (e) { data = {}; }
      COLS.forEach(function (c) { if (!data[c]) data[c] = {}; });
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
    function list(col) { return Object.keys(data[col]).map(function (id) { return Object.assign({ id: id }, data[col][id]); }); }
    function emit(col) { (subs[col] || []).forEach(function (cb) { cb(list(col)); }); }
    load();
    window.addEventListener("storage", function (e) { if (e.key === KEY) { load(); COLS.forEach(emit); } });
    return {
      mode: "local",
      isEmpty: function () { return !list("pessoas").length && !list("modelos").length; },
      sub: function (col, cb) { (subs[col] = subs[col] || []).push(cb); setTimeout(function () { cb(list(col)); }, 0); return function () {}; },
      add: function (col, d) { var id = uid(); data[col][id] = d; save(); emit(col); return Promise.resolve(id); },
      set: function (col, id, d) { data[col][id] = d; save(); emit(col); return Promise.resolve(); },
      upd: function (col, id, p) { data[col][id] = Object.assign({}, data[col][id] || {}, p); save(); emit(col); return Promise.resolve(); },
      del: function (col, id) { delete data[col][id]; save(); emit(col); return Promise.resolve(); },
      upload: function (file) { return tooBig(file) || localUpload(file); },
      fileUrl: function (a) { return IDB.url(a.ref); },
      removeFile: function (a) { return IDB.del(a.ref).catch(function () {}); },
      logout: null
    };
  }

  /* ---------- prévia no Claude ---------- */
  function ClaudeAdapter(db, assets) {
    return {
      mode: "claude",
      sub: function (col, cb, onErr) {
        return db.collection(col).onSnapshot(function (snap) {
          cb(snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); }));
        }, function (e) { if (onErr) onErr(e); });
      },
      add: function (col, d) { var id = uid(); return db.doc(col + "/" + id).set(d).then(function () { return id; }); },
      set: function (col, id, d) { return db.doc(col + "/" + id).set(d); },
      upd: function (col, id, p) { return db.doc(col + "/" + id).update(p); },
      del: function (col, id) { return db.doc(col + "/" + id).delete(); },
      upload: function (file) {
        var big = tooBig(file); if (big) return big;
        if (!assets) return localUpload(file);
        return assets.upload(file, { type: file.type || undefined }).then(function (r) {
          return meta(file, "asset:" + r.id, { url: r.url });
        }, function (e) {
          // planilhas e Word não são aceitos pela prévia: ficam só neste aparelho
          if (e && (e.code === "unsupported_type" || e.code === "not_granted" || e.code === "capability_disabled")) return localUpload(file);
          throw e;
        });
      },
      fileUrl: function (a) { if (a.ref && a.ref.indexOf("idb:") === 0) return IDB.url(a.ref); return Promise.resolve(a.url || "/_blob/" + String(a.ref).replace("asset:", "")); },
      removeFile: function (a) {
        if (a.ref && a.ref.indexOf("idb:") === 0) return IDB.del(a.ref).catch(function () {});
        return assets ? assets.delete(String(a.ref).replace("asset:", "")).catch(function () {}) : Promise.resolve();
      },
      logout: null
    };
  }

  /* ---------- Supabase ---------- */
  function SupabaseAdapter(client, perfil) {
    var cache = {}, subs = {}, loadedCols = {}, urlCache = {};
    COLS.forEach(function (c) { cache[c] = {}; });
    function list(col) { return Object.keys(cache[col]).map(function (id) { return Object.assign({ id: id }, cache[col][id]); }); }
    function emit(col) { (subs[col] || []).forEach(function (cb) { cb(list(col)); }); }
    function check(r) { if (r.error) throw r.error; return r; }
    client.channel("fluxo-all").on("postgres_changes", { event: "*", schema: "public", table: TABLE }, function (p) {
      var row = p.new && p.new.col ? p.new : p.old; if (!row || !row.col || !cache[row.col]) return;
      if (p.eventType === "DELETE") delete cache[row.col][row.id]; else cache[row.col][row.id] = row.data || {};
      emit(row.col);
    }).subscribe();
    function fetchCol(col) {
      return client.from(TABLE).select("id,data").eq("col", col).then(check).then(function (r) {
        cache[col] = {}; (r.data || []).forEach(function (x) { cache[col][x.id] = x.data || {}; }); loadedCols[col] = true; emit(col);
      });
    }
    function denied(r) { if (r.error) throw r.error; if (!r.data || !r.data.length) throw { code: "42501", message: "sem permissão" }; return r; }
    function write(col, id, d) {
      var before = cache[col][id];
      cache[col][id] = d; emit(col);
      var now = new Date().toISOString();
      // editar e criar são comandos separados: o banco aplica regras diferentes para cada um
      var q = before !== undefined
        ? client.from(TABLE).update({ data: d, updated_at: now }).eq("col", col).eq("id", id).select("id")
        : client.from(TABLE).insert({ col: col, id: id, data: d, updated_at: now }).select("id");
      return q.then(denied).catch(function (e) {
        if (before === undefined && e && e.code === "23505") { // já existia (criado por outra pessoa): tenta editar
          return client.from(TABLE).update({ data: d, updated_at: now }).eq("col", col).eq("id", id).select("id").then(denied);
        }
        throw e;
      }).catch(function (e) { if (before === undefined) delete cache[col][id]; else cache[col][id] = before; emit(col); throw e; });
    }
    return {
      mode: "supabase",
      perfil: perfil,
      sub: function (col, cb, onErr) {
        (subs[col] = subs[col] || []).push(cb);
        if (loadedCols[col]) setTimeout(function () { cb(list(col)); }, 0);
        else fetchCol(col).catch(function (e) { if (onErr) onErr(e); });
        return function () {};
      },
      add: function (col, d) { var id = uid(); return write(col, id, d).then(function () { return id; }); },
      set: function (col, id, d) { return write(col, id, d); },
      upd: function (col, id, p) { return write(col, id, Object.assign({}, cache[col][id] || {}, p)); },
      del: function (col, id) {
        var before = cache[col][id]; delete cache[col][id]; emit(col);
        return client.from(TABLE).delete().eq("col", col).eq("id", id).select("id").then(denied).catch(function (e) { if (before) { cache[col][id] = before; emit(col); } throw e; });
      },
      upload: function (file, pasta) {
        var big = tooBig(file); if (big) return big;
        var path = (pasta || "geral") + "/" + uid() + "-" + safeName(file.name);
        return client.storage.from(BUCKET).upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false })
          .then(function (r) { if (r.error) throw r.error; return meta(file, "sb:" + path); });
      },
      fileUrl: function (a) {
        var path = String(a.ref).replace("sb:", ""), c = urlCache[path];
        if (c && c.exp > Date.now()) return Promise.resolve(c.url);
        return client.storage.from(BUCKET).createSignedUrl(path, 3600).then(function (r) {
          if (r.error) throw r.error; urlCache[path] = { url: r.data.signedUrl, exp: Date.now() + 50 * 60 * 1000 }; return r.data.signedUrl;
        });
      },
      removeFile: function (a) { return client.storage.from(BUCKET).remove([String(a.ref).replace("sb:", "")]).catch(function () {}); },
      perfis: {
        list: function () { return client.from(PERFIS).select("email,nome,papel").order("nome").then(check).then(function (r) { return r.data || []; }); },
        save: function (p) { return client.from(PERFIS).upsert({ email: String(p.email).trim().toLowerCase(), nome: p.nome, papel: p.papel }).select("email").then(denied); },
        remove: function (email) { return client.from(PERFIS).delete().eq("email", email).select("email").then(denied); }
      },
      logout: function () { return client.auth.signOut().then(function () { location.reload(); }); }
    };
  }

  function loadScript(src) {
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }

  /* ---------- telas de acesso (Supabase) ---------- */
  function screen(html) {
    var old = document.querySelector(".login"); if (old) old.remove();
    var wrap = document.createElement("div"); wrap.className = "login";
    wrap.innerHTML = '<div class="login-box"><img src="logo.png" alt="SCOPO"><div class="eyebrow">Fluxo do time</div>' + html + "</div>";
    document.body.appendChild(wrap);
    return wrap;
  }
  function loginGate(client) {
    return new Promise(function (resolve) {
      var recovering = false;
      client.auth.onAuthStateChange(function (ev) {
        if (ev === "PASSWORD_RECOVERY") { recovering = true; newPassword(); }
      });
      function newPassword() {
        var w = screen('<h2>Nova senha</h2><form id="npF" class="login-form"><div class="field"><label for="npP">Nova senha (mínimo 6 caracteres)</label><input type="password" id="npP" minlength="6" required autocomplete="new-password"></div><p class="hint" id="npM"></p><button class="btn" type="submit">Salvar senha <span class="arrow">→</span></button></form>');
        w.querySelector("#npF").onsubmit = function (e) {
          e.preventDefault();
          client.auth.updateUser({ password: w.querySelector("#npP").value }).then(function (r) {
            if (r.error) { w.querySelector("#npM").textContent = "Não deu certo: " + r.error.message; return; }
            w.remove(); resolve();
          });
        };
      }
      function login(tab, msg) {
        var entrar = tab !== "primeiro";
        var w = screen(
          '<div class="seg login-tabs"><button type="button" data-t="entrar" aria-pressed="' + entrar + '">Entrar</button><button type="button" data-t="primeiro" aria-pressed="' + !entrar + '">Primeiro acesso</button></div>' +
          '<form id="lgF" class="login-form" autocomplete="on">' +
          '<div class="field"><label for="lgE">Email</label><input type="email" id="lgE" required autocomplete="username"></div>' +
          '<div class="field"><label for="lgP">' + (entrar ? "Senha" : "Crie uma senha (mínimo 6 caracteres)") + '</label><input type="password" id="lgP" required minlength="6" autocomplete="' + (entrar ? "current-password" : "new-password") + '"></div>' +
          '<p class="hint" id="lgM">' + (msg || (entrar ? "" : "Use o email que o Tony ou a Ellyn liberaram para você.")) + "</p>" +
          '<button class="btn" type="submit">' + (entrar ? "Entrar" : "Criar acesso") + ' <span class="arrow">→</span></button>' +
          (entrar ? '<button type="button" class="linkbtn" id="lgForgot">Esqueci a senha</button>' : "") + "</form>");
        w.querySelectorAll("[data-t]").forEach(function (b) { b.onclick = function () { login(b.dataset.t); }; });
        var m = w.querySelector("#lgM");
        var fg = w.querySelector("#lgForgot");
        if (fg) fg.onclick = function () {
          var email = w.querySelector("#lgE").value.trim();
          if (!email) { m.textContent = "Escreva seu email acima e clique de novo em Esqueci a senha."; return; }
          client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }).then(function (r) {
            m.textContent = r.error ? "Não deu certo: " + r.error.message : "Enviamos um link para " + email + ". Abra no mesmo aparelho.";
          });
        };
        w.querySelector("#lgF").onsubmit = function (e) {
          e.preventDefault();
          var email = w.querySelector("#lgE").value.trim(), pass = w.querySelector("#lgP").value;
          m.textContent = entrar ? "Entrando…" : "Criando…";
          var p = entrar ? client.auth.signInWithPassword({ email: email, password: pass }) : client.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: location.origin + location.pathname } });
          p.then(function (r) {
            if (r.error) {
              var t = r.error.message || "";
              m.textContent = /invalid login/i.test(t) ? "Email ou senha não conferem." : /already registered/i.test(t) ? "Esse email já tem acesso. Use Entrar." : "Não deu certo: " + t;
              return;
            }
            if (!entrar && !r.data.session) { login("entrar", "Acesso criado. Confirme pelo link que chegou no seu email e depois entre aqui."); return; }
            w.remove(); resolve();
          });
        };
      }
      client.auth.getSession().then(function (r) {
        if (recovering) return;
        if (r.data && r.data.session && !/type=recovery/.test(location.hash)) resolve(); else if (!/type=recovery/.test(location.hash)) login("entrar");
      });
    });
  }
  function loadPerfil(client) {
    return client.auth.getUser().then(function (u) {
      var email = u.data && u.data.user ? String(u.data.user.email || "").toLowerCase() : "";
      return client.from(PERFIS).select("email,nome,papel").eq("email", email).maybeSingle().then(function (r) {
        if (r.data) return r.data;
        var w = screen('<h2>Acesso ainda não liberado</h2><p class="muted">O email <b>' + email.replace(/</g, "") + '</b> entrou, mas ainda não foi ligado a uma pessoa do time. Peça ao Tony ou à Ellyn para liberar em Admin &gt; Acessos.</p><button class="btn ghost" id="lgOut">Sair</button>');
        w.querySelector("#lgOut").onclick = function () { client.auth.signOut().then(function () { location.reload(); }); };
        return new Promise(function () {});
      });
    });
  }

  function finish(s) {
    s.uid = uid;
    s.maxBytes = MAX_BYTES;
    s.seed = function (D) {
      var jobs = [s.set("config", "listas", D.config.listas)];
      if (D.config.acessos && s.mode !== "supabase") jobs.push(s.set("config", "acessos", D.config.acessos));
      D.pessoas.forEach(function (p) { var c = Object.assign({}, p), id = c.id; delete c.id; jobs.push(s.set("pessoas", id, c)); });
      D.ciclo.forEach(function (c, i) { jobs.push(s.set("ciclo", "c" + String(i + 1).padStart(2, "0"), c)); });
      D.modelos.forEach(function (m, i) { jobs.push(s.set("modelos", "m" + String(i + 1).padStart(2, "0"), m)); });
      D.quadros.forEach(function (q) { var c = Object.assign({}, q), id = c.id; delete c.id; jobs.push(s.set("quadros", id, c)); });
      (D.mapas || []).forEach(function (m) { var c = Object.assign({}, m), id = c.id; delete c.id; jobs.push(s.set("mapas", id, c)); });
      return Promise.all(jobs);
    };
    return s;
  }

  window.GestaoStore = {
    init: function () {
      var cfg = window.FLUXO_CONFIG || {};
      if (cfg.supabaseUrl && cfg.supabaseAnonKey) {
        return loadScript(SUPABASE_JS).then(function () {
          var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
          return loginGate(client).then(function () { return loadPerfil(client); }).then(function (perfil) { return finish(SupabaseAdapter(client, perfil)); });
        });
      }
      var hasClaude = window.claude && typeof window.claude.use === "function";
      var p = hasClaude ? Promise.all([window.claude.use("db").catch(function () { return null; }), window.claude.use("assets").catch(function () { return null; })]) : Promise.resolve([null, null]);
      return p.then(function (r) {
        var s = finish(r[0] ? ClaudeAdapter(r[0], r[1]) : LocalAdapter());
        if (s.mode === "local" && s.isEmpty() && window.GESTAO_DEFAULTS) return s.seed(window.GESTAO_DEFAULTS).then(function () { return s; });
        return s;
      });
    }
  };
})();
