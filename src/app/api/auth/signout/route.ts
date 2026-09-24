import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

// POST-only, deliberately: a GET route here was reachable by next/link's
// automatic viewport prefetching (any <Link href="/api/auth/signout"> got
// silently prefetched and signed the user out without a click). Sign-out is
// now a <form method="POST"> submit in every caller - see admin-sidebar.tsx,
// stakeholder/layout.tsx, and account/page.tsx.
export async function POST(request: Request) {
  await destroySession();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
