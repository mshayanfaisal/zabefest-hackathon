-- KarachiPulse — initial schema
-- EFEST/ZABEFEST Hackathon 2026 · "Fix Karachi"
-- Postgres + PostGIS. Run in Supabase SQL editor or via `supabase db push`.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists postgis;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Citizen-reported issues. Anonymous auth gives every device a real auth.uid().
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete set null default auth.uid(),
  category text not null check (category in ('infrastructure', 'safety', 'utility')),
  sub_type text not null,
  -- infrastructure: pothole | garbage | streetlight | sewerage
  -- safety:         unsafe_zone | harassment | sos | disaster
  -- utility:        water | load_shedding
  description text,
  area text,
  address text,
  user_name text,
  user_phone text,
  user_nic text,
  photo_url text,
  lat double precision not null,
  lng double precision not null,
  severity_score int check (severity_score between 1 and 10),
  severity_reason text,
  department text,
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected', 'duplicate')),
  is_fire boolean not null default false,
  verification_count int not null default 0,
  is_sos boolean not null default false,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reports_status_idx   on reports (status);
create index if not exists reports_category_idx on reports (category);
create index if not exists reports_created_idx  on reports (created_at desc);

-- One verification per user per report (crowdsourced confirmation).
create table if not exists verifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports on delete cascade,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  unique (report_id, user_id)
);

-- Admin assignment (authority workflow).
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports on delete cascade,
  admin_id uuid not null references auth.users on delete cascade,
  department text,
  note text,
  assigned_at timestamptz not null default now()
);

-- Status change audit trail.
create table if not exists status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references auth.users,
  note text,
  changed_at timestamptz not null default now()
);

-- Admin role management.
create table if not exists admin_profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  department text,
  role text default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Functions & triggers
-- ---------------------------------------------------------------------------

-- Touch updated_at on every update.
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reports_updated_at on reports;
create trigger reports_updated_at
  before update on reports
  for each row execute function update_updated_at();

-- Log status transitions to the audit table.
create or replace function log_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into status_history (report_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists reports_status_history on reports;
create trigger reports_status_history
  after update on reports
  for each row execute function log_status_change();

-- Rule-based severity default + per-device rate limit + geo dedup.
-- Runs BEFORE INSERT. Gemini may overwrite severity_score asynchronously later.
create or replace function prepare_report()
returns trigger as $$
declare
  recent_count int;
  dup_count int;
begin
  -- Rate limit: max 25 reports per user per rolling hour (anti-spam, increased for testing).
  if new.user_id is not null then
    select count(*) into recent_count
    from reports
    where user_id = new.user_id
      and created_at > now() - interval '1 hour';
    if recent_count >= 25 then
      raise exception 'rate_limit_exceeded: max 25 reports per hour';
    end if;
  end if;

  -- Rule-based severity fallback so the queue is never blank pre-AI.
  if new.severity_score is null then
    new.severity_score := case
      when new.is_sos then 10
      when new.sub_type in ('sewerage', 'water', 'harassment', 'disaster') then 7
      when new.sub_type in ('pothole', 'streetlight', 'unsafe_zone') then 5
      when new.sub_type in ('garbage', 'load_shedding') then 4
      else 5
    end;
  end if;

  -- Geo dedup: same sub_type within 100 m in the last hour → flag as duplicate.
  select count(*) into dup_count
  from reports
  where sub_type = new.sub_type
    and created_at > now() - interval '1 hour'
    and ST_DWithin(
      geography(ST_MakePoint(lng, lat)),
      geography(ST_MakePoint(new.lng, new.lat)),
      100
    );
  if dup_count > 0 and not new.is_sos then
    new.status := 'duplicate';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists reports_prepare on reports;
create trigger reports_prepare
  before insert on reports
  for each row execute function prepare_report();

-- Single source of truth for verification counts: bump on insert,
-- auto-promote pending → verified at the community threshold (3).
create or replace function bump_verification()
returns trigger as $$
begin
  update reports
  set verification_count = verification_count + 1,
      status = case
        when status = 'pending' and verification_count + 1 >= 3 then 'verified'
        else status
      end
  where id = new.report_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists verifications_bump on verifications;
create trigger verifications_bump
  after insert on verifications
  for each row execute function bump_verification();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table reports        enable row level security;
alter table verifications  enable row level security;
alter table assignments    enable row level security;
alter table status_history enable row level security;
alter table admin_profiles enable row level security;

-- Reports: public transparency read; authenticated (incl. anonymous) insert;
-- owner update; admins update anything.
drop policy if exists reports_public_read   on reports;
drop policy if exists reports_auth_insert    on reports;
drop policy if exists reports_owner_update    on reports;
drop policy if exists reports_admin_update    on reports;
create policy reports_public_read on reports for select using (true);
create policy reports_auth_insert on reports for insert with check (auth.uid() is not null);
create policy reports_owner_update on reports for update using (auth.uid() = user_id);
create policy reports_admin_update on reports for update
  using (exists (select 1 from admin_profiles where id = auth.uid()));

-- Verifications: authenticated read/insert as self.
drop policy if exists verifications_auth_read   on verifications;
drop policy if exists verifications_auth_insert on verifications;
create policy verifications_auth_read on verifications for select using (auth.uid() is not null);
create policy verifications_auth_insert on verifications for insert with check (auth.uid() = user_id);

-- Assignments: admins only.
drop policy if exists assignments_admin_all on assignments;
create policy assignments_admin_all on assignments for all
  using (exists (select 1 from admin_profiles where id = auth.uid()));

-- Status history: public read (transparency).
drop policy if exists status_history_public_read on status_history;
create policy status_history_public_read on status_history for select using (true);

-- Admin profiles: readable by authenticated users (to check role client-side).
drop policy if exists admin_profiles_read on admin_profiles;
create policy admin_profiles_read on admin_profiles for select using (auth.uid() is not null);

-- ---------------------------------------------------------------------------
-- Realtime: the admin queue + SOS panel + mobile feed subscribe to `reports`.
-- Realtime only streams tables in the supabase_realtime publication.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reports'
  ) then
    execute 'alter publication supabase_realtime add table reports';
  end if;
end $$;
