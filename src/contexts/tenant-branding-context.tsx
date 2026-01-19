"use client";

import * as React from "react";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface TenantBranding {
  platformName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
}

interface TenantBrandingContextType {
  isPlatform: boolean;
  tenantId?: string;
  tenantSlug?: string;
  tenantType?: string;
  branding: TenantBranding;
  loading: boolean;
  refetch: () => Promise<void>;
}

const defaultBranding: TenantBranding = {
  platformName: "SalvadoreX",
  logoUrl: "/icons/logo.svg",
  primaryColor: "#3b82f6",
  secondaryColor: "#64748b",
};

const TenantBrandingContext = createContext<TenantBrandingContextType>({
  isPlatform: true,
  branding: defaultBranding,
  loading: true,
  refetch: async () => {},
});

export function TenantBrandingProvider({ children }: { children: ReactNode }) {
  const [isPlatform, setIsPlatform] = useState(true);
  const [tenantId, setTenantId] = useState<string>();
  const [tenantSlug, setTenantSlug] = useState<string>();
  const [tenantType, setTenantType] = useState<string>();
  const [branding, setBranding] = useState<TenantBranding>(defaultBranding);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/tenant/branding");
      const data = await response.json();

      setIsPlatform(data.isPlatform);
      setTenantId(data.tenantId);
      setTenantSlug(data.tenantSlug);
      setTenantType(data.tenantType);
      setBranding(data.branding || defaultBranding);

      if (!data.isPlatform && data.branding?.primaryColor) {
        document.documentElement.style.setProperty(
          "--tenant-primary",
          data.branding.primaryColor
        );
        document.documentElement.style.setProperty(
          "--tenant-secondary",
          data.branding.secondaryColor || "#64748b"
        );
      }
    } catch (error) {
      console.error("Error fetching tenant branding:", error);
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <TenantBrandingContext.Provider
      value={{
        isPlatform,
        tenantId,
        tenantSlug,
        tenantType,
        branding,
        loading,
        refetch: fetchBranding,
      }}
    >
      {children}
    </TenantBrandingContext.Provider>
  );
}

export function useTenantBranding() {
  return useContext(TenantBrandingContext);
}
