"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionCodeProps {
  code: string;
  expiresAt?: string;
  className?: string;
}

export function SessionCode({ code, expiresAt, className }: SessionCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const formatCode = (code: string) => {
    return code.slice(0, 3) + " " + code.slice(3);
  };

  const formatExpiryTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    const minutes = Math.max(0, Math.floor(diff / 60000));
    return `${minutes} minutes`;
  };

  return (
    <Card className={cn("w-full sm:max-w-md", className)}>
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-base sm:text-lg" data-testid="text-session-code-title">
          Session Code
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm" data-testid="text-session-code-description">
          Share this code with your support technician
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-col sm:flex-row">
          <div
            className="text-2xl sm:text-4xl font-mono font-bold tracking-widest text-center bg-muted px-4 sm:px-6 py-2 sm:py-4 rounded-lg"
            data-testid="text-session-code"
          >
            {formatCode(code)}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            data-testid="button-copy-code"
            className="h-9 w-9 sm:h-10 sm:w-10"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        {expiresAt && (
          <p className="text-center text-xs sm:text-sm text-muted-foreground" data-testid="text-session-expiry">
            Expires in {formatExpiryTime(expiresAt)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
