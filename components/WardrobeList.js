'use client';

import Image from 'next/image';
import { CATEGORIES, getCategoryLabel } from '@/lib/i18n';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid';

export default function WardrobeList({
  tx,
  lang,
  filteredItems,
  loadingItems,
  selectedCategoryFilter,
  onSelectCategoryFilter,
  pendingDeleteItem,
  deletingItemId,
  onRequestDeleteItem,
  onConfirmDeleteItem,
  onCancelDeleteItem,
}) {
  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            {tx.myItemsTitle} ({filteredItems.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              aria-pressed={selectedCategoryFilter === 'Hamısı'}
              onClick={() => onSelectCategoryFilter('Hamısı')}
              className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
                selectedCategoryFilter === 'Hamısı'
                  ? 'bg-brand text-brand-fg'
                  : 'bg-surface-solid text-muted hover:text-text border-border border'
              }`}
            >
              {tx.allFilter}
            </button>

            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.value}
                aria-pressed={selectedCategoryFilter === cat.value}
                onClick={() => onSelectCategoryFilter(cat.value)}
                className={`min-h-[36px] rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
                  selectedCategoryFilter === cat.value
                    ? 'bg-brand text-brand-fg'
                    : 'bg-surface-solid text-muted hover:text-text border-border border'
                }`}
              >
                {cat.label[lang] || cat.label.az}
              </button>
            ))}
          </div>
        </div>

        {loadingItems ? (
          <p className="text-sm text-muted">{tx.loadingWardrobe}</p>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-2xl bg-surface-solid border-border shadow-sm dark:shadow-none border p-8 text-center text-sm text-muted">
            {tx.emptyCategoryMsg}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-surface-solid border-border shadow-sm dark:shadow-none border overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1"
              >
                <div>
                  <div className="relative w-full h-44 bg-surface-muted">
                    <Image
                      src={item.image_url}
                      alt={item.sub_category || getCategoryLabel(item.category, lang)}
                      fill
                      unoptimized
                      sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3.5 space-y-1.5">
                    <p className="text-xs font-semibold">{getCategoryLabel(item.category, lang)}</p>
                    {item.sub_category && (
                      <p className="text-xs text-muted">{item.sub_category}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {item.color && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-2 border-border border text-muted">
                          {item.color}
                        </span>
                      )}
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-surface-2 border-border border text-muted">
                        {tx.warmthShort}: {item.warmth_level}/5
                      </span>
                      {item.waterproof && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-sky-100 text-sky-900 dark:bg-sky-500/15 dark:text-sky-300">
                          {tx.waterproofBadge}
                        </span>
                      )}
                      {item.windproof && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-teal-100 text-teal-900 dark:bg-teal-500/15 dark:text-teal-300">
                          {tx.windproofBadge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-3.5 pb-3">
                  <button
                    type="button"
                    disabled={deletingItemId === item.id}
                    onClick={() => onRequestDeleteItem(item)}
                    className={`w-full min-h-[36px] rounded-lg bg-surface-2 border-border hover:bg-red-500/15 border hover:border-red-500/30 py-2 text-xs text-muted hover:text-red-500 transition cursor-pointer active:scale-95 disabled:opacity-50 ${FOCUS_RING}`}
                  >
                    {tx.deleteBtn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {pendingDeleteItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          onClick={() => {
            if (!deletingItemId) onCancelDeleteItem();
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-solid border-border shadow-xl border p-5 space-y-4 animate-outfit-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {pendingDeleteItem.image_url && (
                <div className="relative w-14 h-16 rounded-xl overflow-hidden border border-border shrink-0">
                  <Image
                    src={pendingDeleteItem.image_url}
                    alt={
                      pendingDeleteItem.sub_category ||
                      getCategoryLabel(pendingDeleteItem.category, lang)
                    }
                    fill
                    unoptimized
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
              )}
              <div>
                <h3 id="delete-confirm-title" className="text-base font-semibold">
                  {tx.deleteConfirmTitle}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  {pendingDeleteItem.sub_category ||
                    getCategoryLabel(pendingDeleteItem.category, lang)}
                  {pendingDeleteItem.color ? ` • ${pendingDeleteItem.color}` : ''}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {tx.deleteConfirmBody}
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={!!deletingItemId}
                onClick={onCancelDeleteItem}
                className={`rounded-xl bg-surface-2 border-border text-text border px-4 py-2 text-xs font-medium transition cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}
              >
                {tx.cancelBtn}
              </button>
              <button
                type="button"
                disabled={!!deletingItemId}
                onClick={() => onConfirmDeleteItem(pendingDeleteItem)}
                className={`rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${FOCUS_RING}`}
              >
                {deletingItemId === pendingDeleteItem.id ? tx.deletingBtn : tx.deleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
