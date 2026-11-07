-- 기존 인사평가 DB에 관리소장 전용 계정을 추가할 때 실행하세요.
create table if not exists public.hr_manager_accounts (
  id integer primary key default 1 check (id = 1),
  name text not null default '관리소장',
  login_id text unique not null,
  password_hash text not null,
  active boolean not null default true,
  updated_at timestamptz default now()
);
alter table public.hr_manager_accounts enable row level security;
