import { db } from '@/lib/supabase';
import { getEmployeeSession } from '@/lib/auth';
import { employeeAccessState, reviewPhase, isManagementHeadPosition } from '@/lib/helpers';

export async function GET(){
  const session=await getEmployeeSession();
  if(!session)return Response.json({error:'unauthorized'},{status:401});
  const s=db();
  const [{data:me,error:meError},{data:settings,error:settingsError}]=await Promise.all([
    s.from('hr_employees').select('id,name,position,department,login_id').eq('id',session.employeeId).single(),
    s.from('hr_settings').select('*').eq('id',1).single(),
  ]);
  if(meError||settingsError)return Response.json({error:(meError||settingsError).message},{status:500});
  const access=employeeAccessState(settings);
  if(access!=='open')return Response.json({error:access==='ended'?'직원 접속기간이 종료되었습니다.':'직원 접속기간이 아직 시작되지 않았습니다.'},{status:403});

  const phase=reviewPhase(settings);
  const peerEnabled=!isManagementHeadPosition(me.position);
  const [{data:allPeers},{data:allPeerSubs},{data:selfSub}]=await Promise.all([
    s.from('hr_employees').select('id,name,position,department').eq('active',true).neq('id',session.employeeId).order('name'),
    s.from('hr_peer_submissions').select('target_employee_id,submitted_at,revision_allowed').eq('evaluator_employee_id',session.employeeId),
    s.from('hr_self_submissions').select('*').eq('employee_id',session.employeeId).maybeSingle(),
  ]);
  const peers=peerEnabled?(allPeers||[]).filter(p=>!isManagementHeadPosition(p.position)):[];
  const eligibleIds=new Set(peers.map(p=>String(p.id)));
  const peerSubs=(allPeerSubs||[]).filter(x=>eligibleIds.has(String(x.target_employee_id)));
  const selfRevisionAllowed=selfSub?.revision_allowed===true;
  const peerRevisionAllowed=peerSubs.some(x=>x.revision_allowed===true);
  const revisionMode=selfRevisionAllowed||peerRevisionAllowed;
  const base={me,settings,phase,peer_enabled:peerEnabled,revision_mode:revisionMode,self_revision_allowed:selfRevisionAllowed,peer_revision_allowed:peerRevisionAllowed};

  if(phase!=='input'&&!revisionMode){
    const {data:finalReview}=await s.from('hr_final_reviews').select('*').eq('employee_id',session.employeeId).maybeSingle();
    const {data:gradeRules}=await s.from('hr_grade_rules').select('*').eq('active',true).order('sort_order');
    const gradeRule=(gradeRules||[]).find(x=>x.grade===finalReview?.grade)||null;
    return Response.json({...base,finalReview:phase==='published'&&finalReview?.submitted_at?{grade:finalReview.grade,raise_rate:Number(gradeRule?.raise_rate||0),strengths:finalReview.strengths||'',improvements:finalReview.improvements||'',summary:finalReview.summary||'',submitted_at:finalReview.submitted_at}:null});
  }

  return Response.json({...base,peers,peerSubs,selfSub});
}
