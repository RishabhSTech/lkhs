import { SiteFooter } from "@/components/site/site-footer";
import { MobileTabBar } from "@/components/site/mobile-tab-bar";
import { ChatbotWidget } from "@/components/site/chatbot-widget";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="flex min-h-svh flex-col pb-16 lg:pb-0">{children}</div>
      <SiteFooter />
      <MobileTabBar />
      <ChatbotWidget />
    </>
  );
}
