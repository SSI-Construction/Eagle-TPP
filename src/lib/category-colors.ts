// A small curated palette so category chips look distinct without needing a
// per-category color stored in the database. Deterministic by category id.
const PALETTE = [
  "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30",
  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30",
  "bg-lime-100 text-lime-800 border-lime-200 dark:bg-lime-500/15 dark:text-lime-300 dark:border-lime-500/30",
  "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 dark:border-fuchsia-500/30",
  "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30",
];

export function categoryColor(categoryId: string): string {
  let hash = 0;
  for (let i = 0; i < categoryId.length; i++) {
    hash = (hash * 31 + categoryId.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
