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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requestBookingChange } from "@/app/(app)/schedule/actions";
import type { BookingRequestType } from "@/lib/database.types";

interface RequestBookingChangeDialogProps {
  bookingId: string;
  projectName: string;
  startDate: string;
  endDate: string;
  /** Label shown on the default trigger button, e.g. "Request change". */
  triggerLabel?: string;
  /** Custom trigger element (overrides the default button). */
  trigger?: React.ReactElement;
}

export function RequestBookingChangeDialog({
  bookingId,
  projectName,
  startDate,
  endDate,
  triggerLabel = "Request change",
  trigger,
}: RequestBookingChangeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [requestType, setRequestType] = useState<BookingRequestType>("reschedule");
  const [proposedStartDate, setProposedStartDate] = useState(startDate);
  const [proposedEndDate, setProposedEndDate] = useState(endDate);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRequestType("reschedule");
    setProposedStartDate(startDate);
    setProposedEndDate(endDate);
    setReason("");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestBookingChange({
        bookingId,
        requestType,
        proposedStartDate: requestType === "reschedule" ? proposedStartDate : undefined,
        proposedEndDate: requestType === "reschedule" ? proposedEndDate : undefined,
        reason: reason.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        requestType === "cancel"
          ? "Cancellation request sent"
          : "Reschedule request sent",
      );
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger
        render={trigger ?? <Button size="sm" variant="outline">{triggerLabel}</Button>}
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request a change · {projectName}</DialogTitle>
            <DialogDescription>
              This won&apos;t change anything yet — the other side needs to approve it first.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>Request type</Label>
              <Select
                value={requestType}
                onValueChange={(value) => setRequestType((value ?? "reschedule") as BookingRequestType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => (value === "cancel" ? "Cancel booking" : "Reschedule dates")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reschedule">Reschedule dates</SelectItem>
                  <SelectItem value="cancel">Cancel booking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {requestType === "reschedule" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`propStart-${bookingId}`}>New start date</Label>
                  <Input
                    id={`propStart-${bookingId}`}
                    type="date"
                    required
                    value={proposedStartDate}
                    onChange={(event) => setProposedStartDate(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`propEnd-${bookingId}`}>New end date</Label>
                  <Input
                    id={`propEnd-${bookingId}`}
                    type="date"
                    required
                    min={proposedStartDate}
                    value={proposedEndDate}
                    onChange={(event) => setProposedEndDate(event.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`reason-${bookingId}`}>Reason (optional)</Label>
              <Input
                id={`reason-${bookingId}`}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Let them know why"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
