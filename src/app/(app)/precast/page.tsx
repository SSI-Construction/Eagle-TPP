import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/data";

export default async function PrecastPage() {
  const profile = await getCurrentProfile();
  if (profile?.role !== "admin" && profile?.role !== "precast") {
    redirect("/schedule");
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Precast</h1>
        <p className="text-sm text-muted-foreground">
          The Precast dashboard is coming soon.
        </p>
      </div>
      <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed bg-background">
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          This is a placeholder — Precast-specific scheduling and tracking
          features will be added here.
        </p>
      </div>
    </div>
  );
}
