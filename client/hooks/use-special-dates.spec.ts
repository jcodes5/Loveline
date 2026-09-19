import { describe, expect, it } from "vitest";

import { calculateDaysTogether, mapSpecialDate } from "@/hooks/use-special-dates";

describe("special dates", () => {
  it("counts the starting day as day one", () => {
    expect(calculateDaysTogether("2025-03-01", new Date(2025, 2, 1))).toBe(1);
    expect(calculateDaysTogether("2025-03-01", new Date(2025, 2, 8))).toBe(8);
  });

  it("does not count a future beginning as elapsed time", () => {
    expect(calculateDaysTogether("2025-04-01", new Date(2025, 2, 8))).toBe(0);
  });

  it("maps special date fields", () => {
    expect(
      mapSpecialDate({
        id: "date-1",
        relationship_id: "relationship-1",
        created_by: "user-1",
        kind: "anniversary",
        label: "The day we met",
        event_date: "2025-06-14",
        notes: "Rainy afternoon and two coffees.",
      }),
    ).toEqual({
      id: "date-1",
      relationshipId: "relationship-1",
      createdBy: "user-1",
      kind: "anniversary",
      label: "The day we met",
      eventDate: "2025-06-14",
      notes: "Rainy afternoon and two coffees.",
    });
  });
});
