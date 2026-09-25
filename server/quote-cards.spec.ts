import { describe, expect, it } from "vitest";

import { renderQuoteCardSvg } from "./quote-cards";

describe("quote card renderer", () => {
  it("generates valid SVG without breaking XML structure", async () => {
    const svg = await renderQuoteCardSvg({
      quoteText: "Stay <close> & kind",
      quoteAuthor: 'A "favorite" person',
      quoteSource: "Our story",
      palette: "rose",
      template: "minimal",
    });

    // SVG should be well-formed XML
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 1200 1200"');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    // Should not contain unescaped characters that break XML
    expect(svg).not.toContain("<close>");
    expect(svg).not.toContain('"favorite"');
  }, 20000);

  it("uses the selected palette", async () => {
    const svg = await renderQuoteCardSvg({
      quoteText: "A thought",
      quoteAuthor: "Loveline",
      quoteSource: null,
      palette: "dusk",
      template: "minimal",
    });

    expect(svg).toContain('fill="#30242a"');
    expect(svg).toContain('fill="#fff8f6"');
  }, 20000);

  it("keeps an uploaded background behind the quote text", async () => {
    const svg = await renderQuoteCardSvg({
      quoteText: "Visible over the photo",
      quoteAuthor: "Loveline",
      quoteSource: null,
      palette: "rose",
      template: "minimal",
      bgType: "image",
      backgroundDataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC",
    });

    const imagePosition = svg.indexOf("data:image/png;base64");
    const textPosition = svg.indexOf('fill="#fff8f6"');
    expect(imagePosition).toBeGreaterThanOrEqual(0);
    expect(textPosition).toBeGreaterThan(imagePosition);
  }, 20000);
});
