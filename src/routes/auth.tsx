import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Volunteer & NGO Sign In — ReliefConnect" },
      { name: "description", content: "Volunteers and NGOs sign in or register to receive and coordinate relief tasks." },
      { property: "og:title", content: "Volunteer & NGO Sign In — ReliefConnect" },
      { property: "og:description", content: "Register as a volunteer or NGO to coordinate disaster relief." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [method, setMethod] = useState<"password" | "code">("password");
  const [role, setRole] = useState<"volunteer" | "ngo">("volunteer");
  const [f, setF] = useState({ email: "", password: "", full_name: "", mobile: "", org_name: "" });
  const [busy, setBusy] = useState(false);
  // When set, we're waiting for the user to type the code emailed to them
  const [codeFor, setCodeFor] = useState<null | "email" | "signup">(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === "in" && method === "code") {
      const { error } = await supabase.auth.signInWithOtp({
        email: f.email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) toast.error(error.message.includes("not found") || error.message.includes("Signups") ? "No account with this email. Please register first." : error.message);
      else {
        setCodeFor("email");
        toast.success("We emailed you a sign-in code.");
      }
    } else if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password });
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: f.email,
        password: f.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { role, full_name: f.full_name, mobile: f.mobile, org_name: role === "ngo" ? f.org_name : null },
        },
      });
      if (error) toast.error(error.message);
      else if (!data.session) {
        setCodeFor("signup");
        toast.success("Check your email for a verification code.");
      }
    }
    setBusy(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeFor) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: f.email.trim(), token: code.trim(), type: codeFor });
    setBusy(false);
    if (error) toast.error("That code is wrong or expired. Try again.");
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) toast.error("Google sign-in failed");
  };

  const input = "w-full rounded-lg border bg-background px-3 py-2";
  return (
    <AppShell>
      <div className="mx-auto max-w-sm rounded-2xl border bg-card p-6">
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-semibold">
          {(["in", "up"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded-md py-1.5 ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
              {m === "in" ? "Sign in" : "Register"}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          {mode === "up" && (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(["volunteer", "ngo"] as const).map((r) => (
                  <button type="button" key={r} onClick={() => setRole(r)} className={`rounded-lg border-2 py-2 font-semibold ${role === r ? "border-sos" : ""}`}>
                    {r === "volunteer" ? "🙋 Volunteer" : "🏢 NGO"}
                  </button>
                ))}
              </div>
              {role === "ngo" && <input required className={input} placeholder="Organization name" value={f.org_name} onChange={(e) => setF({ ...f, org_name: e.target.value })} />}
              <input required className={input} placeholder={role === "ngo" ? "Contact person" : "Full name"} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
              <input required className={input} placeholder="Mobile number" inputMode="tel" value={f.mobile} onChange={(e) => setF({ ...f, mobile: e.target.value })} />
            </>
          )}
          <input required type="email" className={input} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input required type="password" minLength={6} className={input} placeholder="Password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-semibold text-primary-foreground">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "in" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="my-4 text-center text-xs text-muted-foreground">or</div>
        <button onClick={google} className="w-full rounded-lg border py-2.5 font-semibold hover:bg-muted">
          Continue with Google
        </button>
        <p className="mt-4 text-center text-xs text-muted-foreground">Need help right now? You don't need an account — use SOS.</p>
      </div>
    </AppShell>
  );
}
