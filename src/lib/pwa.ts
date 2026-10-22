// Single service-worker registrar. Never registers in dev, preview or iframes.
const ESSENTIAL_PAGES = ["/", "/sos", "/track"];

function refused(): boolean {
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const h = window.location.hostname;
  if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
  for (const d of ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) {
    if (h === d || h.endsWith("." + d)) return true;
  }
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

export async function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (refused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    // Warm the cache so the emergency screens open later without internet.
    const cache = await caches.open("pages");
    await Promise.allSettled(ESSENTIAL_PAGES.map((p) => fetch(p).then((r) => r.ok && cache.put(p, r))));
  } catch (e) {
    console.warn("SW registration failed", e);
  }
}
