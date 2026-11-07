import { db } from '@/lib/supabase';
import { getManagerSession } from '@/lib/auth';
import { weightedScore, round2, isManagementHeadPosition } from '@/lib/helpers';

const MIN_ANON_RESPONSES=3;
const present=v=>v!==undefined&&v!==null&&String(v).trim()!=='';

export async function GET(){
  const session=await getManagerSession();if(!session)return Response.json({error:'unauthorized'},{status:401});
  const s=db();
  const [managerRes,settingsRes,employeesRes,selfRes,peerRes,itemsRes,stage1Res,gradesRes]=await Promise.all([
    s.from('hr_manager_accounts').select('id,name,login_id').eq('id',session.managerId).single(),
    s.from('hr_settings').select('*').eq('id',1).single(),
    s.from('hr_employees').select('id,name,position,department,active').eq('active',true).order('name'),
    s.from('hr_self_submissions').select('*'),
    s.from('hr_peer_submissions').select('evaluator_employee_id,target_employee_id,answers,submitted_at').not('submitted_at','is',null),
    s.from('hr_evaluation_items').select('*').eq('active',true).order('sort_order'),
    s.from('hr_stage1_reviews').select('*'),
    s.from('hr_grade_rules').select('*').eq('active',true).order('sort_order'),
  ]);
  const err=[managerRes,settingsRes,employeesRes,selfRes,peerRes,itemsRes,stage1Res,gradesRes].find(x=>x.error)?.error;if(err)return Response.json({error:err.message},{status:500});
  const employees=employeesRes.data||[], items=itemsRes.data||[];
  const managerEmployeeIds=new Set(employees.filter(e=>isManagementHeadPosition(e.position)).map(e=>String(e.id)));
  const selfMap=new Map((selfRes.data||[]).map(x=>[String(x.employee_id),x]));
  const reviewMap=new Map((stage1Res.data||[]).map(x=>[String(x.employee_id),x]));
  const peerByTarget=new Map();
  for(const sub of peerRes.data||[]){
    if(managerEmployeeIds.has(String(sub.evaluator_employee_id))||managerEmployeeIds.has(String(sub.target_employee_id)))continue;
    const k=String(sub.target_employee_id);if(!peerByTarget.has(k))peerByTarget.set(k,[]);peerByTarget.get(k).push(sub);
  }
  const eligiblePeerEvaluators=employees.filter(e=>!isManagementHeadPosition(e.position));
  const staff=employees.map(emp=>{
    const isManagerEmployee=isManagementHeadPosition(emp.position);
    const self=selfMap.get(String(emp.id)); const selfSubmitted=!!self?.submitted_at;
    const selfItems=items.filter(i=>i.type==='self'&&(!i.assigned_employee_id||String(i.assigned_employee_id)===String(emp.id)));
    const selfAnswers=selfItems.filter(i=>i.input_type==='text').map(i=>({id:i.id,title:i.title,help_text:i.help_text,answer:self?.answers?.[i.id]||''}));
    const selfScores=selfItems.filter(i=>i.input_type==='score').map(i=>({id:i.id,title:i.title,category:i.category,help_text:i.help_text,max_score:Number(i.max_score||0),rating:self?.ratings?.[i.id]??null,score:Number(self?.scores?.[i.id]||0)}));
    const subs=isManagerEmployee?[]:(peerByTarget.get(String(emp.id))||[]);
    const peerItems=isManagerEmployee?[]:items.filter(i=>i.type==='peer'&&(!i.assigned_employee_id||String(i.assigned_employee_id)===String(emp.id)));
    const scoreItems=peerItems.filter(i=>i.input_type==='score'&&Number(i.max_score||0)>0); const textItems=peerItems.filter(i=>i.input_type==='text');
    const perSubmissionTotals=subs.map(sub=>round2(scoreItems.reduce((sum,i)=>sum+weightedScore(i.max_score,Number(sub.answers?.[i.id]||0)),0)));
    const peerScore=perSubmissionTotals.length?round2(perSubmissionTotals.reduce((a,b)=>a+b,0)/perSubmissionTotals.length):0;
    const peerMetrics=scoreItems.map(i=>{const vals=subs.map(s=>Number(s.answers?.[i.id])).filter(v=>Number.isFinite(v)&&v>=1&&v<=5);return {id:i.id,title:i.title,max_score:Number(i.max_score||0),response_count:vals.length,average:vals.length>=MIN_ANON_RESPONSES?round2(vals.reduce((a,b)=>a+b,0)/vals.length):null,visible:vals.length>=MIN_ANON_RESPONSES}});
    const peerTexts=textItems.map(i=>{const vals=subs.map(s=>s.answers?.[i.id]).filter(present).map(String);return {id:i.id,title:i.title,response_count:vals.length,comments:vals.length>=MIN_ANON_RESPONSES?vals:[],visible:vals.length>=MIN_ANON_RESPONSES}});
    const selfScore=selfSubmitted?Number(self.total_score||0):0; const baseTotal=round2(selfScore+peerScore);
    const peerExpected=isManagerEmployee?0:eligiblePeerEvaluators.filter(e=>String(e.id)!==String(emp.id)).length;
    return {...emp,can_review:!isManagerEmployee,self_status:selfSubmitted?'submitted':self?'draft':'none',self_assessment:selfSubmitted?{total_score:selfScore,score_items:selfScores,answers:selfAnswers}:null,peer_completed:subs.length,peer_expected:peerExpected,peer_score:peerScore,base_total:baseTotal,peer_summary:{visible:subs.length>=MIN_ANON_RESPONSES,score_items:peerMetrics,text_items:peerTexts},stage1_review:reviewMap.get(String(emp.id))||null};
  });
  return Response.json({manager:managerRes.data,settings:settingsRes.data,staff,grade_rules:gradesRes.data||[],privacy_threshold:MIN_ANON_RESPONSES,evaluation_items:items});
}
