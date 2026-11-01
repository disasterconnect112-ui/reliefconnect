import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { summarizeSos, type SosSummary } from "./sos-ai.server";

export const summarizeOpenRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ items: SosSummary[]; error: string | null }> => {
    // RLS limits this to signed-in responders.
    const { data, error } = await context.supabase
      .from("emergency_requests")
      .select("id, emergency_type, priority, description, people_count, created_at")
      .eq("status", "received")
      .is("volunteer_id", null)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) return { items: [], error: "Could not load requests." };
    if (!data?.length) return { items: [], error: null };
    try {
      const items = await summarizeSos(data, getRequest()?.signal);
      return { items, error: null };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("SOS AI summary failed", e);
      if (status === 429) return { items: [], error: "AI is busy right now. Please try again in a minute." };
      if (status === 402) return { items: [], error: "AI credits have run out. The app owner needs to add credits." };
      return { items: [], error: "AI summary is unavailable right now." };
    }
  });
