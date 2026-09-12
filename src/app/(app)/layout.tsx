import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";
import { Sidebar } from "@/components/nav/sidebar";
import { isDemoMode } from "@/lib/demo/config";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const demoMode = isDemoMode();

  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen flex-col">
      {demoMode && (
        <div className="shrink-0 bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
          Demo mode — sample data only, nothing is connected to Supabase yet.
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidebar profile={profile} demoMode={demoMode} />
        <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
      </div>
    </div>
  );
}
