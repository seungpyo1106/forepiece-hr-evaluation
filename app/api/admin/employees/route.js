import bcrypt from 'bcryptjs';
import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { randomEmployeeCredential, validEmployeeLoginId, validEmployeePassword } from '@/lib/helpers';

async function uniqueCredential(s) {
  for (let i = 0; i < 50; i++) {
    const c = randomEmployeeCredential();
    const { data } = await s.from('hr_employees').select('id').eq('login_id', c.loginId).maybeSingle();
    if (!data) return c;
  }
  throw new Error('중복되지 않는 4자리 ID 생성에 실패했습니다. 다시 시도해 주세요.');
}

export async function POST(req) {
  if (!await getAdminSession()) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const s = db();
  let c;
  if (body.loginId || body.password) {
    const loginId = String(body.loginId || '');
    const password = String(body.password || '');
    if (!validEmployeeLoginId(loginId)) return Response.json({ error: '직원 ID는 숫자 4자리여야 합니다.' }, { status: 400 });
    if (!validEmployeePassword(password)) return Response.json({ error: '직원 비밀번호는 소문자 영문·숫자·특수문자 1개를 포함한 정확히 7자리여야 합니다.' }, { status: 400 });
    c = { loginId, password };
  } else {
    c = await uniqueCredential(s);
  }
  const password_hash = await bcrypt.hash(c.password, 10);
  const { data, error } = await s.from('hr_employees').insert({
    name: body.name,
    position: body.position || '',
    department: body.department || '관리사무소',
    login_id: c.loginId,
    password_hash,
    active: true,
  }).select('id,name,position,department,login_id').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ...data, password: c.password });
}
