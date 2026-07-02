"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Msg {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  pending?: boolean;
}

const SUGGESTIONS = [
  "Who owes me the most?",
  "Cheques due this week",
  "What's my net position?",
  "PC Lahore ka kitna baaki hai?",
];

const TOOL_LABEL: Record<string, string> = {
  get_party_balance: "party balance",
  net_position: "net position",
  top_receivables: "receivables",
  list_payables: "payables",
  due_cheques: "cheques due",
  profit_and_loss: "profit & loss",
  find_invoices: "invoices",
  inventory_summary: "inventory",
  active_shipments: "shipments",
};

export default function Assistant({ book }: { book: string }) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only render the portal after mount (document.body exists client-side only).
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    const history = messages
      .filter((m) => !m.pending)
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [
      ...m,
      { role: "user", content: q },
      { role: "assistant", content: "", pending: true },
    ]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, history }),
      });
      const data = await res.json();
      setMessages((m) => {
        const next = [...m];
        const i = next.findIndex((x) => x.pending);
        if (i >= 0)
          next[i] = {
            role: "assistant",
            content: data.reply || "Sorry, I couldn't answer that.",
            tools: data.toolsUsed,
          };
        return next;
      });
    } catch {
      setMessages((m) => {
        const next = [...m];
        const i = next.findIndex((x) => x.pending);
        if (i >= 0) next[i] = { role: "assistant", content: "Network error — please try again." };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  if (!mounted) return null;

  const ui = (
    <>
      {/* Chat panel — anchored bottom-right, above the launcher. */}
      {open && (
        <div
          data-testid="assistant-panel"
          className="animate-pop fixed z-[70] flex flex-col overflow-hidden rounded-2xl border border-hair bg-card"
          style={{
            right: 20,
            bottom: 88,
            width: 380,
            maxWidth: "calc(100vw - 2.5rem)",
            height: 520,
            maxHeight: "calc(100dvh - 7rem)",
            boxShadow: "var(--shadow-pop)",
          }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-hair2 bg-card2 px-4 py-3">
            <div className="min-w-0">
              <div className="font-serif text-[16px] font-semibold text-ink">Ask the ledger</div>
              <div className="truncate text-[11px] text-faint">
                Read-only · {book} book · answers from your data
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              data-testid="assistant-close"
              aria-label="Close chat"
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint hover:bg-card hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-muted">
                  Ask about balances, cheques, stock, shipments or profit — in English or Urdu.
                  I read the live ledger; I can&apos;t change anything.
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-hair bg-card px-3 py-1.5 text-left text-[12px] text-text transition-colors hover:bg-card2"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div
                    className="max-w-[85%] rounded-2xl rounded-br-sm px-3.5 py-2 text-[13px] text-[#F6F2E6]"
                    style={{ background: "var(--accent-deep)" }}
                  >
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex flex-col items-start gap-1">
                  <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-hair bg-card2 px-3.5 py-2 text-[13px] leading-relaxed text-text">
                    {m.pending ? (
                      <span className="inline-flex gap-1">
                        <Dot /> <Dot d={150} /> <Dot d={300} />
                      </span>
                    ) : (
                      m.content
                    )}
                  </div>
                  {m.tools && m.tools.length > 0 && (
                    <div className="pl-1 text-[10.5px] text-faint">
                      checked: {[...new Set(m.tools)].map((t) => TOOL_LABEL[t] ?? t).join(", ")}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-hair2 bg-card px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
              data-testid="assistant-input"
              placeholder="Ask a question…"
              className="input"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              data-testid="assistant-send"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#F6F2E6] disabled:opacity-40"
              style={{ background: "var(--accent)" }}
              aria-label="Send"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Floating launcher — rendered last so it always sits on top and is clickable. */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        data-testid="assistant-toggle"
        aria-label={open ? "Close assistant" : "Ask the ledger"}
        className="fixed z-[71] flex items-center justify-center rounded-full text-[#F6F2E6] transition-transform hover:scale-105"
        style={{ right: 20, bottom: 20, height: 54, width: 54, background: "var(--accent)", boxShadow: "var(--shadow-pop)" }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.6A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        )}
      </button>
    </>
  );

  return createPortal(ui, document.body);
}

function Dot({ d = 0 }: { d?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-faint"
      style={{ animation: `pulseRed 1s ${d}ms infinite`, opacity: 0.6 }}
    />
  );
}
