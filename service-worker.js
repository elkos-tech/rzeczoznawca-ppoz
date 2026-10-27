/* Service worker – offline cache (PWA)
   ---------------------------------------------------------------------
   Strategia:
     • kod aplikacji (html/js/css/manifest) – NAJPIERW SIEĆ, cache zapasowo.
       Dzięki temu po wgraniu nowej wersji na serwer zmiany są widoczne
       od razu, bez czyszczenia pamięci przeglądarki (Ctrl+Shift+R).
     • PDF-y aktów prawnych, ikony – NAJPIERW CACHE (duże i niezmienne).
     • żądania do Supabase i innych domen – w ogóle nie przechwytywane,
       inaczej logowanie i zapis pytań działałyby na nieaktualnych danych.
*/
const CACHE = "rzppoz-v8";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./questions.js",
  "./answers.js",
  "./questions-new.js",
  "./acts.js",
  "./quotes.js",
  "./vendor/supabase.js",
  "./cloud-config.js",
  "./cloud.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

// Dołączone akty prawne (PDF) – pobierane do cache najlepszym staraniem (nie blokują instalacji)
const ACT_PDFS = [
  "wt", "uop", "rpb", "rw", "uzgadnianie", "odpady-rozp", "odpady-ustawa",
  "paliwa", "gaz-sieci", "metro", "drogi-inz", "rolnicze", "men", "cyfryzacja",
  "wyroby", "pb", "wt-projekt"
].map(k => "./akty/" + k + ".pdf");

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS)                       // rdzeń aplikacji – musi się powieść
        .then(() => Promise.allSettled(ACT_PDFS.map(u => c.add(u))))) // PDF-y – best effort
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// czy to kod aplikacji (ma być zawsze aktualny)?
function isAppCode(url) {
  return /\.(?:html|js|css|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith("/");
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // obce domeny (Supabase, Google OAuth, ISAP, PKN) – bez pośrednictwa SW
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate" || isAppCode(url)) {
    // najpierw sieć, w razie braku internetu – ostatnia zapisana wersja
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // pozostałe zasoby z tej domeny (PDF-y, ikony) – najpierw cache
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});
