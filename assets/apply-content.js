(function () {
  function bust(url) {
    // cache-bust so edits made in the admin panel show up right away
    return url + (url.indexOf("?") === -1 ? "?" : "&") + "v=" + Date.now();
  }

  function fetchJSON(path) {
    return fetch(bust(path)).then(function (r) {
      if (!r.ok) throw new Error("failed to load " + path);
      return r.json();
    });
  }

  // localStorage cache: lets the LAST-SEEN content render instantly on repeat
  // visits (no network wait), while a fresh fetch still runs to catch new edits.
  function getCache(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function setCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function applySettings(settings) {
    if (!settings) return;

    if (settings.brand_color) {
      document.documentElement.style.setProperty("--brand", settings.brand_color);
      try {
        localStorage.setItem("scopo_brand_color", settings.brand_color);
      } catch (e) {}
    }

    if (settings.logo) {
      document.querySelectorAll("img[data-logo]").forEach(function (img) {
        img.src = settings.logo;
      });
    }

    if (settings.whatsapp_number) {
      var num = settings.whatsapp_number.replace(/\D/g, "");
      document.querySelectorAll("a[data-wa]").forEach(function (a) {
        var url = "https://wa.me/" + num;
        var q = a.href.split("?")[1];
        a.href = q ? url + "?" + q : url;
      });
    }

    // Portfolio banner is optional: hide the whole slot when nothing is set
    var bannerPortfolio = document.getElementById("js-banner-portfolio");
    var bannerPortfolioWrap = document.getElementById("js-banner-portfolio-wrap");
    if (bannerPortfolio && settings.banner_portfolio) {
      bannerPortfolio.src = settings.banner_portfolio;
    } else if (bannerPortfolioWrap) {
      bannerPortfolioWrap.style.display = "none";
    }
  }

  function isVideoFile(url) {
    return /\.(mp4|webm|mov|m4v)$/i.test(url || "");
  }

  // Home banners: 0, 1 or more stacked media items (image or video), fully admin-controlled
  function renderBanners(settings) {
    var wrap = document.getElementById("js-home-banners");
    if (!wrap) return;
    var items = (settings && settings.banners) || [];
    items = items.filter(function (b) { return b && b.arquivo; });
    if (!items.length) {
      wrap.innerHTML = "";
      return;
    }
    wrap.innerHTML = items
      .map(function (b) {
        var wrapStyle = "width:100%;padding:0 var(--pad-x) 40px;box-sizing:border-box;";
        var inner = isVideoFile(b.arquivo)
          ? '<video controls preload="none" style="width:100%;height:auto;border-radius:10px;display:block;background:#000;"><source src="' +
            b.arquivo +
            '"></video>'
          : '<img src="' +
            b.arquivo +
            '" alt="Banner SCOPO" style="width:100%;height:auto;border-radius:10px;display:block;object-fit:cover;">';
        return '<div style="' + wrapStyle + '">' + inner + "</div>";
      })
      .join("");
  }

  // Footer social links: fully optional, admin-controlled
  function renderSocialLinks(settings) {
    var wrap = document.getElementById("js-footer-social");
    if (!wrap) return;
    var items = ((settings && settings.social_links) || []).filter(function (s) {
      return s && s.nome && s.link;
    });
    wrap.innerHTML = items
      .map(function (s) {
        return '<a href="' + s.link + '" target="_blank" rel="noopener" class="footlink">' + s.nome + "</a>";
      })
      .join("");
  }

  // shows the service's custom PNG icon when uploaded, otherwise a numbered badge
  function serviceBadge(s, idx, sizePx) {
    if (s && s.icone) {
      return (
        '<img src="' +
        s.icone +
        '" alt="" style="width:' +
        sizePx +
        "px;height:" +
        sizePx +
        'px;object-fit:contain;display:block;">'
      );
    }
    return (
      '<div style="color:var(--brand);font-family:\'Poppins\',sans-serif;font-size:' +
      (sizePx >= 50 ? 32 : 20) +
      'px;font-weight:800;">' +
      String(idx + 1).padStart(2, "0") +
      "</div>"
    );
  }

  function renderServices(data) {
    var items = (data && data.items) || [];

    var homeGrid = document.getElementById("js-home-services-grid");
    if (homeGrid) {
      homeGrid.innerHTML = items
        .map(function (s, idx) {
          return (
            '<div class="card" style="padding:28px;display:flex;flex-direction:column;gap:12px;">' +
            serviceBadge(s, idx, 36) +
            '<div style="color:#FFFFFF;font-family:\'Poppins\',sans-serif;font-size:18px;font-weight:700;">' +
            (s.title || "") +
            "</div>" +
            '<div class="body-txt" style="font-size:14px;">' +
            (s.description || "") +
            "</div></div>"
          );
        })
        .join("");
    }

    var fullList = document.getElementById("js-servicos-list");
    if (fullList) {
      fullList.innerHTML = items
        .map(function (s, idx) {
          var tags = (s.tags || [])
            .map(function (t) { return '<span class="chip">' + t + "</span>"; })
            .join("");
          return (
            '<div class="card" style="display:flex;gap:32px;padding:44px;flex-wrap:wrap;">' +
            '<div style="min-width:60px;display:flex;align-items:flex-start;">' +
            serviceBadge(s, idx, 56) +
            "</div>" +
            '<div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:14px;">' +
            '<div style="color:#FFFFFF;font-family:\'Poppins\',sans-serif;font-size:24px;font-weight:700;">' +
            (s.title || "") +
            "</div>" +
            '<div class="body-txt">' +
            (s.description || "") +
            "</div>" +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">' +
            tags +
            "</div></div></div>"
          );
        })
        .join("");
    }

    var footer = document.getElementById("js-footer-services");
    if (footer) {
      footer.innerHTML = items
        .map(function (s) { return '<span class="footlink">' + (s.title || "") + "</span>"; })
        .join("");
    }
  }

  function renderProjects(data) {
    var grid = document.getElementById("js-projects-grid");
    if (!grid || !data || !data.items) return;
    grid.innerHTML = data.items
      .map(function (p, idx) {
        var thumbInner = p.video
          ? '<video muted loop playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;" src="' +
            p.video +
            '"></video>'
          : '<img src="' +
            (p.image || "") +
            '" alt="' +
            (p.title || "Projeto") +
            '" style="width:100%;height:100%;object-fit:cover;display:block;">';
        // wrapped in its own data-reveal div (rather than putting data-reveal
        // directly on .card) so the entrance fade-in and the card's own hover
        // lift never fight over the same `transform` transition
        return (
          '<div data-reveal style="transition-delay:' +
          (idx % 8) * 0.07 +
          's;">' +
          '<a href="projeto.html?id=' +
          idx +
          '" class="card" style="display:flex;flex-direction:column;overflow:hidden;text-decoration:none;">' +
          '<div class="thumb">' +
          thumbInner +
          '<div class="card-frame-tag">CUT ' +
          String(idx + 1).padStart(2, "0") +
          "</div>" +
          '<div class="thumb-overlay">Ver projeto →</div></div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:8px;">' +
          '<span class="tag">' +
          (p.tag || "EM BREVE") +
          "</span>" +
          '<div style="color:#FFFFFF;font-family:\'Poppins\',sans-serif;font-size:15px;font-weight:700;">' +
          (p.title || "") +
          "</div></div></a></div>"
        );
      })
      .join("");
  }

  function renderProjectDetail(data) {
    var titleEl = document.getElementById("js-project-title");
    var descEl = document.getElementById("js-project-description");
    var galleryEl = document.getElementById("js-project-gallery");
    var tagEl = document.getElementById("js-project-tag");
    if (!galleryEl || !data || !data.items) return;

    var params = new URLSearchParams(window.location.search);
    var idx = parseInt(params.get("id"), 10);
    var p = data.items[idx];

    if (!p) {
      if (titleEl) titleEl.textContent = "Projeto não encontrado";
      galleryEl.innerHTML = "";
      return;
    }

    if (titleEl) titleEl.textContent = p.title || "";
    if (tagEl) tagEl.textContent = p.tag || "EM BREVE";
    if (descEl) descEl.textContent = p.description || "";

    var mediaItems = (p.gallery && p.gallery.length ? p.gallery.map(function (g) { return g.arquivo; }) : [p.video || p.image]).filter(Boolean);

    galleryEl.innerHTML = mediaItems
      .map(function (url) {
        var inner = isVideoFile(url)
          ? '<video controls muted playsinline preload="metadata" src="' + url + '"></video>'
          : '<img src="' + url + '" alt="' + (p.title || "Projeto") + '" loading="lazy">';
        return '<div class="project-media">' + inner + "</div>";
      })
      .join("");
  }

  function renderClients(data) {
    var grid = document.getElementById("js-clients-grid");
    if (!grid || !data || !data.items || !data.items.length) {
      if (grid) grid.innerHTML = "";
      return;
    }
    var items = data.items;
    // repeat the list so the strip is comfortably wide, then duplicate the
    // whole thing once more so a translateX(-50%) loop is perfectly seamless
    var repeatCount = Math.max(1, Math.ceil(8 / items.length));
    var repeated = [];
    for (var i = 0; i < repeatCount; i++) repeated = repeated.concat(items);
    var doubled = repeated.concat(repeated);
    grid.innerHTML = doubled
      .map(function (c) {
        return (
          '<img class="client-box" src="' +
          (c.logo || "") +
          '" alt="' +
          (c.name || "Cliente") +
          '" style="width:190px;max-width:190px;display:block;object-fit:contain;padding:14px;box-sizing:border-box;">'
        );
      })
      .join("");
  }

  // Team section (Sobre page): fully optional — the whole section is hidden
  // whenever no member is registered in the admin.
  function renderTeam(data) {
    var section = document.getElementById("js-team-section");
    var grid = document.getElementById("js-team-grid");
    if (!section || !grid) return;
    var items = ((data && data.items) || []).filter(function (m) {
      return m && (m.nome || m.foto || m.cargo);
    });
    if (!items.length) {
      section.style.display = "none";
      grid.innerHTML = "";
      return;
    }
    section.style.display = "flex";
    grid.innerHTML = items
      .map(function (m) {
        var photo = m.foto
          ? '<img src="' + m.foto + '" alt="' + (m.nome || "") +
            '" style="width:120px;height:120px;border-radius:50%;object-fit:cover;display:block;margin:0 auto;">'
          : '<div style="width:120px;height:120px;border-radius:50%;background:#161616;border:1px solid #262626;margin:0 auto;"></div>';
        return (
          '<div class="card" style="padding:28px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;">' +
          photo +
          '<div style="color:#FFFFFF;font-family:\'Poppins\',sans-serif;font-size:16px;font-weight:700;">' +
          (m.nome || "") +
          "</div>" +
          '<div style="color:var(--brand);font-family:\'Work Sans\',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.5px;">' +
          (m.cargo || "") +
          "</div>" +
          (m.descricao
            ? '<div class="body-txt" style="font-size:13px;">' + m.descricao + "</div>"
            : "") +
          "</div>"
        );
      })
      .join("");
  }

  function applyAll(settings, projects, clients, services, team) {
    applySettings(settings);
    renderBanners(settings);
    renderSocialLinks(settings);
    renderProjects(projects);
    renderClients(clients);
    renderProjectDetail(projects);
    renderServices(services);
    renderTeam(team);
  }

  // 1) instant paint from whatever was cached on a previous visit (no network wait)
  var cachedSettings = getCache("scopo_cache_settings");
  var cachedProjects = getCache("scopo_cache_projects");
  var cachedClients = getCache("scopo_cache_clients");
  var cachedServices = getCache("scopo_cache_services");
  var cachedTeam = getCache("scopo_cache_team");
  if (cachedSettings || cachedProjects || cachedClients || cachedServices || cachedTeam) {
    applyAll(cachedSettings, cachedProjects, cachedClients, cachedServices, cachedTeam);
  }

  // 2) always fetch the live content too, so admin edits still show up; re-render
  // only if something actually changed, and refresh the cache for next visit
  Promise.all([
    fetchJSON("content/settings.json").catch(function () { return null; }),
    fetchJSON("content/projects.json").catch(function () { return null; }),
    fetchJSON("content/clients.json").catch(function () { return null; }),
    fetchJSON("content/services.json").catch(function () { return null; }),
    fetchJSON("content/team.json").catch(function () { return null; }),
  ]).then(function (results) {
    var settings = results[0], projects = results[1], clients = results[2], services = results[3], team = results[4];
    var changed =
      JSON.stringify(settings) !== JSON.stringify(cachedSettings) ||
      JSON.stringify(projects) !== JSON.stringify(cachedProjects) ||
      JSON.stringify(clients) !== JSON.stringify(cachedClients) ||
      JSON.stringify(services) !== JSON.stringify(cachedServices) ||
      JSON.stringify(team) !== JSON.stringify(cachedTeam);
    if (changed || !(cachedSettings || cachedProjects || cachedClients || cachedServices || cachedTeam)) {
      applyAll(settings, projects, clients, services, team);
    }
    if (settings) setCache("scopo_cache_settings", settings);
    if (projects) setCache("scopo_cache_projects", projects);
    if (clients) setCache("scopo_cache_clients", clients);
    if (services) setCache("scopo_cache_services", services);
    if (team) setCache("scopo_cache_team", team);
  });
})();
