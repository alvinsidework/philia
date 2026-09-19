-- Authoritative checkout shipping details and PHILIA's domestic delivery policy.
alter table public.bank_transfer_orders
  add column if not exists subtotal integer not null default 0 check (subtotal >= 0),
  add column if not exists shipping_fee integer not null default 0 check (shipping_fee >= 0),
  add column if not exists shipping_address jsonb;

update public.bank_transfer_orders set subtotal = amount where subtotal = 0;

drop function if exists public.create_toss_payment_order(jsonb);

create or replace function public.create_toss_payment_order(order_items jsonb, shipping_info jsonb)
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
  clean_shipping jsonb;
  quantity_value integer;
  subtotal_amount integer := 0;
  shipping_fee_amount integer;
  item_count integer := 0;
  first_name text := '';
  recipient_name text := trim(coalesce(shipping_info->>'recipient_name', ''));
  phone_value text := regexp_replace(coalesce(shipping_info->>'phone', ''), '[^0-9]', '', 'g');
  postal_value text := trim(coalesce(shipping_info->>'postal_code', ''));
  address1_value text := trim(coalesce(shipping_info->>'address_line1', ''));
  address2_value text := trim(coalesce(shipping_info->>'address_line2', ''));
  message_value text := trim(coalesce(shipping_info->>'delivery_message', ''));
  generated_order_no text;
  created_order public.orders%rowtype;
  clean_item jsonb;
  order_name text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then raise exception 'Cart is empty'; end if;
  if jsonb_typeof(shipping_info) <> 'object' then raise exception 'Shipping information is required'; end if;
  if length(recipient_name) < 2 or length(recipient_name) > 80 then raise exception 'Recipient name is required'; end if;
  if phone_value !~ '^[0-9]{9,12}$' then raise exception 'A valid phone number is required'; end if;
  if length(postal_value) < 3 or length(postal_value) > 12 then raise exception 'Postal code is required'; end if;
  if length(address1_value) < 3 or length(address1_value) > 300 then raise exception 'Address is required'; end if;
  if length(address2_value) > 200 or length(message_value) > 200 then raise exception 'Shipping information is too long'; end if;

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
    subtotal_amount := subtotal_amount + catalogue_item.price * quantity_value;
    clean_items := clean_items || jsonb_build_array(jsonb_build_object(
      'variant_id', catalogue_item.variant_id,
      'product_name', catalogue_item.name_en,
      'option_label', catalogue_item.color_name || ' · ' || catalogue_item.size,
      'unit_price', catalogue_item.price,
      'quantity', quantity_value
    ));
  end loop;

  shipping_fee_amount := case when subtotal_amount >= 100000 then 0 else 3000 end;
  clean_shipping := jsonb_build_object(
    'recipient_name', recipient_name,
    'phone', phone_value,
    'postal_code', postal_value,
    'address_line1', address1_value,
    'address_line2', address2_value,
    'delivery_message', message_value
  );
  generated_order_no := 'PH-TOSS-' || to_char(clock_timestamp() at time zone 'Asia/Seoul', 'YYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  order_name := left(first_name || case when item_count > 1 then ' 외 ' || (item_count - 1)::text || '건' else '' end, 100);

  insert into public.orders (order_no, user_id, email, customer_name, status, subtotal, shipping_fee, shipping_address, payment_provider)
  values (generated_order_no, current_user_id, member.email, recipient_name, 'pending', subtotal_amount, shipping_fee_amount, clean_shipping, 'toss')
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
    'subtotal', created_order.subtotal,
    'shippingFee', created_order.shipping_fee,
    'amount', created_order.total,
    'customerName', created_order.customer_name,
    'customerEmail', created_order.email
  );
end;
$$;

revoke all on function public.create_toss_payment_order(jsonb,jsonb) from public;
grant execute on function public.create_toss_payment_order(jsonb,jsonb) to authenticated;

drop function if exists public.create_bank_transfer_order(text,jsonb);

