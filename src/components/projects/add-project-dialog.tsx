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
import { createProject } from "@/app/(app)/projects/actions";
import type { Profile } from "@/lib/data";
import { Plus } from "lucide-react";

export function AddProjectDialog({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [address, setAddress] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [pmId, setPmId] = useState("");
  const [siteSupervisorId, setSiteSupervisorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const pms = profiles.filter((p) => p.role === "pm" || p.role === "admin");
  const supervisors = profiles.filter((p) => p.role === "site_supervisor" || p.role === "admin");

  function reset() {
    setName("");
    setProjectNumber("");
    setAddress("");
    setMapLink("");
    setPmId("");
    setSiteSupervisorId("");
    setStartDate("");
    setEndDate("");
    setError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createProject({
        name,
        projectNumber,
        address,
        mapLink,
        pmId,
        siteSupervisorId,
        startDate,
        endDate,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Project created");
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
            New Project
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a project</DialogTitle>
            <DialogDescription>
              Add a project so PMs and site supervisors can book trades against it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Project name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="projectNumber">Project number</Label>
              <Input id="projectNumber" required value={projectNumber} onChange={(e) => setProjectNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mapLink">Map link</Label>
              <Input id="mapLink" type="url" placeholder="https://maps.google.com/..." value={mapLink} onChange={(e) => setMapLink(e.target.value)} />
              <p className="text-xs text-muted-foreground">An address or map link is required.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project manager</Label>
                <Select value={pmId} onValueChange={(value) => setPmId(value ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select PM">
                      {(value: string | null) => pms.find((p) => p.id === value)?.full_name ?? "Select PM"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {pms.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Site supervisor</Label>
                <Select
                  value={siteSupervisorId}
                  onValueChange={(value) => setSiteSupervisorId(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select supervisor">
                      {(value: string | null) =>
                        supervisors.find((p) => p.id === value)?.full_name ?? "Select supervisor"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {supervisors.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">End date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
