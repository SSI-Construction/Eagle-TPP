"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { BookingDetail } from "@/components/schedule/capacity-board";

export function BookingDetailsDialog({
  tradeName,
  date,
  details,
  trigger,
}: {
  tradeName: string;
  date: string;
  details: BookingDetail[];
  trigger: React.ReactElement;
}) {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{tradeName}</DialogTitle>
          <DialogDescription>Capacity commitments on {formatDate(date)}</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Project</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Dates</th>
                <th className="px-3 py-2 text-left font-medium">Crews</th>
                <th className="px-3 py-2 text-left font-medium">Booked by</th>
                <th className="px-3 py-2 text-left font-medium">Confirmed by</th>
              </tr>
            </thead>
            <tbody>
              {details.map((detail) => (
                <tr key={`${detail.source}-${detail.id}`} className="border-t align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium">{detail.label}</div>
                    {detail.projectNumber && (
                      <div className="text-xs text-muted-foreground">
                        Project #{detail.projectNumber}
                      </div>
                    )}
                    {detail.projectLocation && (
                      detail.projectLocation.startsWith("http") ? (
                        <a
                          href={detail.projectLocation}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Open location
                        </a>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          {detail.projectLocation}
                        </div>
                      )
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={detail.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {detail.startDate} to {detail.endDate}
                  </td>
                  <td className="px-3 py-3">{detail.crewCount}</td>
                  <td className="px-3 py-3">{detail.bookedByName ?? "Not applicable"}</td>
                  <td className="px-3 py-3">
                    {detail.status === "tentative"
                      ? "Awaiting confirmation"
                      : detail.confirmedByName ?? "Not recorded"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StatusBadge({ status }: { status: BookingDetail["status"] }) {
  const label =
    status === "tentative"
      ? "Requested"
      : status === "confirmed"
        ? "Confirmed"
        : status === "external"
          ? "Outside work"
          : "Cancelled";

  return <Badge variant={status === "confirmed" ? "destructive" : "outline"}>{label}</Badge>;
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
