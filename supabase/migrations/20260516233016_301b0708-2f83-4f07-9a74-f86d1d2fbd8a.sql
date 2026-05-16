
-- Library of reusable training/diet/hormones blocks for the coach
CREATE TABLE public.protocol_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('training','diet','hormones')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.protocol_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins select templates" ON public.protocol_templates
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert templates" ON public.protocol_templates
  FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update templates" ON public.protocol_templates
  FOR UPDATE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete templates" ON public.protocol_templates
  FOR DELETE TO authenticated USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_protocol_templates_updated_at
  BEFORE UPDATE ON public.protocol_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_protocol_templates_kind ON public.protocol_templates(kind);
