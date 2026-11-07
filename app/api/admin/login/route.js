import { setAdminSession } from '@/lib/auth';

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const inputPassword = String(body?.password ?? '').trim();
    const adminPassword = String(process.env.ADMIN_PASSWORD ?? '').trim();

    if (!adminPassword) {
      console.error('[admin/login] ADMIN_PASSWORD is missing');
      return Response.json(
        { error: '관리자 비밀번호 환경설정(ADMIN_PASSWORD)이 비어 있습니다.', code: 'ADMIN_PASSWORD_MISSING' },
        { status: 500 },
      );
    }

    if (!inputPassword || inputPassword !== adminPassword) {
      return Response.json(
        { error: '관리자 비밀번호가 올바르지 않습니다.', code: 'INVALID_PASSWORD' },
        { status: 401 },
      );
    }

    await setAdminSession();
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[admin/login] unexpected error', error);
    return Response.json(
      { error: '관리자 로그인 처리 중 오류가 발생했습니다.', code: 'LOGIN_ERROR' },
      { status: 500 },
    );
  }
}
