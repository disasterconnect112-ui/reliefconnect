import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QueuedSos = {
  _type: string; _lat: number; _lng: number; _name: string; _mobile: string; _description: string; _people: number | null; at: number;
};
const KEY = "sosQueue";

export function readQueue(): QueuedSos[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function writeQueue(q: QueuedSos[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
  window.dispatchEvent(new Event("sosqueue"));
}
export function enqueueSos(s: QueuedSos) { writeQueue([...readQueue(), s]); }

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
      const { at: _at, ...args } = item;
      const { data, error } = await supabase.rpc("submit_sos", { ...args, _people: args._people as unknown as number });
      if (error || !data?.[0]) left.push(item);
      else sent.push(data[0].request_code);
    }
    writeQueue(left);
    if (sent.length) localStorage.setItem("lastRequest", sent[sent.length - 1]);
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
