-- Ledger: tasks get notes, an optional date and time, and a severity.

alter table public.tasks
  add column notes text not null default '' check (char_length(notes) <= 2000),
  add column time text check (time ~ '^\d{2}:\d{2}$'),
  add column severity text check (severity in ('low', 'medium', 'high')),
  alter column date drop not null;

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

  insert into tasks (id, user_id, title, notes, date, time, severity, done_on, created_at, updated_at)
  select (t ->> 'id')::uuid, auth.uid(), t ->> 'title', coalesce(t ->> 'notes', ''), (t ->> 'date')::date, t ->> 'time',
         t ->> 'severity', (t ->> 'doneOn')::date, (t ->> 'createdAt')::timestamptz, (t ->> 'updatedAt')::timestamptz
  from jsonb_array_elements(coalesce(p -> 'tasks', '[]'::jsonb)) t
  on conflict do nothing;
end;
$$;
