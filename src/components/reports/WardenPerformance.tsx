import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, Package, CheckCircle2, TrendingUp, TrendingDown, Bed } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface WardenStats {
  user_id: string;
  full_name: string;
  email: string;
  gender: "male" | "female" | null;
  hostels_count: number;
  hostels: string[];
  rooms_created: number;
  inventory_added: number;
  allocations_made: number;
  performance_score: number;
}

export function WardenPerformance() {
  const [wardens, setWardens] = useState<WardenStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchWardenPerformance();
  }, []);

  const fetchWardenPerformance = async () => {
    try {
      // Get all wardens
      const { data: wardenRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "warden");

      if (rolesError) throw rolesError;

      if (!wardenRoles || wardenRoles.length === 0) {
        setWardens([]);
        setIsLoading(false);
        return;
      }

      const wardenIds = wardenRoles.map((r) => r.user_id);

      // Get warden profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, gender")
        .in("user_id", wardenIds);

      if (profilesError) throw profilesError;

      // Get hostels for each warden
      const { data: hostels, error: hostelsError } = await supabase
        .from("hostels")
        .select("id, warden_id, name")
        .in("warden_id", wardenIds);

      if (hostelsError) throw hostelsError;

      // Get rooms in wardens' hostels
      const hostelIds = (hostels || []).map(h => h.warden_id).filter(Boolean);
      const { data: rooms, error: roomsError } = await supabase
        .from("rooms")
        .select("hostel_id");

      if (roomsError) throw roomsError;

      // Get inventory items added by each warden
      const { data: inventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("created_by")
        .in("created_by", wardenIds);

      if (inventoryError) throw inventoryError;

      // Get allocations made by each warden
      const { data: allocations, error: allocationsError } = await supabase
        .from("room_allocations")
        .select("allocated_by")
        .in("allocated_by", wardenIds);

      if (allocationsError) throw allocationsError;

      // Combine data
      const wardenStats: WardenStats[] = (profiles || []).map((profile) => {
        const wardenHostels = (hostels || []).filter(
          (h) => h.warden_id === profile.user_id
        );
        const wardenHostelIds = wardenHostels.map(h => h.id);
        const roomsCount = (rooms || []).filter(
          (r) => wardenHostelIds.includes(r.hostel_id)
        ).length;
        const inventoryCount = (inventory || []).filter(
          (i) => i.created_by === profile.user_id
        ).length;
        const allocationsCount = (allocations || []).filter(
          (a) => a.allocated_by === profile.user_id
        ).length;

        // Calculate performance score (weighted average)
        const hostelWeight = 20;
        const roomWeight = 20;
        const inventoryWeight = 30;
        const allocationWeight = 30;

        const maxHostels = 5;
        const maxRooms = 50;
        const maxInventory = 100;
        const maxAllocations = 50;

        const hostelScore = Math.min(wardenHostels.length / maxHostels, 1) * hostelWeight;
        const roomScore = Math.min(roomsCount / maxRooms, 1) * roomWeight;
        const inventoryScore = Math.min(inventoryCount / maxInventory, 1) * inventoryWeight;
        const allocationScore = Math.min(allocationsCount / maxAllocations, 1) * allocationWeight;

        const performanceScore = Math.round(hostelScore + roomScore + inventoryScore + allocationScore);

        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          gender: profile.gender as "male" | "female" | null,
          hostels_count: wardenHostels.length,
          hostels: wardenHostels.map((h) => h.name),
          rooms_created: roomsCount,
          inventory_added: inventoryCount,
          allocations_made: allocationsCount,
          performance_score: performanceScore,
        };
      });

      // Sort by performance score
      wardenStats.sort((a, b) => b.performance_score - a.performance_score);

      setWardens(wardenStats);
    } catch (error) {
      console.error("Error fetching warden performance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-destructive";
  };

  const getPerformanceLabel = (score: number) => {
    if (score >= 70) return "Excellent";
    if (score >= 40) return "Good";
    return "Needs Improvement";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Warden Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (wardens.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Warden Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No wardens found in the system.</p>
            <p className="text-sm mt-1">Create warden accounts in Settings to track their performance.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Warden Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {wardens.map((warden, index) => (
          <div
            key={warden.user_id}
            className={cn(
              "flex flex-col lg:flex-row lg:items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all opacity-0 animate-fade-in",
              `stagger-${Math.min(index + 1, 4)}`
            )}
          >
            {/* Avatar and Name */}
            <div className="flex items-center gap-3 min-w-[200px]">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(warden.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{warden.full_name}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {warden.gender === "male" ? "Male Warden" : warden.gender === "female" ? "Female Warden" : "Warden"}
                  </Badge>
                </div>
                {warden.hostels.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {warden.hostels.join(", ")}
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{warden.hostels_count}</p>
                  <p className="text-xs text-muted-foreground">Hostels</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Bed className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{warden.rooms_created}</p>
                  <p className="text-xs text-muted-foreground">Rooms</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{warden.inventory_added}</p>
                  <p className="text-xs text-muted-foreground">Items Added</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{warden.allocations_made}</p>
                  <p className="text-xs text-muted-foreground">Allocations</p>
                </div>
              </div>
            </div>

            {/* Performance Score */}
            <div className="min-w-[140px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Performance</span>
                <span className={cn("text-sm font-semibold", getPerformanceColor(warden.performance_score))}>
                  {warden.performance_score}%
                </span>
              </div>
              <Progress 
                value={warden.performance_score} 
                className="h-2"
              />
              <div className="flex items-center gap-1 mt-1">
                {warden.performance_score >= 50 ? (
                  <TrendingUp className={cn("h-3 w-3", getPerformanceColor(warden.performance_score))} />
                ) : (
                  <TrendingDown className={cn("h-3 w-3", getPerformanceColor(warden.performance_score))} />
                )}
                <span className={cn("text-xs", getPerformanceColor(warden.performance_score))}>
                  {getPerformanceLabel(warden.performance_score)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
