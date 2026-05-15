
-- Protocols
CREATE TABLE public.protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  training JSONB NOT NULL DEFAULT '{}'::jsonb,
  diet JSONB NOT NULL DEFAULT '{}'::jsonb,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '60 days'),
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own protocols" ON public.protocols FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own protocols" ON public.protocols FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own protocols" ON public.protocols FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all protocols" ON public.protocols FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update all protocols" ON public.protocols FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON public.protocols FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_protocols_user_status ON public.protocols(user_id, status);

-- Exercises library
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  equipment TEXT,
  video_url TEXT,
  instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update exercises" ON public.exercises FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete exercises" ON public.exercises FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON public.exercises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Workout logs
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  protocol_id UUID REFERENCES public.protocols(id) ON DELETE SET NULL,
  day_index INTEGER NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sets JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own workout_logs" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own workout_logs" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workout_logs" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own workout_logs" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all workout_logs" ON public.workout_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_workout_logs_updated_at BEFORE UPDATE ON public.workout_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_workout_logs_user_date ON public.workout_logs(user_id, session_date DESC);

-- Workout feedback
CREATE TABLE public.workout_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  protocol_id UUID REFERENCES public.protocols(id) ON DELETE SET NULL,
  day_index INTEGER NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rating INTEGER NOT NULL CHECK (rating >= 0 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_index, session_date)
);
ALTER TABLE public.workout_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own workout_feedback" ON public.workout_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own workout_feedback" ON public.workout_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workout_feedback" ON public.workout_feedback FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all workout_feedback" ON public.workout_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_workout_feedback_updated_at BEFORE UPDATE ON public.workout_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
