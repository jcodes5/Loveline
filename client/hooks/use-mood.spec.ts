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

  it("maps a private database entry", () => {
    expect(
      mapMoodEntry({
        id: "mood-1",
        relationship_id: "relationship-1",
        user_id: "user-1",
        mood: "tender",
        entry_date: "2025-03-08",
      }),
    ).toEqual({
      id: "mood-1",
      relationshipId: "relationship-1",
      userId: "user-1",
      mood: "tender",
      entryDate: "2025-03-08",
    });
  });
});
