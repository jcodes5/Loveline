import { Router, type Request } from "express";
import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";

import { createClient } from "@supabase/supabase-js";
import { renderQuoteCardSvg, renderQuoteCardPng, type QuoteCardPalette, type QuoteCardTemplate, type QuoteCardBgType, type ArtisanalGradientKey, type QuoteCardAlignment } from "../quote-cards";
import { allowRequest } from "../rate-limit";

const paletteSchema = z.enum(["rose", "dusk", "honey"]);
const templateSchema = z.enum(["minimal", "romantic", "editorial", "polaroid", "night", "sunrise", "memory", "letterpress"]);
const bgTypeSchema = z.enum(["template", "gradient", "image"]);
const gradientSchema = z.enum(["rose_dawn", "lavender_dusk", "golden_hour", "twilight_velvet"]);
const alignmentSchema = z.enum(["left", "center", "right"]);
const backgroundDataUrlSchema = z.string().regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/, "Choose a valid image.").max(4_000_000);
const quoteCardSchema = z.object({
  relationshipId: z.string().uuid("A relationship is required."),
  quoteText: z.string().trim().min(1, "Write a quote for the card.").max(600, "Keep the quote under 600 characters."),
  quoteAuthor: z.string().trim().min(1, "Add the quote author.").max(160, "Keep the author under 160 characters."),
  quoteSource: z.string().trim().max(160, "Keep the source under 160 characters.").nullable(),
  palette: paletteSchema,
  template: templateSchema.default("minimal"),
  bgType: bgTypeSchema.default("template"),
  gradient: gradientSchema.nullable().optional(),
  backgroundDataUrl: backgroundDataUrlSchema.nullable().optional(),
  alignment: alignmentSchema.default("center"),
  showDate: z.boolean().default(false),
});

const renderSchema = quoteCardSchema.extend({
  dateLabel: z.string().trim().max(80).optional(),
});

const quoteCardSelect = "id, relationship_id, created_by, quote_text, quote_author, quote_source, palette, template, bg_type, gradient, background_data_url, alignment, show_date, rendered_public_id, rendered_format, created_at";

type QuoteCardRow = {
  id: string;
  relationship_id: string;
  created_by: string;
  quote_text: string;
  quote_author: string;
  quote_source: string | null;
  palette: QuoteCardPalette;
  template: QuoteCardTemplate;
  bg_type: QuoteCardBgType;
  gradient: ArtisanalGradientKey | null;
  background_data_url: string | null;
  alignment: QuoteCardAlignment;
  show_date: boolean;
  rendered_public_id: string | null;
  rendered_format: string | null;
  created_at: string;
};

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Quote card image storage is not configured.");
  }
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
  return cloudinary;
}

function signedCardImageUrl(publicId: string, format: string) {
  return configureCloudinary().url(publicId, {
    resource_type: "image",
    type: "authenticated",
    secure: true,
    sign_url: true,
    format,
  });
}

async function destroyCardAsset(publicId: string) {
  await configureCloudinary().uploader.destroy(publicId, {
    resource_type: "image",
    type: "authenticated",
    invalidate: true,
  });
}

function getSupabaseForRequest(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = request.headers.authorization;

  if (!supabaseUrl || !supabaseAnonKey || !authorization?.startsWith("Bearer ")) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function authenticate(request: Request) {
  const supabase = getSupabaseForRequest(request);
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, userId: data.user.id };
}

