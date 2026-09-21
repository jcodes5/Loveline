import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateAIDraft, type AIDraftInput, type AIDraftType } from "../ai/gemini";

const draftTypeSchema = z.enum([
  "daily_affirmation",
  "morning_message",
  "night_message",
  "quote_card",
  "mood_suggestion",
  "batch_daily",
]);

const aiDraftSchema = z.object({
  type: draftTypeSchema,
  context: z.record(z.string(), z.unknown()),
  count: z.number().int().min(1).max(5).optional(),
});

type AuthenticatedRequest = Request & {
  authUserId?: string;
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

async function requireOwner(supabase: SupabaseClient, userId: string, relationshipId: string) {
  const { data, error } = await supabase
    .from("relationships")
    .select("id")
    .eq("id", relationshipId)
    .eq("owner_id", userId)
    .maybeSingle();
  return !error && !!data;
}

export function createAIDraftRouter() {
  const router = Router();

  router.post("/draft", async (request: AuthenticatedRequest, response: Response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to use AI drafting." });
        return;
      }
      const { supabase, userId } = auth;

      const parsed = aiDraftSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid request." });
        return;
      }

      const { type, context, count } = parsed.data;

      let effectiveContext = context;
      if (type !== "batch_daily" && type !== "quote_card" && type !== "mood_suggestion") {
        const relationshipId = String(context.relationshipId ?? "");
        if (!relationshipId) {
          response.status(400).json({ error: "relationshipId is required in context." });
          return;
        }
        const isOwner = await requireOwner(supabase, userId, relationshipId);
        if (!isOwner) {
          response.status(403).json({ error: "Only the relationship owner can generate AI content." });
          return;
        }
        effectiveContext = { ...context, relationshipName: context.relationshipName ?? "our Loveline" };
      }

      if (type === "mood_suggestion") {
        // Fetch mood mapping if relationshipId is provided
        if (context.relationshipId) {
          const { data: mapping } = await supabase
            .from("mood_mappings")
            .select("custom_message, ai_prompt, message_id, letter_id")
            .eq("relationship_id", context.relationshipId)
            .eq("mood", context.mood)
            .eq("enabled", true)
            .maybeSingle();
          
          if (mapping) {
            effectiveContext = {
              ...context,
              relationshipName: context.relationshipName ?? "your Loveline",
              customMessage: mapping.custom_message,
              aiPrompt: mapping.ai_prompt,
              hasMapping: true,
            };
          }
        }
        effectiveContext = { ...context, relationshipName: context.relationshipName ?? "your Loveline" };
      }

      if (type === "quote_card") {
        effectiveContext = { ...context, palette: context.palette ?? "rose" };
      }

      if (type === "batch_daily") {
        const relationshipId = String(context.relationshipId ?? "");
        if (!relationshipId) {
          response.status(400).json({ error: "relationshipId is required in context for batch generation." });
          return;
        }
        const isOwner = await requireOwner(supabase, userId, relationshipId);
        if (!isOwner) {
          response.status(403).json({ error: "Only the relationship owner can generate batch content." });
          return;
        }
        const days = Math.min(Math.max(Number(context.days ?? 7), 1), 14);
        effectiveContext = { ...context, days, relationshipName: context.relationshipName ?? "our Loveline" };
      }

      const result = await generateAIDraft({ type, context: effectiveContext, count });

      response.json({ draft: result.draft });
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI generation failed.";
      console.error("AI draft error:", error);
      response.status(500).json({ error: message });
    }
  });

  router.get("/health", async (_request, response) => {
    try {
      const healthy = await import("../ai/gemini").then((m) => m.checkGeminiHealth());
      response.json({ healthy });
    } catch {
      response.status(503).json({ healthy: false, error: "AI service unavailable." });
    }
  });

  return router;
}