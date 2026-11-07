import bcrypt from 'bcryptjs';
import { db } from '@/lib/supabase';
import { setManagerSession } from '@/lib/auth';

export async function POST(req) {
  const { loginId, password } = await req.json();
  const { data: manager, error } = await db()
    .from('hr_manager_accounts')
    .select('*')
    .eq('id', 1)
    .eq('active', true)
    .maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!manager || manager.login_id !== loginId || !(await bcrypt.compare(password || '', manager.password_hash))) {
    return Response.json({ error: '관리소장 ID 또는 패스워드가 올바르지 않습니다.' }, { status: 401 });
  }
  await setManagerSession(manager);
  return Response.json({ ok: true });
}
