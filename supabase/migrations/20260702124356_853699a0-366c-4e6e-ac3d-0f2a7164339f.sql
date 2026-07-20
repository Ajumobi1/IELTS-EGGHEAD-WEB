
-- Roles enum & user_roles table
create type public.app_role as enum ('admin', 'student');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Admins can read all roles
create policy "Admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Auto profile + student role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'student') on conflict do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Tests
create type public.test_type as enum ('reading', 'listening', 'writing', 'speaking');

create table public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type test_type not null,
  description text,
  passage text,
  audio_url text,
  duration_minutes int not null default 60,
  is_published boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.tests to authenticated;
grant all on public.tests to service_role;
alter table public.tests enable row level security;
create policy "Students read published tests" on public.tests for select to authenticated using (is_published = true or public.has_role(auth.uid(), 'admin'));
create policy "Admins insert tests" on public.tests for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update tests" on public.tests for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete tests" on public.tests for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Questions
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  position int not null default 0,
  prompt text not null,
  options jsonb,
  correct_answer text not null,
  points int not null default 1,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.questions to authenticated;
grant all on public.questions to service_role;
alter table public.questions enable row level security;
create policy "Students read questions of published tests" on public.questions for select to authenticated using (
  exists (select 1 from public.tests t where t.id = test_id and (t.is_published or public.has_role(auth.uid(), 'admin')))
);
create policy "Admins manage questions" on public.questions for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Attempts
create table public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score int,
  total int,
  submitted boolean not null default false,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.test_attempts to authenticated;
grant all on public.test_attempts to service_role;
alter table public.test_attempts enable row level security;
create policy "Users manage own attempts" on public.test_attempts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read all attempts" on public.test_attempts for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Bookings (Personal Speaking Interaction)
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  preferred_date date,
  message text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert on public.bookings to authenticated;
grant insert on public.bookings to anon;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "Anyone can book" on public.bookings for insert to anon, authenticated with check (true);
create policy "Users read own bookings" on public.bookings for select to authenticated using (auth.uid() = user_id);
create policy "Admins read all bookings" on public.bookings for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins update bookings" on public.bookings for update to authenticated using (public.has_role(auth.uid(), 'admin'));
