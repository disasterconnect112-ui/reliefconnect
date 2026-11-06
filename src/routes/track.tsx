import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, ShieldCheck, Volume2 } from "lucide-react";
import { AppShell, PriorityBadge } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { speak } from "@/lib/voice";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { progressActions, type ProgressUpdate, type VictimProgress } from "@/lib/victim-progress";

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
type PrivateRes = { volunteer_id: string | null; volunteer_name: string | null; status: string; updates: ProgressUpdate[] };

function TrackPage() {
  const { t, lang } = useI18n();
  const { id } = Route.useSearch();
  const [code, setCode] = useState(id ?? "");
  const [res, setRes] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [token, setToken] = useState("");
  const [privateRes, setPrivateRes] = useState<PrivateRes | null>(null);
  const [privateError, setPrivateError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<VictimProgress | null>(null);
  const [saved, setSaved] = useState(false);

  const loadPrivate = async (c: string, key: string) => {
    setPrivateError(false);
    setPrivateRes(null);
    if (!key.trim()) return;
    try {
      const { data, error } = await supabase.rpc("track_request_private", { _code: c, _token: key.trim() });
      if (error || !data) { setPrivateError(true); return; }
      setPrivateRes(data as unknown as PrivateRes);
    } catch { setPrivateError(true); }
  };

  const lookup = async (c: string) => {
    if (!c.trim()) return;
    setLoading(true);
    setNotFound(false);
    setPrivateRes(null);
    setPending(null);
    setSaved(false);
    try {
      const { data, error } = await supabase.rpc("track_request", { _code: c.trim() });
      const r = error ? null : data?.[0] ?? null;
      setRes(r);
      setNotFound(!r);
      const key = r ? localStorage.getItem(`trackingKey:${r.request_code}`) ?? "" : "";
      setToken(key);
      if (r) await loadPrivate(r.request_code, key);
    } catch { setRes(null); setNotFound(true); }
    finally { setLoading(false); }
  };

  const updateProgress = async () => {
    if (!res || !privateRes?.volunteer_id || !pending) return;
    setSaving(true);
    setPrivateError(false);
    try {
      const { error } = await supabase.rpc("verify_volunteer_progress", {
        _code: res.request_code, _token: token.trim(), _volunteer: privateRes.volunteer_id,
        _status: privateRes.status, _progress: pending,
      });
      if (error) { setPrivateError(true); setPending(null); return; }
      setPending(null);
      await loadPrivate(res.request_code, token);
      setSaved(true);
    } catch { setPrivateError(true); }
    finally { setSaving(false); }
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
          <input aria-label={t("enterId")} className="min-w-0 flex-1 rounded-lg border bg-card px-3 py-2 font-mono uppercase" placeholder="DR-2026-000001" value={code} onChange={(e) => { setCode(e.target.value); setRes(null); setPrivateRes(null); setPending(null); }} maxLength={30} />
          <Button type="submit" disabled={loading} size="icon" aria-label={t("track")}>{loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}</Button>
        </form>
        {notFound && <p role="alert" className="mt-4 text-sm text-destructive">{t("requestNotFound")}</p>}
        {res && (
          <div className="mt-6 border-t pt-5">
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
            <div className="mt-5 flex gap-2">
              <Button variant="outline" size="icon" aria-label={t("status")} onClick={() => speak(`${t(res.status)}`, lang)}><Volume2 /></Button>
              <Button variant="outline" disabled={loading || saving} onClick={() => lookup(res.request_code)}><RefreshCw />{t("track")}</Button>
            </div>
            <section className="mt-6 border-t pt-5">
              <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldCheck className="h-5 w-5 text-primary" />{t("verifyProgress")}</h2>
              <form className="mt-3 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setPending(null); setSaved(false); void loadPrivate(res.request_code, token); }}>
                <label className="min-w-0 flex-1 text-sm font-medium">{t("privateTrackingKey")}
                  <input className="mt-1 w-full rounded-lg border bg-card px-3 py-2 font-mono" value={token} onChange={(e) => { setToken(e.target.value); setPrivateRes(null); setPending(null); setSaved(false); }} maxLength={32} autoComplete="off" />
                </label>
                <Button type="submit" size="icon" disabled={saving || !token.trim()} aria-label={t("verifyProgress")}><ShieldCheck /></Button>
              </form>
              {privateError && <p role="alert" className="mt-3 text-sm text-destructive">{t("progressError")}</p>}
              {privateRes && <>
                <p className="mt-4 font-semibold">{privateRes.volunteer_id ? privateRes.volunteer_name || t("volunteer") : t("noVolunteerYet")}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t("status")}: {t(privateRes.status)}</p>
                {privateRes.updates.length > 0 && <div className="mt-4">
                  <h3 className="text-sm font-semibold">{t("victimUpdates")}</h3>
                  <ul className="mt-2 space-y-2 text-sm">{privateRes.updates.map((u, i) => <li key={`${u.at}-${i}`}><span className="font-medium">{t(u.progress)}</span><br /><span className="text-xs text-muted-foreground">{new Date(u.at).toLocaleString(lang)}</span></li>)}</ul>
                </div>}
                {!pending && <div className="mt-4 flex flex-col gap-2">{progressActions(privateRes.status, privateRes.volunteer_id, privateRes.updates.at(-1)?.progress).map((action) => <Button key={action} variant="outline" disabled={saving} className="h-auto min-h-10 whitespace-normal text-start" onClick={() => { setSaved(false); setPending(action); }}>{t(action)}</Button>)}</div>}
                {pending && <div className="mt-4 border-t pt-4">
                  <p className="font-semibold">{t(pending)}</p><p className="mt-1 text-sm">{t("confirmProgress")}</p>
                  <div className="mt-3 flex gap-2"><Button disabled={saving} onClick={updateProgress}>{saving ? <Loader2 className="animate-spin" /> : <Check />}{t("confirmProgress")}</Button><Button variant="outline" disabled={saving} onClick={() => setPending(null)}>{t("cancel")}</Button></div>
                </div>}
                {saved && <p role="status" className="mt-3 text-sm text-success">{t("progressSaved")}</p>}
              </>}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
