"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { setBookingCrewMembers } from "@/app/(app)/schedule/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { TradeCrewMember } from "@/lib/data";

export function CrewAssignmentDialog({
  bookingId,
  projectName,
  members,
  assignedMemberIds,
}: {
  bookingId: string;
  projectName: string;
  members: TradeCrewMember[];
  assignedMemberIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState(assignedMemberIds);
  const visibleMembers = members.filter(
    (member) => member.is_active || assignedMemberIds.includes(member.id),
  );

  function handleSave() {
    startTransition(async () => {
      const result = await setBookingCrewMembers({ bookingId, memberIds: selectedIds });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Job crew updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) setSelectedIds(assignedMemberIds);
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" size="sm" variant="outline">
            <Users className="h-4 w-4" />
            Assign crew
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign crew members</DialogTitle>
          <DialogDescription>{projectName}</DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto py-2">
          {visibleMembers.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(member.id)}
                onChange={(event) =>
                  setSelectedIds((current) =>
                    event.target.checked
                      ? [...current, member.id]
                      : current.filter((id) => id !== member.id),
                  )
                }
                className="h-4 w-4 accent-primary"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{member.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {member.role}{member.is_active ? "" : " · Archived"}
                </span>
              </span>
            </label>
          ))}
          {visibleMembers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Add someone to the crew roster before assigning this job.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {pending ? "Saving..." : "Save assignments"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}