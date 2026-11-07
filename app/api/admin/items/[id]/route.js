import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

export async function PUT(req,{params}){
  if(!await getAdminSession()) return Response.json({error:'unauthorized'},{status:401});
  const {id}=await params;
  const b=await req.json();
  const patch={};
  for(const k of ['title','help_text','input_type','category','assigned_employee_id','sort_order','active']){
    if(b[k]!==undefined) patch[k]=k==='assigned_employee_id'?(b[k]||null):b[k];
  }
  if(b.max_score!==undefined) patch.max_score=Math.max(0,Number(b.max_score||0));
  if(patch.input_type==='text') patch.max_score=0;
  const {error}=await db().from('hr_evaluation_items').update(patch).eq('id',id);
  if(error) return Response.json({error:error.message},{status:500});
  return Response.json({ok:true});
}

export async function DELETE(req,{params}){
  if(!await getAdminSession()) return Response.json({error:'unauthorized'},{status:401});
  const {id}=await params;
  const {error}=await db().from('hr_evaluation_items').delete().eq('id',id);
  if(error) return Response.json({error:error.message},{status:500});
  return Response.json({ok:true});
}
