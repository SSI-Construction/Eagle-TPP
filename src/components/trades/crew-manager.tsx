"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addCapacityOverride,
  addCrew,
  addExternalCommitment,
  removeExternalCommitment,
  removeCapacityOverride,
  toggleCrewActive,
} from "@/app/(app)/trades/actions";
import type { CapacityOverride, Crew, ExternalCommitment } from "@/lib/data";
import { Trash2 } from "lucide-react";

interface CrewManagerProps {
  tradeId: string;
  crews: Crew[];
  externalCommitments: ExternalCommitment[];
  capacityOverrides: CapacityOverride[];
  canManage: boolean;
}

export function CrewManager({
  tradeId,
  crews,
  externalCommitments,
  capacityOverrides,
  canManage,
}: CrewManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [crewName, setCrewName] = useState("");

  const [ecStart, setEcStart] = useState("");
  const [ecEnd, setEcEnd] = useState("");
  const [ecCount, setEcCount] = useState(1);
  const [ecNote, setEcNote] = useState("");

  const [capacityStart, setCapacityStart] = useState("");
  const [capacityEnd, setCapacityEnd] = useState("");
  const [capacityTotal, setCapacityTotal] = useState(
    crews.filter((crew) => crew.is_active).length,
  );
  const [capacityNote, setCapacityNote] = useState("");

  function handleAddCrew(e: React.FormEvent) {
    e.preventDefault();
    if (!crewName.trim()) return;
    startTransition(async () => {
      const result = await addCrew({ tradeId, name: crewName.trim() });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCrewName("");
      router.refresh();
    });
  }

  function handleToggleCrew(crewId: string, isActive: boolean) {
    startTransition(async () => {
      const result = await toggleCrewActive(crewId, isActive);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  function handleAddCommitment(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addExternalCommitment({
        tradeId,
        startDate: ecStart,
        endDate: ecEnd,
        crewCount: ecCount,
        note: ecNote,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEcStart("");
      setEcEnd("");
      setEcCount(1);
      setEcNote("");
      router.refresh();
    });
  }

  function handleRemoveCommitment(id: string) {
    startTransition(async () => {
      const result = await removeExternalCommitment(id, tradeId);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  function handleAddCapacity(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await addCapacityOverride({
        tradeId,
        startDate: capacityStart,
        endDate: capacityEnd,
        totalCrews: capacityTotal,
        note: capacityNote,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCapacityStart("");
      setCapacityEnd("");
      setCapacityNote("");
      toast.success("Temporary capacity added");
      router.refresh();
    });
  }

  function handleRemoveCapacity(id: string) {
    startTransition(async () => {
      const result = await removeCapacityOverride(id, tradeId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Crews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {crews.map((crew) => (
            <div key={crew.id} className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className={!crew.is_active ? "text-muted-foreground line-through" : ""}>
                {crew.name}
              </span>
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => handleToggleCrew(crew.id, !crew.is_active)}
                >
                  {crew.is_active ? "Deactivate" : "Reactivate"}
                </Button>
              )}
            </div>
          ))}
          {crews.length === 0 && (
            <p className="text-sm text-muted-foreground">No crews added yet.</p>
          )}

          {canManage && (
            <form onSubmit={handleAddCrew} className="flex gap-2 pt-2">
              <Input
                placeholder="e.g. Crew B"
                value={crewName}
                onChange={(e) => setCrewName(e.target.value)}
              />
              <Button type="submit" disabled={pending || !crewName.trim()}>
                Add
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">External commitments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Work booked outside this system (other GCs, time off) that still uses up crew
            capacity here.
          </p>
          {externalCommitments.map((ec) => (
            <div key={ec.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <div className="font-medium">
                  {ec.start_date} → {ec.end_date}
                </div>
                <div className="text-muted-foreground">
                  {ec.crew_count} crew{ec.crew_count === 1 ? "" : "s"}
                  {ec.note ? ` · ${ec.note}` : ""}
                </div>
              </div>
              {canManage && (
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => handleRemoveCommitment(ec.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {externalCommitments.length === 0 && (
            <p className="text-sm text-muted-foreground">None recorded.</p>
          )}

          {canManage && (
            <form onSubmit={handleAddCommitment} className="space-y-2 border-t pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ecStart" className="text-xs">
                    Start
                  </Label>
                  <Input
                    id="ecStart"
                    type="date"
                    required
                    value={ecStart}
                    onChange={(e) => setEcStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecEnd" className="text-xs">
                    End
                  </Label>
                  <Input
                    id="ecEnd"
                    type="date"
                    required
                    value={ecEnd}
                    onChange={(e) => setEcEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[80px_1fr] gap-2">
                <div className="space-y-1">
                  <Label htmlFor="ecCount" className="text-xs">
                    Crews
                  </Label>
                  <Input
                    id="ecCount"
                    type="number"
                    min={1}
                    max={50}
                    value={ecCount}
                    onChange={(e) => setEcCount(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ecNote" className="text-xs">
                    Note
                  </Label>
                  <Input
                    id="ecNote"
                    placeholder="Other GC job, vacation, etc."
                    value={ecNote}
                    onChange={(e) => setEcNote(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" disabled={pending || !ecStart || !ecEnd} className="w-full">
                Add commitment
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Temporary capacity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Set the total crew capacity for a date range. Outside that range, capacity returns to
            the {" "}
            {crews.filter((crew) => crew.is_active).length}-crew baseline.
          </p>
          {capacityOverrides.map((override) => (
            <div
              key={override.id}
              className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">
                  {override.start_date} → {override.end_date}
                </div>
                <div className="text-muted-foreground">
                  {override.total_crews} crew{override.total_crews === 1 ? "" : "s"} total
                  {override.note ? ` · ${override.note}` : ""}
                </div>
              </div>
              {canManage && (
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => handleRemoveCapacity(override.id)}
                  aria-label="Remove temporary capacity"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {capacityOverrides.length === 0 && (
            <p className="text-sm text-muted-foreground">No temporary capacity periods.</p>
          )}

          {canManage && (
            <form onSubmit={handleAddCapacity} className="space-y-2 border-t pt-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_100px]">
                <div className="space-y-1">
                  <Label htmlFor="capacityStart" className="text-xs">
                    Start
                  </Label>
                  <Input
                    id="capacityStart"
                    type="date"
                    required
                    value={capacityStart}
                    onChange={(e) => setCapacityStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="capacityEnd" className="text-xs">
                    End
                  </Label>
                  <Input
                    id="capacityEnd"
                    type="date"
                    required
                    value={capacityEnd}
                    onChange={(e) => setCapacityEnd(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="capacityTotal" className="text-xs">
                    Total crews
                  </Label>
                  <Input
                    id="capacityTotal"
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={capacityTotal}
                    onChange={(e) => setCapacityTotal(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="capacityNote" className="text-xs">
                  Note
                </Label>
                <Input
                  id="capacityNote"
                  placeholder="Seasonal crew, extra subcontractor, etc."
                  value={capacityNote}
                  onChange={(e) => setCapacityNote(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={pending || !capacityStart || !capacityEnd || capacityTotal < 1}
                className="w-full"
              >
                Add temporary capacity
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
