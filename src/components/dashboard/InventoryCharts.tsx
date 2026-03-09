import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function InventoryChart() {
  const { role, user } = useAuth();

  const { data: hostelData = [] } = useQuery({
    queryKey: ["inventory-chart-by-hostel", role, user?.id],
    queryFn: async () => {
      let hostelsQuery = supabase.from("hostels").select("id, name");
      if (role === "warden" && user?.id) {
        hostelsQuery = hostelsQuery.eq("warden_id", user.id);
      }

      const [hostelsRes, inventoryRes, allocationsRes, roomsRes] = await Promise.all([
        hostelsQuery,
        supabase.from("inventory").select("hostel_id, quantity"),
        supabase.from("room_allocations").select("room_id").eq("is_active", true),
        supabase.from("rooms").select("id, hostel_id"),
      ]);

      const hostels = hostelsRes.data || [];
      const inventory = inventoryRes.data || [];
      const allocations = allocationsRes.data || [];
      const rooms = roomsRes.data || [];

      return hostels.map((h) => {
        const items = inventory
          .filter((i) => i.hostel_id === h.id)
          .reduce((sum, i) => sum + i.quantity, 0);
        const hostelRoomIds = rooms.filter((r) => r.hostel_id === h.id).map((r) => r.id);
        const allocated = allocations.filter((a) => hostelRoomIds.includes(a.room_id)).length;
        return { hostel: h.name, items, allocated };
      });
    },
  });

  return (
    <div className="stat-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {role === "warden" ? "My Hostels Inventory" : "Inventory by Hostel"}
          </h3>
          <p className="text-sm text-muted-foreground">Total items & allocations per hostel</p>
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={hostelData}>
            <defs>
              <linearGradient id="colorItems" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(210, 85%, 35%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(210, 85%, 35%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(42, 95%, 55%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(42, 95%, 55%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
            <XAxis 
              dataKey="hostel" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 20%, 88%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px hsl(215 28% 17% / 0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="items"
              stroke="hsl(210, 85%, 35%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorItems)"
              name="Total Items"
            />
            <Area
              type="monotone"
              dataKey="allocated"
              stroke="hsl(42, 95%, 55%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorAllocated)"
              name="Allocations"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryChart() {
  const { role, user } = useAuth();

  const { data: categoryData = [] } = useQuery({
    queryKey: ["inventory-by-category", role, user?.id],
    queryFn: async () => {
      let query = supabase.from("inventory").select("category, quantity, hostel_id");
      
      if (role === "warden" && user?.id) {
        const { data: wardenHostels } = await supabase
          .from("hostels")
          .select("id")
          .eq("warden_id", user.id);
        const hostelIds = (wardenHostels || []).map((h) => h.id);
        if (hostelIds.length > 0) {
          query = query.in("hostel_id", hostelIds);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      const catMap: Record<string, number> = {};
      (data || []).forEach((item) => {
        const label = item.category.charAt(0).toUpperCase() + item.category.slice(1);
        catMap[label] = (catMap[label] || 0) + item.quantity;
      });
      return Object.entries(catMap).map(([name, count]) => ({ name, count }));
    },
  });

  return (
    <div className="stat-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Items by Category</h3>
        <p className="text-sm text-muted-foreground">Distribution of inventory items</p>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categoryData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" horizontal={false} />
            <XAxis 
              type="number" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }}
              width={80}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                border: '1px solid hsl(214, 20%, 88%)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px hsl(215 28% 17% / 0.1)',
              }}
            />
            <Bar 
              dataKey="count" 
              fill="hsl(210, 85%, 35%)" 
              radius={[0, 4, 4, 0]}
              name="Count"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
