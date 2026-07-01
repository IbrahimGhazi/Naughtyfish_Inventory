import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, type SessionPayload } from "./auth";

// auth.ts reads JWT_SECRET at call time — ensure it's set for the test run.
beforeAll(() => {
  process.env.JWT_SECRET ??= "test-secret";
});

const payload: SessionPayload = { userId: "user_abc123", entityName: "C-Star" };

describe("session token sign/verify", () => {
  it("round-trips a valid payload", () => {
    const token = signSession(payload);
    expect(token).toContain(".");
    expect(verifySession(token)).toEqual(payload);
  });

  it("rejects a token with a tampered payload (signature mismatch)", () => {
    const token = signSession(payload);
    const [, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ userId: "attacker", entityName: "NF" }),
    ).toString("base64url");
    expect(verifySession(`${forged}.${sig}`)).toBeNull();
  });

  it("rejects a token with a tampered signature", () => {
    const token = signSession(payload);
    const [body] = token.split(".");
    expect(verifySession(`${body}.deadbeef`)).toBeNull();
  });

  it("rejects malformed / empty tokens", () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession(null)).toBeNull();
    expect(verifySession("")).toBeNull();
    expect(verifySession("no-dot-here")).toBeNull();
    expect(verifySession(".onlysig")).toBeNull();
    expect(verifySession("onlybody.")).toBeNull();
  });

  it("rejects a token signed with a different secret", () => {
    const token = signSession(payload);
    const original = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "a-completely-different-secret";
    try {
      expect(verifySession(token)).toBeNull();
    } finally {
      process.env.JWT_SECRET = original;
    }
  });
});
