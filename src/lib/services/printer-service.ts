import { PrinterConfig, ReceiptData, PrinterWidth } from "@/types/printer";

const PRINTER_STORAGE_KEY = "pos_printers";

export function getPrinters(): PrinterConfig[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(PRINTER_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function savePrinters(printers: PrinterConfig[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(printers));
}

export function getNextPrinterName(): string {
  const printers = getPrinters();
  const count = printers.length + 1;
  return `Impresora ${count}`;
}

export function addPrinter(printer: Omit<PrinterConfig, "id" | "name" | "createdAt" | "updatedAt">): PrinterConfig {
  const printers = getPrinters();
  const newPrinter: PrinterConfig = {
    ...printer,
    id: `printer_${Date.now()}`,
    name: getNextPrinterName(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  if (newPrinter.isDefault) {
    printers.forEach(p => p.isDefault = false);
  }
  
  printers.push(newPrinter);
  savePrinters(printers);
  return newPrinter;
}

export function updatePrinter(id: string, updates: Partial<PrinterConfig>): PrinterConfig | null {
  const printers = getPrinters();
  const index = printers.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  if (updates.isDefault) {
    printers.forEach(p => p.isDefault = false);
  }
  
  printers[index] = {
    ...printers[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  savePrinters(printers);
  return printers[index];
}

export function deletePrinter(id: string): boolean {
  const printers = getPrinters();
  const filtered = printers.filter(p => p.id !== id);
  if (filtered.length === printers.length) return false;
  
  for (let i = 0; i < filtered.length; i++) {
    filtered[i].name = `Impresora ${i + 1}`;
  }
  
  savePrinters(filtered);
  return true;
}

export function getDefaultPrinter(): PrinterConfig | null {
  const printers = getPrinters();
  return printers.find(p => p.isDefault && p.enabled) || printers.find(p => p.enabled) || null;
}

function generateReceiptText(data: ReceiptData, width: PrinterWidth): string {
  const lineWidth = width === "58mm" ? 32 : 48;
  const separator = "=".repeat(lineWidth);
  const thinSeparator = "-".repeat(lineWidth);
  
  const center = (text: string) => {
    const padding = Math.max(0, Math.floor((lineWidth - text.length) / 2));
    return " ".repeat(padding) + text;
  };
  
  const leftRight = (left: string, right: string) => {
    const spaces = lineWidth - left.length - right.length;
    return left + " ".repeat(Math.max(1, spaces)) + right;
  };
  
  const lines: string[] = [];
  
  lines.push(center(data.businessName.toUpperCase()));
  if (data.businessAddress) lines.push(center(data.businessAddress));
  if (data.businessPhone) lines.push(center(`Tel: ${data.businessPhone}`));
  if (data.businessRFC) lines.push(center(`RFC: ${data.businessRFC}`));
  
  lines.push(separator);
  
  lines.push(center(`TICKET #${data.ticketNumber}`));
  lines.push(center(`${data.date} ${data.time}`));
  if (data.cashierName) lines.push(`Cajero: ${data.cashierName}`);
  if (data.customerName) lines.push(`Cliente: ${data.customerName}`);
  
  lines.push(separator);
  
  for (const item of data.items) {
    const itemTotal = `$${item.total.toFixed(2)}`;
    const itemLine = `${item.quantity}x ${item.name}`;
    
    if (itemLine.length + itemTotal.length > lineWidth - 1) {
      lines.push(itemLine.substring(0, lineWidth));
      lines.push(leftRight("", itemTotal));
    } else {
      lines.push(leftRight(itemLine, itemTotal));
    }
    
    if (item.variants && item.variants.length > 0) {
      for (const variant of item.variants) {
        lines.push(`  + ${variant}`);
      }
    }
  }
  
  lines.push(thinSeparator);
  
  lines.push(leftRight("Subtotal:", `$${data.subtotal.toFixed(2)}`));
  if (data.discount > 0) {
    lines.push(leftRight("Descuento:", `-$${data.discount.toFixed(2)}`));
  }
  if (data.tax > 0) {
    lines.push(leftRight("IVA:", `$${data.tax.toFixed(2)}`));
  }
  
  lines.push(separator);
  lines.push(leftRight("TOTAL:", `$${data.total.toFixed(2)}`));
  lines.push(separator);
  
  for (const payment of data.payments) {
    lines.push(leftRight(payment.method + ":", `$${payment.amount.toFixed(2)}`));
  }
  
  if (data.change > 0) {
    lines.push(leftRight("Cambio:", `$${data.change.toFixed(2)}`));
  }
  
  lines.push("");
  lines.push(center("¡GRACIAS POR SU COMPRA!"));
  if (data.footerMessage) {
    lines.push(center(data.footerMessage));
  }
  lines.push("");
  lines.push("");
  lines.push("");
  
  return lines.join("\n");
}

function generateReceiptHTML(data: ReceiptData, width: PrinterWidth): string {
  const widthPx = width === "58mm" ? 220 : 300;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Courier New', monospace; 
      font-size: 12px; 
      width: ${widthPx}px; 
      padding: 10px;
      line-height: 1.3;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .separator { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; }
    .item { margin: 4px 0; }
    .variant { padding-left: 12px; font-size: 11px; color: #666; }
    .total-section { margin-top: 8px; }
    .grand-total { font-size: 14px; font-weight: bold; margin: 8px 0; }
    .footer { margin-top: 16px; text-align: center; font-size: 11px; }
  </style>
</head>
<body>
  <div class="center bold">${data.businessName.toUpperCase()}</div>
  ${data.businessAddress ? `<div class="center">${data.businessAddress}</div>` : ''}
  ${data.businessPhone ? `<div class="center">Tel: ${data.businessPhone}</div>` : ''}
  ${data.businessRFC ? `<div class="center">RFC: ${data.businessRFC}</div>` : ''}
  
  <div class="separator"></div>
  
  <div class="center bold">TICKET #${data.ticketNumber}</div>
  <div class="center">${data.date} ${data.time}</div>
  ${data.cashierName ? `<div>Cajero: ${data.cashierName}</div>` : ''}
  ${data.customerName ? `<div>Cliente: ${data.customerName}</div>` : ''}
  
  <div class="separator"></div>
  
  ${data.items.map(item => `
    <div class="item">
      <div class="row">
        <span>${item.quantity}x ${item.name}</span>
        <span>$${item.total.toFixed(2)}</span>
      </div>
      ${item.variants?.map(v => `<div class="variant">+ ${v}</div>`).join('') || ''}
    </div>
  `).join('')}
  
  <div class="separator"></div>
  
  <div class="total-section">
    <div class="row"><span>Subtotal:</span><span>$${data.subtotal.toFixed(2)}</span></div>
    ${data.discount > 0 ? `<div class="row"><span>Descuento:</span><span>-$${data.discount.toFixed(2)}</span></div>` : ''}
    ${data.tax > 0 ? `<div class="row"><span>IVA:</span><span>$${data.tax.toFixed(2)}</span></div>` : ''}
  </div>
  
  <div class="grand-total row">
    <span>TOTAL:</span>
    <span>$${data.total.toFixed(2)}</span>
  </div>
  
  <div class="separator"></div>
  
  ${data.payments.map(p => `
    <div class="row"><span>${p.method}:</span><span>$${p.amount.toFixed(2)}</span></div>
  `).join('')}
  
  ${data.change > 0 ? `<div class="row"><span>Cambio:</span><span>$${data.change.toFixed(2)}</span></div>` : ''}
  
  <div class="footer">
    <div>¡GRACIAS POR SU COMPRA!</div>
    ${data.footerMessage ? `<div>${data.footerMessage}</div>` : ''}
  </div>
</body>
</html>
  `.trim();
}

export async function printReceipt(data: ReceiptData, printer?: PrinterConfig): Promise<boolean> {
  const targetPrinter = printer || getDefaultPrinter();
  
  if (!targetPrinter) {
    console.log("No printer configured, using browser print");
    return printViaBrowser(data, "80mm");
  }
  
  switch (targetPrinter.connection) {
    case "usb":
      return printViaUSB(data, targetPrinter);
    case "network":
      return printViaNetwork(data, targetPrinter);
    case "bluetooth":
      return printViaBluetooth(data, targetPrinter);
    case "email":
      return printViaEmail(data, targetPrinter);
    default:
      return printViaBrowser(data, targetPrinter.width);
  }
}

async function printViaBrowser(data: ReceiptData, width: PrinterWidth): Promise<boolean> {
  const html = generateReceiptHTML(data, width);
  const printWindow = window.open("", "_blank", `width=${width === "58mm" ? 280 : 360},height=600`);
  
  if (!printWindow) {
    console.error("Could not open print window");
    return false;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  };
  
  return true;
}

async function printViaUSB(data: ReceiptData, printer: PrinterConfig): Promise<boolean> {
  if ("usb" in navigator) {
    try {
      const devices = await (navigator as any).usb.getDevices();
      let device = devices.find((d: any) => d.opened);
      
      if (!device) {
        device = await (navigator as any).usb.requestDevice({
          filters: [{ classCode: 7 }] 
        });
      }
      
      if (!device.opened) {
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
      }
      
      const receiptText = generateReceiptText(data, printer.width);
      const encoder = new TextEncoder();
      const printData = encoder.encode(receiptText + "\n\n\n\x1D\x56\x00");
      
      await device.transferOut(1, printData);
      
      return true;
    } catch (error) {
      console.error("USB printing error:", error);
      return printViaBrowser(data, printer.width);
    }
  }
  
  return printViaBrowser(data, printer.width);
}

async function printViaNetwork(data: ReceiptData, printer: PrinterConfig): Promise<boolean> {
  if (!printer.ipAddress) {
    console.error("No IP address configured for network printer");
    return printViaBrowser(data, printer.width);
  }
  
  try {
    const receiptText = generateReceiptText(data, printer.width);
    
    const response = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "network",
        ip: printer.ipAddress,
        port: printer.port || 9100,
        data: receiptText,
      }),
    });
    
    if (!response.ok) {
      throw new Error("Network print failed");
    }
    
    return true;
  } catch (error) {
    console.error("Network printing error:", error);
    return printViaBrowser(data, printer.width);
  }
}

async function printViaBluetooth(data: ReceiptData, printer: PrinterConfig): Promise<boolean> {
  if ("bluetooth" in navigator) {
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      });
      
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
      const characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");
      
      const receiptText = generateReceiptText(data, printer.width);
      const encoder = new TextEncoder();
      const printData = encoder.encode(receiptText + "\n\n\n");
      
      const chunkSize = 20;
      for (let i = 0; i < printData.length; i += chunkSize) {
        const chunk = printData.slice(i, i + chunkSize);
        await characteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      return true;
    } catch (error) {
      console.error("Bluetooth printing error:", error);
      return printViaBrowser(data, printer.width);
    }
  }
  
  return printViaBrowser(data, printer.width);
}

async function printViaEmail(data: ReceiptData, printer: PrinterConfig): Promise<boolean> {
  if (!printer.emailAddress) {
    console.error("No email address configured");
    return false;
  }
  
  try {
    const response = await fetch("/api/send-receipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: printer.emailAddress,
        receipt: data,
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error("Email sending error:", error);
    return false;
  }
}

export function testPrint(printer: PrinterConfig): Promise<boolean> {
  const testData: ReceiptData = {
    saleId: "test",
    businessName: "PRUEBA DE IMPRESIÓN",
    date: new Date().toLocaleDateString("es-MX"),
    time: new Date().toLocaleTimeString("es-MX"),
    items: [
      { name: "Producto de Prueba", quantity: 1, unitPrice: 10.00, total: 10.00 },
    ],
    subtotal: 10.00,
    discount: 0,
    tax: 0,
    total: 10.00,
    payments: [{ method: "Efectivo", amount: 10.00 }],
    change: 0,
    ticketNumber: "TEST-001",
    footerMessage: "Esta es una impresión de prueba",
  };
  
  return printReceipt(testData, printer);
}
