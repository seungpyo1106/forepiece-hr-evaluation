import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import { defaultSelfRubric, defaultSelfTextItems } from '@/lib/rubric';

export async function POST(){
  if(!await getAdminSession()) return Response.json({error:'unauthorized'},{status:401});
  const s=db();
  const {data:existing,error:readError}=await s.from('hr_evaluation_items').select('id,type,title').eq('type','self');
  if(readError) return Response.json({error:readError.message},{status:500});
  const byTitle=new Map((existing||[]).map(x=>[x.title,x]));
  let inserted=0,updated=0;
  for(const i of defaultSelfRubric){
    const found=byTitle.get(i.title);
    const payload={type:'self',category:i.category,title:i.title,help_text:i.help_text,input_type:'score',max_score:i.max_score,sort_order:i.sort_order,active:true,assigned_employee_id:null};
    const q=found?s.from('hr_evaluation_items').update(payload).eq('id',found.id):s.from('hr_evaluation_items').insert(payload);
    const {error}=await q;
    if(error) return Response.json({error:error.message},{status:500});
    found?updated++:inserted++;
  }
  for(const i of defaultSelfTextItems){
    const found=byTitle.get(i.title);
    if(found) continue;
    const {error}=await s.from('hr_evaluation_items').insert({type:'self',category:'서술형',title:i.title,help_text:i.help_text,input_type:'text',max_score:0,sort_order:i.sort_order,active:true,assigned_employee_id:null});
    if(error) return Response.json({error:error.message},{status:500});
    inserted++;
  }
  return Response.json({ok:true,inserted,updated});
}
