"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Check, Globe } from "lucide-react";
import { CurrencyCode } from "@/contexts/language-context";
import { getCurrencySymbol } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencyPreferenceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCurrencySelect: (currency: CurrencyCode) => void;
  language?: string;
}

const CURRENCY_INFO: Record<CurrencyCode, { name: string; flag: string; nameEs: string; description: string; descriptionEs: string }> = {
  MXN: {
    name: "Mexican Peso",
    nameEs: "Peso Mexicano",
    flag: "🇲🇽",
    description: "Peso mexicano (MXN)",
    descriptionEs: "Peso mexicano (MXN)"
  },
  USD: {
    name: "US Dollar",
    nameEs: "Dólar Americano",
    flag: "🇺🇸",
    description: "US Dollar (USD)",
    descriptionEs: "Dólar estadounidense (USD)"
  },
  BRL: {
    name: "Brazilian Real",
    nameEs: "Real Brasileño",
    flag: "🇧🇷",
    description: "Brazilian Real (BRL)",
    descriptionEs: "Real brasileño (BRL)"
  },
  EUR: {
    name: "Euro",
    nameEs: "Euro",
    flag: "🇪🇺",
    description: "Euro (EUR)",
    descriptionEs: "Euro (EUR)"
  },
  JPY: {
    name: "Japanese Yen",
    nameEs: "Yen Japonés",
    flag: "🇯🇵",
    description: "Japanese Yen (JPY)",
    descriptionEs: "Yen japonés (JPY)"
  },
};

const AVAILABLE_CURRENCIES: CurrencyCode[] = ["MXN", "USD", "BRL", "EUR", "JPY"];

export function CurrencyPreferenceDialog({
  open,
  onOpenChange,
  onCurrencySelect,
  language = "es",
}: CurrencyPreferenceDialogProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("MXN");

  const handleConfirm = () => {
    onCurrencySelect(selectedCurrency);
    onOpenChange(false);
  };

  const title = language === "es"
    ? "Selecciona tu divisa preferida"
    : "Select your preferred currency";

  const description = language === "es"
    ? "Todos los precios se mostrarán en la divisa que elijas"
    : "All prices will be displayed in your selected currency";

  const confirmText = language === "es" ? "Confirmar" : "Confirm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Globe className="h-6 w-6 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="grid grid-cols-1 gap-3">
            {AVAILABLE_CURRENCIES.map((currency) => {
              const info = CURRENCY_INFO[currency];
              const symbol = getCurrencySymbol(currency);
              const isSelected = currency === selectedCurrency;

              return (
                <button
                  key={currency}
                  onClick={() => setSelectedCurrency(currency)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-all hover:shadow-md",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  {/* Flag */}
                  <div className="text-4xl flex-shrink-0">
                    {info.flag}
                  </div>

                  {/* Currency Info */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-lg">{symbol}</span>
                      <span className="font-semibold text-base">{currency}</span>
                      {isSelected && (
                        <Badge variant="default" className="ml-auto">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {language === "es" ? info.descriptionEs : info.description}
                    </p>
                  </div>

                  {/* Check indicator */}
                  {isSelected && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full sm:w-auto" size="lg">
            <DollarSign className="h-4 w-4 mr-2" />
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook to manage currency preference dialog state
 * Shows dialog automatically on first visit if no currency is saved
 */
export function useCurrencyPreferenceDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && !hasChecked) {
      const saved = localStorage.getItem("preferred-currency");
      if (!saved) {
        // No saved preference, show dialog
        setShowDialog(true);
      }
      setHasChecked(true);
    }
  }, [hasChecked]);

  return {
    showDialog,
    setShowDialog,
  };
}
