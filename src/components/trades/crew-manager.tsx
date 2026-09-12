"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addCrew,
  addExternalCommitment,
  removeExternalCommitment,
  toggleCrewActive,
} from "@/app/(app)/trades/actions";
import type { Crew, ExternalCommitment } from "@/lib/data";
import { Trash2 } from "lucide-react";

interface CrewManagerProps {
  tradeId: string;
  crews: Crew[];
  externalCommitments: ExternalCommitment[];
  canManage: boolean;
}

export function CrewManager({ tradeId, crews, externalCommitments, canManage }: CrewManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [crewName, setCrewName] = useState("");

  const [ecStart, setEcStart] = useState("");
  const [ecEnd, setEcEnd] = useState("");
  const [ecCount, setEcCount] = useState(1);
  const [ecNote, setEcNote] = useState("");

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
    </div>
  );
}
