import { shiftDateKey } from "@/lib/capacity";

export interface IcsBusyRange {
  uid: string;
  summary: string;
  startDate: string;
  endDate: string;
}

export interface ParseIcsResult {
  ranges: IcsBusyRange[];
  skippedRecurring: number;
}

const MAX_EVENTS = 300;

/**
 * Minimal RFC5545 parser: pulls single-occurrence VEVENT busy periods
 * (day-level granularity) out of an .ics feed. Recurring events (RRULE) are
 * skipped rather than expanded, and past events are dropped since they no
 * longer affect capacity.
 */
export function parseIcsBusyRanges(icsText: string, todayDateKey: string): ParseIcsResult {
  const lines = unfoldIcsLines(icsText);
  const ranges: IcsBusyRange[] = [];
  let skippedRecurring = 0;

  let inEvent = false;
  let current: Record<string, { params: string; value: string }> = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      inEvent = false;
      if (ranges.length + skippedRecurring >= MAX_EVENTS) continue;

      if (current.RRULE) {
        skippedRecurring += 1;
        continue;
      }
      if (current.STATUS?.value.toUpperCase() === "CANCELLED") continue;

      const dtstart = current.DTSTART;
      if (!dtstart) continue;
      const startDate = dateKeyFromIcsValue(dtstart.value);
      if (!startDate) continue;

      const isAllDay = dtstart.params.includes("VALUE=DATE") && !dtstart.params.includes("VALUE=DATE-TIME");
      const dtend = current.DTEND;
      let endDate = startDate;
      if (dtend) {
        const rawEnd = dateKeyFromIcsValue(dtend.value);
        if (rawEnd) {
          // All-day DTEND is exclusive per spec — the real last busy day is one before it.
          endDate = isAllDay ? shiftDateKey(rawEnd, -1) : rawEnd;
          if (endDate < startDate) endDate = startDate;
        }
      }

      if (endDate < todayDateKey) continue;

      ranges.push({
        uid: current.UID?.value || `${startDate}-${endDate}-${ranges.length}`,
        summary: unescapeIcsText(current.SUMMARY?.value || "Busy").slice(0, 200),
        startDate,
        endDate,
      });
      continue;
    }

    if (!inEvent) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const rawName = line.slice(0, colonIndex);
    const value = line.slice(colonIndex + 1).trim();
    const [name, ...paramParts] = rawName.split(";");
    current[name.toUpperCase()] = { params: paramParts.join(";").toUpperCase(), value };
  }

  return { ranges, skippedRecurring };
}

/** Joins RFC5545 folded continuation lines (leading space/tab) back together. */
function unfoldIcsLines(text: string): string[] {
  const rawLines = text.split(/\r\n|\n|\r/);
  const unfolded: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded.map((line) => line.trim());
}

function dateKeyFromIcsValue(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${m}-${d}`;
}

function unescapeIcsText(value: string): string {
  return value.replace(/\\n/gi, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export interface IcsExportEvent {
  uid: string;
  title: string;
  startDate: string;
  endDate: string;
  description?: string;
}

/** Builds a minimal RFC5545 .ics document for external calendar apps to subscribe to. */
export function buildIcsCalendar(calendarName: string, events: IcsExportEvent[]): string {
  const now = icsTimestamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Trade Schedule//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    // All-day DTEND is exclusive per RFC5545, so push it one day past the last busy day.
    const exclusiveEnd = shiftDateKey(event.endDate, 1);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(event.uid)}`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${event.startDate.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${exclusiveEnd.replace(/-/g, "")}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function icsTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}
