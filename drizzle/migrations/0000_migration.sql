create type public.app_role as enum ('admin','volunteer','ngo');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'volunteer',
  full_name text not null default '',
  mobile text,
  location text,
  latitude double precision,
  longitude double precision,
  skills text[] not null default '{}',
  availability text not null default 'available',
  experience text,
  org_name text,
  org_reg_no text,
  org_type text,
  address text,
  services text[] not null default '{}',
  points int not null default 0,
  completed_tasks int not null default 0,
  emergency_tasks int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "read profiles" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid() and role <> 'admin');
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin')) with check (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "delete own profile" on public.profiles for delete to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- prevent users editing points/role themselves
create or replace function public.protect_profile_fields() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('app.trusted', true) = 'on' or public.has_role(auth.uid(),'admin') then return new; end if;
  new.points := old.points; new.completed_tasks := old.completed_tasks; new.emergency_tasks := old.emergency_tasks;
  if new.role = 'admin' then new.role := old.role; end if;
  return new;
end $$;
create trigger protect_profile before update on public.profiles for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare r public.app_role;
begin
  r := case when new.raw_user_meta_data->>'role' = 'ngo' then 'ngo'::public.app_role else 'volunteer'::public.app_role end;
  insert into public.profiles (id, role, full_name, mobile, org_name)
  values (new.id, r, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.raw_user_meta_data->>'mobile', new.raw_user_meta_data->>'org_name');
  insert into public.user_roles (user_id, role) values (new.id, r) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create sequence public.request_seq start 1;

create table public.emergency_requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique,
  tracking_token text not null default encode(gen_random_bytes(6),'hex'),
  emergency_type text not null,
  priority text not null default 'normal',
  latitude double precision,
  longitude double precision,
  name text,
  mobile text,
  description text,
  people_count int,
  status text not null default 'received',
  volunteer_id uuid,
  ngo_id uuid,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.emergency_requests to authenticated;
grant all on public.emergency_requests to service_role;
alter table public.emergency_requests enable row level security;
create policy "responders read" on public.emergency_requests for select to authenticated using (true);
create policy "admin update" on public.emergency_requests for update to authenticated using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'ngo')) with check (true);

create table public.request_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.emergency_requests(id) on delete cascade,
  status text not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.request_status_history to authenticated;
grant all on public.request_status_history to service_role;
alter table public.request_status_history enable row level security;
create policy "responders read history" on public.request_status_history for select to authenticated using (true);

create or replace function public.log_request_status() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.request_status_history (request_id, status, changed_by) values (new.id, new.status, auth.uid());
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger log_status after insert on public.emergency_requests for each row execute function public.log_request_status();
create or replace function public.touch_request() returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    insert into public.request_status_history (request_id, status, changed_by) values (new.id, new.status, auth.uid());
  end if;
  return new;
end $$;
create trigger touch_req before update on public.emergency_requests for each row execute function public.touch_request();

create or replace function public.priority_for(t text) returns text language sql immutable as $$
  select case when t in ('medical','rescue','child','elderly') then 'critical'
              when t in ('medicine','shelter') then 'high' else 'normal' end
$$;

-- Public SOS (no login)
create or replace function public.submit_sos(
  _type text, _lat double precision, _lng double precision, _name text, _mobile text, _description text, _people int
) returns table(request_code text, tracking_token text) language plpgsql security definer set search_path = public as $$
declare code text; tok text;
begin
  if _type not in ('medical','food','water','shelter','rescue','medicine','child','elderly','other') then raise exception 'invalid type'; end if;
  code := 'DR-' || extract(year from now())::text || '-' || lpad(nextval('public.request_seq')::text, 6, '0');
  insert into public.emergency_requests (request_code, emergency_type, priority, latitude, longitude, name, mobile, description, people_count)
  values (code, _type, public.priority_for(_type), _lat, _lng, nullif(left(_name,100),''), nullif(left(_mobile,20),''), nullif(left(_description,1000),''), _people)
  returning emergency_requests.tracking_token into tok;
  return query select code, tok;
end $$;
grant execute on function public.submit_sos(text,double precision,double precision,text,text,text,int) to anon, authenticated;

create or replace function public.track_request(_code text)
returns table(request_code text, emergency_type text, priority text, status text, created_at timestamptz, updated_at timestamptz, history jsonb)
language sql stable security definer set search_path = public as $$
  select r.request_code, r.emergency_type, r.priority, r.status, r.created_at, r.updated_at,
    coalesce((select jsonb_agg(jsonb_build_object('status',h.status,'at',h.created_at) order by h.created_at) from public.request_status_history h where h.request_id = r.id), '[]'::jsonb)
  from public.emergency_requests r where upper(r.request_code) = upper(trim(_code))
$$;
grant execute on function public.track_request(text) to anon, authenticated;

-- Volunteer task actions with points
create or replace function public.volunteer_action(_request uuid, _action text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.emergency_requests; pts int := 0; uid uuid := auth.uid();
begin
  if uid is null or not public.has_role(uid,'volunteer') then raise exception 'volunteers only'; end if;
  select * into r from public.emergency_requests where id = _request for update;
  if not found then raise exception 'not found'; end if;
  perform set_config('app.trusted','on', true);
  if _action = 'accept' then
    if r.volunteer_id is not null or r.status <> 'received' then raise exception 'already taken'; end if;
    update public.emergency_requests set volunteer_id = uid, status = 'assigned', accepted_at = now() where id = _request;
    update public.profiles set points = points + 5 where id = uid;
  elsif r.volunteer_id <> uid then raise exception 'not your task';
  elsif _action = 'reject' then
    update public.emergency_requests set volunteer_id = null, status = 'received', accepted_at = null where id = _request;
  elsif _action = 'on_the_way' then
    update public.emergency_requests set status = 'on_the_way' where id = _request;
  elsif _action = 'delivered' then
    update public.emergency_requests set status = 'delivered' where id = _request;
  elsif _action = 'complete' then
    if r.status = 'completed' then raise exception 'already completed'; end if;
    pts := 20;
    if r.priority = 'critical' then pts := pts + 30; end if;
    if r.emergency_type = 'medical' then pts := pts + 25; end if;
    if r.emergency_type = 'rescue' then pts := pts + 50; end if;
    update public.emergency_requests set status = 'completed', completed_at = now() where id = _request;
    update public.profiles set points = points + pts, completed_tasks = completed_tasks + 1,
      emergency_tasks = emergency_tasks + case when r.priority = 'critical' then 1 else 0 end where id = uid;
  else raise exception 'bad action'; end if;
end $$;
revoke execute on function public.volunteer_action(uuid,text) from public, anon;
grant execute on function public.volunteer_action(uuid,text) to authenticated;

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  kind text not null default 'relief_camp',
  name text not null,
  quantity int not null default 0,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.resources to authenticated;
grant all on public.resources to service_role;
alter table public.resources enable row level security;
create policy "read resources" on public.resources for select to authenticated using (true);
create policy "manage own resources" on public.resources for all to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check ((owner_id = auth.uid() and (public.has_role(auth.uid(),'ngo') or public.has_role(auth.uid(),'admin'))) or public.has_role(auth.uid(),'admin'));
