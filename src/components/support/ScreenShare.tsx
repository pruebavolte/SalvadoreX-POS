"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

interface ScreenShareProps {
  stream: MediaStream | null;
  className?: string;
  onMouseMove?: (e: React.MouseEvent<HTMLVideoElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLVideoElement>) => void;
  onMouseUp?: (e: React.MouseEvent<HTMLVideoElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLVideoElement>) => void;
}

export interface ScreenShareHandle {
  getVideoElement: () => HTMLVideoElement | null;
}

export const ScreenShare = forwardRef<ScreenShareHandle, ScreenShareProps>(
  ({ stream, className, onMouseMove, onMouseDown, onMouseUp, onClick }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,
    }));

    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);

    return (
      <div className={cn("relative bg-black rounded-lg overflow-hidden", className)}>
        <video
          ref={videoRef}
          data-testid="screen-share-video"
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain cursor-none"
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onClick={onClick}
        />
        {!stream && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-muted-foreground text-sm" data-testid="text-waiting-stream">
              Waiting for screen share...
            </p>
          </div>
        )}
      </div>
    );
  }
);

ScreenShare.displayName = "ScreenShare";
