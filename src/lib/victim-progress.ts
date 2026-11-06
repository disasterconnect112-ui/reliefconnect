export type VictimProgress = "arrived" | "help_received" | "still_need_help";
export type ProgressUpdate = { progress: VictimProgress; at: string };

export function progressActions(status: string, volunteerId: string | null, latest?: VictimProgress): VictimProgress[] {
  if (!volunteerId || !["assigned", "on_the_way", "delivered", "completed"].includes(status)) return [];
  const actions: VictimProgress[] = ["help_received", "still_need_help"];
  if (["assigned", "on_the_way"].includes(status) && latest !== "help_received") actions.unshift("arrived");
  return actions.filter((action) => action !== latest);
}

export function saveTrackingKey(code: string, token: string) {
  localStorage.setItem(`trackingKey:${code}`, token);
  localStorage.setItem("lastRequest", code);
}