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

alter publication supabase_realtime add table public.gatherkit_event_rsvps;
