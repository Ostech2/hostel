import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Trash2, RefreshCw, Package, CheckCircle, AlertTriangle, Clock } from "lucide-react";

// The Activity interface now matches the database schema
interface Activity {
  id: string;
  type: string;
  item: string;
  location: string | null;
  created_at: string;
  user_id?: string | null;
}

const typeConfig = {
  added: {
    icon: Package,
    bgColor: "bg-success/10",
    textColor: "text-success",
    label: "Added",
  },
  allocated: {
    icon: CheckCircle,
    bgColor: "bg-info/10",
    textColor: "text-info",
    label: "Allocated",
  },
  damaged: {
    icon: AlertTriangle,
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    label: "Damaged",
  },
  maintained: {
    icon: Clock,
    bgColor: "bg-warning/10",
    textColor: "text-warning",
    label: "Maintained",
  },
  deleted: {
    icon: Trash2,
    bgColor: "bg-destructive/10",
    textColor: "text-destructive",
    label: "Deleted",
  },
  updated: {
    icon: RefreshCw,
    bgColor: "bg-info/10",
    textColor: "text-info",
    label: "Updated",
  },
};

export function RecentActivity() {
  const { user } = useAuth();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["recent-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as Activity[];
    },
    enabled: !!user,
  });

  return (
    <div className="stat-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm font-medium text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading activity...</p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No recent activity found.</p>
        ) : (
          activities.map((activity, index) => {
            const config = typeConfig[activity.type as keyof typeof typeConfig] || typeConfig.added;
            const Icon = config.icon;
            return (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3 opacity-0 animate-fade-in",
                  `stagger-${Math.min(index + 1, 4)}`
                )}
              >
                <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bgColor)}>
                  <Icon className={cn("h-4 w-4", config.textColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground truncate block">{activity.item}</span>
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0", config.bgColor, config.textColor)}>
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {activity.location && (
                      <>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">{activity.location}</span>
                        <span className="text-muted-foreground text-xs">•</span>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
