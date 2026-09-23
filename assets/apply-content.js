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
        return (
          '<a href="projeto.html?id=' +
          idx +
          '" class="card" style="display:flex;flex-direction:column;overflow:hidden;text-decoration:none;">' +
          '<div class="thumb">' +
          thumbInner +
          '<div class="thumb-overlay">Ver projeto →</div></div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:8px;">' +
          '<span class="tag">' +
          (p.tag || "EM BREVE") +
          "</span>" +
          '<div style="color:#FFFFFF;font-family:\'Poppins\',sans-serif;font-size:15px;font-weight:700;">' +
          (p.title || "") +
          "</div></div></a>"
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
    if (!grid || !data || !data.items) return;
    grid.innerHTML = data.items
      .map(function (c) {
        return (
          '<img class="client-box" src="' +
          (c.logo || "") +
          '" alt="' +
          (c.name || "Cliente") +
          '" style="object-fit:contain;padding:14px;box-sizing:border-box;">'
        );
      })
      .join("");
  }

  function applyAll(settings, projects, clients, services) {
    applySettings(settings);
    renderBanners(settings);
    renderSocialLinks(settings);
    renderProjects(projects);
    renderClients(clients);
    renderProjectDetail(projects);
    renderServices(services);
  }

  // 1) instant paint from whatever was cached on a previous visit (no network wait)
  var cachedSettings = getCache("scopo_cache_settings");
  var cachedProjects = getCache("scopo_cache_projects");
  var cachedClients = getCache("scopo_cache_clients");
  var cachedServices = getCache("scopo_cache_services");
  if (cachedSettings || cachedProjects || cachedClients || cachedServices) {
    applyAll(cachedSettings, cachedProjects, cachedClients, cachedServices);
  }

  // 2) always fetch the live content too, so admin edits still show up; re-render
  // only if something actually changed, and refresh the cache for next visit
  Promise.all([
    fetchJSON("content/settings.json").catch(function () { return null; }),
    fetchJSON("content/projects.json").catch(function () { return null; }),
    fetchJSON("content/clients.json").catch(function () { return null; }),
    fetchJSON("content/services.json").catch(function () { return null; }),
  ]).then(function (results) {
    var settings = results[0], projects = results[1], clients = results[2], services = results[3];
    var changed =
      JSON.stringify(settings) !== JSON.stringify(cachedSettings) ||
      JSON.stringify(projects) !== JSON.stringify(cachedProjects) ||
      JSON.stringify(clients) !== JSON.stringify(cachedClients) ||
      JSON.stringify(services) !== JSON.stringify(cachedServices);
    if (changed || !(cachedSettings || cachedProjects || cachedClients || cachedServices)) {
      applyAll(settings, projects, clients, services);
    }
    if (settings) setCache("scopo_cache_settings", settings);
    if (projects) setCache("scopo_cache_projects", projects);
    if (clients) setCache("scopo_cache_clients", clients);
    if (services) setCache("scopo_cache_services", services);
  });
})();
