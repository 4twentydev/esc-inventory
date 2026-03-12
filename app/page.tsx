import { requireAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, ArrowRightLeft, UploadCloud } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function DashboardPage() {
  const user = await requireAuth();

  async function handleLogout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.delete("esc_session");
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b surface py-4 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">ESC Inventory</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground mr-2">
              Logged in as <strong className="text-strong">{user.name}</strong>
            </span>
            <form action={handleLogout}>
              <Button variant="ghost" size="icon" title="Logout">
                <LogOut className="w-5 h-5 text-muted-foreground" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 mt-8">
        <h2 className="text-3xl font-semibold mb-8">What do you want to do?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/kiosk/pull" className="group">
            <div className="border border-border rounded-xl p-6 surface shadow-sm hover:border-primary/50 hover:shadow-md transition-all h-48 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ArrowRightLeft className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium">Pull / Return Material</h3>
            </div>
          </Link>

          {user.role === "admin" && (
            <Link href="/admin/import" className="group">
              <div className="border border-border rounded-xl p-6 surface shadow-sm hover:border-accent-secondary/50 hover:shadow-md transition-all h-48 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-accent-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-accent-secondary" />
                </div>
                <h3 className="text-lg font-medium">Import Excel Sheets</h3>
                <p className="text-sm text-muted-foreground mt-1">Setup Parts, Zones, Categories</p>
              </div>
            </Link>
          )}

          {user.role === "admin" && (
            <Link href="/admin/shuffle" className="group">
              <div className="border border-border rounded-xl p-6 surface shadow-sm hover:border-accent-secondary/50 hover:shadow-md transition-all h-48 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-accent-secondary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-8 h-8 text-accent-secondary transform rotate-90" />
                </div>
                <h3 className="text-lg font-medium">Shuffle Inventory</h3>
                <p className="text-sm text-muted-foreground mt-1">Move stock between locations</p>
              </div>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
