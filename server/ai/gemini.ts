import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

let genAI: GoogleGenerativeAI | null = null;
let model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function ensureInitialized() {
  if (model) return;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];

  model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    safetySettings,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });
}

export type AIDraftType = "daily_affirmation" | "morning_message" | "night_message" | "quote_card" | "mood_suggestion" | "batch_daily" | "poetry";

export interface AIDraftInput {
  type: AIDraftType;
  context: Record<string, unknown>;
  count?: number;
}

export interface AIDraftOutput {
  draft: string | Record<string, unknown> | Record<string, unknown>[];
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

const prompts: Record<AIDraftType, (context: Record<string, unknown>) => string> = {
  daily_affirmation: (ctx) => {
    const { heroTitle, heroBody, noteBody, tone = "gentle and encouraging" } = ctx as {
      heroTitle?: string;
      heroBody?: string;
      noteBody?: string;
      tone?: string;
    };
    return `Write a short, personal affirmation and a supporting detail for someone's daily note in Loveline.

Context for today's note:
- Title: "${heroTitle || "A gentle day"}"
- Welcome: "${heroBody || "A quiet morning"}"
- Private note: "${noteBody || "Something soft to discover"}"

Requirements:
- Affirmation: 1 sentence, max 300 chars, ${tone}
- Detail: 1-2 sentences, max 600 chars, expands on the affirmation
- Personal, not generic. Avoid clichés.
- Return JSON only: { "affirmation": "...", "affirmationDetail": "..." }`;
  },

  morning_message: (ctx) => {
    const { relationshipName, recipientName, tone = "warm and personal" } = ctx as {
      relationshipName?: string;
      recipientName?: string;
      tone?: string;
    };
    return `Write a good morning message from one partner to another in a private relationship app called Loveline.

Context:
- Relationship: "${relationshipName || "our"}"
- Recipient: "${recipientName || "love"}"
- Tone: ${tone}

Requirements:
- 1-3 short paragraphs, max 4000 chars total
- Personal and specific, not a generic greeting
- Can reference small shared moments or inside feelings
- Return JSON only: { "title": "...", "body": "..." }`;
  },

  night_message: (ctx) => {
    const { relationshipName, recipientName, tone = "soft and reflective" } = ctx as {
      relationshipName?: string;
      recipientName?: string;
      tone?: string;
    };
    return `Write a good night message from one partner to another in Loveline.

Context:
- Relationship: "${relationshipName || "our"}"
- Recipient: "${recipientName || "love"}"
- Tone: ${tone}

Requirements:
- 1-3 short paragraphs, max 4000 chars total
- Gentle, reflective, winding down the day
- Personal and intimate
- Return JSON only: { "title": "...", "body": "..." }`;
  },

  quote_card: (ctx) => {
    const { theme, palette = "rose" } = ctx as { theme?: string; palette?: string };
    return `Create a quote card for Loveline - a private relationship app.

Theme: "${theme || "love, connection, small moments"}"
Palette: ${palette} (rose=soft/warm, dusk=quiet/intimate, honey=golden/nostalgic)

Requirements:
- Quote: 1 sentence, max 600 chars, meaningful but not cliché
- Author: real person or "Anonymous" / "Unknown"
- Source: optional book/movie/song (max 160 chars)
- Fits the palette mood
- Return JSON only: { "quoteText": "...", "quoteAuthor": "...", "quoteSource": "..." }`;
  },

  mood_suggestion: (ctx) => {
    const { mood, recentMoods, relationshipName } = ctx as {
      mood: "joyful" | "soft" | "steady" | "tender" | "heavy";
      recentMoods?: string[];
      relationshipName?: string;
    };
    const moodDescriptions: Record<string, string> = {
      joyful: "radiant, light, grateful",
      soft: "gentle, calm, present",
      steady: "grounded, consistent, reliable",
      tender: "vulnerable, open, caring",
      heavy: "weighed down, needing comfort",
    };
    return `Suggest a short supportive message for someone who selected "${mood}" (${moodDescriptions[mood]}) in their daily mood check-in.

Context:
- Relationship: "${relationshipName || "their Loveline"}"
- Recent moods: ${recentMoods?.join(", ") || "none recorded"}

Requirements:
- 1-2 sentences, max 300 chars
- Validating, not fixing or advising
- Gentle companion energy
- Return JSON only: { "message": "..." }`;
  },

  poetry: (ctx) => {
    const { theme, tone = "tender and specific", style = "free verse" } = ctx as {
      theme?: string;
      tone?: string;
      style?: string;
    };
    return `Write a short original poem for a private relationship app called Loveline.

Theme: "${theme || "love, presence, small shared moments"}"
Tone: ${tone}
Style: ${style} (2-4 short stanzas, line breaks preserved)

Requirements:
- Original, intimate, specific — avoid clichés and greeting-card language
- Max 500 chars total
- Return JSON only: { "poem": "...", "title": "..." }`;
  },

  batch_daily: (ctx) => {
    const { days, relationshipName, themes } = ctx as {
      days: number;
      relationshipName?: string;
      themes?: string[];
    };
    return `Generate ${days} days of daily content drafts for Loveline.

Context:
- Relationship: "${relationshipName || "a private relationship"}"
- Themes to weave in: ${themes?.join(", ") || "connection, gratitude, small moments"}
- Each day needs: heroLabel, heroTitle, heroBody, noteBody, affirmation, affirmationDetail, quoteText, quoteAuthor, quoteSource

Requirements:
- Varied but cohesive across days
- Personal, not generic
- Return JSON only: { "drafts": [ { "contentDate": "YYYY-MM-DD", "heroLabel": "...", "heroTitle": "...", "heroBody": "...", "noteBody": "...", "affirmation": "...", "affirmationDetail": "...", "quoteText": "...", "quoteAuthor": "...", "quoteSource": "..." }, ... ] }`;
  },
};

async function generateWithRetry(prompt: string, retries = 2): Promise<string> {
  ensureInitialized();
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      if (!text) throw new Error("Empty response from Gemini");
      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error("Gemini generation failed after retries");
}

function extractJSON(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in response");
  try {
    return JSON.parse(match[0]);
  } catch {
    throw new Error("Failed to parse JSON from Gemini response");
  }
}

export async function generateAIDraft(input: AIDraftInput): Promise<AIDraftOutput> {
  const promptFn = prompts[input.type];
  if (!promptFn) throw new Error(`Unknown draft type: ${input.type}`);

  const prompt = promptFn(input.context);
  let text: string;

  if (input.type === "batch_daily") {
    text = await generateWithRetry(prompt, 1);
    const parsed = extractJSON(text);
    return { draft: parsed };
  }

  if (input.count && input.count > 1) {
    const results: Record<string, unknown>[] = [];
    for (let i = 0; i < input.count; i++) {
      text = await generateWithRetry(prompt);
      results.push(extractJSON(text) as Record<string, unknown>);
    }
    return { draft: results };
  }

  text = await generateWithRetry(prompt);
  const parsed = extractJSON(text);
  return { draft: parsed };
}

export async function checkGeminiHealth(): Promise<boolean> {
  try {
    ensureInitialized();
    await model!.generateContent("Say OK");
    return true;
  } catch {
    return false;
  }
}