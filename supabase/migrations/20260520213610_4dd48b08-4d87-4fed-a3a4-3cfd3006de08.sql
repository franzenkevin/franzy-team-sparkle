
CREATE TABLE public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL DEFAULT 'snack',
  food_name text NOT NULL,
  amount_g numeric NOT NULL DEFAULT 100,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  source text,
  barcode text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_food_logs_user_date ON public.food_logs(user_id, log_date DESC);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own food_logs" ON public.food_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own food_logs" ON public.food_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own food_logs" ON public.food_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own food_logs" ON public.food_logs FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins view all food_logs" ON public.food_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_food_logs_updated_at BEFORE UPDATE ON public.food_logs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
