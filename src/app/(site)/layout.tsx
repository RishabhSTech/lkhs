import { SiteFooter } from "@/components/site/site-footer";
import { MobileTabBar } from "@/components/site/mobile-tab-bar";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex min-h-svh flex-col pb-16 lg:pb-0">{children}</div>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
