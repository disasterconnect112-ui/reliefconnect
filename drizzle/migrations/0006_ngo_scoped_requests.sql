-- Approved NGOs act as organizations only: approval swaps volunteer access for NGO access.
create or replace function public.approve_ngo(_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.profiles where id = _user and role = 'ngo') then
    raise exception 'This account has not applied as an NGO';
  end if;
  insert into public.user_roles (user_id, role) values (_user, 'ngo') on conflict do nothing;
  if not public.has_role(_user,'admin') then
    delete from public.user_roles where user_id = _user and role = 'volunteer';
  end if;
end $$;

create or replace function public.revoke_ngo(_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not allowed'; end if;
  delete from public.user_roles where user_id = _user and role = 'ngo';
  insert into public.user_roles (user_id, role) values (_user, 'volunteer') on conflict do nothing;
  update public.emergency_requests set ngo_id = null where ngo_id = _user and status <> 'completed';
end $$;

delete from public.user_roles v where v.role = 'volunteer'
  and exists (select 1 from public.user_roles n where n.user_id = v.user_id and n.role = 'ngo')
  and not exists (select 1 from public.user_roles a where a.user_id = v.user_id and a.role = 'admin');

create or replace function public.can_see_request(_uid uuid, _ngo uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(_uid,'admin') or public.has_role(_uid,'volunteer')
      or (public.has_role(_uid,'ngo') and _ngo = _uid)
$$;
revoke all on function public.can_see_request(uuid, uuid) from public, anon;
grant execute on function public.can_see_request(uuid, uuid) to authenticated;

drop policy if exists "responders read" on public.emergency_requests;
drop policy if exists "admin update" on public.emergency_requests;
create policy "read visible requests" on public.emergency_requests for select to authenticated
  using (public.can_see_request(auth.uid(), ngo_id));
create policy "admin update all" on public.emergency_requests for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "ngo update assigned" on public.emergency_requests for update to authenticated
  using (public.has_role(auth.uid(),'ngo') and ngo_id = auth.uid())
  with check (public.has_role(auth.uid(),'ngo') and ngo_id = auth.uid());

drop policy if exists "responders read history" on public.request_status_history;
create policy "read visible history" on public.request_status_history for select to authenticated
  using (exists (select 1 from public.emergency_requests r where r.id = request_id and public.can_see_request(auth.uid(), r.ngo_id)));