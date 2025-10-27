-- Basic geolocation columns for pontos
ALTER TABLE pontos
ADD COLUMN IF NOT EXISTS latitude double precision;

ALTER TABLE pontos
ADD COLUMN IF NOT EXISTS longitude double precision;

ALTER TABLE pontos
ADD COLUMN IF NOT EXISTS accuracy real;

ALTER TABLE pontos
ADD COLUMN IF NOT EXISTS location_source text; -- e.g., 'gps', 'timeout', 'denied', 'unavailable', 'error'

-- Optional: composite index for frequent filters is already present (user_id, horario)
-- Consider adding partial indexes later if queries by location are needed.