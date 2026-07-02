import { NextResponse } from "next/server";
import { getOptionalContext } from "@/lib/session";
import { askLedger, type ChatMessage } from "@/lib/assistant/llm";

export const dynamic = "force-dynamic";

/**
 * "Ask the ledger" chat endpoint. Auth-gated and book-scoped: the assistant
 * only ever sees the logged-in user's active book (ctx from the session cookie),
 * and every tool is read-only. Returns the reply + which tools were consulted.
 */
export async function POST(req: Request) {
  const ctx = await getOptionalContext();
  if (!ctx) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // The assistant's read-only tools expose book-wide figures — office roles only.
  if (ctx.user.role === "delivery" || ctx.user.role === "store_keeper") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const message = (body.message ?? "").toString().slice(0, 1000).trim();
  if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });

  // Only carry forward user/assistant turns from the client history (never trust
  // client-supplied tool/system messages).
  const history: ChatMessage[] = Array.isArray(body.history)
    ? body.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
        .slice(-8)
    : [];

  const result = await askLedger(ctx, history, message);

  if (result.error === "not_configured") {
    return NextResponse.json(
      { error: "not_configured", reply: "The assistant isn't set up yet (no API key)." },
      { status: 503 },
    );
  }
  if (result.error === "rate_limited") {
    return NextResponse.json(
      { error: "rate_limited", reply: "The assistant is busy right now — try again in a few seconds." },
      { status: 200 },
    );
  }
  if (result.error === "provider_error") {
    return NextResponse.json(
      { error: "provider_error", reply: "Couldn't reach the assistant just now. Please try again." },
      { status: 200 },
    );
  }

  return NextResponse.json({ reply: result.reply, toolsUsed: result.toolsUsed });
}
