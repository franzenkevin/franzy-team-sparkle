
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  include_photos boolean NOT NULL DEFAULT false,
  include_notes boolean NOT NULL DEFAULT true,
  title text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_share_links_token ON public.share_links(token);
CREATE INDEX idx_share_links_user ON public.share_links(user_id);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active share links"
  ON public.share_links FOR SELECT
  USING (expires_at > now());

CREATE POLICY "Users insert own share links"
  ON public.share_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own share links"
  ON public.share_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own share links"
  ON public.share_links FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_share_links_updated_at
  BEFORE UPDATE ON public.share_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
