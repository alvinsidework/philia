-- Product-specific bilingual detail, size, shipping, and care content.
alter table public.products
  add column if not exists details_ko text not null default E'- 자연 소재의 질감과 시간이 흐르며 생기는 변화를 존중합니다.\n- 편안한 움직임과 오래 입을 수 있는 균형을 기준으로 제작합니다.\n- 제품별 소재와 색상은 상품 정보를 확인해 주세요.',
  add column if not exists details_en text not null default E'- Made to honour the texture of natural materials and the changes brought by time.\n- Cut for ease of movement and considered for years of wear.\n- See the product information above for material and colour details.',
  add column if not exists size_guide_ko text not null default E'사이즈\t어깨\t가슴\t밑단\t소매\t총장\n1\t-\t-\t-\t-\t-\n2\t-\t-\t-\t-\t-\n\n측정 방법에 따라 1–2cm의 오차가 있을 수 있습니다.',
  add column if not exists size_guide_en text not null default E'SIZE\tSHOULDER\tCHEST\tHEM\tSLEEVE\tLENGTH\n1\t-\t-\t-\t-\t-\n2\t-\t-\t-\t-\t-\n\nMeasurements may vary by 1–2cm depending on the measuring method.',
  add column if not exists shipping_ko text not null default E'결제 완료 후 영업일 기준 2일 이내 출고됩니다.\n기본 배송비는 3,000원이며, 상품 금액 100,000원 이상 구매 시 무료배송입니다.\n예약 상품과 함께 주문한 경우 예약 상품 출고일에 맞춰 함께 배송됩니다.',
  add column if not exists shipping_en text not null default E'Orders ship within 2 business days after payment confirmation.\nStandard delivery is KRW 3,000 and complimentary for merchandise totals of KRW 100,000 or more.\nOrders containing a pre-order item ship together on the pre-order release date.',
  add column if not exists care_ko text not null default E'찬물 단독 세탁 또는 소재에 맞는 전문 클리닝을 권장합니다.\n세탁 전 케어라벨을 반드시 확인해 주세요.\n장시간 물에 담가두거나 고온 건조기 사용을 피하고, 형태를 정돈해 자연 건조해 주세요.',
  add column if not exists care_en text not null default E'Wash separately in cold water or use a specialist cleaner appropriate for the material.\nAlways check the care label before cleaning.\nAvoid prolonged soaking and high-heat tumble drying; reshape and dry naturally.';

create or replace function public.admin_save_product_v2(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  product_data jsonb := payload->'product';
begin
  if not public.is_staff() then raise exception 'Staff permission required'; end if;

  saved_id := public.admin_save_product(payload);
  update public.products set
    details_ko = coalesce(product_data->>'details_ko', details_ko),
    details_en = coalesce(product_data->>'details_en', details_en),
    size_guide_ko = coalesce(product_data->>'size_guide_ko', size_guide_ko),
    size_guide_en = coalesce(product_data->>'size_guide_en', size_guide_en),
    shipping_ko = coalesce(product_data->>'shipping_ko', shipping_ko),
    shipping_en = coalesce(product_data->>'shipping_en', shipping_en),
    care_ko = coalesce(product_data->>'care_ko', care_ko),
    care_en = coalesce(product_data->>'care_en', care_en),
    updated_at = now()
  where id = saved_id;

  return saved_id;
end;
$$;

revoke all on function public.admin_save_product_v2(jsonb) from public, anon;
grant execute on function public.admin_save_product_v2(jsonb) to authenticated;
