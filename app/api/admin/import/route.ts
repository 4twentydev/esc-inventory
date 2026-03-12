import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import * as XLSX from "xlsx";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clearDb = formData.get("clearDb") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    // Find sheets leniently
    const getSheet = (possibleNames: string[]) => {
      const name = workbook.SheetNames.find((sn) =>
        possibleNames.includes(sn.trim().toLowerCase())
      );
      return name ? workbook.Sheets[name] : null;
    };

    const categoriesSheet = getSheet(["categories", "category"]);
    const zonesSheet = getSheet(["zones", "zone", "locations", "location"]);
    const partsSheet = getSheet(["parts list", "parts_list", "parts", "part", "inventory"]);

    if (!partsSheet) {
      return NextResponse.json(
        { error: "Could not find a 'Parts List' sheet." },
        { status: 400 }
      );
    }

    // Clear DB if requested
    if (clearDb) {
      await db.delete(schema.movements);
      await db.delete(schema.inventory);
      await db.delete(schema.parts);
      await db.delete(schema.locations);
      await db.delete(schema.categories);
    }

    const report = {
      categories: 0,
      locations: 0,
      parts: 0,
    };

    // 1. Process Categories
    const categoryMap = new Map<string, string>(); // name (lowercase) -> db UUID
    if (categoriesSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(categoriesSheet);
      for (const row of rows) {
        const name = String(row["Name"] || row["name"] || "").trim();
        const desc = String(row["Description"] || row["description"] || "").trim();
        if (!name) continue;

        let categoryId: string;
        const existing = await db.select().from(schema.categories).where(eq(schema.categories.name, name)).limit(1);
        
        if (existing.length > 0) {
          categoryId = existing[0].id;
        } else {
          const inserted = await db.insert(schema.categories).values({ name, description: desc || null }).returning({ id: schema.categories.id });
          categoryId = inserted[0].id;
          report.categories++;
        }
        categoryMap.set(name.toLowerCase(), categoryId);
      }
    }

    // 2. Process Zones (Locations)
    if (zonesSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(zonesSheet);
      for (const row of rows) {
        const name = String(row["Name"] || row["name"] || row["Zone"] || row["zone"] || "").trim();
        if (!name) continue;

        const existing = await db.select().from(schema.locations).where(eq(schema.locations.name, name)).limit(1);
        if (existing.length === 0) {
          await db.insert(schema.locations).values({ name });
          report.locations++;
        }
      }
    }

    // 3. Process Parts
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(partsSheet);
    for (const row of rows) {
      // Find ID column
      const idStr = String(row["Part ID"] || row["Part_ID"] || row["part_id"] || row["ID"] || row["id"] || "").trim();
      if (!idStr) continue; // Skip rows without ID

      // Extract Category if present to link it properly
      const catValStr = String(row["Category"] || row["category"] || "").trim();
      let categoryId: string | null = null;
      if (catValStr) {
        categoryId = categoryMap.get(catValStr.toLowerCase()) || null;
      }

      // Extract Profile Image if present (though user said they'll use a zip, we can still respect a column)
      const profileImage = String(row["Profile Image"] || row["profile_image"] || row["Image"] || "").trim();

      // Everything else goes to JSONB Metadata
      const metadata: Record<string, string | number | boolean> = {};
      for (const [key, value] of Object.entries(row)) {
        if (value === undefined || value === null || value === "") continue;
        const kLow = key.toLowerCase().trim();
        // Skip keys we already handled explicitly
        if (["part id", "part_id", "id", "category"].includes(kLow)) {
          continue;
        }
        metadata[key.trim()] = value;
      }

      const existingPart = await db.select().from(schema.parts).where(eq(schema.parts.partId, idStr)).limit(1);

      if (existingPart.length > 0) {
        await db.update(schema.parts).set({
          categoryId: categoryId || existingPart[0].categoryId,
          profileImage: profileImage || existingPart[0].profileImage,
          metadata: { ...((existingPart[0].metadata as object) || {}), ...metadata },
        }).where(eq(schema.parts.partId, idStr));
      } else {
        await db.insert(schema.parts).values({
          partId: idStr,
          categoryId,
          profileImage: profileImage || null,
          metadata,
        });
        report.parts++;
      }
    }

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("Import API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to import" },
      { status: 500 }
    );
  }
}
