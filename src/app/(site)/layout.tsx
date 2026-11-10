import { Suspense } from "react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { ProseLinkRouter } from "@/components/article/ArticleClient";
import { RevealObserver } from "@/components/RevealObserver";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col overflow-x-clip">
      <Header />
      <div id="main" className="flex-1">
        {children}
      </div>
      <Footer />
      {/* Reads the pathname, which is only known at request time on forum routes. */}
      <Suspense fallback={null}>
        <RevealObserver />
      </Suspense>
      <ProseLinkRouter />
    </div>
  );
}
