import { db } from '@/lib/supabase';
import { getManagerSession } from '@/lib/auth';

export async function POST(req,{params}){
  const session=await getManagerSession(); if(!session)return Response.json({error:'unauthorized'},{status:401});
  const {employeeId}=await params; const body=await req.json(); const s=db();
  const {data:settings,error:settingsError}=await s.from('hr_settings').select('review_phase').eq('id',1).single();
  if(settingsError)return Response.json({error:settingsError.message},{status:500});
  if(!['first','second'].includes(settings?.review_phase))return Response.json({error:'현재는 관리소장 평가 진행 단계가 아닙니다.'},{status:403});
  const {data:employee,error:empError}=await s.from('hr_employees').select('id,name,position').eq('id',employeeId).single();
  if(empError)return Response.json({error:empError.message},{status:500});
  if(employee.position==='관리소장')return Response.json({error:'관리소장 본인 평가는 입주자대표회의 관리자 페이지에서 진행해 주세요.'},{status:403});
  const grade=String(body.grade||'').toUpperCase();
  const {data:rule}=await s.from('hr_grade_rules').select('*').eq('grade',grade).eq('active',true).maybeSingle();
  if(!rule)return Response.json({error:'유효한 평가등급을 선택해 주세요.'},{status:400});
  if(!body.force&&rule.max_count!==null&&rule.max_count!==undefined){
    const {count}=await s.from('hr_stage1_reviews').select('*',{count:'exact',head:true}).eq('grade',grade).not('submitted_at','is',null).neq('employee_id',employeeId);
    if(Number(count||0)>=Number(rule.max_count))return Response.json({error:'동일 평가자가 존재 합니다. 그래도 부여하시겠습니까?',quotaExceeded:true,currentCount:Number(count||0),maxCount:Number(rule.max_count)},{status:409});
  }
  const payload={employee_id:employeeId,evaluator_role:'manager',grade,strengths:String(body.strengths||''),improvements:String(body.improvements||''),summary:String(body.summary||''),updated_at:new Date().toISOString(),submitted_at:body.submit?new Date().toISOString():null};
  const {error}=await s.from('hr_stage1_reviews').upsert(payload,{onConflict:'employee_id'}); if(error)return Response.json({error:error.message},{status:500});
  return Response.json({ok:true,submitted:!!body.submit});
}
