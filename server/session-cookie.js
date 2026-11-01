import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export const SESSION_HOURS = 72;
const cookieName = '__Host-esmojo-session';
const key = env => createHash('sha256').update(`esmojo-session-v1\0${env.SUPABASE_SECRET_KEY}`).digest();
export function sessionDeadline(claims) {
  const dates = (claims.amr || []).filter(item => item.method === 'password' && Number.isSafeInteger(item.timestamp) && item.timestamp > 0).map(item => item.timestamp * 1000);
  return dates.length ? Math.max(...dates) + SESSION_HOURS * 3600000 : null;
}
export function readSessionCookie(req, env, now = Date.now()) {
  try {
    const value = (req.headers.cookie || '').split(';').map(item => item.trim()).find(item => item.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
    if (!value || value.length > 4000) return null;
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(env), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const parsed = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString());
    if (typeof parsed.userId !== 'string' || typeof parsed.refreshToken !== 'string' || !parsed.refreshToken || !Number.isSafeInteger(parsed.expiresAt) || parsed.expiresAt <= now) return null;
    return parsed;
  } catch { return null; }
}
export function writeSessionCookie(res, session, env, now = Date.now()) {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(env), nonce);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session)), cipher.final()]);
  const value = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString('base64url');
  res.setHeader('Set-Cookie', `${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.max(0, Math.floor((session.expiresAt - now) / 1000))}; Expires=${new Date(session.expiresAt).toUTCString()}`);
}
export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
}
