import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partId, locationId, actionType, qty, jobNumber, note } = await req.json();

    if (!partId || !locationId || !actionType || !qty || qty <= 0) {
      return NextResponse.json({ error: "Missing required fields or invalid qty" }, { status: 400 });
    }

    if (actionType !== "pull" && actionType !== "return") {
      return NextResponse.json({ error: "Invalid action type" }, { status: 400 });
    }

    // Upsert or update inventory
    let existingInventory = await db
      .select()
      .from(schema.inventory)
      .where(and(eq(schema.inventory.partId, partId), eq(schema.inventory.locationId, locationId)))
      .limit(1);

    const delta = actionType === "pull" ? -qty : qty;
    let newQty = delta;

    if (existingInventory.length > 0) {
      newQty = existingInventory[0].qty + delta;
      if (newQty < 0) {
        return NextResponse.json({ error: "Insufficient stock to pull" }, { status: 400 });
      }

      await db
        .update(schema.inventory)
        .set({ qty: newQty, updatedAt: new Date() })
        .where(eq(schema.inventory.id, existingInventory[0].id));
    } else {
      if (actionType === "pull") {
        return NextResponse.json({ error: "Cannot pull from a location with 0 stock" }, { status: 400 });
      }
      await db.insert(schema.inventory).values({
        partId,
        locationId,
        qty: newQty,
      });
    }

    // Log the movement
    await db.insert(schema.movements).values({
      userId: user.id,
      partId,
      fromLocationId: actionType === "pull" ? locationId : null,
      toLocationId: actionType === "return" ? locationId : null,
      deltaQty: delta,
      actionType,
      jobNumber: jobNumber || null,
      note: note || null,
    });

    return NextResponse.json({ success: true, newQty });
  } catch (error) {
    console.error("Movement error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
