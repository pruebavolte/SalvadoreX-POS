import Providers from "@/components/global/providers";
import ConditionalLayout from "@/components/layout/conditional-layout";
import BackgroundGrid from "@/components/layout/background-grid";
import ServiceWorkerRegister from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import { dmSans, inter } from "@/constants/fonts";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import { DM_Sans } from "next/font/google";
import type { Metadata } from "next";

const font = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "SalvadoreX - Punto de Venta",
    description: "Más que un Punto de Venta, el mejor socio para tu negocio.",
    manifest: "/manifest.json",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <body
                className={cn(
                    "min-h-screen bg-background text-foreground !font-heading antialiased",
                    inter.variable,
                    dmSans.variable,
                )}
            >
                <Providers>
                    <ServiceWorkerRegister />
                    <BackgroundGrid />
                    <Toaster richColors theme="light" position="top-center" />
                    <ConditionalLayout>
                        {children}
                    </ConditionalLayout>
                </Providers>
            </body>
        </html>
    );
};
