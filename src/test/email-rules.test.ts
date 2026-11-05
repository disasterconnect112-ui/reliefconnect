import { describe, expect, it } from "vitest";
import { emailAllowed } from "@/lib/email-rules";

describe("registration email rules", () => {
  it("accepts volunteer gmail addresses like firstinitiallastname@gmail.com", () => {
    expect(emailAllowed("volunteer", "smanda@gmail.com")).toBe(true);
    expect(emailAllowed("volunteer", "ab@gmail.com")).toBe(true);
  });

  it("rejects volunteer emails that are not gmail.com or have a too-short local part", () => {
    expect(emailAllowed("volunteer", "smanda@yahoo.com")).toBe(false);
    expect(emailAllowed("volunteer", "a@gmail.com")).toBe(false);
    expect(emailAllowed("volunteer", "s.manda@gmail.com")).toBe(false);
    expect(emailAllowed("volunteer", "smanda1@gmail.com")).toBe(false);
  });

  it("accepts NGO addresses like first@organization.org", () => {
    expect(emailAllowed("ngo", "sreeshanth@redcross.org")).toBe(true);
    expect(emailAllowed("ngo", "help@relief-org2.org")).toBe(true);
  });

  it("rejects NGO emails that are not a .org address", () => {
    expect(emailAllowed("ngo", "sreeshanth@gmail.com")).toBe(false);
    expect(emailAllowed("ngo", "team@redcross.com")).toBe(false);
    expect(emailAllowed("ngo", "team@red_cross.org")).toBe(false);
  });
});
