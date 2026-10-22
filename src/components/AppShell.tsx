import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import { flushQueue, useOnline, useQueueCount } from "@/lib/offline";
import { Globe, Home, LayoutDashboard, LogOut, Map, Search, Siren, User, Volume2, WifiOff } from "lucide-react";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { speak } from "@/lib/voice";
import { supabase } from "@/integrations/supabase/client";

export function AppShell({ children, speakText }: { children: ReactNode; speakText?: string }) {
  const { lang, setLang, t } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();

  const nav = session
    ? [
        { to: "/dashboard", icon: LayoutDashboard, label: t("dashboard") },
        { to: "/map", icon: Map, label: t("map") },
        { to: "/profile", icon: User, label: t("profile") },
      ]
    : [
        { to: "/", icon: Home, label: t("home") },
        { to: "/sos", icon: Siren, label: "SOS" },
        { to: "/track", icon: Search, label: t("track") },
      ];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-[1000] border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-black">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sos text-sos-foreground">
              <Siren className="h-4 w-4" />
            </span>
            {t("appName")}
          </Link>
          <nav className="ml-6 hidden gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
                activeOptions={{ exact: true }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <label className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <select
                aria-label="Language"
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="bg-transparent outline-none"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              aria-label="Read aloud"
              onClick={() => speak(speakText ?? `${t("appName")}. ${t("tagline")}. ${t("noLogin")}`, lang)}
              className="rounded-md border p-1.5 hover:bg-muted"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            {session && (
              <button
                aria-label={t("signOut")}
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate({ to: "/" });
                }}
                className="rounded-md border p-1.5 hover:bg-muted"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>
      <OfflineBar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-3 border-t bg-card md:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground"
            activeProps={{ className: "text-sos font-semibold" }}
            activeOptions={{ exact: true }}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PriorityBadge({ p }: { p: string }) {
  const cls = p === "critical" ? "bg-critical text-sos-foreground" : p === "high" || p === "medium" ? "bg-high text-foreground" : "bg-normal text-sos-foreground";
  return <span className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>{p}</span>;
}

function OfflineBar() {
  const { t } = useI18n();
  const online = useOnline();
  const pending = useQueueCount();
  useEffect(() => {
    if (!online || !pending) return;
    flushQueue().then((codes) => {
      if (codes.length) toast.success(`${t("sosSent")}: ${codes.join(", ")}`, { duration: 15000 });
    });
  }, [online, pending, t]);
  if (online && !pending) return null;
  return (
    <div className="border-b bg-sos/10 px-4 py-3 text-sm">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
        <WifiOff className="h-4 w-4 text-sos" />
        <span className="font-semibold">{online ? `${t("pendingSos")}: ${pending}` : t("offline")}</span>
        <span className="ml-auto flex gap-2">
          {t("callHelp")}:
          <a href="tel:112" className="rounded bg-sos px-2 font-bold text-sos-foreground">112</a>
          <a href="tel:108" className="rounded bg-sos px-2 font-bold text-sos-foreground">108</a>
          <a href="tel:1078" className="rounded bg-sos px-2 font-bold text-sos-foreground">1078</a>
        </span>
      </div>
    </div>
  );
}
