import type {
  CFDIRequest,
  CFDIResponse,
  CSDUploadRequest,
  CSDUploadResponse,
  CancelCFDIRequest,
  CancelCFDIResponse,
  FacturamaError,
  InvoiceFile,
} from './types';

export class FacturamaClient {
  private baseUrl: string;
  private authHeader: string;
  private isConfigured: boolean;

  constructor(user?: string, password?: string) {
    // Check for explicit URL first, then environment setting, then default to sandbox
    const environment = process.env.FACTURAMA_ENVIRONMENT || 'sandbox';
    const defaultUrl = environment === 'production' 
      ? 'https://api.facturama.mx' 
      : 'https://apisandbox.facturama.mx';
    
    this.baseUrl = process.env.FACTURAMA_API_URL || defaultUrl;
    
    const apiUser = user || process.env.FACTURAMA_API_USER;
    const apiPassword = password || process.env.FACTURAMA_API_PASSWORD;
    
    if (apiUser && apiPassword) {
      this.authHeader = 'Basic ' + Buffer.from(`${apiUser}:${apiPassword}`).toString('base64');
      this.isConfigured = true;
      console.log(`[Facturama] Configured for ${environment} environment: ${this.baseUrl}`);
    } else {
      this.authHeader = '';
      this.isConfigured = false;
    }
  }

  checkConfiguration(): void {
    if (!this.isConfigured) {
      throw new Error('Facturama API credentials not configured. Please set FACTURAMA_API_USER and FACTURAMA_API_PASSWORD environment variables.');
    }
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    customHeaders?: Record<string, string>
  ): Promise<T> {
    this.checkConfiguration();

    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    console.log(`[Facturama] ${method} ${endpoint}`);

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        let errorBody: FacturamaError;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = { Message: `HTTP Error: ${response.status} ${response.statusText}` };
        }
        
        console.error('[Facturama] API Error:', errorBody);
        throw new FacturamaAPIError(
          errorBody.Message || `Error ${response.status}`,
          response.status,
          errorBody
        );
      }

      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }

      return await response.text() as unknown as T;
    } catch (error) {
      if (error instanceof FacturamaAPIError) {
        throw error;
      }
      console.error('[Facturama] Request failed:', error);
      throw new Error(`Facturama request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCFDI(cfdi: CFDIRequest): Promise<CFDIResponse> {
    return this.request<CFDIResponse>('POST', '/3/cfdis', cfdi);
  }

  async getCFDI(id: string): Promise<CFDIResponse> {
    return this.request<CFDIResponse>('GET', `/3/cfdis/${id}`);
  }

  async getCFDIByUUID(uuid: string): Promise<CFDIResponse> {
    return this.request<CFDIResponse>('GET', `/cfdi?keyword=${uuid}`);
  }

  async listCFDIs(params?: {
    status?: string;
    type?: string;
    from?: string;
    to?: string;
    rfc?: string;
  }): Promise<CFDIResponse[]> {
    let endpoint = '/3/cfdis';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.status) queryParams.append('status', params.status);
      if (params.type) queryParams.append('type', params.type);
      if (params.from) queryParams.append('from', params.from);
      if (params.to) queryParams.append('to', params.to);
      if (params.rfc) queryParams.append('rfc', params.rfc);
      const queryString = queryParams.toString();
      if (queryString) {
        endpoint += `?${queryString}`;
      }
    }
    return this.request<CFDIResponse[]>('GET', endpoint);
  }

  async cancelCFDI(cancelRequest: CancelCFDIRequest): Promise<CancelCFDIResponse> {
    return this.request<CancelCFDIResponse>('DELETE', `/3/cfdis/${cancelRequest.Id}`, {
      Motive: cancelRequest.Motive,
      UuidReplacement: cancelRequest.UuidReplacement,
    });
  }

  async getCFDIPDF(id: string): Promise<string> {
    return this.request<string>('GET', `/cfdi/pdf/issuedLite/${id}`);
  }

  async getCFDIXML(id: string): Promise<string> {
    return this.request<string>('GET', `/cfdi/xml/issuedLite/${id}`);
  }

  async getCFDIFiles(id: string): Promise<{ pdf: InvoiceFile; xml: InvoiceFile }> {
    const [pdfBase64, xmlBase64] = await Promise.all([
      this.getCFDIPDF(id),
      this.getCFDIXML(id),
    ]);

    return {
      pdf: {
        type: 'pdf',
        content: pdfBase64,
        filename: `factura_${id}.pdf`,
      },
      xml: {
        type: 'xml',
        content: xmlBase64,
        filename: `factura_${id}.xml`,
      },
    };
  }

  async uploadCSD(csdData: CSDUploadRequest): Promise<CSDUploadResponse> {
    try {
      const response = await this.request<unknown>('POST', '/api-lite/csds', csdData);
      
      return {
        Success: true,
        Message: 'CSD uploaded successfully',
        ...response as object,
      };
    } catch (error) {
      if (error instanceof FacturamaAPIError) {
        return {
          Success: false,
          Message: error.message,
        };
      }
      throw error;
    }
  }

  async getCSDInfo(): Promise<{
    CertificateNumber: string;
    Rfc: string;
    ValidFrom: string;
    ValidTo: string;
  } | null> {
    try {
      const result = await this.request<{
        CertificateNumber: string;
        Rfc: string;
        ValidFrom: string;
        ValidTo: string;
      }>('GET', '/api-lite/csds');
      return result;
    } catch {
      return null;
    }
  }

  async deleteCSD(rfc?: string): Promise<boolean> {
    try {
      const endpoint = rfc ? `/api-lite/csds/${rfc}` : '/api-lite/csds';
      await this.request<unknown>('DELETE', endpoint);
      return true;
    } catch {
      return false;
    }
  }

  async validateRFC(rfc: string): Promise<boolean> {
    const rfcPattern = /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})$/;
    return rfcPattern.test(rfc.toUpperCase());
  }

  async sendCFDIByEmail(id: string, email: string): Promise<boolean> {
    try {
      await this.request<unknown>('POST', `/cfdi/${id}/email`, { email });
      return true;
    } catch {
      return false;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      this.checkConfiguration();
      await this.getCSDInfo();
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export class FacturamaAPIError extends Error {
  statusCode: number;
  details: FacturamaError;

  constructor(message: string, statusCode: number, details: FacturamaError) {
    super(message);
    this.name = 'FacturamaAPIError';
    this.statusCode = statusCode;
    this.details = details;
  }

  toJSON() {
    return {
      error: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export function createFacturamaClient(user?: string, password?: string): FacturamaClient {
  return new FacturamaClient(user, password);
}

export const defaultClient = new FacturamaClient();
