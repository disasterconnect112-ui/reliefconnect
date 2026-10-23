create or replace function public.is_responder(_uid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _uid and role in ('admin','ngo','volunteer'))
$$;

-- NGO sign-ups get only volunteer privileges until an admin approves them
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r public.app_role;
begin
  r := case when new.raw_user_meta_data->>'role' = 'ngo' then 'ngo'::public.app_role else 'volunteer'::public.app_role end;
  insert into public.profiles (id, role, full_name, mobile, org_name)
  values (new.id, r, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'mobile', new.raw_user_meta_data->>'org_name');
  insert into public.user_roles (user_id, role) values (new.id, 'volunteer') on conflict do nothing;
  return new;
end $$;

create or replace function public.approve_ngo(_user uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not allowed'; end if;
  insert into public.user_roles (user_id, role) values (_user, 'ngo') on conflict do nothing;
end $$;
revoke execute on function public.approve_ngo(uuid) from public, anon;
grant execute on function public.approve_ngo(uuid) to authenticated;

drop policy if exists "responders read" on public.emergency_requests;
create policy "responders read" on public.emergency_requests for select to authenticated using (public.is_responder(auth.uid()));
drop policy if exists "admin update" on public.emergency_requests;
create policy "admin update" on public.emergency_requests for update to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'ngo'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'ngo'));

drop policy if exists "responders read history" on public.request_status_history;
create policy "responders read history" on public.request_status_history for select to authenticated using (public.is_responder(auth.uid()));

drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

drop policy if exists "read resources" on public.resources;
create policy "read resources" on public.resources for select to authenticated using (public.is_responder(auth.uid()));