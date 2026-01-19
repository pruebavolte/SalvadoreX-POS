"use client";

import * as React from "react";
import { useTenantBranding } from "@/contexts/tenant-branding-context";
import { Loader2 } from "lucide-react";

export function BrandedHome() {
  const { branding, loading, isPlatform } = useTenantBranding();

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-lg shadow-xl p-6 sm:p-8 lg:p-10 border border-slate-200 dark:border-slate-800">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            {branding.logoUrl ? (
              <div className="flex justify-center mb-4">
                <img 
                  src={branding.logoUrl} 
                  alt={`Logo ${branding.platformName}`}
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
            <h1 
              className="text-3xl sm:text-4xl font-bold"
              style={{ color: !isPlatform ? branding.primaryColor : undefined }}
            >
              {branding.platformName}
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Punto de Venta Inteligente
            </p>
          </div>
          
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
            {isPlatform 
              ? "Más que un Punto de Venta, el mejor socio para tu negocio."
              : `Bienvenido a ${branding.platformName}. Tu plataforma de punto de venta.`
            }
          </p>
          
          <div className="flex flex-col gap-3 pt-4">
            <a
              href="/login"
              className="w-full inline-flex items-center justify-center px-6 py-3 text-base font-semibold text-white rounded-lg hover-elevate active-elevate-2 transition-all"
              style={{ backgroundColor: branding.primaryColor }}
              data-testid="link-login"
            >
              Iniciar Sesión
            </a>
            <a
              href="/signup"
              className="w-full inline-flex items-center justify-center px-6 py-3 text-base font-semibold rounded-lg hover-elevate active-elevate-2 transition-all border-2"
              style={{ 
                color: branding.primaryColor,
                borderColor: branding.primaryColor,
              }}
              data-testid="link-signup"
            >
              Crear Cuenta
            </a>
          </div>
          
          {isPlatform && (
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Para pruebas, usa:
              </p>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-left space-y-2 text-sm">
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Email:</span>{" "}
                  <span className="select-all">salvadorexoficial@gmail.com</span>
                </p>
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold">Contraseña:</span>{" "}
                  <span className="select-all">A@1A123345</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
