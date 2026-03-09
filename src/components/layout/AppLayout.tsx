import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <main className={isMobile ? "min-h-screen" : "ml-64 min-h-screen"}>
        {/* Inject mobile toggle function via context or clone */}
        {typeof children === "object" && children !== null
          ? (() => {
              // Pass onMenuToggle to children that accept it
              const child = children as React.ReactElement;
              return child;
            })()
          : children}
      </main>
      {/* Mobile bottom spacer */}
      {isMobile && <div className="h-16" />}
    </div>
  );
}

// Export a hook/context for triggering mobile menu from header
import { createContext, useContext } from "react";

const MobileMenuContext = createContext<{ toggle: () => void }>({ toggle: () => {} });

export function useMobileMenu() {
  return useContext(MobileMenuContext);
}

export function AppLayoutWithMenu({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <MobileMenuContext.Provider value={{ toggle: () => setMobileOpen((v) => !v) }}>
      <div className="min-h-screen bg-background">
        <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <main className={isMobile ? "min-h-screen" : "ml-64 min-h-screen"}>
          {children}
        </main>
      </div>
    </MobileMenuContext.Provider>
  );
}
