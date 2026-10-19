import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MapPin, Mic, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PriorityBadge } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { EMERGENCY_TYPES, listen, matchEmergency, priorityFor, speak, type EmergencyType } from "@/lib/voice";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { title: "Send SOS — ReliefConnect" },
      { name: "description", content: "Request emergency help instantly. No registration — share your location and get a tracking ID." },
      { property: "og:title", content: "Send SOS — ReliefConnect" },
      { property: "og:description", content: "Request emergency help instantly, no registration required." },
    ],
  }),
  component: SosPage,
});

const ICONS: Record<EmergencyType, string> = {
  medical: "🩺", rescue: "🛟", child: "🧒", elderly: "🧓", medicine: "💊", shelter: "⛺", food: "🍚", water: "💧", other: "❗",
};

function SosPage() {
  const { t, lang } = useI18n();
  const [type, setType] = useState<EmergencyType | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", description: "", people: "" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ code: string } | null>(null);

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error("Location not supported on this device"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLoc({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Could not get location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const voice = () => {
    const ok = listen(
      lang,
      (text) => {
        const m = matchEmergency(text);
        if (m) {
          setType(m);
          speak(t(m), lang);
        } else toast(`“${text}”`);
      },
      () => setListening(false),
    );
    if (ok) setListening(true);
    else toast.error("Voice input isn't supported in this browser. Please tap an option.");
  };

  const submit = async () => {
    if (!type) { toast.error(t("chooseType")); return; }
    if (!loc) { toast.error(t("shareLocation")); return; }
    setSending(true);
    const { data, error } = await supabase.rpc("submit_sos", {
      _type: type,
      _lat: loc.lat,
      _lng: loc.lng,
      _name: form.name,
      _mobile: form.mobile,
      _description: form.description,
      _people: form.people ? Number(form.people) : (null as unknown as number),
    });
    setSending(false);
    if (error || !data?.[0]) { toast.error("Could not send. Please try again."); return; }
    const code = data[0].request_code;
    localStorage.setItem("lastRequest", code);
    setResult({ code });
    speak(`${t("sosSent")}. ${code.split("").join(" ")}`, lang);
  };

  if (result)
    return (
      <AppShell>
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-3 text-2xl font-black">{t("sosSent")}</h1>
          <p className="mt-2 text-muted-foreground">{t("saveId")}</p>
          <p className="mt-4 rounded-lg bg-muted py-3 font-mono text-2xl font-bold tracking-wider">{result.code}</p>
          <Link to="/track" search={{ id: result.code }} className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">
            {t("track")}
          </Link>
        </div>
      </AppShell>
    );

  return (
    <AppShell speakText={`${t("chooseType")} ${EMERGENCY_TYPES.map((e) => t(e)).join(", ")}`}>
      <div className="mx-auto max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">{t("chooseType")}</h1>
          <button onClick={voice} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${listening ? "bg-sos text-sos-foreground" : "bg-card"}`}>
            <Mic className="h-4 w-4" /> {listening ? "…" : "Voice"}
          </button>
        </div>
        <p className="-mt-4 text-sm text-muted-foreground">{t("voiceHint")}</p>

        <div className="grid grid-cols-3 gap-2">
          {EMERGENCY_TYPES.map((e) => (
            <button
              key={e}
              onClick={() => setType(e)}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center text-sm font-semibold transition ${type === e ? "border-sos bg-sos/10" : "border-transparent bg-card"}`}
            >
              <span className="text-2xl">{ICONS[e]}</span>
              {t(e)}
              {priorityFor(e) === "critical" && <span className="text-[10px] font-bold uppercase text-critical">critical</span>}
            </button>
          ))}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <p className="font-semibold">{t("location")} *</p>
          {loc ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-success">
              <MapPin className="h-4 w-4" /> {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
            </p>
          ) : (
            <button onClick={getLocation} disabled={locating} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-semibold text-primary-foreground">
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />} {t("shareLocation")}
            </button>
          )}
        </div>

        <details className="rounded-xl border bg-card p-4">
          <summary className="cursor-pointer font-semibold">{t("optional")}</summary>
          <div className="mt-3 grid gap-3">
            <input className="rounded-lg border bg-background px-3 py-2" placeholder={t("name")} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-lg border bg-background px-3 py-2" placeholder={t("mobile")} inputMode="tel" maxLength={20} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <input className="rounded-lg border bg-background px-3 py-2" placeholder={t("people")} type="number" min={1} max={10000} value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} />
            <textarea className="rounded-lg border bg-background px-3 py-2" placeholder={t("description")} maxLength={1000} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </details>

        {type && (
          <div className="flex items-center gap-2 text-sm">
            Priority: <PriorityBadge p={priorityFor(type)} />
          </div>
        )}

        <button onClick={submit} disabled={sending} className="shadow-sos flex w-full items-center justify-center gap-2 rounded-xl bg-sos py-4 font-display text-xl font-black text-sos-foreground disabled:opacity-60">
          {sending && <Loader2 className="h-5 w-5 animate-spin" />} {t("confirmSos")}
        </button>
      </div>
    </AppShell>
  );
}
