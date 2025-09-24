-- migration.sql

-- Profiles
create table if not exists profiles (
  id uuid references auth.users primary key,
  username text,
  location_lat double precision,
  location_lon double precision,
  created_at timestamptz default now()
);

-- Messages (1:1 DMs)
create table if not exists messages (
  id bigserial primary key,
  sender_id uuid references auth.users not null,
  recipient_id uuid references auth.users not null,
  content text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table profiles enable row level security;
alter table messages enable row level security;

-- Profiles policies
create policy "profiles_insert_authenticated" on profiles
  for insert using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "profiles_update_own" on profiles
  for update using (auth.role() = 'authenticated' AND id = auth.uid());

create policy "profiles_select" on profiles
  for select using (true);

-- Messages policies
create policy "messages_insert_sender" on messages
  for insert using (auth.role() = 'authenticated') with check (auth.uid() = sender_id);

create policy "messages_select_participant" on messages
  for select using (auth.role() = 'authenticated' AND (sender_id = auth.uid() OR recipient_id = auth.uid()));

create policy "messages_delete_own" on messages
  for delete using (auth.role() = 'authenticated' AND sender_id = auth.uid());

-- Nearby users function (Haversine)
create or replace function nearby_users(my_lat double precision, my_lon double precision, me uuid, limit_rows int default 20)
returns table (
  id uuid,
  username text,
  location_lat double precision,
  location_lon double precision,
  distance_km double precision
) language sql stable as $$
  select p.id, p.username, p.location_lat, p.location_lon,
    ( 6371 * acos(
        cos(radians(my_lat)) *
        cos(radians(p.location_lat)) *
        cos(radians(p.location_lon) - radians(my_lon)) +
        sin(radians(my_lat)) *
        sin(radians(p.location_lat))
      )
    )::double precision as distance_km
  from profiles p
  where p.id is not null and p.id != me and p.location_lat is not null and p.location_lon is not null
  order by distance_km
  limit limit_rows;
$$;

grant execute on function nearby_users(double precision, double precision, uuid, integer) to authenticated;
