-- Live catalogue editing, inventory adjustments, and editable brand pages.
alter table public.product_variants
  add column if not exists opening_stock integer not null default 0 check (opening_stock >= 0),
  add column if not exists received integer not null default 0 check (received >= 0),
  add column if not exists sold integer not null default 0 check (sold >= 0);

-- Sold-out pieces remain visible in the catalogue while draft/archived pieces stay private.
drop policy if exists "catalogue public read" on public.products;
create policy "catalogue public read" on public.products
for select using (status in ('active', 'sold_out') or public.is_staff());
drop policy if exists "images public read" on public.product_images;
create policy "images public read" on public.product_images
for select using (exists(
  select 1 from public.products p
  where p.id = product_id and (p.status in ('active', 'sold_out') or public.is_staff())
));
drop policy if exists "colors public read" on public.product_colors;
create policy "colors public read" on public.product_colors
for select using (exists(
  select 1 from public.products p
  where p.id = product_id and (p.status in ('active', 'sold_out') or public.is_staff())
));

create unique index if not exists product_images_product_path_key
  on public.product_images(product_id, storage_path);

create table if not exists public.site_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  eyebrow_ko text not null default '',
  eyebrow_en text not null default '',
  title_ko text not null default '',
  title_en text not null default '',
  body_ko text not null default '',
  body_en text not null default '',
  secondary_ko text not null default '',
  secondary_en text not null default '',
  image_url text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_pages_touch on public.site_pages;
create trigger site_pages_touch before update on public.site_pages
for each row execute function public.touch_updated_at();

alter table public.site_pages enable row level security;
create policy "published site pages read" on public.site_pages
for select using (published or public.is_staff());
create policy "staff site pages manage" on public.site_pages
for all using (public.is_staff()) with check (public.is_staff());

insert into public.site_pages
  (slug, eyebrow_ko, eyebrow_en, title_ko, title_en, body_ko, body_en, secondary_ko, secondary_en, image_url, published)
values
  ('home', '필리아 · 오래 머무르는 옷', 'PHILIA · FOR WHAT STAYS.',
   '따뜻한 사랑처럼, 오래 머무르는 옷.', 'Clothes that stay, the way love stays.',
   '자주 입고, 오래 간직하며, 시간이 지날수록 더 가까워지는 옷을 만듭니다.',
   'Quiet pieces designed to be worn often, kept longer, and made more personal with time.',
   'COLLECTION 01', 'COLLECTION 01', '/images/hero.jpg', true),
  ('about', 'ABOUT PHILIA', 'ABOUT PHILIA',
   '시간이 쌓일수록 가까워지는 것들.', 'For what stays.',
   'PHILIA는 사람과 물건, 그리고 매일의 작은 의식 속에서 시간이 지날수록 자라나는 애착을 이야기합니다. 유행보다 오래 남는 균형과 촉감, 반복해서 손이 가는 편안함을 옷에 담습니다.',
   'PHILIA is the attachment that grows over time through the people, pieces, and rituals we keep close. Refined clothing with warmth, permanence, and quiet everyday ease.',
   '애착 · 지속성 · 일상의 의식 · 따뜻한 절제', 'ATTACHMENT · LONGEVITY · EVERYDAY RITUAL · WARM RESTRAINT',
   '/images/field-jacket.jpg', true)
on conflict (slug) do nothing;

-- Complete the existing seeded catalogue with real images, options, and calculator inputs.
insert into public.product_images (product_id, storage_path, alt_ko, sort_order)
select p.id, seed.image_url, p.name_ko, 0
from public.products p
join (values
  ('work-jacket','/images/work-jacket.jpg'),
  ('field-jacket','/images/field-jacket.jpg'),
  ('leather-jacket','/images/leather-jacket.jpg'),
  ('fleece','/images/fleece.jpg'),
  ('trousers','/images/trousers.jpg'),
  ('bag','/images/bag.jpg')
) as seed(slug,image_url) on seed.slug = p.slug
on conflict (product_id, storage_path) do nothing;

insert into public.product_colors (product_id, name, hex, sort_order)
select p.id, seed.color_name, seed.hex, seed.sort_order
from public.products p
join (values
  ('work-jacket','FADED','#9BB1BD',1), ('work-jacket','RAW','#283C51',2), ('work-jacket','ECRU','#D8D0BF',3),
  ('field-jacket','NAVY','#273746',1), ('field-jacket','OLIVE','#63634D',2), ('field-jacket','KHAKI','#A69470',3),
  ('leather-jacket','STONE','#D5D0C4',1), ('leather-jacket','COCOA','#6C5142',2), ('leather-jacket','INK','#1C2024',3),
  ('fleece','ASH','#777875',1), ('fleece','INK','#1B1D1E',2), ('fleece','TOBACCO','#8B5E3C',3),
  ('trousers','MID INDIGO','#536B7E',1), ('trousers','INK','#202429',2), ('trousers','OLIVE','#696B54',3),
  ('bag','BLACK','#161616',1), ('bag','COCOA','#65483B',2)
) as seed(slug,color_name,hex,sort_order) on seed.slug = p.slug
on conflict (product_id, name) do update set hex = excluded.hex, sort_order = excluded.sort_order;

