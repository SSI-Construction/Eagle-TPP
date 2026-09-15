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
import { RequestBookingChangeDialog } from "@/components/schedule/request-booking-change-dialog";
import type { BookingStatus } from "@/lib/database.types";

export interface ProjectBookingRow {
  id: string;
  tradeName: string;
  bookedByName: string;
  confirmedByName: string | null;
  startDate: string;
  endDate: string;
  status: BookingStatus;
}

export function ProjectBookingsDialog({
  projectName,
  bookings,
}: {
  projectName: string;
  bookings: ProjectBookingRow[];
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button type="button" className="text-left font-medium text-primary hover:underline">
            {projectName}
          </button>
        }
      />
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{projectName}</DialogTitle>
          <DialogDescription>All bookings for this project</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Trade</th>
                <th className="px-3 py-2 text-left font-medium">Booked by</th>
                <th className="px-3 py-2 text-left font-medium">Confirmed by</th>
                <th className="px-3 py-2 text-left font-medium">Start date</th>
                <th className="px-3 py-2 text-left font-medium">End date</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-t align-top">
                  <td className="px-3 py-3 font-medium">{booking.tradeName}</td>
                  <td className="px-3 py-3">{booking.bookedByName}</td>
                  <td className="px-3 py-3">
                    {booking.status === "tentative"
                      ? "Awaiting confirmation"
                      : booking.confirmedByName ?? "Not recorded"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{booking.startDate}</td>
                  <td className="whitespace-nowrap px-3 py-3">{booking.endDate}</td>
                  <td className="px-3 py-3">
                    <Badge variant={booking.status === "confirmed" ? "destructive" : "outline"}>
                      {booking.status === "tentative" ? "Requested" : "Confirmed"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3">
                    {booking.status === "confirmed" && (
                      <RequestBookingChangeDialog
                        bookingId={booking.id}
                        projectName={projectName}
                        startDate={booking.startDate}
                        endDate={booking.endDate}
                        trigger={
                          <button type="button" className="text-primary hover:underline">
                            Request change
                          </button>
                        }
                      />
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No bookings for this project yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
