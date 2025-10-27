-- Add exigir_selfie flag to profiles to control selfie requirement
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS exigir_selfie boolean NOT NULL DEFAULT false;