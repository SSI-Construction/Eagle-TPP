import { redirect } from "next/navigation";
import {
  getAllProfiles,
  getBookingsForProject,
  getCurrentProfile,
  getProjects,
  getTradesWithDetails,
} from "@/lib/data";
import { AddProjectDialog } from "@/components/projects/add-project-dialog";
import { ProjectBookingsDialog, type ProjectBookingRow } from "@/components/projects/project-bookings-dialog";

export default async function ProjectsPage() {
  const [profile, projects, profiles, trades] = await Promise.all([
    getCurrentProfile(),
    getProjects(),
    getAllProfiles(),
    getTradesWithDetails(),
  ]);

  // Precast/Safety have their own placeholder dashboards for now.
  if (profile?.role === "precast") redirect("/precast");
  if (profile?.role === "safety") redirect("/safety");

  const profileNameById = new Map(profiles.map((p) => [p.id, p.full_name]));
  const tradeNameById = new Map(trades.map((t) => [t.id, t.company_name]));
  const canCreate = profile && ["admin", "pm", "site_supervisor"].includes(profile.role);

  const bookingsByProject = new Map<string, ProjectBookingRow[]>(
    await Promise.all(
      projects.map(async (project) => {
        const bookings = await getBookingsForProject(project.id);
        const rows: ProjectBookingRow[] = bookings.map((booking) => ({
          id: booking.id,
          tradeName: tradeNameById.get(booking.trade_id) ?? "Unknown trade",
          bookedByName: booking.created_by ? profileNameById.get(booking.created_by) ?? "Unknown" : "Unknown",
          confirmedByName: booking.confirmed_by ? profileNameById.get(booking.confirmed_by) ?? "Unknown" : null,
          startDate: booking.start_date,
          endDate: booking.end_date,
          status: booking.status,
        }));
        return [project.id, rows] as const;
      }),
    ),
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Projects that trades can be booked against.
          </p>
        </div>
        {canCreate && <AddProjectDialog profiles={profiles} />}
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Project</th>
              <th className="px-4 py-2.5 text-left font-medium">Number</th>
              <th className="px-4 py-2.5 text-left font-medium">PM</th>
              <th className="px-4 py-2.5 text-left font-medium">Site supervisor</th>
              <th className="px-4 py-2.5 text-left font-medium">Dates</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t">
                <td className="px-4 py-3">
                  <ProjectBookingsDialog
                    projectName={project.name}
                    bookings={bookingsByProject.get(project.id) ?? []}
                  />
                  {project.map_link ? (
                    <a href={project.map_link} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                      {project.address || "Open location"}
                    </a>
                  ) : project.address ? <div className="text-xs text-muted-foreground">{project.address}</div> : null}
                </td>
                <td className="px-4 py-3">{project.project_number}</td>
                <td className="px-4 py-3">
                  {project.pm_id ? profileNameById.get(project.pm_id) ?? "—" : "—"}
                </td>
                <td className="px-4 py-3">
                  {project.site_supervisor_id
                    ? profileNameById.get(project.site_supervisor_id) ?? "—"
                    : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {project.start_date ?? "—"} → {project.end_date ?? "—"}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