create or replace function public.create_bank_transfer_order(payer_name text, order_items jsonb, shipping_info jsonb)
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
  clean_shipping jsonb;
  subtotal_amount integer := 0;
  shipping_fee_amount integer;
  quantity_value integer;
  recipient_name text := trim(coalesce(shipping_info->>'recipient_name', ''));
  phone_value text := regexp_replace(coalesce(shipping_info->>'phone', ''), '[^0-9]', '', 'g');
  postal_value text := trim(coalesce(shipping_info->>'postal_code', ''));
  address1_value text := trim(coalesce(shipping_info->>'address_line1', ''));
  address2_value text := trim(coalesce(shipping_info->>'address_line2', ''));
  message_value text := trim(coalesce(shipping_info->>'delivery_message', ''));
  setting public.payment_settings%rowtype;
  created_order public.bank_transfer_orders%rowtype;
  generated_order_no text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(payer_name, ''))) < 2 then raise exception 'Depositor name is required'; end if;
  if jsonb_typeof(order_items) <> 'array' or jsonb_array_length(order_items) = 0 then raise exception 'Cart is empty'; end if;
  if jsonb_typeof(shipping_info) <> 'object' then raise exception 'Shipping information is required'; end if;
  if length(recipient_name) < 2 or length(recipient_name) > 80 then raise exception 'Recipient name is required'; end if;
  if phone_value !~ '^[0-9]{9,12}$' then raise exception 'A valid phone number is required'; end if;
  if length(postal_value) < 3 or length(postal_value) > 12 then raise exception 'Postal code is required'; end if;
  if length(address1_value) < 3 or length(address1_value) > 300 then raise exception 'Address is required'; end if;
  if length(address2_value) > 200 or length(message_value) > 200 then raise exception 'Shipping information is too long'; end if;

  select * into setting from public.payment_settings where active limit 1;
  if not found then raise exception 'Bank transfer is unavailable'; end if;

  for source_item in select value from jsonb_array_elements(order_items)
  loop
    quantity_value := greatest(1, least(20, coalesce((source_item->>'quantity')::integer, 1)));
    select sku, name_en, name_ko, price into catalogue_item
      from public.products where sku = source_item->>'sku' and status = 'active';
    if not found then raise exception 'Unavailable product: %', source_item->>'sku'; end if;
    subtotal_amount := subtotal_amount + catalogue_item.price * quantity_value;
    sanitized_items := sanitized_items || jsonb_build_array(jsonb_build_object(
      'sku', catalogue_item.sku, 'name', catalogue_item.name_en, 'name_ko', catalogue_item.name_ko,
      'option', left(coalesce(source_item->>'option',''), 120), 'quantity', quantity_value,
      'unit_price', catalogue_item.price, 'line_total', catalogue_item.price * quantity_value
    ));
  end loop;

  shipping_fee_amount := case when subtotal_amount >= 100000 then 0 else 3000 end;
  clean_shipping := jsonb_build_object(
    'recipient_name', recipient_name,
    'phone', phone_value,
    'postal_code', postal_value,
    'address_line1', address1_value,
    'address_line2', address2_value,
    'delivery_message', message_value
  );
  generated_order_no := 'PH-' || to_char(clock_timestamp() at time zone 'Asia/Seoul', 'YYMMDD-HH24MISS-') || upper(substr(replace(gen_random_uuid()::text,'-',''),1,4));
  insert into public.bank_transfer_orders (order_no,user_id,depositor_name,subtotal,shipping_fee,amount,items,shipping_address,bank_snapshot,payment_deadline)
  values (generated_order_no,current_user_id,trim(payer_name),subtotal_amount,shipping_fee_amount,subtotal_amount + shipping_fee_amount,sanitized_items,clean_shipping,
    jsonb_build_object('bank_name',setting.bank_name,'account_number',setting.account_number,'account_holder',setting.account_holder,'deposit_deadline_hours',setting.deposit_deadline_hours),
    now() + make_interval(hours => setting.deposit_deadline_hours))
  returning * into created_order;

  return to_jsonb(created_order);
end;
$$;

revoke all on function public.create_bank_transfer_order(text,jsonb,jsonb) from public;
grant execute on function public.create_bank_transfer_order(text,jsonb,jsonb) to authenticated;
