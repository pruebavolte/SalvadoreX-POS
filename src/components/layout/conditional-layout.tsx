"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/navigation/navbar";
import Footer from "@/components/navigation/footer";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Routes where we don't want to show navbar/footer and background grid
    const hideLayout = pathname?.startsWith("/dashboard") ||
                       pathname?.startsWith("/login") ||
                       pathname?.startsWith("/signup");

    if (hideLayout) {
        return (
            <div className="relative z-10">
                {children}
            </div>
        );
    }

    return (
        <>
            <Navbar />
            <main className="mx-auto w-full z-40 relative">
                {children}
            </main>
            <Footer />
        </>
    );
}
