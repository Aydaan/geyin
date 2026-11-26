'use client';

export default function WardrobeInsights({ tx, insights }) {
  if (!insights) return null;

  return (
    <section className="app-panel rounded-2xl border-2 p-5 flex flex-wrap items-center justify-between gap-4 animate-outfit-in">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs font-bold text-muted">{tx.totalItems}</p>
          <p className="text-xl font-extrabold">
            {insights.total} {tx.piecesUnit}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">{tx.avgWarmth}</p>
          <p className="text-xl font-extrabold">{insights.avgWarmth} / 5</p>
        </div>
        <div>
          <p className="text-xs font-bold text-muted">{tx.waterproofCount}</p>
          <p className="text-xl font-extrabold">
            {insights.waterproofCount} {tx.piecesUnit}
          </p>
        </div>
      </div>
      <p className="text-sm font-semibold text-muted max-w-md">{insights.suggestion}</p>
    </section>
  );
}
