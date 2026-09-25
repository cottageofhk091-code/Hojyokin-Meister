-- Pro 無料枠（free_credits）
create table if not exists public.profiles (
  id uuid primary key,
  email text,
  free_credits integer not null default 1,
  has_used_pro_trial boolean not null default false
);

alter table public.profiles
  add column if not exists free_credits integer not null default 1;

alter table public.profiles
  add column if not exists has_used_pro_trial boolean not null default false;

alter table public.profiles
  add column if not exists email text;
