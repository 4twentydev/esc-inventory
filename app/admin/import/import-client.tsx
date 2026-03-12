"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, AlertCircle, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ImportClient() {
  const [dataFile, setDataFile] = useState<File | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [clearDb, setClearDb] = useState(true);

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipLoading, setZipLoading] = useState(false);

  const router = useRouter();

  async function handleDataImport(e: React.FormEvent) {
    e.preventDefault();
    if (!dataFile) return;

    setDataLoading(true);
    const formData = new FormData();
    formData.append("file", dataFile);
    formData.append("clearDb", String(clearDb));

    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import");

      toast.success("Data Import successful!", {
        description: `Imported ${data.report.parts} parts, ${data.report.locations} zones, and ${data.report.categories} categories.`,
      });
      router.push("/");
    } catch (err) {
      toast.error("Import Failed", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setDataLoading(false);
    }
  }

  async function handleImageImport(e: React.FormEvent) {
    e.preventDefault();
    if (!zipFile) return;

    setZipLoading(true);
    const formData = new FormData();
    formData.append("file", zipFile);

    try {
      const res = await fetch("/api/admin/images", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to extract zip");

      toast.success("Images Extracted!", {
        description: `Successfully extracted ${data.report.images} images.`,
      });
      setZipFile(null);
    } catch (err) {
      toast.error("Image Upload Failed", {
        description: err instanceof Error ? err.message : "Unknown error occurred",
      });
    } finally {
      setZipLoading(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-8">
      {/* Excel Data Import Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Upload Database</CardTitle>
          <CardDescription>Excel file with Zones, Categories, and Parts</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleDataImport} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dataFile">Excel File (.xlsx, .xls, .csv)</Label>
              <Input
                id="dataFile"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setDataFile(e.target.files?.[0] || null)}
                disabled={dataLoading || zipLoading}
                className="cursor-pointer"
              />
            </div>

            <div className="flex items-center space-x-2 bg-destructive/10 p-4 rounded-md border border-destructive/20">
              <input
                type="checkbox"
                id="clearDb"
                checked={clearDb}
                onChange={(e) => setClearDb(e.target.checked)}
                disabled={dataLoading || zipLoading}
                className="w-4 h-4 rounded text-destructive focus:ring-destructive cursor-pointer"
              />
              <Label htmlFor="clearDb" className="text-destructive font-medium cursor-pointer">
                Clear previous database records before import (Danger)
              </Label>
            </div>

            <div className="bg-surface-muted p-4 rounded-md text-sm text-muted-foreground flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-accent-secondary" />
              <p>
                The Parts List sheet must contain a column designated for the Part ID. All other columns will be stored dynamically.
              </p>
            </div>

            <Button type="submit" disabled={!dataFile || dataLoading} className="w-full h-12 text-lg">
              {dataLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Import Data
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Profile Images Zip Import Card */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl">Upload Profile Images</CardTitle>
          <CardDescription>ZIP file containing part images</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleImageImport} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zipFile">Images Archive (.zip)</Label>
              <Input
                id="zipFile"
                type="file"
                accept=".zip"
                onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                disabled={dataLoading || zipLoading}
                className="cursor-pointer"
              />
            </div>

            <div className="bg-surface-muted p-4 rounded-md text-sm text-muted-foreground flex items-start gap-3 mt-6">
              <ImageIcon className="w-5 h-5 flex-shrink-0 text-primary" />
              <p>
                Upload a ZIP file containing the images. The images will be extracted to the public folder. Ensure the image filenames match the "Profile Image" column from your Parts List spreadsheet exactly.
              </p>
            </div>

            <Button type="submit" variant="secondary" disabled={!zipFile || zipLoading} className="w-full h-12 text-lg mt-[1.3rem]">
              {zipLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Images
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
