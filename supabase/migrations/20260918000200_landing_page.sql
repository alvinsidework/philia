insert into public.site_pages
  (slug, eyebrow_ko, eyebrow_en, title_ko, title_en, body_ko, body_en, secondary_ko, secondary_en, image_url, published)
values
  ('landing', '', '', '', '', '', '', '', '', '/images/hero.jpg', true)
on conflict (slug) do nothing;
