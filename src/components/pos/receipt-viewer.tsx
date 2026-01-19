"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, X, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { QRCodeSVG } from "qrcode.react";

interface SaleItem {
  id: string;
  product: {
    name: string;
    sku: string;
  };
  quantity: number;
  unit_price: number;
  discount: number;
  subtotal: number;
}

interface Sale {
  id: string;
  sale_number: string;
  customer?: {
    name: string;
    phone?: string;
  };
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: SaleItem[];
}

interface ReceiptViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
}

export function ReceiptViewer({
  open,
  onOpenChange,
  saleId,
}: ReceiptViewerProps) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && saleId) {
      fetchSaleDetails();
    }
  }, [open, saleId]);

  const fetchSaleDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          customer:customers(name, phone),
          items:sale_items(
            id,
            quantity,
            unit_price,
            discount,
            subtotal,
            product:products(name, sku)
          )
        `)
        .eq("id", saleId)
        .single();

      if (error) throw error;
      setSale(data as any);
    } catch (error) {
      console.error("Error fetching sale details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a printable version
    const printWindow = window.open("", "_blank");
    if (!printWindow || !sale) return;

    const receiptHTML = generateReceiptHTML(sale);
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const generateReceiptHTML = (sale: Sale) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${sale.sale_number}</title>
          <style>
            @page { margin: 0; }
            body {
              font-family: 'Courier New', monospace;
              padding: 20px;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .header p { margin: 5px 0; font-size: 12px; }
            .info { margin-bottom: 15px; font-size: 12px; }
            .items { margin: 15px 0; }
            .item { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
            .totals { margin-top: 15px; border-top: 2px dashed #000; padding-top: 10px; }
            .total-line { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
            .total-line.grand { font-weight: bold; font-size: 16px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            hr { border: none; border-top: 2px dashed #000; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>SalvadoreX</h1>
            <p>Sistema POS</p>
            <p>RFC: XAXX010101000</p>
          </div>

          <hr>

          <div class="info">
            <p><strong>Ticket:</strong> ${sale.sale_number}</p>
            <p><strong>Fecha:</strong> ${new Date(sale.created_at).toLocaleString('es-MX')}</p>
            ${sale.customer ? `<p><strong>Cliente:</strong> ${sale.customer.name}</p>` : ''}
            <p><strong>Método de pago:</strong> ${getPaymentMethodName(sale.payment_method)}</p>
          </div>

          <hr>

          <div class="items">
            <p><strong>PRODUCTOS</strong></p>
            ${sale.items.map(item => `
              <div class="item">
                <div style="flex: 1;">
                  <div>${item.product.name}</div>
                  <div style="font-size: 10px; color: #666;">
                    ${item.quantity} x $${item.unit_price.toFixed(2)}
                    ${item.discount > 0 ? ` (-${item.discount}%)` : ''}
                  </div>
                </div>
                <div><strong>$${item.subtotal.toFixed(2)}</strong></div>
              </div>
            `).join('')}
          </div>

          <div class="totals">
            <div class="total-line">
              <span>Subtotal:</span>
              <span>$${sale.subtotal.toFixed(2)}</span>
            </div>
            ${sale.discount > 0 ? `
              <div class="total-line">
                <span>Descuento:</span>
                <span>-$${sale.discount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div class="total-line">
              <span>IVA (16%):</span>
              <span>$${sale.tax.toFixed(2)}</span>
            </div>
            <div class="total-line grand">
              <span>TOTAL:</span>
              <span>$${sale.total.toFixed(2)}</span>
            </div>
          </div>

          <hr>

          <div class="invoice-qr" style="text-align: center; margin: 15px 0; padding: 10px; background: #f5f5f5; border-radius: 8px;">
            <p style="font-size: 11px; font-weight: bold; margin-bottom: 8px;">📄 Solicita tu factura</p>
            <div style="background: white; display: inline-block; padding: 8px; border-radius: 4px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/factura/' + sale.id : '')}" alt="QR Factura" style="width: 80px; height: 80px;" />
            </div>
            <p style="font-size: 9px; color: #666; margin-top: 8px;">Escanea para solicitar tu CFDI</p>
          </div>

          <hr>

          <div class="footer">
            <p>¡Gracias por su compra!</p>
            <p>www.salvadorex.com</p>
          </div>
        </body>
      </html>
    `;
  };

  const getPaymentMethodName = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: "Efectivo",
      card: "Tarjeta",
      transfer: "Transferencia",
      credit: "Crédito",
    };
    return methods[method] || method;
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Cargando ticket...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!sale) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <p className="text-destructive">Error al cargar el ticket</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ticket de Venta</DialogTitle>
          <DialogDescription>
            Ticket #{sale.sale_number}
          </DialogDescription>
        </DialogHeader>

        {/* Receipt Content */}
        <div className="receipt-content border rounded-lg p-6 bg-white dark:bg-gray-900 font-mono">
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">SalvadoreX</h2>
            <p className="text-sm text-muted-foreground">Sistema POS</p>
            <p className="text-xs text-muted-foreground">RFC: XAXX010101000</p>
          </div>

          <Separator className="my-4" />

          {/* Sale Info */}
          <div className="space-y-2 text-sm mb-4">
            <div className="flex justify-between">
              <span className="font-semibold">Ticket:</span>
              <span>{sale.sale_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Fecha:</span>
              <span>{new Date(sale.created_at).toLocaleString('es-MX')}</span>
            </div>
            {sale.customer && (
              <div className="flex justify-between">
                <span className="font-semibold">Cliente:</span>
                <span>{sale.customer.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-semibold">Pago:</span>
              <span>{getPaymentMethodName(sale.payment_method)}</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Items */}
          <div className="mb-4">
            <p className="font-bold mb-3">PRODUCTOS</p>
            <div className="space-y-3">
              {sale.items.map((item) => (
                <div key={item.id} className="text-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x ${item.unit_price.toFixed(2)}
                        {item.discount > 0 && ` (-${item.discount}%)`}
                      </p>
                    </div>
                    <p className="font-semibold ml-2">
                      ${item.subtotal.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Totals */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Descuento:</span>
                <span>-${sale.discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>IVA (16%):</span>
              <span>${sale.tax.toFixed(2)}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL:</span>
              <span>${sale.total.toFixed(2)}</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Invoice QR Code */}
          <div className="flex flex-col items-center mb-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">Solicita tu factura</span>
            </div>
            <div className="bg-white p-2 rounded">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/factura/${sale.id}`}
                size={80}
                level="M"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 text-center">
              Escanea el código QR para solicitar tu factura electrónica
            </p>
          </div>

          <Separator className="my-4" />

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            <p>¡Gracias por su compra!</p>
            <p>www.salvadorex.com</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .receipt-content,
          .receipt-content * {
            visibility: visible;
          }
          .receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 10mm;
          }
        }
      `}</style>
    </Dialog>
  );
}
