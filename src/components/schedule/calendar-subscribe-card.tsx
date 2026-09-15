"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CalendarSubscribeCard({ feedUrl }: { feedUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — the field is still selectable.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Subscribe from your calendar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add this link as a subscribed calendar in Google Calendar, Outlook, or Apple Calendar.
          Every booking request or cancellation made in this app automatically appears there —
          no manual export needed.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={feedUrl} onFocus={(event) => event.target.select()} />
          <Button type="button" variant="outline" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
