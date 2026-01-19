import type { Signal, ConnectionState, RemoteEvent } from './types';
import { STUN_SERVERS } from './types';
import { SignalingClient } from './signaling';

export type DataChannelMessageHandler = (event: RemoteEvent) => void;
export type StreamHandler = (stream: MediaStream) => void;
export type ConnectionStateHandler = (state: ConnectionState) => void;

export class PeerConnectionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private signalingClient: SignalingClient;
  private role: 'host' | 'viewer';
  
  private onRemoteStream: StreamHandler | null = null;
  private onDataChannelMessage: DataChannelMessageHandler | null = null;
  private onConnectionStateChange: ConnectionStateHandler | null = null;
  private localStream: MediaStream | null = null;

  constructor(signalingClient: SignalingClient, role: 'host' | 'viewer') {
    this.signalingClient = signalingClient;
    this.role = role;
  }

  async initialize(): Promise<void> {
    this.peerConnection = new RTCPeerConnection({
      iceServers: STUN_SERVERS,
    });

    this.setupPeerConnectionListeners();

    if (this.role === 'viewer') {
      this.createDataChannel();
    }
  }

  private setupPeerConnectionListeners(): void {
    if (!this.peerConnection) return;

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await this.signalingClient.sendSignal({
          from: this.role,
          type: 'ice-candidate',
          data: event.candidate.toJSON(),
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      if (this.onRemoteStream && event.streams[0]) {
        this.onRemoteStream(event.streams[0]);
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannelListeners();
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (!this.peerConnection) return;
      
      const state = this.peerConnection.connectionState;
      let connectionState: ConnectionState;

      switch (state) {
        case 'connected':
          connectionState = { status: 'connected' };
          break;
        case 'connecting':
          connectionState = { status: 'connecting' };
          break;
        case 'failed':
          connectionState = { status: 'failed', error: 'Connection failed' };
          break;
        case 'disconnected':
        case 'closed':
          connectionState = { status: 'disconnected' };
          break;
        default:
          connectionState = { status: 'connecting' };
      }

      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(connectionState);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', this.peerConnection?.iceConnectionState);
    };
  }

  private createDataChannel(): void {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('remote-control', {
      ordered: true,
    });

    this.setupDataChannelListeners();
  }

  private setupDataChannelListeners(): void {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('[WebRTC] Data channel opened');
    };

    this.dataChannel.onclose = () => {
      console.log('[WebRTC] Data channel closed');
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const remoteEvent: RemoteEvent = JSON.parse(event.data);
        if (this.onDataChannelMessage) {
          this.onDataChannelMessage(remoteEvent);
        }
      } catch (error) {
        console.error('[WebRTC] Failed to parse data channel message:', error);
      }
    };
  }

  async addLocalStream(stream: MediaStream): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    this.localStream = stream;

    stream.getTracks().forEach((track) => {
      this.peerConnection!.addTrack(track, stream);
    });
  }

  async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await this.signalingClient.sendSignal({
      from: this.role,
      type: 'offer',
      data: offer,
    });
  }

  async createAnswer(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await this.signalingClient.sendSignal({
      from: this.role,
      type: 'answer',
      data: answer,
    });
  }

  async handleSignal(signal: Signal): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      switch (signal.type) {
        case 'offer':
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal.data as RTCSessionDescriptionInit)
          );
          await this.createAnswer();
          break;

        case 'answer':
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(signal.data as RTCSessionDescriptionInit)
          );
          break;

        case 'ice-candidate':
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(signal.data as RTCIceCandidateInit)
          );
          break;
      }
    } catch (error) {
      console.error('[WebRTC] Error handling signal:', error);
      throw error;
    }
  }

  sendRemoteEvent(event: RemoteEvent): boolean {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('[WebRTC] Data channel not ready');
      return false;
    }

    try {
      this.dataChannel.send(JSON.stringify(event));
      return true;
    } catch (error) {
      console.error('[WebRTC] Failed to send remote event:', error);
      return false;
    }
  }

  setOnRemoteStream(handler: StreamHandler): void {
    this.onRemoteStream = handler;
  }

  setOnDataChannelMessage(handler: DataChannelMessageHandler): void {
    this.onDataChannelMessage = handler;
  }

  setOnConnectionStateChange(handler: ConnectionStateHandler): void {
    this.onConnectionStateChange = handler;
  }

  getConnectionState(): RTCPeerConnectionState | null {
    return this.peerConnection?.connectionState ?? null;
  }

  close(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.onRemoteStream = null;
    this.onDataChannelMessage = null;
    this.onConnectionStateChange = null;
  }
}