async function mapQuoteCard(value: QuoteCardRow) {
  let svg: string;
  try {
    svg = await renderQuoteCardSvg({
      quoteText: value.quote_text,
      quoteAuthor: value.quote_author,
      quoteSource: value.quote_source,
      palette: value.palette,
      template: value.template,
      bgType: value.bg_type,
      gradient: value.gradient,
      backgroundDataUrl: value.background_data_url,
      alignment: value.alignment,
      showDate: value.show_date,
      dateLabel: formatDate(value.show_date),
    });
  } catch {
    svg = fallbackCardSvg(value.palette, value.quote_text, value.quote_author);
  }
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    createdBy: value.created_by,
    quoteText: value.quote_text,
    quoteAuthor: value.quote_author,
    quoteSource: value.quote_source,
    palette: value.palette,
    template: value.template,
    bgType: value.bg_type,
    gradient: value.gradient,
    backgroundDataUrl: value.background_data_url,
    alignment: value.alignment,
    showDate: value.show_date,
    createdAt: value.created_at,
    imageUrl: value.rendered_public_id && value.rendered_format
      ? signedCardImageUrl(value.rendered_public_id, value.rendered_format)
      : null,
    svg,
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fallbackCardSvg(palette: QuoteCardPalette, quoteText: string, quoteAuthor: string): string {
  const background = palette === "rose" ? "#fff1f3" : palette === "honey" ? "#f4e8cf" : "#30242a";
  const foreground = palette === "dusk" ? "#fff8f6" : "#4b2632";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><rect width="1200" height="1200" fill="${background}"/><text x="100" y="560" font-family="Georgia, serif" font-size="58" font-weight="700" fill="${foreground}">${escapeXml(quoteText.slice(0, 120))}</text><text x="100" y="640" font-family="Georgia, serif" font-size="28" fill="${foreground}">${escapeXml(quoteAuthor)}</text></svg>`;
}

function formatDate(showDate: boolean) {
  if (!showDate) return undefined;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

export function createQuoteCardRouter() {
  const router = Router();

  router.get("/", async (request, response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to open your quote cards." });
        return;
      }
      const { supabase } = auth;

      const relationshipId = String(request.query.relationshipId ?? "");
      if (!relationshipId) {
        response.status(400).json({ error: "A relationship is required." });
        return;
      }

      if (!(await allowRequest(supabase, response, "quote_render"))) return;

      const { data, error } = await supabase
        .from("quote_cards")
        .select(quoteCardSelect)
        .eq("relationship_id", relationshipId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (error) {
        response.status(500).json({ error: "We couldn't load quote cards right now." });
        return;
      }

      const cards = await Promise.all((data ?? []).map(mapQuoteCard));
      response.json({ cards });
    } catch {
      response.status(500).json({ error: "We couldn't load quote cards right now." });
    }
  });

  router.post("/", async (request, response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to create a quote card." });
        return;
      }
      const { supabase, userId } = auth;

      const parsed = quoteCardSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Check the quote card details." });
        return;
      }

      if (!(await allowRequest(supabase, response, "quote_render"))) return;

      const { data: membership, error: membershipError } = await supabase
        .from("relationship_members")
        .select("relationship_id")
        .eq("relationship_id", parsed.data.relationshipId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError || !membership) {
        response.status(403).json({ error: "Both partners join your Loveline before saving quote cards." });
        return;
      }

      const png = await renderQuoteCardPng({
        quoteText: parsed.data.quoteText,
        quoteAuthor: parsed.data.quoteAuthor,
        quoteSource: parsed.data.quoteSource,
        palette: parsed.data.palette,
        template: parsed.data.template,
        bgType: parsed.data.bgType,
        gradient: parsed.data.gradient,
        backgroundDataUrl: parsed.data.backgroundDataUrl,
        alignment: parsed.data.alignment,
        showDate: parsed.data.showDate,
        dateLabel: formatDate(parsed.data.showDate),
      });
      const cloud = configureCloudinary();
      const asset = await cloud.uploader.upload(
        `data:image/png;base64,${png.toString("base64")}`,
        {
          resource_type: "image",
          type: "authenticated",
          folder: "loveline/quote-cards",
          public_id: `${parsed.data.relationshipId}/${randomUUID()}`,
          overwrite: false,
        },
      );

      const { data, error } = await supabase
        .from("quote_cards")
        .insert({
          relationship_id: parsed.data.relationshipId,
          created_by: userId,
          quote_text: parsed.data.quoteText,
          quote_author: parsed.data.quoteAuthor,
          quote_source: parsed.data.quoteSource || null,
          palette: parsed.data.palette,
          template: parsed.data.template,
          bg_type: parsed.data.bgType,
          gradient: parsed.data.gradient ?? null,
          background_data_url: parsed.data.backgroundDataUrl ?? null,
          alignment: parsed.data.alignment,
          show_date: parsed.data.showDate,
          rendered_public_id: asset.public_id,
          rendered_format: asset.format,
        })
        .select(quoteCardSelect)
        .single();

      if (error || !data) {
        await destroyCardAsset(asset.public_id).catch((cleanupError) => {
          console.error("Quote card asset cleanup failed:", cleanupError);
        });
        response.status(500).json({ error: "We couldn't save that quote card right now." });
        return;
      }

      response.status(201).json({ card: await mapQuoteCard(data) });
    } catch {
      response.status(500).json({ error: "We couldn't save that quote card right now." });
    }
  });

  router.post("/render", async (request, response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to export a quote card." });
        return;
      }
      const { supabase, userId } = auth;

      const parsed = renderSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Check the quote card details." });
        return;
      }

      if (!(await allowRequest(supabase, response, "quote_render"))) return;

      const { data: membership, error: membershipError } = await supabase
        .from("relationship_members")
        .select("relationship_id")
        .eq("relationship_id", parsed.data.relationshipId)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError || !membership) {
        response.status(403).json({ error: "Both partners join your Loveline before exporting quote cards." });
        return;
      }

      const png = await renderQuoteCardPng({
        quoteText: parsed.data.quoteText,
        quoteAuthor: parsed.data.quoteAuthor,
        quoteSource: parsed.data.quoteSource,
        palette: parsed.data.palette,
        template: parsed.data.template,
        bgType: parsed.data.bgType,
        gradient: parsed.data.gradient,
        backgroundDataUrl: parsed.data.backgroundDataUrl,
        alignment: parsed.data.alignment,
        showDate: parsed.data.showDate,
        dateLabel: parsed.data.dateLabel ?? formatDate(parsed.data.showDate),
      });

      response.setHeader("content-type", "image/png");
      response.setHeader("cache-control", "no-store");
      response.send(png);
    } catch {
      response.status(500).json({ error: "We couldn't export that quote card right now." });
    }
  });

  router.delete("/:id", async (request, response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to remove a quote card." });
        return;
      }
      const { supabase } = auth;

      const { data: card, error: lookupError } = await supabase
        .from("quote_cards")
        .select("rendered_public_id")
        .eq("id", request.params.id)
        .maybeSingle();
      if (lookupError) {
        response.status(500).json({ error: "We couldn't remove that quote card right now." });
        return;
      }

      const { error } = await supabase.from("quote_cards").delete().eq("id", request.params.id);
      if (error) {
        response.status(500).json({ error: "We couldn't remove that quote card right now." });
        return;
      }

      if (card?.rendered_public_id) {
        await destroyCardAsset(card.rendered_public_id).catch((cleanupError) => {
          console.error("Removed quote card image cleanup failed:", cleanupError);
        });
      }

      response.status(204).send();
    } catch {
      response.status(500).json({ error: "We couldn't remove that quote card right now." });
    }
  });

  return router;
}
