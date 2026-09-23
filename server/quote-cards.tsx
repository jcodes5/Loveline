import satori, { type SatoriOptions } from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";

type SatoriFont = SatoriOptions["fonts"][number];
export type QuoteCardPalette = "rose" | "dusk" | "honey";
export type QuoteCardTemplate = "minimal" | "romantic" | "editorial" | "polaroid" | "night" | "sunrise" | "memory" | "letterpress";
export type QuoteCardBgType = "template" | "gradient" | "image";
export type ArtisanalGradientKey = "rose_dawn" | "lavender_dusk" | "golden_hour" | "twilight_velvet";
export type QuoteCardAlignment = "left" | "center" | "right";

export type QuoteCardRenderInput = {
  quoteText: string;
  quoteAuthor: string;
  quoteSource: string | null;
  palette: QuoteCardPalette;
  template: QuoteCardTemplate;
  bgType?: QuoteCardBgType;
  gradient?: ArtisanalGradientKey | null;
  backgroundDataUrl?: string | null;
  alignment?: QuoteCardAlignment;
  showDate?: boolean;
  dateLabel?: string;
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
  letterpress: "linear-gradient(160deg, #f4efe6 0%, #ece4d4 100%)",
};

const artisanalGradients: Record<ArtisanalGradientKey, string> = {
  rose_dawn: "radial-gradient(120% 90% at 15% 10%, #ffe9ee 0%, #f7c6d4 38%, #c9899f 72%, #8f5b74 100%)",
  lavender_dusk: "radial-gradient(120% 90% at 85% 20%, #e9e4ff 0%, #c9b8ef 40%, #7d6fb0 75%, #443b66 100%)",
  golden_hour: "linear-gradient(150deg, #fff3d6 0%, #f7d9a8 34%, #d9a25f 68%, #8f5f33 100%)",
  twilight_velvet: "linear-gradient(170deg, #1e2238 0%, #40304f 45%, #6d3a54 78%, #2b1d33 100%)",
};

const artisanalForegrounds: Record<ArtisanalGradientKey, { foreground: string; accent: string; dark: boolean }> = {
  rose_dawn: { foreground: "#4a2233", accent: "#a64a66", dark: false },
  lavender_dusk: { foreground: "#2e2651", accent: "#6e54b5", dark: false },
  golden_hour: { foreground: "#5a3c18", accent: "#a06b24", dark: false },
  twilight_velvet: { foreground: "#fdf2f6", accent: "#eda6c0", dark: true },
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, "&quot;")
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
  quote: { x: number; y: number; maxWidth: number; fontSize: number; lineHeight: number; fontWeight: number; fontStyle?: string; color: string; textAnchor?: string };
  author: { x: number; y: number; fontSize: number; fontWeight: number; color: string; textAnchor?: string };
  source?: { x: number; y: number; maxWidth?: number; fontSize: number; fontWeight: number; color: string; opacity?: number; textAnchor?: string };
  date?: { x: number; y: number; fontSize: number; fontWeight: number; color: string; opacity?: number; textAnchor?: string };
  brand: { x: number; y: number; fontSize: number; fontWeight: number; color: string; letterSpacing?: number; textAnchor?: string };
  decorative?: JSX.Element[];
}

