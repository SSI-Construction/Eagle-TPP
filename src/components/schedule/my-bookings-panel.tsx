"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditBookingEndDateDialog } from "@/components/schedule/edit-booking-end-date-dialog";
import type { Booking } from "@/lib/data";
import { confirmBooking } from "@/app/(app)/schedule/actions";

export interface MyBookingRow extends Booking {
  projectName: string;
  projectNumber: string | null;
  projectAddress: string | null;
  projectMapLink: string | null;
  bookedByName: string;
}

export function MyBookingsPanel({ bookings }: { bookings: MyBookingRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b) => b.end_date >= today);
  const past = bookings.filter((b) => b.end_date < today);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">My bookings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground">No upcoming bookings.</p>
        )}
        {upcoming.map((b) => (
          <div
            key={b.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{b.projectName}</div>
              {b.projectNumber && <div className="text-xs">Project #{b.projectNumber}</div>}
              <div className="text-muted-foreground">
                {b.start_date} → {b.end_date} · {b.crew_count} crew{b.crew_count === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-muted-foreground">Requested by {b.bookedByName}</div>
              {b.projectMapLink ? (
                <a href={b.projectMapLink} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                  {b.projectAddress || "Open project location"}
                </a>
              ) : b.projectAddress ? (
                <div className="text-xs text-muted-foreground">{b.projectAddress}</div>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {b.status === "tentative" && (
                <>
                  <Badge variant="outline" className="border-orange-300 bg-orange-50 text-xs text-orange-900">
                    Requested
                  </Badge>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() => startTransition(async () => {
                      const result = await confirmBooking(b.id);
                      if (!result.ok) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Booking confirmed");
                      router.refresh();
                    })}
                  >
                    Confirm
                  </Button>
                </>
              )}
              {b.status === "confirmed" && (
                <EditBookingEndDateDialog
                  bookingId={b.id}
                  projectName={b.projectName}
                  startDate={b.start_date}
                  endDate={b.end_date}
                />
              )}
            </div>
          </div>
        ))}

        {past.length > 0 && (
          <details className="pt-2 text-sm text-muted-foreground">
            <summary className="cursor-pointer select-none">
              {past.length} past booking{past.length === 1 ? "" : "s"}
            </summary>
            <div className="mt-2 space-y-2">
              {past.map((b) => (
                <div key={b.id} className="rounded-md border px-3 py-2">
                  {b.projectName} · {b.start_date} → {b.end_date}
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
