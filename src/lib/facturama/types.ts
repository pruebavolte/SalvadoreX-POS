export interface CatalogoUsoCFDI {
  value: string;
  label: string;
}

export const CATALOGO_USO_CFDI: CatalogoUsoCFDI[] = [
  { value: 'G01', label: 'Adquisición de mercancías' },
  { value: 'G02', label: 'Devoluciones, descuentos o bonificaciones' },
  { value: 'G03', label: 'Gastos en general' },
  { value: 'I01', label: 'Construcciones' },
  { value: 'I02', label: 'Mobiliario y equipo de oficina por inversiones' },
  { value: 'I03', label: 'Equipo de transporte' },
  { value: 'I04', label: 'Equipo de cómputo y accesorios' },
  { value: 'I05', label: 'Dados, troqueles, moldes, matrices y herramental' },
  { value: 'I06', label: 'Comunicaciones telefónicas' },
  { value: 'I07', label: 'Comunicaciones satelitales' },
  { value: 'I08', label: 'Otra maquinaria y equipo' },
  { value: 'D01', label: 'Honorarios médicos, dentales y gastos hospitalarios' },
  { value: 'D02', label: 'Gastos médicos por incapacidad o discapacidad' },
  { value: 'D03', label: 'Gastos funerales' },
  { value: 'D04', label: 'Donativos' },
  { value: 'D05', label: 'Intereses reales efectivamente pagados por créditos hipotecarios' },
  { value: 'D06', label: 'Aportaciones voluntarias al SAR' },
  { value: 'D07', label: 'Primas por seguros de gastos médicos' },
  { value: 'D08', label: 'Gastos de transportación escolar obligatoria' },
  { value: 'D09', label: 'Depósitos en cuentas para el ahorro' },
  { value: 'D10', label: 'Pagos por servicios educativos (colegiaturas)' },
  { value: 'S01', label: 'Sin efectos fiscales' },
  { value: 'CP01', label: 'Pagos' },
  { value: 'CN01', label: 'Nómina' },
];

export interface CatalogoRegimenFiscal {
  value: string;
  label: string;
  forFisica: boolean;
  forMoral: boolean;
}

