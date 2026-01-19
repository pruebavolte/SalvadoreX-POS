"use client";

import { UserButton } from "@clerk/nextjs";
import DashboardUserSidebar from "@/components/dashboard-user/dashboard-user-sidebar";
import { UserSync } from "@/components/auth/user-sync";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { LanguageProvider } from "@/contexts/language-context";
import { LanguageSelector } from "@/components/menu-digital/language-selector";

export default function DashboardUserLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <LanguageProvider>
            <div className="min-h-screen bg-background">
                {/* User Sync - Automatically syncs user from Clerk to Supabase */}
                <UserSync />

                {/* Sidebar */}
                <DashboardUserSidebar
                    isCollapsed={isCollapsed}
                    onToggle={() => setIsCollapsed(!isCollapsed)}
                    mobileMenuOpen={mobileMenuOpen}
                    onMobileMenuChange={setMobileMenuOpen}
                />

                {/* Main Content Area */}
                <div
                    className={`transition-all duration-300 ${
                        isCollapsed ? "lg:pl-20" : "lg:pl-64"
                    }`}
                >
                    {/* Header */}
                    <header className="sticky top-0 z-40 w-full border-b bg-background">
                        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center gap-3 lg:hidden">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setMobileMenuOpen(true)}
                                    className="lg:hidden"
                                >
                                    <Menu className="h-6 w-6" />
                                </Button>
                                <img src="/images/logo_salvadorx.png" alt="Logo SalvadoreX" className="h-8"/>
                            </div>
                            <div className="flex-1"></div>
                            <div className="flex items-center gap-4">
                                <LanguageSelector />
                                <UserButton afterSignOutUrl="/" />
                            </div>
                        </div>
                    </header>

                    {/* Content */}
                    <main className="w-full">
                        {children}
                    </main>
                </div>
            </div>
        </LanguageProvider>
    );
}
