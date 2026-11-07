import { db } from '@/lib/supabase';
import { getEmployeeSession } from '@/lib/auth';
import { inPeriod, reviewPhase, isManagementHeadPosition } from '@/lib/helpers';

async function ctx(){
  const session=await getEmployeeSession();
  if(!session)return null;
  const s=db();
  const [{data:settings,error:settingsError},{data:employee,error:employeeError}]=await Promise.all([
    s.from('hr_settings').select('*').eq('id',1).single(),
    s.from('hr_employees').select('id,name,position,active').eq('id',session.employeeId).single(),
  ]);
  if(settingsError||employeeError)throw (settingsError||employeeError);
  return {session,s,settings,employee};
}

async function peerTarget(c,target){
  if(!target)throw new Error('평가대상을 선택해 주세요.');
  const {data,error}=await c.s.from('hr_employees').select('id,name,position,active').eq('id',target).maybeSingle();
  if(error)throw error;
  return data;
}

async function itemsFor(c,target){
  const {data,error}=await c.s.from('hr_evaluation_items').select('*').eq('type','peer').eq('active',true).or(`assigned_employee_id.is.null,assigned_employee_id.eq.${target}`).order('sort_order');
  if(error)throw error;
  return data||[];
}

function excluded(c,targetEmployee){
  return isManagementHeadPosition(c.employee?.position)||isManagementHeadPosition(targetEmployee?.position);
}

export async function GET(req){
  try{
    const c=await ctx();
    if(!c)return Response.json({error:'unauthorized'},{status:401});
    const target=new URL(req.url).searchParams.get('target');
    const targetEmployee=await peerTarget(c,target);
    if(!targetEmployee||targetEmployee.active===false)return Response.json({error:'평가대상을 찾을 수 없습니다.'},{status:404});
    if(excluded(c,targetEmployee))return Response.json({error:'관리소장은 동료평가 대상 및 평가자에서 제외됩니다.'},{status:403});
    if(String(target)===String(c.session.employeeId))return Response.json({error:'본인은 동료평가 대상이 될 수 없습니다.'},{status:400});
    const [{data:sub},items]=await Promise.all([
      c.s.from('hr_peer_submissions').select('*').eq('evaluator_employee_id',c.session.employeeId).eq('target_employee_id',target).maybeSingle(),
      itemsFor(c,target),
    ]);
    return Response.json({submission:sub,items});
  }catch(e){return Response.json({error:e.message},{status:500})}
}

export async function POST(req){
  try{
    const c=await ctx();
    if(!c)return Response.json({error:'unauthorized'},{status:401});
    const body=await req.json();
    const targetEmployee=await peerTarget(c,body.targetEmployeeId);
    if(!targetEmployee||targetEmployee.active===false)return Response.json({error:'평가대상을 찾을 수 없습니다.'},{status:404});
    if(excluded(c,targetEmployee))return Response.json({error:'관리소장은 동료평가 대상 및 평가자에서 제외됩니다.'},{status:403});
    if(String(body.targetEmployeeId)===String(c.session.employeeId))return Response.json({error:'본인은 동료평가 대상이 될 수 없습니다.'},{status:400});
    const {data:existing}=await c.s.from('hr_peer_submissions').select('submitted_at,revision_allowed').eq('evaluator_employee_id',c.session.employeeId).eq('target_employee_id',body.targetEmployeeId).maybeSingle();
    const normalInput=reviewPhase(c.settings)==='input'&&inPeriod(c.settings);
    const revisionAllowed=existing?.revision_allowed===true;
    if(!normalInput&&!revisionAllowed)return Response.json({error:'현재는 직원 평가 입력기간이 아니며 관리자의 재작성 허용도 없습니다.'},{status:403});
    if(existing?.submitted_at&&!revisionAllowed)return Response.json({error:'평가가 완료 된 동료 입니다. 관리자에게 재작성 허용을 요청해 주세요.'},{status:409});
    if(body.submit){
      const items=await itemsFor(c,body.targetEmployeeId);
      const missing=items.filter(i=>i.input_type==='score'&&(body.answers?.[i.id]===undefined||body.answers?.[i.id]===null||body.answers?.[i.id]===''));
      if(missing.length)return Response.json({error:`미평가 항목이 ${missing.length}개 있습니다. 모든 점수형 항목을 평가해 주세요.`},{status:400});
    }
    const payload={evaluator_employee_id:c.session.employeeId,target_employee_id:body.targetEmployeeId,answers:body.answers||{},revision_allowed:body.submit?false:revisionAllowed,updated_at:new Date().toISOString(),submitted_at:body.submit?new Date().toISOString():null};
    const {error}=await c.s.from('hr_peer_submissions').upsert(payload,{onConflict:'evaluator_employee_id,target_employee_id'});
    if(error)return Response.json({error:error.message},{status:500});
    return Response.json({ok:true,submitted:!!body.submit});
  }catch(e){return Response.json({error:e.message},{status:500})}
}
