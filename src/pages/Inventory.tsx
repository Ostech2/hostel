import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayoutWithMenu as AppLayout } from "@/components/layout/AppLayout";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Filter, Download, Edit, Trash2, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface InventoryItem {
  id: string;
  hostel_id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string | null;
  min_stock_level: number | null;
  notes: string | null;
  created_at: string;
}

interface Hostel {
  id: string;
  name: string;
}

const categories = ["furniture", "consumables", "electronics", "other"] as const;

const categoryLabels: Record<string, string> = {
  furniture: "Furniture",
  consumables: "Consumables",
  electronics: "Electronics",
  other: "Other",
};

const Inventory = () => {
  const { user, role } = useAuth();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedHostel, setSelectedHostel] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState<string>("furniture");
  const [itemHostel, setItemHostel] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [itemUnit, setItemUnit] = useState("pcs");
  const [itemMinStock, setItemMinStock] = useState("5");
  const [itemNotes, setItemNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inventoryRes, hostelsRes] = await Promise.all([
        supabase.from("inventory").select("*").order("item_name"),
        supabase.from("hostels").select("id, name").order("name"),
      ]);

      if (inventoryRes.error) throw inventoryRes.error;
      if (hostelsRes.error) throw hostelsRes.error;

      setInventory(inventoryRes.data || []);
      setHostels(hostelsRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load inventory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setItemName("");
    setItemCategory("furniture");
    setItemHostel("");
    setItemQuantity("");
    setItemUnit("pcs");
    setItemMinStock("5");
    setItemNotes("");
  };

  const handleAddItem = async () => {
    if (!itemName.trim() || !itemHostel) {
      toast({
        title: "Error",
        description: "Item name and hostel are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("inventory").insert({
        item_name: itemName.trim(),
        category: itemCategory as "furniture" | "consumables" | "electronics" | "other",
        hostel_id: itemHostel,
        quantity: parseInt(itemQuantity) || 0,
        unit: itemUnit || "pcs",
        min_stock_level: parseInt(itemMinStock) || 5,
        notes: itemNotes.trim() || null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Item added successfully" });
      setIsAddDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = async () => {
    if (!editingItem || !itemName.trim()) {
      toast({
        title: "Error",
        description: "Item name is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("inventory")
        .update({
          item_name: itemName.trim(),
          category: itemCategory as "furniture" | "consumables" | "electronics" | "other",
          quantity: parseInt(itemQuantity) || 0,
          unit: itemUnit || "pcs",
          min_stock_level: parseInt(itemMinStock) || 5,
          notes: itemNotes.trim() || null,
        })
        .eq("id", editingItem.id);

      if (error) throw error;

      toast({ title: "Success", description: "Item updated successfully" });
      setIsEditDialogOpen(false);
      setEditingItem(null);
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      const { error } = await supabase.from("inventory").delete().eq("id", itemId);
      if (error) throw error;
      toast({ title: "Success", description: "Item deleted" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setItemCategory(item.category);
    setItemQuantity(item.quantity.toString());
    setItemUnit(item.unit || "pcs");
    setItemMinStock((item.min_stock_level || 5).toString());
    setItemNotes(item.notes || "");
    setIsEditDialogOpen(true);
  };

  const getHostelName = (hostelId: string) => {
    const hostel = hostels.find(h => h.id === hostelId);
    return hostel?.name || "Unknown";
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { label: "Out of Stock", className: "bg-destructive/10 text-destructive border-destructive/20" };
    if (item.quantity < (item.min_stock_level || 5)) return { label: "Low Stock", className: "bg-warning/10 text-warning border-warning/20" };
    return { label: "In Stock", className: "bg-success/10 text-success border-success/20" };
  };

  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
    const matchesHostel = selectedHostel === "all" || item.hostel_id === selectedHostel;
    return matchesSearch && matchesCategory && matchesHostel;
  });

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
        title="Inventory Management" 
        subtitle="Manage all hostel inventory items" 
      />
      
      <div className="p-6 space-y-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex flex-1 gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {categoryLabels[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gradient-primary gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Inventory Item</DialogTitle>
                <DialogDescription>
                  Enter the details of the new inventory item.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Item Name *</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g., Single Bed Frame"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={itemCategory} onValueChange={setItemCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {categoryLabels[cat]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="hostel">Hostel *</Label>
                    <Select value={itemHostel} onValueChange={setItemHostel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hostel" />
                      </SelectTrigger>
                      <SelectContent>
                        {hostels.map((hostel) => (
                          <SelectItem key={hostel.id} value={hostel.id}>
                            {hostel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input 
                      id="quantity" 
                      type="number" 
                      placeholder="0"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Input 
                      id="unit" 
                      placeholder="pcs"
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="minStock">Min Stock</Label>
                    <Input 
                      id="minStock" 
                      type="number" 
                      placeholder="5"
                      value={itemMinStock}
                      onChange={(e) => setItemMinStock(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Additional notes..."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button 
                  className="btn-gradient-primary" 
                  onClick={handleAddItem}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Item
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
                <TableHead className="font-semibold">Item Name</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Hostel</TableHead>
                <TableHead className="font-semibold text-center">Quantity</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item, index) => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <TableRow 
                      key={item.id} 
                      className={cn(
                        "table-row-hover opacity-0 animate-fade-in",
                        `stagger-${Math.min(index + 1, 4)}`
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Package className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-medium">{item.item_name}</span>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.notes}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{categoryLabels[item.category] || item.category}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{getHostelName(item.hostel_id)}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{item.quantity}</span>
                        <span className="text-muted-foreground"> {item.unit}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("font-medium", stockStatus.className)}>
                          {stockStatus.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleDeleteItem(item.id)}
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
            Showing <span className="font-medium">{filteredItems.length}</span> of{" "}
            <span className="font-medium">{inventory.length}</span> items
          </p>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>
              Update the item details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Item Name *</Label>
              <Input 
                id="edit-name" 
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={itemCategory} onValueChange={setItemCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-quantity">Quantity</Label>
                <Input 
                  id="edit-quantity" 
                  type="number"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Input 
                  id="edit-unit"
                  value={itemUnit}
                  onChange={(e) => setItemUnit(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-minStock">Min Stock Level</Label>
                <Input 
                  id="edit-minStock" 
                  type="number"
                  value={itemMinStock}
                  onChange={(e) => setItemMinStock(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea 
                id="edit-notes"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingItem(null); resetForm(); }}>
              Cancel
            </Button>
            <Button 
              className="btn-gradient-primary" 
              onClick={handleEditItem}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Inventory;
