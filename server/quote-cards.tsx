import type { Resvg as ResvgType } from "@resvg/resvg-js";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

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

const legacyTemplateBackgrounds: Partial<Record<QuoteCardTemplate, string>> = {
  editorial: "#ffffff",
  sunrise: "linear-gradient(180deg, #fff7ed 0%, #fed7aa 100%)",
  memory: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
};

const artisanalGradients: Record<ArtisanalGradientKey, string> = {
  rose_dawn: "linear-gradient(135deg, #f9c5d1 0%, #e98aa2 60%, #d1698a 100%)",
  lavender_dusk: "linear-gradient(135deg, #e5dbf5 0%, #b9a6e0 50%, #8d76c9 100%)",
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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
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
  return lines;
}

interface LayoutConfig {
  quote: { x: number; y: number; maxWidth: number; fontSize: number; lineHeight: number; fontWeight: number; fontStyle?: string; color: string; textAnchor?: string };
  author: { x: number; y: number; fontSize: number; fontWeight: number; color: string; textAnchor?: string };
  source?: { x: number; y: number; maxWidth?: number; fontSize: number; fontWeight: number; color: string; opacity?: number; textAnchor?: string };
  date?: { x: number; y: number; fontSize: number; fontWeight: number; color: string; opacity?: number; textAnchor?: string };
  brand: { x: number; y: number; fontSize: number; fontWeight: number; color: string; letterSpacing?: number; textAnchor?: string };
  decorative?: string[];
}

type PaletteLike = typeof palettes[keyof typeof palettes];

function getLayout(template: QuoteCardTemplate, colors: PaletteLike, quoteLines: string[]): LayoutConfig {
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
          `<circle cx="1080" cy="120" r="180" fill="${colors.soft}" opacity="0.4"/>`,
          `<circle cx="80" cy="1080" r="220" fill="${colors.soft}" opacity="0.3"/>`,
          `<path d="M40 1160 C 200 900, 400 1100, 600 950" fill="none" stroke="${colors.accent}" stroke-width="24" opacity="0.12"/>`,
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
          `<line x1="100" y1="160" x2="300" y2="160" stroke="${colors.accent}" stroke-width="3"/>`,
          `<line x1="100" y1="1080" x2="1100" y2="1080" stroke="${colors.foreground}" stroke-width="1" opacity="0.1"/>`,
        ],
      };

    case "polaroid":
      return {
        quote: { x: 80, y: 520, maxWidth: 1040, fontSize: 52, lineHeight: 72, fontWeight: 700, color: colors.foreground },
        author: { x: 80, y: 0, fontSize: 24, fontWeight: 600, color: colors.foreground },
        source: { x: 80, y: 0, fontSize: 18, fontWeight: 400, color: colors.foreground, opacity: 0.6 },
        date: { x: 80, y: 0, fontSize: 16, fontWeight: 400, color: colors.foreground, opacity: 0.5 },
        brand: { x: 80, y: 1140, fontSize: 14, fontWeight: 600, color: colors.accent, letterSpacing: 2 },
        decorative: [`<rect x="538" y="60" width="124" height="40" rx="8" fill="#ffffff" opacity="0.7"/>`],
      };

    case "night":
      return {
        quote: { x: 100, y: 300, maxWidth: 1000, fontSize: 60, lineHeight: 80, fontWeight: 700, fontStyle: "italic", color: colors.foreground },
        author: { x: 100, y: 0, fontSize: 28, fontWeight: 500, color: colors.foreground },
        source: { x: 100, y: 0, fontSize: 22, fontWeight: 400, color: colors.foreground, opacity: 0.8 },
        date: { x: 100, y: 0, fontSize: 18, fontWeight: 400, color: colors.foreground, opacity: 0.6 },
        brand: { x: 100, y: 1100, fontSize: 18, fontWeight: 600, color: colors.accent, letterSpacing: 2 },
        decorative: [
          `<circle cx="1100" cy="100" r="4" fill="#fbbf24" opacity="0.9"/>`,
          `<circle cx="200" cy="200" r="2" fill="#fbbf24" opacity="0.6"/>`,
          `<circle cx="900" cy="150" r="3" fill="#fbbf24" opacity="0.7"/>`,
          `<circle cx="100" cy="900" r="1.5" fill="#fbbf24" opacity="0.5"/>`,
          `<circle cx="800" cy="1050" r="2.5" fill="#fbbf24" opacity="0.6"/>`,
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
          `<ellipse cx="600" cy="1200" rx="800" ry="200" fill="#fef3c7" opacity="0.5"/>`,
          `<ellipse cx="600" cy="1250" rx="600" ry="150" fill="#fde68a" opacity="0.3"/>`,
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
          `<rect x="40" y="40" width="1120" height="1120" rx="24" fill="none" stroke="#fde68a" stroke-width="4" opacity="0.5"/>`,
          `<circle cx="1100" cy="100" r="60" fill="#fef3c7" opacity="0.5"/>`,
          `<circle cx="100" cy="1100" r="80" fill="#fde68a" opacity="0.3"/>`,
        ],
      };

    case "letterpress":
      return {
        quote: { x: 140, y: 320, maxWidth: 920, fontSize: 60, lineHeight: 82, fontWeight: 700, color: colors.foreground },
        author: { x: 140, y: 0, fontSize: 28, fontWeight: 500, color: colors.foreground },
        source: { x: 140, y: 0, fontSize: 22, fontWeight: 400, color: colors.foreground, opacity: 0.7 },
        date: { x: 140, y: 0, fontSize: 18, fontWeight: 400, color: colors.foreground, opacity: 0.55 },
        brand: { x: 140, y: 1090, fontSize: 18, fontWeight: 700, color: colors.accent, letterSpacing: 3 },
        decorative: [
          `<rect x="70" y="70" width="1060" height="1060" fill="none" stroke="#c9b89a" stroke-width="2"/>`,
          `<rect x="82" y="82" width="1036" height="1036" fill="none" stroke="#c9b89a" stroke-width="1" opacity="0.5"/>`,
          `<g opacity="0.18">${Array.from({ length: 40 }).map((_, i) => `<line x1="70" y1="${90 + i * 26}" x2="1130" y2="${90 + i * 26}" stroke="#6b5a41" stroke-width="0.75"/>`).join("")}</g>`,
        ],
      };

    default:
      return getLayout("minimal", colors, quoteLines);
  }
}

