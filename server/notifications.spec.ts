import { describe, expect, it } from "vitest";

import { isNotificationReminderDue } from "./notifications";

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
});
