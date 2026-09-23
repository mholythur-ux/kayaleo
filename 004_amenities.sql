-- ============================================================
-- KAYA LEO — 004_amenities.sql
-- Seed the standard amenity catalogue (onboarding step 5).
-- ============================================================

insert into public.amenities (name) values
  ('Wi-Fi'),
  ('Parking'),
  ('Maji (Water)'),
  ('Umeme (Electricity)'),
  ('Usalama (Security)'),
  ('Air conditioning'),
  ('Kitchen'),
  ('TV'),
  ('Washing machine'),
  ('Balcony'),
  ('Garden'),
  ('Swimming pool'),
  ('Generator'),
  ('Solar power')
on conflict (name) do nothing;

-- Atomic view counter used by the API (POST /properties/:id/view)
create or replace function public.increment_property_views(p_id uuid)
returns void language sql as $$
  update public.properties set views_count = views_count + 1 where id = p_id;
$$;

-- ============================================================
-- Promote an admin (run AFTER the admin user has signed up):
--   update public.profiles set role='ADMIN', is_verified=true
--   where email='admin@kayaleo.app';
-- ============================================================
