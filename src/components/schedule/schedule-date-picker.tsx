"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ScheduleDatePickerProps {
  /** Currently selected range start, as a yyyy-MM-dd string. */
  startDate: string;
}

export function ScheduleDatePicker({ startDate }: ScheduleDatePickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="gap-2">
            <CalendarIcon className="size-4" />
            Jump to date
          </Button>
        }
      />
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={new Date(`${startDate}T00:00:00`)}
          defaultMonth={new Date(`${startDate}T00:00:00`)}
          onSelect={(date) => {
            if (!date) return;
            setOpen(false);
            const y = date.getFullYear();
            const m = `${date.getMonth() + 1}`.padStart(2, "0");
            const d = `${date.getDate()}`.padStart(2, "0");
            router.push(`/schedule?start=${y}-${m}-${d}`);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
