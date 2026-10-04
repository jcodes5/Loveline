import crypto from "node:crypto";
import type { NextFunction, Request, RequestHandler, Response } from "express";

const csrfCookieName = "loveline_csrf";
const csrfHeaderName = "x-csrf-token";
const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type Bucket = {
  count: number;
  resetAt: number;
};

const mutationBuckets = new Map<string, Bucket>();
const inviteBuckets = new Map<string, Bucket>();

function readCookie(request: Request, name: string) {
  const cookies = request.headers.cookie?.split(";") ?? [];
  const entry = cookies.find((cookie) => cookie.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : null;
}

function setCsrfCookie(response: Response, token: string) {
  const attributes = [
    `${csrfCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ];
  response.setHeader("Set-Cookie", attributes.join("; "));
}

export const issueCsrfToken: RequestHandler = (request, response) => {
  const existingToken = readCookie(request, csrfCookieName);
  const token = existingToken ?? crypto.randomBytes(32).toString("hex");
  if (!existingToken) setCsrfCookie(response, token);
  response.json({ csrfToken: token });
};

export const requireCsrf: RequestHandler = (request, response, next) => {
  if (!unsafeMethods.has(request.method) || request.path === "/csrf-token") {
    next();
    return;
  }

  const cookieToken = readCookie(request, csrfCookieName);
  const headerToken = request.get(csrfHeaderName);
  if (!cookieToken || !headerToken || cookieToken.length !== headerToken.length || !crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    response.status(403).json({ error: "CSRF validation failed." });
    return;
  }

  next();
};

function consumeBucket(buckets: Map<string, Bucket>, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }

  current.count += 1;
  return { allowed: true, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}

export const rateLimitMutations = (request: Request, response: Response, next: NextFunction) => {
  if (!unsafeMethods.has(request.method) || request.path === "/csrf-token") {
    next();
    return;
  }

  const isInviteRequest = request.path.startsWith("/invites/");
  const bucket = consumeBucket(
    isInviteRequest ? inviteBuckets : mutationBuckets,
    request.ip ?? "unknown",
    isInviteRequest ? 5 : 60,
    isInviteRequest ? 15 * 60 * 1000 : 60 * 1000,
  );

  if (!bucket.allowed) {
    response.setHeader("Retry-After", String(bucket.retryAfter));
    response.status(429).json({ error: "Too many requests. Try again shortly." });
    return;
  }

  next();
};