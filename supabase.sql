-- Maa Ambe Jewellers - Supabase schema
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  permanent_id text unique not null,
  full_name text not null,
  pincode text,
  contact text,
  role text not null default 'customer' check (role in ('customer','vendor','admin','super_admin')),
  shop_name text,
  thana_kshetra text,
  password_hash text,
  approved boolean default false,
  auto_approve boolean default false,
  festive_theme text default 'maroon',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.catalogue (
  id uuid primary key default gen_random_uuid(),
  vendor_id text,
  name text not null,
  category text not null,
  gender text default 'Women',
  price numeric(12,2) not null default 0,
  image_url text,
  premium boolean default false,
  approved boolean default false,
  festive_tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  customer_id text not null,
  vendor_id text,
  jewellery jsonb default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  five_percent numeric(12,2) not null default 0,
  commission_1_percent numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled_by_customer','shipped')),
  phonepe_txn_id text,
  phonepe_response jsonb,
  refund_status text default 'none',
  auto_approved boolean default false,
  cancelled_by_customer boolean default false,
  finance_opted boolean default false,
  finance_months integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  customer_id text not null,
  amount numeric(12,2) not null default 0,
  method text default 'phonepe',
  phonepe_response jsonb,
  status text default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.tokens (
  id uuid primary key default gen_random_uuid(),
  token_code text unique not null,
  order_id uuid references public.orders(id) on delete cascade,
  customer_id text not null,
  customer_phone text,
  vendor_id text,
  verified_in_store boolean default false,
  full_payment_done boolean default false,
  created_at timestamptz default now(),
  verified_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.super_admins (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  recovery_code text not null,
  email text,
  full_name text not null,
  is_active boolean default true,
  festive_permissions jsonb default '{}',
  created_at timestamptz default now()
);

create table if not exists public.festive_ui (
  id uuid primary key default gen_random_uuid(),
  theme_name text not null,
  permanent boolean default false,
  maroon boolean default false,
  emerald boolean default false,
  saffron boolean default false,
  cream boolean default false,
  white boolean default false,
  ekadashi boolean default false,
  dhanteras boolean default false,
  diwali boolean default false,
  dipawali boolean default false,
  bluestone boolean default false,
  current_look boolean default false,
  display_name text,
  header_text text,
  primary_color text,
  secondary_color text,
  background_gradient text,
  is_active boolean default false,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null,
  catalogue_id uuid references public.catalogue(id) on delete cascade,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_permanent_id on public.profiles(permanent_id);
create index if not exists idx_profiles_contact on public.profiles(contact);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_catalogue_category on public.catalogue(category);
create index if not exists idx_catalogue_premium on public.catalogue(premium);
create index if not exists idx_catalogue_approved on public.catalogue(approved);
create index if not exists idx_catalogue_gender on public.catalogue(gender);
create index if not exists idx_orders_token on public.orders(token);
create index if not exists idx_orders_customer on public.orders(customer_id);
create index if not exists idx_orders_vendor on public.orders(vendor_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_tokens_code on public.tokens(token_code);
create index if not exists idx_tokens_customer on public.tokens(customer_id);
create index if not exists idx_tokens_vendor on public.tokens(vendor_id);
create index if not exists idx_super_admins_phone on public.super_admins(phone);

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute procedure public.update_updated_at_column();

create trigger update_catalogue_updated_at
before update on public.catalogue
for each row execute procedure public.update_updated_at_column();

create trigger update_orders_updated_at
before update on public.orders
for each row execute procedure public.update_updated_at_column();

create trigger update_festive_ui_updated_at
before update on public.festive_ui
for each row execute procedure public.update_updated_at_column();

create trigger update_tokens_updated_at
before update on public.tokens
for each row execute procedure public.update_updated_at_column();

alter table public.profiles enable row level security;
alter table public.catalogue enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.tokens enable row level security;
alter table public.super_admins enable row level security;
alter table public.festive_ui enable row level security;
alter table public.wishlists enable row level security;

-- Public read for approved catalogue and festive UI
create policy "Public can read approved catalogue"
on public.catalogue
for select
using (approved = true);

create policy "Public can read festive ui"
on public.festive_ui
for select
using (true);

create policy "Public can read profiles"
on public.profiles
for select
using (true);

create policy "Anyone can insert profile"
on public.profiles
for insert
with check (true);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() is not null)
with check (true);

create policy "Anyone can insert wishlist"
on public.wishlists
for insert
with check (true);

create policy "Anyone can manage own wishlist"
on public.wishlists
for delete
using (true);

create policy "Customers can read own orders"
on public.orders
for select
using (true);

create policy "Customers can cancel own pending orders"
on public.orders
for update
using (true)
with check (true);

create policy "Vendors can manage their approved orders"
on public.orders
for update
using (true)
with check (true);

create policy "Admins can read all orders"
on public.orders
for select
using (true);

create policy "Anyone can create payment"
on public.payments
for insert
with check (true);

create policy "Anyone can read payments"
on public.payments
for select
using (true);

create policy "Anyone can create token"
on public.tokens
for insert
with check (true);

create policy "Anyone can read tokens"
on public.tokens
for select
using (true);

create policy "Anyone can update token verification"
on public.tokens
for update
using (true)
with check (true);

create policy "Anyone can insert catalogue"
on public.catalogue
for insert
with check (true);

create policy "Vendors can update their own catalogue"
on public.catalogue
for update
using (true)
with check (true);

create policy "Super admins can manage all"
on public.super_admins
for all
using (true)
with check (true);

create policy "Admins can manage festive ui"
on public.festive_ui
for all
using (true)
with check (true);

-- Storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('jewellery', 'jewellery', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/jpg','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/jpg'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('banners', 'banners', true, 5242880, ARRAY['image/png','image/jpeg','image/webp','image/jpg'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

-- Realtime publication
alter publication supabase_realtime add table if not exists public.profiles;
alter publication supabase_realtime add table if not exists public.catalogue;
alter publication supabase_realtime add table if not exists public.orders;
alter publication supabase_realtime add table if not exists public.payments;
alter publication supabase_realtime add table if not exists public.tokens;
alter publication supabase_realtime add table if not exists public.festive_ui;
alter publication supabase_realtime add table if not exists public.wishlists;

-- Seed super admin
insert into public.super_admins (phone, recovery_code, email, full_name, is_active, festive_permissions)
values (
  '+919752286492',
  'MAA-AMBE-2025-SUPER',
  'admin@maaambe.com',
  'Super Admin',
  true,
  '{"portal_access": true, "festive_ui": true, "catalogue_approve": true, "orders_view": true}'
)
on conflict (phone) do update set
  recovery_code = excluded.recovery_code,
  email = excluded.email,
  full_name = excluded.full_name,
  is_active = true;

-- Seed festive theme rows
insert into public.festive_ui (theme_name, permanent, maroon, emerald, saffron, cream, white, ekadashi, dhanteras, diwali, dipawali, bluestone, current_look, display_name, header_text, primary_color, secondary_color, background_gradient, is_active, created_by)
values
  ('permanent', true, false, false, false, false, false, false, false, false, false, false, false, 'Timeless Jewellery', 'Trust Purity Forever', '#5c0a14', '#0a5c36', 'linear-gradient(90deg, #5c0a14 0%, #0a5c36 25%, #ff9933 50%, #fdf6ec 75%, #ffffff 100%)', true, 'system'),
  ('maroon', false, true, false, false, false, false, false, false, false, false, false, false, 'Maroon Festive', 'Maa Ambe Heritage', '#5c0a14', '#0a5c36', 'linear-gradient(90deg, #5c0a14 0%, #0a5c36 25%, #ff9933 50%, #fdf6ec 75%, #ffffff 100%)', true, 'system'),
  ('emerald', false, false, true, false, false, false, true, false, false, false, false, false, 'Ekadashi Emerald', 'Ekadashi Special', '#0a5c36', '#3d7d5d', 'linear-gradient(90deg, #0a5c36 0%, #3d7d5d 25%, #c4b16d 50%, #fdf6ec 75%, #ffffff 100%)', false, 'system'),
  ('saffron', false, false, false, true, false, false, false, true, false, false, false, false, 'Dhanteras Saffron', 'Dhanteras Special', '#b35c00', '#7b2f00', 'linear-gradient(90deg, #7b2f00 0%, #d97a00 30%, #ff9933 52%, #fff4e6 75%, #fff 100%)', false, 'system'),
  ('cream', false, false, false, false, true, false, false, false, true, false, false, false, 'Diwali Cream', 'Diwali Celebration', '#7a4d2a', '#765a3a', 'linear-gradient(90deg, #fdf6ec 0%, #f7e5d1 30%, #d6b070 50%, #7a4d2a 75%, #fff 100%)', false, 'system'),
  ('white', false, false, false, false, false, true, false, false, false, false, false, false, 'White Elegance', 'Timeless Jewellery', '#232526', '#505b5d', 'linear-gradient(90deg, #f9fafb 0%, #e5e7eb 30%, #d6d3d1 50%, #c7b89d 75%, #ffffff 100%)', false, 'system'),
  ('bluestone', false, false, false, false, false, false, false, false, false, false, true, true, 'Bluestone Current', 'Current Look', '#2b5f8a', '#0f2d4d', 'linear-gradient(90deg, #e8f2f8 0%, #bfe0f5 30%, #6aa4c8 60%, #2b5f8a 100%)', false, 'system')
on conflict do nothing;

-- Sample catalogue entries
insert into public.catalogue (vendor_id, name, category, gender, price, image_url, premium, approved, festive_tags)
values
  ('MAA-SWARN-1001', 'Royal Pearl Necklace', 'necklace', 'Women', 52500, 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80', true, true, ARRAY['pearl','premium']),
  ('MAA-SWARN-1001', 'Emerald Bridal Ring', 'ring', 'Women', 18000, 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=900&q=80', false, true, ARRAY['bridal']),
  ('MAA-SWARN-1001', 'Golden Temple Nospin', 'nospin', 'Women', 7000, 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80', false, true, ARRAY['festive']),
  ('MAA-SWARN-1001', 'Lotus Earrings', 'earrings', 'Women', 14600, 'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?auto=format&fit=crop&w=900&q=80', false, true, ARRAY['diamond']),
  ('MAA-SWARN-1001', 'Temple Gold Belt', 'belt', 'Women', 12500, 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=900&q=80', false, true, ARRAY['bridal']),
  ('MAA-SWARN-1001', 'Diwali Wedding Set', 'wedding', 'Women', 86000, 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80', true, true, ARRAY['bridal','wedding']),
  ('MAA-SWARN-1001', 'Saffron Chain', 'chain', 'Women', 25000, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80', true, true, ARRAY['gold']),
  ('MAA-SWARN-1001', 'Kangan Heritage', 'bangle', 'Women', 19500, 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80', false, true, ARRAY['festival'])
on conflict do nothing;

-- Example secure default storage policies
create policy "Public read jewellery storage" on storage.objects
for select
using (bucket_id = 'jewellery');

create policy "Authenticated upload jewellery" on storage.objects
for insert
with check (bucket_id = 'jewellery' and auth.role() = 'authenticated');

create policy "Authenticated update jewellery" on storage.objects
for update
using (bucket_id = 'jewellery' and auth.role() = 'authenticated');

create policy "Authenticated delete jewellery" on storage.objects
for delete
using (bucket_id = 'jewellery' and auth.role() = 'authenticated');

create policy "Public read avatars storage" on storage.objects
for select
using (bucket_id = 'avatars');

create policy "Public read banners storage" on storage.objects
for select
using (bucket_id = 'banners');

-- Optional helper view for easier frontend access
create or replace view public.v_public_catalogue as
select id, vendor_id, name, category, gender, price, image_url, premium, approved, festive_tags, created_at
from public.catalogue
where approved = true;

-- End of schema
