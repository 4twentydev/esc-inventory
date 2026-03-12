import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No zip file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);

    const zipEntries = zip.getEntries();
    let extractedCount = 0;

    const targetDir = path.join(process.cwd(), "public", "parts");
    if (!existsSync(targetDir)) {
      await fs.mkdir(targetDir, { recursive: true });
    }

    // Process each file in the zip
    for (const entry of zipEntries) {
      if (!entry.isDirectory && entry.entryName.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i)) {
        // extract the filename without parent directories in case the zip is nested
        const filename = path.basename(entry.entryName);
        const outPath = path.join(targetDir, filename);
        await fs.writeFile(outPath, entry.getData());
        extractedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      report: { images: extractedCount }
    });

  } catch (error) {
    console.error("Image Upload Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to extract images" },
      { status: 500 }
    );
  }
}
