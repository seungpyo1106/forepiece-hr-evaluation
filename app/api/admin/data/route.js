import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { isManagementHeadPosition } from '@/lib/helpers';

export async function GET(){
  if(!await getAdminSession())return Response.json({error:'unauthorized'},{status:401});
  const s=db();
  const queries=[
    ['settings',s.from('hr_settings').select('*').eq('id',1).single()],
    ['employees',s.from('hr_employees').select('id,name,position,department,login_id,active,created_at').order('name')],
    ['peer',s.from('hr_peer_submissions').select('*,evaluator:hr_employees!hr_peer_submissions_evaluator_employee_id_fkey(name,position),target:hr_employees!hr_peer_submissions_target_employee_id_fkey(name,position)').order('updated_at',{ascending:false})],
    ['selfs',s.from('hr_self_submissions').select('*,employee:hr_employees(name,position,department)').order('updated_at',{ascending:false})],
    ['items',s.from('hr_evaluation_items').select('*,employee:hr_employees(name)').order('type').order('sort_order')],
    ['managerAccount',s.from('hr_manager_accounts').select('id,name,login_id,active,updated_at').eq('id',1).maybeSingle()],
    ['gradeRules',s.from('hr_grade_rules').select('*').order('sort_order')],
    ['stage1Reviews',s.from('hr_stage1_reviews').select('*')],
    ['finalReviews',s.from('hr_final_reviews').select('*')],
  ];
  const results=await Promise.all(queries.map(x=>x[1])); const out={}; const errors=[];
  results.forEach((r,i)=>{const key=queries[i][0];out[key]=r.data??((key==='settings'||key==='managerAccount')?null:[]);if(r.error)errors.push(`${key}: ${r.error.message}`)});
  if(Array.isArray(out.peer))out.peer=out.peer.filter(x=>!isManagementHeadPosition(x.evaluator?.position)&&!isManagementHeadPosition(x.target?.position));
  out.dbErrors=errors;
  return Response.json(out);
}
export async function PUT(req){
  if(!await getAdminSession())return Response.json({error:'unauthorized'},{status:401});
  const body=await req.json();
  const allowed=['year','main_notice','evaluation_start','evaluation_end','employee_access_start','employee_access_end','review_phase','progress_notice','second_progress_notice','result_notice','self_weight','peer_weight'];
  const patch=Object.fromEntries(Object.entries(body).filter(([k])=>allowed.includes(k)));
  const {error}=await db().from('hr_settings').update({...patch,updated_at:new Date().toISOString()}).eq('id',1);
  if(error)return Response.json({error:error.message},{status:500});return Response.json({ok:true});
}
