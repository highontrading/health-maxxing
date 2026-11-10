import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { ProseLinkRouter } from "@/components/article/ArticleClient";
import { IntentPrefetch } from "@/components/motion/IntentPrefetch";
import { LayoutTransition } from "@/components/motion/PageTransition";
import { RouteProgress } from "@/components/motion/RouteProgress";
import { RevealObserver } from "@/components/RevealObserver";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <LayoutTransition>
      <div className="flex min-h-dvh flex-col overflow-x-clip">
        <RouteProgress />
        <Header />
        <div id="main" className="flex-1">
          {children}
        </div>
        <Footer />
        <RevealObserver />
        <ProseLinkRouter />
        <IntentPrefetch />
      </div>
    </LayoutTransition>
  );
}
