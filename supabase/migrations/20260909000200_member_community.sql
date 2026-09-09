-- Member account, points, review, Q&A, notice, and mending features.
alter table public.profiles
  add column if not exists birth_date date,
  add column if not exists postal_code text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists newsletter boolean not null default false,
  add column if not exists member_code text generated always as ('PH-' || upper(substr(replace(id::text, '-', ''), 1, 10))) stored;

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  description text not null,
  order_id uuid references public.orders(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  option_label text,
  rating smallint not null check (rating between 1 and 5),
  title text not null,
  body text not null,
  images text[] not null default '{}',
  published boolean not null default true,
  helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  category text not null check (category in ('상품 문의','배송 문의','교환 · 반품','수선 문의','기타 문의')),
  title text not null,
  body text not null,
  is_private boolean not null default true,
  status text not null default 'waiting' check (status in ('waiting','answered','closed')),
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  pinned boolean not null default false,
  published boolean not null default false,
  published_at timestamptz,
  author_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.mending_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  product_name text not null,
  description text not null,
  images text[] not null default '{}',
  status text not null default 'received' check (status in ('received','reviewing','accepted','shipping','completed','declined')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();
create trigger inquiries_touch before update on public.inquiries for each row execute function public.touch_updated_at();
create trigger notices_touch before update on public.notices for each row execute function public.touch_updated_at();
create trigger mending_touch before update on public.mending_requests for each row execute function public.touch_updated_at();

alter table public.point_transactions enable row level security;
alter table public.reviews enable row level security;
alter table public.review_comments enable row level security;
alter table public.inquiries enable row level security;
alter table public.notices enable row level security;
alter table public.mending_requests enable row level security;

create policy "points own read" on public.point_transactions for select using (user_id = auth.uid() or public.is_staff());
create policy "staff points manage" on public.point_transactions for all using (public.is_staff()) with check (public.is_staff());

create policy "published reviews read" on public.reviews for select using (published or user_id = auth.uid() or public.is_staff());
create policy "members create reviews" on public.reviews for insert with check (user_id = auth.uid());
create policy "members update reviews" on public.reviews for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "members delete reviews" on public.reviews for delete using (user_id = auth.uid() or public.is_staff());
create policy "review comments read" on public.review_comments for select using (true);
create policy "members create comments" on public.review_comments for insert with check (user_id = auth.uid());
create policy "comment owner manage" on public.review_comments for delete using (user_id = auth.uid() or public.is_staff());

create policy "inquiries visible" on public.inquiries for select using (not is_private or user_id = auth.uid() or public.is_staff());
create policy "members create inquiries" on public.inquiries for insert with check (user_id = auth.uid());
create policy "inquiry owner update" on public.inquiries for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());
create policy "inquiry owner delete" on public.inquiries for delete using (user_id = auth.uid() or public.is_staff());

create policy "published notices read" on public.notices for select using (published or public.is_staff());
create policy "staff notices manage" on public.notices for all using (public.is_staff()) with check (public.is_staff());
create policy "mending own read" on public.mending_requests for select using (user_id = auth.uid() or public.is_staff());
create policy "members create mending" on public.mending_requests for insert with check (user_id = auth.uid());
create policy "mending own update" on public.mending_requests for update using (user_id = auth.uid() or public.is_staff()) with check (user_id = auth.uid() or public.is_staff());

-- New users receive a small welcome balance. Existing profile creation behavior is retained.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name) values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name',''));
  insert into public.point_transactions (user_id, amount, description, expires_at) values (new.id, 2000, 'PHILIA 회원 가입 적립금', now() + interval '1 year');
  return new;
end; $$;

revoke update on public.profiles from authenticated;
grant update (display_name, phone, birth_date, postal_code, address_line1, address_line2, newsletter, updated_at) on public.profiles to authenticated;

insert into public.notices (title, body, pinned, published, published_at) values
  ('PHILIA Collection 1 오픈 안내', '오래 머무는 여섯 가지 옷, Collection 1을 소개합니다. 모든 피스는 기본 수선을 무료로 제공합니다.', true, true, now()),
  ('수선 데스크 이용 안내', '계정의 Q&A 또는 수선 문의를 통해 착용 중 생긴 흔적을 알려주세요. 확인 후 접수 방법을 안내합니다.', true, true, now()),
  ('배송 및 교환 안내', '기본 배송은 결제 완료 후 영업일 기준 2일 이내 시작됩니다. 교환과 반품은 수령 후 7일 이내 문의해 주세요.', false, true, now())
on conflict do nothing;

insert into storage.buckets (id, name, public) values ('review-images', 'review-images', true), ('mending-images', 'mending-images', false) on conflict (id) do nothing;
create policy "public review image read" on storage.objects for select using (bucket_id = 'review-images');
create policy "members review image upload" on storage.objects for insert with check (bucket_id = 'review-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "members own review image manage" on storage.objects for update using (bucket_id = 'review-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "members mending image read" on storage.objects for select using (bucket_id = 'mending-images' and (auth.uid()::text = (storage.foldername(name))[1] or public.is_staff()));
create policy "members mending image upload" on storage.objects for insert with check (bucket_id = 'mending-images' and auth.uid()::text = (storage.foldername(name))[1]);

