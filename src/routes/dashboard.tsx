import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PriorityBadge } from "@/components/AppShell";
import { badgesFor, useAuth, type Profile } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { distanceKm } from "@/lib/geo";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2 } from "lucide-react";
import { summarizeOpenRequests } from "@/lib/sos-ai.functions";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ReliefConnect" },
      { name: "description", content: "Manage emergency requests, relief tasks and coordination." },
      { property: "og:title", content: "Dashboard — ReliefConnect" },
      { property: "og:description", content: "Manage emergency requests and relief tasks." },
    ],
  }),
  component: Dashboard,
});

type Req = Tables<"emergency_requests">;
const PRI: Record<string, number> = { critical: 0, high: 1, medium: 1, normal: 2, low: 2 };
const STATUSES = ["received", "assigned", "on_the_way", "delivered", "completed"];

function useRequests() {
  const [rows, setRows] = useState<Req[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase.from("emergency_requests").select("*").order("created_at", { ascending: false }).limit(300);
    setRows((data ?? []).sort((a, b) => (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3)));
  }, []);
  useEffect(() => {
    load();
    const ch = supabase
      .channel("req-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "emergency_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);
  return { rows, load };
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-soft first:bg-gradient-deep first:text-deep-foreground">
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}

function Dashboard() {
  const { session, profile, isAdmin, isNgo, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);
  if (!profile) return <AppShell><p className="text-muted-foreground">{t("loading")}</p></AppShell>;
  return (
    <AppShell>
      {isAdmin ? <AdminView /> : isNgo ? <NgoView profile={profile} /> : <>{profile.role === "ngo" && <p className="mb-4 rounded-lg border bg-muted p-3 text-sm">{t("ngoPending")}</p>}<VolunteerView profile={profile} /></>}
    </AppShell>
  );
}

function RequestCard({ r, here, children }: { r: Req; here: { lat: number; lng: number } | null; children?: React.ReactNode }) {
  const { t } = useI18n();
  const dist = here && r.latitude != null && r.longitude != null ? distanceKm(here, { lat: r.latitude, lng: r.longitude }) : null;
  return (
    <div className={`rounded-2xl border-l-4 bg-card p-4 shadow-soft ${r.priority === "critical" ? "border-l-critical" : r.priority === "medium" || r.priority === "high" ? "border-l-high" : "border-l-normal"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold">{r.emergency_type.split(",").map((x) => t(x as Parameters<typeof t>[0])).join(", ")}</span>
        <PriorityBadge p={r.priority} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {r.request_code} · {new Date(r.created_at).toLocaleString()} {dist != null && `· ${dist.toFixed(1)} ${t("kmAway")}`}
      </p>
      {r.description && <p className="mt-2 text-sm">{r.description}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        {r.people_count ? `${r.people_count} ${t("peopleWord")} · ` : ""}
        {r.name ?? ""} {r.mobile ? `· ${r.mobile}` : ""} · {t("status")}: <b>{t(r.status)}</b>
      </p>
      {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

const btn = "rounded-full px-4 py-1.5 text-sm font-semibold";

function useHere() {
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((p) => setHere({ lat: p.coords.latitude, lng: p.coords.longitude }), () => {});
  }, []);
  return here;
}

function VolunteerView({ profile }: { profile: Profile }) {
  const { rows, load } = useRequests();
  const { refresh } = useAuth();
  const { t } = useI18n();
  const here = useHere();
  const available = rows.filter((r) => r.status === "received" && !r.volunteer_id);
  const mine = rows.filter((r) => r.volunteer_id === profile.id && r.status !== "completed");
  const done = rows.filter((r) => r.volunteer_id === profile.id && r.status === "completed");
  const sortedAvail = here
    ? [...available].sort((a, b) => ((PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3)) || distanceKm(here, { lat: a.latitude ?? 0, lng: a.longitude ?? 0 }) - distanceKm(here, { lat: b.latitude ?? 0, lng: b.longitude ?? 0 }))
    : available;

  const act = async (id: string, action: string) => {
    const { error } = await supabase.rpc("volunteer_action", { _request: id, _action: action });
    if (error) toast.error(error.message);
    else toast.success("Updated");
    load();
    refresh();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{t("hi")} {profile.full_name || t("volunteer")} 👋</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("available")} value={available.length} />
        <Stat label={t("active")} value={mine.length} />
        <Stat label={t("completed")} value={profile.completed_tasks} />
        <Stat label={t("points")} value={profile.points} />
      </div>
      {mine.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{t("myActive")}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {mine.map((r) => (
              <RequestCard key={r.id} r={r} here={here}>
                {r.status === "assigned" && <button className={`${btn} bg-primary text-primary-foreground`} onClick={() => act(r.id, "on_the_way")}>{t("startOnWay")}</button>}
                {r.status === "on_the_way" && <button className={`${btn} bg-primary text-primary-foreground`} onClick={() => act(r.id, "delivered")}>{t("delivered")}</button>}
                {r.status === "delivered" && <button className={`${btn} bg-success text-sos-foreground`} onClick={() => act(r.id, "complete")}>{t("complete")}</button>}
                {r.status === "assigned" && <button className={`${btn} border`} onClick={() => act(r.id, "reject")}>{t("release")}</button>}
                {r.latitude != null && (
                  <a className={`${btn} border`} target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=16/${r.latitude}/${r.longitude}`}>{t("directions")}</a>
                )}
              </RequestCard>
            ))}
          </div>
        </section>
      )}
      <AiTriage rows={available} onAccept={(id) => act(id, "accept")} />
      <section>
        <h2 className="mb-3 text-lg font-bold">{t("availTasks")}</h2>
        {sortedAvail.length === 0 && <p className="text-sm text-muted-foreground">{t("noOpen")}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {sortedAvail.map((r) => (
            <RequestCard key={r.id} r={r} here={here}>
              <button className={`${btn} bg-sos text-sos-foreground`} onClick={() => act(r.id, "accept")}>{t("acceptTask")}</button>
            </RequestCard>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">{t("achievements")}</h2>
        <div className="flex flex-wrap gap-2">
          {badgesFor(profile).map((b) => (
            <span key={b.name} title={b.desc} className={`rounded-full border px-3 py-1 text-sm ${b.earned ? "bg-accent font-semibold" : "opacity-40"}`}>
              {b.icon} {b.name}
            </span>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Accept +5 · Complete +20 · Critical +30 · Medical +25 · Rescue +50</p>
      </section>
      {done.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">{t("taskHistory")}</h2>
          <ul className="divide-y rounded-2xl border bg-card text-sm">
            {done.map((r) => (
              <li key={r.id} className="flex justify-between p-3"><span>{r.request_code}</span><span className="text-muted-foreground">{r.completed_at && new Date(r.completed_at).toLocaleDateString()}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatusSelect({ r, onDone }: { r: Req; onDone: () => void }) {
  const { t } = useI18n();
  return (
    <select
      value={r.status}
      className="rounded-lg border bg-background px-2 py-1.5 text-sm"
      onChange={async (e) => {
        const { error } = await supabase.from("emergency_requests").update({ status: e.target.value }).eq("id", r.id);
        if (error) toast.error(error.message);
        onDone();
      }}
    >
      {STATUSES.map((s) => <option key={s} value={s}>{t(s)}</option>)}
    </select>
  );
}

function NgoView({ profile }: { profile: Profile }) {
  const { rows, load } = useRequests();
  const here = useHere();
  const { t } = useI18n();
  const [resCount, setResCount] = useState(0);
  useEffect(() => {
    supabase.from("resources").select("quantity").eq("owner_id", profile.id).then(({ data }) => setResCount((data ?? []).reduce((s, r) => s + r.quantity, 0)));
  }, [profile.id]);
  const mine = rows.filter((r) => r.ngo_id === profile.id);
  const active = mine.filter((r) => r.status !== "completed");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{profile.org_name || "NGO"} · {t("dashboard")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t("assignedToUs")} value={mine.length} />
        <Stat label={t("active")} value={active.length} />
        <Stat label={t("completed")} value={mine.filter((r) => r.status === "completed").length} />
        <Stat label={t("resourcesCamps")} value={resCount} />
      </div>
      <div className="flex gap-2">
        <Link to="/profile" className={`${btn} border`}>{t("myOrgServices")}</Link>
        <Link to="/map" className={`${btn} border`}>{t("map")}</Link>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-bold">{t("assignedHeading")}</h2>
        {active.length === 0 && <p className="text-sm text-muted-foreground">{t("noAssigned")}</p>}
        <div className="grid gap-3 md:grid-cols-2">
          {active.map((r) => (
            <RequestCard key={r.id} r={r} here={here}>
              <StatusSelect r={r} onDone={load} />
            </RequestCard>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminView() {
  const { rows, load } = useRequests();
  const { t } = useI18n();
  const [people, setPeople] = useState<Profile[]>([]);
  const [tab, setTab] = useState<"requests" | "users">("requests");
  const [ngoIds, setNgoIds] = useState<string[]>([]);
  const loadPeople = useCallback(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setPeople(data ?? []));
    supabase.from("user_roles").select("user_id").eq("role", "ngo").then(({ data }) => setNgoIds((data ?? []).map((r) => r.user_id)));
  }, []);
  const { session } = useAuth();
  const me = session?.user.id;
  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_ngo", { _user: id });
    if (error) toast.error(error.message);
    else toast.success("NGO approved");
    loadPeople();
  };
  const revoke = async (id: string) => {
    if (!confirm("Remove NGO access from this account? It will go back to volunteer access.")) return;
    const { error } = await supabase.rpc("revoke_ngo", { _user: id });
    if (error) toast.error(error.message);
    else toast.success("NGO access removed");
    loadPeople();
  };
  useEffect(loadPeople, [loadPeople]);
  const vols = people.filter((p) => p.role === "volunteer");
  const ngos = people.filter((p) => p.role === "ngo");
  const approvedNgos = ngos.filter((p) => ngoIds.includes(p.id));

  const assign = async (id: string, vid: string) => {
    const { error } = await supabase.from("emergency_requests").update({ volunteer_id: vid || null, status: vid ? "assigned" : "received" }).eq("id", id);
    if (error) toast.error(error.message);
    load();
  };
  const assignNgo = async (id: string, nid: string) => {
    const { error } = await supabase.from("emergency_requests").update({ ngo_id: nid || null }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(nid ? "NGO assigned" : "NGO removed");
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this user's profile?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) toast.error(error.message);
    loadPeople();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">{t("adminCenter")}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={t("requests")} value={rows.length} />
        <Stat label={t("volunteers")} value={vols.length} />
        <Stat label="NGOs" value={ngos.length} />
        <Stat label={t("active")} value={rows.filter((r) => r.status !== "completed").length} />
        <Stat label={t("completed")} value={rows.filter((r) => r.status === "completed").length} />
      </div>
      <div className="flex gap-2">
        {(["requests", "users"] as const).map((x) => (
          <button key={x} onClick={() => setTab(x)} className={`${btn} ${tab === x ? "bg-primary text-primary-foreground" : "border"}`}>{x === "requests" ? t("requests") : t("users")}</button>
        ))}
      </div>
      {tab === "requests" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <RequestCard key={r.id} r={r} here={null}>
              <StatusSelect r={r} onDone={load} />
              <select aria-label="Assign volunteer" value={r.volunteer_id ?? ""} onChange={(e) => assign(r.id, e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
                <option value="">{t("noVolunteer")}</option>
                {vols.map((v) => <option key={v.id} value={v.id}>{v.full_name || v.id.slice(0, 6)}</option>)}
              </select>
              <select aria-label="Assign NGO" value={r.ngo_id ?? ""} onChange={(e) => assignNgo(r.id, e.target.value)} className="rounded-lg border bg-background px-2 py-1.5 text-sm">
                <option value="">{t("noNgo")}</option>
                {approvedNgos.map((n) => <option key={n.id} value={n.id}>{n.org_name || n.full_name || n.id.slice(0, 6)}</option>)}
              </select>
            </RequestCard>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm [&_td]:px-3 [&_td]:py-3 [&_th]:px-3 [&_th]:py-3 [&_td]:whitespace-nowrap">
            <thead className="bg-muted text-left"><tr><th className="p-3">Name</th><th>Role</th><th>Mobile</th><th>Points</th><th></th></tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.org_name || p.full_name || "—"}</td>
                  <td className="uppercase">{p.id === me ? "admin (you)" : p.role === "ngo" ? (ngoIds.includes(p.id) ? "ngo · approved" : "ngo · pending") : p.role}</td>
                  <td>{p.mobile}</td>
                  <td>{p.points}</td>
                  <td className="pr-3 text-right">
                    {p.role === "ngo" && !ngoIds.includes(p.id) && <button onClick={() => approve(p.id)} className="mr-3 font-semibold text-primary">Approve NGO</button>}
                    {ngoIds.includes(p.id) && <button onClick={() => revoke(p.id)} className="mr-3 font-semibold text-muted-foreground">Revoke NGO</button>}
                    {p.id !== me && <button onClick={() => remove(p.id)} className="text-destructive">Remove</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

type Summary = { id: string; urgency: "critical" | "medium" | "low"; summary: string; needs: string[]; reason: string };
const URG: Record<string, number> = { critical: 0, medium: 1, low: 2 };

function AiTriage({ rows, onAccept }: { rows: Req[]; onAccept: (id: string) => Promise<void> }) {
  const run = useServerFn(summarizeOpenRequests);
  const { t } = useI18n();
  const [items, setItems] = useState<Summary[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const go = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await run();
      setItems([...res.items].sort((a, b) => (URG[a.urgency] ?? 3) - (URG[b.urgency] ?? 3)));
      setErr(res.error);
    } catch {
      setErr("AI summary is unavailable right now.");
    }
    setBusy(false);
  };
  const shown = (items ?? []).filter((i) => byId.has(i.id));
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold"><Sparkles className="h-5 w-5 text-primary" /> {t("aiTriage")}</h2>
          <p className="text-sm text-muted-foreground">{t("aiDesc")}</p>
        </div>
        <button onClick={go} disabled={busy || rows.length === 0} className={`${btn} flex items-center gap-2 bg-primary text-primary-foreground disabled:opacity-50`}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {items ? t("refreshSummary") : t("summarize")}
        </button>
      </div>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {items && !err && shown.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{t("noOpen")}</p>}
      <ul className="mt-3 space-y-2">
        {shown.map((i) => {
          const r = byId.get(i.id)!;
          return (
            <li key={i.id} className="rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{r.request_code}</span>
                <PriorityBadge p={i.urgency} />
              </div>
              <p className="mt-1 font-medium">{i.summary}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {i.needs.map((n) => <span key={n} className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground">{n}</span>)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{t("why")}: {i.reason}</p>
              {confirming === i.id ? (
                <div className="mt-2 rounded-lg bg-muted p-3 text-sm">
                  <p><b>{t("victimReported")}:</b> {r.emergency_type.split(",").join(", ")} · severity {r.priority}{r.people_count ? ` · ${r.people_count} people` : ""}</p>
                  {r.description && <p className="mt-1">"{r.description}"</p>}
                  <p className="mt-2 font-semibold">{t("acceptQ")}</p>
                  <div className="mt-2 flex gap-2">
                    <button className={`${btn} bg-sos text-sos-foreground`} onClick={async () => { setConfirming(null); await onAccept(i.id); }}>{t("yesAccept")}</button>
                    <button className={`${btn} border bg-card`} onClick={() => setConfirming(null)}>{t("cancel")}</button>
                  </div>
                </div>
              ) : (
                <button className={`${btn} mt-2 border`} onClick={() => setConfirming(i.id)}>{t("reviewAccept")}</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
