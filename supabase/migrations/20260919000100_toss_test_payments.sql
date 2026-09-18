alter table public.orders
  add column if not exists payment_provider text,
  add column if not exists payment_method text,
  add column if not exists payment_receipt_url text;

create unique index if not exists orders_payment_reference_key
  on public.orders(payment_reference)
  where payment_reference is not null;

create or replace function public.create_toss_payment_order(order_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  member public.profiles%rowtype;
  source_item jsonb;
  catalogue_item record;
  clean_items jsonb := '[]'::jsonb;
  quantity_value integer;
  total_amount integer := 0;
  item_count integer := 0;
  first_name text := '';
  generated_order_no text;
  created_order public.orders%rowtype;
  clean_item jsonb;
  order_name text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then raise exception 'Cart is empty'; end if;

  select * into member from public.profiles where id = current_user_id;
  if not found or coalesce(member.email, '') = '' then raise exception 'Member profile is incomplete'; end if;

  for source_item in select value from jsonb_array_elements(order_items)
  loop
    quantity_value := greatest(1, least(20, coalesce((source_item->>'quantity')::integer, 1)));
    select p.name_en, p.name_ko, p.price, v.id as variant_id, v.stock, c.name as color_name, v.size
      into catalogue_item
      from public.product_variants v
      join public.products p on p.id = v.product_id
      join public.product_colors c on c.id = v.color_id
      where v.id = (source_item->>'variant_id')::uuid and v.active and p.status = 'active';
    if not found then raise exception 'An item is no longer available'; end if;
    if catalogue_item.stock < quantity_value then raise exception 'Not enough stock for %', catalogue_item.name_en; end if;

    item_count := item_count + 1;
    if item_count = 1 then first_name := catalogue_item.name_en; end if;
    total_amount := total_amount + catalogue_item.price * quantity_value;
    clean_items := clean_items || jsonb_build_array(jsonb_build_object(
      'variant_id', catalogue_item.variant_id,
      'product_name', catalogue_item.name_en,
      'option_label', catalogue_item.color_name || ' · ' || catalogue_item.size,
      'unit_price', catalogue_item.price,
      'quantity', quantity_value
    ));
  end loop;

  generated_order_no := 'PH-TOSS-' || to_char(clock_timestamp() at time zone 'Asia/Seoul', 'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  order_name := left(first_name || case when item_count > 1 then ' 외 ' || (item_count - 1)::text || '건' else '' end, 100);

  insert into public.orders (order_no, user_id, email, customer_name, status, subtotal, shipping_fee, payment_provider)
  values (generated_order_no, current_user_id, member.email, coalesce(nullif(trim(member.display_name), ''), split_part(member.email, '@', 1)), 'pending', total_amount, 0, 'toss')
  returning * into created_order;

  for clean_item in select value from jsonb_array_elements(clean_items)
  loop
    insert into public.order_items (order_id, variant_id, product_name, option_label, unit_price, quantity)
    values (
      created_order.id,
      (clean_item->>'variant_id')::uuid,
      clean_item->>'product_name',
      clean_item->>'option_label',
      (clean_item->>'unit_price')::integer,
      (clean_item->>'quantity')::integer
    );
  end loop;

  return jsonb_build_object(
    'id', created_order.id,
    'orderId', created_order.order_no,
    'orderName', order_name,
    'amount', created_order.total,
    'customerName', created_order.customer_name,
    'customerEmail', created_order.email
  );
end;
$$;

revoke all on function public.create_toss_payment_order(jsonb) from public;
grant execute on function public.create_toss_payment_order(jsonb) to authenticated;

create or replace function public.complete_toss_payment(
  target_order_no text,
  target_payment_key text,
  target_payment_method text,
  target_receipt_url text,
  target_approved_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.orders%rowtype;
  item public.order_items%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required'; end if;

  select * into target_order from public.orders where order_no = target_order_no for update;
  if not found then raise exception 'Order not found'; end if;
  if target_order.status = 'paid' and target_order.payment_reference = target_payment_key then
    return to_jsonb(target_order);
  end if;
  if target_order.status <> 'pending' then raise exception 'Order is not payable'; end if;

  for item in select * from public.order_items where order_id = target_order.id
  loop
    update public.product_variants
      set stock = stock - item.quantity, sold = sold + item.quantity, updated_at = now()
      where id = item.variant_id and stock >= item.quantity;
    if not found then raise exception 'Insufficient stock during payment completion'; end if;
    insert into public.inventory_movements (variant_id, movement_type, quantity, note, order_id)
    values (item.variant_id, 'sale', -item.quantity, 'Toss Payments approval', target_order.id);
  end loop;

  update public.orders
    set status = 'paid', payment_provider = 'toss', payment_reference = target_payment_key,
        payment_method = target_payment_method, payment_receipt_url = nullif(target_receipt_url, ''),
        paid_at = coalesce(target_approved_at, now()), updated_at = now()
    where id = target_order.id
    returning * into target_order;

  return to_jsonb(target_order);
end;
$$;

revoke all on function public.complete_toss_payment(text,text,text,text,timestamptz) from public;
grant execute on function public.complete_toss_payment(text,text,text,text,timestamptz) to service_role;
