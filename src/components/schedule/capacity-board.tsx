"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CapacityDay } from "@/lib/capacity";
import { categoryColor } from "@/lib/category-colors";
import { NewBookingDialog } from "@/components/schedule/new-booking-dialog";
import { BookingDetailsDialog } from "@/components/schedule/booking-details-dialog";
import type { Project, TradeCategory, TradeWithDetails } from "@/lib/data";
import type { BookingStatus } from "@/lib/database.types";
import { X } from "lucide-react";

export interface BookingDetail {
  id: string;
  label: string;
  projectNumber: string | null;
  projectLocation: string | null;
  crewCount: number;
  source: "booking" | "external";
  status: BookingStatus | "external";
  startDate: string;
  endDate: string;
  bookedByName: string | null;
  confirmedByName: string | null;
}

export interface BoardRow {
  trade: TradeWithDetails;
  totalCrews: number;
  days: CapacityDay[];
  bookingsByDate: Record<string, BookingDetail[]>;
}

interface CapacityBoardProps {
  categories: TradeCategory[];
  rows: BoardRow[];
  days: string[];
  projects: Project[];
  trades: TradeWithDetails[];
  /** PMs/site supervisors/admins can book trades; trades can only view their own capacity. */
  canBook: boolean;
}

const STATUS_STYLES = {
  available: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200",
  requested: "bg-orange-100 text-orange-900 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-200",
  confirmed: "bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-950 dark:text-red-200",
  blocked: "bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200",
};

