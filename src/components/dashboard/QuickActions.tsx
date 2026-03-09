import { Plus, Download, AlertTriangle, ArrowUpRight, Building2, Users, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "primary" | "secondary" | "warning" | "info";
  href?: string;
}

const variantClasses = {
  primary: "btn-gradient-primary",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  warning: "bg-warning/10 text-warning hover:bg-warning/20",
  info: "bg-info/10 text-info hover:bg-info/20",
};

export function QuickActions() {
  const navigate = useNavigate();
  const { role, profile } = useAuth();

  // Determine actions based on role and gender
  const getQuickActions = (): QuickAction[] => {
    if (role === "warden") {
      return [
        { label: "Add New Hostel", icon: Building2, variant: "primary", href: "/hostels" },
        { label: "Manage Students", icon: Users, variant: "info", href: "/allocations" },
        { label: "Manage Stock", icon: Package, variant: "secondary", href: "/inventory" },
        { label: "View Alerts", icon: AlertTriangle, variant: "warning" },
      ];
    }

    if (role === "admin") {
      return [
        { label: "View Warden Performance", icon: Users, variant: "primary", href: "/reports" },
        { label: "Generate Report", icon: Download, variant: "info", href: "/reports" },
      ];
    }

    // Default for students or unknown roles
    return [
      { label: "View My Allocation", icon: Users, variant: "primary", href: "/allocations" },
      { label: "View Alerts", icon: AlertTriangle, variant: "warning" },
    ];
  };

  const quickActions = getQuickActions();

  const handleActionClick = (action: QuickAction) => {
    if (action.href) {
      navigate(action.href);
    }
  };

  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="space-y-3">
        {quickActions.map((action, index) => (
          <button
            key={action.label}
            onClick={() => handleActionClick(action)}
            className={cn(
              "w-full flex items-center justify-between rounded-lg px-4 py-3 font-medium transition-all opacity-0 animate-fade-in",
              variantClasses[action.variant],
              `stagger-${Math.min(index + 1, 4)}`
            )}
          >
            <span className="flex items-center gap-2">
              <action.icon className="h-4 w-4" />
              {action.label}
            </span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
