import { describe, expect, it } from "vitest";

import { summarizeMoodEntries } from "@/hooks/use-mood-history";

describe("mood history", () => {
  it("summarizes counts and the current check-in streak", () => {
    const entries = [
      { id: "1", relationshipId: "r", userId: "u", mood: "soft" as const, entryDate: "2025-03-10" },
      { id: "2", relationshipId: "r", userId: "u", mood: "soft" as const, entryDate: "2025-03-09" },
      { id: "3", relationshipId: "r", userId: "u", mood: "steady" as const, entryDate: "2025-03-08" },
    ];

    expect(summarizeMoodEntries(entries, new Date(2025, 2, 10))).toEqual({
      totalEntries: 3,
      currentStreak: 3,
      mostCommon: "soft",
      counts: { joyful: 0, soft: 2, steady: 1, tender: 0, heavy: 0 },
    });
  });

  it("does not invent a streak when today is missing", () => {
    const entries = [
      { id: "1", relationshipId: "r", userId: "u", mood: "joyful" as const, entryDate: "2025-03-09" },
    ];

    expect(summarizeMoodEntries(entries, new Date(2025, 2, 10)).currentStreak).toBe(0);
  });
});
