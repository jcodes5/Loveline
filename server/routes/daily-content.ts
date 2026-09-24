import { Router, type Request } from "express";
import { z } from "zod";

import { createClient } from "@supabase/supabase-js";
import { allowRequest } from "../rate-limit";

const draftRequestSchema = z.object({
  relationshipId: z.string().uuid("A relationship is required."),
  contentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid content date."),
  prompt: z.string().trim().max(500, "Keep the prompt under 500 characters.").default("Write something warm, grounding, and personal for an ordinary day together."),
});

const draftSchema = z.object({
  heroLabel: z.string().trim().min(1).max(80),
  heroTitle: z.string().trim().min(1).max(240),
  heroBody: z.string().trim().min(1).max(1000),
  noteBody: z.string().trim().min(1).max(2000),
  affirmation: z.string().trim().min(1).max(300),
  affirmationDetail: z.string().trim().min(1).max(600),
  quoteText: z.string().trim().min(1).max(600),
  quoteAuthor: z.string().trim().min(1).max(160),
  quoteSource: z.string().trim().max(160).nullable(),
});

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

function extractJson(text: string) {
  const withoutFence = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  return withoutFence.slice(start, end + 1);
}

export function parseGeminiDraft(value: unknown) {
  const text = (value as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  try {
    const json = extractJson(text);
    return json ? draftSchema.parse(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

function buildPrompt(contentDate: string, prompt: string) {
  return [
    "You are writing a private daily relationship companion entry for Loveline.",
    "Return only valid JSON. Do not use markdown or code fences.",
    "The writing should feel specific, tender, grounded, and never overly dramatic.",
    "Do not mention AI, prompts, or these instructions.",
    "The quote must be an original short reflection and attributed to Loveline.",
    `Date: ${contentDate}`,
    `Owner direction: ${prompt}`,
    "Use exactly these JSON keys: heroLabel, heroTitle, heroBody, noteBody, affirmation, affirmationDetail, quoteText, quoteAuthor, quoteSource.",
    "Set quoteSource to null.",
  ].join("\n");
}

async function generateDraft(contentDate: string, prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini drafting is not configured yet.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(contentDate, prompt) }] }],
          generationConfig: {
            temperature: 0.85,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) throw new Error("Gemini drafting request failed.");
    const draft = parseGeminiDraft(await response.json());
    if (!draft) throw new Error("Gemini returned an invalid daily-content draft.");
    return draft;
  } finally {
    clearTimeout(timeout);
  }
}

export function createDailyContentRouter() {
  const router = Router();

  router.post("/draft", async (request, response) => {
    try {
      const auth = await authenticate(request);
      if (!auth) {
        response.status(401).json({ error: "Sign in to draft daily content." });
        return;
      }

      const parsed = draftRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        response.status(400).json({ error: parsed.error.issues[0]?.message ?? "Check the drafting details." });
        return;
      }

      const { data: relationship, error: relationshipError } = await auth.supabase
        .from("relationships")
        .select("id")
        .eq("id", parsed.data.relationshipId)
        .eq("owner_id", auth.userId)
        .maybeSingle();

      if (relationshipError || !relationship) {
        response.status(403).json({ error: "Only the Loveline owner can draft daily content." });
        return;
      }

      if (!(await allowRequest(auth.supabase, response, "ai_draft"))) return;

      const draft = await generateDraft(parsed.data.contentDate, parsed.data.prompt);
      response.json({ draft });
    } catch (error) {
      if (error instanceof Error && error.message === "Gemini drafting is not configured yet.") {
        response.status(503).json({ error: error.message });
        return;
      }
      response.status(502).json({ error: "We couldn't create a daily-content draft right now." });
    }
  });

  return router;
}
