"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Settings,
    Store,
    Receipt,
    Bell,
    Save,
    Building2,
    Database,
    Printer,
    ChevronRight,
    Truck,
    CreditCard,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BrandSettingsForm } from "@/components/brands/brand-settings-form";

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);

    // General settings state
    const [businessName, setBusinessName] = useState("SalvadorX");
    const [businessAddress, setBusinessAddress] = useState("");
    const [businessPhone, setBusinessPhone] = useState("");
    const [businessEmail, setBusinessEmail] = useState("");
    const [taxId, setTaxId] = useState("");

    // POS settings state
    const [autoOpenCashDrawer, setAutoOpenCashDrawer] = useState(true);
    const [printReceiptAutomatically, setPrintReceiptAutomatically] = useState(false);
    const [requireCustomerForSale, setRequireCustomerForSale] = useState(false);
    const [lowStockThreshold, setLowStockThreshold] = useState("10");
    const [currency, setCurrency] = useState("USD");

    // Receipt settings state
    const [receiptHeader, setReceiptHeader] = useState("");
    const [receiptFooter, setReceiptFooter] = useState("");
    const [showTaxOnReceipt, setShowTaxOnReceipt] = useState(true);
    const [showBusinessLogoOnReceipt, setShowBusinessLogoOnReceipt] = useState(false);

    // Notification settings state
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [lowStockAlerts, setLowStockAlerts] = useState(true);
    const [dailySalesReport, setDailySalesReport] = useState(false);


    const handleSaveGeneralSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración general guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSavePOSSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración de POS guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveReceiptSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración de recibos guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveNotificationSettings = async () => {
        setLoading(true);
        try {
            // TODO: Implement API call to save settings
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success("Configuración de notificaciones guardada correctamente");
        } catch (error) {
            toast.error("Error al guardar la configuración");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 max-w-[1600px] mx-auto">
            <div className="flex flex-col gap-4 sm:gap-6 lg:gap-8">
                {/* Header */}
                <div className="flex flex-col gap-1 sm:gap-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
                        Configuración
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Administra la configuración de tu sistema de punto de venta
                    </p>
                </div>

                {/* Quick Access - Terminals, Platforms, Printers & Databases */}
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    <Link href="/dashboard/settings/databases" data-testid="link-databases-config">
                        <Card className="hover-elevate cursor-pointer transition-all border-2 border-transparent hover:border-primary/20">
                            <CardContent className="flex items-center justify-between gap-2 p-4 sm:p-6 min-h-[72px]">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                                        <Database className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base sm:text-lg truncate">Bases de Datos</h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                            Supabase Primary/Secondary
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/dashboard/settings/terminals" data-testid="link-terminals-config">
                        <Card className="hover-elevate cursor-pointer transition-all border-2 border-transparent hover:border-primary/20">
                            <CardContent className="flex items-center justify-between gap-2 p-4 sm:p-6 min-h-[72px]">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                                        <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base sm:text-lg truncate">Terminales</h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                            Mercado Pago, Clip
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/dashboard/settings/platforms" data-testid="link-platforms-config">
                        <Card className="hover-elevate cursor-pointer transition-all border-2 border-transparent hover:border-primary/20">
                            <CardContent className="flex items-center justify-between gap-2 p-4 sm:p-6 min-h-[72px]">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center flex-shrink-0">
                                        <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base sm:text-lg truncate">Plataformas</h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                            Uber Eats, Didi Food, Rappi
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </CardContent>
                        </Card>
                    </Link>
                    <Link href="/dashboard/settings/printers" data-testid="link-printers-config">
                        <Card className="hover-elevate cursor-pointer transition-all border-2 border-transparent hover:border-primary/20">
                            <CardContent className="flex items-center justify-between gap-2 p-4 sm:p-6 min-h-[72px]">
                                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                                        <Printer className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-base sm:text-lg truncate">Impresoras</h3>
                                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                                            Térmicas 58mm y 80mm
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Settings Tabs */}
                <Tabs defaultValue="brand" className="w-full">
                    <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
                        <TabsList className="inline-flex w-auto min-w-full sm:grid sm:w-full sm:grid-cols-3 lg:grid-cols-6">
                            <TabsTrigger value="brand" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap">
                                <Building2 className="h-4 w-4" />
                                <span>Marca</span>
                            </TabsTrigger>
                            <TabsTrigger value="general" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap">
                                <Store className="h-4 w-4" />
                                <span>General</span>
                            </TabsTrigger>
                            <TabsTrigger value="pos" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap">
                                <Settings className="h-4 w-4" />
                                <span>POS</span>
                            </TabsTrigger>
                            <TabsTrigger value="receipt" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap">
                                <Receipt className="h-4 w-4" />
                                <span>Recibos</span>
                            </TabsTrigger>
                            <TabsTrigger value="notifications" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap">
                                <Bell className="h-4 w-4" />
                                <span className="hidden xs:inline">Notificaciones</span>
                                <span className="xs:hidden">Notif.</span>
                            </TabsTrigger>
                            <TabsTrigger value="databases" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] text-xs sm:text-sm whitespace-nowrap">
                                <Database className="h-4 w-4" />
                                <span className="hidden xs:inline">Bases de Datos</span>
                                <span className="xs:hidden">BD</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    {/* Brand Settings */}
                    <TabsContent value="brand" className="space-y-4">
                        <BrandSettingsForm />
                    </TabsContent>

                    {/* General Settings */}
                    <TabsContent value="general" className="space-y-4">
                        <Card>
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <Store className="h-4 w-4 sm:h-5 sm:w-5" />
                                    Información del Negocio
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Configure la información básica de su negocio
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label htmlFor="businessName" className="text-sm">Nombre del Negocio</Label>
                                        <Input
                                            id="businessName"
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            placeholder="Ej: Mi Tienda"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label htmlFor="taxId" className="text-sm">RUT/NIT</Label>
                                        <Input
                                            id="taxId"
                                            value={taxId}
                                            onChange={(e) => setTaxId(e.target.value)}
                                            placeholder="Ej: 12345678-9"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 sm:space-y-2">
                                    <Label htmlFor="businessAddress" className="text-sm">Dirección</Label>
                                    <Input
                                        id="businessAddress"
                                        value={businessAddress}
                                        onChange={(e) => setBusinessAddress(e.target.value)}
                                        placeholder="Ej: Calle Principal #123"
                                        className="min-h-[44px]"
                                    />
                                </div>

                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label htmlFor="businessPhone" className="text-sm">Teléfono</Label>
                                        <Input
                                            id="businessPhone"
                                            value={businessPhone}
                                            onChange={(e) => setBusinessPhone(e.target.value)}
                                            placeholder="Ej: +503 1234-5678"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label htmlFor="businessEmail" className="text-sm">Email</Label>
                                        <Input
                                            id="businessEmail"
                                            type="email"
                                            value={businessEmail}
                                            onChange={(e) => setBusinessEmail(e.target.value)}
                                            placeholder="Ej: contacto@mitienda.com"
                                            className="min-h-[44px]"
                                        />
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveGeneralSettings} disabled={loading} className="min-h-[44px] w-full sm:w-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* POS Settings */}
                    <TabsContent value="pos" className="space-y-4">
                        <Card>
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                                    Configuración del Punto de Venta
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Configure el comportamiento del sistema POS
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="autoOpenCashDrawer" className="text-sm">
                                            Abrir cajón automáticamente
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Abre el cajón de dinero después de cada venta
                                        </p>
                                    </div>
                                    <Switch
                                        id="autoOpenCashDrawer"
                                        checked={autoOpenCashDrawer}
                                        onCheckedChange={setAutoOpenCashDrawer}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="printReceiptAutomatically" className="text-sm">
                                            Imprimir recibo automáticamente
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Imprime el recibo después de cada venta
                                        </p>
                                    </div>
                                    <Switch
                                        id="printReceiptAutomatically"
                                        checked={printReceiptAutomatically}
                                        onCheckedChange={setPrintReceiptAutomatically}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="requireCustomerForSale" className="text-sm">
                                            Requerir cliente para venta
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Obliga a seleccionar un cliente antes de completar una venta
                                        </p>
                                    </div>
                                    <Switch
                                        id="requireCustomerForSale"
                                        checked={requireCustomerForSale}
                                        onCheckedChange={setRequireCustomerForSale}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label htmlFor="lowStockThreshold" className="text-sm">
                                            Umbral de stock bajo
                                        </Label>
                                        <Input
                                            id="lowStockThreshold"
                                            type="number"
                                            value={lowStockThreshold}
                                            onChange={(e) => setLowStockThreshold(e.target.value)}
                                            min="1"
                                            className="min-h-[44px]"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Alerta cuando el stock esté por debajo de este número
                                        </p>
                                    </div>
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <Label htmlFor="currency" className="text-sm">Moneda</Label>
                                        <Select value={currency} onValueChange={setCurrency}>
                                            <SelectTrigger id="currency" className="min-h-[44px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="USD">USD ($)</SelectItem>
                                                <SelectItem value="EUR">EUR (€)</SelectItem>
                                                <SelectItem value="MXN">MXN ($)</SelectItem>
                                                <SelectItem value="CRC">CRC (₡)</SelectItem>
                                                <SelectItem value="GTQ">GTQ (Q)</SelectItem>
                                                <SelectItem value="HNL">HNL (L)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSavePOSSettings} disabled={loading} className="min-h-[44px] w-full sm:w-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Receipt Settings */}
                    <TabsContent value="receipt" className="space-y-4">
                        <Card>
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5" />
                                    Configuración de Recibos
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Personalice el formato de sus recibos
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                                <div className="space-y-1.5 sm:space-y-2">
                                    <Label htmlFor="receiptHeader" className="text-sm">Encabezado del Recibo</Label>
                                    <Input
                                        id="receiptHeader"
                                        value={receiptHeader}
                                        onChange={(e) => setReceiptHeader(e.target.value)}
                                        placeholder="Ej: ¡Gracias por su compra!"
                                        className="min-h-[44px]"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Texto que aparece en la parte superior del recibo
                                    </p>
                                </div>

                                <div className="space-y-1.5 sm:space-y-2">
                                    <Label htmlFor="receiptFooter" className="text-sm">Pie del Recibo</Label>
                                    <Input
                                        id="receiptFooter"
                                        value={receiptFooter}
                                        onChange={(e) => setReceiptFooter(e.target.value)}
                                        placeholder="Ej: Vuelva pronto"
                                        className="min-h-[44px]"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Texto que aparece en la parte inferior del recibo
                                    </p>
                                </div>

                                <Separator />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="showTaxOnReceipt" className="text-sm">
                                            Mostrar impuestos en recibo
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Muestra el desglose de impuestos en el recibo
                                        </p>
                                    </div>
                                    <Switch
                                        id="showTaxOnReceipt"
                                        checked={showTaxOnReceipt}
                                        onCheckedChange={setShowTaxOnReceipt}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="showBusinessLogoOnReceipt" className="text-sm">
                                            Mostrar logo en recibo
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Incluye el logo del negocio en el recibo impreso
                                        </p>
                                    </div>
                                    <Switch
                                        id="showBusinessLogoOnReceipt"
                                        checked={showBusinessLogoOnReceipt}
                                        onCheckedChange={setShowBusinessLogoOnReceipt}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveReceiptSettings} disabled={loading} className="min-h-[44px] w-full sm:w-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Notification Settings */}
                    <TabsContent value="notifications" className="space-y-4">
                        <Card>
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                                    Configuración de Notificaciones
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Administre cómo y cuándo recibir notificaciones
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="emailNotifications" className="text-sm">
                                            Notificaciones por email
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Recibe notificaciones importantes por correo electrónico
                                        </p>
                                    </div>
                                    <Switch
                                        id="emailNotifications"
                                        checked={emailNotifications}
                                        onCheckedChange={setEmailNotifications}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="lowStockAlerts" className="text-sm">
                                            Alertas de stock bajo
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Notifica cuando los productos alcancen el umbral de stock bajo
                                        </p>
                                    </div>
                                    <Switch
                                        id="lowStockAlerts"
                                        checked={lowStockAlerts}
                                        onCheckedChange={setLowStockAlerts}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                        <Label htmlFor="dailySalesReport" className="text-sm">
                                            Reporte diario de ventas
                                        </Label>
                                        <p className="text-xs sm:text-sm text-muted-foreground">
                                            Recibe un resumen de ventas al final de cada día
                                        </p>
                                    </div>
                                    <Switch
                                        id="dailySalesReport"
                                        checked={dailySalesReport}
                                        onCheckedChange={setDailySalesReport}
                                        className="flex-shrink-0"
                                    />
                                </div>

                                <Separator />

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveNotificationSettings} disabled={loading} className="min-h-[44px] w-full sm:w-auto">
                                        <Save className="h-4 w-4 mr-2" />
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Database Settings */}
                    <TabsContent value="databases" className="space-y-4">
                        <Card>
                            <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                                    <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                                    Bases de Datos Supabase
                                </CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Configura y cambia entre tus bases de datos de Supabase
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0 sm:pt-0">
                                <div className="flex flex-col items-center justify-center py-4 sm:py-8 text-center px-2">
                                    <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-3 sm:mb-4">
                                        <Database className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-base sm:text-lg mb-2">
                                        Gestion de Bases de Datos
                                    </h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-4 sm:mb-6">
                                        Administra tus conexiones a Supabase, cambia entre base de datos 
                                        principal y secundaria, y prueba las conexiones.
                                    </p>
                                    <Link href="/dashboard/settings/databases" className="w-full sm:w-auto">
                                        <Button size="lg" className="min-h-[44px] w-full sm:w-auto" data-testid="button-open-databases">
                                            <Database className="h-4 w-4 mr-2" />
                                            <span className="hidden sm:inline">Abrir Configuracion de Bases de Datos</span>
                                            <span className="sm:hidden">Configurar BD</span>
                                            <ChevronRight className="h-4 w-4 ml-2" />
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
