"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";

export type Language = "es" | "en" | "pt" | "de" | "ja" | "fr";
export type CurrencyCode = "MXN" | "USD" | "BRL" | "EUR" | "JPY";

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
  country: string;
  currency: CurrencyCode;
  currencySymbol: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "es", name: "Español", flag: "🇲🇽", country: "México", currency: "MXN", currencySymbol: "$" },
  { code: "en", name: "English", flag: "🇺🇸", country: "USA", currency: "USD", currencySymbol: "$" },
  { code: "pt", name: "Português", flag: "🇧🇷", country: "Brasil", currency: "BRL", currencySymbol: "R$" },
  { code: "de", name: "Deutsch", flag: "🇩🇪", country: "Alemania", currency: "EUR", currencySymbol: "€" },
  { code: "ja", name: "日本語", flag: "🇯🇵", country: "Japón", currency: "JPY", currencySymbol: "¥" },
  { code: "fr", name: "Français", flag: "🇫🇷", country: "Francia", currency: "EUR", currencySymbol: "€" },
];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  languages: LanguageOption[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("es");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Load language from localStorage on mount
    const savedLanguage = localStorage.getItem("menu-digital-language") as Language;
    if (savedLanguage && LANGUAGES.find(l => l.code === savedLanguage)) {
      setLanguageState(savedLanguage);
    }
    setIsHydrated(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      localStorage.setItem("menu-digital-language", lang);
    }
  };

  const value = useMemo(
    () => ({ language, setLanguage, languages: LANGUAGES }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
