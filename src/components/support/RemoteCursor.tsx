"use client";

import { cn } from "@/lib/utils";
import { MousePointer2 } from "lucide-react";

interface RemoteCursorProps {
  x: number;
  y: number;
  visible: boolean;
  label?: string;
}

export function RemoteCursor({ x, y, visible, label = "Technician" }: RemoteCursorProps) {
  if (!visible) return null;

  return (
    <div
      data-testid="remote-cursor"
      className={cn(
        "fixed pointer-events-none z-[9999] transition-all duration-75 ease-linear",
        !visible && "opacity-0"
      )}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: "translate(-2px, -2px)",
      }}
    >
      <MousePointer2 
        className="h-6 w-6 text-primary drop-shadow-md" 
        fill="hsl(var(--primary))"
        strokeWidth={1.5}
      />
      <div className="absolute left-6 top-1 px-2 py-1 bg-primary text-primary-foreground text-xs rounded-md whitespace-nowrap shadow-md">
        {label}
      </div>
    </div>
  );
}
