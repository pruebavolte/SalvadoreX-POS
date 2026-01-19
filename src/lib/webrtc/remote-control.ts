import type { RemoteEvent } from './types';
import { PeerConnectionManager } from './peer-connection';

export interface CursorPosition {
  x: number;
  y: number;
}

export type CursorUpdateHandler = (position: CursorPosition) => void;

export class RemoteControlHandler {
  private peerConnection: PeerConnectionManager;
  private containerElement: HTMLElement | null = null;
  private onCursorUpdate: CursorUpdateHandler | null = null;
  private isEnabled: boolean = false;

  constructor(peerConnection: PeerConnectionManager) {
    this.peerConnection = peerConnection;
  }

  attachToContainer(element: HTMLElement): void {
    this.containerElement = element;
    this.setupEventListeners();
  }

  detachFromContainer(): void {
    this.removeEventListeners();
    this.containerElement = null;
  }

  enable(): void {
    this.isEnabled = true;
  }

  disable(): void {
    this.isEnabled = false;
  }

  setOnCursorUpdate(handler: CursorUpdateHandler): void {
    this.onCursorUpdate = handler;
  }

  private setupEventListeners(): void {
    if (!this.containerElement) return;

    this.containerElement.addEventListener('mousemove', this.handleMouseMove);
    this.containerElement.addEventListener('mousedown', this.handleMouseDown);
    this.containerElement.addEventListener('mouseup', this.handleMouseUp);
    this.containerElement.addEventListener('click', this.handleClick);
    this.containerElement.addEventListener('wheel', this.handleWheel, { passive: false });

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  private removeEventListeners(): void {
    if (this.containerElement) {
      this.containerElement.removeEventListener('mousemove', this.handleMouseMove);
      this.containerElement.removeEventListener('mousedown', this.handleMouseDown);
      this.containerElement.removeEventListener('mouseup', this.handleMouseUp);
      this.containerElement.removeEventListener('click', this.handleClick);
      this.containerElement.removeEventListener('wheel', this.handleWheel);
    }

    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
  }

  private getRelativePosition(event: MouseEvent): { x: number; y: number } {
    if (!this.containerElement) return { x: 0, y: 0 };

    const rect = this.containerElement.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (!this.isEnabled) return;

    const { x, y } = this.getRelativePosition(event);
    
    const remoteEvent: RemoteEvent = {
      type: 'mousemove',
      x,
      y,
    };

    this.peerConnection.sendRemoteEvent(remoteEvent);
  };

  private handleMouseDown = (event: MouseEvent): void => {
    if (!this.isEnabled) return;

    const { x, y } = this.getRelativePosition(event);
    
    const remoteEvent: RemoteEvent = {
      type: 'mousedown',
      x,
      y,
      button: event.button,
    };

    this.peerConnection.sendRemoteEvent(remoteEvent);
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (!this.isEnabled) return;

    const { x, y } = this.getRelativePosition(event);
    
    const remoteEvent: RemoteEvent = {
      type: 'mouseup',
      x,
      y,
      button: event.button,
    };

    this.peerConnection.sendRemoteEvent(remoteEvent);
  };

  private handleClick = (event: MouseEvent): void => {
    if (!this.isEnabled) return;

    const { x, y } = this.getRelativePosition(event);
    
    const remoteEvent: RemoteEvent = {
      type: 'click',
      x,
      y,
      button: event.button,
    };

    this.peerConnection.sendRemoteEvent(remoteEvent);
  };

  private handleWheel = (event: WheelEvent): void => {
    if (!this.isEnabled) return;

    event.preventDefault();

    const remoteEvent: RemoteEvent = {
      type: 'scroll',
      deltaX: event.deltaX,
      deltaY: event.deltaY,
    };

    this.peerConnection.sendRemoteEvent(remoteEvent);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const remoteEvent: RemoteEvent = {
      type: 'keydown',
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    };

    this.peerConnection.sendRemoteEvent(remoteEvent);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const remoteEvent: RemoteEvent = {
      type: 'keyup',
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    };

    this.peerConnection.sendRemoteEvent(remoteEvent);
  };

  handleRemoteEvent(event: RemoteEvent): void {
    switch (event.type) {
      case 'mousemove':
        if (event.x !== undefined && event.y !== undefined && this.onCursorUpdate) {
          this.onCursorUpdate({ x: event.x, y: event.y });
        }
        break;

      case 'click':
        if (event.x !== undefined && event.y !== undefined) {
          this.simulateClick(event.x, event.y);
        }
        break;

      case 'scroll':
        if (event.deltaX !== undefined || event.deltaY !== undefined) {
          window.scrollBy({
            left: event.deltaX || 0,
            top: event.deltaY || 0,
            behavior: 'smooth',
          });
        }
        break;

      case 'keydown':
      case 'keyup':
        console.log(`[RemoteControl] Key event: ${event.type} - ${event.key}`);
        break;
    }
  }

  private simulateClick(relativeX: number, relativeY: number): void {
    const absoluteX = relativeX * window.innerWidth;
    const absoluteY = relativeY * window.innerHeight;

    const element = document.elementFromPoint(absoluteX, absoluteY);
    
    if (element && element instanceof HTMLElement) {
      console.log('[RemoteControl] Simulating click on element:', element.tagName);
      
      if (element instanceof HTMLButtonElement || 
          element instanceof HTMLAnchorElement ||
          element instanceof HTMLInputElement) {
        element.click();
      }
    }
  }

  cleanup(): void {
    this.detachFromContainer();
    this.onCursorUpdate = null;
    this.isEnabled = false;
  }
}
