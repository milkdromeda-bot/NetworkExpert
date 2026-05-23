const CACHE = "networkexpert-v1";
const ASSETS = ["/", "/index.html", "/src/main.js", "/src/styles.css", "/vendor/codemirror.min.js", "/vendor/codemirror.min.css", "/vendor/jszip.min.js", "/vendor/pdf-lib.min.js"];

self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(fetch(e.request).then(r => { const clone = r.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); return r; }).catch(() => caches.match(e.request)));
});
