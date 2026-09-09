create table public.review_helpful (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.review_helpful enable row level security;
create policy "helpful read" on public.review_helpful for select using (true);
create policy "members mark helpful" on public.review_helpful for insert with check (user_id = auth.uid());
create policy "members unmark helpful" on public.review_helpful for delete using (user_id = auth.uid());

create or replace function public.sync_review_helpful_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare target_id uuid;
begin
  if tg_op = 'DELETE' then target_id := old.review_id; else target_id := new.review_id; end if;
  update public.reviews set helpful_count = (select count(*) from public.review_helpful where review_id = target_id) where id = target_id;
  if tg_op = 'DELETE' then return old; else return new; end if;
end; $$;

create trigger review_helpful_count after insert or delete on public.review_helpful for each row execute function public.sync_review_helpful_count();

create or replace function public.toggle_review_helpful(target_review_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); result_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.review_helpful where review_id = target_review_id and user_id = current_user_id) then
    delete from public.review_helpful where review_id = target_review_id and user_id = current_user_id;
  else
    insert into public.review_helpful(review_id, user_id) values(target_review_id, current_user_id);
  end if;
  select helpful_count into result_count from public.reviews where id = target_review_id;
  return coalesce(result_count, 0);
end; $$;
