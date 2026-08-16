import { NextResponse } from "next/server";
import { z } from "zod";
import { askLime } from "@/lib/admin/ask-lime";

const schema = z.object({ question: z.string().min(2).max(300) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ask a question." }, { status: 400 });
  }

  const answer = await askLime(parsed.data.question);
  return NextResponse.json(answer);
}
