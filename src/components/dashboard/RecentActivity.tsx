import { Package, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "added" | "allocated" | "damaged" | "maintained";
  item: string;
  location: string;
  time: string;
  user: string;
}

const activities: Activity[] = [
  {
    id: "1",
    type: "added",
    item: "20 Mattresses",
    location: "Male Hostel A",
    time: "2 hours ago",
    user: "Admin",
  },
  {
    id: "2",
    type: "allocated",
    item: "15 Study Chairs",
    location: "Female Hostel B",
    time: "4 hours ago",
    user: "Warden John",
  },
  {
    id: "3",
    type: "damaged",
    item: "3 Bed Frames",
    location: "Male Hostel C",
    time: "Yesterday",
    user: "System",
  },
  {
    id: "4",
    type: "maintained",
    item: "10 Wardrobes",
    location: "Female Hostel A",
    time: "2 days ago",
    user: "Maintenance",
  },
  {
    id: "5",
    type: "added",
    item: "50 Pillows",
    location: "Storage Room",
    time: "3 days ago",
    user: "Admin",
  },
];

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
};

export function RecentActivity() {
  return (
    <div className="stat-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <button className="text-sm font-medium text-primary hover:underline">View all</button>
      </div>
      <div className="space-y-4">
        {activities.map((activity, index) => {
          const config = typeConfig[activity.type];
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
                  <span className="font-medium text-foreground truncate">{activity.item}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", config.bgColor, config.textColor)}>
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-muted-foreground">{activity.location}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
