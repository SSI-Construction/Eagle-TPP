"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { respondToChangeRequest } from "@/app/(app)/schedule/actions";
import type { BookingChangeRequest, Profile } from "@/lib/data";

const STAFF_ROLES: Profile["role"][] = ["admin", "pm", "site_supervisor"];

export function NotificationsDropdown({
  requests,
  profile,
}: {
  requests: BookingChangeRequest[];
  profile: Profile;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isStaff = STAFF_ROLES.includes(profile.role);

  const needsResponse = requests.filter((r) =>
    r.requested_by_role === "trade"
      ? isStaff
      : profile.role === "trade" && profile.trade_id === r.trade_id,
  );
  const awaitingOther = requests.filter((r) => r.requested_by === profile.id);

  function respond(requestId: string, decision: "approved" | "rejected") {
    startTransition(async () => {
      const result = await respondToChangeRequest({ requestId, decision });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(decision === "approved" ? "Request approved" : "Request declined");
      router.refresh();
    });
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative shrink-0">
            <Bell className="h-4 w-4" />
            {needsResponse.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {needsResponse.length}
              </span>
            )}
            <span className="sr-only">Notifications</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="max-h-96 w-80 overflow-y-auto">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Needs your response</p>
            {needsResponse.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing pending.</p>
            ) : (
              <div className="space-y-2">
                {needsResponse.map((request) => (
                  <div key={request.id} className="rounded-md border p-2 text-sm">
                    <div className="font-medium">{request.project_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {request.requested_by_name} requested to{" "}
                      {request.request_type === "cancel" ? "cancel" : "reschedule"} · {request.trade_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {request.current_start_date} → {request.current_end_date}
                      {request.request_type === "reschedule" &&
                        request.proposed_start_date &&
                        request.proposed_end_date && (
                          <> becomes {request.proposed_start_date} → {request.proposed_end_date}</>
                        )}
                    </div>
                    {request.reason && (
                      <div className="mt-1 text-xs italic">&quot;{request.reason}&quot;</div>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" disabled={pending} onClick={() => respond(request.id, "approved")}>
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => respond(request.id, "rejected")}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {awaitingOther.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                Waiting on the other party
              </p>
              <div className="space-y-2">
                {awaitingOther.map((request) => (
                  <div key={request.id} className="rounded-md border p-2 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{request.project_name}</div>
                    <div className="text-xs">
                      {request.request_type === "cancel" ? "Cancellation" : "Reschedule"} requested ·{" "}
                      {request.trade_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
