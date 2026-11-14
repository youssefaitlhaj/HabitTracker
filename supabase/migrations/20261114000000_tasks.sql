-- Ledger: daily tasks (one-off to-dos that carry over until done).

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  date date not null,
  done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.tasks (user_id, date);

alter table public.tasks enable row level security;

create policy "own tasks" on public.tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Import now also replaces tasks, still in one transaction.
create or replace function public.replace_user_data(p jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare
  h jsonb;
begin
  delete from habits where user_id = auth.uid();
  delete from tasks where user_id = auth.uid();

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

  insert into tasks (id, user_id, title, date, done_on, created_at, updated_at)
  select (t ->> 'id')::uuid, auth.uid(), t ->> 'title', (t ->> 'date')::date, (t ->> 'doneOn')::date,
         (t ->> 'createdAt')::timestamptz, (t ->> 'updatedAt')::timestamptz
  from jsonb_array_elements(coalesce(p -> 'tasks', '[]'::jsonb)) t
  on conflict do nothing;
end;
$$;
