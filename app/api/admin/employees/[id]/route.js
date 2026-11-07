import bcrypt from 'bcryptjs';
import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { randomEmployeeCredential, validEmployeeLoginId, validEmployeePassword } from '@/lib/helpers';

async function uniqueCredential(s, currentId) {
  for (let i = 0; i < 50; i++) {
    const c = randomEmployeeCredential();
    const { data } = await s.from('hr_employees').select('id').eq('login_id', c.loginId).maybeSingle();
    if (!data || String(data.id) === String(currentId)) return c;
  }
  throw new Error('중복되지 않는 4자리 ID 생성에 실패했습니다. 다시 시도해 주세요.');
}

export async function PUT(req, { params }) {
  if (!await getAdminSession()) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const s = db();
  const patch = {};
  if (body.name !== undefined) {
    const name = String(body.name || '').trim();
    if (!name) return Response.json({ error: '직원 이름을 입력해 주세요.' }, { status: 400 });
    patch.name = name;
  }
  for (const k of ['position','department','active']) if (body[k] !== undefined) patch[k] = body[k];
  if (body.login_id !== undefined) {
    if (!validEmployeeLoginId(body.login_id)) return Response.json({ error: '직원 ID는 숫자 4자리여야 합니다.' }, { status: 400 });
    patch.login_id = String(body.login_id);
  }
  let plainPassword = null;
  if (body.regenerate) {
    const c = await uniqueCredential(s, id);
    patch.login_id = c.loginId;
    plainPassword = c.password;
    patch.password_hash = await bcrypt.hash(c.password, 10);
  } else if (body.password) {
    if (!validEmployeePassword(body.password)) return Response.json({ error: '직원 비밀번호는 소문자 영문·숫자·특수문자 1개를 포함한 정확히 7자리여야 합니다.' }, { status: 400 });
    plainPassword = body.password;
    patch.password_hash = await bcrypt.hash(body.password, 10);
  }
  const { data, error } = await s.from('hr_employees').update(patch).eq('id', id).select('id,name,position,department,login_id,active').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ...data, password: plainPassword });
}


export async function DELETE(req, { params }) {
  if (!await getAdminSession()) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const { error } = await db().from('hr_employees').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
