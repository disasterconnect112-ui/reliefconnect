import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { AppShell, PriorityBadge } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { speak } from "@/lib/voice";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s["id"] === "string" ? (s["id"] as string) : undefined }),
  head: () => ({
    meta: [
      { title: "Track Emergency Request — ReliefConnect" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Check the live status of your SOS using your request ID." },
      { property: "og:title", content: "Track Emergency Request — ReliefConnect" },
      { property: "og:description", content: "Check the live status of your SOS using your request ID." },
    ],
  }),
  component: TrackPage,
});

const STEPS = ["received", "assigned", "on_the_way", "delivered", "completed"] as const;
type Res = { request_code: string; emergency_type: string; priority: string; status: string; updated_at: string };

function TrackPage() {
  const { t, lang } = useI18n();
  const { id } = Route.useSearch();
  const [code, setCode] = useState(id ?? "");
  const [res, setRes] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const lookup = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    setNotFound(false);
    const { data } = await supabase.rpc("track_request", { _code: c.trim() });
    setLoading(false);
    const r = data?.[0] ?? null;
    setRes(r);
    setNotFound(!r);
  };

  useEffect(() => {
    const c = id ?? localStorage.getItem("lastRequest") ?? "";
    if (c) {
      setCode(c);
      lookup(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const current = res ? STEPS.indexOf(res.status as (typeof STEPS)[number]) : -1;

  return (
    <AppShell speakText={res ? `${res.request_code}. ${t(res.status)}` : t("enterId")}>
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-extrabold">{t("track")}</h1>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            lookup(code);
          }}
        >
          <input className="flex-1 rounded-lg border bg-card px-3 py-2 font-mono uppercase" placeholder="DR-2026-000001" value={code} onChange={(e) => setCode(e.target.value)} maxLength={30} />
          <button className="rounded-lg bg-primary px-4 font-semibold text-primary-foreground">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}</button>
        </form>
        {notFound && <p className="mt-4 text-sm text-destructive">No request found with that ID.</p>}
        {res && (
          <div className="mt-6 rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold">{res.request_code}</span>
              <PriorityBadge p={res.priority} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{res.emergency_type.split(",").map((x) => t(x as Parameters<typeof t>[0])).join(", ")}</p>
            <ol className="mt-5 space-y-4">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full border-2 ${i <= current ? "border-success bg-success text-sos-foreground" : "border-border"}`}>
                    {i <= current && <Check className="h-4 w-4" />}
                  </span>
                  <span className={i <= current ? "font-semibold" : "text-muted-foreground"}>{t(s)}</span>
                </li>
              ))}
            </ol>
            <button onClick={() => speak(`${t(res.status)}`, lang)} className="mt-5 text-sm text-muted-foreground underline">
              🔊 Read status
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
