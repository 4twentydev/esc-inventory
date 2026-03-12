import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partId, fromLocationId, toLocationId, qty } = await req.json();

    if (!partId || !fromLocationId || !toLocationId || !qty || qty <= 0) {
      return NextResponse.json({ error: "Missing required fields or invalid qty" }, { status: 400 });
    }

    if (fromLocationId === toLocationId) {
      return NextResponse.json({ error: "Source and destination locations must be different" }, { status: 400 });
    }

    // Check source inventory
    let fromInventory = await db
      .select()
      .from(schema.inventory)
      .where(and(eq(schema.inventory.partId, partId), eq(schema.inventory.locationId, fromLocationId)))
      .limit(1);

    if (fromInventory.length === 0 || fromInventory[0].qty < qty) {
      return NextResponse.json({ error: "Insufficient stock at source location" }, { status: 400 });
    }

    // Deduct from source
    await db
      .update(schema.inventory)
      .set({ qty: fromInventory[0].qty - qty, updatedAt: new Date() })
      .where(eq(schema.inventory.id, fromInventory[0].id));

    // Add to destination
    let toInventory = await db
      .select()
      .from(schema.inventory)
      .where(and(eq(schema.inventory.partId, partId), eq(schema.inventory.locationId, toLocationId)))
      .limit(1);

    if (toInventory.length > 0) {
      await db
        .update(schema.inventory)
        .set({ qty: toInventory[0].qty + qty, updatedAt: new Date() })
        .where(eq(schema.inventory.id, toInventory[0].id));
    } else {
      await db.insert(schema.inventory).values({
        partId,
        locationId: toLocationId,
        qty,
      });
    }

    // Log the shuffle movement
    await db.insert(schema.movements).values({
      userId: user.id,
      partId,
      fromLocationId,
      toLocationId,
      deltaQty: qty,
      actionType: "shuffle",
      note: "Admin item shuffle",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Shuffle error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
