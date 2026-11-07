'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function PrugioLogo({className='' }){return <img className={`prugioLogo ${className}`} src="https://www.prugio.com/asset/images/brand/bi_logo.png" alt="PRUGIO"/>}

export default function Home() {
  const router = useRouter();
  const [settings,setSettings]=useState(null);
  const [loginId,setLoginId]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [showPw,setShowPw]=useState(false);
  useEffect(()=>{fetch('/api/settings').then(r=>r.json()).then(setSettings).catch(()=>{});},[]);
  async function login(e){e.preventDefault();setError('');const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({loginId,password})});const j=await r.json();if(!r.ok){setError(j.error||'로그인에 실패했습니다.');return;}router.push('/evaluation');}
  return <main className="employeeAuthPage">
    <section className="employeeAuthShell">
      <div className="authVisual">
        <div className="authVisualShade"/>
        <div className="authVisualTop"><div className="visualBrand"><PrugioLogo className="visualPrugioLogo"/><div><strong>FOREPIECE</strong><span>기흥푸르지오포레피스</span></div></div><span className="visualYear">{settings?.year||2026} PERFORMANCE REVIEW</span></div>
        <div className="authVisualCopy"><span className="eyebrow">FOREPIECE · HR PERFORMANCE MANAGEMENT SYSTEM</span><h1>기흥푸르지오포레피스<br/>관리사무소 인사평가 시스템</h1><p>객관적 평가기준과 단계별 제출 절차를 기반으로<br/>자기평가 · 비공개 동료평가 · 관리자 검토를 체계적으로 통합 관리합니다.</p></div>
        <div className="authVisualQuote"><b>Structured · Fair · Confidential</b><span>기흥푸르지오포레피스 관리사무소</span></div>
      </div>
      <div className="authPanel">
        <div className="authPanelInner">
          <div className="mobileBrand"><PrugioLogo className="mobilePrugioLogo"/><div><strong>FOREPIECE</strong><span>기흥푸르지오포레피스</span></div></div>
          <div className="authTitle"><span className="eyebrow dark">{settings?.year||2026} PERFORMANCE REVIEW</span><h2>관리사무소 인사평가 시스템</h2><p>부여받은 아이디와 비밀번호로 로그인해 평가를 진행해 주세요.</p></div>
          {settings?.main_notice&&<div className="premiumNotice"><span className="noticeIcon">i</span><div><b>평가 안내</b><p>{settings.main_notice}</p></div></div>}
          <form onSubmit={login} className="premiumForm">
            <label className="premiumField"><span>아이디</span><div className="inputShell"><span className="inputIcon">○</span><input value={loginId} onChange={e=>setLoginId(e.target.value)} autoComplete="username" placeholder="아이디를 입력하세요" required/></div></label>
            <label className="premiumField"><span>비밀번호</span><div className="inputShell"><span className="inputIcon">◇</span><input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="비밀번호를 입력하세요" required/><button type="button" className="pwToggle" onClick={()=>setShowPw(v=>!v)}>{showPw?'숨김':'보기'}</button></div></label>
            {error&&<div className="alert danger">{error}</div>}
            <button className="btn premiumPrimary authSubmit">로그인 <span>→</span></button>
          </form>
          <div className="authSupport"><a href="/manager">관리소장 전용 로그인</a><span>계정 문의는 입주자대표회의 관리자에게 문의해 주세요.</span></div>
          <div className="authFooter">기흥푸르지오포레피스 입주자대표회의</div>
        </div>
      </div>
    </section>
  </main>
}
