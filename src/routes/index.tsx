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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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
      <section className="-mx-4 -mt-6 bg-gradient-deep px-4 pb-14 pt-10 text-deep-foreground md:mx-0 md:mt-0 md:rounded-3xl md:px-10">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-deep-foreground/70">{t("tagline")}</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight md:text-5xl">Help is one tap away.</h1>
            <p className="mt-4 text-deep-foreground/80">{t("noLogin")}</p>
            <Link to="/track" search={{ id: undefined }} className="mt-6 hidden items-center gap-2 rounded-full border border-deep-foreground/30 px-5 py-2.5 font-medium hover:bg-deep-foreground/10 md:inline-flex">
              <Search className="h-4 w-4" /> {t("track")}
            </Link>
          </div>
          <div className="flex flex-col items-center">
            <Link
              to="/sos"
              className="animate-sos shadow-sos grid h-52 w-52 place-items-center rounded-full bg-sos text-sos-foreground md:h-64 md:w-64"
            >
              <span className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{t("sendSos")}</span>
            </Link>
            <Link to="/track" search={{ id: undefined }} className="mt-10 inline-flex items-center gap-2 rounded-full border border-deep-foreground/30 px-5 py-2.5 font-medium hover:bg-deep-foreground/10 md:hidden">
              <Search className="h-4 w-4" /> {t("track")}
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold">{t("howItWorks")}</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {(["step1", "step2", "step3"] as const).map((s, i) => (
            <li key={s} className="flex items-start gap-4 rounded-2xl bg-card p-5 shadow-soft">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent font-display text-lg font-extrabold text-accent-foreground">{i + 1}</span>
              <p className="pt-2 font-medium">{t(s)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10 grid gap-3 md:grid-cols-3">
        {[
          { I: HandHeart, title: "For volunteers", text: "Accept nearby tasks, update progress, earn points and badges." },
          { I: Building2, title: "For NGOs", text: "See live requests, list your services and relief camps, coordinate response." },
          { I: ShieldCheck, title: "About", text: "A lightweight platform connecting disaster-affected people with responders, in 10 languages." },
        ].map(({ I, title, text }) => (
          <div key={title} className="rounded-2xl border bg-card p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><I className="h-5 w-5" /></span>
            <h3 className="mt-3 font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 flex justify-center">
        <Link to="/auth" className="rounded-full bg-primary px-7 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
          {t("getStarted")}
        </Link>
      </div>
    </AppShell>
  );
}
