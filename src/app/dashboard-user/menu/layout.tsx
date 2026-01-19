"use client";

import { useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { UserSync } from "@/components/auth/user-sync";
import { useAuth } from "@clerk/nextjs";
import { LanguageSelector } from "@/components/menu-digital/language-selector";

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const restaurantId = searchParams.get("restaurantId");

  // Public menu view (shared link with restaurantId)
  const isPublicView = !!restaurantId;

  return (
    <div className="min-h-screen bg-background">
      {/* Only sync user if they're signed in */}
      {isSignedIn && <UserSync />}

      {/* Simple Header */}
      {/* <header className="sticky top-0 z-40 w-full border-b bg-background">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo_salvadorx.png"
              alt="Logo SalvadoreX"
              className="h-8"
            />
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector />

            {isSignedIn && <UserButton afterSignOutUrl="/" />}
          </div>
        </div>
      </header> */}

      {/* Content */}
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
