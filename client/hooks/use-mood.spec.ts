import { describe, expect, it } from "vitest";

import { mapMoodEntry, moodOptions } from "@/hooks/use-mood";

describe("mood check-in", () => {
  it("keeps the mood choices explicit", () => {
    expect(moodOptions.map((option) => option.value)).toEqual([
      "joyful",
      "soft",
      "steady",
      "tender",
      "heavy",
    ]);
  });

  it("maps a private database entry with mapping", () => {
    expect(
      mapMoodEntry({
        id: "mood-1",
        relationship_id: "relationship-1",
        user_id: "user-1",
        mood: "tender",
        entry_date: "2025-03-08",
        message_id: null,
        letter_id: null,
        ai_prompt: null,
        custom_message: null,
        enabled: true,
      }),
    ).toEqual({
      id: "mood-1",
      relationshipId: "relationship-1",
      userId: "user-1",
      mood: "tender",
      entryDate: "2025-03-08",
      mapping: {
        id: "mood-1",
        relationshipId: "relationship-1",
        mood: "tender",
        messageId: null,
        letterId: null,
        aiPrompt: null,
        customMessage: null,
        enabled: true,
      },
    });
  });

  it("maps a database entry without mapping when disabled", () => {
    expect(
      mapMoodEntry({
        id: "mood-2",
        relationship_id: "relationship-1",
        user_id: "user-1",
        mood: "soft",
        entry_date: "2025-03-09",
        message_id: null,
        letter_id: null,
        ai_prompt: null,
        custom_message: null,
        enabled: false,
      }),
    ).toEqual({
      id: "mood-2",
      relationshipId: "relationship-1",
      userId: "user-1",
      mood: "soft",
      entryDate: "2025-03-09",
      mapping: null,
    });
  });
});
