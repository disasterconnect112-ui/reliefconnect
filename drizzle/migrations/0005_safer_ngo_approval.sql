create or replace function public.approve_ngo(_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not allowed'; end if;
  if not exists (select 1 from public.profiles where id = _user and role = 'ngo') then
    raise exception 'This account has not applied as an NGO';
  end if;
  insert into public.user_roles (user_id, role) values (_user, 'ngo') on conflict do nothing;
end $$;

create or replace function public.revoke_ngo(_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Not allowed'; end if;
  delete from public.user_roles where user_id = _user and role = 'ngo';
end $$;

revoke all on function public.approve_ngo(uuid) from public, anon;
revoke all on function public.revoke_ngo(uuid) from public, anon;
grant execute on function public.approve_ngo(uuid) to authenticated;
grant execute on function public.revoke_ngo(uuid) to authenticated;