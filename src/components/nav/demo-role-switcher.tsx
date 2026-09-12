"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setDemoRole } from "@/lib/demo/actions";
import type { UserRole } from "@/lib/database.types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "pm", label: "Project Manager" },
  { value: "site_supervisor", label: "Site Supervisor" },
  { value: "trade", label: "Trade Partner" },
];

export function DemoRoleSwitcher({ role }: { role: UserRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value) return;
    startTransition(async () => {
      await setDemoRole(value as UserRole);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1 px-1 pb-2">
      <p className="text-xs font-medium text-muted-foreground">Preview as</p>
      <Select value={role} onValueChange={handleChange} disabled={pending}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {(value: string | null) =>
              ROLE_OPTIONS.find((option) => option.value === value)?.label ?? "Select role"
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
  );
}
