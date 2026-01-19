"use client";

import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider } from "@clerk/nextjs";
import { TenantBrandingProvider } from "@/contexts/tenant-branding-context";

interface Props {
    children: React.ReactNode;
}

const client = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

const Providers = ({ children }: Props) => {
    return (
        <ClerkProvider
            appearance={{
                elements: {
                    formButtonPrimary: 'bg-primary hover:bg-primary/90',
                    footerActionLink: 'text-primary hover:text-primary/90',
                }
            }}
            afterSignOutUrl="/login"
        >
            <QueryClientProvider client={client}>
                <TenantBrandingProvider>
                    {children}
                </TenantBrandingProvider>
            </QueryClientProvider>
        </ClerkProvider>
    );
};

export default Providers