insert into public.product_variants
  (product_id, color_id, size, variant_sku, stock, opening_stock, received, sold, active)
select p.id, c.id, seed.size_label,
  p.sku || '-' || seed.color_code || '-' || seed.size_code,
  seed.stock, seed.opening_stock, seed.received, seed.sold, true
from public.products p
join (values
  ('work-jacket','FADED','1 · S—M','FAD','1',10,8,4,2), ('work-jacket','FADED','2 · L—XL','FAD','2',11,10,4,3),
  ('work-jacket','RAW','1 · S—M','RAW','1',13,11,4,2), ('work-jacket','RAW','2 · L—XL','RAW','2',14,13,4,3),
  ('work-jacket','ECRU','1 · S—M','ECR','1',13,14,1,2), ('work-jacket','ECRU','2 · L—XL','ECR','2',14,16,1,3),
  ('field-jacket','NAVY','1 · S—M','NVY','1',10,8,4,2), ('field-jacket','NAVY','2 · L—XL','NVY','2',11,10,4,3),
  ('field-jacket','OLIVE','1 · S—M','OL','1',13,14,1,2), ('field-jacket','OLIVE','2 · L—XL','OL','2',14,16,1,3),
  ('field-jacket','KHAKI','1 · S—M','KHK','1',13,14,1,2), ('field-jacket','KHAKI','2 · L—XL','KHK','2',14,16,1,3),
  ('leather-jacket','STONE','1 · S—M','STN','1',6,6,2,2), ('leather-jacket','STONE','2 · L—XL','STN','2',5,6,2,3),
  ('leather-jacket','COCOA','1 · S—M','COC','1',8,9,1,2), ('leather-jacket','COCOA','2 · L—XL','COC','2',7,9,1,3),
  ('leather-jacket','INK','1 · S—M','INK','1',8,9,1,2), ('leather-jacket','INK','2 · L—XL','INK','2',7,9,1,3),
  ('fleece','ASH','1 · S—M','ASH','1',10,8,4,2), ('fleece','ASH','2 · L—XL','ASH','2',11,10,4,3),
  ('fleece','INK','1 · S—M','INK','1',13,14,1,2), ('fleece','INK','2 · L—XL','INK','2',14,16,1,3),
  ('fleece','TOBACCO','1 · S—M','TOB','1',13,14,1,2), ('fleece','TOBACCO','2 · L—XL','TOB','2',14,16,1,3),
  ('trousers','MID INDIGO','1 · S—M','MID','1',10,8,4,2), ('trousers','MID INDIGO','2 · L—XL','MID','2',11,10,4,3),
  ('trousers','INK','1 · S—M','INK','1',13,14,1,2), ('trousers','INK','2 · L—XL','INK','2',14,16,1,3),
  ('trousers','OLIVE','1 · S—M','OL','1',13,14,1,2), ('trousers','OLIVE','2 · L—XL','OL','2',14,16,1,3),
  ('bag','BLACK','ONE','BLK','ONE',9,8,3,2), ('bag','COCOA','ONE','COC','ONE',8,8,2,2)
) as seed(slug,color_name,size_label,color_code,size_code,stock,opening_stock,received,sold) on seed.slug = p.slug
join public.product_colors c on c.product_id = p.id and c.name = seed.color_name
on conflict (product_id, color_id, size) do update set
  stock = excluded.stock, opening_stock = excluded.opening_stock,
  received = excluded.received, sold = excluded.sold, active = true;

insert into public.product_costs
  (product_id,purchase_cost,inbound_shipping,supplies,outbound_shipping,payment_fee_rate,advertising,overhead,vat_rate,income_tax_rate)
select p.id, seed.purchase_cost, 3000, 2500, 3500, .038, seed.advertising, 2000, .1, .15
from public.products p
join (values
  ('work-jacket',178000,22000), ('field-jacket',210000,26000),
  ('leather-jacket',560000,42000), ('fleece',112000,18000),
  ('trousers',92000,14000), ('bag',350000,32000)
) as seed(slug,purchase_cost,advertising) on seed.slug = p.slug
on conflict (product_id) do nothing;

create or replace function public.admin_save_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  product_data jsonb := payload->'product';
  costs_data jsonb := payload->'costs';
  image_data jsonb;
  variant_data jsonb;
  saved_id uuid := coalesce(nullif(product_data->>'id','')::uuid, gen_random_uuid());
  saved_color_id uuid;
