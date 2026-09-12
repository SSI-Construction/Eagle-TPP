"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBookingEndDate, type BookingShift } from "@/app/(app)/schedule/actions";

interface EditBookingEndDateDialogProps {
  bookingId: string;
  projectName: string;
  startDate: string;
  endDate: string;
}

export function EditBookingEndDateDialog({
  bookingId,
  projectName,
  startDate,
  endDate,
}: EditBookingEndDateDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [newEndDate, setNewEndDate] = useState(endDate);
  const [error, setError] = useState<string | null>(null);
  const [shifts, setShifts] = useState<BookingShift[] | null>(null);

  function reset() {
    setNewEndDate(endDate);
    setError(null);
    setShifts(null);
  }

  function submit(cascade: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingEndDate({ bookingId, newEndDate, cascade });
      if (result.ok) {
        toast.success(
          newEndDate < endDate ? "Booking shortened" : "Booking extended",
        );
        setOpen(false);
        reset();
        router.refresh();
        return;
      }
      if (result.needsConfirmation && result.shifts) {
        setShifts(result.shifts);
        return;
      }
      setError(result.error);
      setShifts(null);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline">Update dates</Button>} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update booking · {projectName}</DialogTitle>
          <DialogDescription>
            Finished early? Shorten it to free up the remaining days. Running long? Extend it —
            if that overlaps another job, you&apos;ll get the option to push it forward.
          </DialogDescription>
        </DialogHeader>

        {shifts ? (
          <div className="space-y-3">
            <p className="text-sm">
              Extending to <strong>{newEndDate}</strong> overlaps {shifts.length} other booking
              {shifts.length === 1 ? "" : "s"} for you. Push {shifts.length === 1 ? "it" : "them"}{" "}
              forward?
            </p>
            <ul className="space-y-1 rounded-md border p-2 text-sm">
              {shifts.map((s) => (
                <li key={s.id}>
                  <span className="font-medium">{s.label}</span>: {s.oldStart} → {s.oldEnd}{" "}
                  becomes {s.newStart} → {s.newEnd}
                </li>
              ))}
            </ul>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShifts(null)} disabled={pending}>
                Back
              </Button>
              <Button onClick={() => submit(true)} disabled={pending}>
                {pending ? "Pushing..." : "Push forward & confirm"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input value={startDate} disabled />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newEndDate">End date</Label>
                <Input
                  id="newEndDate"
                  type="date"
                  min={startDate}
                  required
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pending || newEndDate === endDate}>
                {pending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
