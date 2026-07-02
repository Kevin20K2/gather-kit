create table if not exists public.gatherkit_hosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  email text not null unique,
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gatherkit_hosts
add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.gatherkit_event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  name text not null,
  status text not null check (status in ('Yes', 'Maybe', 'No')),
  note text not null default '',
  supply text not null default '',
  role text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_slug, name)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gatherkit_event_rsvps_set_updated_at on public.gatherkit_event_rsvps;

create trigger gatherkit_event_rsvps_set_updated_at
before update on public.gatherkit_event_rsvps
for each row
execute function public.set_updated_at();

drop trigger if exists gatherkit_hosts_set_updated_at on public.gatherkit_hosts;

create trigger gatherkit_hosts_set_updated_at
before update on public.gatherkit_hosts
for each row
execute function public.set_updated_at();

alter table public.gatherkit_hosts enable row level security;

drop policy if exists "gatherkit_hosts_public_read" on public.gatherkit_hosts;
drop policy if exists "gatherkit_hosts_public_insert" on public.gatherkit_hosts;
drop policy if exists "gatherkit_hosts_public_update" on public.gatherkit_hosts;

create policy "gatherkit_hosts_public_read"
on public.gatherkit_hosts
for select
using (true);

create policy "gatherkit_hosts_public_insert"
on public.gatherkit_hosts
for insert
with check (true);

create policy "gatherkit_hosts_public_update"
on public.gatherkit_hosts
for update
using (true)
with check (true);

create table if not exists public.gatherkit_events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.gatherkit_hosts(id) on delete set null,
  slug text not null unique,
  event_type text not null,
  name text not null,
  date_label text not null,
  time_label text not null,
  location text not null,
  rsvp_deadline text not null,
  bring_note text not null,
  host_name text not null,
  host_phone text not null default '',
  host_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists gatherkit_events_set_updated_at on public.gatherkit_events;

create trigger gatherkit_events_set_updated_at
before update on public.gatherkit_events
for each row
execute function public.set_updated_at();

alter table public.gatherkit_events enable row level security;

drop policy if exists "gatherkit_events_public_read" on public.gatherkit_events;
drop policy if exists "gatherkit_events_public_insert" on public.gatherkit_events;
drop policy if exists "gatherkit_events_public_update" on public.gatherkit_events;

create policy "gatherkit_events_public_read"
on public.gatherkit_events
for select
using (true);

create policy "gatherkit_events_public_insert"
on public.gatherkit_events
for insert
with check (true);

create policy "gatherkit_events_public_update"
on public.gatherkit_events
for update
using (true)
with check (true);

alter table public.gatherkit_event_rsvps enable row level security;

drop policy if exists "gatherkit_event_rsvps_public_read" on public.gatherkit_event_rsvps;
drop policy if exists "gatherkit_event_rsvps_public_insert" on public.gatherkit_event_rsvps;
drop policy if exists "gatherkit_event_rsvps_public_update" on public.gatherkit_event_rsvps;

create policy "gatherkit_event_rsvps_public_read"
on public.gatherkit_event_rsvps
for select
using (true);

create policy "gatherkit_event_rsvps_public_insert"
on public.gatherkit_event_rsvps
for insert
with check (true);

create policy "gatherkit_event_rsvps_public_update"
on public.gatherkit_event_rsvps
for update
using (true)
with check (true);

create table if not exists public.gatherkit_event_tasks (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  task_id text not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_slug, task_id)
);

drop trigger if exists gatherkit_event_tasks_set_updated_at on public.gatherkit_event_tasks;

create trigger gatherkit_event_tasks_set_updated_at
before update on public.gatherkit_event_tasks
for each row
execute function public.set_updated_at();

alter table public.gatherkit_event_tasks enable row level security;

drop policy if exists "gatherkit_event_tasks_public_read" on public.gatherkit_event_tasks;
drop policy if exists "gatherkit_event_tasks_public_insert" on public.gatherkit_event_tasks;
drop policy if exists "gatherkit_event_tasks_public_update" on public.gatherkit_event_tasks;

create policy "gatherkit_event_tasks_public_read"
on public.gatherkit_event_tasks
for select
using (true);

create policy "gatherkit_event_tasks_public_insert"
on public.gatherkit_event_tasks
for insert
with check (true);

create policy "gatherkit_event_tasks_public_update"
on public.gatherkit_event_tasks
for update
using (true)
with check (true);

create table if not exists public.gatherkit_event_messages (
  id uuid primary key default gen_random_uuid(),
  event_slug text not null,
  audience text not null,
  body text not null,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.gatherkit_event_messages enable row level security;

drop policy if exists "gatherkit_event_messages_public_read" on public.gatherkit_event_messages;
drop policy if exists "gatherkit_event_messages_public_insert" on public.gatherkit_event_messages;

create policy "gatherkit_event_messages_public_read"
on public.gatherkit_event_messages
for select
using (true);

create policy "gatherkit_event_messages_public_insert"
on public.gatherkit_event_messages
for insert
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatherkit_hosts'
  ) then
    alter publication supabase_realtime add table public.gatherkit_hosts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatherkit_events'
  ) then
    alter publication supabase_realtime add table public.gatherkit_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatherkit_event_rsvps'
  ) then
    alter publication supabase_realtime add table public.gatherkit_event_rsvps;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatherkit_event_tasks'
  ) then
    alter publication supabase_realtime add table public.gatherkit_event_tasks;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gatherkit_event_messages'
  ) then
    alter publication supabase_realtime add table public.gatherkit_event_messages;
  end if;
end $$;
