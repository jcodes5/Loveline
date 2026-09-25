import { Router, type Request, type Response } from "express";

import { getSupabaseAdmin } from "../supabase-admin";

type InvitationRecord = {
  invitee_email: string;
  status: string;
  expires_at: string | null;
  used_at: string | null;
};

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,200}$/;

function redirectOrigin(request: Request) {
  const origin = request.get("origin");
  if (origin) return origin;
  const host = request.get("host");
  return host ? `https://${host}` : null;
}

export async function handleRequestInviteSignIn(request: Request, response: Response) {
  try {
    const tokenParam = request.params.token;
    const token = (Array.isArray(tokenParam) ? tokenParam[0] : tokenParam)?.trim() ?? "";
    if (!TOKEN_PATTERN.test(token)) {
      response.status(400).json({ error: "That invitation link does not look right." });
      return;
    }

    const admin = getSupabaseAdmin();

    const { data: invitation, error } = await admin
      .from("relationship_invitations")
      .select("invitee_email, status, expires_at, used_at")
      .eq("token", token)
      .maybeSingle<InvitationRecord>();

    if (error || !invitation) {
      response.status(404).json({ error: "That invitation was not found." });
      return;
    }

    if (invitation.status === "revoked") {
      response
        .status(403)
        .json({ error: "That invitation was revoked. Ask your partner for a new one." });
      return;
    }

    if (invitation.used_at || invitation.status === "accepted") {
      response.status(410).json({ error: "That invitation has already been used." });
      return;
    }

    const expiresAt = invitation.expires_at ? new Date(invitation.expires_at).getTime() : null;
    if (expiresAt !== null && !Number.isNaN(expiresAt) && expiresAt < Date.now()) {
      response
        .status(410)
        .json({ error: "That invitation has expired. Ask your partner for a new one." });
      return;
    }

    const origin = redirectOrigin(request);
    if (!origin) {
      response.status(400).json({ error: "We couldn't open your invitation from here." });
      return;
    }

    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      invitation.invitee_email,
      {
        data: { source: "relationship_invite" },
        redirectTo: `${origin}/invite/${token}`,
      },
    );

    if (inviteError) {
      console.error("Invitation sign-in email failed:", inviteError);
      response.status(502).json({ error: "We couldn't send your magic link right now. Please try again." });
      return;
    }

    response.json({ ok: true });
  } catch (error) {
    console.error("Invitation sign-in request failed:", error);
    response.status(500).json({ error: "We couldn't send your magic link right now. Please try again." });
  }
}

export function createInvitationsRouter() {
  const router = Router();
  router.post("/:token/sign-in-link", handleRequestInviteSignIn);
  return router;
}