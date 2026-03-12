"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Search, Filter } from "lucide-react";
import { motion } from "framer-motion";

export function PullClient({ parts, inventory, locations, categories }: any) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [selectedPart, setSelectedPart] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"pull" | "return">("pull");
  
  const [formState, setFormState] = useState({
    locationId: "",
    qty: 1,
    jobNumber: "",
    note: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredParts = useMemo(() => {
    return parts.filter((p: any) => {
      const matchSearch = p.partName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.partId?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory ? p.categoryId === selectedCategory : true;
      return matchSearch && matchCat;
    });
  }, [parts, searchTerm, selectedCategory]);

  const handlePartClick = (part: any) => {
    setSelectedPart(part);
    setActionType("pull");
    setFormState({ locationId: "", qty: 1, jobNumber: "", note: "" });
    setIsDialogOpen(true);
  };

  const currentPartInventory = useMemo(() => {
    if (!selectedPart) return [];
    return inventory
      .filter((i: any) => i.partId === selectedPart.id)
      .map((i: any) => ({
        ...i,
        locationName: locations.find((l: any) => l.id === i.locationId)?.name || "Unknown Zone"
      }));
  }, [selectedPart, inventory, locations]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart || !formState.locationId || formState.qty <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId: selectedPart.id,
          locationId: formState.locationId,
          actionType,
          qty: formState.qty,
          jobNumber: formState.jobNumber,
          note: formState.note
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Movement failed");

      toast.success("Successfully " + (actionType === 'pull' ? 'pulled' : 'returned') + " " + formState.qty + " units.");
      setIsDialogOpen(false);
      // In a real app we would use router.refresh() here or optimistic updates, but for now user can refresh page or we manipulate state
      window.location.reload();
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Unknown error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-surface p-4 rounded-xl border border-border">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            placeholder="Search by Part ID or Name..." 
            className="pl-10 h-12"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto w-full pb-2 md:pb-0">
          <Button 
            variant={selectedCategory === null ? "default" : "outline"} 
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.map((c: any) => (
            <Button 
              key={c.id} 
              variant={selectedCategory === c.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Parts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredParts.map((part: any, i: number) => {
          // Retrieve metadata keys for display
          const md = part.metadata || {};
          const firstTwoFeatures = Object.keys(md).slice(0, 2);

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.5) }}
              key={part.id}
            >
              <Card 
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all h-full overflow-hidden"
                onClick={() => handlePartClick(part)}
              >
                {/* Profile Image (fallback to a placeholder if none) */}
                <div className="aspect-square bg-surface-muted border-b border-border flex items-center justify-center p-4 relative">
                  {part.profileImage ? (
                    <img 
                      src={"/parts/" + part.profileImage} 
                      alt={part.partId}
                      className="object-contain w-full h-full"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-muted-foreground text-sm font-medium">No Image</span>
                  )}
                  {/* Total Qty Badge */}
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm border border-border px-2 py-1 rounded text-xs font-bold shadow-sm">
                    {inventory.filter((inv:any) => inv.partId === part.id).reduce((a:number,b:any) => a + b.qty, 0)} In Stock
                  </div>
                </div>
                <CardContent className="p-4 flex flex-col gap-1">
                  <h3 className="font-semibold text-lg line-clamp-1 truncate" title={part.partId}>{part.partId}</h3>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    {firstTwoFeatures.map(k => (
                      <div key={k} className="flex justify-between truncate">
                        <span className="text-xs uppercase opacity-70">{k}:</span>
                        <span className="text-xs font-medium truncate ml-2" title={String(md[k])}>{String(md[k])}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Action Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        {selectedPart && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Movement: {selectedPart.partId}</DialogTitle>
              <DialogDescription>Record a material transfer for this part.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="flex gap-2">
                <Button 
                  type="button" 
                  variant={actionType === "pull" ? "default" : "outline"} 
                  className="flex-1"
                  onClick={() => {
                    setActionType("pull");
                    setFormState(p => ({ ...p, locationId: "" }));
                  }}
                >
                  Pull (-Qty)
                </Button>
                <Button 
                  type="button" 
                  variant={actionType === "return" ? "default" : "outline"} 
                  className="flex-1"
                  onClick={() => {
                    setActionType("return");
                    setFormState(p => ({ ...p, locationId: "" }));
                  }}
                >
                  Return (+Qty)
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Zone / Location</Label>
                <select 
                  className="w-full flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formState.locationId}
                  onChange={(e) => setFormState({ ...formState, locationId: e.target.value })}
                  required
                >
                  <option value="" disabled>Select a location...</option>
                  {/* If pulling, only show locations with > 0 qty. If returning, show all or let them create one... well we just show all existing locations from the zones. */}
                  {actionType === "pull" 
                    ? currentPartInventory.filter((i:any) => i.qty > 0).map((inv: any) => (
                        <option key={inv.locationId} value={inv.locationId}>
                          {inv.locationName} (Qty: {inv.qty})
                        </option>
                      ))
                    : locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))
                  }
                </select>
                {actionType === "pull" && currentPartInventory.filter((i:any) => i.qty > 0).length === 0 && (
                  <p className="text-xs text-destructive mt-1">No stock available to pull.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Quantity to {actionType}</Label>
                <Input 
                  type="number" 
                  min="1" 
                  value={formState.qty} 
                  onChange={(e) => setFormState({ ...formState, qty: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Job Number (Optional)</Label>
                <Input 
                  placeholder="e.g. 12345"
                  value={formState.jobNumber} 
                  onChange={(e) => setFormState({ ...formState, jobNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Note (Optional)</Label>
                <Input 
                  placeholder="Reason for movement..."
                  value={formState.note} 
                  onChange={(e) => setFormState({ ...formState, note: e.target.value })}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !formState.locationId || (actionType === "pull" && currentPartInventory.filter((i:any) => i.qty > 0).length === 0)}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm {actionType === "pull" ? "Pull" : "Return"}
                </Button>
              </DialogFooter>
            </form>

          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
