import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InviteStaffDialog } from "@/components/team/invite-staff-dialog";
import { getAllProfiles, getCurrentProfile } from "@/lib/data";

const ROLE_LABELS = {
  admin: "Admin",
  pm: "Project Manager",
  site_supervisor: "Site Supervisor",
  trade: "Trade Partner",
} as const;

export default async function TeamPage() {
  const [currentProfile, profiles] = await Promise.all([
    getCurrentProfile(),
    getAllProfiles(),
  ]);

  if (currentProfile?.role !== "admin") redirect("/schedule");

  const internalProfiles = profiles.filter((profile) => profile.role !== "trade");

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Invite project managers and site supervisors to schedule trade capacity.
          </p>
        </div>
        <InviteStaffDialog />
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Email</th>
              <th className="px-4 py-2.5 text-left font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {internalProfiles.map((profile) => (
              <tr key={profile.id} className="border-t">
                <td className="px-4 py-3 font-medium">{profile.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
