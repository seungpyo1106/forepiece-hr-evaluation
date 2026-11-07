import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

export async function POST(req,{params}){
  if(!await getAdminSession())return Response.json({error:'unauthorized'},{status:401});
  const {employeeId}=await params;
  const body=await req.json();
  const type=String(body.type||'');
  const allowed=body.allowed!==false;
  const s=db();

  if(type==='self'){
    const {data:row,error:findError}=await s.from('hr_self_submissions').select('employee_id,submitted_at,revision_allowed').eq('employee_id',employeeId).maybeSingle();
    if(findError)return Response.json({error:findError.message},{status:500});
    if(!row)return Response.json({error:'해당 직원의 본인평가 작성내역이 없습니다.'},{status:400});
    if(!row.submitted_at&&!row.revision_allowed&&allowed)return Response.json({error:'아직 최종 제출되지 않은 본인평가입니다.'},{status:400});
    const {error}=await s.from('hr_self_submissions').update({revision_allowed:allowed,updated_at:new Date().toISOString()}).eq('employee_id',employeeId);
    if(error)return Response.json({error:error.message},{status:500});
    return Response.json({ok:true,type,allowed});
  }

  if(type==='peer'){
    let q=s.from('hr_peer_submissions').select('evaluator_employee_id,target_employee_id,submitted_at,revision_allowed').eq('evaluator_employee_id',employeeId);
    const {data:rows,error:findError}=await q;
    if(findError)return Response.json({error:findError.message},{status:500});
    const submitted=(rows||[]).filter(x=>x.submitted_at||x.revision_allowed);
    if(!submitted.length)return Response.json({error:'해당 직원이 제출한 동료평가가 없습니다.'},{status:400});
    const targets=submitted.map(x=>x.target_employee_id);
    const {data,error}=await s.from('hr_peer_submissions').update({revision_allowed:allowed,updated_at:new Date().toISOString()}).eq('evaluator_employee_id',employeeId).in('target_employee_id',targets).select('target_employee_id');
    if(error)return Response.json({error:error.message},{status:500});
    return Response.json({ok:true,type,allowed,count:(data||[]).length});
  }

  return Response.json({error:'잘못된 재작성 권한 유형입니다.'},{status:400});
}
