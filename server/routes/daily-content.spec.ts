import { describe, expect, it } from "vitest";

import { parseGeminiDraft } from "./daily-content";

describe("Gemini daily-content drafts", () => {
  it("parses valid JSON returned in a model response", () => {
    expect(
      parseGeminiDraft({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                heroLabel: "A softer morning",
                heroTitle: "You make ordinary days feel like ours.",
                heroBody: "Take this little pause before the day gets loud.",
                noteBody: "I hope you notice one small thing that makes you feel held today.",
                affirmation: "I can take today one kind step at a time.",
                affirmationDetail: "There is no prize for rushing through a day that deserves to be lived.",
                quoteText: "The small things are where we meet.",
                quoteAuthor: "Loveline",
                quoteSource: null,
              }),
            }],
          },
        }],
      }),
    ).toMatchObject({ heroLabel: "A softer morning", quoteAuthor: "Loveline" });
  });

  it("rejects incomplete model output", () => {
    expect(
      parseGeminiDraft({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ heroTitle: "Only part of a draft" }) }],
          },
        }],
      }),
    ).toBeNull();
  });
});
