import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { ShuffleClient } from "./shuffle-client";
import { eq, gt } from "drizzle-orm";

export default async function ShufflePage() {
  await requireAdmin();

  // Load parts and locations
  const locations = await db.select().from(schema.locations);
  const allParts = await db.select().from(schema.parts);
  
  // To shuffle, we need inventory records where qty > 0
  const activeInventory = await db.select().from(schema.inventory).where(gt(schema.inventory.qty, 0));

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shuffle Inventory</h1>
            <p className="text-muted-foreground mt-1 text-sm">Transfer stock from one zone to another</p>
          </div>
        </header>

        <ShuffleClient 
          parts={allParts as any} 
          inventory={activeInventory as any} 
          locations={locations as any} 
        />
      </div>
    </div>
  );
}
