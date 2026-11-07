import bcrypt from 'bcryptjs';
import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { randomEmployeeCredential } from '@/lib/helpers';

const DEFAULT_STAFF = [
  '관리소장',
  '관리과장',
  '방재대리',
  '기술대리',
  '기전주임A',
  '기전주임B',
  '경리대리',
];

async function uniqueCredential(s, reserved = new Set()) {
  for (let i = 0; i < 80; i++) {
    const c = randomEmployeeCredential();
    if (reserved.has(c.loginId)) continue;
    const { data } = await s.from('hr_employees').select('id').eq('login_id', c.loginId).maybeSingle();
    if (!data) {
      reserved.add(c.loginId);
      return c;
    }
  }
  throw new Error('중복되지 않는 4자리 ID 생성에 실패했습니다. 다시 시도해 주세요.');
}

export async function POST() {
  if (!await getAdminSession()) return Response.json({ error: 'unauthorized' }, { status: 401 });
  const s = db();
  const { data: existing, error: readError } = await s.from('hr_employees').select('id,name,position,login_id,active');
  if (readError) return Response.json({ error: readError.message }, { status: 500 });
  const reserved = new Set((existing || []).map(e => e.login_id));
  const created = [];
  const skipped = [];

  for (const position of DEFAULT_STAFF) {
    const found = (existing || []).find(e => e.position === position || e.name === position);
    if (found) {
      skipped.push({ position, login_id: found.login_id, reason: '이미 등록됨' });
      continue;
    }
    const c = await uniqueCredential(s, reserved);
    const password_hash = await bcrypt.hash(c.password, 10);
    const { data, error } = await s.from('hr_employees').insert({
      name: position,
      position,
      department: '관리사무소',
      login_id: c.loginId,
      password_hash,
      active: true,
    }).select('id,name,position,department,login_id').single();
    if (error) return Response.json({ error: `${position}: ${error.message}` }, { status: 500 });
    created.push({ ...data, password: c.password });
  }

  return Response.json({ created, skipped, total: DEFAULT_STAFF.length });
}
