-- ============================================================
-- Multi-Location PDF Support
-- Adds configuration columns to payer_forms so the PDF
-- generation engine knows how to handle forms with multiple
-- location sections (repeating pages or fixed overflow slots).
-- ============================================================

ALTER TABLE payer_forms
  -- 'single'    → one location only (existing behavior, default)
  -- 'fixed'     → form has N fixed location slots; overflow gets a text placeholder
  -- 'repeating' → form has a page that clones for every N extra locations
  ADD COLUMN IF NOT EXISTS pdf_type             TEXT    NOT NULL DEFAULT 'single',

  -- For 'repeating': which page (0-indexed) gets cloned for overflow locations.
  -- E.g. page 3 on MHS (0-indexed = 2) is the "Other Practice Locations" page.
  ADD COLUMN IF NOT EXISTS repeating_page_index INTEGER,

  -- For 'repeating': how many location slots appear on each repeating page.
  -- Typically 2 (e.g. MHS has 2 location blocks per page).
  ADD COLUMN IF NOT EXISTS locations_per_page   INTEGER NOT NULL DEFAULT 2,

  -- For 'repeating': which pages (0-indexed) are static and get filled once.
  -- E.g. [0, 1, 3] for MHS — only page 2 (index 2) repeats.
  -- If NULL, all non-repeating pages are treated as static.
  ADD COLUMN IF NOT EXISTS static_pages         JSONB,

  -- For 'fixed': how many location slots the base form supports.
  -- Locations beyond this count trigger the overflow_text.
  ADD COLUMN IF NOT EXISTS location_slot_count  INTEGER,

  -- For 'fixed': text to place in the first overflow location slot.
  -- Defaults to the standard credentialing shorthand.
  ADD COLUMN IF NOT EXISTS overflow_text        TEXT    NOT NULL DEFAULT 'See attached letter';