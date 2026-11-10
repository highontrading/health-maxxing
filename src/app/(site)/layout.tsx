import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { RevealObserver } from "@/components/RevealObserver";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div id="main" className="flex-1">
        {children}
      </div>
      <Footer />
      <RevealObserver />
    </div>
  );
}
