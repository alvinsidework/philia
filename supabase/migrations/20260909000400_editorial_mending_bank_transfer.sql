-- Editorial archive and bank-transfer checkout.
create table public.find_stories (
  id uuid primary key default gen_random_uuid(),
  number_label text not null,
  title_ko text not null,
  title_en text not null,
  body_ko text not null,
  body_en text not null,
  image_url text not null,
  product_label text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payment_settings (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_number text not null,
  account_holder text not null,
  deposit_deadline_hours integer not null default 24 check (deposit_deadline_hours between 1 and 168),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payment_settings_one_active on public.payment_settings (active) where active;

create table public.bank_transfer_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  depositor_name text not null,
  amount integer not null check (amount > 0),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  bank_snapshot jsonb not null,
  payment_deadline timestamptz not null,
  status text not null default 'awaiting_deposit' check (status in ('awaiting_deposit','paid','expired','cancelled')),
  telegram_notified_at timestamptz,
  paid_at timestamptz,
  confirmed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger find_stories_touch before update on public.find_stories for each row execute function public.touch_updated_at();
create trigger payment_settings_touch before update on public.payment_settings for each row execute function public.touch_updated_at();
create trigger bank_transfer_orders_touch before update on public.bank_transfer_orders for each row execute function public.touch_updated_at();

alter table public.find_stories enable row level security;
alter table public.payment_settings enable row level security;
alter table public.bank_transfer_orders enable row level security;

create policy "published find stories read" on public.find_stories for select using (published or public.is_staff());
create policy "staff find stories manage" on public.find_stories for all using (public.is_staff()) with check (public.is_staff());
create policy "active payment setting read" on public.payment_settings for select using (active or public.is_staff());
create policy "staff payment settings manage" on public.payment_settings for all using (public.is_staff()) with check (public.is_staff());
create policy "bank orders own read" on public.bank_transfer_orders for select using (user_id = auth.uid() or public.is_staff());
create policy "staff bank orders manage" on public.bank_transfer_orders for all using (public.is_staff()) with check (public.is_staff());

insert into public.products (sku, slug, piece_no, name_en, name_ko, category, layer_label, price, description_ko, short_description_en, material, status, featured, sort_order)
values
  ('PH26FW-OT01','work-jacket',1,'Work Jacket','워크자켓','OUTER','LAYER 3',420000,'10온스 데님을 두 번 워싱한 포켓 재킷.','Four-pocket chore jacket in twice-washed denim.','10 OZ DENIM, TWICE WASHED','active',true,1),
  ('PH26FW-OT02','field-jacket',2,'Field Jacket','필드자켓','OUTER','LAYER 3',480000,'마른 촉감의 코튼 캔버스로 만든 필드 재킷.','Dry cotton field jacket with a straight placket.','DRY COTTON CANVAS, 8 OZ','active',false,2),
  ('PH26FW-OT03','leather-jacket',3,'Leather Jacket','레더자켓','OUTER','LAYER 3',1180000,'매트한 몰스킨 소재의 짧은 블루종.','Short blouson in matte cotton moleskin.','COTTON MOLESKIN, UNLINED BODY','active',false,3),
  ('PH26FW-KN01','fleece',4,'Fleece','후리스','KNIT','LAYER 2',290000,'깊은 파일감의 쿼터 집 플리스.','Quarter-zip in deep pile fleece.','DEEP PILE FLEECE, COTTON-BACKED','active',false,4),
  ('PH26FW-BT01','trousers',5,'Trousers','바지','BOTTOM','LAYER 1',240000,'원 워시 데님으로 만든 와이드 트라우저.','Wide flat-front trousers in one-wash denim.','ONE-WASH DENIM, 12 OZ','active',false,5),
  ('PH26FW-BG01','bag',6,'Bag','가방','BAG','ONE SIZE',760000,'베지터블 태닝 가죽의 숄더백.','Soft shoulder bag in vegetable-tanned leather.','VEG-TAN LEATHER, UNLINED','active',false,6)
on conflict (sku) do update set
  name_en = excluded.name_en, name_ko = excluded.name_ko, price = excluded.price,
  status = excluded.status, updated_at = now();

insert into public.payment_settings (bank_name, account_number, account_holder, deposit_deadline_hours)
select '은행 설정 필요', 'ADMIN에서 계좌번호를 입력하세요', 'PHILIA', 24
where not exists (select 1 from public.payment_settings where active);

insert into public.find_stories (number_label,title_ko,title_en,body_ko,body_en,image_url,product_label,sort_order,published)
select * from (values
  ('01','러브 스티치','THE LOVE STITCH','뒷목 안쪽, 입는 사람에게 가장 가까운 곳에 놓인 한 땀입니다. 사랑은 보이는 곳보다 닿는 곳에 남는다고 믿습니다.','A single stitch at the inside back neck, closest to the wearer. Love remains where it touches, not where it shows.','/images/detail-stitch.jpg','ALL PIECES',1,true),
  ('02','선명한 한 땀','ONE LOUD THREAD','차분한 옷 안에서 단 하나의 색이 목소리를 냅니다. 포켓이나 플래킷 끝에서 우연히 발견됩니다.','One colour speaks inside a quiet garment, discovered by chance at a pocket or the end of a placket.','/images/detail-placket.jpg','JACKETS · TROUSERS',2,true),
  ('03','시간을 먹는 황동','UNLACQUERED BRASS','코팅하지 않은 황동은 손과 날씨를 기억하며 어두워집니다. 낡는 대신 함께 변합니다.','Unlacquered brass remembers hands and weather. It changes with you rather than simply wearing out.','/images/detail-buckle.jpg','BAG · OUTER',3,true),
  ('04','안쪽의 테이프','THE INSIDE TAPE','겉에서는 보이지 않는 솔기와 포켓 안쪽까지 마감합니다. 오래 버티는 옷은 안쪽부터 다릅니다.','Seams and pocket bags are finished beyond view. A garment made to last begins on the inside.','/images/detail-chevron.jpg','ALL PIECES',4,true)
) as seed(number_label,title_ko,title_en,body_ko,body_en,image_url,product_label,sort_order,published)
where not exists (select 1 from public.find_stories);

create or replace function public.create_bank_transfer_order(payer_name text, order_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  source_item jsonb;
  catalogue_item record;
  sanitized_items jsonb := '[]'::jsonb;
  total_amount integer := 0;
  quantity_value integer;
  setting public.payment_settings%rowtype;
  created_order public.bank_transfer_orders%rowtype;
  generated_order_no text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(payer_name, ''))) < 2 then raise exception 'Depositor name is required'; end if;
  if jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then raise exception 'Cart is empty'; end if;

  select * into setting from public.payment_settings where active limit 1;
  if not found then raise exception 'Bank transfer is unavailable'; end if;

  for source_item in select value from jsonb_array_elements(order_items)
  loop
    quantity_value := greatest(1, least(20, coalesce((source_item->>'quantity')::integer, 1)));
    select sku, name_en, name_ko, price into catalogue_item
      from public.products where sku = source_item->>'sku' and status = 'active';
    if not found then raise exception 'Unavailable product: %', source_item->>'sku'; end if;
    total_amount := total_amount + catalogue_item.price * quantity_value;
    sanitized_items := sanitized_items || jsonb_build_array(jsonb_build_object(
      'sku', catalogue_item.sku, 'name', catalogue_item.name_en, 'name_ko', catalogue_item.name_ko,
      'option', left(coalesce(source_item->>'option',''), 120), 'quantity', quantity_value,
      'unit_price', catalogue_item.price, 'line_total', catalogue_item.price * quantity_value
    ));
  end loop;

  generated_order_no := 'PH-' || to_char(clock_timestamp() at time zone 'Asia/Seoul', 'YYMMDD-HH24MISS-') || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into public.bank_transfer_orders (order_no,user_id,depositor_name,amount,items,bank_snapshot,payment_deadline)
  values (generated_order_no,current_user_id,trim(payer_name),total_amount,sanitized_items,
    jsonb_build_object('bank_name',setting.bank_name,'account_number',setting.account_number,'account_holder',setting.account_holder,'deposit_deadline_hours',setting.deposit_deadline_hours),
    now() + make_interval(hours => setting.deposit_deadline_hours))
  returning * into created_order;

  return to_jsonb(created_order);
end;
$$;

revoke all on function public.create_bank_transfer_order(text,jsonb) from public;
grant execute on function public.create_bank_transfer_order(text,jsonb) to authenticated;
