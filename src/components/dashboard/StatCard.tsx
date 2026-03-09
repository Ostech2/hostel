import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: string;
    type: "increase" | "decrease" | "neutral";
  };
  icon: LucideIcon;
  iconColor?: "primary" | "success" | "warning" | "destructive" | "info";
  onClick?: () => void;
}

const iconColorClasses = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/10 text-info",
};

export function StatCard({ title, value, change, icon: Icon, iconColor = "primary", onClick }: StatCardProps) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={cn(
        "stat-card group",
        onClick && "cursor-pointer select-none transition-all duration-150 hover:shadow-md hover:border-primary/40 active:scale-[0.97] active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-sm font-medium",
                change.type === "increase" && "text-success",
                change.type === "decrease" && "text-destructive",
                change.type === "neutral" && "text-muted-foreground"
              )}
            >
              {change.type === "increase" && "↑"}
              {change.type === "decrease" && "↓"}
              {change.value}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconColorClasses[iconColor])}>
            <Icon className="h-6 w-6" />
          </div>
          {onClick && (
            <svg
              className="h-4 w-4 text-muted-foreground/40 transition-all duration-150 group-hover:text-primary group-hover:translate-x-1"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
