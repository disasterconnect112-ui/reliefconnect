create or replace function public.submit_sos_multi(
  _types text[], _severity text, _lat double precision, _lng double precision, _name text, _mobile text, _description text, _people int
) returns table(request_code text, tracking_token text) language plpgsql security definer set search_path = public as $$
declare code text; tok text; t text;
begin
  if _types is null or array_length(_types,1) is null or array_length(_types,1) > 9 then raise exception 'choose at least one type'; end if;
  foreach t in array _types loop
    if t not in ('medical','food','water','shelter','rescue','medicine','child','elderly','other') then raise exception 'invalid type'; end if;
  end loop;
  if _severity not in ('critical','medium','low') then raise exception 'invalid severity'; end if;
  code := 'DR-' || extract(year from now())::text || '-' || lpad(nextval('public.request_seq')::text, 6, '0');
  insert into public.emergency_requests (request_code, emergency_type, priority, latitude, longitude, name, mobile, description, people_count)
  values (code, array_to_string(array(select distinct unnest(_types)), ','), _severity, _lat, _lng, nullif(left(_name,100),''), nullif(left(_mobile,20),''), nullif(left(_description,1000),''), _people)
  returning emergency_requests.tracking_token into tok;
  return query select code, tok;
end $$;
grant execute on function public.submit_sos_multi(text[],text,double precision,double precision,text,text,text,int) to anon, authenticated;