
-- Challenges (admin creates)
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_at DATE NOT NULL,
  target_metric TEXT NOT NULL DEFAULT 'workouts', -- workouts | checkins | streak
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER NOT NULL DEFAULT 50,
  reward_badge TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view challenges" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update challenges" ON public.challenges FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete challenges" ON public.challenges FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_challenges_upd BEFORE UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Participations
CREATE TABLE public.challenge_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.challenge_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own participations" ON public.challenge_participations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own participations" ON public.challenge_participations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own participations" ON public.challenge_participations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own participations" ON public.challenge_participations FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all participations" ON public.challenge_participations FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- Journal
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mood INTEGER, -- 1-5
  sleep_hours NUMERIC,
  energy INTEGER, -- 1-5
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own journal" ON public.journal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own journal" ON public.journal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own journal" ON public.journal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own journal" ON public.journal_entries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all journals" ON public.journal_entries FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_journal_upd BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
