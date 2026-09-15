"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { removeExternalJob } from "@/app/(app)/schedule/actions";
import { AddExternalJobDialog } from "@/components/schedule/add-external-job-dialog";
import type { TradeCrewMember } from "@/lib/data";

export interface MasterScheduleEntry {
  id: string;
  type: "booking" | "job" | "busy";
  label: string;
  crewNames: string[];
  status?: "tentative" | "confirmed";
  startDate: string;
  endDate: string;
}

const ENTRY_STYLES: Record<MasterScheduleEntry["type"], string> = {
  booking: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200",
  job: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  busy: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
};

const ENTRY_LABELS: Record<MasterScheduleEntry["type"], string> = {
  booking: "App booking",
  job: "Outside job",
  busy: "Synced busy time",
};

export function MasterScheduleCalendar({
  monthKey,
  prevMonthKey,
  nextMonthKey,
  todayMonthKey,
  todayKey,
  entriesByDate,
  crewMembers,
}: {
  monthKey: string;
  prevMonthKey: string;
  nextMonthKey: string;
  todayMonthKey: string;
  todayKey: string;
  entriesByDate: Record<string, MasterScheduleEntry[]>;
  crewMembers: TradeCrewMember[];
}) {
  const [crewFilter, setCrewFilter] = useState<string>("all");
  const cells = buildMonthGrid(monthKey);
  const monthLabel = new Date(`${monthKey}-01T00:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const matchesFilter = (entry: MasterScheduleEntry) =>
    crewFilter === "all" || entry.crewNames.some((name) => name === crewFilter);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
          <p className="text-sm text-muted-foreground">
            Everything your crews are scheduled for — app bookings, outside jobs, and synced
            calendar time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={crewFilter}
            onChange={(event) => setCrewFilter(event.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="all">All crew</option>
            {crewMembers.map((member) => (
              <option key={member.id} value={member.name}>
                {member.name}
              </option>
            ))}
          </select>
          <Link
            href={`/schedule/master?month=${prevMonthKey}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            ← Prev
          </Link>
          <Link
            href={`/schedule/master?month=${todayMonthKey}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Today
          </Link>
          <Link
            href={`/schedule/master?month=${nextMonthKey}`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Next →
          </Link>
          <AddExternalJobDialog members={crewMembers} defaultDate={todayKey} />
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="bg-muted/40 px-2 py-1.5 text-center font-medium">
            {day}
          </div>
        ))}
        {cells.map((date, index) => {
          if (!date) {
            return <div key={`blank-${index}`} className="min-h-24 bg-background/50" />;
          }
          const entries = (entriesByDate[date] ?? []).filter(matchesFilter);
          const visible = entries.slice(0, 3);
          const overflow = entries.length - visible.length;
          const isToday = date === todayKey;

          return (
            <DayCell
              key={date}
              date={date}
              isToday={isToday}
              entries={entries}
              visible={visible}
              overflow={overflow}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCell({
  date,
  isToday,
  entries,
  visible,
  overflow,
}: {
  date: string;
  isToday: boolean;
  entries: MasterScheduleEntry[];
  visible: MasterScheduleEntry[];
  overflow: number;
}) {
  const dayNumber = Number(date.slice(-2));

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex min-h-24 flex-col items-stretch gap-1 bg-background p-1.5 text-left align-top hover:bg-muted/60",
              entries.length === 0 && "cursor-default",
            )}
          >
            <span
              className={cn(
                "self-start rounded-full px-1.5 text-[11px] font-medium",
                isToday && "bg-primary text-primary-foreground",
              )}
            >
              {dayNumber}
            </span>
            {visible.map((entry) => (
              <span
                key={entry.id}
                className={cn("truncate rounded px-1 py-0.5 text-[11px] font-medium", ENTRY_STYLES[entry.type])}
              >
                {entry.label}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[11px] text-muted-foreground">+{overflow} more</span>
            )}
          </button>
        }
      />
      {entries.length > 0 && <DayEntriesDialog date={date} entries={entries} />}
    </Dialog>
  );
}

function DayEntriesDialog({ date, entries }: { date: string; entries: MasterScheduleEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeExternalJob(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Job removed");
      router.refresh();
    });
  }

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{formatDate(date)}</DialogTitle>
        <DialogDescription>Everything scheduled this day</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div key={entry.id} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{entry.label}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.startDate} → {entry.endDate}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {entry.crewNames.length > 0 ? entry.crewNames.join(", ") : "No crew assigned"}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge variant="outline" className={cn("text-[10px]", ENTRY_STYLES[entry.type])}>
                  {ENTRY_LABELS[entry.type]}
                </Badge>
                {entry.type === "job" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => handleRemove(entry.id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </DialogContent>
  );
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** 6 full weeks (42 cells) covering the month, padded with nulls outside it. */
function buildMonthGrid(monthKey: string): (string | null)[] {
  const [year, month] = monthKey.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month - 1, day);
    cells.push(
      `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`,
    );
  }
  while (cells.length < 42) cells.push(null);
  return cells;
}
