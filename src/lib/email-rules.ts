// Registration email rules from the requirements document:
// volunteers use firstinitiallastname@gmail.com, NGOs use first@organization.org.
export const VOLUNTEER_EMAIL_RE = /^[a-zA-Z]{2,}@gmail\.com$/;
export const NGO_EMAIL_RE = /^[a-zA-Z]+@[a-zA-Z0-9-]+\.org$/;

export function emailAllowed(role: "volunteer" | "ngo", email: string): boolean {
  const e = email.trim();
  return role === "ngo" ? NGO_EMAIL_RE.test(e) : VOLUNTEER_EMAIL_RE.test(e);
}
