'use client';
import { useEffect,useMemo,useState } from 'react';

const blank={grade:'',strengths:'',improvements:'',summary:''};
const phaseLabels={input:'직원 입력',first:'관리소장 평가',second:'입주자대표회의 최종평가',published:'결과 공개'};

export default function ManagerPage(){
  const [authed,setAuthed]=useState(false),[loginId,setLoginId]=useState(''),[password,setPassword]=useState(''),[data,setData]=useState(null),[selectedId,setSelectedId]=useState(null),[error,setError]=useState(''),[msg,setMsg]=useState(''),[form,setForm]=useState(blank),[loginLoading,setLoginLoading]=useState(false);

  async function load(){
    const r=await fetch('/api/manager/data');
    if(!r.ok)return false;
    const j=await r.json();
    setData(j);setAuthed(true);
    const reviewable=(j.staff||[]).filter(x=>x.can_review);
    const current=reviewable.find(x=>String(x.id)===String(selectedId))||reviewable[0]||null;
    if(current){
      setSelectedId(current.id);
      const rev=current.stage1_review;
      setForm(rev?{grade:rev.grade||'',strengths:rev.strengths||'',improvements:rev.improvements||'',summary:rev.summary||''}:blank);
    }
    return true;
  }

  useEffect(()=>{load()},[]);

  async function login(e){
    e?.preventDefault?.();
    if(loginLoading) return;
    setError('');
    if(!loginId.trim() || !password){ setError('관리소장 ID와 패스워드를 입력해 주세요.'); return; }
    setLoginLoading(true);
    try{
      const r=await fetch('/api/manager/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({loginId:loginId.trim(),password})});
      const contentType=r.headers.get('content-type')||'';
      const j=contentType.includes('application/json') ? await r.json() : {};
      if(!r.ok){
        if(r.status===404) setError('관리소장 로그인 API를 찾을 수 없습니다. 복구 패치를 다시 적용해 주세요. (404)');
        else if(r.status===401) setError(j.error||'관리소장 ID 또는 패스워드가 올바르지 않습니다.');
        else setError(j.error||`로그인 처리 중 오류가 발생했습니다. (${r.status})`);
        return;
      }
      const ok=await load();
      if(!ok) setError('로그인은 성공했지만 평가자료를 불러오지 못했습니다. 관리자 설정과 Supabase 연결을 확인해 주세요.');
    }catch(err){
      setError('로그인 서버에 연결하지 못했습니다. 인사평가 서버와 Supabase가 실행 중인지 확인해 주세요.');
    }finally{
      setLoginLoading(false);
    }
  }

  const reviewableStaff=useMemo(()=>(data?.staff||[]).filter(x=>x.can_review),[data]);
  const selected=useMemo(()=>reviewableStaff.find(x=>String(x.id)===String(selectedId)),[reviewableStaff,selectedId]);
  const totalTargets=reviewableStaff.length;
  const selfSubmitted=reviewableStaff.filter(e=>e.self_status==='submitted').length;
  const peerCompleted=reviewableStaff.filter(e=>Number(e.peer_expected||0)>0&&Number(e.peer_completed||0)>=Number(e.peer_expected||0)).length;
  const reviewCompleted=reviewableStaff.filter(e=>!!e.stage1_review?.submitted_at).length;
  const readyCount=reviewableStaff.filter(e=>e.self_status==='submitted'&&(Number(e.peer_expected||0)===0||Number(e.peer_completed||0)>=Number(e.peer_expected||0))).length;
  const reviewPct=totalTargets?Math.round(reviewCompleted/totalTargets*100):0;
  const canStage1=['first','second'].includes(data?.settings?.review_phase);

  function pick(e){
    setSelectedId(e.id);
    const r=e.stage1_review;
    setForm(r?{grade:r.grade||'',strengths:r.strengths||'',improvements:r.improvements||'',summary:r.summary||''}:blank);
    setMsg('');
    requestAnimationFrame(()=>document.getElementById('manager-review-detail')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }

  async function save(submit=true,force=false){
    if(!selected)return;
    const r=await fetch('/api/manager/reviews/'+selected.id,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...form,submit,force})});
    const j=await r.json().catch(()=>({}));
    if(r.status===409&&j.quotaExceeded){
      if(confirm('동일 평가자가 존재 합니다. 그래도 부여하시겠습니까?'))return save(submit,true);
      return;
    }
    setMsg(r.ok?(submit?'2차 평가가 제출되었습니다.':'임시저장되었습니다.'):j.error||'저장 실패');
    if(r.ok)load();
  }

  if(!authed)return <main className="managerLoginWrap"><section className="managerLoginCard"><img className="prugioLogo managerLoginPrugioLogo" src="https://www.prugio.com/asset/images/brand/bi_logo.png" alt="PRUGIO"/><div className="managerMark">2ND REVIEWER</div><h1>관리소장 2차 평가</h1><p>직원 제출자료와 익명 동료평가를 종합해 관리소장 2차 평가를 진행합니다.</p><form onSubmit={login}><div className="field"><label>관리소장 ID</label><input autoComplete="username" value={loginId} onChange={e=>setLoginId(e.target.value)}/></div><div className="field"><label>패스워드</label><input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)}/></div>{error&&<div className="alert danger">{error}</div>}<button type="submit" disabled={loginLoading} className="btn managerBtn" style={{width:'100%'}}>{loginLoading?'로그인 확인 중...':'로그인'}</button></form></section></main>;

  return <>
    <header className="managerHeader"><div className="managerHeaderIn"><div className="managerHeaderBrand"><img className="prugioLogo managerPrugioLogo" src="https://www.prugio.com/asset/images/brand/bi_logo.png" alt="PRUGIO"/><div><b>관리소장 2차 평가 시스템</b><small>기흥푸르지오포레피스 관리사무소</small></div></div><div className="row"><span>{data.manager?.name}</span><button className="btn secondary" onClick={async()=>{await fetch('/api/manager/logout',{method:'POST'});location.reload()}}>로그아웃</button></div></div></header>

    <main className="managerWrap">
      <section className="managerHero managerHeroDashboard">
        <div><div className="managerEyebrow">SECOND REVIEW · MANAGEMENT</div><h1>2차 평가 대시보드</h1><p>직원 제출현황과 평가 진행상황을 한눈에 확인하고, 대상자를 선택해 2차 평가를 진행합니다.</p></div>
        <div className="managerHeroStatus"><span>현재 평가단계</span><strong>{phaseLabels[data?.settings?.review_phase]||data?.settings?.review_phase||'-'}</strong><small>2차 평가 완료 {reviewCompleted}/{totalTargets}명</small><div className="managerHeroProgress"><i style={{width:`${reviewPct}%`}}/></div></div>
      </section>

      {msg&&<div className="alert info" style={{margin:'14px 0'}}>{msg}</div>}
      {!canStage1&&<div className="alert warn" style={{margin:'14px 0'}}>현재 시스템 단계에서는 관리소장 평가 저장이 제한됩니다. 관리자페이지에서 평가 단계를 확인해 주세요.</div>}

      <section className="managerKpiGrid">
        <div className="card managerKpiCard target"><span>평가대상자</span><strong>{totalTargets}<small>명</small></strong><p>관리소장 본인은 제외됩니다.</p></div>
        <div className="card managerKpiCard self"><span>본인평가 제출</span><strong>{selfSubmitted}<small> / {totalTargets}명</small></strong><p>{totalTargets?Math.round(selfSubmitted/totalTargets*100):0}% 제출 완료</p></div>
        <div className="card managerKpiCard peer"><span>동료평가 완료</span><strong>{peerCompleted}<small> / {totalTargets}명</small></strong><p>대상자별 필요 인원 기준</p></div>
        <div className="card managerKpiCard review"><span>2차 평가 완료</span><strong>{reviewCompleted}<small> / {totalTargets}명</small></strong><p>남은 평가 {Math.max(totalTargets-reviewCompleted,0)}명</p></div>
      </section>

      <section className="card managerProgressPanel">
        <div className="managerProgressTop"><div><div className="managerEyebrow">REVIEW PROGRESS</div><h2>현재 평가 진행상황</h2><p>직원 제출자료 준비 상태와 관리소장 평가 완료 여부를 확인할 수 있습니다.</p></div><div className="managerProgressNumber"><strong>{reviewPct}%</strong><span>2차 평가 완료율</span></div></div>
        <div className="managerProgressTrack"><i style={{width:`${reviewPct}%`}}/></div>
        <div className="managerProgressLegend"><span><i className="ready"/>자료 준비 완료 <b>{readyCount}</b></span><span><i className="done"/>2차 평가 완료 <b>{reviewCompleted}</b></span><span><i/>평가 대기 <b>{Math.max(totalTargets-reviewCompleted,0)}</b></span></div>
      </section>

      <section className="managerTargetsSection">
        <div className="managerSectionHead"><div><div className="managerEyebrow">REVIEW TARGETS</div><h2>평가대상자 현황</h2><p>직원을 선택하면 아래 상세 평가영역으로 이동합니다.</p></div><span className="pill neutral">총 {totalTargets}명</span></div>
        {reviewableStaff.length?<div className="managerTargetGrid">{reviewableStaff.map(e=>{
          const selfDone=e.self_status==='submitted';
          const peerDone=Number(e.peer_expected||0)===0||Number(e.peer_completed||0)>=Number(e.peer_expected||0);
          const done=!!e.stage1_review?.submitted_at;
          const active=String(selectedId)===String(e.id);
          return <button key={e.id} className={'managerTargetCard '+(active?'active ':'')+(done?'done':'')} onClick={()=>pick(e)}>
            <div className="managerTargetTop"><div className="avatarCircle">{(e.name||'?').slice(0,1)}</div><div className="managerTargetName"><b>{e.name}</b><span>{e.position}</span></div><span className={'pill '+(done?'done':'wait')}>{done?`${e.stage1_review?.grade||''} · 완료`:'평가 대기'}</span></div>
            <div className="managerTargetStatus"><span className={selfDone?'ok':''}>본인평가 <b>{selfDone?'제출':'미제출'}</b></span><span className={peerDone?'ok':''}>동료평가 <b>{e.peer_completed}/{e.peer_expected}</b></span></div>
            <div className="managerTargetBottom"><span>기초 종합점수</span><strong>{e.base_total??0}<small>/100</small></strong><i>평가하기 →</i></div>
          </button>
        })}</div>:<div className="card emptyState">현재 평가할 직원이 없습니다.</div>}
      </section>

      {selected&&<section id="manager-review-detail" className="managerReviewDetail">
        <section className="card employeeHead managerSelectedHead"><div><span className="small muted">선택된 평가대상</span><h2>{selected.name} <span>{selected.position}</span></h2><p>본인평가 {selected.self_assessment?.total_score??0}점 + 동료평가 {selected.peer_score??0}점 = <b>기초 종합점수 {selected.base_total??0}/100</b></p></div><div className="managerSelectedBadges"><span className={'pill '+(selected.self_status==='submitted'?'done':'wait')}>본인 {selected.self_status==='submitted'?'제출완료':'미제출'}</span><span className={'pill '+(Number(selected.peer_completed||0)>=Number(selected.peer_expected||0)?'done':'wait')}>동료 {selected.peer_completed}/{selected.peer_expected}</span><span className={'pill '+(selected.stage1_review?.submitted_at?'done':'wait')}>{selected.stage1_review?.submitted_at?'2차 평가 완료':'2차 평가 대기'}</span></div></section>

        <div className="managerDetailGrid">
          <div className="managerDataColumn">
            <section className="card"><h2>직원 제출자료</h2>{selected.self_assessment?<><h3 className="sectionTitle">본인평가 세부</h3><div className="managerRubricList">{(selected.self_assessment.score_items||[]).map(i=><div className="managerRubricRow" key={i.id}><div><span className="small muted">{i.category}</span><b>{i.title}</b><p>{i.help_text}</p></div><div className="managerRubricScore"><strong>{i.rating??'-'}단계</strong><span>{i.score}/{i.max_score}점</span></div></div>)}</div><h3 className="sectionTitle">본인 서술내용</h3>{(selected.self_assessment.answers||[]).map(a=><div className="answerBlock" key={a.id}><b>{a.title}</b><p>{a.answer||'작성 내용 없음'}</p></div>)}</>:<div className="emptyState">아직 최종 제출된 본인평가가 없습니다.</div>}</section>

            <section className="card" style={{marginTop:14}}><div className="between"><div><h2>동료평가 종합</h2><p className="muted">개별 평가자는 공개하지 않고 종합결과만 표시합니다.</p></div><div className="peerCountBadge"><b>{selected.peer_completed||0}</b><span>명 참여</span></div></div><div className="privacyBox">평가자 이름은 표시하지 않으며, 익명성 보호 기준을 충족한 종합결과만 제공합니다.</div>{(selected.peer_summary?.score_items||[]).map(i=><div className="peerMetric" key={i.id}><div className="between"><b>{i.title}</b><span>{i.visible?<><strong>{i.average}</strong>/5 · {i.response_count}명</>:`응답 ${i.response_count}명 · 비공개`}</span></div>{i.visible&&<div className="meter"><i style={{width:`${Math.min(100,Number(i.average||0)/5*100)}%`}}/></div>}</div>)}{(selected.peer_summary?.text_items||[]).map(i=><div className="answerBlock" key={i.id}><b>{i.title}</b>{i.visible?<ul>{(i.comments||[]).map((c,n)=><li key={n}>{c}</li>)}</ul>:<p className="muted">익명성 보호 기준 미충족</p>}</div>)}</section>
          </div>

          <aside className="managerEvalColumn"><section className="card reviewEditor managerReviewEditor"><div className="managerReviewEditorHead"><div><div className="managerEyebrow">MANAGER REVIEW</div><h2>2차 평가 입력</h2><p className="muted">평가등급과 장점·보완점·총평을 입력합니다.</p></div>{selected.stage1_review?.submitted_at&&<span className="pill done">제출완료</span>}</div>{selected.can_review?<><div className="field"><label>종합 평가등급</label><select value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})}><option value="">등급 선택</option>{(data.grade_rules||[]).map(g=><option key={g.grade} value={g.grade}>{g.grade} · 인상률 {Number(g.raise_rate)}% · 권장 최대 {g.max_count??'제한없음'}명</option>)}</select></div><div className="field"><label>장점</label><textarea placeholder="해당 직원의 강점과 잘하고 있는 점을 작성해 주세요." value={form.strengths} onChange={e=>setForm({...form,strengths:e.target.value})}/></div><div className="field"><label>보완점</label><textarea placeholder="향후 개선 또는 보완이 필요한 내용을 작성해 주세요." value={form.improvements} onChange={e=>setForm({...form,improvements:e.target.value})}/></div><div className="field"><label>총평</label><textarea placeholder="제출자료와 근무성과를 종합한 평가의견을 작성해 주세요." value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})}/></div><div className="managerReviewActions"><button className="btn secondary" disabled={!canStage1} onClick={()=>save(false)}>임시저장</button><button className="btn" disabled={!canStage1} onClick={()=>save(true)}>2차 평가 제출</button></div></>:<div className="alert info">관리소장 본인에 대한 평가는 입주자대표회의가 관리자페이지에서 직접 진행합니다.</div>}</section></aside>
        </div>
      </section>}
    </main>
  </>;
}
