import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { CHAT_TOOLS, runChatTool } from "@/lib/chat/tools";

export const CHAT_IS_CONFIGURED = Boolean(process.env.ANTHROPIC_API_KEY);

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

const SYSTEM_PROMPT = `You are the guest-facing chat assistant for Lime Kraft Home Stays, an
Indian home-stay and villa booking company. Be warm, concise, and honest -
never invent availability, prices, or property details; always check with a
tool first.

Guidelines:
- Use search_properties to find homes matching what the guest describes, then check_availability_and_price for specific dates before quoting a number.
- If you don't have enough info (city, dates, guest count), ask a short follow-up question rather than guessing.
- If the guest wants to book, has a question you can't answer from the tools, or explicitly asks for a human, collect their name and an email or phone number, then call create_inquiry with a clear summary. Tell them the team will follow up shortly.
- Keep replies under ~80 words unless listing multiple properties.
- Never claim a human will respond "immediately" - say "shortly" or "soon".`;

export async function POST(request: Request) {
  if (!CHAT_IS_CONFIGURED) {
    return NextResponse.json({
      reply:
        "Chat isn't available right now - please use the contact form and our team will get back to you.",
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    // Bounded loop: a guest turn should resolve in a couple of tool calls at
    // most. Cutting it off avoids a runaway/looping conversation racking up cost.
    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await client.messages.create({
        model: "claude-opus-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: CHAT_TOOLS,
        messages,
        output_config: { effort: "medium" },
      });

      if (response.stop_reason === "refusal") {
        return NextResponse.json({
          reply: "I'm not able to help with that - please use the contact form instead.",
        });
      }

      if (response.stop_reason !== "tool_use") {
        const text = response.content.find((b) => b.type === "text");
        return NextResponse.json({ reply: text?.text ?? "Sorry, could you rephrase that?" });
      }

      messages.push({ role: "assistant", content: response.content });

      const toolUses = response.content.filter((b) => b.type === "tool_use");
      const results = await Promise.all(
        toolUses.map(async (toolUse) => {
          const result = await runChatTool(toolUse.name, toolUse.input);
          return {
            type: "tool_result" as const,
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          };
        }),
      );
      messages.push({ role: "user", content: results });
    }

    return NextResponse.json({
      reply: "Let's take this to email - please use the contact form and our team will follow up.",
    });
  } catch (error) {
    console.error("[chat] request failed", error);
    return NextResponse.json({
      reply: "Something went wrong on our end - please use the contact form instead.",
    });
  }
}
