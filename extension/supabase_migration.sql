-- ============================================================
-- Article Saver – Supabase migrace
-- Spusť v: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create table if not exists public.saved_articles (
  id          uuid        primary key default gen_random_uuid(),
  url         text        not null,
  title       text,
  author      text,
  content     text,
  excerpt     text,
  source_type text        check (source_type in ('article', 'linkedin', 'other')),
  saved_at    timestamptz not null default now()
);

-- Index pro rychlé vyhledávání podle URL (deduplikace)
create index if not exists saved_articles_url_idx on public.saved_articles (url);

-- Index pro řazení podle data
create index if not exists saved_articles_saved_at_idx on public.saved_articles (saved_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.saved_articles enable row level security;

-- Povolit anonymní vkládání (pro rozšíření bez přihlášení)
create policy "anon_insert" on public.saved_articles
  for insert
  to anon
  with check (true);

-- Povolit anonymní čtení
create policy "anon_select" on public.saved_articles
  for select
  to anon
  using (true);

-- ============================================================
-- Volitelné: Pokud chceš deduplikaci (neuložit stejný URL 2x),
-- přidej unique constraint:
--
-- alter table public.saved_articles
--   add constraint saved_articles_url_unique unique (url);
--
-- A v background.js změň Prefer header na:
-- 'Prefer': 'resolution=ignore-duplicates,return=representation'
-- ============================================================
