import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveTrackingKey } from "@/lib/victim-progress";

export type SosArgs = {
  _types: string[]; _severity: string; _lat: number; _lng: number; _name: string; _mobile: string; _description: string; _people: number | null;
};
export type QueuedSos = SosArgs & { at: number };
type LegacyQueued = Partial<QueuedSos> & { _type?: string };
const KEY = "sosQueue";

export function readQueue(): QueuedSos[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]") as LegacyQueued[];
    return raw.map((q) => ({
      ...(q as QueuedSos),
      _types: q._types ?? (q._type ? [q._type] : ["other"]),
      _severity: q._severity ?? "critical",
    }));
  } catch { return []; }
}
function writeQueue(q: QueuedSos[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new Event("sosqueue"));
}
export function enqueueSos(s: QueuedSos) { writeQueue([...readQueue(), s]); }

export function sendSos(a: SosArgs) {
  return supabase.rpc("submit_sos_multi", {
    _types: a._types, _severity: a._severity, _lat: a._lat, _lng: a._lng,
    _name: a._name, _mobile: a._mobile, _description: a._description,
    _people: a._people as unknown as number,
  });
}

let flushing = false;
/** Sends queued SOS requests; returns the request codes that were sent. */
export async function flushQueue(): Promise<string[]> {
  if (flushing || !navigator.onLine) return [];
  flushing = true;
  const sent: string[] = [];
  try {
    const q = readQueue();
    const left: QueuedSos[] = [];
    for (const item of q) {
      const { data, error } = await sendSos(item);
      if (error || !data?.[0]) left.push(item);
      else {
        saveTrackingKey(data[0].request_code, data[0].tracking_token);
        sent.push(data[0].request_code);
      }
    }
    writeQueue(left);
  } finally { flushing = false; }
  return sent;
}

export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const u = () => setOnline(navigator.onLine);
    u();
    window.addEventListener("online", u); window.addEventListener("offline", u);
    return () => { window.removeEventListener("online", u); window.removeEventListener("offline", u); };
  }, []);
  return online;
}

export function useQueueCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const u = () => setN(readQueue().length);
    u();
    window.addEventListener("sosqueue", u); window.addEventListener("storage", u);
    return () => { window.removeEventListener("sosqueue", u); window.removeEventListener("storage", u); };
  }, []);
  return n;
}
