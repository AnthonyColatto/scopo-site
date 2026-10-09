/* Fluxo do Time · service worker só para notificações (não guarda cache) */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var alvo = e.notification.data || {};
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    var c = cs.find(function (x) { return x.url.indexOf("/fluxodotime/") >= 0 || x.url.indexOf(self.registration.scope) === 0; });
    if (c) { c.postMessage({ abrir: alvo }); return c.focus(); }
    return self.clients.openWindow(self.registration.scope);
  }));
});
