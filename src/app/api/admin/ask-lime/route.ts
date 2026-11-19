import { NextResponse } from "next/server";
import { z } from "zod";
import { askLime } from "@/lib/admin/ask-lime";
import { guardApi } from "@/lib/auth/guards";
import { FINANCE_ROLES } from "@/lib/auth/roles";

const schema = z.object({ question: z.string().min(2).max(300) });

export async function POST(request: Request) {
  const auth = await guardApi(FINANCE_ROLES, "Ask Lime answers finance questions, so it's limited to the finance team.");
  if ("error" in auth) return auth.error;
  const { scope } = auth;
  if (scope) return NextResponse.json({ error: "Ask Lime covers the whole portfolio." }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Type a question first." }, { status: 400 });
  }

  const answer = await askLime(parsed.data.question);
  return NextResponse.json(answer);
}
