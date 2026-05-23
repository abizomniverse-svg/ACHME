const SW_PATH = `${process.env.PUBLIC_URL || ""}/sw.js`;

export function register(onUpdate) {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_PATH)
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            if (
              installing.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              if (onUpdate) onUpdate(registration);
            }
          });
        });
      })
      .catch(() => {});
  });
}

export function unregister() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then((registration) => {
    registration.unregister();
  });
}
