import { requireAdmin } from "@/lib/auth";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight mb-6">Import Inventory Data</h1>
        <p className="text-muted-foreground mb-8">
          Upload an Excel workbook containing specific sheets to populate your database.
          The expected sheets are <strong className="text-strong">Zones</strong>, <strong className="text-strong">Categories</strong>, and <strong className="text-strong">Parts List</strong>.
        </p>
        <ImportClient />
      </div>
    </div>
  );
}
