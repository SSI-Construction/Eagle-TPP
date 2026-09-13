import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { InviteStaffDialog } from "@/components/team/invite-staff-dialog";
import { EditRoleDialog } from "@/components/team/edit-role-dialog";
import { getAllProfiles, getCurrentProfile, getTradesWithDetails } from "@/lib/data";

const ROLE_LABELS = {
  admin: "Admin",
  pm: "Project Manager",
  site_supervisor: "Site Supervisor",
  trade: "Trade Partner",
} as const;

export default async function TeamPage() {
  const [currentProfile, profiles, trades] = await Promise.all([
    getCurrentProfile(),
    getAllProfiles(),
    getTradesWithDetails(),
  ]);

  if (currentProfile?.role !== "admin") redirect("/schedule");

  const tradeNamesById = new Map(trades.map((trade) => [trade.id, trade.company_name]));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Team</h1>
          <p className="text-sm text-muted-foreground">
            Invite project managers and site supervisors, and manage everyone&apos;s access level.
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
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr key={profile.id} className="border-t">
                <td className="px-4 py-3 font-medium">{profile.full_name}</td>
                <td className="px-4 py-3 text-muted-foreground">{profile.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    {ROLE_LABELS[profile.role]}
                    {profile.role === "trade" && profile.trade_id
                      ? ` · ${tradeNamesById.get(profile.trade_id) ?? "Unknown trade"}`
                      : ""}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {profile.id !== currentProfile.id && (
                    <EditRoleDialog
                      profileId={profile.id}
                      profileName={profile.full_name}
                      currentRole={profile.role}
                      currentTradeId={profile.trade_id}
                      trades={trades.map((trade) => ({ id: trade.id, company_name: trade.company_name }))}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

