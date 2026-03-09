import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState<Hostel | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form states
  const [hostelName, setHostelName] = useState("");
  const [hostelCapacity, setHostelCapacity] = useState("");
  const [numberOfRooms, setNumberOfRooms] = useState("");
  
  // Room form
  const [roomNumber, setRoomNumber] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("1");
  const [roomFloor, setRoomFloor] = useState("1");

  useEffect(() => {
    fetchHostels();
    fetchRooms();
  }, []);

  const fetchHostels = async () => {
    try {
      const { data, error } = await supabase
        .from("hostels")
        .select("*")
        .order("name");

      if (error) throw error;
      setHostels(data || []);
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

  const fetchRooms = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .order("room_number");

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
      fetchRooms();
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
    if (!confirm("Are you sure you want to delete this hostel? All rooms will be deleted.")) return;

    try {
      const { error } = await supabase.from("hostels").delete().eq("id", hostelId);
      if (error) throw error;
      toast({ title: "Success", description: "Hostel deleted" });
      fetchHostels();
      fetchRooms();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete hostel",
        variant: "destructive",
      });
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
    </AppLayout>
  );
};

export default Hostels;
