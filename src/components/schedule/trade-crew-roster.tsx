"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addTradeCrewMember, toggleTradeCrewMember } from "@/app/(app)/schedule/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TradeCrewMember } from "@/lib/data";

export function TradeCrewRoster({ members }: { members: TradeCrewMember[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addTradeCrewMember({ name, role });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setName("");
      setRole("");
      toast.success("Crew member added");
      router.refresh();
    });
  }

  function handleToggle(member: TradeCrewMember) {
    startTransition(async () => {
      const result = await toggleTradeCrewMember(member.id, !member.is_active);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Crew roster</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
          >
            <div className={member.is_active ? "" : "text-muted-foreground"}>
              <div className={member.is_active ? "font-medium" : "font-medium line-through"}>
                {member.name}
              </div>
              <div className="text-xs text-muted-foreground">{member.role}</div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => handleToggle(member)}
            >
              {member.is_active ? "Archive" : "Reactivate"}
            </Button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">No crew members added.</p>
        )}

        <form className="space-y-2 border-t pt-3" onSubmit={handleAdd}>
          <div className="space-y-1">
            <Label htmlFor="crewMemberName" className="text-xs">
              Name
            </Label>
            <Input
              id="crewMemberName"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="crewMemberRole" className="text-xs">
              Role
            </Label>
            <Input
              id="crewMemberRole"
              required
              maxLength={120}
              placeholder="Foreperson, electrician, apprentice..."
              value={role}
              onChange={(event) => setRole(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending || !name.trim() || !role.trim()}>
            Add crew member
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}