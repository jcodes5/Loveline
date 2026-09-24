import type { Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitCategory = "ai_draft" | "quote_render" | "memory_upload";

export async function allowRequest(
  supabase: SupabaseClient,
  response: Response,
  category: RateLimitCategory,
) {
  const { data, error } = await supabase.rpc("consume_api_rate_limit", {
    p_category: category,
  });

  if (error || !Array.isArray(data) || !data[0]) {
    response.status(503).json({ error: "Request protection is temporarily unavailable." });
    return false;
  }

  const result = data[0] as { allowed?: boolean; retry_after_seconds?: number };
  if (result.allowed) return true;

  const retryAfter = Math.max(1, Number(result.retry_after_seconds) || 1);
  response.setHeader("Retry-After", String(retryAfter));
  response.status(429).json({ error: "Too many requests. Try again shortly." });
  return false;
}
