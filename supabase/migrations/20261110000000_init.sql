-- Ledger: initial schema (design §9). Every table is protected by row-level security.

create extension if not exists pg_cron with schema extensions;

-- ── Tables ─────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  avatar_path text,
  timezone text not null default 'UTC',
  week_start text not null default 'monday' check (week_start in ('monday', 'sunday')),
  default_rest_days smallint not null default 1 check (default_rest_days between 0 and 2),
  show_streaks boolean not null default true,
  celebrate boolean not null default true,
  onboarded_at timestamptz,
  last_export_at timestamptz,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  category text not null check (category in ('health', 'mind', 'learning', 'home', 'social')),
  color text not null check (color in ('whisky', 'oak', 'amber', 'sage', 'clay', 'slate')),
  reminder_time text check (reminder_time ~ '^\d{2}:\d{2}$'),
  start_date date not null,
  why text not null default '' check (char_length(why) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

-- Child rows reference (habit_id, user_id) so a row can never point at someone else's habit.
create table public.habit_schedules (
  habit_id uuid not null,
  user_id uuid not null default auth.uid(),
  effective_from date not null,
  schedule_type text not null check (schedule_type in ('daily', 'days', 'times')),
  schedule_days smallint[],
  times_per_week smallint check (times_per_week between 1 and 7),
  rest_days_per_week smallint not null default 0 check (rest_days_per_week between 0 and 2),
  primary key (habit_id, effective_from),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create table public.habit_pauses (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null default auth.uid(),
  from_date date not null,
  to_date date check (to_date is null or to_date >= from_date),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create table public.checkins (
  habit_id uuid not null,
  user_id uuid not null default auth.uid(),
  date date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, date),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  user_id uuid not null default auth.uid(),
  date date not null,
  text text not null check (char_length(text) between 1 and 500),
  created_at timestamptz not null default now(),
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create index on public.checkins (user_id, date);
create index on public.notes (habit_id, date);

-- ── Row-level security ────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_schedules enable row level security;
alter table public.habit_pauses enable row level security;
alter table public.checkins enable row level security;
alter table public.notes enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create policy "own habits" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own schedules" on public.habit_schedules
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own pauses" on public.habit_pauses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own checkins" on public.checkins
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notes" on public.notes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── New user → profile ───────────────────────────────────────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Habit aggregate: one call saves the habit, its schedule versions and pauses ──

create function public.save_habit(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  hid uuid := (p ->> 'id')::uuid;
begin
  insert into habits (id, user_id, name, category, color, reminder_time, start_date, why, sort_order, created_at, updated_at)
  values (
    hid, auth.uid(), p ->> 'name', p ->> 'category', p ->> 'color', p ->> 'reminder',
    (p ->> 'startDate')::date, coalesce(p ->> 'why', ''), coalesce((p ->> 'order')::int, 0),
    coalesce((p ->> 'createdAt')::timestamptz, now()), coalesce((p ->> 'updatedAt')::timestamptz, now())
  )
  on conflict (id) do update set
    name = excluded.name, category = excluded.category, color = excluded.color,
    reminder_time = excluded.reminder_time, start_date = excluded.start_date, why = excluded.why,
    sort_order = excluded.sort_order, updated_at = excluded.updated_at;

  delete from habit_schedules where habit_id = hid;
  insert into habit_schedules (habit_id, user_id, effective_from, schedule_type, schedule_days, times_per_week, rest_days_per_week)
  select hid, auth.uid(), (s ->> 'effectiveFrom')::date, s ->> 'type',
         case when jsonb_typeof(s -> 'days') = 'array'
              then array(select jsonb_array_elements_text(s -> 'days')::smallint) end,
         (s ->> 'timesPerWeek')::smallint, (s ->> 'restDaysPerWeek')::smallint
  from jsonb_array_elements(p -> 'schedules') s;

  delete from habit_pauses where habit_id = hid;
  insert into habit_pauses (habit_id, user_id, from_date, to_date)
  select hid, auth.uid(), (x ->> 'from')::date, (x ->> 'to')::date
  from jsonb_array_elements(p -> 'pauses') x;
end;
$$;

-- ── Import: replace everything in one transaction (design §8.7) ──────

create function public.replace_user_data(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  h jsonb;
begin
  delete from habits where user_id = auth.uid();

  update profiles set
    display_name = p -> 'profile' ->> 'name',
    timezone = p -> 'profile' ->> 'timezone',
    week_start = p -> 'profile' ->> 'weekStart',
    default_rest_days = (p -> 'profile' ->> 'defaultRestDays')::smallint,
    show_streaks = (p -> 'profile' ->> 'showStreaks')::boolean,
    celebrate = (p -> 'profile' ->> 'celebrate')::boolean,
    updated_at = now()
  where id = auth.uid();

  for h in select * from jsonb_array_elements(p -> 'habits') loop
    perform public.save_habit(h);
  end loop;

  insert into checkins (habit_id, user_id, date)
  select (c ->> 'habitId')::uuid, auth.uid(), (c ->> 'date')::date
  from jsonb_array_elements(p -> 'checkins') c
  on conflict do nothing;

  insert into notes (id, habit_id, user_id, date, text, created_at)
  select (n ->> 'id')::uuid, (n ->> 'habitId')::uuid, auth.uid(), (n ->> 'date')::date, n ->> 'text', (n ->> 'createdAt')::timestamptz
  from jsonb_array_elements(p -> 'notes') n
  on conflict do nothing;
end;
$$;

-- ── Account deletion with a 7-day grace period (design §8.1) ─────────

create function public.request_account_deletion() returns void
language sql security invoker set search_path = public as $$
  update profiles set deletion_requested_at = now() where id = auth.uid();
$$;

create function public.cancel_account_deletion() returns boolean
language plpgsql security invoker set search_path = public as $$
declare
  was_pending boolean;
begin
  select deletion_requested_at is not null into was_pending from profiles where id = auth.uid();
  update profiles set deletion_requested_at = null where id = auth.uid();
  return coalesce(was_pending, false);
end;
$$;

create function public.purge_deleted_accounts() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] in (
      select id::text from profiles where deletion_requested_at < now() - interval '7 days'
    );
  delete from auth.users
  where id in (select id from profiles where deletion_requested_at < now() - interval '7 days');
end;
$$;

revoke execute on function public.purge_deleted_accounts() from public, anon, authenticated;

select cron.schedule('ledger-purge-deleted-accounts', '15 3 * * *', 'select public.purge_deleted_accounts()');

-- ── Avatars (private bucket, each user owns the folder named after their id) ──

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "own avatar files" on storage.objects
  for all to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
