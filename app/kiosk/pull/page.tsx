import { requireAuth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { PullClient } from "./pull-client";
import { eq } from "drizzle-orm";

export default async function PullPage() {
  const user = await requireAuth();

  // Fetch static lookups needed for the client
  const locations = await db.select().from(schema.locations);
  const categories = await db.select().from(schema.categories);
  
  // Fetch parts. Since parts can have multiple inventory locations, we fetch them separately or joined.
  // For simplicity, we just fetch all parts, and their inventory maps.
  const allParts = await db.select().from(schema.parts);
  const allInventory = await db.select().from(schema.inventory);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="flex items-center justify-between pb-4 border-b border-border">
          <h1 className="text-3xl font-bold tracking-tight">Kiosk: Pull & Return</h1>
          <span className="text-sm text-muted-foreground bg-surface px-4 py-2 rounded-full border border-border">
            User: {user.name}
          </span>
        </header>

        <PullClient 
          parts={allParts as any} 
          inventory={allInventory as any} 
          locations={locations as any} 
          categories={categories as any} 
        />
      </div>
    </div>
  );
}
