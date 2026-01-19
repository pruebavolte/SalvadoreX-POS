"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Check, TrendingUp } from "lucide-react";
import { CurrencyCode } from "@/contexts/language-context";
import { getCurrencySymbol, getExchangeRates } from "@/lib/currency";
import { cn } from "@/lib/utils";

interface CurrencySelectorProps {
  selectedCurrency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  availableCurrencies?: CurrencyCode[];
  language?: string;
}

const CURRENCY_INFO: Record<CurrencyCode, { name: string; flag: string; nameEs: string }> = {
  MXN: { name: "Mexican Peso", nameEs: "Peso Mexicano", flag: "🇲🇽" },
  USD: { name: "US Dollar", nameEs: "Dólar Americano", flag: "🇺🇸" },
  BRL: { name: "Brazilian Real", nameEs: "Real Brasileño", flag: "🇧🇷" },
  EUR: { name: "Euro", nameEs: "Euro", flag: "🇪🇺" },
  JPY: { name: "Japanese Yen", nameEs: "Yen Japonés", flag: "🇯🇵" },
};

export function CurrencySelector({
  selectedCurrency,
  onCurrencyChange,
  availableCurrencies = ["MXN", "USD", "BRL", "EUR", "JPY"],
  language = "es",
}: CurrencySelectorProps) {
  const [open, setOpen] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<Record<CurrencyCode, number>>({} as Record<CurrencyCode, number>);

  const currentCurrencyInfo = CURRENCY_INFO[selectedCurrency];
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  // Cargar tipos de cambio
  useEffect(() => {
    const rates = getExchangeRates();
    setExchangeRates(rates);
  }, [open]); // Recargar cuando se abre el dropdown

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 h-9 px-3 border-2 hover:border-primary transition-all"
        >
          <DollarSign className="h-4 w-4" />
          <span className="font-bold">{currencySymbol}</span>
          <span className="hidden sm:inline font-medium">{selectedCurrency}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {currentCurrencyInfo.flag}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {language === "es" ? "Tipo de Cambio" : "Exchange Rate"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availableCurrencies.map((currency) => {
          const info = CURRENCY_INFO[currency];
          const symbol = getCurrencySymbol(currency);
          const isSelected = currency === selectedCurrency;
          const rate = exchangeRates[currency];

          // Calcular cuánto vale 1 unidad de esta divisa en MXN
          const valueInMXN = rate ? 1 / rate : 0;

          return (
            <DropdownMenuItem
              key={currency}
              onClick={() => {
                onCurrencyChange(currency);
                setOpen(false);
              }}
              className={cn(
                "cursor-pointer gap-3 py-3",
                isSelected && "bg-primary/10 font-semibold"
              )}
            >
              <span className="text-xl">{info.flag}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{symbol}</span>
                  <span className="font-medium">{currency}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "es" ? info.nameEs : info.name}
                </p>
                {rate && currency !== "MXN" && (
                  <p className="text-xs font-mono text-primary mt-1">
                    1 {currency} = ${valueInMXN.toFixed(2)} MXN
                  </p>
                )}
                {currency === "MXN" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === "es" ? "Divisa base" : "Base currency"}
                  </p>
                )}
              </div>
              {isSelected && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-2">
          <p className="text-[10px] text-muted-foreground text-center">
            {language === "es"
              ? "Tipos de cambio del Banco de México"
              : "Exchange rates from Banco de México"}
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook personalizado para manejar la divisa seleccionada con persistencia
export function useSelectedCurrency(defaultCurrency: CurrencyCode = "MXN") {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(defaultCurrency);

  // Cargar divisa desde localStorage al montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("preferred-currency");
      if (saved && ["MXN", "USD", "BRL", "EUR", "JPY"].includes(saved)) {
        setSelectedCurrency(saved as CurrencyCode);
      }
    }
  }, []);

  // Actualizar tipos de cambio al montar el componente
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Import updateExchangeRates dynamically to avoid issues
      import("@/lib/currency").then(({ updateExchangeRates }) => {
        updateExchangeRates().catch((error) => {
          console.error("Failed to update exchange rates:", error);
        });
      });
    }
  }, []);

  // Guardar divisa en localStorage cuando cambie
  const handleCurrencyChange = (currency: CurrencyCode) => {
    setSelectedCurrency(currency);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferred-currency", currency);
    }
  };

  return {
    selectedCurrency,
    setSelectedCurrency: handleCurrencyChange,
  };
}
