import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const enc = new TextEncoder();
function secret() {
  const value = process.env.APP_SECRET;
  if (!value) throw new Error('APP_SECRET is missing.');
  return enc.encode(value);
}

async function setSessionCookie(name, payload, hours) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret());
  const store = await cookies();
  store.set(name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * hours,
  });
}

export async function setEmployeeSession(employee) {
  return setSessionCookie('hr_employee', {
    role: 'employee', employeeId: employee.id, loginId: employee.login_id,
  }, 12);
}

export async function setAdminSession() {
  return setSessionCookie('hr_admin', { role: 'admin' }, 8);
}

export async function setManagerSession(manager) {
  return setSessionCookie('hr_manager', {
    role: 'manager', managerId: manager.id, loginId: manager.login_id,
  }, 8);
}

async function verifyCookie(name, role) {
  try {
    const store = await cookies();
    const token = store.get(name)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return payload.role === role ? payload : null;
  } catch {
    return null;
  }
}

export const getEmployeeSession = () => verifyCookie('hr_employee', 'employee');
export const getAdminSession = () => verifyCookie('hr_admin', 'admin');
export const getManagerSession = () => verifyCookie('hr_manager', 'manager');

export async function clearSession(name) {
  const store = await cookies();
  store.delete(name);
}
