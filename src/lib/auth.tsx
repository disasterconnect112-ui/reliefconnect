import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
type AuthCtx = {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isNgo: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};
const Ctx = createContext<AuthCtx>({ session: null, profile: null, isAdmin: false, isNgo: false, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isNgo, setIsNgo] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setIsAdmin(false);
      setIsNgo(false);
      setLoading(false);
      return;
    }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", s.user.id),
    ]);
    setProfile(p);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setIsNgo(!!roles?.some((r) => r.role === "ngo"));
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setTimeout(() => load(s), 0);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      load(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  return (
    <Ctx.Provider value={{ session, profile, isAdmin, isNgo, loading, refresh: () => load(session) }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

export function badgesFor(p: Pick<Profile, "completed_tasks" | "emergency_tasks" | "points">) {
  return [
    { icon: "🏅", name: "First Responder", desc: "Complete first task", earned: p.completed_tasks >= 1 },
    { icon: "🏆", name: "Helping Hand", desc: "Complete 10 tasks", earned: p.completed_tasks >= 10 },
    { icon: "⭐", name: "Relief Champion", desc: "Complete 50 tasks", earned: p.completed_tasks >= 50 },
    { icon: "🚑", name: "Emergency Helper", desc: "10 emergency tasks", earned: p.emergency_tasks >= 10 },
    { icon: "💙", name: "Community Hero", desc: "Earn 500 points", earned: p.points >= 500 },
  ];
}