function getLayout(template: QuoteCardTemplate, colors: typeof palettes[keyof typeof palettes], quoteLines: string[]): LayoutConfig {
  switch (template) {
    case "minimal":
      return {
        quote: { x: 100, y: 330, maxWidth: 1000, fontSize: 58, lineHeight: 78, fontWeight: 700, color: colors.foreground },
        author: { x: 100, y: 0, fontSize: 28, fontWeight: 700, color: colors.foreground },
        source: { x: 100, y: 0, fontSize: 22, fontWeight: 400, color: colors.foreground, opacity: 0.62 },
        date: { x: 100, y: 0, fontSize: 18, fontWeight: 400, color: colors.foreground, opacity: 0.5 },
        brand: { x: 100, y: 1110, fontSize: 20, fontWeight: 700, color: colors.accent, letterSpacing: 3 },
      };

    case "romantic":
      return {
        quote: { x: 120, y: 280, maxWidth: 960, fontSize: 62, lineHeight: 84, fontWeight: 700, fontStyle: "italic", color: colors.foreground },
        author: { x: 120, y: 0, fontSize: 30, fontWeight: 500, color: colors.accent },
        source: { x: 120, y: 0, fontSize: 22, fontWeight: 400, color: colors.foreground, opacity: 0.7 },
        date: { x: 120, y: 0, fontSize: 18, fontWeight: 400, color: colors.foreground, opacity: 0.55 },
        brand: { x: 120, y: 1080, fontSize: 18, fontWeight: 600, color: colors.accent, letterSpacing: 2 },
        decorative: [
          <circle key="1" cx={1080} cy={120} r={180} fill={colors.soft} opacity={0.4} />,
          <circle key="2" cx={80} cy={1080} r={220} fill={colors.soft} opacity={0.3} />,
          <path key="3" d="M40 1160 C 200 900, 400 1100, 600 950" fill="none" stroke={colors.accent} strokeWidth={24} opacity={0.12} />
        ],
      };

    case "editorial":
      return {
        quote: { x: 100, y: 200, maxWidth: 1000, fontSize: 64, lineHeight: 80, fontWeight: 700, color: colors.foreground },
        author: { x: 100, y: 0, fontSize: 26, fontWeight: 600, color: colors.foreground },
        source: { x: 100, y: 0, fontSize: 20, fontWeight: 400, color: colors.foreground, opacity: 0.55 },
        date: { x: 100, y: 0, fontSize: 16, fontWeight: 400, color: colors.foreground, opacity: 0.45 },
        brand: { x: 100, y: 1120, fontSize: 16, fontWeight: 700, color: colors.accent, letterSpacing: 4 },
        decorative: [
          <line key="1" x1={100} y1={160} x2={300} y2={160} stroke={colors.accent} strokeWidth={3} />,
          <line key="2" x1={100} y1={1080} x2={1100} y2={1080} stroke={colors.foreground} strokeWidth={1} opacity={0.1} />
        ],
      };

    case "polaroid":
      return {
        quote: { x: 80, y: 780, maxWidth: 1040, fontSize: 52, lineHeight: 72, fontWeight: 700, color: colors.foreground },
        author: { x: 80, y: 0, fontSize: 24, fontWeight: 600, color: colors.foreground },
        source: { x: 80, y: 0, fontSize: 18, fontWeight: 400, color: colors.foreground, opacity: 0.6 },
        date: { x: 80, y: 0, fontSize: 16, fontWeight: 400, color: colors.foreground, opacity: 0.5 },
        brand: { x: 80, y: 1140, fontSize: 14, fontWeight: 600, color: colors.accent, letterSpacing: 2 },
        decorative: [
          <rect key="1" x={60} y={60} width={1080} height={1080} rx={12} fill="#ffffff" stroke="#e5e5e5" strokeWidth={2} />,
          <rect key="2" x={60} y={60} width={1080} height={720} fill="#f5f5f5" />
        ],
      };

    case "night":
      return {
        quote: { x: 100, y: 300, maxWidth: 1000, fontSize: 60, lineHeight: 80, fontWeight: 700, fontStyle: "italic", color: "#f8fafc" },
        author: { x: 100, y: 0, fontSize: 28, fontWeight: 500, color: "#e2e8f0" },
        source: { x: 100, y: 0, fontSize: 22, fontWeight: 400, color: "#94a3b8", opacity: 0.8 },
        date: { x: 100, y: 0, fontSize: 18, fontWeight: 400, color: "#94a3b8", opacity: 0.6 },
        brand: { x: 100, y: 1100, fontSize: 18, fontWeight: 600, color: "#fbbf24", letterSpacing: 2 },
        decorative: [
          <circle key="1" cx={1100} cy={100} r={4} fill="#fbbf24" opacity={0.9} />,
          <circle key="2" cx={200} cy={200} r={2} fill="#fbbf24" opacity={0.6} />,
          <circle key="3" cx={900} cy={150} r={3} fill="#fbbf24" opacity={0.7} />,
          <circle key="4" cx={100} cy={900} r={1.5} fill="#fbbf24" opacity={0.5} />,
          <circle key="5" cx={800} cy={1050} r={2.5} fill="#fbbf24" opacity={0.6} />
        ],
      };

    case "sunrise":
      return {
        quote: { x: 100, y: 320, maxWidth: 1000, fontSize: 58, lineHeight: 78, fontWeight: 700, color: "#7c2d12" },
        author: { x: 100, y: 0, fontSize: 28, fontWeight: 600, color: "#9a3412" },
        source: { x: 100, y: 0, fontSize: 22, fontWeight: 400, color: "#b45309", opacity: 0.7 },
        date: { x: 100, y: 0, fontSize: 18, fontWeight: 400, color: "#b45309", opacity: 0.55 },
        brand: { x: 100, y: 1110, fontSize: 20, fontWeight: 700, color: "#f59e0b", letterSpacing: 3 },
        decorative: [
          <ellipse key="1" cx={600} cy={1200} rx={800} ry={200} fill="#fef3c7" opacity={0.5} />,
          <ellipse key="2" cx={600} cy={1250} rx={600} ry={150} fill="#fde68a" opacity={0.3} />
        ],
      };

    case "memory":
      return {
        quote: { x: 100, y: 350, maxWidth: 1000, fontSize: 56, lineHeight: 76, fontWeight: 700, color: "#78350f" },
        author: { x: 100, y: 0, fontSize: 26, fontWeight: 600, color: "#a16207" },
        source: { x: 100, y: 0, fontSize: 20, fontWeight: 400, color: "#854d0e", opacity: 0.65 },
        date: { x: 100, y: 0, fontSize: 18, fontWeight: 400, color: "#854d0e", opacity: 0.55 },
        brand: { x: 100, y: 1100, fontSize: 18, fontWeight: 600, color: "#f59e0b", letterSpacing: 2 },
        decorative: [
          <rect key="1" x={40} y={40} width={1120} height={1120} rx={24} fill="none" stroke="#fde68a" strokeWidth={4} opacity={0.5} />,
          <circle key="2" cx={1100} cy={100} r={60} fill="#fef3c7" opacity={0.5} />,
          <circle key="3" cx={100} cy={1100} r={80} fill="#fde68a" opacity={0.3} />
        ],
      };

    case "letterpress":
      return {
        quote: { x: 140, y: 320, maxWidth: 920, fontSize: 60, lineHeight: 82, fontWeight: 700, color: "#3f3527" },
        author: { x: 140, y: 0, fontSize: 28, fontWeight: 500, color: "#6b5a41" },
        source: { x: 140, y: 0, fontSize: 22, fontWeight: 400, color: "#6b5a41", opacity: 0.7 },
        date: { x: 140, y: 0, fontSize: 18, fontWeight: 400, color: "#6b5a41", opacity: 0.55 },
        brand: { x: 140, y: 1090, fontSize: 18, fontWeight: 700, color: "#8a6b3f", letterSpacing: 3 },
        decorative: [
          <rect key="1" x={70} y={70} width={1060} height={1060} fill="none" stroke="#c9b89a" strokeWidth={2} />,
          <rect key="2" x={82} y={82} width={1036} height={1036} fill="none" stroke="#c9b89a" strokeWidth={1} opacity={0.5} />,
          <g key="3" opacity={0.18}>
            {Array.from({ length: 40 }).map((_, i) => (
              <line key={i} x1={70} y1={90 + i * 26} x2={1130} y2={90 + i * 26} stroke="#6b5a41" strokeWidth={0.75} />
            ))}
          </g>
        ],
      };

    default:
      return getLayout("minimal", colors, quoteLines);
  }
}

