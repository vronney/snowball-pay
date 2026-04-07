import { createHmac, timingSafeEqual } from 'crypto';

function secret(): string {
  const s = process.env.UNSUBSCRIBE_SECRET ?? process.env.AUTH0_SECRET;
  if (!s) throw new Error('UNSUBSCRIBE_SECRET env var is not set');
  return s;
}

export function generateUnsubscribeToken(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  try {
    const expected = Buffer.from(generateUnsubscribeToken(userId), 'hex');
    const actual   = Buffer.from(token, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}
