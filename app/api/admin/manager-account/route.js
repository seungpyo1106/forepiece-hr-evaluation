import bcrypt from 'bcryptjs';
import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { randomManagerCredential } from '@/lib/helpers';

export async function POST(req) {
  if (!await getAdminSession()) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const s = db();
  const { data: existing } = await s.from('hr_manager_accounts').select('id,login_id').eq('id', 1).maybeSingle();
  const generated = body.regenerate ? randomManagerCredential('MG') : null;
  const loginId = generated?.loginId || body.loginId || existing?.login_id;
  const plainPassword = generated?.password || body.password;
  if (!loginId) return Response.json({ error: '관리소장 로그인 ID를 입력해 주세요.' }, { status: 400 });
  if (!existing && !plainPassword) return Response.json({ error: '처음 등록할 때는 패스워드가 필요합니다.' }, { status: 400 });
  const payload = {
    id: 1,
    name: body.name || '관리소장',
    login_id: loginId,
    active: body.active !== false,
    updated_at: new Date().toISOString(),
  };
  if (plainPassword) payload.password_hash = await bcrypt.hash(plainPassword, 10);
  const { data, error } = await s.from('hr_manager_accounts').upsert(payload, { onConflict: 'id' }).select('id,name,login_id,active,updated_at').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ...data, password: plainPassword || null });
}
