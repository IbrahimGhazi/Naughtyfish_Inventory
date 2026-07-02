/**
 * Provider-agnostic LLM tool-loop for the "Ask the ledger" assistant.
 *
 * Talks to any OpenAI-compatible chat endpoint (Groq now; swap to Ollama /
 * OpenRouter / Anthropic-compatible with three env vars, no code change):
 *   ASSISTANT_BASE_URL   e.g. https://api.groq.com/openai/v1
 *   ASSISTANT_API_KEY    the provider key (server-only; never NEXT_PUBLIC)
 *   ASSISTANT_MODEL      e.g. llama-3.3-70b-versatile
 */
import type { ActiveContext } from "@/lib/session";
import { TOOL_SCHEMAS, runTool } from "./tools";

const BASE_URL = process.env.ASSISTANT_BASE_URL ?? "https://api.groq.com/openai/v1";
const MODEL = process.env.ASSISTANT_MODEL ?? "llama-3.3-70b-versatile";
const API_KEY =
  process.env.ASSISTANT_API_KEY ?? process.env.GROQ_API_KEY ?? "";

export function assistantConfigured(): boolean {
  return API_KEY.length > 0;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
}

export interface AssistantResult {
  reply: string;
  toolsUsed: string[];
  error?: "rate_limited" | "provider_error" | "not_configured";
}

const MAX_TOOL_ROUNDS = 4;

function systemPrompt(ctx: ActiveContext): string {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return [
    `You are the assistant inside "NaughtyFish", a seafood trade-ledger app for a Karachi business.`,
    `Today is ${today}. The user is looking at the "${ctx.entityName}" book.`,
    ``,
    `RULES — follow strictly:`,
    `- You can ONLY read data through the provided tools. You cannot create, edit, delete, or record anything. If the user asks to make a change (record a payment, add an invoice, etc.), tell them you can't change data and point them to the relevant page.`,
    `- NEVER invent or estimate numbers. Every figure you state must come from a tool result. If a tool has no answer, say you don't have that information.`,
    `- All money is in Pakistani Rupees (PKR / Rs). Numbers already reflect the "${ctx.entityName}" book only.`,
    `- Answer briefly and concretely. Lead with the number. Format money like "Rs 850,500".`,
    `- Match the user's language: reply in Urdu/Roman-Urdu if they wrote in it, English if English. Keep it natural and short.`,
    `- If a party name is ambiguous (tool returns multiple options), ask which one.`,
  ].join("\n");
}

async function callProvider(messages: ChatMessage[]): Promise<Response> {
  return fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: TOOL_SCHEMAS,
      tool_choice: "auto",
      temperature: 0.2,
      max_tokens: 600,
    }),
  });
}

/**
 * Run one user turn: system + prior history + new question, letting the model
 * call read-only tools until it produces a final answer. Returns the reply plus
 * the tools it consulted (shown to the user for trust).
 */
export async function askLedger(
  ctx: ActiveContext,
  history: ChatMessage[],
  userMessage: string,
): Promise<AssistantResult> {
  if (!assistantConfigured()) {
    return { reply: "", toolsUsed: [], error: "not_configured" };
  }

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(ctx) },
    ...history.slice(-8), // keep context bounded
    { role: "user", content: userMessage },
  ];

  const toolsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let res: Response;
    try {
      res = await callProvider(messages);
    } catch {
      return { reply: "", toolsUsed, error: "provider_error" };
    }

    if (res.status === 429) return { reply: "", toolsUsed, error: "rate_limited" };
    if (!res.ok) return { reply: "", toolsUsed, error: "provider_error" };

    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    if (!msg) return { reply: "", toolsUsed, error: "provider_error" };

    const toolCalls = msg.tool_calls as
      | { id: string; function: { name: string; arguments: string } }[]
      | undefined;

    if (!toolCalls || toolCalls.length === 0) {
      return { reply: String(msg.content ?? "").trim(), toolsUsed };
    }

    // Record the assistant's tool-call turn, then execute each tool (scoped).
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });
    for (const call of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      toolsUsed.push(call.function.name);
      const result = await runTool(ctx, call.function.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(result),
      });
    }
  }

  // Ran out of tool rounds — ask the model for a best-effort final answer.
  return { reply: "Sorry, that took too many steps. Try asking more specifically.", toolsUsed };
}
