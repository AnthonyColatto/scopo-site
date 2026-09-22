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

  function applySettings(settings) {
    if (!settings) return;

    if (settings.brand_color) {
      document.documentElement.style.setProperty("--brand", settings.brand_color);
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

    var bannerHome = document.getElementById("js-banner-home");
    if (bannerHome && settings.banner_home) bannerHome.src = settings.banner_home;

    var bannerPortfolio = document.getElementById("js-banner-portfolio");
    if (bannerPortfolio && settings.banner_portfolio) bannerPortfolio.src = settings.banner_portfolio;

    var video = document.getElementById("js-video-institucional");
    if (video && settings.video_institucional) {
      var source = video.querySelector("source");
      if (source && source.getAttribute("src") !== settings.video_institucional) {
        source.setAttribute("src", settings.video_institucional);
        video.load();
      }
      if (settings.banner_home) video.setAttribute("poster", settings.banner_home);
    }
  }

  function renderProjects(data) {
    var grid = document.getElementById("js-projects-grid");
    if (!grid || !data || !data.items) return;
    grid.innerHTML = data.items
      .map(function (p) {
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
          '<div class="card" style="display:flex;flex-direction:column;overflow:hidden;">' +
          '<div class="thumb">' +
          thumbInner +
          '<div class="thumb-overlay">Ver projeto →</div></div>' +
          '<div style="padding:18px;display:flex;flex-direction:column;gap:8px;">' +
          '<span class="tag">' +
          (p.tag || "EM BREVE") +
          "</span>" +
          '<div style="color:#FFFFFF;font-family:\'Poppins\',sans-serif;font-size:15px;font-weight:700;">' +
          (p.title || "") +
          "</div></div></div>"
        );
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

  Promise.all([
    fetchJSON("content/settings.json").catch(function () { return null; }),
    fetchJSON("content/projects.json").catch(function () { return null; }),
    fetchJSON("content/clients.json").catch(function () { return null; }),
  ]).then(function (results) {
    applySettings(results[0]);
    renderProjects(results[1]);
    renderClients(results[2]);
  });
})();
