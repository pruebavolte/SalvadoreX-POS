import type { SupportSession, Signal } from "./types";
import { SESSION_EXPIRY_MS } from "./types";
import crypto from "crypto";

const sessions = new Map<string, SupportSession>();

const joinAttempts = new Map<string, { count: number; firstAttempt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_JOIN_ATTEMPTS = 10;

function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

function generateSecret(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function cleanupExpiredSessions(): void {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (new Date(session.expiresAt).getTime() < now) {
      sessions.delete(id);
    }
  }
  for (const [ip, attempt] of joinAttempts.entries()) {
    if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW_MS) {
      joinAttempts.delete(ip);
    }
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const attempt = joinAttempts.get(ip);
  
  if (!attempt) {
    joinAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  
  if (now - attempt.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    joinAttempts.set(ip, { count: 1, firstAttempt: now });
    return { allowed: true };
  }
  
  if (attempt.count >= MAX_JOIN_ATTEMPTS) {
    const retryAfter = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - attempt.firstAttempt)) / 1000);
    return { allowed: false, retryAfter };
  }
  
  attempt.count++;
  joinAttempts.set(ip, attempt);
  return { allowed: true };
}

export function createSession(hostIp?: string): SupportSession {
  cleanupExpiredSessions();
  
  let sessionCode = generateSessionCode();
  let attempts = 0;
  
  while ([...sessions.values()].some(s => s.code === sessionCode && s.status !== 'ended') && attempts < 10) {
    sessionCode = generateSessionCode();
    attempts++;
  }

  const now = new Date();
  const session: SupportSession = {
    id: generateSessionId(),
    code: sessionCode,
    hostSecret: generateSecret(),
    viewerSecret: null,
    status: 'waiting',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_EXPIRY_MS).toISOString(),
    signals: [],
    hostIp: hostIp || null,
    viewerIp: null,
    remoteControlEnabled: false,
  };

  sessions.set(session.id, session);
  console.log(`[Support] Session created: ${session.id} with code: ${session.code}`);
  
  return session;
}

export function getSession(sessionId: string): SupportSession | undefined {
  return sessions.get(sessionId);
}

export function getSessionByCode(code: string): SupportSession | undefined {
  return [...sessions.values()].find(
    s => s.code === code && s.status === 'waiting'
  );
}

export function joinSession(code: string, viewerIp?: string): SupportSession | null {
  cleanupExpiredSessions();
  
  const session = getSessionByCode(code);
  if (!session) {
    return null;
  }

  session.status = 'connected';
  session.viewerId = `viewer_${Date.now()}`;
  session.viewerSecret = generateSecret();
  session.viewerIp = viewerIp || null;
  sessions.set(session.id, session);
  
  console.log(`[Support] Viewer joined session: ${session.id}`);
  return session;
}

export function endSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  session.status = 'ended';
  sessions.set(sessionId, session);
  console.log(`[Support] Session ended: ${sessionId}`);
  return true;
}

export function validateSignalRequest(
  sessionId: string, 
  from: 'host' | 'viewer', 
  secret: string
): { valid: boolean; error?: string; session?: SupportSession } {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { valid: false, error: 'Session not found' };
  }

  if (session.status === 'ended') {
    return { valid: false, error: 'Session has ended' };
  }

  if (from === 'host') {
    if (session.hostSecret !== secret) {
      return { valid: false, error: 'Invalid host secret' };
    }
  } else if (from === 'viewer') {
    if (!session.viewerSecret || session.viewerSecret !== secret) {
      return { valid: false, error: 'Invalid viewer secret' };
    }
  }

  return { valid: true, session };
}

export function addSignal(sessionId: string, signal: Signal): boolean {
  const session = sessions.get(sessionId);
  if (!session) {
    return false;
  }

  session.signals.push(signal);
  sessions.set(sessionId, session);
  console.log(`[Support] Signal added to session ${sessionId}: ${signal.type} from ${signal.from}`);
  return true;
}

export function getSignals(
  sessionId: string, 
  role: 'host' | 'viewer', 
  afterTimestamp?: string
): Signal[] {
  const session = sessions.get(sessionId);
  if (!session) {
    return [];
  }

  const oppositeRole = role === 'host' ? 'viewer' : 'host';
  let signals = session.signals.filter(s => s.from === oppositeRole);

  if (afterTimestamp) {
    const afterTime = new Date(afterTimestamp).getTime();
    signals = signals.filter(s => new Date(s.timestamp).getTime() > afterTime);
  }

  return signals;
}

export function enableRemoteControl(sessionId: string, secret: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.hostSecret !== secret) {
    return false;
  }

  session.remoteControlEnabled = true;
  sessions.set(sessionId, session);
  console.log(`[Support] Remote control enabled for session ${sessionId}`);
  return true;
}

export function disableRemoteControl(sessionId: string, secret: string): boolean {
  const session = sessions.get(sessionId);
  if (!session || session.hostSecret !== secret) {
    return false;
  }

  session.remoteControlEnabled = false;
  sessions.set(sessionId, session);
  console.log(`[Support] Remote control disabled for session ${sessionId}`);
  return true;
}

export function isRemoteControlEnabled(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  return session?.remoteControlEnabled ?? false;
}

export { sessions };
