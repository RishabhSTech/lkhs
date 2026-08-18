import Link from "next/link";
import { LogOut } from "lucide-react";
import { LogoStacked } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { getCurrentStakeholder } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function StakeholderLayout({
  children,
}: LayoutProps<"/stakeholder">) {
  const { stakeholder, isDemoFallback } = await getCurrentStakeholder();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/stakeholder">
            <LogoStacked />
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                {stakeholder.name}
              </p>
              <p className="text-xs capitalize text-muted-foreground">
                {stakeholder.type.toLowerCase()}
              </p>
            </div>
            {isDemoFallback && (
              <Badge className="hidden border-chart-4/25 bg-chart-4/10 text-chart-4 sm:inline-flex">
                Demo
              </Badge>
            )}
            <Link
              href="/api/auth/signout"
              aria-label="Sign out"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-card py-5">
        <p className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground sm:px-6">
          You&apos;re seeing only the properties assigned to you. For anything else,
          contact the Lime Kraft team.
        </p>
      </footer>
    </div>
  );
}
