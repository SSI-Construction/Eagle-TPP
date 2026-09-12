import type { BookingStatus } from "@/lib/database.types";

export interface CapacityDay {
  date: string; // yyyy-MM-dd
  totalCrews: number;
  booked: number;
  available: number;
}

export interface CapacityInput {
  tradeId: string;
  totalCrews: number;
  bookings: {
    startDate: string;
    endDate: string;
    status: BookingStatus;
    crewCount: number;
  }[];
  externalCommitments: { startDate: string; endDate: string; crewCount: number }[];
}

/** Inclusive day range as yyyy-MM-dd strings, using local dates (no timezone shifting). */
export function dateRange(start: Date, days: number): string[] {
  const out: string[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  for (let i = 0; i < days; i++) {
    out.push(toDateKey(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function overlaps(dateKey: string, startDate: string, endDate: string): boolean {
  return dateKey >= startDate && dateKey <= endDate;
}

/** Adds (or subtracts) whole days to a yyyy-MM-dd key, returning a new yyyy-MM-dd key. */
export function shiftDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Whole-day difference between two yyyy-MM-dd keys (endKey - startKey). */
export function diffDays(startKey: string, endKey: string): number {
  const start = new Date(`${startKey}T00:00:00`);
  const end = new Date(`${endKey}T00:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Builds per-day capacity (total / booked / available) for a single trade over a date range. */
export function buildTradeCapacity(input: CapacityInput, days: string[]): CapacityDay[] {
  return days.map((date) => {
    const bookedFromBookings = input.bookings
      .filter((b) => b.status !== "cancelled" && overlaps(date, b.startDate, b.endDate))
      .reduce((sum, b) => sum + b.crewCount, 0);
    const bookedFromExternal = input.externalCommitments
      .filter((e) => overlaps(date, e.startDate, e.endDate))
      .reduce((sum, e) => sum + e.crewCount, 0);
    const booked = bookedFromBookings + bookedFromExternal;
    return {
      date,
      totalCrews: input.totalCrews,
      booked,
      available: input.totalCrews - booked,
    };
  });
}

export type UtilizationLevel = "free" | "near" | "full" | "over";

export function utilizationLevel(day: CapacityDay): UtilizationLevel {
  if (day.totalCrews <= 0) return day.booked > 0 ? "over" : "free";
  if (day.available < 0) return "over";
  if (day.available === 0) return "full";
  if (day.available / day.totalCrews <= 0.25) return "near";
  return "free";
}
