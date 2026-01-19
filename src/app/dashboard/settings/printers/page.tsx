"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Printer, 
  Plus, 
  Trash2, 
  Wifi, 
  Usb, 
  Bluetooth, 
  Mail,
  TestTube,
  Settings,
  Star
} from "lucide-react";
import { toast } from "sonner";
import { 
  PrinterConfig, 
  PrinterConnection, 
  PrinterWidth 
} from "@/types/printer";
import {
  getPrinters,
  addPrinter,
  updatePrinter,
  deletePrinter,
  getNextPrinterName,
  testPrint,
} from "@/lib/services/printer-service";

const connectionOptions: { value: PrinterConnection; label: string; icon: typeof Wifi }[] = [
  { value: "usb", label: "USB", icon: Usb },
  { value: "network", label: "Red", icon: Wifi },
  { value: "bluetooth", label: "Bluetooth", icon: Bluetooth },
  { value: "email", label: "Correo", icon: Mail },
];

const widthOptions: { value: PrinterWidth; label: string }[] = [
  { value: "58mm", label: "58mm (Portable)" },
  { value: "80mm", label: "80mm (Standard)" },
];

export default function PrintersSettingsPage() {
  const [printers, setPrinters] = useState<PrinterConfig[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<PrinterConfig | null>(null);
  const [formData, setFormData] = useState({
    connection: "usb" as PrinterConnection,
    width: "80mm" as PrinterWidth,
    ipAddress: "",
    port: "9100",
    macAddress: "",
    emailAddress: "",
    isDefault: false,
    enabled: true,
  });

  useEffect(() => {
    setPrinters(getPrinters());
  }, []);

  const handleAddPrinter = () => {
    setEditingPrinter(null);
    setFormData({
      connection: "usb",
      width: "80mm",
      ipAddress: "",
      port: "9100",
      macAddress: "",
      emailAddress: "",
      isDefault: printers.length === 0,
      enabled: true,
    });
    setDialogOpen(true);
  };

  const handleEditPrinter = (printer: PrinterConfig) => {
    setEditingPrinter(printer);
    setFormData({
      connection: printer.connection,
      width: printer.width,
      ipAddress: printer.ipAddress || "",
      port: printer.port?.toString() || "9100",
      macAddress: printer.macAddress || "",
      emailAddress: printer.emailAddress || "",
      isDefault: printer.isDefault,
      enabled: printer.enabled,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const printerData = {
      connection: formData.connection,
      width: formData.width,
      ipAddress: formData.connection === "network" ? formData.ipAddress : undefined,
      port: formData.connection === "network" ? parseInt(formData.port) || 9100 : undefined,
      macAddress: formData.connection === "bluetooth" ? formData.macAddress : undefined,
      emailAddress: formData.connection === "email" ? formData.emailAddress : undefined,
      isDefault: formData.isDefault,
      enabled: formData.enabled,
    };

    if (editingPrinter) {
      const updated = updatePrinter(editingPrinter.id, printerData);
      if (updated) {
        toast.success("Impresora actualizada");
      }
    } else {
      addPrinter(printerData);
      toast.success("Impresora agregada");
    }

    setPrinters(getPrinters());
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (deletePrinter(id)) {
      setPrinters(getPrinters());
      toast.success("Impresora eliminada");
    }
  };

  const handleTest = async (printer: PrinterConfig) => {
    toast.loading("Imprimiendo prueba...", { id: "test-print" });
    const success = await testPrint(printer);
    if (success) {
      toast.success("Prueba enviada correctamente", { id: "test-print" });
    } else {
      toast.error("Error al imprimir", { id: "test-print" });
    }
  };

  const handleSetDefault = (id: string) => {
    updatePrinter(id, { isDefault: true });
    setPrinters(getPrinters());
    toast.success("Impresora predeterminada actualizada");
  };

  const getConnectionIcon = (connection: PrinterConnection) => {
    const option = connectionOptions.find(o => o.value === connection);
    const Icon = option?.icon || Printer;
    return <Icon className="h-5 w-5" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración de Impresoras</h1>
          <p className="text-muted-foreground">
            Configura impresoras térmicas de 58mm y 80mm para tickets
          </p>
        </div>
        <Button onClick={handleAddPrinter} data-testid="button-add-printer">
          <Plus className="h-4 w-4 mr-2" />
          Agregar Impresora
        </Button>
      </div>

      {printers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Printer className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay impresoras configuradas</h3>
            <p className="text-muted-foreground text-center mb-4">
              Agrega una impresora térmica para imprimir tickets de venta
            </p>
            <Button onClick={handleAddPrinter}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primera Impresora
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {printers.map((printer) => (
            <Card key={printer.id} className={printer.isDefault ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {getConnectionIcon(printer.connection)}
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {printer.name}
                        {printer.isDefault && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {printer.width} • {connectionOptions.find(o => o.value === printer.connection)?.label}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={printer.enabled}
                    onCheckedChange={(enabled) => {
                      updatePrinter(printer.id, { enabled });
                      setPrinters(getPrinters());
                    }}
                    data-testid={`switch-printer-${printer.id}`}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {printer.connection === "network" && printer.ipAddress && (
                  <div className="text-sm text-muted-foreground">
                    IP: {printer.ipAddress}:{printer.port || 9100}
                  </div>
                )}
                {printer.connection === "bluetooth" && printer.macAddress && (
                  <div className="text-sm text-muted-foreground">
                    MAC: {printer.macAddress}
                  </div>
                )}
                {printer.connection === "email" && printer.emailAddress && (
                  <div className="text-sm text-muted-foreground">
                    Email: {printer.emailAddress}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleTest(printer)}
                    data-testid={`button-test-${printer.id}`}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Probar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditPrinter(printer)}
                    data-testid={`button-edit-${printer.id}`}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  {!printer.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(printer.id)}
                      data-testid={`button-default-${printer.id}`}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(printer.id)}
                    className="text-destructive hover:text-destructive"
                    data-testid={`button-delete-${printer.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingPrinter ? "Editar Impresora" : "Nueva Impresora"}
            </DialogTitle>
            <DialogDescription>
              {editingPrinter 
                ? `Editando ${editingPrinter.name}`
                : `Se asignará el nombre: ${getNextPrinterName()}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Conexión</Label>
              <Select
                value={formData.connection}
                onValueChange={(v: PrinterConnection) => setFormData({ ...formData, connection: v })}
              >
                <SelectTrigger data-testid="select-connection">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {connectionOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ancho del Papel</Label>
              <Select
                value={formData.width}
                onValueChange={(v: PrinterWidth) => setFormData({ ...formData, width: v })}
              >
                <SelectTrigger data-testid="select-width">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {widthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.connection === "network" && (
              <>
                <div className="space-y-2">
                  <Label>Dirección IP</Label>
                  <Input
                    placeholder="192.168.1.100"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    data-testid="input-ip-address"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Puerto</Label>
                  <Input
                    placeholder="9100"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    data-testid="input-port"
                  />
                </div>
              </>
            )}

            {formData.connection === "bluetooth" && (
              <div className="space-y-2">
                <Label>Dirección MAC (opcional)</Label>
                <Input
                  placeholder="XX:XX:XX:XX:XX:XX"
                  value={formData.macAddress}
                  onChange={(e) => setFormData({ ...formData, macAddress: e.target.value })}
                  data-testid="input-mac-address"
                />
              </div>
            )}

            {formData.connection === "email" && (
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input
                  type="email"
                  placeholder="tickets@miempresa.com"
                  value={formData.emailAddress}
                  onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                  data-testid="input-email"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label>Impresora Predeterminada</Label>
              <Switch
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                data-testid="switch-default"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} data-testid="button-save-printer">
              {editingPrinter ? "Guardar Cambios" : "Agregar Impresora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
