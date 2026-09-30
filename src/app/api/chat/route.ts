import { NextResponse } from "next/server";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { CHAT_TOOLS, runChatTool, type PropertyCard } from "@/lib/chat/tools";
import { CHATBOT_KNOWLEDGE } from "@/lib/chat/knowledge";
import { checkRateLimit } from "@/lib/rate-limit";
import { getAnthropicClient } from "@/lib/ai/anthropic";

// Haiku 4.5, not Opus - this bot is property lookups + short replies, not
// deep reasoning, and Haiku is a fifth the per-token price. Keep it here
// rather than a bigger model unless a real quality gap shows up in use.
const MODEL = "claude-haiku-4-5-20251001";

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40),
});

function buildSystemPrompt() {
  const today = new Date().toISOString().slice(0, 10);
  return `You are the guest-facing chat assistant for Lime Kraft Home Stays, an
Indian home-stay and villa booking company. Be warm, concise, and honest -
never invent availability, prices, or property details; always check with a
tool first.

Today's date is ${today}. If a guest gives a date without a year (e.g. "Oct 3" or "this weekend"), assume the nearest upcoming occurrence - never a past date or a random year from your training data.

Guidelines:
- Use search_properties to find homes matching what the guest describes, then check_availability_and_price for specific dates before quoting a number.
- Use get_property_details whenever a guest asks about house rules, pets, amenities, check-in/out times, or cancellation policy for a specific property - these vary per property and are never in the reference knowledge below.
- If you don't have enough info (city, dates, guest count), ask a short follow-up question rather than guessing.
- If the guest wants to book, has a question you can't answer from the tools, or explicitly asks for a human, collect their name and an email or phone number, then call create_inquiry with a clear summary. Tell them the team will follow up shortly.
- Keep replies under ~80 words unless listing multiple properties.
- Never claim a human will respond "immediately" - say "shortly" or "soon".

# Reference knowledge
${CHATBOT_KNOWLEDGE}`;
}

export async function POST(request: Request) {
  const client = await getAnthropicClient();
  if (!client) {
    return NextResponse.json({
      reply:
        "Chat isn't available right now - please use the contact form and our team will get back to you.",
    });
  }

  const limited = await checkRateLimit(request, { bucket: "chat", limit: 30, windowSeconds: 600 });
  if (limited) return limited;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Side-channel data from this turn's tool calls, carried to the frontend
  // alongside the reply - kept out of what's sent back to the model (see
  // tools.ts).
  const cardsBySlug = new Map<string, PropertyCard>();
  let contactFormReason: string | undefined;
  const systemPrompt = buildSystemPrompt();

  try {
    // Bounded loop: a guest turn should resolve in a couple of tool calls at
    // most. Cutting it off avoids a runaway/looping conversation racking up cost.
    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        tools: CHAT_TOOLS,
        messages,
      });

      if (response.stop_reason !== "tool_use") {
        const text = response.content.find((b) => b.type === "text");
        return NextResponse.json({
          reply: text?.text ?? "Sorry, could you rephrase that?",
          properties: selectCards(cardsBySlug),
          contactForm: contactFormReason,
        });
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const results = await Promise.all(
        toolUses.map(async (toolUse) => {
          const { forModel, cards, contactFormReason: reason } = await runChatTool(toolUse.name, toolUse.input);
          for (const card of cards) cardsBySlug.set(card.slug, card);
          if (reason) contactFormReason = reason;
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(forModel),
          };
        }),
      );
      messages.push({ role: "user", content: results });
    }

    return NextResponse.json({
      reply: "Let's take this to email - please use the contact form and our team will follow up.",
      properties: selectCards(cardsBySlug),
    });
  } catch (error) {
    console.error("[chat] request failed", error);
    return NextResponse.json({
      reply: "Something went wrong on our end - please use the contact form instead.",
    });
  }
}

/**
 * A turn that both browses (search_properties) and checks specific dates
 * (check_availability_and_price) shouldn't show the whole browse list next
 * to the one property actually being discussed - prefer the priced card(s).
 */
function selectCards(cardsBySlug: Map<string, PropertyCard>) {
  const all = [...cardsBySlug.values()];
  const priced = all.filter((c) => c.availability);
  return priced.length > 0 ? priced : all;
}
