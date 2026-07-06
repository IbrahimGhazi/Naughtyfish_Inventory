import { describe, it, expect, beforeAll } from "vitest";
import { signSession, verifySession, type SessionPayload } from "./auth";

// auth.ts reads JWT_SECRET at call time — ensure it's set for the test run.
beforeAll(() => {
  process.env.JWT_SECRET ??= "test-secret";
});

const payload: Omit<SessionPayload, "exp"> = { userId: "user_abc123", entityName: "SeaStar" };

describe("session token sign/verify", () => {
  it("round-trips a valid payload (exp auto-added)", () => {
    const token = signSession(payload);
    expect(token).toContain(".");
    const verified = verifySession(token);
    expect(verified).toMatchObject(payload);
    expect(verified?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects an expired token", () => {
    const expired = signSession({ ...payload, exp: Math.floor(Date.now() / 1000) - 10 });
    expect(verifySession(expired)).toBeNull();
  });

  it("rejects a legacy token without exp", () => {
    // Tokens minted before the expiry change lack `exp` — they must re-login.
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const legit = signSession(payload).split(".");
    void legit;
    // Sign the exp-less body with the real secret via a fresh token's machinery:
    // easiest is to verify shape-rejection directly (exp is required in the shape).
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const sig = createHmac("sha256", process.env.JWT_SECRET!).update(body).digest("base64url");
    expect(verifySession(`${body}.${sig}`)).toBeNull();
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
