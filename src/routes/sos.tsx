import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MapPin, Mic, CheckCircle2, Stethoscope, LifeBuoy, Baby, Accessibility, Pill, Tent, Utensils, Droplets, CircleAlert, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PriorityBadge } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { EMERGENCY_TYPES, listen, matchEmergency, speak, type EmergencyType } from "@/lib/voice";
import { enqueueSos, sendSos } from "@/lib/offline";

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

const ICONS: Record<EmergencyType, LucideIcon> = {
  medical: Stethoscope, rescue: LifeBuoy, child: Baby, elderly: Accessibility, medicine: Pill, shelter: Tent, food: Utensils, water: Droplets, other: CircleAlert,
};

function SosPage() {
  const { t, lang } = useI18n();
  const [types, setTypes] = useState<EmergencyType[]>([]);
  const [severity, setSeverity] = useState<"critical" | "medium" | "low" | null>(null);
  const toggle = (e: EmergencyType) => setTypes((ts) => (ts.includes(e) ? ts.filter((x) => x !== e) : [...ts, e]));
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [listening, setListening] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", description: "", people: "" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ code: string } | null>(null);
  const [saved, setSaved] = useState(false);

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
          setTypes((ts) => (ts.includes(m) ? ts : [...ts, m]));
          speak(t(m), lang);
        } else toast(`“${text}”`);
      },
      () => setListening(false),
    );
    if (ok) setListening(true);
    else toast.error("Voice input isn't supported in this browser. Please tap an option.");
  };

  const submit = async () => {
    if (!types.length) { toast.error(t("chooseType")); return; }
    if (!severity) { toast.error(t("severity")); return; }
    if (!loc) { toast.error(t("shareLocation")); return; }
    const args = {
      _types: types,
      _severity: severity,
      _lat: loc.lat,
      _lng: loc.lng,
      _name: form.name,
      _mobile: form.mobile,
      _description: form.description,
      _people: form.people ? Number(form.people) : null,
    };
    const saveOffline = () => {
      enqueueSos({ ...args, at: Date.now() });
      setSaved(true);
      speak(t("sosSaved"), lang);
    };
    if (!navigator.onLine) { saveOffline(); return; }
    setSending(true);
    const { data, error } = await sendSos(args)
      .then((r) => r, () => ({ data: null, error: new Error("network") }));
    setSending(false);
    if (error || !data?.[0]) {
      if (!navigator.onLine || error?.message?.toLowerCase().includes("fetch") || error?.message === "network") { saveOffline(); return; }
      toast.error("Could not send. Please try again."); return;
    }
    const code = data[0].request_code;
    localStorage.setItem("lastRequest", code);
    setResult({ code });
    speak(`${t("sosSent")}. ${code.split("").join(" ")}`, lang);
  };

  if (saved && !result)
    return (
      <AppShell>
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-sos" />
          <p className="mt-3 text-lg font-bold">{t("sosSaved")}</p>
          <p className="mt-4 text-sm text-muted-foreground">{t("callHelp")}</p>
          <div className="mt-2 flex justify-center gap-2">
            {["112", "108", "1078"].map((n) => (
              <a key={n} href={`tel:${n}`} className="rounded-lg bg-sos px-4 py-2 font-bold text-sos-foreground">{n}</a>
            ))}
          </div>
        </div>
      </AppShell>
    );

  if (result)
    return (
      <AppShell>
        <div className="mx-auto max-w-md rounded-2xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
          <h1 className="mt-3 text-2xl font-extrabold">{t("sosSent")}</h1>
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
      <div className="mx-auto max-w-xl space-y-5 pb-24 md:pb-0">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">{t("chooseType")}</h1>
          <button onClick={voice} className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${listening ? "bg-sos text-sos-foreground" : "bg-card"}`}>
            <Mic className="h-4 w-4" /> {listening ? "…" : "Voice"}
          </button>
        </div>
        <p className="-mt-4 text-sm text-muted-foreground">{t("multiHint")} · {t("voiceHint")}</p>

        <div className="grid grid-cols-3 gap-2.5">
          {EMERGENCY_TYPES.map((e) => (
            <button
              key={e}
              onClick={() => toggle(e)}
              aria-pressed={types.includes(e)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center text-sm font-semibold transition ${types.includes(e) ? "border-primary bg-accent text-accent-foreground" : "border-transparent bg-card shadow-soft"}`}
            >
              {(() => { const I = ICONS[e]; return <I className="h-7 w-7" />; })()}
              {t(e)}
              
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="flex items-center gap-2 font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">1</span>{t("location")} *</p>
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

        <details className="rounded-2xl bg-card p-4 shadow-soft">
          <summary className="cursor-pointer font-semibold">{t("optional")}</summary>
          <div className="mt-3 grid gap-3">
            <input className="rounded-lg border bg-background px-3 py-2" placeholder={t("name")} maxLength={100} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="rounded-lg border bg-background px-3 py-2" placeholder={t("mobile")} inputMode="tel" maxLength={20} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <input className="rounded-lg border bg-background px-3 py-2" placeholder={t("people")} type="number" min={1} max={10000} value={form.people} onChange={(e) => setForm({ ...form, people: e.target.value })} />
            <textarea className="rounded-lg border bg-background px-3 py-2" placeholder={t("description")} maxLength={1000} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </details>

        <div className="rounded-2xl bg-card p-4 shadow-soft">
          <p className="flex items-center gap-2 font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">2</span>{t("severity")} *</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["critical", "medium", "low"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                aria-pressed={severity === s}
                className={`rounded-lg border-2 py-3 font-bold ${severity === s ? (s === "critical" ? "border-critical bg-critical text-sos-foreground" : s === "medium" ? "border-high bg-high text-foreground" : "border-normal bg-normal text-sos-foreground") : "border-transparent bg-muted"}`}
              >
                {t(s === "critical" ? "sevCritical" : s === "medium" ? "sevMedium" : "sevLow")}
              </button>
            ))}
          </div>
          {severity && <div className="mt-2 flex items-center gap-2 text-sm">Priority: <PriorityBadge p={severity} /></div>}
        </div>

        <div className="fixed inset-x-0 bottom-[3.75rem] z-[999] border-t bg-background/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <button onClick={submit} disabled={sending} className="mx-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl bg-sos py-4 font-display text-xl font-extrabold text-sos-foreground disabled:opacity-60">
          {sending && <Loader2 className="h-5 w-5 animate-spin" />} {t("confirmSos")}
        </button>
        </div>
      </div>
    </AppShell>
  );
}
