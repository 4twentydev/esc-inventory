"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ShuffleClient({ parts, inventory, locations }: any) {
  const [selectedPartId, setSelectedPartId] = useState<string>("");
  const [fromLocationId, setFromLocationId] = useState<string>("");
  const [toLocationId, setToLocationId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Parts that currently have stock somewhere
  const partsWithStock = useMemo(() => {
    const partIdsSet = new Set(inventory.map((i: any) => i.partId));
    return parts.filter((p: any) => partIdsSet.has(p.id));
  }, [parts, inventory]);

  const availableSourceLocations = useMemo(() => {
    if (!selectedPartId) return [];
    return inventory
      .filter((i: any) => i.partId === selectedPartId)
      .map((i: any) => ({
        ...i,
        locationName: locations.find((l: any) => l.id === i.locationId)?.name || "Unknown",
      }));
  }, [selectedPartId, inventory, locations]);

  const maxQty = useMemo(() => {
    if (!fromLocationId) return 0;
    const invData = availableSourceLocations.find((l: any) => l.locationId === fromLocationId);
    return invData ? invData.qty : 0;
  }, [fromLocationId, availableSourceLocations]);

  const handleShuffle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId || !fromLocationId || !toLocationId || qty <= 0 || qty > maxQty) return;

    setLoading(true);

    try {
      const res = await fetch("/api/admin/shuffle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partId: selectedPartId, fromLocationId, toLocationId, qty }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Shuffle failed");

      toast.success("Shuffle complete", {
        description: `Successfully moved ${qty} items.`
      });
      // Clear form
      setSelectedPartId("");
      setFromLocationId("");
      setToLocationId("");
      setQty(1);
      
      // Refresh to get updated inventory
      router.refresh();
      window.location.reload(); // Hard refresh to guarantee fresh inventory prop state immediately
    } catch (err) {
      toast.error("Error", { description: err instanceof Error ? err.message : "Failed to shuffle" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-md">
      <CardContent className="pt-6">
        <form onSubmit={handleShuffle} className="space-y-6">
          <div className="space-y-2">
            <Label>Select Part to Move</Label>
            <select
              className="w-full flex h-11 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedPartId}
              onChange={(e) => {
                setSelectedPartId(e.target.value);
                setFromLocationId("");
                setToLocationId("");
                setQty(1);
              }}
              required
            >
              <option value="" disabled>Search / Select part...</option>
              {partsWithStock.map((p: any) => (
                <option key={p.id} value={p.id}>{p.partId} - {p.partName}</option>
              ))}
            </select>
            {partsWithStock.length === 0 && <p className="text-xs text-muted-foreground mt-1">No parts have any stock recorded in the system.</p>}
          </div>

          {selectedPartId && (
            <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-end bg-surface p-6 rounded-xl border border-border">
              <div className="space-y-2 w-full">
                <Label>From Location</Label>
                <select
                  className="w-full flex h-11 items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Source...</option>
                  {availableSourceLocations.map((l: any) => (
                    <option key={l.locationId} value={l.locationId}>
                      {l.locationName} (Stock: {l.qty})
                    </option>
                  ))}
                </select>
              </div>

              <div className="hidden md:flex h-11 items-center justify-center text-muted-foreground pb-2">
                <ArrowRightLeft className="w-5 h-5 text-accent-secondary" />
              </div>

              <div className="space-y-2 w-full">
                <Label>To Location</Label>
                <select
                  className="w-full flex h-11 items-center justify-between rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-success"
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select Destination...</option>
                  {locations.map((l: any) => (
                    // Optionally disable the 'from' location inside the 'to' select
                    <option key={l.id} value={l.id} disabled={l.id === fromLocationId}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {fromLocationId && toLocationId && (
             <div className="space-y-2 border-l-2 border-primary pl-4 py-2">
               <Label>Quantity to Move (Max: {maxQty})</Label>
               <Input
                 type="number"
                 min="1"
                 max={maxQty}
                 value={qty || ""}
                 onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                 className="w-48 text-lg font-medium"
                 required
               />
             </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-lg mt-4" 
            disabled={!selectedPartId || !fromLocationId || !toLocationId || qty <= 0 || qty > maxQty || loading}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ArrowRightLeft className="w-5 h-5 mr-2" />}
            Execute Transfer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
