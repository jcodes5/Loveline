import { Router, type Request } from "express";
import { z } from "zod";

import { createClient } from "@supabase/supabase-js";
import { renderQuoteCardSvg, type QuoteCardPalette, type QuoteCardTemplate } from "../quote-cards";

const paletteSchema = z.enum(["rose", "dusk", "honey"]);
const templateSchema = z.enum(["minimal", "romantic", "editorial", "polaroid", "night", "sunrise", "memory"]);
const quoteCardSchema = z.object({
  relationshipId: z.string().uuid("A relationship is required."),
  quoteText: z.string().trim().min(1, "Write a quote for the card.").max(600, "Keep the quote under 600 characters."),
  quoteAuthor: z.string().trim().min(1, "Add the quote author.").max(160, "Keep the author under 160 characters."),
  quoteSource: z.string().trim().max(160, "Keep the source under 160 characters.").nullable(),
  palette: paletteSchema,
  template: templateSchema.default("minimal"),
});

const quoteCardSelect = "id, relationship_id, quote_text, quote_author, quote_source, palette, template, created_at";

type QuoteCardRow = {
  id: string;
  relationship_id: string;
  quote_text: string;
  quote_author: string;
  quote_source: string | null;
  palette: QuoteCardPalette;
  template: QuoteCardTemplate;
  created_at: string;
};

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

function mapQuoteCard(value: QuoteCardRow) {
  return {
    id: value.id,
    relationshipId: value.relationship_id,
    quoteText: value.quote_text,
    quoteAuthor: value.quote_author,
    quoteSource: value.quote_source,
    palette: value.palette,
    template: value.template,
    createdAt: value.created_at,
    svg: renderQuoteCardSvg({
      quoteText: value.quote_text,
      quoteAuthor: value.quote_author,
      quoteSource: value.quote_source,
      palette: value.palette,
      template: value.template,
    }),
  };
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

      response.json({ cards: (data ?? []).map(mapQuoteCard) });
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
        })
        .select(quoteCardSelect)
        .single();

      if (error || !data) {
        response.status(500).json({ error: "We couldn't save that quote card right now." });
        return;
      }

      response.status(201).json({ card: mapQuoteCard(data) });
    } catch {
      response.status(500).json({ error: "We couldn't save that quote card right now." });
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

      const { error } = await supabase.from("quote_cards").delete().eq("id", request.params.id);
      if (error) {
        response.status(500).json({ error: "We couldn't remove that quote card right now." });
        return;
      }

      response.status(204).send();
    } catch {
      response.status(500).json({ error: "We couldn't remove that quote card right now." });
    }
  });

  return router;
}
