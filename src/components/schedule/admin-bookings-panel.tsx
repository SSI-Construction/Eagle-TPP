"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateBooking } from "@/app/(app)/schedule/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Booking, Project, TradeWithDetails } from "@/lib/data";
import type { BookingStatus } from "@/lib/database.types";

export interface AdminBookingRow extends Booking {
  projectName: string;
  tradeName: string;
}

export function AdminBookingsPanel({
  bookings,
  projects,
  trades,
}: {
  bookings: AdminBookingRow[];
  projects: Project[];
  trades: TradeWithDetails[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manage bookings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {bookings.length === 0 && (
          <p className="text-sm text-muted-foreground">No bookings in this date range.</p>
        )}
        {bookings.map((booking) => (
          <div key={booking.id} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{booking.projectName}</div>
                <div className="truncate text-xs text-muted-foreground">{booking.tradeName}</div>
                <div className="text-xs text-muted-foreground">
                  {booking.start_date} to {booking.end_date} · {booking.crew_count} crew{booking.crew_count === 1 ? "" : "s"}
                </div>
              </div>
              <Badge variant={booking.status === "confirmed" ? "destructive" : "outline"}>
                {booking.status === "tentative" ? "Requested" : booking.status}
              </Badge>
            </div>
            <AdminEditBookingDialog booking={booking} projects={projects} trades={trades} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AdminEditBookingDialog({
  booking,
  projects,
  trades,
}: {
  booking: AdminBookingRow;
  projects: Project[];
  trades: TradeWithDetails[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(booking.project_id);
  const [tradeId, setTradeId] = useState(booking.trade_id);
  const [startDate, setStartDate] = useState(booking.start_date);
  const [endDate, setEndDate] = useState(booking.end_date);
  const [crewCount, setCrewCount] = useState(booking.crew_count);
  const [status, setStatus] = useState<BookingStatus>(booking.status);
  const [notes, setNotes] = useState(booking.notes ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateBooking({
        bookingId: booking.id,
        projectId,
        tradeId,
        startDate,
        endDate,
        crewCount,
        status,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(status === "cancelled" ? "Booking cancelled" : "Booking updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" className="mt-2 w-full">Edit booking</Button>} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit booking</DialogTitle>
            <DialogDescription>
              Admin changes are checked against the trade&apos;s current available capacity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={(value) => setProjectId(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => projects.find((project) => project.id === value)?.name ?? "Select project"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Trade</Label>
                <Select value={tradeId} onValueChange={(value) => setTradeId(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => trades.find((trade) => trade.id === value)?.company_name ?? "Select trade"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {trades.map((trade) => <SelectItem key={trade.id} value={trade.id}>{trade.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`adminStart-${booking.id}`}>Start date</Label>
                <Input id={`adminStart-${booking.id}`} type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`adminEnd-${booking.id}`}>End date</Label>
                <Input id={`adminEnd-${booking.id}`} type="date" required min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`adminCrews-${booking.id}`}>Crews</Label>
                <Input id={`adminCrews-${booking.id}`} type="number" min={1} max={50} required value={crewCount} onChange={(event) => setCrewCount(Number(event.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus((value ?? "tentative") as BookingStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) => value === "tentative" ? "Requested" : value === "confirmed" ? "Confirmed" : "Cancelled"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tentative">Requested</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`adminNotes-${booking.id}`}>Notes</Label>
              <Input id={`adminNotes-${booking.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
