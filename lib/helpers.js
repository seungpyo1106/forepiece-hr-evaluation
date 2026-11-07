export function scoreGrade(score) {
  const n = Number(score || 0);
  if (n >= 95) return 'S';
  if (n >= 85) return 'A';
  if (n >= 75) return 'B';
  if (n >= 65) return 'C';
  return 'D';
}

export const raiseByGrade = { S: 3, A: 2.5, B: 2, C: 1.5, D: 0 };

export const ratingScale = {
  5: { label: '매우우수', factor: 1 },
  4: { label: '우수', factor: 0.85 },
  3: { label: '보통', factor: 0.7 },
  2: { label: '미흡', factor: 0.5 },
  1: { label: '매우미흡', factor: 0.3 },
};

export function weightedScore(maxScore, rating) {
  const max = Number(maxScore || 0);
  const r = Number(rating || 0);
  const factor = ratingScale[r]?.factor || 0;
  return Math.round(max * factor * 100) / 100;
}

export function periodState(settings) {
  const now = new Date();
  const start = settings?.evaluation_start ? new Date(settings.evaluation_start) : null;
  const end = settings?.evaluation_end ? new Date(settings.evaluation_end) : null;
  if (start && now < start) return 'before';
  if (end && now > end) return 'ended';
  return 'open';
}

export function inPeriod(settings) {
  return periodState(settings) === 'open';
}

const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const SPECIALS = '!@#$%';
const randomFrom = (chars) => chars[Math.floor(Math.random() * chars.length)];
const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// 직원용 계정 규칙
// ID: 숫자 4자리
// PW: 정확히 7자리, 영문 소문자 + 숫자 + 특수문자 정확히 1개 포함
export function randomEmployeeCredential() {
  const loginId = String(Math.floor(1000 + Math.random() * 9000));
  const passwordChars = [randomFrom(LOWER), randomFrom(DIGITS), randomFrom(SPECIALS)];
  const pool = LOWER + DIGITS;
  while (passwordChars.length < 7) passwordChars.push(randomFrom(pool));
  return { loginId, password: shuffle(passwordChars).join('') };
}

export function validEmployeeLoginId(value) {
  return /^\d{4}$/.test(String(value || ''));
}

export function validEmployeePassword(value) {
  const v = String(value || '');
  const specials = v.match(/[!@#$%]/g) || [];
  return v.length === 7 && /[a-z]/.test(v) && /\d/.test(v) && specials.length === 1 && /^[a-z0-9!@#$%]+$/.test(v);
}

// 관리소장 전용 열람계정은 직원계정과 구분하기 위해 기존 형식 유지
export function randomManagerCredential(prefix = 'MG') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return { loginId: `${prefix}${pick(6)}`, password: `${pick(4)}-${pick(4)}` };
}

// 하위 호환용
export function randomCredential(prefix = null) {
  return prefix ? randomManagerCredential(prefix) : randomEmployeeCredential();
}

export function employeeAccessState(settings) {
  const now = new Date();
  const start = settings?.employee_access_start ? new Date(settings.employee_access_start) : (settings?.evaluation_start ? new Date(settings.evaluation_start) : null);
  const end = settings?.employee_access_end ? new Date(settings.employee_access_end) : (settings?.evaluation_end ? new Date(settings.evaluation_end) : null);
  if (start && now < start) return 'before';
  if (end && now > end) return 'ended';
  return 'open';
}

export function inputPeriodState(settings) {
  return periodState(settings);
}

export function reviewPhase(settings) {
  const v = String(settings?.review_phase || 'input');
  return ['input','first','second','published'].includes(v) ? v : 'input';
}

export function round2(v) {
  return Math.round(Number(v || 0) * 100) / 100;
}

export function isManagementHeadPosition(position) {
  return String(position || '').replace(/\s+/g, '').includes('관리소장');
}
