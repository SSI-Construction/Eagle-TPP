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
import { Badge } from "@/components/ui/badge";
import { createTrade } from "@/app/(app)/trades/actions";
import type { TradeCategory } from "@/lib/data";
import { Plus } from "lucide-react";

export function AddTradeDialog({ categories }: { categories: TradeCategory[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  function reset() {
    setCompanyName("");
    setPhone("");
    setEmail("");
    setSelectedCategories([]);
    setError(null);
  }

  function toggleCategory(id: string) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTrade({
        companyName,
        phone,
        email,
        categoryIds: selectedCategories,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Trade added");
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
            <Plus className="h-4 w-4" />
            Add Trade
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add a trade partner</DialogTitle>
            <DialogDescription>
              Create a record for a subcontractor company. They can be invited to log in
              afterwards to manage their own crews and availability.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categories</Label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <Badge
                    key={c.id}
                    variant={selectedCategories.includes(c.id) ? "default" : "outline"}
                    className="cursor-pointer select-none"
                    onClick={() => toggleCategory(c.id)}
                  >
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding..." : "Add trade"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