type GradientStops = Array<{ color: string; offset: string }>;

function parseCssGradient(css: string): { angle: number; stops: GradientStops } | null {
  const match = css.match(/^linear-gradient\(([0-9.]+)deg,\s*(.+)\)\s*$/);
  if (!match) return null;
  const angle = Number.parseFloat(match[1]);
  const stops: GradientStops = [];
  for (const part of match[2].split(",")) {
    const colorMatch = part.match(/#[0-9a-fA-F]{3,8}/);
    const offsetMatch = part.match(/(\d+(?:\.\d+)?)%/);
    if (!colorMatch) continue;
    stops.push({ color: colorMatch[0], offset: offsetMatch ? `${offsetMatch[1]}%` : "" });
  }
  if (stops.length === 0) return null;
  return { angle, stops };
}

function gradientVector(css: string): { x1: number; y1: number; x2: number; y2: number } | null {
  const parsed = parseCssGradient(css);
  if (!parsed) return null;
  const radians = (parsed.angle * Math.PI) / 180;
  const dx = Math.sin(radians);
  const dy = -Math.cos(radians);
  return {
    x1: 0.5 - dx * 0.75,
    y1: 0.5 - dy * 0.75,
    x2: 0.5 + dx * 0.75,
    y2: 0.5 + dy * 0.75,
  };
}

function backgroundFill(value: string, gradientId: string): string {
  if (value.startsWith("linear-gradient(")) {
    const vector = gradientVector(value);
    const stops = parseCssGradient(value)?.stops ?? [];
    const stopsSvg = stops
      .map((stop) => `<stop offset="${stop.offset}" stop-color="${stop.color}"/>`)
      .join("");
    if (vector && stopsSvg) {
      return [
        `<defs><linearGradient id="${gradientId}" x1="${vector.x1.toFixed(6)}" y1="${vector.y1.toFixed(6)}" x2="${vector.x2.toFixed(6)}" y2="${vector.y2.toFixed(6)}">`,
        stopsSvg,
        `</linearGradient></defs>`,
        `<rect width="1200" height="1200" fill="url(#${gradientId})"/>`,
      ].join("");
    }
    return `<rect width="1200" height="1200" fill="${stops[0]?.color ?? "#ffffff"}"/>`;
  }
  return `<rect width="1200" height="1200" fill="${value}"/>`;
}

function textAnchorAttr(layout: { textAnchor?: string }): string {
  return layout.textAnchor && layout.textAnchor !== "start" ? ` text-anchor="${layout.textAnchor}"` : "";
}

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
  let bg = legacyTemplateBackgrounds[input.template] ?? colors.background;
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

  const initialLayout = getLayout(input.template, effectivePalette, []);
  const reservedHeight = 80
    + initialLayout.author.fontSize
    + (initialLayout.source ? 44 + initialLayout.source.fontSize : 0)
    + (input.showDate && initialLayout.date ? 36 + initialLayout.date.fontSize : 0)
    + 20;
  const quoteHeight = Math.max(80, initialLayout.brand.y - initialLayout.quote.y - reservedHeight);
  let quoteFontSize = initialLayout.quote.fontSize;
  let quoteLines: string[];
  let quoteLineHeight: number;

  while (true) {
    quoteLineHeight = Math.max(20, Math.round(quoteFontSize * 1.3));
    const maxChars = Math.max(10, Math.floor(initialLayout.quote.maxWidth / (quoteFontSize * 0.52)));
    quoteLines = wrapText(input.quoteText, maxChars);
    if (quoteLines.length * quoteLineHeight <= quoteHeight || quoteFontSize <= 16) break;
    quoteFontSize = Math.max(16, quoteFontSize - 2);
  }

  const baseLayout = {
    ...initialLayout,
    quote: { ...initialLayout.quote, fontSize: quoteFontSize, lineHeight: quoteLineHeight },
  };
  const layout = applyAlignment(baseLayout, input.alignment ?? "center");

  const quoteTextNodes = quoteLines
    .map((line, i) => `<tspan x="${layout.quote.x}" dy="${i === 0 ? 0 : layout.quote.lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  const authorY = layout.quote.y + quoteLines.length * layout.quote.lineHeight + 80;
  const sourceY = authorY + (layout.source ? 44 : 0);
  const dateY = sourceY + (layout.date ? 36 : 0);
  const brandY = layout.brand.y;

  const dateLabel = input.showDate && input.dateLabel ? escapeXml(input.dateLabel) : null;

  let backgroundSvg = "";
  if (bgType === "image" && input.backgroundDataUrl) {
    backgroundSvg =
      `<image x="0" y="0" width="1200" height="1200" href="${input.backgroundDataUrl}" preserveAspectRatio="xMidYMid slice"/>` +
      `<rect width="1200" height="1200" fill="rgba(0,0,0,0.45)"/>`;
  } else {
    backgroundSvg = backgroundFill(bg, "loveline-bg");
  }

  const decorativeSvg = (layout.decorative ?? []).join("");

  const parts: string[] = [backgroundSvg, decorativeSvg];
  parts.push(
    `<text x="${layout.brand.x}" y="${brandY}" font-family="Inter" font-size="${layout.brand.fontSize}" font-weight="${layout.brand.fontWeight}" fill="${layout.brand.color}" letter-spacing="${layout.brand.letterSpacing ?? 0}"${textAnchorAttr(layout.brand)}>LOVELINE</text>`,
    `<text x="${layout.quote.x}" y="${layout.quote.y}" font-family="Playfair Display" font-size="${layout.quote.fontSize}" font-weight="${layout.quote.fontWeight}"${layout.quote.fontStyle ? ` font-style="${layout.quote.fontStyle}"` : ""} fill="${layout.quote.color}"${textAnchorAttr(layout.quote)}>${quoteTextNodes}</text>`,
    `<text x="${layout.author.x}" y="${authorY}" font-family="Inter" font-size="${layout.author.fontSize}" font-weight="${layout.author.fontWeight}" fill="${layout.author.color}"${textAnchorAttr(layout.author)}>${escapeXml(input.quoteAuthor)}</text>`,
  );
  if (input.quoteSource && layout.source) {
    parts.push(
      `<text x="${layout.source.x}" y="${sourceY}" font-family="Inter" font-size="${layout.source.fontSize}" font-weight="${layout.source.fontWeight}" fill="${layout.source.color}" opacity="${layout.source.opacity ?? 1}"${textAnchorAttr(layout.source)}>${escapeXml(input.quoteSource)}</text>`,
    );
  }
  if (dateLabel && layout.date) {
    parts.push(
      `<text x="${layout.date.x}" y="${dateY}" font-family="Inter" font-size="${layout.date.fontSize}" font-weight="${layout.date.fontWeight}" fill="${layout.date.color}" opacity="${layout.date.opacity ?? 1}"${textAnchorAttr(layout.date)}>${dateLabel}</text>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">${parts.join("")}</svg>`;
}

let fontFilePath: string[] | null = null;
let resvgModule: ResvgModule | null = null;

// Loaded dynamically (never statically) so a missing native binding can't crash
// the module: Netlify bundlers externalize `@resvg/resvg-js` but routinely skip
// its *optional* platform packages, so we ship the linux-x64 .node binary in
// dist/server/native ourselves (see scripts/copy-native-resvg.mjs).
const RESVG_SPECIFIER = ["@resvg", "resvg-js"].join("/");

type ResvgModule = {
  Resvg: typeof ResvgType;
};

function nativeRequire() {
  const base = typeof process !== "undefined" && process.argv && typeof process.argv[1] === "string"
    ? path.dirname(process.argv[1])
    : process.cwd();
  return createRequire(path.join(base, "__resvg-native__.cjs"));
}

function nativeCandidateDirs() {
  const base = typeof process !== "undefined" && process.argv && typeof process.argv[1] === "string"
    ? path.dirname(process.argv[1])
    : process.cwd();
  return [
    path.resolve(base, "dist/server/native"),
    path.resolve(base, "native"),
    path.resolve(process.cwd(), "dist/server/native"),
    path.resolve(process.cwd(), "native"),
  ];
}

async function resolveResvg(): Promise<ResvgModule> {
  if (resvgModule) return resvgModule;

  try {
    const module = await import(RESVG_SPECIFIER);
    resvgModule = module as ResvgModule;
    return resvgModule;
  } catch {
    // Native package unavailable at runtime; fall back to the bundled .node file.
  }

  const requireRuntime = nativeRequire();
  const triples =
    process.platform === "win32" && process.arch === "x64"
      ? ["win32-x64-msvc", "linux-x64-gnu", "linux-x64-musl"]
      : ["linux-x64-gnu", "linux-x64-musl"];
  for (const dir of nativeCandidateDirs()) {
    for (const triple of triples) {
      const candidate = path.join(dir, `resvgjs.${triple}.node`);
      try {
        const binding = requireRuntime(candidate) as {
          Resvg: new (svg: string | Buffer, options?: unknown) => { render(): { asPng(): Buffer } };
        };
        // The native binding expects the render options as a JSON string; the
        // published @resvg/resvg-js package wraps this in a small JS class.
        // Mirror that wrapper so the shipped binding behaves identically.
        const NativeResvg = binding.Resvg;
        class ShippedResvg extends NativeResvg {
          constructor(svg: string | Buffer, options?: unknown) {
            super(svg, options == null ? null : JSON.stringify(options));
          }
        }
        resvgModule = { ...binding, Resvg: ShippedResvg } as ResvgModule;
        return resvgModule;
      } catch {
        // Try the next candidate.
      }
    }
  }

  throw new Error("The comment card renderer (resvg) is not available in this runtime.");
}

const REQUIRED_FONTS = [
  "Inter-Regular.ttf",
  "Inter-Bold.ttf",
  "PlayfairDisplay-Regular.ttf",
  "PlayfairDisplay-Bold.ttf",
];

async function resolveFontFiles(): Promise<string[]> {
  if (fontFilePath) return fontFilePath;
  // Netlify bundles functions as CommonJS, where import.meta.url is unavailable,
  // so resolve relative to argv[1] (the running script) and fall back to cwd.
  const bundleDir = path.dirname(process.argv[1] ?? process.cwd());
  const candidateDirs = [
    // dist/server/fonts (production build copies fonts here)
    path.resolve(bundleDir, "fonts"),
    // repo/fonts or dist/fonts
    path.resolve(bundleDir, "../fonts"),
    // Netlify: `included_files` zip preserves dist/server/fonts under the task dir
    path.resolve(bundleDir, "dist/server/fonts"),
    path.resolve(process.cwd(), "dist/server/fonts"),
    // repo root dev / `pnpm start` from the repo root
    path.resolve(process.cwd(), "server/fonts"),
    path.resolve(process.cwd(), "fonts"),
  ];
  for (const fontDir of candidateDirs) {
    const found: string[] = [];
    let foundAll = true;
    for (const file of REQUIRED_FONTS) {
      const fontPath = path.join(fontDir, file);
      try {
        await fs.access(fontPath);
        found.push(fontPath);
      } catch {
        foundAll = false;
        break;
      }
    }
    if (foundAll && found.length === REQUIRED_FONTS.length) {
      fontFilePath = found;
      return found;
    }
  }
  fontFilePath = [];
  return [];
}

export async function renderQuoteCardPng(input: QuoteCardRenderInput): Promise<Buffer> {
  const svg = await renderQuoteCardSvg(input);
  const fontFiles = await resolveFontFiles();
  const { Resvg } = await resolveResvg();
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: 1200 },
    font:
      fontFiles.length > 0
        ? // Deterministic branded fonts, no per-request system font scan.
          { fontFiles }
        : // Last resort on hosts without the bundled fonts.
          { loadSystemFonts: true },
  });
  return resvg.render().asPng();
}

export { palettes, artisanalGradients };