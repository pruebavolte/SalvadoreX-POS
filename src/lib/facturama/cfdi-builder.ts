import type { CFDIRequest, CFDIConcepto, CreateInvoiceInput, BillingConfig } from './types';

const DEFAULT_IVA_RATE = 0.16;
const DEFAULT_PRODUCT_CODE = '01010101';
const DEFAULT_UNIT_CODE = 'E48';

interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
  productId?: string;
}

interface Order {
  id: string;
  items: OrderItem[];
  total: number;
  currency?: string;
  notes?: string;
}

interface Sale {
  id: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
    productCode?: string;
  }[];
  subtotal: number;
  tax?: number;
  total: number;
  currency?: string;
}

export class CFDIBuilder {
  private config: BillingConfig;

  constructor(config: BillingConfig) {
    this.config = config;
  }

  buildFromOrder(order: Order, receptor: CreateInvoiceInput['receptor']): CFDIRequest {
    const items: CFDIConcepto[] = order.items.map(item => this.buildConcepto({
      description: item.productName,
      unitPrice: item.price,
      quantity: item.quantity,
    }));

    return this.buildCFDI(items, receptor);
  }

  buildFromSale(sale: Sale, receptor: CreateInvoiceInput['receptor']): CFDIRequest {
    const items: CFDIConcepto[] = sale.items.map(item => this.buildConcepto({
      description: item.name,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      productCode: item.productCode,
    }));

    return this.buildCFDI(items, receptor);
  }

  buildFromInput(input: CreateInvoiceInput): CFDIRequest {
    const items: CFDIConcepto[] = input.items.map(item => this.buildConcepto({
      description: item.description,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      productCode: item.productCode,
      unitCode: item.unitCode,
    }));

    return this.buildCFDI(items, input.receptor);
  }

  private buildConcepto(item: {
    description: string;
    unitPrice: number;
    quantity: number;
    productCode?: string;
    unitCode?: string;
    discount?: number;
    includeIVA?: boolean;
  }): CFDIConcepto {
    const subtotal = item.unitPrice * item.quantity;
    const discount = item.discount || 0;
    const baseImponible = subtotal - discount;
    const ivaAmount = baseImponible * DEFAULT_IVA_RATE;
    const total = baseImponible + ivaAmount;

    return {
      ProductCode: item.productCode || DEFAULT_PRODUCT_CODE,
      Description: item.description,
      Unit: 'Pieza',
      UnitCode: item.unitCode || DEFAULT_UNIT_CODE,
      UnitPrice: item.unitPrice,
      Quantity: item.quantity,
      Subtotal: subtotal,
      Discount: discount > 0 ? discount : undefined,
      Taxes: [
        {
          Base: baseImponible,
          Impuesto: '002',
          TipoFactor: 'Tasa',
          TasaOCuota: DEFAULT_IVA_RATE,
          Importe: ivaAmount,
        },
      ],
      Total: total,
    };
  }

  private buildCFDI(items: CFDIConcepto[], receptor: CreateInvoiceInput['receptor']): CFDIRequest {
    return {
      Currency: 'MXN',
      ExpeditionPlace: this.config.domicilioFiscalCp,
      CfdiType: 'I',
      PaymentForm: '01',
      PaymentMethod: 'PUE',
      Receiver: {
        Rfc: receptor.rfc.toUpperCase(),
        Nombre: receptor.nombre.toUpperCase(),
        DomicilioFiscalReceptor: receptor.domicilioFiscalCp,
        RegimenFiscalReceptor: receptor.regimenFiscal,
        UsoCfdi: receptor.usoCfdi,
        Email: receptor.email,
      },
      Items: items,
    };
  }

  calculateTotals(items: CFDIConcepto[]): {
    subtotal: number;
    discount: number;
    totalImpuestos: number;
    total: number;
  } {
    let subtotal = 0;
    let discount = 0;
    let totalImpuestos = 0;

    for (const item of items) {
      subtotal += item.Subtotal;
      discount += item.Discount || 0;
      if (item.Taxes) {
        for (const tax of item.Taxes) {
          totalImpuestos += tax.Importe;
        }
      }
    }

    return {
      subtotal,
      discount,
      totalImpuestos,
      total: subtotal - discount + totalImpuestos,
    };
  }

