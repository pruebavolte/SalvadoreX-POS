"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionCode } from "@/components/support/SessionCode";
import { ConnectionStatus } from "@/components/support/ConnectionStatus";
import { RemoteCursor } from "@/components/support/RemoteCursor";
import { SignalingClient } from "@/lib/webrtc/signaling";
import { PeerConnectionManager } from "@/lib/webrtc/peer-connection";
import { RemoteControlHandler, type CursorPosition } from "@/lib/webrtc/remote-control";
import type { SupportSession, ConnectionState, Signal } from "@/lib/webrtc/types";
import { SIGNAL_POLL_INTERVAL_MS } from "@/lib/webrtc/types";
import { Monitor, MonitorOff, PhoneOff, Headset, Shield, ArrowLeft, MousePointer2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function HostPage() {
  const [session, setSession] = useState<SupportSession | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected' });
  const [isSharing, setIsSharing] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remoteControlEnabled, setRemoteControlEnabled] = useState(false);
  const [isTogglingRemoteControl, setIsTogglingRemoteControl] = useState(false);

  const signalingClientRef = useRef<SignalingClient | null>(null);
  const peerConnectionRef = useRef<PeerConnectionManager | null>(null);
  const remoteControlRef = useRef<RemoteControlHandler | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const handleSignals = useCallback(async (signals: Signal[]) => {
    if (!peerConnectionRef.current) return;

    for (const signal of signals) {
      try {
        await peerConnectionRef.current.handleSignal(signal);
      } catch (err) {
        console.error('[Host] Error handling signal:', err);
      }
    }
  }, []);

  const handleRemoteEvent = useCallback((event: any) => {
    if (remoteControlRef.current && remoteControlEnabled) {
      remoteControlRef.current.handleRemoteEvent(event);
    }
  }, [remoteControlEnabled]);

  const toggleRemoteControl = async () => {
    if (!signalingClientRef.current) return;
    
    setIsTogglingRemoteControl(true);
    try {
      if (remoteControlEnabled) {
        await signalingClientRef.current.disableRemoteControl();
        setRemoteControlEnabled(false);
        setShowCursor(false);
      } else {
        await signalingClientRef.current.enableRemoteControl();
        setRemoteControlEnabled(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle remote control');
    } finally {
      setIsTogglingRemoteControl(false);
    }
  };

  const createSession = async () => {
    setIsCreatingSession(true);
    setError(null);

    try {
      const client = new SignalingClient();
      signalingClientRef.current = client;

      const result = await client.createSession();

      if (result.success && result.session) {
        setSession(result.session);
        setConnectionState({ status: 'disconnected' });
        client.startPolling(handleSignals, SIGNAL_POLL_INTERVAL_MS);
      } else {
        setError(result.error || 'Failed to create session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const startScreenShare = async () => {
    if (!signalingClientRef.current) {
      setError('No active session');
      return;
    }

    try {
      setConnectionState({ status: 'connecting' });

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      });

      localStreamRef.current = stream;
      setIsSharing(true);

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      const peerConnection = new PeerConnectionManager(signalingClientRef.current, 'host');
      peerConnectionRef.current = peerConnection;

      const remoteControl = new RemoteControlHandler(peerConnection);
      remoteControlRef.current = remoteControl;
      remoteControl.setOnCursorUpdate((pos) => {
        setCursorPosition(pos);
        setShowCursor(true);
      });

      peerConnection.setOnConnectionStateChange((state) => {
        setConnectionState(state);
        if (state.status === 'connected') {
          setShowCursor(true);
        } else if (state.status === 'disconnected' || state.status === 'failed') {
          setShowCursor(false);
        }
      });

      peerConnection.setOnDataChannelMessage(handleRemoteEvent);

      await peerConnection.initialize();
      await peerConnection.addLocalStream(stream);
      await peerConnection.createOffer();

    } catch (err) {
      console.error('[Host] Screen share error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start screen sharing');
      setConnectionState({ status: 'failed', error: 'Screen share failed' });
      setIsSharing(false);
    }
  };

  const stopScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (remoteControlRef.current) {
      remoteControlRef.current.cleanup();
      remoteControlRef.current = null;
    }

    setIsSharing(false);
    setShowCursor(false);
    setConnectionState({ status: 'disconnected' });
  };

  const endSession = async () => {
    stopScreenShare();

    if (signalingClientRef.current) {
      await signalingClientRef.current.endSession();
      signalingClientRef.current.cleanup();
      signalingClientRef.current = null;
    }

    setSession(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      stopScreenShare();
      if (signalingClientRef.current) {
        signalingClientRef.current.cleanup();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <RemoteCursor x={cursorPosition.x} y={cursorPosition.y} visible={showCursor} />

      <div className="w-full px-3 sm:px-4 py-4 sm:py-8">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-4 sm:mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm sm:text-base">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4 flex-col sm:flex-row">
              <Headset className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              <h1 className="text-xl sm:text-2xl font-semibold" data-testid="text-page-title">
                Remote Support
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-page-description">
              Get help from a support technician by sharing your screen
            </p>
          </div>

          {error && (
            <Card className="mb-4 sm:mb-6 border-destructive mx-auto w-full sm:max-w-md">
              <CardContent className="p-3 sm:p-4">
                <p className="text-destructive text-xs sm:text-sm" data-testid="text-error">
                  {error}
                </p>
              </CardContent>
            </Card>
          )}

          {!session ? (
            <Card className="w-full sm:max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-base sm:text-lg" data-testid="text-start-session-title">
                  Start a Support Session
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm" data-testid="text-start-session-description">
                  Create a session to get help from a technician
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-muted rounded-lg">
                  <Shield className="h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-security-note">
                    Your screen is only shared after you grant permission. Sessions expire after 30 minutes.
                  </p>
                </div>

                <Button
                  onClick={createSession}
                  disabled={isCreatingSession}
                  className="w-full min-h-[44px]"
                  data-testid="button-create-session"
                >
                  {isCreatingSession ? 'Creating...' : 'Start Support Session'}
                </Button>

                <Link href="/support/viewer" className="block">
                  <Button variant="outline" className="w-full min-h-[44px]" data-testid="button-go-to-viewer">
                    I am a technician
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between flex-col sm:flex-row gap-2 sm:gap-4">
                <ConnectionStatus state={connectionState} />
                <Button
                  variant="destructive"
                  onClick={endSession}
                  data-testid="button-end-session"
                  className="min-h-[44px]"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  End Session
                </Button>
              </div>

              <div className="flex justify-center">
                <SessionCode
                  code={session.code}
                  expiresAt={session.expiresAt}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg" data-testid="text-screen-sharing-title">
                    Screen Sharing
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm" data-testid="text-screen-sharing-description">
                    {isSharing
                      ? 'Your screen is being shared with the technician'
                      : 'Grant screen access to allow the technician to see your screen'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isSharing ? (
                    <Button
                      onClick={startScreenShare}
                      className="w-full min-h-[44px]"
                      data-testid="button-start-sharing"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Grant Screen Access
                    </Button>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <Monitor className="h-4 sm:h-5 w-4 sm:w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-green-700 dark:text-green-300" data-testid="text-sharing-active">
                          Screen sharing is active. The technician can see your screen.
                        </p>
                      </div>

                      <div className="flex items-center justify-between flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg">
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                          <MousePointer2 className="h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground flex-shrink-0" />
                          <div>
                            <Label htmlFor="remote-control" className="text-xs sm:text-sm font-medium">
                              Remote Control
                            </Label>
                            <p className="text-xs text-muted-foreground">
                              Allow technician to control your cursor
                            </p>
                          </div>
                        </div>
                        <Switch
                          id="remote-control"
                          checked={remoteControlEnabled}
                          onCheckedChange={toggleRemoteControl}
                          disabled={isTogglingRemoteControl}
                          data-testid="switch-remote-control"
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={stopScreenShare}
                        className="w-full min-h-[44px]"
                        data-testid="button-stop-sharing"
                      >
                        <MonitorOff className="h-4 w-4 mr-2" />
                        Stop Sharing
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {showCursor && (
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-muted-foreground text-center" data-testid="text-cursor-active">
                      The technician&apos;s cursor is visible on your screen
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
