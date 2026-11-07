import { clearSession } from '@/lib/auth';export async function POST(){await clearSession('hr_admin');return Response.json({ok:true});}
