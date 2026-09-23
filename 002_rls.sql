-- ============================================================
-- KAYA LEO — 002_rls.sql
-- Row Level Security. Users can only edit their own profile,
-- hosts only their own listings, favorites are private,
-- conversations only visible to participants, admin-only
-- moderation. The Express API uses the service-role key
-- server-side and re-validates ownership; RLS protects the
-- database even if a client talks to Postgres directly.
-- ============================================================

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.property_images enable row level security;
alter table public.amenities enable row level security;
alter table public.property_amenities enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.inquiries enable row level security;
alter table public.reports enable row level security;

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'ADMIN');
$$;

create or replace function public.owns_property(p_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.properties pr
    where pr.id = p_property_id and pr.host_id = auth.uid()
  );
$$;

create or replace function public.in_conversation(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id and cp.user_id = auth.uid()
  );
$$;

-- ---------- Profiles ----------
create policy "profiles: read any" on public.profiles for select using (true);
create policy "profiles: update own" on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())  -- users cannot promote themselves
    and is_verified = (select p.is_verified from public.profiles p where p.id = auth.uid())
  );

-- ---------- Properties ----------
create policy "properties: public read approved" on public.properties for select
  using (status = 'approved' or host_id = auth.uid() or public.is_admin());
create policy "properties: host insert own" on public.properties for insert
  with check (
    host_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_host)
    and status in ('draft', 'pending')
  );
create policy "properties: host update own" on public.properties for update
  using (host_id = auth.uid())
  with check (
    host_id = auth.uid()
    and status in ('draft', 'pending')          -- hosts cannot self-approve / self-suspend
    and is_featured = (select pr.is_featured from public.properties pr where pr.id = id)
  );
create policy "properties: host delete own" on public.properties for delete
  using (host_id = auth.uid());
create policy "properties: admin all" on public.properties for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- Property images ----------
create policy "images: public read" on public.property_images for select using (true);
create policy "images: host write own" on public.property_images for insert
  with check (public.owns_property(property_id));
create policy "images: host update own" on public.property_images for update
  using (public.owns_property(property_id)) with check (public.owns_property(property_id));
create policy "images: host delete own" on public.property_images for delete
  using (public.owns_property(property_id));

-- ---------- Amenities ----------
create policy "amenities: public read" on public.amenities for select using (true);
create policy "amenities: admin write" on public.amenities for all
  using (public.is_admin()) with check (public.is_admin());
create policy "property_amenities: public read" on public.property_amenities for select using (true);
create policy "property_amenities: host write own" on public.property_amenities for all
  using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- ---------- Favorites ----------
create policy "favorites: own all" on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Conversations ----------
create policy "conversations: participants read" on public.conversations for select
  using (public.in_conversation(id));

create policy "participants: read own" on public.conversation_participants for select
  using (user_id = auth.uid() or public.in_conversation(conversation_id));
create policy "participants: join own" on public.conversation_participants for insert
  with check (user_id = auth.uid());

-- ---------- Messages ----------
create policy "messages: participants read" on public.messages for select
  using (public.in_conversation(conversation_id));
create policy "messages: participants send" on public.messages for insert
  with check (sender_id = auth.uid() and public.in_conversation(conversation_id));
create policy "messages: sender mark read" on public.messages for update
  using (public.in_conversation(conversation_id)) with check (public.in_conversation(conversation_id));

-- ---------- Reviews ----------
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: insert own, not own property" on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and not public.owns_property(property_id)
  );
create policy "reviews: delete own" on public.reviews for delete using (reviewer_id = auth.uid());

-- ---------- Inquiries ----------
create policy "inquiries: own read" on public.inquiries for select
  using (user_id = auth.uid() or public.owns_property(property_id) or public.is_admin());
create policy "inquiries: insert own" on public.inquiries for insert with check (user_id = auth.uid());
create policy "inquiries: host update status" on public.inquiries for update
  using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- ---------- Reports ----------
create policy "reports: admin read" on public.reports for select using (public.is_admin());
create policy "reports: insert own" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reports: admin update" on public.reports for update
  using (public.is_admin()) with check (public.is_admin());
