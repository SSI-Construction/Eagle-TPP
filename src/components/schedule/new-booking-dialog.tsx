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
import { createBooking } from "@/app/(app)/schedule/actions";
import type { Project } from "@/lib/data";
import type { TradeWithDetails } from "@/lib/data";

interface NewBookingDialogProps {
  trades: TradeWithDetails[];
  projects: Project[];
  defaultTradeId?: string;
  defaultDate?: string;
  trigger?: React.ReactElement;
}

export function NewBookingDialog({
  trades,
  projects,
  defaultTradeId,
  defaultDate,
  trigger,
}: NewBookingDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [tradeId, setTradeId] = useState(defaultTradeId ?? "");
  const [projectId, setProjectId] = useState("");
  const [startDate, setStartDate] = useState(defaultDate ?? "");
  const [endDate, setEndDate] = useState(defaultDate ?? "");
  const [crewCount, setCrewCount] = useState(1);
  const [notes, setNotes] = useState("");

  function reset() {
    setTradeId(defaultTradeId ?? "");
    setProjectId("");
    setStartDate(defaultDate ?? "");
    setEndDate(defaultDate ?? "");
    setCrewCount(1);
    setNotes("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createBooking({
        tradeId,
        projectId,
        startDate,
        endDate,
        crewCount,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Booking request sent");
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
      <DialogTrigger render={trigger ?? <Button>Request Capacity</Button>} />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Request trade capacity</DialogTitle>
            <DialogDescription>
              Send a booking request for the trade to confirm. Capacity is held while the request
              is pending.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Trade</Label>
              <Select value={tradeId} onValueChange={(value) => setTradeId(value ?? "")} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a trade">
                    {(value: string | null) => {
                      const t = trades.find((trade) => trade.id === value);
                      return t
                        ? `${t.company_name} (${t.crews.filter((c) => c.is_active).length} crews)`
                        : "Select a trade";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {trades.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.company_name} ({t.crews.filter((c) => c.is_active).length} crews)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Project</Label>
              <Select value={projectId} onValueChange={(value) => setProjectId(value ?? "")} required>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a project">
                    {(value: string | null) =>
                      (() => {
                        const project = projects.find((item) => item.id === value);
                        return project
                          ? `${project.project_number} · ${project.name}`
                          : "Select a project";
                      })()
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_number} · {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="crewCount"># of crews needed</Label>
              <Input
                id="crewCount"
                type="number"
                min={1}
                max={50}
                required
                value={crewCount}
                onChange={(e) => setCrewCount(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Scope, contact, etc."
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
