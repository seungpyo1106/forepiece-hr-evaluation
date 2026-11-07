import bcrypt from 'bcryptjs';
import { db } from '@/lib/supabase';
import { setEmployeeSession } from '@/lib/auth';
import { periodState } from '@/lib/helpers';
export async function POST(req){const {loginId,password}=await req.json();const s=db();const {data:settings}=await s.from('hr_settings').select('*').eq('id',1).single();const state=periodState(settings);if(state==='before')return Response.json({error:'평가기간이 아직 시작되지 않았습니다.'},{status:403});if(state==='ended')return Response.json({error:'평가기간이 종료 되었습니다.'},{status:403});const {data:employee}=await s.from('hr_employees').select('*').eq('login_id',loginId).eq('active',true).maybeSingle();if(!employee||!(await bcrypt.compare(password||'',employee.password_hash)))return Response.json({error:'ID 또는 패스워드가 올바르지 않습니다.'},{status:401});await setEmployeeSession(employee);return Response.json({ok:true});}
