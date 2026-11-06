import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { ProgressUpdate } from "@/lib/victim-progress";

export function VictimUpdates({ requestId }: { requestId: string }) {
  const { t, lang } = useI18n();
  const [updates, setUpdates] = useState<ProgressUpdate[]>([]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from("victim_progress_updates").select("progress, created_at").eq("request_id", requestId).order("created_at", { ascending: false }).limit(5);
      if (active) setUpdates((data ?? []).map((u) => ({ progress: u.progress as ProgressUpdate["progress"], at: u.created_at })));
    };
    void load();
    const interval = window.setInterval(load, 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [requestId]);
  if (!updates.length) return null;
  return <div className="mt-3 border-t pt-3 text-sm">
    <p className="font-semibold">{t("victimUpdates")}</p>
    <ul className="mt-1 space-y-1">{updates.map((u) => <li key={u.at} className={u.progress === "still_need_help" ? "text-destructive" : "text-muted-foreground"}>{t(u.progress)} · {new Date(u.at).toLocaleString(lang)}</li>)}</ul>
  </div>;
}