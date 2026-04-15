
-- Add telegram_id to profiles
ALTER TABLE public.profiles ADD COLUMN telegram_id bigint UNIQUE;

-- Index for fast lookup
CREATE INDEX idx_profiles_telegram_id ON public.profiles (telegram_id) WHERE telegram_id IS NOT NULL;
