-- Avatar dress-up support for AR Vision Link.
-- Run this in Supabase SQL Editor before deploying the avatar feature.

alter table public.users
  add column if not exists avatar_config jsonb;

create table if not exists public.avatar_item_settings (
  id bigserial primary key,
  category text not null check (category in ('hair', 'face', 'top', 'bottoms')),
  item_id text not null,
  layer text not null check (layer in ('front', 'back')),
  scale double precision not null default 1,
  x integer not null default 0,
  y integer not null default 0,
  thumb_scale double precision not null default 1,
  thumb_x integer not null default 0,
  thumb_y integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (item_id, layer)
);

create index if not exists avatar_item_settings_category_idx
  on public.avatar_item_settings (category);

-- Optional one-time backfill in SQL. The backend also provides
-- POST /api/avatar/backfill-users for the same idea with random assignment.
update public.users
set avatar_config = jsonb_build_object(
  'hair', 'hair-' || (floor(random() * 8)::int + 1)::text,
  'face', 'face-' || (floor(random() * 5)::int + 1)::text,
  'top', 'top-' || (floor(random() * 8)::int + 1)::text,
  'bottoms', 'bottoms-' || (floor(random() * 8)::int + 1)::text
),
updated_at = now()
where avatar_config is null;
