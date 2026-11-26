'use client';

import Image from 'next/image';
import { CATEGORIES, STYLES } from '@/lib/i18n';
import { WARDROBE_TEMPLATES } from '@/lib/wardrobe-templates';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong focus-visible:ring-offset-2 focus-visible:ring-offset-surface-solid';

export default function WardrobeForm({
  tx,
  lang,
  imageFile,
  imagePreviewUrl,
  selectedTemplate,
  category,
  subCategory,
  color,
  style,
  warmthLevel,
  waterproof,
  windproof,
  uploading,
  fileInputRef,
  onImageFileChange,
  onSelectTemplate,
  onCategoryChange,
  onSubCategoryChange,
  onColorChange,
  onStyleChange,
  onWarmthLevelChange,
  onWaterproofChange,
  onWindproofChange,
  onSubmit,
}) {
  const activePreviewUrl = imagePreviewUrl || selectedTemplate?.imageUrl || '';

  return (
    <section className="app-panel rounded-2xl border-2 p-6">
      <h2 className="text-xl font-bold mb-5">{tx.addNewItemTitle}</h2>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-3">
          <label htmlFor="clothes-file-input" className="block text-sm font-bold text-text">
            {tx.photoLabel}
          </label>
          <input
            ref={fileInputRef}
            id="clothes-file-input"
            type="file"
            accept="image/*"
            onChange={(e) => onImageFileChange(e.target.files?.[0] || null)}
            className="sr-only peer"
          />
          <div className="w-full rounded-xl bg-surface-2 border-border border-2 px-3.5 py-2.5 text-sm flex items-center gap-3 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-strong">
            <label
              htmlFor="clothes-file-input"
              className="min-h-[38px] inline-flex items-center rounded-lg bg-brand hover:bg-brand-strong text-brand-fg px-3.5 py-1.5 text-sm font-bold cursor-pointer transition active:scale-95 shrink-0"
            >
              {tx.chooseFileBtn}
            </label>
            <span className="text-sm font-medium text-muted truncate">
              {imageFile
                ? imageFile.name
                : selectedTemplate
                ? `${selectedTemplate.label[lang] || selectedTemplate.label.az}`
                : tx.noFileChosen}
            </span>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-xs sm:text-sm font-bold text-muted">{tx.templatePickerLabel}</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2.5">
              {WARDROBE_TEMPLATES.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id && !imageFile;
                const label = tpl.label[lang] || tpl.label.az;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelectTemplate(tpl)}
                    className={`group flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition cursor-pointer active:scale-95 ${FOCUS_RING} ${
                      isSelected
                        ? 'bg-brand-soft border-brand text-brand-strong shadow-sm'
                        : 'bg-surface-2 border-border text-text hover:border-brand/60'
                    }`}
                  >
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src={tpl.imageUrl}
                        alt={label}
                        fill
                        unoptimized
                        sizes="48px"
                        className="object-contain"
                      />
                    </div>
                    <span className="text-xs font-bold text-center leading-tight line-clamp-1">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activePreviewUrl && (
            <div className="flex items-center gap-3 pt-1 animate-outfit-in">
              <div className="relative w-16 h-20 rounded-xl overflow-hidden border-2 border-border bg-surface-2 shrink-0">
                <Image
                  src={activePreviewUrl}
                  alt={tx.previewAlt}
                  fill
                  unoptimized
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <span className="text-sm font-semibold text-brand-strong">
                {imageFile ? tx.previewReady : tx.templateSelectedReady}
              </span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="item-category" className="block text-sm font-bold text-text mb-1.5">
            {tx.categoryLabel}
          </label>
          <select
            id="item-category"
            value={typeof category === 'string' ? category : category?.value}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={`w-full rounded-xl bg-surface-2 border-border text-text border-2 px-3.5 py-2.5 text-base font-medium ${FOCUS_RING}`}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label[lang] || cat.label.az}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-subcategory" className="block text-sm font-bold text-text mb-1.5">
            {tx.subCategoryLabel}
          </label>
          <input
            id="item-subcategory"
            type="text"
            value={subCategory}
            onChange={(e) => onSubCategoryChange(e.target.value)}
            placeholder={tx.subCategoryPlaceholder}
            className={`w-full rounded-xl bg-surface-2 border-border text-text border-2 px-3.5 py-2.5 text-base font-medium ${FOCUS_RING}`}
          />
        </div>

        <div>
          <label htmlFor="item-color" className="block text-sm font-bold text-text mb-1.5">
            {tx.colorLabel}
          </label>
          <input
            id="item-color"
            type="text"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            placeholder={tx.colorPlaceholder}
            className={`w-full rounded-xl bg-surface-2 border-border text-text border-2 px-3.5 py-2.5 text-base font-medium ${FOCUS_RING}`}
          />
        </div>

        <div>
          <label htmlFor="item-style" className="block text-sm font-bold text-text mb-1.5">
            {tx.styleLabel}
          </label>
          <select
            id="item-style"
            value={style}
            onChange={(e) => onStyleChange(e.target.value)}
            className={`w-full rounded-xl bg-surface-2 border-border text-text border-2 px-3.5 py-2.5 text-base font-medium ${FOCUS_RING}`}
          >
            {STYLES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label[lang] || st.label.az}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between text-sm font-bold text-text mb-1.5">
            <label htmlFor="item-warmth">{tx.warmthSlider}</label>
            <span className="font-extrabold text-brand-strong">{warmthLevel} / 5</span>
          </div>
          <input
            id="item-warmth"
            type="range"
            min={1}
            max={5}
            value={warmthLevel}
            onChange={(e) => onWarmthLevelChange(e.target.value)}
            className={`w-full cursor-pointer rounded accent-brand ${FOCUS_RING}`}
          />
        </div>

        <div className="md:col-span-2 flex flex-wrap gap-6 pt-1">
          <label
            htmlFor="item-waterproof"
            className="min-h-[36px] flex items-center gap-2.5 text-base font-semibold text-text cursor-pointer"
          >
            <input
              id="item-waterproof"
              type="checkbox"
              checked={waterproof}
              onChange={(e) => onWaterproofChange(e.target.checked)}
              className={`h-5 w-5 rounded accent-brand ${FOCUS_RING}`}
            />
            {tx.waterproofCheck}
          </label>

          <label
            htmlFor="item-windproof"
            className="min-h-[36px] flex items-center gap-2.5 text-base font-semibold text-text cursor-pointer"
          >
            <input
              id="item-windproof"
              type="checkbox"
              checked={windproof}
              onChange={(e) => onWindproofChange(e.target.checked)}
              className={`h-5 w-5 rounded accent-brand ${FOCUS_RING}`}
            />
            {tx.windproofCheck}
          </label>
        </div>

        <div className="md:col-span-2 pt-2">
          <button
            type="submit"
            disabled={uploading}
            className={`w-full md:w-auto min-h-[48px] rounded-xl bg-brand hover:bg-brand-strong text-brand-fg disabled:opacity-50 font-bold px-7 py-3 text-base transition cursor-pointer active:scale-[0.98] ${FOCUS_RING}`}
          >
            {uploading ? tx.uploadingBtn : tx.addToWardrobeBtn}
          </button>
        </div>
      </form>
    </section>
  );
}
