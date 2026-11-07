import { clearSession } from '@/lib/auth';
export async function POST(){await clearSession('hr_employee');return Response.json({ok:true});}
