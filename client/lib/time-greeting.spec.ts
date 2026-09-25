import { describe, expect, it } from "vitest";

import { getTimeGreeting } from "@/lib/time-greeting";

describe("time-based greeting", () => {
  it("uses the local morning, afternoon, and evening periods", () => {
    expect(getTimeGreeting(new Date(2025, 0, 1, 11, 59))).toBe("Good morning");
    expect(getTimeGreeting(new Date(2025, 0, 1, 12, 0))).toBe("Good afternoon");
    expect(getTimeGreeting(new Date(2025, 0, 1, 16, 59))).toBe("Good afternoon");
    expect(getTimeGreeting(new Date(2025, 0, 1, 17, 0))).toBe("Good evening");
  });

  it("uses the selected device timezone rather than UTC", () => {
    const instant = new Date("2025-06-01T02:00:00.000Z");
    expect(getTimeGreeting(instant, "Africa/Lagos")).toBe("Good morning");
    expect(getTimeGreeting(instant, "America/Los_Angeles")).toBe("Good evening");
  });
});
