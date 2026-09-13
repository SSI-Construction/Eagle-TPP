import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getTradeCategories, getTradesWithDetails } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { AddTradeDialog } from "@/components/trades/add-trade-dialog";
import { categoryColor } from "@/lib/category-colors";
import { cn } from "@/lib/utils";

export default async function TradesPage() {
  const profile = await getCurrentProfile();

  // Trades only ever manage their own record, never the full trade list.
  if (profile?.role === "trade") {
    redirect(profile.trade_id ? `/trades/${profile.trade_id}` : "/schedule");
  }
  // Precast/Safety have their own placeholder dashboards for now.
  if (profile?.role === "precast") redirect("/precast");
  if (profile?.role === "safety") redirect("/safety");

  const [categories, trades] = await Promise.all([getTradeCategories(), getTradesWithDetails()]);

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Trades</h1>
          <p className="text-sm text-muted-foreground">
            Manage the trade partner pool, their categories, and crew capacity.
          </p>
        </div>
        {profile?.role === "admin" && <AddTradeDialog categories={categories} />}
      </div>

      <div className="overflow-hidden rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">Company</th>
              <th className="px-4 py-2.5 text-left font-medium">Categories</th>
              <th className="px-4 py-2.5 text-left font-medium">Active crews</th>
              <th className="px-4 py-2.5 text-left font-medium">Contact</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-t">
                <td className="px-4 py-3">
                  <Link href={`/trades/${trade.id}`} className="font-medium hover:underline">
                    {trade.company_name}
                  </Link>
                  {!trade.is_active && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Inactive
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {trade.categoryIds.map((id) => (
                      <span
                        key={id}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs font-medium",
                          categoryColor(id),
                        )}
                      >
                        {categoryNameById.get(id) ?? "Unknown"}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {trade.crews.filter((c) => c.is_active).length} / {trade.crews.length}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {trade.email || trade.phone || "—"}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                  No trades yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
