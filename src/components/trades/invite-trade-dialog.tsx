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
import { inviteTradeLogin } from "@/app/(app)/trades/actions";
import { Mail } from "lucide-react";

interface InviteTradeDialogProps {
  tradeId: string;
  defaultEmail?: string;
  defaultFullName?: string;
}

export function InviteTradeDialog({ tradeId, defaultEmail, defaultFullName }: InviteTradeDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [fullName, setFullName] = useState(defaultFullName ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteTradeLogin({ tradeId, email, fullName });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Invite sent to ${email}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Mail className="h-4 w-4" />
            Invite to log in
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Invite this trade to log in</DialogTitle>
            <DialogDescription>
              Sends an email invite to set a password. Their account will be linked to this trade
              so they only ever see their own schedule.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="inviteFullName">Contact name</Label>
              <Input
                id="inviteFullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inviteEmail">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
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
