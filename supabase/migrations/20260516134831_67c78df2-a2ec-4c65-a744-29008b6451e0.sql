-- Anamnese: novos campos no profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS previous_consultation TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS psych_meds TEXT,
  ADD COLUMN IF NOT EXISTS ergogenics_history TEXT,
  ADD COLUMN IF NOT EXISTS goal_3m TEXT,
  ADD COLUMN IF NOT EXISTS goal_1y TEXT,
  ADD COLUMN IF NOT EXISTS gym_brand TEXT,
  ADD COLUMN IF NOT EXISTS structural_limit TEXT,
  ADD COLUMN IF NOT EXISTS daily_discomfort TEXT,
  ADD COLUMN IF NOT EXISTS exercise_discomfort TEXT,
  ADD COLUMN IF NOT EXISTS current_split TEXT,
  ADD COLUMN IF NOT EXISTS aerobic_protocol TEXT,
  ADD COLUMN IF NOT EXISTS aerobic_fasted BOOLEAN,
  ADD COLUMN IF NOT EXISTS diet_status TEXT,
  ADD COLUMN IF NOT EXISTS fasting_morning TEXT,
  ADD COLUMN IF NOT EXISTS digestibility TEXT,
  ADD COLUMN IF NOT EXISTS bowel_routine TEXT,
  ADD COLUMN IF NOT EXISTS current_diet_text TEXT,
  ADD COLUMN IF NOT EXISTS daily_routine TEXT,
  ADD COLUMN IF NOT EXISTS hard_meal_times TEXT,
  ADD COLUMN IF NOT EXISTS sweet_anxiety_times TEXT,
  ADD COLUMN IF NOT EXISTS liked_foods TEXT,
  ADD COLUMN IF NOT EXISTS manipulated_fitoterapics TEXT,
  ADD COLUMN IF NOT EXISTS sleep_quality TEXT,
  ADD COLUMN IF NOT EXISTS hormonal_side_effects TEXT,
  ADD COLUMN IF NOT EXISTS weekend_routine TEXT,
  ADD COLUMN IF NOT EXISTS junk_food_choice TEXT,
  ADD COLUMN IF NOT EXISTS photo_front_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_side_url TEXT,
  ADD COLUMN IF NOT EXISTS photo_back_url TEXT,
  ADD COLUMN IF NOT EXISTS anamnese_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anamnese_extra JSONB DEFAULT '{}'::jsonb;

-- Weekly feedback
CREATE TABLE IF NOT EXISTS public.weekly_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  week_start DATE NOT NULL DEFAULT CURRENT_DATE,
  adherence_diet INTEGER,
  adherence_training INTEGER,
  energy INTEGER,
  sleep_quality INTEGER,
  weight NUMERIC,
  measurements JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "weekly_user_select" ON public.weekly_feedbacks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weekly_user_insert" ON public.weekly_feedbacks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_user_update" ON public.weekly_feedbacks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weekly_user_delete" ON public.weekly_feedbacks FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "weekly_admin_all" ON public.weekly_feedbacks FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Diet feedback
CREATE TABLE IF NOT EXISTS public.diet_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  protocol_id UUID,
  meal_index INTEGER,
  rating INTEGER NOT NULL,
  hunger INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.diet_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diet_fb_user_select" ON public.diet_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diet_fb_user_insert" ON public.diet_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diet_fb_user_update" ON public.diet_feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "diet_fb_admin_all" ON public.diet_feedback FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- Monthly analyses (a cada 4 semanas)
CREATE TABLE IF NOT EXISTS public.monthly_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC,
  measurements JSONB DEFAULT '{}'::jsonb,
  photo_front TEXT,
  photo_side TEXT,
  photo_back TEXT,
  ai_summary TEXT,
  coach_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.monthly_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "monthly_user_select" ON public.monthly_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "monthly_user_insert" ON public.monthly_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "monthly_user_update" ON public.monthly_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "monthly_admin_select" ON public.monthly_analyses FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "monthly_admin_update" ON public.monthly_analyses FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

-- AI analyses históricas
CREATE TABLE IF NOT EXISTS public.ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_an_user_select" ON public.ai_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_an_user_insert" ON public.ai_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ai_an_admin_select" ON public.ai_analyses FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "ai_an_admin_insert" ON public.ai_analyses FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- Triggers updated_at
CREATE TRIGGER trg_weekly_fb_updated BEFORE UPDATE ON public.weekly_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_monthly_an_updated BEFORE UPDATE ON public.monthly_analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();