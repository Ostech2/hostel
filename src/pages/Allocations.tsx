import { useState, useEffect } from "react";
import { AppLayoutWithMenu as AppLayout } from "@/components/layout/AppLayout";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, Edit, Trash2, UserCheck, Loader2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface Allocation {
  id: string;
  room_id: string;
  student_id: string;
  allocated_by: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface Room {
  id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
}

interface Hostel {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  student_id: string | null;
  email: string;
}

const Allocations = () => {
  const { user, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [allocationsRes, roomsRes, hostelsRes, studentsRes] = await Promise.all([
        supabase.from("room_allocations").select("*").order("created_at", { ascending: false }),
        supabase.from("rooms").select("*").order("room_number"),
        supabase.from("hostels").select("id, name").order("name"),
        supabase.from("profiles").select("*"),
      ]);

      if (allocationsRes.error) throw allocationsRes.error;
      if (roomsRes.error) throw roomsRes.error;
      if (hostelsRes.error) throw hostelsRes.error;

      setAllocations(allocationsRes.data || []);
      setRooms(roomsRes.data || []);
      setHostels(hostelsRes.data || []);
      
      // Filter to get only students (those with student_id)
      const studentProfiles = (studentsRes.data || []).filter(p => p.student_id);
      setStudents(studentProfiles);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load allocations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAllocation = async () => {
    if (!selectedStudent || !selectedRoom) {
      toast({
        title: "Error",
        description: "Please select a student and room",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if student already has an active allocation
      const { data: existing } = await supabase
        .from("room_allocations")
        .select("id")
        .eq("student_id", selectedStudent)
        .eq("is_active", true)
        .limit(1);

      if (existing && existing.length > 0) {
        toast({
          title: "Error",
          description: "This student already has an active room allocation. Deactivate it first.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("room_allocations").insert({
        room_id: selectedRoom,
        student_id: selectedStudent,
        allocated_by: user?.id,
        start_date: startDate || new Date().toISOString().split("T")[0],
        end_date: endDate || null,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Allocation created successfully" });
      setIsAddDialogOpen(false);
      setSelectedStudent("");
      setSelectedRoom("");
      setStartDate("");
      setEndDate("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create allocation",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (allocation: Allocation) => {
    try {
      const { error } = await supabase
        .from("room_allocations")
        .update({ is_active: !allocation.is_active })
        .eq("id", allocation.id);

      if (error) throw error;
      toast({ title: "Success", description: "Allocation updated" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update allocation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllocation = async (allocationId: string) => {
    if (!confirm("Are you sure you want to delete this allocation?")) return;

    try {
      const { error } = await supabase.from("room_allocations").delete().eq("id", allocationId);
      if (error) throw error;
      toast({ title: "Success", description: "Allocation deleted" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete allocation",
        variant: "destructive",
      });
    }
  };

  const getStudentName = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.full_name || "Unknown";
  };

  const getStudentId = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    return student?.student_id || "";
  };

  const getRoomInfo = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return { room: "Unknown", hostel: "Unknown" };
    const hostel = hostels.find(h => h.id === room.hostel_id);
    return { room: room.room_number, hostel: hostel?.name || "Unknown" };
  };

  const filteredAllocations = allocations.filter((allocation) => {
    const studentName = getStudentName(allocation.student_id).toLowerCase();
    const studentId = getStudentId(allocation.student_id).toLowerCase();
    const matchesSearch = studentName.includes(searchQuery.toLowerCase()) || 
                          studentId.includes(searchQuery.toLowerCase());
    
    const roomInfo = getRoomInfo(allocation.room_id);
    const room = rooms.find(r => r.id === allocation.room_id);
    const matchesHostel = selectedHostel === "all" || room?.hostel_id === selectedHostel;
    
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && allocation.is_active) ||
      (selectedStatus === "inactive" && !allocation.is_active);
    
    return matchesSearch && matchesHostel && matchesStatus;
  });

  const activeCount = allocations.filter(a => a.is_active).length;
  const inactiveCount = allocations.filter(a => !a.is_active).length;

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
        title="Room Allocations" 
        subtitle="Assign students to hostel rooms" 
      />
      
      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{allocations.length}</p>
                <p className="text-sm text-muted-foreground">Total Allocations</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inactiveCount}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by student name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedHostel} onValueChange={setSelectedHostel}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Hostel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Hostels</SelectItem>
                {hostels.map((hostel) => (
                  <SelectItem key={hostel.id} value={hostel.id}>
                    {hostel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gradient-primary gap-2">
                <Plus className="h-4 w-4" />
                New Allocation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Room Allocation</DialogTitle>
                <DialogDescription>
                  Assign a student to a room.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="student">Student *</Label>
                  <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.full_name} ({student.student_id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room">Room *</Label>
                  <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => {
                        const hostel = hostels.find(h => h.id === room.hostel_id);
                        return (
                          <SelectItem key={room.id} value={room.id}>
                            {hostel?.name} - Room {room.room_number}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Input 
                      id="start-date" 
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="end-date">End Date (optional)</Label>
                    <Input 
                      id="end-date" 
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
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
                  onClick={handleAddAllocation}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Allocation
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Hostel</TableHead>
                <TableHead className="font-semibold">Room</TableHead>
                <TableHead className="font-semibold">Start Date</TableHead>
                <TableHead className="font-semibold">End Date</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAllocations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No allocations found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAllocations.map((allocation, index) => {
                  const roomInfo = getRoomInfo(allocation.room_id);
                  return (
                    <TableRow 
                      key={allocation.id} 
                      className={cn(
                        "table-row-hover opacity-0 animate-fade-in",
                        `stagger-${Math.min(index + 1, 4)}`
                      )}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{getStudentName(allocation.student_id)}</p>
                          <p className="text-xs text-muted-foreground">{getStudentId(allocation.student_id)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{roomInfo.hostel}</TableCell>
                      <TableCell>Room {roomInfo.room}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(allocation.start_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {allocation.end_date ? new Date(allocation.end_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "font-medium cursor-pointer",
                            allocation.is_active 
                              ? "bg-success/10 text-success border-success/20" 
                              : "bg-muted text-muted-foreground"
                          )}
                          onClick={() => handleToggleActive(allocation)}
                        >
                          {allocation.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleDeleteAllocation(allocation.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredAllocations.length}</span> of{" "}
            <span className="font-medium">{allocations.length}</span> allocations
          </p>
        </div>
      </div>
    </AppLayout>
  );
};

export default Allocations;
