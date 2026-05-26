importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js");

workbox.setConfig({ debug: false });

const { registerRoute } = workbox.routing;
const { NetworkFirst, CacheFirst, StaleWhileRevalidate, NetworkOnly } =
  workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

const CACHE_NAMES = {
  pages: "achme-pages",
  static: "achme-static",
  images: "achme-images",
  api: "achme-api",
  googleFonts: "achme-fonts",
};

self.addEventListener("activate", (event) => {
  const valid = Object.values(CACHE_NAMES);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (!valid.includes(key)) return caches.delete(key);
        })
      )
    )
  );
});

registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: CACHE_NAMES.pages,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

registerRoute(
  ({ request }) =>
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "worker",
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.static,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: CACHE_NAMES.images,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.googleFonts,
    plugins: [
      new ExpirationPlugin({ maxEntries: 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: CACHE_NAMES.api,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 24 * 60 * 60,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

const API_BACKEND_URL = self.location.origin.includes("localhost")
  ? self.location.origin.replace(/:\d+$/, ":5000")
  : null;

if (API_BACKEND_URL) {
  registerRoute(
    ({ url }) => url.origin === API_BACKEND_URL && url.pathname.startsWith("/api/"),
    new NetworkFirst({
      cacheName: CACHE_NAMES.api,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60,
        }),
        new CacheableResponsePlugin({ statuses: [0, 200] }),
      ],
    })
  );
}

registerRoute(
  ({ url }) => url.pathname.includes("socket.io"),
  new NetworkOnly()
);
