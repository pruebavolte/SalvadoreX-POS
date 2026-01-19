"use client";

import { LanguageProvider } from "@/contexts/language-context";

export default function MenuDigitalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
