import { describe, expect, it } from "vitest";

import { mapDailyContent } from "@/hooks/use-daily-content-workspace";

describe("daily content workspace", () => {
  it("maps database fields into the recipient content shape", () => {
    expect(
      mapDailyContent({
        id: "content-1",
        content_date: "2025-03-08",
        hero_label: "Today, made for you",
        hero_title: "A soft start",
        hero_body: "A little welcome.",
        note_body: "Take your time.",
        affirmation: "I can move gently.",
        affirmation_detail: "There is no rush.",
        quote_text: "Stay close to what matters.",
        quote_author: "Loveline",
        quote_source: null,
        approval_status: "pending",
      }),
    ).toEqual({
      id: "content-1",
      contentDate: "2025-03-08",
      heroLabel: "Today, made for you",
      heroTitle: "A soft start",
      heroBody: "A little welcome.",
      noteBody: "Take your time.",
      affirmation: "I can move gently.",
      affirmationDetail: "There is no rush.",
      quoteText: "Stay close to what matters.",
      quoteAuthor: "Loveline",
      quoteSource: null,
      approvalStatus: "pending",
    });
  });
});
