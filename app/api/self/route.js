import { db } from '@/lib/supabase';
import { getEmployeeSession } from '@/lib/auth';
import { inPeriod, weightedScore, reviewPhase } from '@/lib/helpers';

async function ctx(){
  const session=await getEmployeeSession();
  if(!session) return null;
  const s=db();
  const {data:settings,error}=await s.from('hr_settings').select('*').eq('id',1).single();
  if(error) throw error;
  return {session,s,settings};
}
async function getItems(c){
  const {data:items,error}=await c.s.from('hr_evaluation_items').select('*').eq('type','self').eq('active',true).or(`assigned_employee_id.is.null,assigned_employee_id.eq.${c.session.employeeId}`).order('sort_order');
  if(error) throw error;
  return items||[];
}
export async function GET(){
  try{
    const c=await ctx(); if(!c)return Response.json({error:'unauthorized'},{status:401});
    const [{data:sub},items]=await Promise.all([c.s.from('hr_self_submissions').select('*').eq('employee_id',c.session.employeeId).maybeSingle(),getItems(c)]);
    const maxTotal=items.filter(i=>i.input_type==='score'&&Number(i.max_score||0)>0).reduce((a,i)=>a+Number(i.max_score||0),0);
    return Response.json({submission:sub,items,maxTotal,targetTotal:Number(c.settings?.self_weight||60)});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
export async function POST(req){
  try{
    const c=await ctx(); if(!c)return Response.json({error:'unauthorized'},{status:401});
    const body=await req.json();
    const {data:existing}=await c.s.from('hr_self_submissions').select('submitted_at,revision_allowed').eq('employee_id',c.session.employeeId).maybeSingle();
    const normalInput=reviewPhase(c.settings)==='input'&&inPeriod(c.settings);
    const revisionAllowed=existing?.revision_allowed===true;
    if(!normalInput&&!revisionAllowed)return Response.json({error:'현재는 직원 평가 입력기간이 아니며 관리자의 재작성 허용도 없습니다.'},{status:403});
    if(existing?.submitted_at&&!revisionAllowed)return Response.json({error:'이미 최종 제출한 본인평가입니다. 관리자에게 재작성 허용을 요청해 주세요.'},{status:409});
    const items=await getItems(c); const scoreItems=items.filter(i=>i.input_type==='score'&&Number(i.max_score||0)>0);
    const maxTotal=Math.round(scoreItems.reduce((a,i)=>a+Number(i.max_score||0),0)*100)/100;
    const targetTotal=Number(c.settings?.self_weight||60);
    const ratings=body.ratings||{}; const scores={}; let total=0; const missing=[];
    for(const item of scoreItems){
      const raw=ratings?.[item.id];
      if(raw===undefined||raw===null||raw===''){if(body.submit)missing.push(item.title);continue}
      const rating=Number(raw); if(!Number.isInteger(rating)||rating<1||rating>5)return Response.json({error:`${item.title}: 평가는 1~5단계로 선택해 주세요.`},{status:400});
      scores[item.id]=weightedScore(item.max_score,rating); total+=scores[item.id];
    }
    total=Math.round(total*100)/100;
    if(body.submit&&Math.abs(maxTotal-targetTotal)>0.001)return Response.json({error:`현재 본인평가 배점 합계가 ${maxTotal}점입니다. 관리자에게 요청하여 ${targetTotal}점으로 맞춘 후 제출해 주세요.`},{status:400});
    if(body.submit&&missing.length)return Response.json({error:`미평가 항목이 ${missing.length}개 있습니다. 모든 점수형 항목을 평가해 주세요.`},{status:400});
    const payload={employee_id:c.session.employeeId,ratings,scores,answers:body.answers||{},total_score:total,auto_grade:null,raise_rate:0,revision_allowed:body.submit?false:revisionAllowed,updated_at:new Date().toISOString(),submitted_at:body.submit?new Date().toISOString():null};
    const {error}=await c.s.from('hr_self_submissions').upsert(payload,{onConflict:'employee_id'}); if(error)return Response.json({error:error.message},{status:500});
    return Response.json({ok:true,total,maxTotal,targetTotal,submitted:!!body.submit});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
