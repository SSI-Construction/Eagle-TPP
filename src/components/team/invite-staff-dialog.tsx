"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { inviteStaff } from "@/app/(app)/team/actions";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserRole } from "@/lib/database.types";

type StaffRole = Extract<UserRole, "pm" | "site_supervisor">;

export function InviteStaffDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("pm");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFullName("");
    setEmail("");
    setRole("pm");
    setError(null);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteStaff({ fullName, email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Invite sent to ${email}`);
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
          <Button>
            <Mail className="h-4 w-4" />
            Invite team member
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite internal staff</DialogTitle>
            <DialogDescription>
              Send an account invitation and assign project scheduling access.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="staffName">Full name</Label>
              <Input id="staffName" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="staffEmail">Email</Label>
              <Input id="staffEmail" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole((value ?? "pm") as StaffRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => value === "site_supervisor" ? "Site Supervisor" : "Project Manager"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pm">Project Manager</SelectItem>
                  <SelectItem value="site_supervisor">Site Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Sending..." : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
