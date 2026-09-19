import { satori } from "satori";
import { Resvg } from "@resvg/resvg-js";

export type QuoteCardPalette = "rose" | "dusk" | "honey";
export type QuoteCardTemplate = "minimal" | "romantic" | "editorial" | "polaroid" | "night" | "sunrise" | "memory";

export type QuoteCardRenderInput = {
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string | null;
  palette: QuoteCardPalette;
  template: QuoteCardTemplate;
};

const palettes: Record<QuoteCardPalette, {
  background: string;
  foreground: string;
  accent: string;
  soft: string;
}> = {
  rose: { background: "#fff1f3", foreground: "#4b2632", accent: "#c85a78", soft: "#f5c5d1" },
  dusk: { background: "#30242a", foreground: "#fff8f6", accent: "#efb0be", soft: "#6f4452" },
  honey: { background: "#f4e8cf", foreground: "#493b2f", accent: "#a86e47", soft: "#e3c394" },
};

const templateBackgrounds: Record<QuoteCardTemplate, string> = {
  minimal: "",
  romantic: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
  editorial: "#ffffff",
  polaroid: "#fafafa",
  night: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
  sunrise: "linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%)",
  memory: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """)
    .replace(/'/g, "&apos;");
}

function wrapText(value: string, maxChars = 38): string[] {
  const words = value.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 7);
}

interface LayoutConfig {
  quote: { x: number; y: number; maxWidth: number; fontSize: number; lineHeight: number; fontWeight: number; fontStyle?: string; color: string };
  author: { x: number; y: number; fontSize: number; fontWeight: number; color: string };
  source?: { x: number; y: number; fontSize: number; fontWeight: number; color: string; opacity?: number };
  brand: { x: number; y: number; fontSize: number; fontWeight: number; color: string; letterSpacing?: number };
  decorative?: JSX.Element[];
}

function getLayout(template: QuoteCardTemplate, colors: ReturnType<typeof palettes[keyof typeof palettes]>, quoteLines: string[]): LayoutConfig {
  const isDark = ["dusk", "night"].includes(template);

  switch (template) {
    case "minimal":
      return {
        quote: { x: 100, y: 330, maxWidth: 1000, fontSize: 58, lineHeight: 78, fontWeight: 700, color: colors.foreground },
        author: { x: 100, y: 0, fontSize: 28, fontWeight: 700, color: colors.foreground },
        source: { x: 100, y: 0, fontSize: 22, fontWeight: 400, color: colors.foreground, opacity: 0.62 },
        brand: { x: 100, y: 1110, fontSize: 20, fontWeight: 700, color: colors.accent, letterSpacing: 3 },
      };

    case "romantic":
      return {
        quote: { x: 120, y: 280, maxWidth: 960, fontSize: 62, lineHeight: 84, fontWeight: 700, fontStyle: "italic", color: colors.foreground },
        author: { x: 120, y: 0, fontSize: 30, fontWeight: 500, color: colors.accent },
        source: { x: 120, y: 0, fontSize: 22, fontWeight: 400, color: colors.foreground, opacity: 0.7 },
        brand: { x: 120, y: 1080, fontSize: 18, fontWeight: 600, color: colors.accent, letterSpacing: 2 },
        decorative: (
          <>
            <circle cx={1080} cy={120} r={180} fill={colors.soft} opacity={0.4} />
            <circle cx={80} cy={1080} r={220} fill={colors.soft} opacity={0.3} />
            <path d="M40 1160 C 200 900, 400 1100, 600 950" fill="none" stroke={colors.accent} strokeWidth={24} opacity={0.12} />
          </>
        ),
      };

    case "editorial":
      return {
        quote: { x: 100, y: 200, maxWidth: 1000, fontSize: 64, lineHeight: 80, fontWeight: 700, color: colors.foreground },
        author: { x: 100, y: 0, fontSize: 26, fontWeight: 600, color: colors.foreground },
        source: { x: 100, y: 0, fontSize: 20, fontWeight: 400, color: colors.foreground, opacity: 0.55 },
        brand: { x: 100, y: 1120, fontSize: 16, fontWeight: 700, color: colors.accent, letterSpacing: 4 },
        decorative: (
          <>
            <line x1={100} y1={160} x2={300} y2={160} stroke={colors.accent} strokeWidth={3} />
            <line x1={100} y1={1080} x2={1100} y2={1080} stroke={colors.foreground} strokeWidth={1} opacity={0.1} />
          </>
        ),
      };

    case "polaroid":
      return {
        quote: { x: 80, y: 780, maxWidth: 1040, fontSize: 52, lineHeight: 72, fontWeight: 700, color: colors.foreground },
        author: { x: 80, y: 0, fontSize: 24, fontWeight: 600, color: colors.foreground },
        source: { x: 80, y: 0, fontSize: 18, fontWeight: 400, color: colors.foreground, opacity: 0.6 },
        brand: { x: 80, y: 1140, fontSize: 14, fontWeight: 600, color: colors.accent, letterSpacing: 2 },
        decorative: (
          <>
            <rect x={60} y={60} width={1080} height={1080} rx={12} fill="#ffffff" stroke="#e5e5e5" strokeWidth={2} />
            <rect x={60} y={60} width={1080} height={720} fill="#f5f5f5" />
          </>
        ),
      };

    case "night":
      return {
        quote: { x: 100, y: 300, maxWidth: 1000, fontSize: 60, lineHeight: 80, fontWeight: 700, fontStyle: "italic", color: "#f8fafc" },
        author: { x: 100, y: 0, fontSize: 28, fontWeight: 500, color: "#e2e8f0" },
        source: { x: 100, y: 0, fontSize: 22, fontWeight: 400, color: "#94a3b8", opacity: 0.8 },
        brand: { x: 100, y: 1100, fontSize: 18, fontWeight: 600, color: "#fbbf24", letterSpacing: 2 },
        decorative: (
          <>
            <circle cx={1100} cy={100} r={4} fill="#fbbf24" opacity={0.9} />
            <circle cx={200} cy={200} r={2} fill="#fbbf24" opacity={0.6} />
            <circle cx={900} cy={150} r={3} fill="#fbbf24" opacity={0.7} />
            <circle cx={100} cy={900} r={1.5} fill="#fbbf24" opacity={0.5} />
            <circle cx={800} cy={1050} r={2.5} fill="#fbbf24" opacity={0.6} />
          </>
        ),
      };

    case "sunrise":
      return {
        quote: { x: 100, y: 320, maxWidth: 1000, fontSize: 58, lineHeight: 78, fontWeight: 700, color: "#7c2d12" },
        author: { x: 100, y: 0, fontSize: 28, fontWeight: 600, color: "#9a3412" },
        source: { x: 100, y: 0, fontSize: 22, fontWeight: 400, color: "#b45309", opacity: 0.7 },
        brand: { x: 100, y: 1110, fontSize: 20, fontWeight: 700, color: "#f59e0b", letterSpacing: 3 },
        decorative: (
          <>
            <ellipse cx={600} cy={1200} rx={800} ry={200} fill="#fef3c7" opacity={0.5} />
            <ellipse cx={600} cy={1250} rx={600} ry={150} fill="#fde68a" opacity={0.3} />
          </>
        ),
      };

    case "memory":
      return {
        quote: { x: 100, y: 350, maxWidth: 1000, fontSize: 56, lineHeight: 76, fontWeight: 700, color: "#78350f" },
        author: { x: 100, y: 0, fontSize: 26, fontWeight: 600, color: "#a16207" },
        source: { x: 100, y: 0, fontSize: 20, fontWeight: 400, color: "#854d0e", opacity: 0.65 },
        brand: { x: 100, y: 1100, fontSize: 18, fontWeight: 600, color: "#f59e0b", letterSpacing: 2 },
        decorative: (
          <>
            <rect x={40} y={40} width={1120} height={1120} rx={24} fill="none" stroke="#fde68a" strokeWidth={4} opacity={0.5} />
            <circle cx={1100} cy={100} r={60} fill="#fef3c7" opacity={0.5} />
            <circle cx={100} cy={1100} r={80} fill="#fde68a" opacity={0.3} />
          </>
        ),
      };

    default:
      return getLayout("minimal", colors, quoteLines);
  }
}

export async function renderQuoteCardSvg(input: QuoteCardRenderInput): Promise<string> {
  const colors = palettes[input.palette];
  const bg = templateBackgrounds[input.template] || colors.background;
  const quoteLines = wrapText(input.quoteText);
  const layout = getLayout(input.template, colors, quoteLines);

  const quoteTextNodes = quoteLines.map((line, i) => (
    <tspan key={i} x={layout.quote.x} dy={i === 0 ? 0 : layout.quote.lineHeight}>
      {escapeXml(line)}
    </tspan>
  ));

  let authorY = layout.quote.y + quoteLines.length * layout.quote.lineHeight + 80;
  const sourceY = authorY + (layout.source ? 44 : 0);
  const brandY = layout.brand.y;

  const fonts = [
    { name: "Inter", data: await fetch("https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2").then(r => r.arrayBuffer()), weight: 400, style: "normal" },
    { name: "Inter", data: await fetch("https://fonts.gstatic.com/s/inter/v19/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2").then(r => r.arrayBuffer()), weight: 700, style: "normal" },
    { name: "Playfair Display", data: await fetch("https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-Fc.woff2").then(r => r.arrayBuffer()), weight: 400, style: "normal" },
    { name: "Playfair Display", data: await fetch("https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtXK-Fc.woff2").then(r => r.arrayBuffer()), weight: 700, style: "italic" },
  ];

  const svg = await satori(
    <div style={{
      width: 1200,
      height: 1200,
      background: bg,
      fontFamily: "Inter, Playfair Display, serif",
      color: colors.foreground,
      position: "relative",
    }}>
      {layout.decorative}
      <text
        x={layout.brand.x}
        y={brandY}
        fontSize={layout.brand.fontSize}
        fontWeight={layout.brand.fontWeight}
        fontFamily="Inter"
        fill={layout.brand.color}
        letterSpacing={layout.brand.letterSpacing}
        style={{ textTransform: "uppercase" }}
      >
        LOVELINE
      </text>
      <text
        x={layout.quote.x}
        y={layout.quote.y}
        fontSize={layout.quote.fontSize}
        fontWeight={layout.quote.fontWeight}
        fontFamily="Playfair Display"
        fontStyle={layout.quote.fontStyle}
        fill={layout.quote.color}
      >
        {quoteTextNodes}
      </text>
      <text
        x={layout.author.x}
        y={authorY}
        fontSize={layout.author.fontSize}
        fontWeight={layout.author.fontWeight}
        fontFamily="Inter"
        fill={layout.author.color}
      >
        {escapeXml(input.quoteAuthor)}
      </text>
      {input.quoteSource && layout.source && (
        <text
          x={layout.source.x}
          y={sourceY}
          fontSize={layout.source.fontSize}
          fontWeight={layout.source.fontWeight}
          fontFamily="Inter"
          fill={layout.source.color}
          opacity={layout.source.opacity}
        >
          {escapeXml(input.quoteSource)}
        </text>
      )}
    </div>,
    {
      width: 1200,
      height: 1200,
      fonts,
    }
  );

  return svg;
}

export async function renderQuoteCardPng(input: QuoteCardRenderInput): Promise<Buffer> {
  const svg = await renderQuoteCardSvg(input);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

export { palettes };