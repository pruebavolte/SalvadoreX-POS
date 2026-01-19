export type PrinterConnection = "usb" | "network" | "bluetooth" | "email";
export type PrinterWidth = "58mm" | "80mm";

export interface PrinterConfig {
  id: string;
  name: string;
  connection: PrinterConnection;
  width: PrinterWidth;
  ipAddress?: string;
  port?: number;
  macAddress?: string;
  emailAddress?: string;
  isDefault: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptData {
  saleId: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessRFC?: string;
  date: string;
  time: string;
  items: ReceiptItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payments: ReceiptPayment[];
  change: number;
  cashierName?: string;
  customerName?: string;
  ticketNumber: string;
  footerMessage?: string;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  variants?: string[];
}

export interface ReceiptPayment {
  method: string;
  amount: number;
}

export interface DeliveryPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  apiKey?: string;
  storeId?: string;
  isConnected: boolean;
  webhookUrl?: string;
  enabled: boolean;
}

export const DELIVERY_PLATFORMS: Omit<DeliveryPlatform, 'apiKey' | 'storeId' | 'isConnected' | 'webhookUrl' | 'enabled'>[] = [
  { id: "uber_eats", name: "Uber Eats", icon: "uber", color: "#06C167" },
  { id: "didi_food", name: "Didi Food", icon: "didi", color: "#FF6B00" },
  { id: "rappi", name: "Rappi", icon: "rappi", color: "#FF441F" },
  { id: "sin_delantal", name: "Sin Delantal", icon: "sinDelantal", color: "#E31837" },
  { id: "pedidos_ya", name: "Pedidos Ya", icon: "pedidosYa", color: "#D72B61" },
  { id: "cornershop", name: "Cornershop", icon: "cornershop", color: "#FF5A5F" },
];

// Payment Terminal Types
export type TerminalProvider = "mercadopago" | "clip";
export type TerminalStatus = "disconnected" | "connecting" | "connected" | "error";
export type PaymentIntentStatus = "pending" | "processing" | "approved" | "rejected" | "cancelled" | "error";

export interface PaymentTerminal {
  id: string;
  provider: TerminalProvider;
  name: string;
  deviceId: string;
  accessToken?: string;
  isConnected: boolean;
  isDefault: boolean;
  enabled: boolean;
  lastConnected?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntent {
  id: string;
  terminalId: string;
  amount: number;
  externalReference?: string;
  status: PaymentIntentStatus;
  paymentId?: string;
  authorizationCode?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TerminalDevice {
  id: string;
  posId?: string;
  storeId?: string;
  externalPosId?: string;
  operatingMode?: string;
  model?: string;
}

export interface TerminalProviderInfo {
  id: TerminalProvider;
  name: string;
  description: string;
  color: string;
  logo: string;
  apiDocsUrl: string;
  features: string[];
}

export const TERMINAL_PROVIDERS: TerminalProviderInfo[] = [
  {
    id: "mercadopago",
    name: "Mercado Pago Point",
    description: "Terminal inteligente de Mercado Pago para cobros con tarjeta",
    color: "#009EE3",
    logo: "mercadopago",
    apiDocsUrl: "https://www.mercadopago.com.mx/developers/es/docs/mp-point",
    features: [
      "Cobro automático desde POS",
      "Soporte para crédito y débito",
      "Pagos sin contacto (NFC)",
      "Impresión de comprobante en terminal",
    ],
  },
  {
    id: "clip",
    name: "Clip",
    description: "La terminal de pagos más usada en México",
    color: "#FF6B00",
    logo: "clip",
    apiDocsUrl: "https://developer.clip.mx/",
    features: [
      "Integración con punto de venta",
      "Todos los métodos de pago",
      "Procesamiento en tiempo real",
      "Depósitos rápidos",
    ],
  },
];

// User preference for terminal linking prompt
export type TerminalLinkPreference = "ask" | "never_ask" | null;
