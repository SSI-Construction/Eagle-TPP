"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addExternalJob } from "@/app/(app)/schedule/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export function AddExternalJobDialog({
  members,
  defaultDate,
}: {
  members: TradeCrewMember[];
  defaultDate?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(defaultDate ?? "");
  const [endDate, setEndDate] = useState(defaultDate ?? "");
  const [crewMemberIds, setCrewMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const activeMembers = members.filter((member) => member.is_active);

  function reset() {
    setTitle("");
    setStartDate(defaultDate ?? "");
    setEndDate(defaultDate ?? "");
    setCrewMemberIds([]);
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addExternalJob({ title, startDate, endDate, crewMemberIds });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Job added to your master schedule");
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
        render={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Schedule outside job
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Schedule a job outside this company</DialogTitle>
            <DialogDescription>
              Blocks your crew&apos;s capacity here too, so it won&apos;t get double-booked.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="jobTitle">Job name</Label>
              <Input
                id="jobTitle"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Smith residence rewire"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="jobStart">Start date</Label>
                <Input
                  id="jobStart"
                  type="date"
                  required
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="jobEnd">End date</Label>
                <Input
                  id="jobEnd"
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Crew assigned</Label>
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-2">
                {activeMembers.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-1.5 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={crewMemberIds.includes(member.id)}
                      onChange={(event) =>
                        setCrewMemberIds((current) =>
                          event.target.checked
                            ? [...current, member.id]
                            : current.filter((id) => id !== member.id),
                        )
                      }
                      className="h-4 w-4 accent-primary"
                    />
                    <span>
                      {member.name} <span className="text-muted-foreground">· {member.role}</span>
                    </span>
                  </label>
                ))}
                {activeMembers.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Add crew members from the roster first.
                  </p>
                )}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Add job"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
