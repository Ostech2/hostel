import { useState, useEffect, useRef } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, UserCheck, Loader2, Calendar, ChevronsUpDown, Check } from "lucide-react";
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

  // Combobox open states
  const [studentComboOpen, setStudentComboOpen] = useState(false);
  const [roomComboOpen, setRoomComboOpen] = useState(false);

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

      // Check if room is full (max 4 students per room)
      const MAX_ROOM_CAPACITY = 4;
      const { data: roomOccupants, error: occError } = await supabase
        .from("room_allocations")
        .select("id")
        .eq("room_id", selectedRoom)
        .eq("is_active", true);

      if (!occError && roomOccupants && roomOccupants.length >= MAX_ROOM_CAPACITY) {
        const room = rooms.find(r => r.id === selectedRoom);
        const hostel = room ? hostels.find(h => h.id === room.hostel_id) : null;
        const roomLabel = room ? `${hostel?.name || "Unknown"} - Room ${room.room_number}` : "This room";
        toast({
          title: "Room Full",
          description: `${roomLabel} already has ${roomOccupants.length} students (max ${MAX_ROOM_CAPACITY}). Please choose another room.`,
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

  // Helper for selected labels in comboboxes
  const selectedStudentLabel = selectedStudent
    ? (() => {
        const s = students.find((s) => s.id === selectedStudent);
        return s ? `${s.full_name} (${s.student_id})` : "";
      })()
    : "";

  const selectedRoomLabel = selectedRoom
    ? (() => {
        const r = rooms.find((r) => r.id === selectedRoom);
        if (!r) return "";
        const h = hostels.find((h) => h.id === r.hostel_id);
        return `${h?.name || "Unknown"} - Room ${r.room_number}`;
      })()
    : "";

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
          {[
            { label: "Total Allocations", value: allocations.length, icon: UserCheck, color: "bg-primary/10 text-primary",               filter: "all" },
            { label: "Active",            value: activeCount,         icon: UserCheck, color: "bg-success/10 text-success",               filter: "active" },
            { label: "Inactive",          value: inactiveCount,       icon: UserCheck, color: "bg-muted text-muted-foreground",           filter: "inactive" },
          ].map(({ label, value, icon: Icon, color, filter }) => (
            <div
              key={label}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedStatus(filter)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedStatus(filter); }}
              className={cn(
                "stat-card cursor-pointer select-none transition-all duration-150 group",
                "hover:shadow-md hover:border-primary/40",
                "active:scale-[0.97] active:shadow-inner",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                selectedStatus === filter && "ring-2 ring-primary border-primary/50 shadow-md"
              )}
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
                {/* ── Searchable Student Combobox ── */}
                <div className="grid gap-2">
                  <Label>Student *</Label>
                  <Popover open={studentComboOpen} onOpenChange={setStudentComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={studentComboOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedStudentLabel || "Type to search student..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by name or ID..." />
                        <CommandList>
                          <CommandEmpty>No student found.</CommandEmpty>
                          <CommandGroup>
                            {students.map((student) => (
                              <CommandItem
                                key={student.id}
                                value={`${student.full_name} ${student.student_id}`}
                                onSelect={() => {
                                  setSelectedStudent(student.id);
                                  setStudentComboOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedStudent === student.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{student.full_name}</span>
                                  <span className="text-xs text-muted-foreground">{student.student_id}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* ── Searchable Room Combobox ── */}
                <div className="grid gap-2">
                  <Label>Room *</Label>
                  <Popover open={roomComboOpen} onOpenChange={setRoomComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={roomComboOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedRoomLabel || "Type to search room..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search by hostel or room number..." />
                        <CommandList>
                          <CommandEmpty>No room found.</CommandEmpty>
                          <CommandGroup>
                            {rooms.map((room) => {
                              const hostel = hostels.find(h => h.id === room.hostel_id);
                              const label = `${hostel?.name || "Unknown"} - Room ${room.room_number}`;
                              return (
                                <CommandItem
                                  key={room.id}
                                  value={label}
                                  onSelect={() => {
                                    setSelectedRoom(room.id);
                                    setRoomComboOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedRoom === room.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{hostel?.name || "Unknown"}</span>
                                    <span className="text-xs text-muted-foreground">Room {room.room_number} · Capacity {room.capacity}</span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
