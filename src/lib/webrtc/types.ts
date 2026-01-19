export interface SupportSession {
  id: string;
  code: string;
  hostId?: string;
  viewerId?: string;
  status: 'waiting' | 'connected' | 'ended';
  createdAt: string;
  expiresAt: string;
  signals: Signal[];
  hostSecret: string;
  viewerSecret: string | null;
  hostIp: string | null;
  viewerIp: string | null;
  remoteControlEnabled: boolean;
}

export interface Signal {
  from: 'host' | 'viewer';
  type: 'offer' | 'answer' | 'ice-candidate';
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
  timestamp: string;
}

export interface RemoteEvent {
  type: 'mousemove' | 'mousedown' | 'mouseup' | 'click' | 'keydown' | 'keyup' | 'scroll';
  x?: number;
  y?: number;
  button?: number;
  key?: string;
  code?: string;
  deltaX?: number;
  deltaY?: number;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
}

export interface SessionCreateResponse {
  success: boolean;
  session?: SupportSession;
  error?: string;
}

export interface SessionJoinResponse {
  success: boolean;
  session?: SupportSession;
  error?: string;
}

export interface SignalResponse {
  success: boolean;
  signals?: Signal[];
  error?: string;
}

export interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  error?: string;
}

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export const SESSION_EXPIRY_MS = 30 * 60 * 1000;
export const SIGNAL_POLL_INTERVAL_MS = 1000;
