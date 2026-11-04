// Single service-worker registrar. Never registers in dev, preview or iframes.
const ESSENTIAL_PAGES = ["/", "/sos", "/track"];
const PREVIEW_LABEL = /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/;

function isPreviewHost(h: string): boolean {
  const label = h.split(".")[0] ?? "";
  for (const d of [".lovable.app", ".gpt-eng.com", ".gptengineer.run"]) {
    if (h.endsWith(d) && (PREVIEW_LABEL.test(label) || /^project--.+-dev$/.test(label))) return true;
  }
  for (const d of ["lovableproject.com", "lovableproject-dev.com", "beta.lovable.dev"]) {
    if (h === d || h.endsWith("." + d)) return true;
  }
  return false;
}

function refused(): boolean {
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  if (isPreviewHost(window.location.hostname.toLowerCase())) return true;
  return new URLSearchParams(window.location.search).get("sw") === "off";
}

export async function setupServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (refused()) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => (r.active ?? r.waiting ?? r.installing)?.scriptURL.endsWith("/sw.js")).map((r) => r.unregister()));
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    // Warm the cache so the emergency screens open later without internet.
    const cache = await caches.open("pages");
    await Promise.allSettled(
      ESSENTIAL_PAGES.map(async (p) => {
        const r = await fetch(p);
        if (r.ok) await cache.put(p, r);
      }),
    );
  } catch (e) {
    console.warn("SW registration failed", e);
  }
}
