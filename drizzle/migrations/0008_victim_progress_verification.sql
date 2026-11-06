CREATE TABLE public.victim_progress_updates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_id uuid NOT NULL REFERENCES public.emergency_requests(id) ON DELETE CASCADE,
 volunteer_id uuid NOT NULL,
 progress text NOT NULL CHECK (progress IN ('arrived','help_received','still_need_help')),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.victim_progress_updates TO authenticated;
GRANT ALL ON public.victim_progress_updates TO service_role;
ALTER TABLE public.victim_progress_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "responders read visible victim updates" ON public.victim_progress_updates FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.emergency_requests r WHERE r.id = request_id AND public.can_see_request(auth.uid(), r.ngo_id)));
CREATE INDEX victim_progress_request_idx ON public.victim_progress_updates(request_id, created_at);
CREATE OR REPLACE FUNCTION public.track_request_private(_code text, _token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.emergency_requests;
BEGIN
 SELECT * INTO r FROM public.emergency_requests WHERE request_code = upper(trim(_code)) AND tracking_token = trim(_token);
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid private tracking key'; END IF;
 RETURN jsonb_build_object('volunteer_id', r.volunteer_id, 'status', r.status, 'volunteer_name', (SELECT full_name FROM public.profiles WHERE id = r.volunteer_id), 'updates', COALESCE((SELECT jsonb_agg(jsonb_build_object('progress', u.progress, 'at', u.created_at) ORDER BY u.created_at, u.id) FROM public.victim_progress_updates u WHERE u.request_id = r.id AND u.volunteer_id = r.volunteer_id), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.track_request_private(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_request_private(text,text) TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.verify_volunteer_progress(_code text, _token text, _volunteer uuid, _status text, _progress text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.emergency_requests; latest text;
BEGIN
 SELECT * INTO r FROM public.emergency_requests WHERE request_code = upper(trim(_code)) AND tracking_token = trim(_token) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invalid private tracking key'; END IF;
 IF r.volunteer_id IS NULL OR r.volunteer_id IS DISTINCT FROM _volunteer OR r.status IS DISTINCT FROM _status OR r.status NOT IN ('assigned','on_the_way','delivered','completed') THEN RAISE EXCEPTION 'Assignment changed. Refresh the request.'; END IF;
 IF _progress IS NULL OR _progress NOT IN ('arrived','help_received','still_need_help') THEN RAISE EXCEPTION 'Invalid progress'; END IF;
 SELECT progress INTO latest FROM public.victim_progress_updates WHERE request_id = r.id AND volunteer_id = r.volunteer_id ORDER BY created_at DESC, id DESC LIMIT 1;
 IF latest = _progress THEN RETURN; END IF;
 IF _progress = 'arrived' AND (r.status NOT IN ('assigned','on_the_way') OR latest = 'help_received') THEN RAISE EXCEPTION 'Arrival cannot be confirmed now'; END IF;
 INSERT INTO public.victim_progress_updates(request_id, volunteer_id, progress) VALUES (r.id, r.volunteer_id, _progress);
END $$;
REVOKE ALL ON FUNCTION public.verify_volunteer_progress(text,text,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_volunteer_progress(text,text,uuid,text,text) TO anon, authenticated;