import type { 
  SupportSession, 
  Signal, 
  SessionCreateResponse, 
  SessionJoinResponse, 
  SignalResponse 
} from './types';

export interface ExtendedSessionCreateResponse extends SessionCreateResponse {
  hostSecret?: string;
  remoteControlEnabled?: boolean;
}

export interface ExtendedSessionJoinResponse extends SessionJoinResponse {
  viewerSecret?: string;
  remoteControlEnabled?: boolean;
}

export class SignalingClient {
  private sessionId: string | null = null;
  private role: 'host' | 'viewer' | null = null;
  private secret: string | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastSignalTimestamp: string | null = null;

  async createSession(): Promise<ExtendedSessionCreateResponse> {
    try {
      const response = await fetch('/api/support/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });

      const data = await response.json();
      
      if (data.success && data.session) {
        this.sessionId = data.session.id;
        this.role = 'host';
        this.secret = data.session.hostSecret || null;
      }

      return {
        success: data.success,
        session: data.session,
        hostSecret: data.session?.hostSecret,
        remoteControlEnabled: data.session?.remoteControlEnabled,
        error: data.error,
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create session' 
      };
    }
  }

  async joinSession(code: string): Promise<ExtendedSessionJoinResponse> {
    try {
      const response = await fetch('/api/support/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', code }),
      });

      const data = await response.json();
      
      if (data.success && data.session) {
        this.sessionId = data.session.id;
        this.role = 'viewer';
        this.secret = data.session.viewerSecret || null;
      }

      return {
        success: data.success,
        session: data.session,
        viewerSecret: data.session?.viewerSecret,
        remoteControlEnabled: data.session?.remoteControlEnabled,
        error: data.error,
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to join session' 
      };
    }
  }

  async sendSignal(signal: Omit<Signal, 'timestamp'>): Promise<SignalResponse> {
    if (!this.sessionId || !this.secret) {
      return { success: false, error: 'No active session or missing secret' };
    }

    try {
      const response = await fetch('/api/support/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          secret: this.secret,
          signal: {
            ...signal,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send signal' 
      };
    }
  }

  async getSignals(): Promise<SignalResponse & { remoteControlEnabled?: boolean }> {
    if (!this.sessionId || !this.role || !this.secret) {
      return { success: false, error: 'No active session or missing credentials' };
    }

    try {
      const params = new URLSearchParams({
        sessionId: this.sessionId,
        role: this.role,
        secret: this.secret,
        ...(this.lastSignalTimestamp && { after: this.lastSignalTimestamp }),
      });

      const response = await fetch(`/api/support/signal?${params}`);
      const data = await response.json();

      if (data.success && data.signals?.length > 0) {
        this.lastSignalTimestamp = data.signals[data.signals.length - 1].timestamp;
      }

      return data;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get signals' 
      };
    }
  }

  async enableRemoteControl(): Promise<{ success: boolean; error?: string }> {
    if (!this.sessionId || !this.secret || this.role !== 'host') {
      return { success: false, error: 'Only host can enable remote control' };
    }

    try {
      const response = await fetch('/api/support/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enable-remote-control',
          sessionId: this.sessionId,
          secret: this.secret,
        }),
      });

      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to enable remote control' 
      };
    }
  }

  async disableRemoteControl(): Promise<{ success: boolean; error?: string }> {
    if (!this.sessionId || !this.secret || this.role !== 'host') {
      return { success: false, error: 'Only host can disable remote control' };
    }

    try {
      const response = await fetch('/api/support/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'disable-remote-control',
          sessionId: this.sessionId,
          secret: this.secret,
        }),
      });

      return await response.json();
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to disable remote control' 
      };
    }
  }

  startPolling(
    onSignal: (signals: Signal[]) => void, 
    intervalMs: number = 1000,
    onRemoteControlChange?: (enabled: boolean) => void
  ): void {
    this.stopPolling();
    
    this.pollInterval = setInterval(async () => {
      const response = await this.getSignals();
      if (response.success && response.signals && response.signals.length > 0) {
        onSignal(response.signals);
      }
      if (onRemoteControlChange && response.remoteControlEnabled !== undefined) {
        onRemoteControlChange(response.remoteControlEnabled);
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async endSession(): Promise<{ success: boolean; error?: string }> {
    if (!this.sessionId) {
      return { success: false, error: 'No active session' };
    }

    this.stopPolling();

    try {
      const response = await fetch('/api/support/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId: this.sessionId }),
      });

      const data = await response.json();
      
      if (data.success) {
        this.sessionId = null;
        this.role = null;
        this.secret = null;
        this.lastSignalTimestamp = null;
      }

      return data;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to end session' 
      };
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  getRole(): 'host' | 'viewer' | null {
    return this.role;
  }

  getSecret(): string | null {
    return this.secret;
  }

  cleanup(): void {
    this.stopPolling();
    this.sessionId = null;
    this.role = null;
    this.secret = null;
    this.lastSignalTimestamp = null;
  }
}

export const signalingClient = new SignalingClient();
