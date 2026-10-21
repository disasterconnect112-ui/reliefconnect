import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { HandHeart, Building2, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ReliefConnect — Emergency SOS & Disaster Relief" },
      { name: "description", content: "One-tap emergency SOS with no login. Volunteers and NGOs coordinate disaster relief in real time." },
      { property: "og:title", content: "ReliefConnect — Emergency SOS & Disaster Relief" },
      { property: "og:description", content: "One-tap emergency SOS with no login. Volunteers and NGOs coordinate relief." },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    // Email sign-in links may land here; send the signed-in user to their dashboard.
    const fromLink = /access_token|type=magiclink|type=signup/.test(window.location.hash) || new URLSearchParams(window.location.search).has("code");
    if (session && fromLink) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);
  return (
    <AppShell speakText={`${t("noLogin")} ${t("howItWorks")}: 1. ${t("step1")}. 2. ${t("step2")}. 3. ${t("step3")}.`}>
      <section className="flex flex-col items-center pt-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sos">{t("tagline")}</p>
        <h1 className="mt-2 max-w-xl text-3xl font-black leading-tight md:text-5xl">Help is one tap away.</h1>
        <Link
          to="/sos"
          className="animate-sos shadow-sos mt-12 grid h-52 w-52 place-items-center rounded-full bg-sos text-sos-foreground md:h-64 md:w-64"
        >
          <span className="font-display text-3xl font-black tracking-tight md:text-4xl">{t("sendSos")}</span>
        </Link>
        <p className="mt-10 text-muted-foreground">{t("noLogin")}</p>
        <Link to="/track" search={{ id: undefined }} className="mt-4 inline-flex items-center gap-2 rounded-full border bg-card px-5 py-2.5 font-medium hover:bg-muted">
          <Search className="h-4 w-4" /> {t("track")}
        </Link>
      </section>

      <section className="mt-16">
        <h2 className="text-xl font-bold">{t("howItWorks")}</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((s, i) => (
            <li key={s} className="rounded-xl border bg-card p-4">
              <span className="font-display text-3xl font-black text-sos">{i + 1}</span>
              <p className="mt-1 font-medium">{t(s)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <HandHeart className="h-6 w-6 text-success" />
          <h3 className="mt-2 font-bold">For volunteers</h3>
          <p className="mt-1 text-sm text-muted-foreground">Accept nearby tasks, update progress, earn points and badges.</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <Building2 className="h-6 w-6 text-normal" />
          <h3 className="mt-2 font-bold">For NGOs</h3>
          <p className="mt-1 text-sm text-muted-foreground">See live requests, list your services and relief camps, coordinate response.</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <ShieldCheck className="h-6 w-6 text-high" />
          <h3 className="mt-2 font-bold">About</h3>
          <p className="mt-1 text-sm text-muted-foreground">A lightweight platform connecting disaster-affected people with responders, in 10 languages.</p>
        </div>
      </section>

      <div className="mt-10 flex justify-center">
        <Link to="/auth" className="rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
          {t("getStarted")}
        </Link>
      </div>
    </AppShell>
  );
}