// Load fonts at module init (synchronously)

let fontData: SatoriFont[] = [];

async function loadFonts(): Promise<SatoriFont[]> {
  if (fontData.length > 0) return fontData;
  // Try multiple paths to find fonts (works in both production and test environments)
  const possibleDirs = [
    path.resolve(path.dirname(new URL(import.meta.url).pathname), "../fonts"),
    path.resolve(process.cwd(), "server/fonts"),
    path.resolve(process.cwd(), "fonts"),
  ];

  for (const fontDir of possibleDirs) {
    const fontFiles: Array<{
      name: string;
      file: string;
      weight: SatoriFont["weight"];
      style: SatoriFont["style"];
    }> = [
      { name: "Inter", file: "Inter-Regular.ttf", weight: 400, style: "normal" },
      { name: "Inter", file: "Inter-Bold.ttf", weight: 700, style: "normal" },
      { name: "Playfair Display", file: "PlayfairDisplay-Regular.ttf", weight: 400, style: "normal" },
      { name: "Playfair Display", file: "PlayfairDisplay-Bold.ttf", weight: 700, style: "normal" },
    ];

    let foundAll = true;
    for (const f of fontFiles) {
      try {
        const fontPath = path.join(fontDir, f.file);
        const data = await fs.readFile(fontPath);
        // Validate it's a valid TTF file (starts with 0x00010000 or 'true' or 'OTTO')
        const header = data.subarray(0, 4);
        const isValidTTF = header[0] === 0x00 && header[1] === 0x01 && header[2] === 0x00 && header[3] === 0x00;
        const isValidOTF = header[0] === 0x4F && header[1] === 0x54 && header[2] === 0x54 && header[3] === 0x4F; // 'OTTO'
        if (!isValidTTF && !isValidOTF) {
          console.warn(`Font ${f.file} appears invalid (header: ${Buffer.from(header).toString('hex')}), skipping`);
          foundAll = false;
          break;
        }
        const fontBuffer = new Uint8Array(data).buffer;
        fontData.push({
          name: f.name,
          data: fontBuffer,
          weight: f.weight,
          style: f.style,
        });
      } catch {
        foundAll = false;
        break;
      }
    }
    if (foundAll && fontData.length >= 4) break;
  }

  return fontData;
}

