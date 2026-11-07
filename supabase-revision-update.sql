-- 기흥푸르지오포레피스 인사평가
-- 제출 후 관리자 재작성 허용 기능 DB 업데이트
-- 기존 평가 데이터는 삭제하지 않습니다.

alter table public.hr_self_submissions
  add column if not exists revision_allowed boolean not null default false;

alter table public.hr_peer_submissions
  add column if not exists revision_allowed boolean not null default false;

update public.hr_self_submissions
set revision_allowed = false
where revision_allowed is null;

update public.hr_peer_submissions
set revision_allowed = false
where revision_allowed is null;

notify pgrst, 'reload schema';
