
CREATE TABLE public.checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  weight NUMERIC,
  photo_front TEXT,
  photo_side TEXT,
  photo_back TEXT,
  notes TEXT,
  adherence INTEGER,
  protocol_id UUID REFERENCES public.protocols(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own checkins" ON public.checkins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own checkins" ON public.checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own checkins" ON public.checkins FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own checkins" ON public.checkins FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all checkins" ON public.checkins FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_checkins_user_date ON public.checkins(user_id, created_at DESC);

INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users view own photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND auth.uid()::text = (storage.foldername(name))[1]);
