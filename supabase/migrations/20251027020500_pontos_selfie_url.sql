-- Add optional selfie URL to pontos
ALTER TABLE pontos
ADD COLUMN IF NOT EXISTS selfie_url text;

-- Optional: index by user/date if needed later (left as a note)
-- CREATE INDEX IF NOT EXISTS idx_pontos_user_date ON pontos (user_id, horario);