// Initialize fonts at startup
loadFonts().catch(() => {});

function applyAlignment(
  layout: LayoutConfig,
  alignment: QuoteCardAlignment,
): LayoutConfig {
  if (alignment === "center") {
    return {
      ...layout,
      quote: { ...layout.quote, x: 600, textAnchor: "middle" },
      author: { ...layout.author, x: 600, textAnchor: "middle" },
      source: layout.source ? { ...layout.source, x: 600, textAnchor: "middle" } : undefined,
      date: layout.date ? { ...layout.date, x: 600, textAnchor: "middle" } : undefined,
      brand: { ...layout.brand, x: 600, textAnchor: "middle" },
    };
  }
  if (alignment === "right") {
    const margin = layout.quote.x;
    return {
      ...layout,
      quote: { ...layout.quote, x: 1200 - margin, textAnchor: "end" },
      author: { ...layout.author, x: 1200 - margin, textAnchor: "end" },
      source: layout.source ? { ...layout.source, x: 1200 - margin, textAnchor: "end" } : undefined,
      date: layout.date ? { ...layout.date, x: 1200 - margin, textAnchor: "end" } : undefined,
      brand: { ...layout.brand, x: 1200 - margin, textAnchor: "end" },
    };
  }
  return layout;
}

export async function renderQuoteCardSvg(input: QuoteCardRenderInput): Promise<string> {
  const colors = palettes[input.palette];
  const bgType = input.bgType ?? "template";
  const gradient = input.gradient ?? null;

  // Choose the effective palette/colors for the chosen background mode.
  let effectivePalette = colors;
  let bg = templateBackgrounds[input.template] || colors.background;
  if (bgType === "gradient" && gradient && artisanalGradients[gradient]) {
    bg = artisanalGradients[gradient];
    const artColors = artisanalForegrounds[gradient];
    effectivePalette = {
      background: bg,
      foreground: artColors.foreground,
      accent: artColors.accent,
      soft: artColors.dark ? "#2b2236" : "#f6e8ec",
    };
  } else if (bgType === "image" && input.backgroundDataUrl) {
    bg = "transparent";
    effectivePalette = {
      background: "transparent",
      foreground: "#fff8f6",
      accent: "#f2c6d4",
      soft: "#342a33",
    };
  }

  const quoteLines = wrapText(input.quoteText);
  const baseLayout = getLayout(input.template, effectivePalette, quoteLines);
  const layout = applyAlignment(baseLayout, input.alignment ?? "center");

  const quoteTextNodes = quoteLines.map((line, i) => (
    <tspan key={i} x={layout.quote.x} dy={i === 0 ? 0 : layout.quote.lineHeight}>
      {escapeXml(line)}
    </tspan>
  ));

  let authorY = layout.quote.y + quoteLines.length * layout.quote.lineHeight + 80;
  const sourceY = authorY + (layout.source ? 44 : 0);
  const dateY = sourceY + (layout.date ? 36 : 0);
  const brandY = layout.brand.y;

  // Ensure fonts are loaded
  const fonts = await loadFonts();
  const hasFonts = fonts.length > 0;

  const dateLabel = input.showDate && input.dateLabel
    ? escapeXml(input.dateLabel)
    : null;

  const imageBackground = bgType === "image" && input.backgroundDataUrl
    ? (
      <>
        <img
          src={input.backgroundDataUrl}
          width={1200}
          height={1200}
          style={{ width: 1200, height: 1200, objectFit: "cover" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: 1200,
            height: 1200,
            background: "rgba(0, 0, 0, 0.45)",
          }}
        />
      </>
    )
    : null;

  const svg = await satori(
    <div style={{
      width: 1200,
      height: 1200,
      background: bg,
      fontFamily: "Inter, Playfair Display, Georgia, serif",
      color: effectivePalette.foreground,
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      {imageBackground}
      {layout.decorative}
      <text
        x={layout.brand.x}
        y={brandY}
        fontSize={layout.brand.fontSize}
        fontWeight={layout.brand.fontWeight}
        fontFamily="Inter"
        fill={layout.brand.color}
        letterSpacing={layout.brand.letterSpacing}
        textAnchor={layout.brand.textAnchor}
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
        textAnchor={layout.quote.textAnchor}
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
        textAnchor={layout.author.textAnchor}
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
          textAnchor={layout.source.textAnchor}
        >
          {escapeXml(input.quoteSource)}
        </text>
      )}
      {dateLabel && layout.date && (
        <text
          x={layout.date.x}
          y={dateY}
          fontSize={layout.date.fontSize}
          fontWeight={layout.date.fontWeight}
          fontFamily="Inter"
          fill={layout.date.color}
          opacity={layout.date.opacity}
          textAnchor={layout.date.textAnchor}
        >
          {dateLabel}
        </text>
      )}
    </div>,
    {
      width: 1200,
      height: 1200,
      fonts: fonts.length > 0 ? fonts : undefined,
    }
  );

  return svg;
}

export async function renderQuoteCardPng(input: QuoteCardRenderInput): Promise<Buffer> {
  const svg = await renderQuoteCardSvg(input);
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
  return resvg.render().asPng();
}

export { palettes, artisanalGradients };