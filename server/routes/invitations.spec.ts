import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

import { handleRequestInviteSignIn } from "./invitations";

const { lookupInvitation, inviteUserByEmail } = vi.hoisted(() => ({
  lookupInvitation: vi.fn(),
  inviteUserByEmail: vi.fn(),
}));

vi.mock("../supabase-admin", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => lookupInvitation(),
        }),
      }),
    }),
    auth: {
      admin: { inviteUserByEmail },
    },
  }),
}));

const token = "abcdefghijklmnopqrstuvwxyz0123456789";

const validInvite = {
  invitee_email: "partner@example.com",
  status: "pending",
  expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  used_at: null,
};

function makeRequest(inviteToken: string): Request {
  const headers: Record<string, string> = {
    origin: "https://loveline.example",
    host: "loveline.example",
  };
  return {
    params: { token: inviteToken },
    get: (name: string) => headers[name],
  } as unknown as Request;
}

function makeResponse() {
  const response = {
    _status: 200,
    _body: undefined as unknown,
    status(code: number) {
      response._status = code;
      return response;
    },
    json(body: unknown) {
      response._body = body;
      return response;
    },
  };
  return response;
}

describe("handleRequestInviteSignIn", () => {
  beforeEach(() => {
    lookupInvitation.mockReset();
    inviteUserByEmail.mockReset();
    inviteUserByEmail.mockResolvedValue({ error: null });
  });

  it("sends a magic-link invite to the invitation email", async () => {
    lookupInvitation.mockResolvedValue({ data: { ...validInvite }, error: null });

    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest(token), response as unknown as Response);

    expect(response._status).toBe(200);
    expect(response._body).toEqual({ ok: true });
    expect(inviteUserByEmail).toHaveBeenCalledWith("partner@example.com", {
      data: { source: "relationship_invite" },
      redirectTo: `https://loveline.example/invite/${token}`,
    });
  });

  it("rejects a malformed token without looking it up", async () => {
    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest("short"), response as unknown as Response);

    expect(response._status).toBe(400);
    expect(lookupInvitation).not.toHaveBeenCalled();
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("returns not found for an unknown token", async () => {
    lookupInvitation.mockResolvedValue({ data: null, error: null });

    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest(token), response as unknown as Response);

    expect(response._status).toBe(404);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("rejects revoked invitations", async () => {
    lookupInvitation.mockResolvedValue({
      data: { ...validInvite, status: "revoked" },
      error: null,
    });

    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest(token), response as unknown as Response);

    expect(response._status).toBe(403);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("rejects invitations that have already been used", async () => {
    lookupInvitation.mockResolvedValue({
      data: { ...validInvite, used_at: new Date().toISOString() },
      error: null,
    });

    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest(token), response as unknown as Response);

    expect(response._status).toBe(410);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("rejects invitations that have been accepted", async () => {
    lookupInvitation.mockResolvedValue({
      data: { ...validInvite, status: "accepted" },
      error: null,
    });

    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest(token), response as unknown as Response);

    expect(response._status).toBe(410);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("rejects expired invitations", async () => {
    lookupInvitation.mockResolvedValue({
      data: {
        ...validInvite,
        expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
      },
      error: null,
    });

    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest(token), response as unknown as Response);

    expect(response._status).toBe(410);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("surfaces email-sending failures to the recipient", async () => {
    lookupInvitation.mockResolvedValue({ data: { ...validInvite }, error: null });
    inviteUserByEmail.mockResolvedValue({ error: new Error("smtp unavailable") });

    const response = makeResponse();
    await handleRequestInviteSignIn(makeRequest(token), response as unknown as Response);

    expect(response._status).toBe(502);
    expect(inviteUserByEmail).toHaveBeenCalledTimes(1);
  });
});