begin
  if not public.is_staff() then raise exception 'Staff permission required'; end if;

  insert into public.products
    (id,sku,slug,piece_no,name_en,name_ko,category,layer_label,price,description_ko,short_description_en,material,status,featured,sort_order,signatures)
  values
    (saved_id,trim(product_data->>'sku'),trim(product_data->>'slug'),(product_data->>'piece_no')::integer,
     trim(product_data->>'name_en'),trim(product_data->>'name_ko'),product_data->>'category',product_data->>'layer_label',
     (product_data->>'price')::integer,product_data->>'description_ko',product_data->>'short_description_en',
     product_data->>'material',(product_data->>'status')::public.product_status,
     coalesce((product_data->>'featured')::boolean,false),coalesce((product_data->>'sort_order')::integer,0),
     coalesce(array(select jsonb_array_elements_text(product_data->'signatures')),'{}'))
  on conflict (id) do update set
    sku=excluded.sku,slug=excluded.slug,piece_no=excluded.piece_no,name_en=excluded.name_en,name_ko=excluded.name_ko,
    category=excluded.category,layer_label=excluded.layer_label,price=excluded.price,description_ko=excluded.description_ko,
    short_description_en=excluded.short_description_en,material=excluded.material,status=excluded.status,
    featured=excluded.featured,sort_order=excluded.sort_order,signatures=excluded.signatures,updated_at=now();

  delete from public.product_images where product_id = saved_id;
  for image_data in select value from jsonb_array_elements(coalesce(payload->'images','[]'::jsonb)) loop
    insert into public.product_images(product_id,storage_path,alt_ko,sort_order)
    values(saved_id,image_data->>'storage_path',product_data->>'name_ko',coalesce((image_data->>'sort_order')::integer,0));
  end loop;

  update public.product_variants set active = false where product_id = saved_id;
  for variant_data in select value from jsonb_array_elements(coalesce(payload->'variants','[]'::jsonb)) loop
    insert into public.product_colors(product_id,name,hex,sort_order)
    values(saved_id,trim(variant_data->>'color'),upper(variant_data->>'color_hex'),coalesce((variant_data->>'color_order')::integer,0))
    on conflict (product_id,name) do update set hex=excluded.hex,sort_order=excluded.sort_order
    returning id into saved_color_id;

    insert into public.product_variants
      (product_id,color_id,size,variant_sku,stock,opening_stock,received,sold,active)
    values
      (saved_id,saved_color_id,trim(variant_data->>'size'),trim(variant_data->>'variant_sku'),
       greatest(0,(variant_data->>'stock')::integer),greatest(0,coalesce((variant_data->>'opening_stock')::integer,0)),
       greatest(0,coalesce((variant_data->>'received')::integer,0)),greatest(0,coalesce((variant_data->>'sold')::integer,0)),true)
    on conflict (product_id,color_id,size) do update set
      variant_sku=excluded.variant_sku,stock=excluded.stock,opening_stock=excluded.opening_stock,
      received=excluded.received,sold=excluded.sold,active=true,updated_at=now();
  end loop;

  insert into public.product_costs
    (product_id,purchase_cost,inbound_shipping,supplies,outbound_shipping,payment_fee_rate,advertising,overhead,vat_rate,income_tax_rate)
  values
    (saved_id,coalesce((costs_data->>'purchase_cost')::integer,0),coalesce((costs_data->>'inbound_shipping')::integer,0),
     coalesce((costs_data->>'supplies')::integer,0),coalesce((costs_data->>'outbound_shipping')::integer,0),
     coalesce((costs_data->>'payment_fee_rate')::numeric,.038),coalesce((costs_data->>'advertising')::integer,0),
     coalesce((costs_data->>'overhead')::integer,0),coalesce((costs_data->>'vat_rate')::numeric,.1),
     coalesce((costs_data->>'income_tax_rate')::numeric,.15))
  on conflict (product_id) do update set
    purchase_cost=excluded.purchase_cost,inbound_shipping=excluded.inbound_shipping,supplies=excluded.supplies,
    outbound_shipping=excluded.outbound_shipping,payment_fee_rate=excluded.payment_fee_rate,
    advertising=excluded.advertising,overhead=excluded.overhead,vat_rate=excluded.vat_rate,
    income_tax_rate=excluded.income_tax_rate,updated_at=now();

  return saved_id;
end;
$$;

create or replace function public.admin_adjust_inventory(target_variant_id uuid, delta integer, movement_note text default 'Admin adjustment')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare next_stock integer;
begin
  if not public.is_staff() then raise exception 'Staff permission required'; end if;
  if delta = 0 then raise exception 'Adjustment cannot be zero'; end if;

  update public.product_variants
  set stock = stock + delta,
      received = received + case when delta > 0 then delta else 0 end,
      updated_at = now()
  where id = target_variant_id and stock + delta >= 0
  returning stock into next_stock;
  if not found then raise exception 'Variant not found or stock cannot become negative'; end if;

  insert into public.inventory_movements(variant_id,movement_type,quantity,note,created_by)
  values(target_variant_id,'adjustment',delta,movement_note,auth.uid());
  return next_stock;
end;
$$;

revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;
revoke all on function public.admin_adjust_inventory(uuid,integer,text) from public, anon;
grant execute on function public.admin_adjust_inventory(uuid,integer,text) to authenticated;
