import { describe, expect, it } from "vitest";
import { buildInviteLink, generateInviteToken } from "./invite";

describe("invite tokens", () => {
  it("generates a URL-safe token of expected length", () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it("generates unique tokens", () => {
    const seen = new Set(Array.from({ length: 25 }, () => generateInviteToken()));
    expect(seen.size).toBe(25);
  });

  it("builds an invite link containing the token", () => {
    const token = generateInviteToken();
    expect(buildInviteLink(token, "https://loveline.example")).toBe(
      `https://loveline.example/invite/${token}`,
    );
  });
});