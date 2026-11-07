import { db } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';
import * as XLSX from 'xlsx';
import { Document,Packer,Paragraph,HeadingLevel,Table,TableRow,TableCell,TextRun } from 'docx';

async function data(){
  const s=db();
  const [{data:selfs},{data:peer},{data:items}]=await Promise.all([
    s.from('hr_self_submissions').select('*,employee:hr_employees(name,position,department)').order('total_score',{ascending:false}),
    s.from('hr_peer_submissions').select('*,evaluator:hr_employees!hr_peer_submissions_evaluator_employee_id_fkey(name),target:hr_employees!hr_peer_submissions_target_employee_id_fkey(name)').order('target_employee_id'),
    s.from('hr_evaluation_items').select('id,type,category,title,input_type,max_score,sort_order').order('sort_order')
  ]);
  return {selfs:selfs||[],peer:peer||[],items:items||[]};
}

function selfDetails(x,items){
  const applicable=items.filter(i=>i.type==='self');
  const scores=applicable.filter(i=>i.input_type==='score'&&Number(i.max_score||0)>0).map(i=>{
    const rating=x.ratings?.[i.id]; const score=x.scores?.[i.id];
    if(rating===undefined&&score===undefined)return null;
    return `${i.category||'기타'} > ${i.title}: ${rating??'-'}단계, ${score??0}/${Number(i.max_score||0)}점`;
  }).filter(Boolean);
  const texts=applicable.filter(i=>i.input_type==='text').map(i=>{
    const a=x.answers?.[i.id]; return a?`${i.title}: ${a}`:null;
  }).filter(Boolean);
  return {scores:scores.join('\n'),texts:texts.join('\n')};
}

function categoryCols(x,items){
  const out={};
  for(const i of items.filter(i=>i.type==='self'&&i.input_type==='score'&&Number(i.max_score||0)>0)){
    const cat=i.category||'기타';
    if(!out[cat])out[cat]={score:0,max:0};
    out[cat].score+=Number(x.scores?.[i.id]||0);
    out[cat].max+=Number(i.max_score||0);
  }
  return Object.fromEntries(Object.entries(out).map(([k,v])=>[`${k} (${v.max}점)`,Math.round(v.score*100)/100]));
}

export async function GET(req,{params}){
  if(!await getAdminSession())return Response.json({error:'unauthorized'},{status:401});
  const {format}=await params;
  const d=await data();
  if(format==='xlsx'){
    const wb=XLSX.utils.book_new();
    const selfRows=d.selfs.map(x=>{const det=selfDetails(x,d.items);return {직원:x.employee?.name,직급:x.employee?.position,부서:x.employee?.department,...categoryCols(x,d.items),총점:x.total_score,등급:x.auto_grade,인상률:`${x.raise_rate}%`,제출일:x.submitted_at||'임시저장',세부평가:det.scores,서술응답:det.texts}});
    const peerRows=d.peer.map(x=>({평가자:x.evaluator?.name,평가대상:x.target?.name,상태:x.submitted_at?'제출완료':'임시저장',제출일:x.submitted_at||'',응답:JSON.stringify(x.answers||{})}));
    const rubricRows=d.items.map(i=>({구분:i.type==='self'?'본인 인사평가':'동료평가',대분류:i.category||'',평가항목:i.title,입력방식:i.input_type==='score'?'1~5단계':'서술형',배점:Number(i.max_score||0),정렬:i.sort_order}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(selfRows),'인사평가');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(peerRows),'동료평가');
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rubricRows),'평가항목');
    const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
    return new Response(buf,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':'attachment; filename="forepice-hr-evaluation.xlsx"'}})
  }
  if(format==='docx'){
    const rows=[new TableRow({children:['직원','총점','등급','인상률','상태'].map(t=>new TableCell({children:[new Paragraph({children:[new TextRun({text:t,bold:true})]})]}))}),...d.selfs.map(x=>new TableRow({children:[x.employee?.name||'',String(x.total_score||0),x.auto_grade||'',`${x.raise_rate||0}%`,x.submitted_at?'제출완료':'임시저장'].map(t=>new TableCell({children:[new Paragraph(String(t))]}))}))];
    const children=[new Paragraph({text:'기흥 푸르지오 포레피스 관리사무소 인사평가 결과',heading:HeadingLevel.TITLE}),new Paragraph('동료평가는 인사평가 점수에 반영되지 않는 참고용 자료입니다.'),new Table({rows})];
    for(const x of d.selfs){
      const det=selfDetails(x,d.items);
      children.push(new Paragraph({text:`${x.employee?.name||''} 본인 인사평가 상세`,heading:HeadingLevel.HEADING_1}));
      children.push(new Paragraph(`총점 ${x.total_score||0}점 / ${x.auto_grade||''}등급 / 인상률 ${x.raise_rate||0}%`));
      if(det.scores)children.push(...det.scores.split('\n').map(t=>new Paragraph(t)));
      if(det.texts){children.push(new Paragraph({text:'서술형 응답',heading:HeadingLevel.HEADING_2}));children.push(...det.texts.split('\n').map(t=>new Paragraph(t)))}
    }
    children.push(new Paragraph({text:'동료평가 원본',heading:HeadingLevel.HEADING_1}));
    children.push(...d.peer.map(x=>new Paragraph(`${x.evaluator?.name||''} → ${x.target?.name||''} / ${x.submitted_at?'제출완료':'임시저장'} / ${JSON.stringify(x.answers||{})}`)));
    const doc=new Document({sections:[{children}]});
    const buf=await Packer.toBuffer(doc);
    return new Response(buf,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','Content-Disposition':'attachment; filename="forepice-hr-evaluation.docx"'}})
  }
  return Response.json({error:'지원하지 않는 형식입니다.'},{status:400});
}
