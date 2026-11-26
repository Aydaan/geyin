-- Persist storage object path directly on wardrobe_items so deletes and
-- signed URL resolution do not rely solely on parsing image_url.
alter table public.wardrobe_items
  add column if not exists image_path text;
