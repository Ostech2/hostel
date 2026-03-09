import { AppLayoutWithMenu as AppLayout } from "@/components/layout/AppLayout";
import { AppHeader } from "@/components/layout/AppHeader";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { HostelOverview } from "@/components/dashboard/HostelOverview";
import { InventoryChart, CategoryChart } from "@/components/dashboard/InventoryCharts";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { Package, Building2, Users, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { profile, role, user } = useAuth();
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats", role, user?.id],
    queryFn: async () => {
      // For wardens, first get their assigned hostels
      let hostelIds: string[] | null = null;
      if (role === "warden" && user?.id) {
        const { data: wardenHostels } = await supabase
          .from("hostels")
          .select("id")
          .eq("warden_id", user.id);
        hostelIds = (wardenHostels || []).map((h) => h.id);
      }

      let inventoryQuery = supabase.from("inventory").select("quantity, min_stock_level, hostel_id");
      let hostelsQuery = supabase.from("hostels").select("id");
      let allocationsQuery = supabase.from("room_allocations").select("id, room_id").eq("is_active", true);

      if (hostelIds !== null) {
        inventoryQuery = inventoryQuery.in("hostel_id", hostelIds);
        hostelsQuery = hostelsQuery.in("id", hostelIds);
      }

      const [inventoryRes, hostelsRes, roomsRes, allocationRes] = await Promise.all([
        inventoryQuery,
        hostelsQuery,
        supabase.from("rooms").select("id, hostel_id"),
        allocationsQuery,
      ]);

      const rooms = roomsRes.data || [];
      const allocations = allocationRes.data || [];

      // Filter allocations to only rooms in warden's hostels
      let filteredAllocations = allocations;
      if (hostelIds !== null) {
        const hostelRoomIds = rooms.filter((r: any) => hostelIds!.includes(r.hostel_id)).map((r: any) => r.id);
        filteredAllocations = allocations.filter((a: any) => hostelRoomIds.includes(a.room_id));
      }

      const totalItems = (inventoryRes.data || []).reduce((sum: number, i: any) => sum + i.quantity, 0);
      const activeHostels = (hostelsRes.data || []).length;
      const allocatedStudents = filteredAllocations.length;
      const needAttention = (inventoryRes.data || []).filter(
        (i: any) => i.min_stock_level !== null && i.quantity <= i.min_stock_level
      ).length;

      return { totalItems, activeHostels, allocatedStudents, needAttention };
    },
    enabled: !!role,
  });

  const getWelcomeMessage = () => {
    if (role === "warden" && profile?.gender) {
      const wardenType = profile.gender === "male" ? "Male Warden" : "Female Warden";
      return `Welcome back, ${profile?.full_name || "Warden"} (${wardenType})`;
    }
    return `Welcome back, ${profile?.full_name || "User"}`;
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Dashboard" 
        subtitle={getWelcomeMessage()}
      />
      
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="opacity-0 animate-fade-in stagger-1">
            <StatCard
              title="Total Items"
              value={stats?.totalItems?.toLocaleString() ?? "0"}
              change={{ value: "From inventory records", type: "neutral" }}
              icon={Package}
              iconColor="primary"
              onClick={() => navigate("/inventory")}
            />
          </div>
          <div className="opacity-0 animate-fade-in stagger-2">
            <StatCard
              title={role === "warden" ? "My Hostels" : "Active Hostels"}
              value={String(stats?.activeHostels ?? 0)}
              change={{ value: role === "warden" ? "Assigned to you" : "Registered hostels", type: "neutral" }}
              icon={Building2}
              iconColor="info"
              onClick={() => navigate("/hostels")}
            />
          </div>
          <div className="opacity-0 animate-fade-in stagger-3">
            <StatCard
              title="Allocated Students"
              value={String(stats?.allocatedStudents ?? 0)}
              change={{ value: "Active room allocations", type: "neutral" }}
              icon={Users}
              iconColor="success"
              onClick={() => navigate("/allocations")}
            />
          </div>
          <div className="opacity-0 animate-fade-in stagger-4">
            <StatCard
              title="Low Stock Items"
              value={String(stats?.needAttention ?? 0)}
              change={{ value: "Below minimum stock level", type: stats?.needAttention ? "decrease" : "neutral" }}
              icon={AlertTriangle}
              iconColor="warning"
              onClick={() => navigate("/inventory")}
            />
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 opacity-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <InventoryChart />
          </div>
          <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CategoryChart />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 opacity-0 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <QuickActions />
          </div>
          <div className="lg:col-span-1 opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <HostelOverview />
          </div>
          <div className="lg:col-span-1 opacity-0 animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <RecentActivity />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
