/**
 * Stateless signed session tokens — no new deps, just Node's `crypto`.
 *
 * Token format:  base64url(JSON payload) "." base64url(HMAC-SHA256 of that payload)
 * The HMAC key is process.env.JWT_SECRET. Verification is constant-time so a
 * tampered signature can't be probed byte-by-byte. There is no server-side
 * session store — the cookie *is* the session (httpOnly so JS can't read it).
 *
 * Tokens carry an `exp` (epoch seconds); expired tokens verify as null, so a
 * stolen cookie has a bounded lifetime. Rotating JWT_SECRET invalidates all
 * sessions at once (the recovery lever if a cookie ever leaks).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

/** Session lifetime: 30 days, refreshed on every login/book-switch. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SessionPayload {
  userId: string;
  /** The active book the user is currently looking at ("C-Star" | "NF"). */
  entityName: string;
  /** Expiry, epoch seconds. */
  exp: number;
}

const SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set.");
  if (process.env.NODE_ENV === "production" && (s === "dev-only-change-me" || s.length < 32)) {
    throw new Error("JWT_SECRET is the dev default or too short — set a strong secret in production.");
  }
  return s;
};

function base64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function hmac(data: string): string {
  return createHmac("sha256", SECRET()).update(data).digest("base64url");
}

/** Sign a payload into a `payload.signature` token. `exp` defaults to now+TTL. */
export function signSession(payload: Omit<SessionPayload, "exp"> & { exp?: number }): string {
  const withExp: SessionPayload = {
    userId: payload.userId,
    entityName: payload.entityName,
    exp: payload.exp ?? Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = base64urlEncode(JSON.stringify(withExp));
  const sig = hmac(body);
  return `${body}.${sig}`;
}

/** Verify a token; returns the payload or null on tampering/format/expiry. */
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
      typeof parsed.entityName === "string" &&
      typeof parsed.exp === "number"
    ) {
      if (parsed.exp <= Math.floor(Date.now() / 1000)) return null; // expired
      return { userId: parsed.userId, entityName: parsed.entityName, exp: parsed.exp };
    }
    return null;
  } catch {
    return null;
  }
}

/** Cookie name + options shared by login/logout/switch actions. */
export const SESSION_COOKIE = "nf_session";

const SESSION_COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

/**
 * Session-cookie options with `secure` decided from the ACTUAL request rather
 * than just NODE_ENV. A `secure` cookie is silently dropped by the browser over
 * plain HTTP, so `secure: NODE_ENV === "production"` breaks a local production
 * build served on http://localhost (login "succeeds" but the cookie never
 * stores → every click bounces back to /login). Real deployments are HTTPS
 * (Vercel sets x-forwarded-proto=https), so they still get a secure cookie.
 *
 * Rule: honor x-forwarded-proto when a proxy sets it; otherwise require secure
 * only for a production server on a non-localhost host.
 */
export async function sessionCookieOptions() {
  return { ...SESSION_COOKIE_BASE, secure: await requestIsHttps() };
}

async function requestIsHttps(): Promise<boolean> {
  try {
    const h = await headers();
    const proto = h.get("x-forwarded-proto");
    if (proto) return proto.split(",")[0]!.trim() === "https";
    const host = (h.get("host") ?? "").toLowerCase();
    const local = /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|$)/.test(host);
    return process.env.NODE_ENV === "production" && !local;
  } catch {
    return process.env.NODE_ENV === "production";
  }
}