export function CapacityBoard({ categories, rows, days, projects, trades, canBook }: CapacityBoardProps) {
  const [categoryId, setCategoryId] = useState<string>("all");
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [tradeSearch, setTradeSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");

  const tradesInCategory = useMemo(
    () =>
      categoryId === "all"
        ? rows.map((r) => r.trade)
        : rows.map((r) => r.trade).filter((t) => t.categoryIds.includes(categoryId)),
    [rows, categoryId],
  );

  const categoryNameById = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const filteredRows = useMemo(() => {
    const normalizedTradeSearch = tradeSearch.trim().toLowerCase();
    const normalizedProjectSearch = projectSearch.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesCategory =
        categoryId === "all" || row.trade.categoryIds.includes(categoryId);
      const matchesTrade = !selectedTradeId || row.trade.id === selectedTradeId;
      const matchesTradeSearch = row.trade.company_name
        .toLowerCase()
        .includes(normalizedTradeSearch);
      const matchesProjectSearch =
        !normalizedProjectSearch ||
        Object.values(row.bookingsByDate).some((details) =>
          details.some(
            (detail) =>
              detail.source === "booking" &&
              (detail.label.toLowerCase().includes(normalizedProjectSearch) ||
                detail.projectNumber?.toLowerCase().includes(normalizedProjectSearch)),
          ),
        );
      return matchesCategory && matchesTrade && matchesTradeSearch && matchesProjectSearch;
    });
  }, [rows, categoryId, selectedTradeId, tradeSearch, projectSearch]);

  const hasActiveFilters =
    categoryId !== "all" || selectedTradeId !== null || tradeSearch !== "" || projectSearch !== "";

  function clearFilters() {
    setCategoryId("all");
    setSelectedTradeId(null);
    setTradeSearch("");
    setProjectSearch("");
  }

  return (
    <div className="flex flex-col gap-4 lg:h-full">
      <div className="flex flex-col gap-3">
        {/* Step 1: pick a category */}
        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <button
            type="button"
            onClick={() => {
              setCategoryId("all");
              setSelectedTradeId(null);
            }}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              categoryId === "all"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted",
            )}
          >
            All categories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategoryId(c.id);
                setSelectedTradeId(null);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                categoryId === c.id
                  ? cn(categoryColor(c.id), "ring-1 ring-current")
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Step 2: pick a trade within that category */}
        {categoryId !== "all" && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-dashed p-2">
            <span className="shrink-0 px-1 text-xs text-muted-foreground">Trades:</span>
            {tradesInCategory.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTradeId(selectedTradeId === t.id ? null : t.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  selectedTradeId === t.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                {t.company_name}
              </button>
            ))}
            {tradesInCategory.length === 0 && (
              <span className="px-1 text-xs text-muted-foreground">No trades in this category yet.</span>
            )}
            {selectedTradeId && (
              <button
                type="button"
                onClick={() => setSelectedTradeId(null)}
                className="ml-1 flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        )}

        {/* Step 3: narrow the visible schedule or request an open slot. */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            aria-label="Filter by trade"
            placeholder="Trade name"
            value={tradeSearch}
            onChange={(e) => setTradeSearch(e.target.value)}
            className="w-[220px]"
          />
          <Input
            aria-label="Filter by project name or number"
            placeholder="Project name or number"
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="w-[240px]"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              Clear filters
            </button>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Legend className={STATUS_STYLES.available} label="Available" />
            <Legend className={STATUS_STYLES.requested} label="Requested" />
            <Legend className={STATUS_STYLES.confirmed} label="Confirmed" />
            <Legend className={STATUS_STYLES.blocked} label="Outside work" />
          </div>

          {canBook && (
            <div className="ml-auto">
              <NewBookingDialog trades={trades} projects={projects} />
            </div>
          )}
        </div>
      </div>

      <div className="max-h-[65vh] overflow-auto rounded-lg border bg-background lg:max-h-none lg:min-h-0 lg:flex-1">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              <th className="sticky left-0 z-30 min-w-[220px] border-b border-r bg-background px-3 py-2 text-left font-medium">
                Trade
              </th>
              {days.map((day) => (
                <th
                  key={day}
                  className="min-w-[64px] border-b px-2 py-2 text-center font-medium text-muted-foreground"
                >
                  <DateHeader day={day} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.trade.id} className="group">
                <td className="sticky left-0 z-10 border-r bg-background px-3 py-2 align-top group-hover:bg-muted/40">
                  <div className="font-medium">{row.trade.company_name}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {row.totalCrews} crew{row.totalCrews === 1 ? "" : "s"}
                    </Badge>
                    {row.trade.categoryIds.map((id) => (
                      <span
                        key={id}
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
                          categoryColor(id),
                        )}
                      >
                        {categoryNameById.get(id) ?? "Category"}
                      </span>
                    ))}
                  </div>
                </td>
                {row.days.map((day) => {
                  const details = row.bookingsByDate[day.date] ?? [];
                  const style = details.some((detail) => detail.status === "confirmed")
                    ? STATUS_STYLES.confirmed
                    : details.some((detail) => detail.status === "tentative")
                      ? STATUS_STYLES.requested
                      : details.some((detail) => detail.status === "external")
                        ? STATUS_STYLES.blocked
                        : STATUS_STYLES.available;
                  const tooltip = details
                    .map(
                      (d) =>
                        `${d.label} · ${d.crewCount} crew${d.crewCount === 1 ? "" : "s"}${
                          d.source === "external" ? " (external)" : ""
                        }`,
                    )
                    .join("\n");
                  return (
                    <td key={day.date} className="border-b p-1 text-center align-middle">
                      {details.length > 0 ? (
                        <BookingDetailsDialog
                          tradeName={row.trade.company_name}
                          date={day.date}
                          details={details}
                          trigger={
                            <button
                              type="button"
                              title={tooltip || undefined}
                              className={cn(
                                "w-full rounded-md px-1 py-1.5 text-xs font-medium transition-colors",
                                style,
                              )}
                            >
                              {day.booked}/{day.totalCrews}
                            </button>
                          }
                        />
                      ) : canBook ? (
                        <NewBookingDialog
                          trades={trades}
                          projects={projects}
                          defaultTradeId={row.trade.id}
                          defaultDate={day.date}
                          trigger={
                            <button
                              type="button"
                              title={tooltip || undefined}
                              className={cn(
                                "w-full rounded-md px-1 py-1.5 text-xs font-medium transition-colors",
                                style,
                              )}
                            >
                              {day.booked}/{day.totalCrews}
                            </button>
                          }
                        />
                      ) : (
                        <span
                          title={tooltip || undefined}
                          className={cn(
                            "block w-full rounded-md px-1 py-1.5 text-xs font-medium",
                            style,
                          )}
                        >
                          {day.booked}/{day.totalCrews}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td
                  colSpan={days.length + 1}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No bookings or trades match these filters in the selected date range.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DateHeader({ day }: { day: string }) {
  const date = new Date(`${day}T00:00:00`);
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  return (
    <div className={cn(isWeekend && "text-muted-foreground/60")}>
      <div>{weekday}</div>
      <div>{date.getDate()}</div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("h-3 w-3 rounded-sm", className.split(" ")[0])} />
      {label}
    </div>
  );
}
