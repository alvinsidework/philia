-- Bootstrap the owner and provide tightly scoped, admin-only role management.
create table public.role_grants (
  email text primary key check (email = lower(trim(email))),
  role public.app_role not null check (role in ('staff','admin')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger role_grants_touch before update on public.role_grants
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.role_grants enable row level security;
revoke all on table public.role_grants from anon, authenticated;
grant select on table public.role_grants to authenticated;
create policy "admins read role grants" on public.role_grants
for select to authenticated using (public.is_admin());

-- Existing member is promoted immediately; otherwise the grant is applied at signup.
insert into public.role_grants (email, role)
values ('alvinhan1707@gmail.com', 'admin')
on conflict (email) do update set role = excluded.role;

update public.profiles
set role = 'admin', updated_at = now()
where lower(email) = 'alvinhan1707@gmail.com';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role public.app_role;
begin
  select rg.role into assigned_role
  from public.role_grants rg
  where rg.email = lower(new.email);

  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name',''),
    coalesce(assigned_role, 'customer'::public.app_role)
  );
  insert into public.point_transactions (user_id, amount, description, expires_at)
  values (new.id, 2000, 'PHILIA 회원 가입 적립금', now() + interval '1 year');
  return new;
end;
$$;

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  new_role public.app_role
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_profile public.profiles%rowtype;
  admin_count integer;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;
  if target_user_id = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own admin role';
  end if;

  select * into target_profile from public.profiles where id = target_user_id;
  if not found then raise exception 'User not found'; end if;

  if target_profile.role = 'admin' and new_role <> 'admin' then
    select count(*) into admin_count from public.profiles where role = 'admin';
    if admin_count <= 1 then raise exception 'The last administrator cannot be demoted'; end if;
  end if;

  update public.profiles set role = new_role, updated_at = now()
  where id = target_user_id returning * into target_profile;

  if new_role in ('staff','admin') then
    insert into public.role_grants (email, role, created_by)
    values (lower(target_profile.email), new_role, auth.uid())
    on conflict (email) do update set role = excluded.role, created_by = excluded.created_by;
  else
    delete from public.role_grants where email = lower(target_profile.email);
  end if;
  return target_profile;
end;
$$;

create or replace function public.admin_grant_role_by_email(
  target_email text,
  new_role public.app_role default 'admin'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_email text := lower(trim(target_email));
  matched_user_id uuid;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;
  if new_role not in ('staff','admin') then raise exception 'Only staff or admin can be granted by email'; end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'A valid email is required';
  end if;

  insert into public.role_grants (email, role, created_by)
  values (normalized_email, new_role, auth.uid())
  on conflict (email) do update set role = excluded.role, created_by = excluded.created_by;

  update public.profiles set role = new_role, updated_at = now()
  where lower(email) = normalized_email returning id into matched_user_id;

  return jsonb_build_object(
    'email', normalized_email,
    'role', new_role,
    'registered', matched_user_id is not null
  );
end;
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.admin_set_user_role(uuid,public.app_role) from public, anon;
grant execute on function public.admin_set_user_role(uuid,public.app_role) to authenticated;
revoke all on function public.admin_grant_role_by_email(text,public.app_role) from public, anon;
grant execute on function public.admin_grant_role_by_email(text,public.app_role) to authenticated;
