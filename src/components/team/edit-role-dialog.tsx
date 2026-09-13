"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProfileRole } from "@/app/(app)/team/actions";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/lib/database.types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "pm", label: "Project Manager" },
  { value: "site_supervisor", label: "Site Supervisor" },
  { value: "trade", label: "Trade Partner" },
];

interface EditRoleDialogProps {
  profileId: string;
  profileName: string;
  currentRole: UserRole;
  currentTradeId: string | null;
  trades: { id: string; company_name: string }[];
}

export function EditRoleDialog({
  profileId,
  profileName,
  currentRole,
  currentTradeId,
  trades,
}: EditRoleDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [role, setRole] = useState<UserRole>(currentRole);
  const [tradeId, setTradeId] = useState(currentTradeId ?? "");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRole(currentRole);
    setTradeId(currentTradeId ?? "");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateProfileRole({
        profileId,
        role,
        tradeId: role === "trade" ? tradeId : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Updated ${profileName}'s role`);
      setOpen(false);
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
          <Button variant="outline" size="sm">
            Change role
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>Update access for {profileName}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole((value ?? currentRole) as UserRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) =>
                      ROLE_OPTIONS.find((option) => option.value === value)?.label ?? "Select a role"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {role === "trade" && (
              <div className="space-y-1.5">
                <Label>Trade</Label>
                <Select value={tradeId} onValueChange={(value) => setTradeId(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string | null) =>
                        trades.find((trade) => trade.id === value)?.company_name ?? "Select a trade"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {trades.map((trade) => (
                      <SelectItem key={trade.id} value={trade.id}>
                        {trade.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
