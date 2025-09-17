alter table public.games
  add column if not exists asset_bundle_url text;
