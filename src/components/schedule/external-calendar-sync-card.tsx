"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  disconnectExternalCalendar,
  saveExternalCalendarUrl,
  syncExternalCalendarNow,
} from "@/app/(app)/schedule/actions";

export interface SyncedCommitmentRow {
  id: string;
  startDate: string;
  endDate: string;
  note: string | null;
}

export function ExternalCalendarSyncCard({
  icsFeedUrl,
  icsSyncedAt,
  syncedCommitments,
}: {
  icsFeedUrl: string | null;
  icsSyncedAt: string | null;
  syncedCommitments: SyncedCommitmentRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState(icsFeedUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveExternalCalendarUrl(url.trim());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(
        `Calendar connected — ${result.count} busy period${result.count === 1 ? "" : "s"} synced` +
          (result.skippedRecurring > 0 ? ` (${result.skippedRecurring} recurring event(s) skipped)` : ""),
      );
      router.refresh();
    });
  }

  function handleSyncNow() {
    setError(null);
    startTransition(async () => {
      const result = await syncExternalCalendarNow();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Synced ${result.count} busy period${result.count === 1 ? "" : "s"}`);
      router.refresh();
    });
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectExternalCalendar();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl("");
      toast.success("Calendar disconnected");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sync external calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect a read-only calendar feed (Google Calendar, Outlook, Apple Calendar) so busy
          time booked outside this app automatically blocks your capacity here. Look for a
          &quot;secret&quot; or &quot;iCal&quot; address ending in <code>.ics</code> in your
          calendar&apos;s sharing settings.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1 space-y-1">
            <Label htmlFor="icsUrl" className="text-xs">
              Calendar feed URL (.ics)
            </Label>
            <Input
              id="icsUrl"
              type="url"
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={pending} className="sm:self-end">
            {pending ? "Saving..." : icsFeedUrl ? "Update" : "Connect"}
          </Button>
        </form>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {icsFeedUrl && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <div>
                <div className="font-medium">Connected</div>
                <div className="text-xs text-muted-foreground">
                  {icsSyncedAt ? `Last synced ${new Date(icsSyncedAt).toLocaleString()}` : "Not synced yet"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={handleSyncNow}>
                  Sync now
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Upcoming busy periods from this calendar
              </p>
              {syncedCommitments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing upcoming.</p>
              ) : (
                <ul className="space-y-1">
                  {syncedCommitments.map((commitment) => (
                    <li key={commitment.id} className="rounded-md border px-3 py-1.5 text-sm">
                      <span className="font-medium">
                        {commitment.startDate} → {commitment.endDate}
                      </span>
                      {commitment.note && (
                        <span className="text-muted-foreground"> · {commitment.note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
