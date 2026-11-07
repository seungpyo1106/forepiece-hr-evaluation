import { clearSession } from '@/lib/auth';
export async function POST() {
  await clearSession('hr_manager');
  return Response.json({ ok: true });
}
