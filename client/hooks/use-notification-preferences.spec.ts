import { describe, expect, it } from "vitest";

import {
  defaultNotificationPreferences,
  mapNotificationPreferences,
} from "@/hooks/use-notification-preferences";

describe("notification preferences", () => {
  it("keeps personal message reminders enabled for new spaces", () => {
    expect(defaultNotificationPreferences.personalMessagesEnabled).toBe(true);
    expect(defaultNotificationPreferences.personalMessagesTime).toBe("09:00");
    expect(defaultNotificationPreferences.personalMessagesTimezone).toBeTruthy();
    expect(mapNotificationPreferences(null)).toEqual(defaultNotificationPreferences);
  });

  it("maps saved timing and opt-out values", () => {
    expect(
      mapNotificationPreferences({
        personal_messages_enabled: false,
        personal_messages_time: "18:30:00",
        personal_messages_timezone: "America/New_York",
      }),
    ).toEqual({
      personalMessagesEnabled: false,
      personalMessagesTime: "18:30",
      personalMessagesTimezone: "America/New_York",
    });
  });
});
