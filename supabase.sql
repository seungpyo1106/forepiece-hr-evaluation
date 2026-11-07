create extension if not exists pgcrypto;

create table if not exists public.hr_settings (
  id integer primary key default 1 check (id = 1),
  year integer not null default 2026,
  main_notice text default '2026년 인사평가/동료평가는 11월 01일 ~ 11월 30일까지 입력 및 수정이 가능하고 이후 접속이 불가능 합니다.',
  evaluation_start timestamptz,
  evaluation_end timestamptz,
  updated_at timestamptz default now()
);
insert into public.hr_settings(id,year) values(1,2026) on conflict(id) do nothing;

create table if not exists public.hr_manager_accounts (
  id integer primary key default 1 check (id = 1),
  name text not null default '관리소장',
  login_id text unique not null,
  password_hash text not null,
  active boolean not null default true,
  updated_at timestamptz default now()
);

create table if not exists public.hr_employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  position text default '',
  department text default '관리사무소',
  login_id text unique not null,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.hr_evaluation_items (
  id uuid primary key default gen_random_uuid(),
  type text not null check(type in ('peer','self')),
  title text not null,
  help_text text default '',
  input_type text not null default 'text' check(input_type in ('text','score')),
  assigned_employee_id uuid references public.hr_employees(id) on delete cascade,
  sort_order integer default 0,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.hr_peer_submissions (
  id uuid primary key default gen_random_uuid(),
  evaluator_employee_id uuid not null references public.hr_employees(id) on delete cascade,
  target_employee_id uuid not null references public.hr_employees(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  updated_at timestamptz default now(),
  unique(evaluator_employee_id,target_employee_id),
  check(evaluator_employee_id <> target_employee_id)
);

create table if not exists public.hr_self_submissions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references public.hr_employees(id) on delete cascade,
  scores jsonb not null default '{}'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  total_score numeric(5,2) not null default 0,
  auto_grade text,
  raise_rate numeric(4,2) default 0,
  submitted_at timestamptz,
  updated_at timestamptz default now()
);

-- service role 전용 사용을 전제로 클라이언트 직접 접근 차단
alter table public.hr_settings enable row level security;
alter table public.hr_manager_accounts enable row level security;
alter table public.hr_employees enable row level security;
alter table public.hr_evaluation_items enable row level security;
alter table public.hr_peer_submissions enable row level security;
alter table public.hr_self_submissions enable row level security;

-- 기본 평가 문항(관리자에서 수정/삭제 가능)
insert into public.hr_evaluation_items(type,title,help_text,input_type,sort_order)
select 'peer','함께 일할 때 업무 협조와 소통은 원활했나요?','1점 매우 미흡 ~ 5점 매우 우수','score',10
where not exists(select 1 from public.hr_evaluation_items where title='함께 일할 때 업무 협조와 소통은 원활했나요?');
insert into public.hr_evaluation_items(type,title,help_text,input_type,sort_order)
select 'peer','책임감과 성실성은 어떠했나요?','1점 매우 미흡 ~ 5점 매우 우수','score',20
where not exists(select 1 from public.hr_evaluation_items where title='책임감과 성실성은 어떠했나요?');
insert into public.hr_evaluation_items(type,title,help_text,input_type,sort_order)
select 'peer','동료의 강점 또는 고마웠던 점을 작성해 주세요.','','text',30
where not exists(select 1 from public.hr_evaluation_items where title='동료의 강점 또는 고마웠던 점을 작성해 주세요.');
insert into public.hr_evaluation_items(type,title,help_text,input_type,sort_order)
select 'peer','개선되면 좋을 점이 있다면 작성해 주세요.','','text',40
where not exists(select 1 from public.hr_evaluation_items where title='개선되면 좋을 점이 있다면 작성해 주세요.');
insert into public.hr_evaluation_items(type,title,help_text,input_type,sort_order)
select 'self','올해 본인이 수행한 주요 업무와 성과를 구체적으로 작성해 주세요.','','text',10
where not exists(select 1 from public.hr_evaluation_items where title='올해 본인이 수행한 주요 업무와 성과를 구체적으로 작성해 주세요.');
insert into public.hr_evaluation_items(type,title,help_text,input_type,sort_order)
select 'self','업무 중 개선하거나 해결한 사례를 작성해 주세요.','','text',20
where not exists(select 1 from public.hr_evaluation_items where title='업무 중 개선하거나 해결한 사례를 작성해 주세요.');
insert into public.hr_evaluation_items(type,title,help_text,input_type,sort_order)
select 'self','내년에 강화하고 싶은 업무역량 또는 목표를 작성해 주세요.','','text',30
where not exists(select 1 from public.hr_evaluation_items where title='내년에 강화하고 싶은 업무역량 또는 목표를 작성해 주세요.');
