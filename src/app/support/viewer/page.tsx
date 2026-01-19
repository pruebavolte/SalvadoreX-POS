"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScreenShare, type ScreenShareHandle } from "@/components/support/ScreenShare";
import { ConnectionStatus } from "@/components/support/ConnectionStatus";
import { SignalingClient } from "@/lib/webrtc/signaling";
import { PeerConnectionManager } from "@/lib/webrtc/peer-connection";
import { RemoteControlHandler } from "@/lib/webrtc/remote-control";
import type { ConnectionState, Signal, RemoteEvent } from "@/lib/webrtc/types";
import { SIGNAL_POLL_INTERVAL_MS } from "@/lib/webrtc/types";
import { Monitor, PhoneOff, Headset, ArrowLeft, Keyboard, Mouse } from "lucide-react";
import Link from "next/link";

export default function ViewerPage() {
  const [sessionCode, setSessionCode] = useState("");
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected' });
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlEnabled, setControlEnabled] = useState(false);

  const signalingClientRef = useRef<SignalingClient | null>(null);
  const peerConnectionRef = useRef<PeerConnectionManager | null>(null);
  const remoteControlRef = useRef<RemoteControlHandler | null>(null);
  const screenShareRef = useRef<ScreenShareHandle>(null);

  const handleSignals = useCallback(async (signals: Signal[]) => {
    if (!peerConnectionRef.current) return;

    for (const signal of signals) {
      try {
        await peerConnectionRef.current.handleSignal(signal);
      } catch (err) {
        console.error('[Viewer] Error handling signal:', err);
      }
    }
  }, []);

  const joinSession = async () => {
    if (!sessionCode || sessionCode.length !== 6) {
      setError('Please enter a valid 6-digit session code');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const client = new SignalingClient();
      signalingClientRef.current = client;

      const result = await client.joinSession(sessionCode.replace(/\s/g, ''));

      if (!result.success) {
        setError(result.error || 'Failed to join session');
        setIsJoining(false);
        return;
      }

      setConnectionState({ status: 'connecting' });

      const peerConnection = new PeerConnectionManager(client, 'viewer');
      peerConnectionRef.current = peerConnection;

      peerConnection.setOnRemoteStream((stream) => {
        console.log('[Viewer] Received remote stream');
        setRemoteStream(stream);
      });

      peerConnection.setOnConnectionStateChange((state) => {
        setConnectionState(state);
        if (state.status === 'connected') {
          setIsConnected(true);
        } else if (state.status === 'failed' || state.status === 'disconnected') {
          if (isConnected) {
            setError('Connection lost');
          }
        }
      });

      await peerConnection.initialize();

      const remoteControl = new RemoteControlHandler(peerConnection);
      remoteControlRef.current = remoteControl;

      client.startPolling(handleSignals, SIGNAL_POLL_INTERVAL_MS);
      setIsJoining(false);

    } catch (err) {
      console.error('[Viewer] Join error:', err);
      setError(err instanceof Error ? err.message : 'Failed to join session');
      setConnectionState({ status: 'failed', error: 'Join failed' });
      setIsJoining(false);
    }
  };

  const enableControl = () => {
    if (remoteControlRef.current && screenShareRef.current) {
      const videoEl = screenShareRef.current.getVideoElement();
      if (videoEl) {
        remoteControlRef.current.attachToContainer(videoEl);
        remoteControlRef.current.enable();
        setControlEnabled(true);
      }
    }
  };

  const disableControl = () => {
    if (remoteControlRef.current) {
      remoteControlRef.current.disable();
      remoteControlRef.current.detachFromContainer();
      setControlEnabled(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!controlEnabled || !remoteControlRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const event: RemoteEvent = { type: 'mousemove', x, y };
    peerConnectionRef.current?.sendRemoteEvent(event);
  };

  const handleClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!controlEnabled || !peerConnectionRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const event: RemoteEvent = { type: 'click', x, y, button: e.button };
    peerConnectionRef.current.sendRemoteEvent(event);
  };

  const disconnect = async () => {
    disableControl();

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (signalingClientRef.current) {
      await signalingClientRef.current.endSession();
      signalingClientRef.current.cleanup();
      signalingClientRef.current = null;
    }

    if (remoteControlRef.current) {
      remoteControlRef.current.cleanup();
      remoteControlRef.current = null;
    }

    setRemoteStream(null);
    setIsConnected(false);
    setConnectionState({ status: 'disconnected' });
    setSessionCode("");
    setError(null);
  };

  useEffect(() => {
    return () => {
      disableControl();
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (signalingClientRef.current) {
        signalingClientRef.current.cleanup();
      }
      if (remoteControlRef.current) {
        remoteControlRef.current.cleanup();
      }
    };
  }, []);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setSessionCode(value);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 py-4 sm:py-8">
        <div className="container mx-auto max-w-6xl">
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
                Technician Console
              </h1>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground" data-testid="text-page-description">
              Connect to a customer&apos;s session to provide remote support
            </p>
          </div>

          {error && (
            <Card className="mb-4 sm:mb-6 border-destructive w-full sm:max-w-md mx-auto">
              <CardContent className="p-3 sm:p-4">
                <p className="text-destructive text-xs sm:text-sm" data-testid="text-error">
                  {error}
                </p>
              </CardContent>
            </Card>
          )}

          {!isConnected ? (
            <Card className="w-full sm:max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle className="text-base sm:text-lg" data-testid="text-join-session-title">
                  Join Support Session
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm" data-testid="text-join-session-description">
                  Enter the 6-digit code from the customer
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="sessionCode" className="text-xs sm:text-sm">Session Code</Label>
                  <Input
                    id="sessionCode"
                    type="text"
                    placeholder="000 000"
                    value={sessionCode}
                    onChange={handleCodeChange}
                    maxLength={6}
                    className="text-center text-xl sm:text-2xl font-mono tracking-widest min-h-[44px]"
                    data-testid="input-session-code"
                  />
                </div>

                <Button
                  onClick={joinSession}
                  disabled={isJoining || sessionCode.length !== 6}
                  className="w-full min-h-[44px]"
                  data-testid="button-join-session"
                >
                  {isJoining ? 'Connecting...' : 'Connect to Session'}
                </Button>

                <Link href="/support/host" className="block">
                  <Button variant="outline" className="w-full min-h-[44px]" data-testid="button-go-to-host">
                    I need support
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap w-full sm:w-auto">
                  <ConnectionStatus state={connectionState} />
                  {remoteStream && (
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      <Monitor className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground" data-testid="text-receiving-stream">
                        Receiving screen
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  variant="destructive"
                  onClick={disconnect}
                  data-testid="button-disconnect"
                  className="min-h-[44px]"
                >
                  <PhoneOff className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>

              <Card>
                <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between flex-col sm:flex-row gap-2 sm:gap-4">
                    <h3 className="text-sm sm:text-base font-medium" data-testid="text-screen-title">Customer&apos;s Screen</h3>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {!controlEnabled ? (
                        <Button
                          variant="outline"
                          onClick={enableControl}
                          disabled={!remoteStream}
                          data-testid="button-enable-control"
                          className="w-full sm:w-auto min-h-[44px]"
                        >
                          <Mouse className="h-4 w-4 mr-2" />
                          Enable Control
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={disableControl}
                          data-testid="button-disable-control"
                          className="w-full sm:w-auto min-h-[44px]"
                        >
                          <Mouse className="h-4 w-4 mr-2" />
                          Disable Control
                        </Button>
                      )}
                    </div>
                  </div>

                  <ScreenShare
                    ref={screenShareRef}
                    stream={remoteStream}
                    className="w-full aspect-video"
                    onMouseMove={handleMouseMove}
                    onClick={handleClick}
                  />

                  {controlEnabled && (
                    <div className="p-3 sm:p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Keyboard className="h-4 sm:h-5 w-4 sm:w-5 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-muted-foreground" data-testid="text-control-active">
                          Remote control is active. Move your mouse and click on the video to control the customer&apos;s screen.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
