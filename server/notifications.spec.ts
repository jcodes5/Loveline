import { describe, expect, it } from "vitest";

import { isNotificationReminderDue, isWithinQuietHours } from "./notifications";

describe("timed notifications", () => {
  it("waits until the recipient's local reminder time", () => {
    const dueAt = "2025-03-08T14:00:00.000Z";

    expect(
      isNotificationReminderDue(
        dueAt,
        "10:00",
        "America/New_York",
        new Date("2025-03-08T14:30:00.000Z"),
      ),
    ).toBe(false);
    expect(
      isNotificationReminderDue(
        dueAt,
        "10:00",
        "America/New_York",
        new Date("2025-03-08T15:00:00.000Z"),
      ),
    ).toBe(true);
  });

  it("does not notify before a message is due", () => {
    expect(
      isNotificationReminderDue(
        "2025-03-09T14:00:00.000Z",
        "09:00",
        "UTC",
        new Date("2025-03-09T13:59:00.000Z"),
      ),
    ).toBe(false);
  });

  it("suppresses delivery inside an overnight quiet window in the recipient timezone", () => {
    expect(
      isWithinQuietHours(
        new Date("2025-03-09T03:00:00.000Z"),
        "America/New_York",
        true,
        "22:00",
        "07:00",
      ),
    ).toBe(true);
    expect(
      isWithinQuietHours(
        new Date("2025-03-09T12:00:00.000Z"),
        "America/New_York",
        true,
        "22:00",
        "07:00",
      ),
    ).toBe(false);
  });

  it("supports daytime quiet windows and disabled quiet hours", () => {
    const now = new Date("2025-03-09T15:00:00.000Z");
    expect(isWithinQuietHours(now, "UTC", true, "12:00", "18:00")).toBe(true);
    expect(isWithinQuietHours(now, "UTC", false, "12:00", "18:00")).toBe(false);
    expect(isWithinQuietHours(now, "UTC", true, "08:00", "08:00")).toBe(false);
  });
});
