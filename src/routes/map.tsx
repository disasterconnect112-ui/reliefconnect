import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { MapPoint } from "@/lib/map-types";

const ReliefMap = lazy(() => import("@/components/ReliefMap"));

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: "Live Relief Map — ReliefConnect" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Live map of emergency requests, volunteers, NGOs, shelters and relief camps." },
      { property: "og:title", content: "Live Relief Map — ReliefConnect" },
      { property: "og:description", content: "Live map of emergency requests and responders." },
    ],
  }),
  component: MapPage,
});

const LEGEND: [string, string][] = [
  ["bg-critical", "lgRequest"],
  ["bg-success", "volunteer"],
  ["bg-normal", "ngo"],
  ["bg-chart-5", "shelter"],
  ["bg-high", "reliefCamp"],
];

function MapPage() {
  const { session, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [points, setPoints] = useState<MapPoint[]>([]);
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);
  useEffect(() => {
    if (!session) return;
    Promise.all([
      supabase.from("emergency_requests").select("request_code,emergency_type,priority,status,latitude,longitude").neq("status", "completed"),
      supabase.from("profiles").select("role,full_name,org_name,latitude,longitude").not("latitude", "is", null),
      supabase.from("resources").select("kind,name,quantity,latitude,longitude").not("latitude", "is", null),
    ]).then(([r, p, res]) => {
      const pts: MapPoint[] = [];
      r.data?.forEach((x) => x.latitude != null && pts.push({ lat: x.latitude, lng: x.longitude!, kind: "request", label: `${x.request_code} · ${x.emergency_type} · ${x.priority}` }));
      p.data?.forEach((x) => pts.push({ lat: x.latitude!, lng: x.longitude!, kind: x.role === "ngo" ? "ngo" : "volunteer", label: x.org_name || x.full_name }));
      res.data?.forEach((x) => pts.push({ lat: x.latitude!, lng: x.longitude!, kind: x.kind === "shelter" ? "shelter" : "camp", label: `${x.name} (${x.quantity})` }));
      setPoints(pts);
    });
  }, [session]);

  const fallback = <div className="h-[480px] animate-pulse rounded-xl bg-muted" />;
  return (
    <AppShell>
      <h1 className="mb-3 text-2xl font-extrabold">{t("liveMap")}</h1>
      <div className="mb-3 flex flex-wrap gap-3 text-sm">
        {LEGEND.map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded-full ${c}`} />{t(l)}</span>
        ))}
      </div>
      <ClientOnly fallback={fallback}>
        <Suspense fallback={fallback}>
          <ReliefMap points={points} />
        </Suspense>
      </ClientOnly>
    </AppShell>
  );
}
