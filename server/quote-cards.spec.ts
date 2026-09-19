import { describe, expect, it } from "vitest";

import { renderQuoteCardSvg } from "./quote-cards";

describe("quote card renderer", () => {
  it("escapes user content before placing it in SVG", () => {
    const svg = renderQuoteCardSvg({
      quoteText: "Stay <close> & kind",
      quoteAuthor: "A \"favorite\" person",
      quoteSource: "Our story",
      palette: "rose",
    });

    expect(svg).toContain("Stay &lt;close&gt; &amp; kind");
    expect(svg).toContain("A &quot;favorite&quot; person");
    expect(svg).not.toContain("<close>");
  });

  it("uses the selected palette", () => {
    const svg = renderQuoteCardSvg({
      quoteText: "A thought",
      quoteAuthor: "Loveline",
      quoteSource: null,
      palette: "dusk",
    });

    expect(svg).toContain('fill="#30242a"');
    expect(svg).toContain('fill="#fff8f6"');
  });
});
