ALTER TABLE public.protocols
ADD COLUMN IF NOT EXISTS hormones jsonb NOT NULL DEFAULT '[]'::jsonb;