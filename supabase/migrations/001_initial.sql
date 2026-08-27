-- WhenFree MVP database
-- Run this entire file in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  invite_code text not null unique,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.recurring_busy_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (start_time < end_time)
);

create table if not exists public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  kind text not null check (kind in ('busy','free')),
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  check (
    (all_day = true and start_time is null and end_time is null)
    or
    (all_day = false and start_time is not null and end_time is not null and start_time < end_time)
  )
);

-- Copy basic Google profile details into public.profiles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update on auth.users
for each row execute procedure public.handle_new_user();

-- Helper functions run as the database owner so RLS policies do not recurse.
create or replace function public.is_group_member(gid uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = gid and gm.user_id = uid
  );
$$;

create or replace function public.shares_group_with(other_user uuid, uid uuid default auth.uid())
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = uid and theirs.user_id = other_user
  );
$$;

create or replace function public.new_invite_code()
returns text
language plpgsql
volatile
security definer set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.groups where invite_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.create_group(group_name text)
returns table (id uuid, invite_code text)
language plpgsql
security definer set search_path = ''
as $$
declare
  new_id uuid;
  new_code text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if nullif(trim(group_name), '') is null then raise exception 'Group name is required'; end if;
  new_code := public.new_invite_code();
  insert into public.groups as g(name, invite_code, created_by)
  values (trim(group_name), new_code, auth.uid())
  returning g.id into new_id;
  insert into public.group_members(group_id, user_id) values (new_id, auth.uid());
  return query select new_id, new_code;
end;
$$;

create or replace function public.join_group_by_code(code text)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  gid uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select g.id into gid from public.groups g where upper(g.invite_code) = upper(trim(code));
  if gid is null then raise exception 'Invite code not found'; end if;
  insert into public.group_members(group_id, user_id) values (gid, auth.uid()) on conflict do nothing;
  return gid;
end;
$$;

grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;

-- RLS
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.recurring_busy_blocks enable row level security;
alter table public.schedule_exceptions enable row level security;

create policy "profiles visible to shared group members"
on public.profiles for select to authenticated
using (id = auth.uid() or public.shares_group_with(id));

create policy "groups visible to members"
on public.groups for select to authenticated
using (public.is_group_member(id));

create policy "group members visible to members"
on public.group_members for select to authenticated
using (public.is_group_member(group_id));

create policy "users read own or shared recurring availability"
on public.recurring_busy_blocks for select to authenticated
using (user_id = auth.uid() or public.shares_group_with(user_id));

create policy "users manage own recurring availability"
on public.recurring_busy_blocks for insert to authenticated
with check (user_id = auth.uid());
create policy "users update own recurring availability"
on public.recurring_busy_blocks for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own recurring availability"
on public.recurring_busy_blocks for delete to authenticated
using (user_id = auth.uid());

create policy "users read own or shared exceptions"
on public.schedule_exceptions for select to authenticated
using (user_id = auth.uid() or public.shares_group_with(user_id));

create policy "users manage own exceptions"
on public.schedule_exceptions for insert to authenticated
with check (user_id = auth.uid());
create policy "users update own exceptions"
on public.schedule_exceptions for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users delete own exceptions"
on public.schedule_exceptions for delete to authenticated
using (user_id = auth.uid());

