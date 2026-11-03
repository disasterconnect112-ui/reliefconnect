create or replace function public.touch_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into public.request_status_history (request_id, status, changed_by) values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;
revoke all on function public.touch_request() from public, anon, authenticated;