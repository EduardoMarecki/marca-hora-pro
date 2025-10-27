-- Add theme preference to profiles
DO $$ BEGIN
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'system'
    CHECK (theme_preference IN ('system','light','dark'));
EXCEPTION WHEN others THEN
  -- ignore if constraint already exists but keep default behavior
  NULL;
END $$;