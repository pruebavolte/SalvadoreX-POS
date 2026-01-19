"use client";

import { usePathname } from "next/navigation";

export default function BackgroundGrid() {
    const pathname = usePathname();

    // Don't show background grid on these routes
    const hideBackground = pathname?.startsWith("/dashboard") ||
                          pathname?.startsWith("/login") ||
                          pathname?.startsWith("/signup");

    if (hideBackground) {
        return null;
    }

    return (
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)] h-[150%]" />
    );
}
