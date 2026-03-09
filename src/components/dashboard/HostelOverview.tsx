import { Building2, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function HostelOverview() {
  const { role, user } = useAuth();

  const { data: hostels = [], isLoading } = useQuery({
    queryKey: ["hostels-overview", role, user?.id],
    queryFn: async () => {
      let query = supabase.from("hostels").select("id, name, capacity, location").order("name");
      if (role === "warden" && user?.id) {
        query = query.eq("warden_id", user.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: roomStats = [] } = useQuery({
    queryKey: ["room-stats-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("hostel_id, capacity");
      if (error) throw error;
      return data;
    },
  });

  const { data: inventoryStats = [] } = useQuery({
    queryKey: ["inventory-stats-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory").select("hostel_id, quantity");
      if (error) throw error;
      return data;
    },
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["allocation-stats-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("room_allocations").select("room_id").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms-for-allocations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, hostel_id");
      if (error) throw error;
      return data;
    },
  });

  const getHostelStats = (hostelId: string) => {
    const totalCapacity = roomStats
      .filter((r) => r.hostel_id === hostelId)
      .reduce((sum, r) => sum + r.capacity, 0);

    const hostelRoomIds = rooms.filter((r) => r.hostel_id === hostelId).map((r) => r.id);
    const occupied = allocations.filter((a) => hostelRoomIds.includes(a.room_id)).length;

    const items = inventoryStats
      .filter((i) => i.hostel_id === hostelId)
      .reduce((sum, i) => sum + i.quantity, 0);

    return { totalCapacity, occupied, items };
  };

  if (isLoading) {
    return (
      <div className="stat-card h-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Hostel Overview</h3>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (hostels.length === 0) {
    return (
      <div className="stat-card h-full">
        <h3 className="text-lg font-semibold text-foreground mb-4">Hostel Overview</h3>
        <p className="text-sm text-muted-foreground">
          {role === "warden" ? "No hostels assigned to you yet." : "No hostels added yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="stat-card h-full">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          {role === "warden" ? "My Hostels" : "Hostel Overview"}
        </h3>
      </div>
      <div className="space-y-3">
        {hostels.map((hostel, index) => {
          const { totalCapacity, occupied, items } = getHostelStats(hostel.id);
          const occupancyPercent = totalCapacity > 0 ? Math.round((occupied / totalCapacity) * 100) : 0;

          return (
            <div
              key={hostel.id}
              className={cn(
                "rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors cursor-pointer opacity-0 animate-fade-in",
                `stagger-${Math.min(index + 1, 4)}`
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">{hostel.name}</p>
                    {hostel.location && (
                      <p className="text-xs text-muted-foreground">{hostel.location}</p>
                    )}
                  </div>
                </div>
                {totalCapacity > 0 && (
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    occupancyPercent >= 90 ? "bg-destructive/10 text-destructive" :
                    occupancyPercent >= 70 ? "bg-warning/10 text-warning" :
                    "bg-success/10 text-success"
                  )}>
                    {occupancyPercent}% full
                  </span>
                )}
              </div>

              {totalCapacity > 0 && (
                <div className="mb-2">
                  <div className="h-1.5 w-full rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        occupancyPercent >= 90 ? "bg-destructive" :
                        occupancyPercent >= 70 ? "bg-warning" :
                        "bg-success"
                      )}
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {occupied}/{totalCapacity}
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {items} items
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
