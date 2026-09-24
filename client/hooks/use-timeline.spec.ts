import { describe, expect, it } from "vitest";

import { buildTimelineItems } from "@/hooks/use-timeline";

const baseDate = {
  recurrence: "yearly" as const,
  remindBeforeDays: 0,
  message: "",
  theme: "minimal" as const,
  location: "",
  memoryId: null,
  enabled: true,
  timezone: "UTC",
};

const baseMemory = {
  format: "jpg",
  width: 1200,
  height: 900,
  bytes: 1000,
  caption: "A rainy afternoon",
  notes: "",
  takenAt: "2025-04-02",
  createdAt: "2025-04-02T12:00:00.000Z",
  albumId: null,
  isFavorite: false,
  thumbnailUrl: "",
};

const baseReaction = {
  relationshipId: "relationship-1",
  senderId: "partner-1",
  cardId: null,
  kind: "love" as const,
  note: null,
};

describe("relationship timeline", () => {
  it("combines dates and memories in chronological order", () => {
    const items = buildTimelineItems(
      [
        {
          id: "date-2",
          relationshipId: "relationship-1",
          createdBy: "owner-1",
          kind: "anniversary",
          label: "A year of us",
          eventDate: "2025-06-14",
          notes: "",
          ...baseDate,
        },
        {
          id: "date-1",
          relationshipId: "relationship-1",
          createdBy: "owner-1",
          kind: "relationship_start",
          label: "The day we met",
          eventDate: "2025-03-01",
          notes: "",
          ...baseDate,
        },
      ],
      [
        {
          id: "memory-1",
          relationshipId: "relationship-1",
          ...baseMemory,
          caption: "A rainy afternoon",
          takenAt: "2025-04-02",
          createdAt: "2025-04-02T12:00:00.000Z",
          url: "https://example.com/memory.jpg",
        },
      ],
      [],
    );

    expect(items.map((item) => item.id)).toEqual(["date-date-1", "memory-memory-1", "date-date-2"]);
  });

  it("uses the saved date when a memory has no taken date", () => {
    const items = buildTimelineItems([], [
      {
        id: "memory-1",
        relationshipId: "relationship-1",
        ...baseMemory,
        format: "png",
        width: 800,
        height: 800,
        caption: "A quiet night",
        takenAt: null,
        createdAt: "2025-05-08T12:00:00.000Z",
        url: "https://example.com/memory.png",
      },
    ], []);

    expect(items[0]?.sortDate).toBe("2025-05-08");
    expect(items[0]?.type).toBe("memory");
  });

  it("places reactions into the timeline by the day they were sent", () => {
    const items = buildTimelineItems([], [
      {
        id: "memory-1",
        relationshipId: "relationship-1",
        ...baseMemory,
        caption: "A quiet night",
        takenAt: "2025-05-08",
        createdAt: "2025-05-08T12:00:00.000Z",
        url: "https://example.com/memory.png",
      },
    ], [
      {
        id: "reaction-1",
        ...baseReaction,
        createdAt: "2025-05-09T20:15:00.000Z",
      },
      {
        id: "reaction-2",
        ...baseReaction,
        createdAt: "2025-05-09T09:00:00.000Z",
      },
    ]);

    expect(items.map((item) => item.id)).toEqual(["memory-memory-1", "reaction-reaction-2", "reaction-reaction-1"]);
    expect(items[1]?.type).toBe("reaction");
  });
});
