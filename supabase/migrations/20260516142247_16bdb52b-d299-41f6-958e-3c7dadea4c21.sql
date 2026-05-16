-- 1) ai_analyses: status (pending/approved) + admin update + visibility filter
ALTER TABLE public.ai_analyses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Existing rows count as approved so nothing disappears
UPDATE public.ai_analyses SET status = 'approved' WHERE status = 'pending' AND created_at < now();

-- Replace user_select policy to hide pending from students
DROP POLICY IF EXISTS ai_an_user_select ON public.ai_analyses;
CREATE POLICY ai_an_user_select ON public.ai_analyses
  FOR SELECT TO public
  USING (auth.uid() = user_id AND status = 'approved');

-- Allow admins to update (approve/edit/reject)
DROP POLICY IF EXISTS ai_an_admin_update ON public.ai_analyses;
CREATE POLICY ai_an_admin_update ON public.ai_analyses
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));

-- 2) Indices for the approval queues
CREATE INDEX IF NOT EXISTS idx_protocols_status ON public.protocols(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_status ON public.ai_analyses(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analyses_user_kind ON public.ai_analyses(user_id, kind, created_at DESC);