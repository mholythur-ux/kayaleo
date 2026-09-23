-- ============================================================
-- KAYA LEO — 001_init.sql
-- Core schema: profiles, properties, images, amenities,
-- favorites, conversations, messages, reviews, inquiries, reports.
-- Run in Supabase SQL Editor (or psql) in order 001 → 004.
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type user_role as enum ('USER', 'HOST', 'ADMIN');
create type host_status as enum ('none', 'pending', 'approved', 'rejected');
create type property_type as enum ('APARTMENT', 'HOUSE', 'ROOM');
create type property_status as enum ('draft', 'pending', 'approved', 'rejected', 'suspended');
create type inquiry_status as enum ('new', 'contacted', 'closed');
create type report_reason as enum (
  'FAKE_PROPERTY', 'WRONG_INFORMATION', 'SCAM_SUSPICIOUS',
  'INCORRECT_PRICE', 'ALREADY_UNAVAILABLE', 'INAPPROPRIATE_CONTENT', 'OTHER'
);
create type report_status as enum ('open', 'resolved', 'dismissed');
create type image_category as enum ('EXTERIOR', 'LIVING_ROOM', 'BEDROOM', 'BATHROOM', 'KITCHEN', 'OTHER');

-- ---------- Profiles ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  avatar_url text,
  bio text,
  role user_role not null default 'USER',
  is_host boolean not null default false,
  host_status host_status not null default 'none',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Properties ----------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  property_type property_type not null,
  status property_status not null default 'pending',
  price_monthly numeric(12,2) not null check (price_monthly >= 0),
  price_weekly numeric(12,2),
  price_daily numeric(12,2),
  bedrooms int not null default 1 check (bedrooms >= 0),
  bathrooms int not null default 1 check (bathrooms >= 0),
  size_m2 numeric(8,1),
  floor_number int,
  furnished boolean not null default false,
  max_occupants int,
  house_rules text,
  latitude double precision,
  longitude double precision,
  country text not null default 'Tanzania',
  region text,
  city text,
  district text,
  neighborhood text,
  street text,
  landmark text,
  availability_date date,
  is_featured boolean not null default false,
  views_count int not null default 0,
  favorites_count int not null default 0,
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_status on public.properties (status);
create index idx_properties_type on public.properties (property_type);
create index idx_properties_city on public.properties (city);
create index idx_properties_region on public.properties (region);
create index idx_properties_price on public.properties (price_monthly);
create index idx_properties_host on public.properties (host_id);
create index idx_properties_created on public.properties (created_at desc);

-- ---------- Property images ----------
create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  image_url text not null,
  storage_path text,
  category image_category not null default 'OTHER',
  sort_order int not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_property_images_property on public.property_images (property_id, sort_order);

-- ---------- Amenities ----------
create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.property_amenities (
  property_id uuid not null references public.properties(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete cascade,
  primary key (property_id, amenity_id)
);

-- ---------- Favorites ----------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);
create index idx_favorites_user on public.favorites (user_id);

-- ---------- Conversations / messages ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (conversation_id, user_id)
);
create index idx_participants_user on public.conversation_participants (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_messages_conversation on public.messages (conversation_id, created_at);

-- ---------- Reviews ----------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (property_id, reviewer_id)
);

-- ---------- Inquiries (booking requests) ----------
create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  status inquiry_status not null default 'new',
  created_at timestamptz not null default now()
);
create index idx_inquiries_property on public.inquiries (property_id);
create index idx_inquiries_user on public.inquiries (user_id);

-- ---------- Reports ----------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason report_reason not null,
  details text not null default '',
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

-- ---------- Triggers ----------
-- Auto-create a profile whenever an auth user is created
-- (full_name / phone come from signUp metadata).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.phone,
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_properties_updated before update on public.properties
  for each row execute function public.set_updated_at();

-- favorites_count maintenance
create or replace function public.sync_favorites_count()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') then
    update public.properties set favorites_count = favorites_count + 1 where id = new.property_id;
  elsif (tg_op = 'DELETE') then
    update public.properties set favorites_count = greatest(favorites_count - 1, 0) where id = old.property_id;
  end if;
  return null;
end;
$$;

create trigger trg_favorites_count after insert or delete on public.favorites
  for each row execute function public.sync_favorites_count();

-- bump conversation.updated_at on new message
create or replace function public.touch_conversation()
returns trigger language plpgsql as $$
begin
  update public.conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();
