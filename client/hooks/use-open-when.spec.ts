import { describe, expect, it } from "vitest";

import { mapOpenWhenLetter } from "@/hooks/use-open-when";

describe("Open When letters", () => {
  it("maps relationship-scoped letter fields for the reader", () => {
    expect(
      mapOpenWhenLetter({
        id: "letter-1",
        relationship_id: "relationship-1",
        occasion: "you need a little courage",
        occasion_type: "need_encouragement",
        title: "You have more strength than you think",
        body: "I am beside you in every brave step.",
        cover_image_id: null,
        media_id: null,
        media_type: null,
        unlock_rule: "immediate",
        unlock_at: null,
        is_locked: false,
        created_at: "2025-03-08T10:00:00.000Z",
        updated_at: "2025-03-08T10:00:00.000Z",
      }),
    ).toEqual({
      id: "letter-1",
      relationshipId: "relationship-1",
      occasion: "you need a little courage",
      occasionType: "need_encouragement",
      title: "You have more strength than you think",
      body: "I am beside you in every brave step.",
      coverImageId: null,
      mediaId: null,
      mediaType: null,
      unlockRule: "immediate",
      unlockAt: null,
      isLocked: false,
      createdAt: "2025-03-08T10:00:00.000Z",
      updatedAt: "2025-03-08T10:00:00.000Z",
    });
  });
});
