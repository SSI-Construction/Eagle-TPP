import { notFound } from "next/navigation";
import {
  getCurrentProfile,
  getExternalCommitmentsForTrade,
  getTradeWithDetailsById,
} from "@/lib/data";
import { CrewManager } from "@/components/trades/crew-manager";
import { InviteTradeDialog } from "@/components/trades/invite-trade-dialog";

export default async function TradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, trade, externalCommitments] = await Promise.all([
    getCurrentProfile(),
    getTradeWithDetailsById(id),
    getExternalCommitmentsForTrade(id),
  ]);

  if (!trade) notFound();

  // Trade users may only view/manage their own trade's page.
  if (profile?.role === "trade" && profile.trade_id !== trade.id) {
    notFound();
  }

  const canManage = profile?.role === "admin" || profile?.trade_id === trade.id;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{trade.company_name}</h1>
          <p className="text-sm text-muted-foreground">
            {trade.email || "No email on file"} {trade.phone ? `· ${trade.phone}` : ""}
          </p>
        </div>
        {profile?.role === "admin" && (
          <InviteTradeDialog
            tradeId={trade.id}
            defaultEmail={trade.email ?? ""}
            defaultFullName={trade.company_name}
          />
        )}
      </div>

      <CrewManager
        tradeId={trade.id}
        crews={trade.crews}
        externalCommitments={externalCommitments}
        canManage={canManage}
      />
    </div>
  );
}
