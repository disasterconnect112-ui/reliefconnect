import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { badgesFor, useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — ReliefConnect" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "description", content: "Manage your volunteer or NGO profile, skills, services and resources." },
      { property: "og:title", content: "My Profile — ReliefConnect" },
      { property: "og:description", content: "Manage your volunteer or NGO profile." },
    ],
  }),
  component: ProfilePage,
});

const SKILLS = ["First Aid", "Rescue", "Driving", "Cooking", "Medical", "Logistics", "Counselling", "Swimming"];
const SERVICES = ["Medical assistance", "Food distribution", "Water distribution", "Shelter", "Rescue", "Transportation", "Medicine"];
const input = "w-full rounded-lg border bg-background px-3 py-2";

function ProfilePage() {
  const { session, profile, loading, refresh } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [f, setF] = useState<Partial<Tables<"profiles">>>({});
  const [resources, setResources] = useState<Tables<"resources">[]>([]);
  const [newRes, setNewRes] = useState({ name: "", kind: "relief_camp", quantity: "" });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);
  useEffect(() => {
    if (profile) setF(profile);
  }, [profile]);
  const loadRes = () => {
    if (profile) supabase.from("resources").select("*").eq("owner_id", profile.id).then(({ data }) => setResources(data ?? []));
  };
  useEffect(loadRes, [profile]);

  if (!profile) return <AppShell><p className="text-muted-foreground">{t("loading")}</p></AppShell>;
  const isNgo = profile.role === "ngo";

  const toggle = (key: "skills" | "services", v: string) => {
    const arr = (f[key] as string[]) ?? [];
    setF({ ...f, [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };
  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setF((x) => ({ ...x, latitude: p.coords.latitude, longitude: p.coords.longitude })),
      () => toast.error(t("noLocation")),
    );

  const save = async () => {
    const { error } = await supabase
      .from("profiles")
      .update(JSON.parse(JSON.stringify({
        full_name: f.full_name, mobile: f.mobile, location: f.location, latitude: f.latitude, longitude: f.longitude,
        skills: f.skills, availability: f.availability, experience: f.experience,
        org_name: f.org_name, org_reg_no: f.org_reg_no, org_type: f.org_type, address: f.address, services: f.services,
      })))
      .eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      toast.success(t("profileSaved"));
      refresh();
    }
  };

  const addResource = async () => {
    if (!newRes.name.trim()) return;
    const { error } = await supabase.from("resources").insert({
      owner_id: profile.id, name: newRes.name, kind: newRes.kind, quantity: Number(newRes.quantity) || 0,
      latitude: f.latitude ?? null, longitude: f.longitude ?? null,
    });
    if (error) toast.error(error.message);
    setNewRes({ name: "", kind: "relief_camp", quantity: "" });
    loadRes();
  };

  const deleteAccount = async () => {
    if (!confirm("Delete your profile permanently?")) return;
    await supabase.from("profiles").delete().eq("id", profile.id);
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="text-2xl font-extrabold">{isNgo ? t("myOrg") : t("myProfile")}</h1>
        {!isNgo && (
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl border bg-card p-3 text-center"><p className="font-display text-2xl font-extrabold">{profile.points}</p><p className="text-xs text-muted-foreground">{t("points")}</p></div>
            <div className="flex-1 rounded-xl border bg-card p-3 text-center"><p className="font-display text-2xl font-extrabold">{profile.completed_tasks}</p><p className="text-xs text-muted-foreground">{t("completed")}</p></div>
            <div className="flex-1 rounded-xl border bg-card p-3 text-center"><p className="text-xl">{badgesFor(profile).filter((b) => b.earned).map((b) => b.icon).join("") || "—"}</p><p className="text-xs text-muted-foreground">{t("badges")}</p></div>
          </div>
        )}
        <div className="space-y-3 rounded-xl border bg-card p-4">
          {isNgo && (
            <>
              <input className={input} placeholder={t("orgName")} value={f.org_name ?? ""} onChange={(e) => setF({ ...f, org_name: e.target.value })} />
              <input className={input} placeholder={t("regNo")} value={f.org_reg_no ?? ""} onChange={(e) => setF({ ...f, org_reg_no: e.target.value })} />
              <input className={input} placeholder={t("orgType")} value={f.org_type ?? ""} onChange={(e) => setF({ ...f, org_type: e.target.value })} />
              <input className={input} placeholder={t("address")} value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </>
          )}
          <input className={input} placeholder={isNgo ? t("contactPerson") : t("fullName")} value={f.full_name ?? ""} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <input className={input} placeholder={t("mobile")} value={f.mobile ?? ""} onChange={(e) => setF({ ...f, mobile: e.target.value })} />
          <input className={input} placeholder={t("cityArea")} value={f.location ?? ""} onChange={(e) => setF({ ...f, location: e.target.value })} />
          <button onClick={useMyLocation} className="flex items-center gap-2 text-sm text-normal">
            <MapPin className="h-4 w-4" /> {f.latitude ? `${t("pinned")}: ${f.latitude.toFixed(4)}, ${f.longitude?.toFixed(4)}` : t("pinLocation")}
          </button>
          {!isNgo && (
            <>
              <select className={input} value={f.availability ?? "available"} onChange={(e) => setF({ ...f, availability: e.target.value })}>
                <option value="available">{t("available")}</option>
                <option value="busy">{t("busy")}</option>
                <option value="offline">{t("offlineStatus")}</option>
              </select>
              <textarea className={input} rows={2} placeholder={t("experience")} value={f.experience ?? ""} onChange={(e) => setF({ ...f, experience: e.target.value })} />
            </>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold">{isNgo ? t("servicesProvided") : t("skills")}</p>
            <div className="flex flex-wrap gap-2">
              {(isNgo ? SERVICES : SKILLS).map((s) => {
                const on = ((isNgo ? f.services : f.skills) ?? []).includes(s);
                return (
                  <button key={s} onClick={() => toggle(isNgo ? "services" : "skills", s)} className={`rounded-full border px-3 py-1 text-sm ${on ? "border-sos bg-sos/10 font-semibold" : ""}`}>{s}</button>
                );
              })}
            </div>
          </div>
          <button onClick={save} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground">{t("saveProfile")}</button>
        </div>

        {isNgo && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-bold">{t("resourcesCamps")}</h2>
            <ul className="divide-y text-sm">
              {resources.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span>{r.name} · {r.kind.replace("_", " ")} · {r.quantity}</span>
                  <button className="text-destructive" onClick={async () => { await supabase.from("resources").delete().eq("id", r.id); loadRes(); }}>{t("remove")}</button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-2">
              <input className={`${input} col-span-3`} placeholder={t("resName")} value={newRes.name} onChange={(e) => setNewRes({ ...newRes, name: e.target.value })} />
              <select className={`${input} col-span-2`} value={newRes.kind} onChange={(e) => setNewRes({ ...newRes, kind: e.target.value })}>
                <option value="relief_camp">{t("reliefCamp")}</option>
                <option value="shelter">{t("shelter")}</option>
                <option value="supplies">{t("supplies")}</option>
              </select>
              <input className={input} type="number" placeholder={t("qty")} value={newRes.quantity} onChange={(e) => setNewRes({ ...newRes, quantity: e.target.value })} />
            </div>
            <button onClick={addResource} className="w-full rounded-lg border py-2 font-semibold">{t("addResource")}</button>
          </div>
        )}

        <button onClick={deleteAccount} className="w-full rounded-lg border border-destructive py-2 font-semibold text-destructive">{t("deleteAccount")}</button>
      </div>
    </AppShell>
  );
}