export const CATALOGO_REGIMEN_FISCAL: CatalogoRegimenFiscal[] = [
  { value: '601', label: 'General de Ley Personas Morales', forFisica: false, forMoral: true },
  { value: '603', label: 'Personas Morales con Fines no Lucrativos', forFisica: false, forMoral: true },
  { value: '605', label: 'Sueldos y Salarios e Ingresos Asimilados a Salarios', forFisica: true, forMoral: false },
  { value: '606', label: 'Arrendamiento', forFisica: true, forMoral: false },
  { value: '607', label: 'Régimen de Enajenación o Adquisición de Bienes', forFisica: true, forMoral: false },
  { value: '608', label: 'Demás ingresos', forFisica: true, forMoral: false },
  { value: '610', label: 'Residentes en el Extranjero sin Establecimiento Permanente en México', forFisica: true, forMoral: true },
  { value: '611', label: 'Ingresos por Dividendos (socios y accionistas)', forFisica: true, forMoral: false },
  { value: '612', label: 'Personas Físicas con Actividades Empresariales y Profesionales', forFisica: true, forMoral: false },
  { value: '614', label: 'Ingresos por intereses', forFisica: true, forMoral: false },
  { value: '615', label: 'Régimen de los ingresos por obtención de premios', forFisica: true, forMoral: false },
  { value: '616', label: 'Sin obligaciones fiscales', forFisica: true, forMoral: true },
  { value: '620', label: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', forFisica: false, forMoral: true },
  { value: '621', label: 'Incorporación Fiscal', forFisica: true, forMoral: false },
  { value: '622', label: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', forFisica: true, forMoral: true },
  { value: '623', label: 'Opcional para Grupos de Sociedades', forFisica: false, forMoral: true },
  { value: '624', label: 'Coordinados', forFisica: false, forMoral: true },
  { value: '625', label: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', forFisica: true, forMoral: false },
  { value: '626', label: 'Régimen Simplificado de Confianza', forFisica: true, forMoral: true },
];

export interface CFDIReceptor {
  Rfc: string;
  Nombre: string;
  DomicilioFiscalReceptor: string;
  RegimenFiscalReceptor: string;
  UsoCfdi: string;
  Email?: string;
}

export interface CFDIConceptoImpuesto {
  Base: number;
  Impuesto: string;
  TipoFactor: string;
  TasaOCuota: number;
  Importe: number;
}

export interface CFDIConcepto {
  ProductCode: string;
  IdentificationNumber?: string;
  Description: string;
  Unit: string;
  UnitCode: string;
  UnitPrice: number;
  Quantity: number;
  Subtotal: number;
  Discount?: number;
  Taxes?: CFDIConceptoImpuesto[];
  Total: number;
}

export interface CFDIImpuesto {
  Total: number;
  Traslados?: {
    Base: number;
    Impuesto: string;
    TipoFactor: string;
    TasaOCuota: number;
    Importe: number;
  }[];
  Retenciones?: {
    Base: number;
    Impuesto: string;
    TipoFactor: string;
    TasaOCuota: number;
    Importe: number;
  }[];
}

export interface CFDIRequest {
  Serie?: string;
  Currency: string;
  ExpeditionPlace: string;
  PaymentConditions?: string;
  CfdiType: string;
  PaymentForm: string;
  PaymentMethod: string;
  Receiver: CFDIReceptor;
  Items: CFDIConcepto[];
  Observations?: string;
}

export interface CFDIResponse {
  Id: string;
  CfdiType: string;
  Serie: string;
  Folio: string;
  Date: string;
  CertNumber: string;
  PaymentTerms: string;
  PaymentConditions: string;
  PaymentMethod: string;
  ExpeditionPlace: string;
  ExchangeRate: number;
  Currency: string;
  Subtotal: number;
  Discount: number;
  Total: number;
  Issuer: {
    FiscalRegime: string;
    Rfc: string;
    TaxName: string;
  };
  Receiver: CFDIReceptor;
  Items: CFDIConcepto[];
  Taxes: CFDIImpuesto;
  Complement: {
    TaxStamp: {
      Uuid: string;
      Date: string;
      CfdiSign: string;
      SatCertNumber: string;
      SatSign: string;
    };
  };
  Status: string;
}

export interface CSDUploadRequest {
  Certificate: string;
  PrivateKey: string;
  PrivateKeyPassword: string;
  Rfc?: string;
}

export interface CSDUploadResponse {
  Success: boolean;
  Message?: string;
  CertificateNumber?: string;
  ValidFrom?: string;
  ValidTo?: string;
  Rfc?: string;
}

export interface FacturamaError {
  Message: string;
  ModelState?: Record<string, string[]>;
}

export interface CancelCFDIRequest {
  Id: string;
  Motive: string;
  UuidReplacement?: string;
}

export interface CancelCFDIResponse {
  Status: string;
  Message: string;
  Uuid: string;
  CancelationDate?: string;
}

export interface InvoiceFile {
  type: 'pdf' | 'xml';
  content: string;
  filename: string;
}

export interface BillingConfig {
  id: string;
  tenantId?: string;
  userId: string;
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  domicilioFiscalCp: string;
  facturamaUser?: string;
  csdUploaded: boolean;
  csdCertificateNumber?: string;
  csdValidFrom?: Date;
  csdValidUntil?: Date;
  enabled: boolean;
  allowPublicInvoicing: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  tenantId?: string;
  userId: string;
  orderId?: string;
  saleId?: string;
  receptorRfc: string;
  receptorNombre: string;
  receptorUsoCfdi: string;
  receptorRegimenFiscal: string;
  receptorDomicilioFiscalCp?: string;
  receptorEmail?: string;
  facturamaId?: string;
  uuidFiscal?: string;
  serie?: string;
  folio?: string;
  subtotal: number;
  totalImpuestos: number;
  total: number;
  moneda: string;
  status: 'pending' | 'issued' | 'cancelled' | 'error';
  pdfUrl?: string;
  xmlUrl?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceRequest {
  id: string;
  orderId: string;
  saleId?: string;
  tenantId?: string;
  requestToken: string;
  receptorRfc: string;
  receptorNombre: string;
  receptorUsoCfdi: string;
  receptorRegimenFiscal: string;
  receptorDomicilioFiscalCp: string;
  receptorEmail: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  processedAt?: Date;
  invoiceId?: string;
  errorMessage?: string;
  ipAddress?: string;
  createdAt: Date;
}

export interface CreateInvoiceInput {
  orderId?: string;
  saleId?: string;
  receptor: {
    rfc: string;
    nombre: string;
    usoCfdi: string;
    regimenFiscal: string;
    domicilioFiscalCp: string;
    email?: string;
  };
  items: {
    description: string;
    unitPrice: number;
    quantity: number;
    productCode?: string;
    unitCode?: string;
  }[];
}

export interface InvoiceRequestInput {
  orderId: string;
  saleId?: string;
  receptor: {
    rfc: string;
    nombre: string;
    usoCfdi: string;
    regimenFiscal: string;
    domicilioFiscalCp: string;
    email: string;
  };
  token: string;
}
