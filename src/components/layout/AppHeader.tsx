import { useState, useEffect, useRef } from "react";
import { Bell, Search, Menu, Package, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMobileMenu } from "./AppLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

interface LowStockItem {
  id: string;
  item_name: string;
  quantity: number;
  min_stock_level: number;
  hostel_name: string;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { toggle } = useMobileMenu();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch low-stock items
  useEffect(() => {
    const fetchLowStock = async () => {
      setLoading(true);
      const { data: inventory } = await supabase
        .from("inventory")
        .select("id, item_name, quantity, min_stock_level, hostel_id")
        .not("min_stock_level", "is", null);

      const { data: hostels } = await supabase
        .from("hostels")
        .select("id, name");

      if (inventory && hostels) {
        const low = inventory
          .filter((i) => i.quantity <= (i.min_stock_level ?? 0))
          .map((i) => ({
            ...i,
            hostel_name: hostels.find((h) => h.id === i.hostel_id)?.name || "Unknown",
          }));
        setLowStockItems(low);
      }
      setLoading(false);
    };

    fetchLowStock();
  }, []);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const count = lowStockItems.length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggle} className="shrink-0">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <div className="min-w-0">
          <h1 className="text-base md:text-lg font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-xs md:text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        {/* Search - hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search inventory..."
            className="w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={popoverRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setOpen((v) => !v)}
            aria-label="Open notifications"
          >
            <Bell className={cn("h-5 w-5 transition-colors", open ? "text-primary" : "text-muted-foreground")} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground animate-pulse">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Button>

          {/* Dropdown panel */}
          {open && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-background shadow-xl ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="font-semibold text-sm">Low Stock Alerts</span>
                  {count > 0 && (
                    <span className="rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5">
                      {count}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {loading ? (
                  <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : count === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Bell className="h-8 w-8 opacity-20" />
                    <span>All stock levels are healthy</span>
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => { navigate("/inventory"); setOpen(false); }}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.item_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.hostel_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-destructive">{item.quantity}</p>
                        <p className="text-[10px] text-muted-foreground">min {item.min_stock_level}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {count > 0 && (
                <div className="border-t border-border px-4 py-2.5 bg-muted/20">
                  <button
                    onClick={() => { navigate("/inventory"); setOpen(false); }}
                    className="w-full text-center text-xs font-medium text-primary hover:underline"
                  >
                    View all in Inventory →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
