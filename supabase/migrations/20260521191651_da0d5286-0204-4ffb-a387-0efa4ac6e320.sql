ALTER TABLE public.protocols REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.protocols;