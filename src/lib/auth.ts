/**
 * Stateless signed session tokens — no new deps, just Node's `crypto`.
 *
 * Token format:  base64url(JSON payload) "." base64url(HMAC-SHA256 of that payload)
 * The HMAC key is process.env.JWT_SECRET. Verification is constant-time so a
 * tampered signature can't be probed byte-by-byte. There is no server-side
 * session store — the cookie *is* the session (httpOnly so JS can't read it).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  userId: string;
  /** The active book the user is currently looking at ("C-Star" | "NF"). */
  entityName: string;
}

const SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set.");
  return s;
};

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(data: string): string {
  return createHmac("sha256", SECRET()).update(data).digest("base64url");
}

/** Sign a payload into a `payload.signature` token. */
export function signSession(payload: SessionPayload): string {
  const body = base64urlEncode(JSON.stringify(payload));
  const sig = hmac(body);
  return `${body}.${sig}`;
}

/** Verify a token; returns the payload or null on any tampering/format error. */
export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const body = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = hmac(body);

  // Constant-time compare (guard length first — timingSafeEqual throws on mismatch).
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      parsed &&
      typeof parsed.userId === "string" &&
      typeof parsed.entityName === "string"
    ) {
      return { userId: parsed.userId, entityName: parsed.entityName };
    }
    return null;
  } catch {
    return null;
  }
}

/** Cookie name + options shared by login/logout/switch actions. */
export const SESSION_COOKIE = "nf_session";
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
};
