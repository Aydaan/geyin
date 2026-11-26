'use client';

export default function WardrobeInsights({ tx, insights }) {
  if (!insights) return null;

  return (
    <section className="app-panel rounded-2xl border p-5 flex flex-wrap items-center justify-between gap-4 animate-outfit-in">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-[11px] text-muted">{tx.totalItems}</p>
          <p className="text-lg font-bold">
            {insights.total} {tx.piecesUnit}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted">{tx.avgWarmth}</p>
          <p className="text-lg font-bold">{insights.avgWarmth} / 5</p>
        </div>
        <div>
          <p className="text-[11px] text-muted">{tx.waterproofCount}</p>
          <p className="text-lg font-bold">
            {insights.waterproofCount} {tx.piecesUnit}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted max-w-md">{insights.suggestion}</p>
    </section>
  );
}
