"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConnectionState } from "@/lib/webrtc/types";

interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
}

export function ConnectionStatus({ state, className }: ConnectionStatusProps) {
  const getStatusConfig = (status: ConnectionState['status']) => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          label: 'Connected',
          variant: 'default' as const,
          className: 'bg-green-500 hover:bg-green-600',
        };
      case 'connecting':
        return {
          icon: Loader2,
          label: 'Connecting...',
          variant: 'secondary' as const,
          className: 'animate-pulse',
        };
      case 'failed':
        return {
          icon: XCircle,
          label: 'Failed',
          variant: 'destructive' as const,
          className: '',
        };
      case 'disconnected':
      default:
        return {
          icon: Wifi,
          label: 'Disconnected',
          variant: 'outline' as const,
          className: 'text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig(state.status);
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("gap-1.5", config.className, className)}
      data-testid="badge-connection-status"
    >
      <Icon className={cn("h-3.5 w-3.5", state.status === 'connecting' && "animate-spin")} />
      <span data-testid="text-connection-status">{config.label}</span>
      {state.error && (
        <span className="text-xs opacity-75" data-testid="text-connection-error">
          : {state.error}
        </span>
      )}
    </Badge>
  );
}
