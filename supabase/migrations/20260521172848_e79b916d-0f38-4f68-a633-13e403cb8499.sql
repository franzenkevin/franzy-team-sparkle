-- Tabela de exames do aluno
CREATE TABLE public.user_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_name TEXT NOT NULL,
  exam_type TEXT,
  exam_date DATE,
  notes TEXT,
  file_path TEXT NOT NULL,
  file_mime TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own exams" ON public.user_exams
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own exams" ON public.user_exams
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own exams" ON public.user_exams
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own exams" ON public.user_exams
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all exams" ON public.user_exams
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_user_exams_updated_at
  BEFORE UPDATE ON public.user_exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_exams_user_date ON public.user_exams(user_id, exam_date DESC);

-- Storage bucket privado para arquivos de exames
INSERT INTO storage.buckets (id, name, public) VALUES ('exams', 'exams', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users view own exam files" ON storage.objects
  FOR SELECT USING (bucket_id = 'exams' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own exam files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exams' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own exam files" ON storage.objects
  FOR DELETE USING (bucket_id = 'exams' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins view all exam files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'exams' AND private.has_role(auth.uid(), 'admin'::app_role));
