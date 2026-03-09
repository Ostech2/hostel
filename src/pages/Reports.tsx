import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayoutWithMenu as AppLayout } from "@/components/layout/AppLayout";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Download, FileText, Printer, Calendar, TrendingUp, Package, Building2, AlertTriangle, Users, FileSpreadsheet, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { WardenPerformance } from "@/components/reports/WardenPerformance";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { startOfWeek, startOfMonth, startOfYear, subMonths, isAfter, parseISO } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  furniture: "hsl(210, 85%, 35%)",
  consumables: "hsl(42, 95%, 55%)",
  electronics: "hsl(142, 72%, 40%)",
  other: "hsl(200, 98%, 39%)",
};

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("semester");
  const { role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categoryDistribution, setCategoryDistribution] = useState<{name: string; value: number; color: string}[]>([]);
  const [hostelInventory, setHostelInventory] = useState<{name: string; items: number; quantity: number}[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [activeHostels, setActiveHostels] = useState(0);
  const [allocatedStudents, setAllocatedStudents] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [inventoryDetails, setInventoryDetails] = useState<any[]>([]);
  const [allocationDetails, setAllocationDetails] = useState<any[]>([]);
  const [allHostels, setAllHostels] = useState<{id: string; name: string}[]>([]);

  // Print filter dialog state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printReportType, setPrintReportType] = useState<"inventory" | "allocation" | "both">("both");
  const [printHostel, setPrintHostel] = useState("all");
  const [printCategory, setPrintCategory] = useState("all");
  const printRef = useRef<HTMLDivElement>(null);

  const getFilterDate = (period: string): Date => {
    const now = new Date();
    switch (period) {
      case "week": return startOfWeek(now, { weekStartsOn: 1 });
      case "month": return startOfMonth(now);
      case "semester": return subMonths(startOfMonth(now), 5);
      case "year": return startOfYear(now);
      default: return startOfYear(now);
    }
  };

  useEffect(() => {
    const fetchReportData = async () => {
      const filterDate = getFilterDate(selectedPeriod);
      const filterISO = filterDate.toISOString();

      const [inventoryRes, hostelsRes, allocationsRes, roomsRes, studentsRes] = await Promise.all([
        supabase.from("inventory").select("id, item_name, category, quantity, min_stock_level, hostel_id, unit, created_at").gte("created_at", filterISO),
        supabase.from("hostels").select("id, name"),
        supabase.from("room_allocations").select("id, room_id, student_id, start_date, is_active").eq("is_active", true).gte("start_date", filterISO.split("T")[0]),
        supabase.from("rooms").select("id, hostel_id, room_number"),
        supabase.from("profiles").select("id, full_name, student_id"),
      ]);

      const inventory = inventoryRes.data || [];
      const hostels = hostelsRes.data || [];
      const allocations = allocationsRes.data || [];
      const rooms = roomsRes.data || [];
      const students = studentsRes.data || [];

      setAllHostels(hostels);

      setInventoryDetails(inventory.map((i) => ({
        ...i,
        hostel_name: hostels.find((h) => h.id === i.hostel_id)?.name || "Unknown",
      })));

      setAllocationDetails(allocations.map((a) => {
        const room = rooms.find((r) => r.id === a.room_id);
        const hostel = room ? hostels.find((h) => h.id === room.hostel_id) : null;
        const student = students.find((s) => s.id === a.student_id);
        return {
          student_name: student?.full_name || "Unknown",
          student_id_num: student?.student_id || "N/A",
          room_number: room?.room_number || "N/A",
          hostel_name: hostel?.name || "Unknown",
          hostel_id: room?.hostel_id || null,
          start_date: a.start_date,
        };
      }));

      // Stats
      let total = 0;
      inventory.forEach((item) => { total += item.quantity; });
      setTotalItems(total);
      setActiveHostels(hostels.length);
      setAllocatedStudents(allocations.length);
      setLowStockCount(inventory.filter((i) => i.min_stock_level !== null && i.quantity <= (i.min_stock_level ?? 0)).length);

      // Category distribution
      const catMap: Record<string, number> = {};
      inventory.forEach((item) => {
        catMap[item.category] = (catMap[item.category] || 0) + item.quantity;
      });
      setCategoryDistribution(
        Object.entries(catMap).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: CATEGORY_COLORS[name] || "hsl(200, 98%, 39%)",
        }))
      );

      // Hostel inventory
      const hostelMap: Record<string, { name: string; items: number; quantity: number }> = {};
      hostels.forEach((h) => {
        hostelMap[h.id] = { name: h.name, items: 0, quantity: 0 };
      });
      inventory.forEach((item) => {
        if (hostelMap[item.hostel_id]) {
          hostelMap[item.hostel_id].items += 1;
          hostelMap[item.hostel_id].quantity += item.quantity;
        }
      });
      setHostelInventory(Object.values(hostelMap).filter((h) => h.items > 0));
    };
    fetchReportData();
  }, [selectedPeriod]);

  // Compute filtered data for printing
  const filteredInventory = inventoryDetails.filter((i) => {
    const hostelMatch = printHostel === "all" || i.hostel_name === printHostel;
    const categoryMatch = printCategory === "all" || i.category === printCategory;
    return hostelMatch && categoryMatch;
  });

  const filteredAllocations = allocationDetails.filter((a) => {
    return printHostel === "all" || a.hostel_name === printHostel;
  });

  const uniqueCategories = Array.from(new Set(inventoryDetails.map((i) => i.category))).filter(Boolean);

  const handlePrint = () => {
    // Build print content
    const periodLabel: Record<string, string> = {
      week: "This Week",
      month: "This Month",
      semester: "This Semester",
      year: "This Year",
    };

    const hostelLabel = printHostel === "all" ? "All Hostels" : printHostel;
    const categoryLabel = printCategory === "all" ? "All Categories" : printCategory.charAt(0).toUpperCase() + printCategory.slice(1);
    const now = new Date().toLocaleString();

    let html = `
      <html>
      <head>
        <title>UCU Hostel Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a2e; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
          .badge { display: inline-block; background: #e8f0fe; color: #1a73e8; border-radius: 4px; padding: 2px 8px; font-size: 12px; margin-right: 6px; }
          h2 { font-size: 16px; margin-top: 28px; margin-bottom: 8px; border-bottom: 2px solid #1a73e8; padding-bottom: 4px; color: #1a73e8; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
          th { background: #1e5a96; color: white; padding: 8px 10px; text-align: left; }
          td { padding: 7px 10px; border-bottom: 1px solid #e0e0e0; }
          tr:nth-child(even) td { background: #f5f8ff; }
          .low-stock { color: #d32f2f; font-weight: bold; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>UCU Hostel Management System</h1>
        <div class="meta">
          Generated: ${now} &nbsp;|&nbsp;
          Period: <span class="badge">${periodLabel[selectedPeriod] || selectedPeriod}</span>
          Hostel: <span class="badge">${hostelLabel}</span>
          ${printReportType !== "allocation" ? `Category: <span class="badge">${categoryLabel}</span>` : ""}
        </div>
    `;

    if (printReportType === "inventory" || printReportType === "both") {
      html += `
        <h2>Inventory Report</h2>
        <table>
          <thead><tr><th>Item Name</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Min Stock</th><th>Hostel</th></tr></thead>
          <tbody>
            ${filteredInventory.length === 0
              ? `<tr><td colspan="6" style="text-align:center;color:#999;">No inventory data matches the selected filters.</td></tr>`
              : filteredInventory.map((i) => {
                  const isLow = i.min_stock_level !== null && i.quantity <= (i.min_stock_level ?? 0);
                  return `<tr>
                    <td>${i.item_name}</td>
                    <td>${i.category}</td>
                    <td class="${isLow ? 'low-stock' : ''}">${i.quantity}${isLow ? ' ⚠' : ''}</td>
                    <td>${i.unit || 'pcs'}</td>
                    <td>${i.min_stock_level ?? 'N/A'}</td>
                    <td>${i.hostel_name}</td>
                  </tr>`;
                }).join("")
            }
          </tbody>
        </table>
      `;
    }

    if (printReportType === "allocation" || printReportType === "both") {
      html += `
        <h2>Allocation Report</h2>
        <table>
          <thead><tr><th>Student Name</th><th>Student ID</th><th>Room</th><th>Hostel</th><th>Start Date</th></tr></thead>
          <tbody>
            ${filteredAllocations.length === 0
              ? `<tr><td colspan="5" style="text-align:center;color:#999;">No allocation data matches the selected filters.</td></tr>`
              : filteredAllocations.map((a) => `<tr>
                  <td>${a.student_name}</td>
                  <td>${a.student_id_num}</td>
                  <td>${a.room_number}</td>
                  <td>${a.hostel_name}</td>
                  <td>${a.start_date}</td>
                </tr>`).join("")
            }
          </tbody>
        </table>
      `;
    }

    html += `<div class="footer">UCU Hostel Management System &mdash; Confidential</div></body></html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); }, 400);
    }

    setPrintDialogOpen(false);
    toast({ title: "Print Dialog Opened", description: "Your filtered report is ready to print." });
  };

  const exportCSV = (reportType: "inventory" | "allocation" | "full") => {
    let csv = "";
    const now = new Date().toLocaleDateString();

    if (reportType === "inventory" || reportType === "full") {
      csv += "INVENTORY REPORT\n";
      csv += "Item Name,Category,Quantity,Unit,Min Stock,Hostel\n";
      inventoryDetails.forEach((i: any) => {
        csv += `"${i.item_name}","${i.category}",${i.quantity},"${i.unit || 'pcs'}","${i.min_stock_level ?? 'N/A'}","${i.hostel_name}"\n`;
      });
    }

    if (reportType === "full") csv += "\n";

    if (reportType === "allocation" || reportType === "full") {
      csv += "ALLOCATION REPORT\n";
      csv += "Student Name,Student ID,Room,Hostel,Start Date\n";
      allocationDetails.forEach((a: any) => {
        csv += `"${a.student_name}","${a.student_id_num}","${a.room_number}","${a.hostel_name}","${a.start_date}"\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportType}-report-${now}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV Downloaded", description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report exported as CSV.` });
  };

  const exportPDF = async (reportType: "inventory" | "allocation" | "full") => {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import("jspdf-autotable");
    const autoTable = autoTableModule.default;

    const doc = new jsPDF();
    const now = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text("UCU Hostel Management System", 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(100);

    if (reportType === "inventory" || reportType === "full") {
      doc.text(`Inventory Report — Generated: ${now}`, 14, 30);
      autoTable(doc, {
        startY: 36,
        head: [["Item Name", "Category", "Quantity", "Unit", "Min Stock", "Hostel"]],
        body: inventoryDetails.map((i: any) => [
          i.item_name,
          i.category,
          i.quantity,
          i.unit || "pcs",
          i.min_stock_level ?? "N/A",
          i.hostel_name,
        ]),
        theme: "striped",
        headStyles: { fillColor: [30, 90, 150] },
      });
    }

    if (reportType === "allocation" || reportType === "full") {
      if (reportType === "full") doc.addPage();
      const startY = reportType === "full" ? 20 : 36;
      if (reportType !== "full") {
        doc.text(`Allocation Report — Generated: ${now}`, 14, 30);
      } else {
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text("Allocation Report", 14, 14);
        doc.setFontSize(12);
        doc.setTextColor(100);
      }
      autoTable(doc, {
        startY,
        head: [["Student Name", "Student ID", "Room", "Hostel", "Start Date"]],
        body: allocationDetails.map((a: any) => [
          a.student_name,
          a.student_id_num,
          a.room_number,
          a.hostel_name,
          a.start_date,
        ]),
        theme: "striped",
        headStyles: { fillColor: [30, 90, 150] },
      });
    }

    const filename = reportType === "full" ? "full-report" : `${reportType}-report`;
    doc.save(`${filename}-${now}.pdf`);
    toast({ title: "PDF Downloaded", description: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report exported successfully.` });
  };

  return (
    <AppLayout>
      <AppHeader 
        title="Reports & Analytics" 
        subtitle="Generate reports and view inventory analytics" 
      />
      
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="semester">This Semester</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" onClick={() => setPrintDialogOpen(true)}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => exportCSV("full")}>
              <FileSpreadsheet className="h-4 w-4" />
              Export CSV
            </Button>
            <Button className="btn-gradient-primary gap-2" onClick={() => exportPDF("full")}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Total Items",        value: totalItems,        icon: Package,       color: "bg-primary/10 text-primary",   route: "/inventory" },
            { label: "Active Hostels",     value: activeHostels,     icon: Building2,     color: "bg-success/10 text-success",   route: "/hostels" },
            { label: "Allocated Students", value: allocatedStudents, icon: Users,         color: "bg-info/10 text-info",         route: "/allocations" },
            { label: "Low Stock Items",    value: lowStockCount,     icon: AlertTriangle, color: "bg-warning/10 text-warning",   route: "/inventory" },
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
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
                    <Icon className="h-6 w-6" />
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

        {/* Warden Performance - Admin Only */}
        {role === "admin" && <WardenPerformance />}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Inventory by Category</span>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => exportPDF("inventory")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(214, 20%, 88%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Hostel Inventory Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Inventory by Hostel</span>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => exportPDF("inventory")}>
                  <Download className="h-3 w-3 mr-1" />
                  Export PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hostelInventory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'hsl(215, 15%, 50%)', fontSize: 12 }} width={70} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        border: '1px solid hsl(214, 20%, 88%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="quantity" fill="hsl(210, 85%, 35%)" radius={[0, 4, 4, 0]} name="Total Quantity" />
                    <Bar dataKey="items" fill="hsl(42, 95%, 55%)" radius={[0, 4, 4, 0]} name="Item Types" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Reports (PDF)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: "Inventory Summary", desc: "Complete inventory list with details", icon: Package, pdfAction: () => exportPDF("inventory"), csvAction: () => exportCSV("inventory") },
                { title: "Allocation Report", desc: "All active allocations by hostel", icon: Building2, pdfAction: () => exportPDF("allocation"), csvAction: () => exportCSV("allocation") },
                { title: "Full Report", desc: "Inventory + allocations combined", icon: FileText, pdfAction: () => exportPDF("full"), csvAction: () => exportCSV("full") },
                { title: "Low Stock Alert", desc: "Items below minimum stock levels", icon: AlertTriangle, pdfAction: () => exportPDF("inventory"), csvAction: () => exportCSV("inventory") },
              ].map((report, index) => (
                <div
                  key={report.title}
                  role="button"
                  tabIndex={0}
                  onClick={report.pdfAction}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") report.pdfAction(); }}
                  className={cn(
                    "flex flex-col items-start gap-3 rounded-xl border border-border p-4 text-left",
                    "cursor-pointer select-none",
                    "transition-all duration-150",
                    "hover:border-primary hover:bg-muted/50 hover:shadow-md",
                    "active:scale-[0.97] active:shadow-inner active:bg-primary/5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "opacity-0 animate-fade-in",
                    `stagger-${index + 1}`
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-active:scale-90">
                    <report.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{report.title}</p>
                    <p className="text-sm text-muted-foreground">{report.desc}</p>
                  </div>
                  <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={report.pdfAction}>
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={report.csvAction}>
                      <FileSpreadsheet className="h-3 w-3" /> CSV
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Print Filter Dialog ── */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filter Report for Printing
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Report Type */}
            <div className="space-y-1.5">
              <Label htmlFor="print-report-type">Report Type</Label>
              <Select value={printReportType} onValueChange={(v) => setPrintReportType(v as any)}>
                <SelectTrigger id="print-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Inventory + Allocations</SelectItem>
                  <SelectItem value="inventory">Inventory Only</SelectItem>
                  <SelectItem value="allocation">Allocations Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hostel Filter */}
            <div className="space-y-1.5">
              <Label htmlFor="print-hostel">Hostel</Label>
              <Select value={printHostel} onValueChange={setPrintHostel}>
                <SelectTrigger id="print-hostel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Hostels</SelectItem>
                  {allHostels.map((h) => (
                    <SelectItem key={h.id} value={h.name}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter – only for inventory */}
            {printReportType !== "allocation" && (
              <div className="space-y-1.5">
                <Label htmlFor="print-category">Category</Label>
                <Select value={printCategory} onValueChange={setPrintCategory}>
                  <SelectTrigger id="print-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview row counts */}
            <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
              {(printReportType === "inventory" || printReportType === "both") && (
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredInventory.length}</span> inventory item{filteredInventory.length !== 1 ? "s" : ""} will be printed
                </p>
              )}
              {(printReportType === "allocation" || printReportType === "both") && (
                <p className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{filteredAllocations.length}</span> allocation record{filteredAllocations.length !== 1 ? "s" : ""} will be printed
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button className="gap-2 btn-gradient-primary" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Reports;
