import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { badgesFor, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — ReliefConnect" },
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

  if (!profile) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  const isNgo = profile.role === "ngo";

  const toggle = (key: "skills" | "services", v: string) => {
    const arr = (f[key] as string[]) ?? [];
    setF({ ...f, [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] });
  };
  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setF((x) => ({ ...x, latitude: p.coords.latitude, longitude: p.coords.longitude })),
      () => toast.error("Could not get location"),
    );

  const save = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: f.full_name, mobile: f.mobile, location: f.location, latitude: f.latitude, longitude: f.longitude,
        skills: f.skills, availability: f.availability, experience: f.experience,
        org_name: f.org_name, org_reg_no: f.org_reg_no, org_type: f.org_type, address: f.address, services: f.services,
      })
      .eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Profile saved");
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
        <h1 className="text-2xl font-black">{isNgo ? "My organization" : "My profile"}</h1>
        {!isNgo && (
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl border bg-card p-3 text-center"><p className="font-display text-2xl font-black">{profile.points}</p><p className="text-xs text-muted-foreground">Points</p></div>
            <div className="flex-1 rounded-xl border bg-card p-3 text-center"><p className="font-display text-2xl font-black">{profile.completed_tasks}</p><p className="text-xs text-muted-foreground">Completed</p></div>
            <div className="flex-1 rounded-xl border bg-card p-3 text-center"><p className="text-xl">{badgesFor(profile).filter((b) => b.earned).map((b) => b.icon).join("") || "—"}</p><p className="text-xs text-muted-foreground">Badges</p></div>
          </div>
        )}
        <div className="space-y-3 rounded-xl border bg-card p-4">
          {isNgo && (
            <>
              <input className={input} placeholder="Organization name" value={f.org_name ?? ""} onChange={(e) => setF({ ...f, org_name: e.target.value })} />
              <input className={input} placeholder="Registration / ID number" value={f.org_reg_no ?? ""} onChange={(e) => setF({ ...f, org_reg_no: e.target.value })} />
              <input className={input} placeholder="Organization type" value={f.org_type ?? ""} onChange={(e) => setF({ ...f, org_type: e.target.value })} />
              <input className={input} placeholder="Address" value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} />
            </>
          )}
          <input className={input} placeholder={isNgo ? "Contact person" : "Full name"} value={f.full_name ?? ""} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
          <input className={input} placeholder="Mobile" value={f.mobile ?? ""} onChange={(e) => setF({ ...f, mobile: e.target.value })} />
          <input className={input} placeholder="City / area" value={f.location ?? ""} onChange={(e) => setF({ ...f, location: e.target.value })} />
          <button onClick={useMyLocation} className="flex items-center gap-2 text-sm text-normal">
            <MapPin className="h-4 w-4" /> {f.latitude ? `Pinned: ${f.latitude.toFixed(4)}, ${f.longitude?.toFixed(4)}` : "Pin my current location on the map"}
          </button>
          {!isNgo && (
            <>
              <select className={input} value={f.availability ?? "available"} onChange={(e) => setF({ ...f, availability: e.target.value })}>
                <option value="available">Available</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
              <textarea className={input} rows={2} placeholder="Emergency experience" value={f.experience ?? ""} onChange={(e) => setF({ ...f, experience: e.target.value })} />
            </>
          )}
          <div>
            <p className="mb-2 text-sm font-semibold">{isNgo ? "Services provided" : "Skills"}</p>
            <div className="flex flex-wrap gap-2">
              {(isNgo ? SERVICES : SKILLS).map((s) => {
                const on = ((isNgo ? f.services : f.skills) ?? []).includes(s);
                return (
                  <button key={s} onClick={() => toggle(isNgo ? "services" : "skills", s)} className={`rounded-full border px-3 py-1 text-sm ${on ? "border-sos bg-sos/10 font-semibold" : ""}`}>{s}</button>
                );
              })}
            </div>
          </div>
          <button onClick={save} className="w-full rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground">Save profile</button>
        </div>

        {isNgo && (
          <div className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-bold">Resources & relief camps</h2>
            <ul className="divide-y text-sm">
              {resources.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2">
                  <span>{r.name} · {r.kind.replace("_", " ")} · {r.quantity}</span>
                  <button className="text-destructive" onClick={async () => { await supabase.from("resources").delete().eq("id", r.id); loadRes(); }}>Remove</button>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-2">
              <input className={`${input} col-span-3`} placeholder="Name (e.g. Food kits)" value={newRes.name} onChange={(e) => setNewRes({ ...newRes, name: e.target.value })} />
              <select className={`${input} col-span-2`} value={newRes.kind} onChange={(e) => setNewRes({ ...newRes, kind: e.target.value })}>
                <option value="relief_camp">Relief camp</option>
                <option value="shelter">Shelter</option>
                <option value="supplies">Supplies</option>
              </select>
              <input className={input} type="number" placeholder="Qty" value={newRes.quantity} onChange={(e) => setNewRes({ ...newRes, quantity: e.target.value })} />
            </div>
            <button onClick={addResource} className="w-full rounded-lg border py-2 font-semibold">Add resource (uses pinned location)</button>
          </div>
        )}

        <button onClick={deleteAccount} className="w-full rounded-lg border border-destructive py-2 font-semibold text-destructive">Delete account</button>
      </div>
    </AppShell>
  );
}
