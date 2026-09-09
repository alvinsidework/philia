-- PHILIA commerce core: catalogue, option inventory, editorial content,
-- orders, and the profit / inventory / tax calculator from the source workbook.
create extension if not exists pgcrypto;

create type public.app_role as enum ('customer', 'staff', 'admin');
create type public.product_status as enum ('draft', 'active', 'sold_out', 'archived');
create type public.order_status as enum ('pending', 'paid', 'preparing', 'shipped', 'completed', 'cancelled', 'refunded');
create type public.inventory_movement_type as enum ('opening', 'receiving', 'sale', 'return', 'adjustment');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  phone text,
  role public.app_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  slug text not null unique,
  piece_no integer not null check (piece_no > 0),
  name_en text not null,
  name_ko text not null,
  category text not null check (category in ('OUTER','KNIT','BOTTOM','BAG')),
  layer_label text,
  price integer not null check (price >= 0),
  description_ko text,
  short_description_en text,
  material text,
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  sort_order integer not null default 0,
  signatures text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  alt_ko text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.product_colors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  hex text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  unique(product_id, name)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  color_id uuid not null references public.product_colors(id) on delete cascade,
  size text not null,
  variant_sku text not null unique,
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 4 check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, color_id, size)
);

create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  purchase_cost integer not null default 0,
  inbound_shipping integer not null default 0,
  supplies integer not null default 0,
  outbound_shipping integer not null default 0,
  payment_fee_rate numeric(7,6) not null default .038,
  advertising integer not null default 0,
  overhead integer not null default 0,
  vat_rate numeric(7,6) not null default .1,
  income_tax_rate numeric(7,6) not null default .15,
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity integer not null check (quantity <> 0),
  note text,
  order_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid references public.profiles(id),
  email text not null,
  customer_name text not null,
  status public.order_status not null default 'pending',
  subtotal integer not null default 0,
  shipping_fee integer not null default 0,
  total integer generated always as (subtotal + shipping_fee) stored,
  shipping_address jsonb,
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_movements add constraint inventory_order_fk foreign key (order_id) references public.orders(id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  product_name text not null,
  option_label text not null,
  unit_price integer not null,
  quantity integer not null check (quantity > 0),
  line_total integer generated always as (unit_price * quantity) stored
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('발견','수선','컬렉션')),
  excerpt text,
  body text,
  cover_path text,
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end; $$;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger variants_touch before update on public.product_variants for each row execute function public.touch_updated_at();
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles (id, email, display_name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name','')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('staff','admin'));
$$;

-- Workbook-equivalent computed result, always derived from the latest product and cost inputs.
create view public.product_finance with (security_invoker = true) as
select p.id as product_id, p.sku, p.name_en, p.price,
  (c.purchase_cost + c.inbound_shipping + c.supplies) as unit_cost,
  round(p.price * c.payment_fee_rate) as payment_fee,
  (p.price - (c.purchase_cost + c.inbound_shipping + c.supplies) - c.outbound_shipping - round(p.price * c.payment_fee_rate) - c.advertising - c.overhead) as operating_profit,
  case when p.price = 0 then 0 else (p.price - (c.purchase_cost + c.inbound_shipping + c.supplies) - c.outbound_shipping - round(p.price * c.payment_fee_rate) - c.advertising - c.overhead)::numeric / p.price end as operating_margin,
  p.price * c.vat_rate / (1 + c.vat_rate) as vat,
  greatest(0, (p.price - (c.purchase_cost + c.inbound_shipping + c.supplies) - c.outbound_shipping - round(p.price * c.payment_fee_rate) - c.advertising - c.overhead - p.price * c.vat_rate / (1 + c.vat_rate)) * c.income_tax_rate) as income_tax
from public.products p join public.product_costs c on c.product_id = p.id;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_colors enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_costs enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.posts enable row level security;

create policy "profiles own read" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "profiles own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "catalogue public read" on public.products for select using (status = 'active' or public.is_staff());
create policy "images public read" on public.product_images for select using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_staff())));
create policy "colors public read" on public.product_colors for select using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'active' or public.is_staff())));
create policy "variants public read" on public.product_variants for select using (active or public.is_staff());
create policy "posts public read" on public.posts for select using (published or public.is_staff());
create policy "orders own read" on public.orders for select using (user_id = auth.uid() or public.is_staff());
create policy "orders own create" on public.orders for insert with check (user_id = auth.uid());
create policy "order items own read" on public.order_items for select using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));

create policy "staff products" on public.products for all using (public.is_staff()) with check (public.is_staff());
create policy "staff images" on public.product_images for all using (public.is_staff()) with check (public.is_staff());
create policy "staff colors" on public.product_colors for all using (public.is_staff()) with check (public.is_staff());
create policy "staff variants" on public.product_variants for all using (public.is_staff()) with check (public.is_staff());
create policy "staff costs" on public.product_costs for all using (public.is_staff()) with check (public.is_staff());
create policy "staff inventory" on public.inventory_movements for all using (public.is_staff()) with check (public.is_staff());
create policy "staff orders" on public.orders for all using (public.is_staff()) with check (public.is_staff());
create policy "staff order items" on public.order_items for all using (public.is_staff()) with check (public.is_staff());
create policy "staff posts" on public.posts for all using (public.is_staff()) with check (public.is_staff());

-- Customers can edit profile fields, but cannot promote their own role.
revoke update on public.profiles from authenticated;
grant update (display_name, phone, updated_at) on public.profiles to authenticated;

insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true), ('post-images', 'post-images', true) on conflict (id) do nothing;
create policy "public product image read" on storage.objects for select using (bucket_id in ('product-images','post-images'));
create policy "staff image manage" on storage.objects for all using (bucket_id in ('product-images','post-images') and public.is_staff()) with check (bucket_id in ('product-images','post-images') and public.is_staff());
