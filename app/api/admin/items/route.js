import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

export async function POST(req){
  if(!await getAdminSession()) return Response.json({error:'unauthorized'},{status:401});
  const b=await req.json();
  if(!b.title?.trim()) return Response.json({error:'항목명을 입력해 주세요.'},{status:400});
  const inputType=b.input_type||'text';
  const maxScore=inputType==='score' && b.type==='self' ? Number(b.max_score||0) : 0;
  if(inputType==='score' && b.type==='self' && maxScore<=0) return Response.json({error:'본인 인사평가 점수형 항목은 배점을 0보다 크게 입력해 주세요.'},{status:400});
  const {data,error}=await db().from('hr_evaluation_items').insert({
    type:b.type,
    category:(b.category||'').trim(),
    title:b.title.trim(),
    help_text:(b.help_text||'').trim(),
    input_type:inputType,
    max_score:maxScore,
    assigned_employee_id:b.assigned_employee_id||null,
    sort_order:Number(b.sort_order||0),
    active:true
  }).select('*').single();
  if(error) return Response.json({error:error.message},{status:500});
  return Response.json(data);
}
