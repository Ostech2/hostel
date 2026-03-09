import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayoutWithMenu as AppLayout } from "@/components/layout/AppLayout";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Search, 
  Building2, 
  Users, 
  Package, 
  Bed, 
  MapPin,
  MoreVertical,
  Edit,
  Eye,
  Loader2,
  Trash2,
  DoorOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Hostel {
  id: string;
  name: string;
  location: string | null;
  capacity: number;
  warden_id: string | null;
  created_at: string;
}

interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
  floor: number | null;
}

const Hostels = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [editingHostel, setEditingHostel] = useState<Hostel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [hostelName, setHostelName] = useState("");
  const [hostelLocation, setHostelLocation] = useState("");
  const [hostelCapacity, setHostelCapacity] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  
  // Room form
  const [roomNumber, setRoomNumber] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("1");
  const [roomFloor, setRoomFloor] = useState("1");

  useEffect(() => {
    if (role) {
      fetchHostels();
    }
  }, [role, user?.id]);

  const fetchHostels = async () => {
    try {
      let query = supabase.from("hostels").select("*").order("name");

      // Wardens only see their assigned hostels
      if (role === "warden" && user?.id) {
        query = query.eq("warden_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setHostels(data || []);

      // Fetch rooms scoped to the returned hostels
      const hostelIds = (data || []).map((h) => h.id);
      await fetchRooms(hostelIds);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load hostels",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRooms = async (hostelIds?: string[]) => {
    try {
      let query = supabase.from("rooms").select("*").order("room_number");
      if (hostelIds && hostelIds.length > 0) {
        query = query.in("hostel_id", hostelIds);
      } else if (hostelIds && hostelIds.length === 0) {
        // No hostels assigned — no rooms to show
        setRooms([]);
        return;
      }
      const { data, error } = await query;
      if (error) throw error;
      setRooms(data || []);
    } catch (error: any) {
      console.error("Error fetching rooms:", error);
    }
  };

  const handleAddHostel = async () => {
    if (!hostelName.trim()) {
      toast({
        title: "Error",
        description: "Hostel name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from("hostels").insert({
        name: hostelName.trim(),
        location: null,
        capacity: parseInt(hostelCapacity) || 0,
        warden_id: role === "warden" ? user?.id : null,
      }).select().single();

      if (error) throw error;

      // Auto-create rooms if number specified
      const roomCount = parseInt(numberOfRooms) || 0;
      if (roomCount > 0 && data) {
        const roomInserts = Array.from({ length: roomCount }, (_, i) => ({
          hostel_id: data.id,
          room_number: `Room ${i + 1}`,
          capacity: 4,
          floor: 1,
        }));
        const { error: roomError } = await supabase.from("rooms").insert(roomInserts);
        if (roomError) console.error("Error creating rooms:", roomError);
      }

      toast({ title: "Success", description: `Hostel added with ${roomCount} room(s)` });
      setIsAddDialogOpen(false);
      setHostelName("");
      setHostelCapacity("");
      setNumberOfRooms("");
      fetchHostels();
      fetchRooms();
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add hostel",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRoom = async () => {
    if (!selectedHostel || !roomNumber.trim()) {
      toast({
        title: "Error",
        description: "Room number is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("rooms").insert({
        hostel_id: selectedHostel.id,
        room_number: roomNumber.trim(),
        capacity: parseInt(roomCapacity) || 1,
        floor: parseInt(roomFloor) || 1,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Room added successfully" });
      setIsRoomDialogOpen(false);
      setRoomNumber("");
      setRoomCapacity("1");
      setRoomFloor("1");
      fetchHostels(); // re-fetches rooms scoped to warden's hostels
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add room",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteHostel = async (hostelId: string) => {
    // 1. Check for students first
    const { count: studentCount, error: countError } = await supabase
      .from("profiles")
      .select("*", { count: 'exact', head: true })
      .eq("hostel_id", hostelId);
    
    if (countError) {
      console.warn("Could not check student count:", countError);
    }

    const studentWarning = studentCount && studentCount > 0 
      ? `\n\nWarning: ${studentCount} students are currently assigned to this hostel and will be unassigned.`
      : "";

    if (!confirm(`Are you sure you want to delete this hostel? All rooms, allocations, and inventory related to this hostel will be deleted.${studentWarning}`)) return;

    setIsSubmitting(true);
    try {
      // 2. Unassign students from this hostel
      const { error: profileError } = await supabase.from("profiles").update({ hostel_id: null, room_number: null }).eq("hostel_id", hostelId);
      if (profileError) {
        console.warn("Could not unassign students (possibly RLS):", profileError);
        // If it failed because of students, the hostel delete will fail anyway with FK error, but we continue to try rooms
      }
      
      // 3. Find and delete all room allocations
      const { data: hostelRooms } = await supabase.from("rooms").select("id").eq("hostel_id", hostelId);
      if (hostelRooms && hostelRooms.length > 0) {
        const roomIds = hostelRooms.map(r => r.id);
        const { error: allocErr } = await supabase.from("room_allocations").delete().in("room_id", roomIds);
        if (allocErr) throw new Error("Failed to delete room allocations: " + allocErr.message);
      }

      // 4. Delete inventory items
      const { error: invErr } = await supabase.from("inventory").delete().eq("hostel_id", hostelId);
      if (invErr) throw new Error("Failed to delete inventory: " + invErr.message);

      // 5. Delete the rooms
      const { error: roomErr } = await supabase.from("rooms").delete().eq("hostel_id", hostelId);
      if (roomErr) throw new Error("Failed to delete rooms: " + roomErr.message);

      // 6. Finally, delete the hostel itself
      const { error } = await supabase.from("hostels").delete().eq("id", hostelId);
      
      if (error) {
        if (error.code === "23503") {
          throw new Error("Cannot delete hostel: There are still students or records linked to it that couldn't be cleared. Please contact an admin.");
        }
        throw new Error(error.message);
      }
      
      toast({ title: "Success", description: "Hostel deleted successfully." });
      
      // Update UI state
      setHostels(current => current.filter(h => h.id !== hostelId));
      fetchHostels();
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Could not delete hostel.",
        variant: "destructive",
      });
      fetchHostels();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditHostel = (hostel: Hostel) => {
    setEditingHostel(hostel);
    setHostelName(hostel.name);
    setHostelLocation(hostel.location || "");
    setHostelCapacity(String(hostel.capacity || ""));
    setIsEditDialogOpen(true);
  };

  const handleEditHostel = async () => {
    if (!editingHostel || !hostelName.trim()) {
      toast({ title: "Error", description: "Hostel name is required", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("hostels")
        .update({
          name: hostelName.trim(),
          location: hostelLocation.trim() || null,
          capacity: parseInt(hostelCapacity) || 0,
        })
        .eq("id", editingHostel.id);
      if (error) throw error;
      toast({ title: "Success", description: "Hostel updated successfully" });
      setIsEditDialogOpen(false);
      setEditingHostel(null);
      setHostelName("");
      setHostelLocation("");
      setHostelCapacity("");
      fetchHostels();
      queryClient.invalidateQueries();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update hostel", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredHostels = hostels.filter((hostel) =>
    hostel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (hostel.location?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getRoomCount = (hostelId: string) => rooms.filter(r => r.hostel_id === hostelId).length;
  const getTotalCapacity = (hostelId: string) => rooms.filter(r => r.hostel_id === hostelId).reduce((sum, r) => sum + r.capacity, 0);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AppHeader 
        title="Hostels Management" 
        subtitle="View and manage all hostels and rooms" 
      />
      
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search hostels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gradient-primary gap-2">
                <Plus className="h-4 w-4" />
                Add Hostel
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Hostel</DialogTitle>
                <DialogDescription>
                  Enter the details of the new hostel.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="hostel-name">Hostel Name *</Label>
                  <Input 
                    id="hostel-name" 
                    placeholder="e.g., St. Paul's Hostel"
                    value={hostelName}
                    onChange={(e) => setHostelName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input 
                    id="capacity" 
                    type="number" 
                    placeholder="0"
                    value={hostelCapacity}
                    onChange={(e) => setHostelCapacity(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="num-rooms">Number of Rooms</Label>
                  <Input 
                    id="num-rooms" 
                    type="number" 
                    placeholder="0"
                    value={numberOfRooms}
                    onChange={(e) => setNumberOfRooms(e.target.value)}
                  />
                </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  className="btn-gradient-primary" 
                  onClick={handleAddHostel}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Hostel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Hostels",   value: hostels.length,                                    icon: Building2, color: "bg-primary/10 text-primary",             route: "/hostels" },
            { label: "Total Rooms",     value: rooms.length,                                      icon: Bed,       color: "bg-info/10 text-info",                   route: "/hostels" },
            { label: "Total Capacity",  value: rooms.reduce((sum, r) => sum + r.capacity, 0),     icon: Users,     color: "bg-success/10 text-success",             route: "/allocations" },
            { label: "Hostel Capacity", value: hostels.reduce((sum, h) => sum + h.capacity, 0),   icon: Package,   color: "bg-accent/20 text-accent-foreground",    route: "/inventory" },
          ].map(({ label, value, icon: Icon, color, route }) => (
            <div
              key={label}
              role="button"
              tabIndex={0}
              onClick={() => navigate(route)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate(route); }}
              className="stat-card cursor-pointer select-none transition-all duration-150 hover:shadow-md hover:border-primary/40 active:scale-[0.97] active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{value}</p>
                    <p className="text-sm text-muted-foreground">{label}</p>
                  </div>
                </div>
                <svg
                  className="h-4 w-4 text-muted-foreground/40 transition-all duration-150 group-hover:text-primary group-hover:translate-x-1"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Hostels Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHostels.map((hostel, index) => {
            const roomCount = getRoomCount(hostel.id);
            const totalCapacity = getTotalCapacity(hostel.id);
            
            return (
              <Card 
                key={hostel.id} 
                className={cn(
                  "overflow-hidden transition-all duration-300 hover:shadow-lg opacity-0 animate-fade-in",
                  `stagger-${Math.min(index + 1, 4)}`
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{hostel.name}</CardTitle>
                        {hostel.location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {hostel.location}
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedHostel(hostel);
                          setIsRoomDialogOpen(true);
                        }}>
                          <DoorOpen className="h-4 w-4 mr-2" />
                          Add Room
                        </DropdownMenuItem>
                        {(role === "admin" || hostel.warden_id === user?.id) && (
                          <DropdownMenuItem onClick={() => openEditHostel(hostel)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        {(role === "admin" || hostel.warden_id === user?.id) && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteHostel(hostel.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold">{roomCount}</p>
                      <p className="text-xs text-muted-foreground">Rooms</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold">{totalCapacity}</p>
                      <p className="text-xs text-muted-foreground">Beds</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-lg font-bold">{hostel.capacity}</p>
                      <p className="text-xs text-muted-foreground">Capacity</p>
                    </div>
                  </div>

                  {/* Rooms Table */}
                  {roomCount > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="text-xs">Room</TableHead>
                            <TableHead className="text-xs">Floor</TableHead>
                            <TableHead className="text-xs">Capacity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rooms.filter(r => r.hostel_id === hostel.id).slice(0, 3).map((room) => (
                            <TableRow key={room.id}>
                              <TableCell className="text-sm font-medium">{room.room_number}</TableCell>
                              <TableCell className="text-sm">{room.floor}</TableCell>
                              <TableCell className="text-sm">{room.capacity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {roomCount > 3 && (
                        <div className="text-center py-2 text-xs text-muted-foreground border-t">
                          +{roomCount - 3} more rooms
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredHostels.length === 0 && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No hostels found</h3>
            <p className="text-muted-foreground">Add a hostel to get started</p>
          </div>
        )}
      </div>

      {/* Add Room Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add Room to {selectedHostel?.name}</DialogTitle>
            <DialogDescription>
              Enter the room details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="room-number">Room Number *</Label>
              <Input 
                id="room-number" 
                placeholder="e.g., 101A"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="room-floor">Floor</Label>
                <Input 
                  id="room-floor" 
                  type="number"
                  value={roomFloor}
                  onChange={(e) => setRoomFloor(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="room-capacity">Capacity</Label>
                <Input 
                  id="room-capacity" 
                  type="number"
                  value={roomCapacity}
                  onChange={(e) => setRoomCapacity(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoomDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              className="btn-gradient-primary" 
              onClick={handleAddRoom}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Hostel Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { setEditingHostel(null); setHostelName(""); setHostelLocation(""); setHostelCapacity(""); } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Edit Hostel</DialogTitle>
            <DialogDescription>Update the hostel's details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-hostel-name">Hostel Name *</Label>
              <Input
                id="edit-hostel-name"
                placeholder="e.g., St. Paul's Hostel"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-hostel-location">Location</Label>
              <Input
                id="edit-hostel-location"
                placeholder="e.g., Block A, Campus"
                value={hostelLocation}
                onChange={(e) => setHostelLocation(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-hostel-capacity">Capacity</Label>
              <Input
                id="edit-hostel-capacity"
                type="number"
                placeholder="0"
                value={hostelCapacity}
                onChange={(e) => setHostelCapacity(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingHostel(null); setHostelName(""); setHostelLocation(""); setHostelCapacity(""); }}>
              Cancel
            </Button>
            <Button className="btn-gradient-primary" onClick={handleEditHostel} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Hostels;
