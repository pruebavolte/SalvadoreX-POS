"use client";

import { useVoiceOrders, VoiceStatus } from "@/hooks/use-voice-orders";
import { Product } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceOrderSystemProps {
  products: Product[];
  onAddProduct: (product: Product, quantity: number) => void;
  onRemoveProduct: (productId: string) => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onShowTotal: () => void;
  onFinishSale: () => void;
  onCancelSale: () => void;
}

export function VoiceOrderSystem({
  products,
  onAddProduct,
  onRemoveProduct,
  onUpdateQuantity,
  onShowTotal,
  onFinishSale,
  onCancelSale,
}: VoiceOrderSystemProps) {
  const {
    status,
    transcription,
    feedback,
    error,
    isSupported,
    startListening,
    stopListening,
  } = useVoiceOrders({
    products,
    onAddProduct,
    onRemoveProduct,
    onUpdateQuantity,
    onShowTotal,
    onFinishSale,
    onCancelSale,
  });

  if (!isSupported) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="text-center text-sm text-muted-foreground">
            Tu navegador no soporta órdenes por voz
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (status) {
      case "listening":
        return <Mic className="h-6 w-6 animate-pulse" />;
      case "processing":
        return <Loader2 className="h-6 w-6 animate-spin" />;
      case "speaking":
        return <Volume2 className="h-6 w-6 animate-pulse" />;
      default:
        return <MicOff className="h-6 w-6" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "listening":
        return "Escuchando...";
      case "processing":
        return "Procesando...";
      case "speaking":
        return "Hablando...";
      default:
        return "Presiona para hablar";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "listening":
        return "border-green-500 bg-green-50 dark:bg-green-950";
      case "processing":
        return "border-blue-500 bg-blue-50 dark:bg-blue-950";
      case "speaking":
        return "border-purple-500 bg-purple-50 dark:bg-purple-950";
      default:
        return "border-border bg-background";
    }
  };

  return (
    <div className="space-y-3">
      {/* Voice Button */}
      <Button
        onClick={status === "inactive" ? startListening : stopListening}
        disabled={status === "processing" || status === "speaking"}
        className={cn(
          "w-full h-20 text-lg font-semibold transition-all",
          status === "listening" && "bg-green-600 hover:bg-green-700",
          status === "processing" && "bg-blue-600 hover:bg-blue-700",
          status === "speaking" && "bg-purple-600 hover:bg-purple-700"
        )}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span>{getStatusText()}</span>
        </div>
      </Button>

      {/* Status Card */}
      {(transcription || feedback || error) && (
        <Card className={cn("transition-all", getStatusColor())}>
          <CardContent className="pt-6 space-y-3">
            {/* Transcription */}
            {transcription && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Escuché:
                </p>
                <p className="text-sm font-medium">{transcription}</p>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Respuesta:
                </p>
                <p className="text-sm">{feedback}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-destructive">Error:</p>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Voice Commands Help */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Comandos disponibles:
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• "Agrega 3 coca colas"</li>
              <li>• "Quita las sabritas"</li>
              <li>• "Cambia coca cola a 5"</li>
              <li>• "Cuánto es el total"</li>
              <li>• "Finalizar venta"</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
