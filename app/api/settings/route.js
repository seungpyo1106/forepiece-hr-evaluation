import { db } from '@/lib/supabase';
export async function GET(){const {data,error}=await db().from('hr_settings').select('*').eq('id',1).single();if(error)return Response.json({error:error.message},{status:500});return Response.json(data);}