  static validateRFC(rfc: string): { valid: boolean; type?: 'fisica' | 'moral'; message?: string } {
    const cleanRFC = rfc.trim().toUpperCase();
    
    if (!cleanRFC) {
      return { valid: false, message: 'RFC es requerido' };
    }

    const rfcFisicaPattern = /^[A-ZÑ&]{4}\d{6}[A-Z\d]{3}$/;
    const rfcMoralPattern = /^[A-ZÑ&]{3}\d{6}[A-Z\d]{3}$/;
    const rfcGenericoNacional = 'XAXX010101000';
    const rfcGenericoExtranjero = 'XEXX010101000';

    if (cleanRFC === rfcGenericoNacional || cleanRFC === rfcGenericoExtranjero) {
      return { valid: true, type: 'fisica' };
    }

    if (rfcFisicaPattern.test(cleanRFC)) {
      return { valid: true, type: 'fisica' };
    }

    if (rfcMoralPattern.test(cleanRFC)) {
      return { valid: true, type: 'moral' };
    }

    return { valid: false, message: 'Formato de RFC inválido' };
  }

  static validateCFDIData(data: CreateInvoiceInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const rfcValidation = CFDIBuilder.validateRFC(data.receptor.rfc);
    if (!rfcValidation.valid) {
      errors.push(rfcValidation.message || 'RFC inválido');
    }

    if (!data.receptor.nombre || data.receptor.nombre.length < 3) {
      errors.push('Nombre del receptor debe tener al menos 3 caracteres');
    }

    if (!data.receptor.usoCfdi) {
      errors.push('Uso de CFDI es requerido');
    }

    if (!data.receptor.regimenFiscal) {
      errors.push('Régimen fiscal del receptor es requerido');
    }

    const cpPattern = /^\d{5}$/;
    if (!data.receptor.domicilioFiscalCp || !cpPattern.test(data.receptor.domicilioFiscalCp)) {
      errors.push('Código postal del domicilio fiscal debe ser de 5 dígitos');
    }

    if (!data.items || data.items.length === 0) {
      errors.push('Debe haber al menos un concepto');
    } else {
      data.items.forEach((item, index) => {
        if (!item.description) {
          errors.push(`Concepto ${index + 1}: descripción es requerida`);
        }
        if (item.unitPrice <= 0) {
          errors.push(`Concepto ${index + 1}: precio unitario debe ser mayor a 0`);
        }
        if (item.quantity <= 0) {
          errors.push(`Concepto ${index + 1}: cantidad debe ser mayor a 0`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export function createCFDIBuilder(config: BillingConfig): CFDIBuilder {
  return new CFDIBuilder(config);
}

export function getPaymentFormLabel(code: string): string {
  const forms: Record<string, string> = {
    '01': 'Efectivo',
    '02': 'Cheque nominativo',
    '03': 'Transferencia electrónica de fondos',
    '04': 'Tarjeta de crédito',
    '05': 'Monedero electrónico',
    '06': 'Dinero electrónico',
    '08': 'Vales de despensa',
    '12': 'Dación en pago',
    '13': 'Pago por subrogación',
    '14': 'Pago por consignación',
    '15': 'Condonación',
    '17': 'Compensación',
    '23': 'Novación',
    '24': 'Confusión',
    '25': 'Remisión de deuda',
    '26': 'Prescripción o caducidad',
    '27': 'A satisfacción del acreedor',
    '28': 'Tarjeta de débito',
    '29': 'Tarjeta de servicios',
    '30': 'Aplicación de anticipos',
    '31': 'Intermediario pagos',
    '99': 'Por definir',
  };
  return forms[code] || code;
}

export function getPaymentMethodLabel(code: string): string {
  const methods: Record<string, string> = {
    'PUE': 'Pago en una sola exhibición',
    'PPD': 'Pago en parcialidades o diferido',
  };
  return methods[code] || code;
}

export function getCFDITypeLabel(code: string): string {
  const types: Record<string, string> = {
    'I': 'Ingreso',
    'E': 'Egreso',
    'T': 'Traslado',
    'N': 'Nómina',
    'P': 'Pago',
  };
  return types[code] || code;
}
