import { describe, expect, it } from "vitest";
import { progressActions, saveTrackingKey } from "@/lib/victim-progress";

describe("victim progress rules", () => {
  it("does not allow updates without an assigned volunteer", () => {
    expect(progressActions("received", null)).toEqual([]);
    expect(progressActions("assigned", null)).toEqual([]);
  });
  it("allows arrival confirmation only before delivery", () => {
    expect(progressActions("on_the_way", "volunteer")).toContain("arrived");
    expect(progressActions("delivered", "volunteer")).not.toContain("arrived");
    expect(progressActions("completed", "volunteer")).not.toContain("arrived");
  });
  it("allows victims to dispute completion and confirm receipt", () => {
    expect(progressActions("completed", "volunteer")).toEqual(["help_received", "still_need_help"]);
  });
  it("prevents duplicate confirmations and backward arrival after receipt", () => {
    expect(progressActions("assigned", "volunteer", "help_received")).toEqual(["still_need_help"]);
    expect(progressActions("assigned", "volunteer", "arrived")).not.toContain("arrived");
  });
  it("keeps a separate private key for each SOS receipt", () => {
    saveTrackingKey("DR-1", "private-one");
    saveTrackingKey("DR-2", "private-two");
    expect(localStorage.getItem("trackingKey:DR-1")).toBe("private-one");
    expect(localStorage.getItem("trackingKey:DR-2")).toBe("private-two");
    expect(localStorage.getItem("lastRequest")).toBe("DR-2");
  });
});