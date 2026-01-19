"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Settings, FileText } from "lucide-react";
import { BillingConfigForm } from "@/components/billing/BillingConfigForm";
import { CSDUploader } from "@/components/billing/CSDUploader";
import { InvoiceHistory } from "@/components/billing/InvoiceHistory";

export default function BillingPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleConfigSaved = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCsdUploaded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
        <div className="flex flex-col gap-1 sm:gap-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            Facturación Electrónica
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Configure su información fiscal y administre la emisión de CFDI
          </p>
        </div>

        <Tabs defaultValue="config" className="w-full">
          <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto sm:grid sm:grid-cols-3 max-w-md">
              <TabsTrigger 
                value="config" 
                className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap"
                data-testid="tab-config"
              >
                <Settings className="h-4 w-4" />
                <span>Configuración</span>
              </TabsTrigger>
              <TabsTrigger 
                value="certificates" 
                className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap"
                data-testid="tab-certificates"
              >
                <Receipt className="h-4 w-4" />
                <span>Certificados</span>
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap"
                data-testid="tab-history"
              >
                <FileText className="h-4 w-4" />
                <span>Historial</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="config" className="space-y-4 mt-4">
            <BillingConfigForm key={`config-${refreshKey}`} onConfigSaved={handleConfigSaved} />
          </TabsContent>

          <TabsContent value="certificates" className="space-y-4 mt-4">
            <CSDUploader key={`csd-${refreshKey}`} onUploadSuccess={handleCsdUploaded} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <InvoiceHistory key={`history-${refreshKey}`} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
