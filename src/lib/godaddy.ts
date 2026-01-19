/**
 * GoDaddy DNS API Service
 * Creates and manages subdomains for white-label brands
 */

import axios from "axios";

const GODADDY_API_URL = "https://api.godaddy.com";
const DOMAIN = "negocio.international";

interface DNSRecord {
  data: string;
  ttl: number;
}

interface GoDaddyError {
  code?: string;
  message?: string;
  fields?: Array<{ path: string; message: string }>;
}

export interface SubdomainResult {
  success: boolean;
  subdomain?: string;
  fullDomain?: string;
  error?: string;
  details?: string;
}

/**
 * Get authorization headers for GoDaddy API
 */
function getAuthHeaders() {
  const apiKey = process.env.GODADDY_API_KEY;
  const apiSecret = process.env.GODADDY_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("GoDaddy API credentials not configured");
  }

  return {
    "Authorization": `sso-key ${apiKey}:${apiSecret}`,
    "Content-Type": "application/json",
  };
}

/**
 * Get the target IP/hostname for the subdomain
 * This should point to your Replit deployment or load balancer
 */
export function getTargetHost(): string {
  // Use the configured CNAME target, or fallback to Replit domain
  if (process.env.REPLIT_CNAME_TARGET) {
    return process.env.REPLIT_CNAME_TARGET;
  }
  return process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG 
    ? `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`
    : "salvadorex.replit.app";
}

/**
 * Get manual DNS configuration instructions
 */
export function getDNSInstructions(subdomain: string): {
  type: string;
  name: string;
  value: string;
  ttl: number;
  fullDomain: string;
} {
  const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
  return {
    type: "CNAME",
    name: cleanSubdomain,
    value: getTargetHost(),
    ttl: 600,
    fullDomain: `${cleanSubdomain}.${DOMAIN}`,
  };
}

/**
 * Create a CNAME record for a subdomain
 */
export async function createSubdomain(subdomain: string): Promise<SubdomainResult> {
  try {
    const headers = getAuthHeaders();
    const targetHost = getTargetHost();
    
    // Validate subdomain format
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSubdomain || cleanSubdomain.length < 2) {
      return {
        success: false,
        error: "Subdominio inválido",
        details: "El subdominio debe tener al menos 2 caracteres alfanuméricos",
      };
    }

    // Create or update the CNAME record using axios
    const url = `${GODADDY_API_URL}/v1/domains/${DOMAIN}/records/CNAME/${cleanSubdomain}`;
    const records: DNSRecord[] = [{
      data: targetHost,
      ttl: 600, // 10 minutes for faster propagation during testing
    }];

    console.log(`[GoDaddy] Creating CNAME record: ${cleanSubdomain}.${DOMAIN} -> ${targetHost}`);
    console.log(`[GoDaddy] URL: ${url}`);
    console.log(`[GoDaddy] Records:`, JSON.stringify(records));

    await axios.put(url, records, { headers });

    const fullDomain = `${cleanSubdomain}.${DOMAIN}`;
    console.log(`[GoDaddy] Successfully created subdomain: ${fullDomain}`);
    
    return {
      success: true,
      subdomain: cleanSubdomain,
      fullDomain,
    };
  } catch (error) {
    console.error("[GoDaddy] Exception:", error);
    
    if (error instanceof Error && error.message.includes("credentials")) {
      return {
        success: false,
        error: "Credenciales no configuradas",
        details: "Las credenciales de GoDaddy API no están configuradas en el servidor",
      };
    }

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const errorData = error.response?.data as GoDaddyError | undefined;
      
      console.error(`[GoDaddy] API Error - Status: ${status}`, errorData);

      if (status === 401) {
        return {
          success: false,
          error: "Error de autenticación",
          details: "Las credenciales de GoDaddy API son inválidas",
        };
      }

      if (status === 403) {
        return {
          success: false,
          error: "Acceso denegado",
          details: errorData?.message || "Tu cuenta de GoDaddy no tiene acceso a la API de DNS",
        };
      }

      if (status === 404) {
        return {
          success: false,
          error: "Dominio no encontrado",
          details: `El dominio ${DOMAIN} no está en tu cuenta de GoDaddy`,
        };
      }

      if (status === 422) {
        return {
          success: false,
          error: "Datos inválidos",
          details: errorData?.message || "El subdominio contiene caracteres inválidos",
        };
      }

      return {
        success: false,
        error: "Error al crear subdominio",
        details: errorData?.message || `HTTP ${status}`,
      };
    }

    return {
      success: false,
      error: "Error de conexión",
      details: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Delete a subdomain CNAME record
 */
export async function deleteSubdomain(subdomain: string): Promise<SubdomainResult> {
  try {
    const headers = getAuthHeaders();
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const url = `${GODADDY_API_URL}/v1/domains/${DOMAIN}/records/CNAME/${cleanSubdomain}`;

    console.log(`[GoDaddy] Deleting CNAME record for: ${cleanSubdomain}.${DOMAIN}`);

    await axios.delete(url, { headers });

    console.log(`[GoDaddy] Successfully deleted subdomain: ${cleanSubdomain}`);
    return {
      success: true,
      subdomain: cleanSubdomain,
    };
  } catch (error) {
    console.error("[GoDaddy] Delete exception:", error);
    
    if (axios.isAxiosError(error)) {
      // 404 means record doesn't exist, consider it a success
      if (error.response?.status === 404) {
        return {
          success: true,
          subdomain: subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ""),
        };
      }
      
      return {
        success: false,
        error: "Error al eliminar subdominio",
        details: `HTTP ${error.response?.status}`,
      };
    }
    
    return {
      success: false,
      error: "Error de conexión",
      details: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Check if a subdomain exists
 */
export async function checkSubdomain(subdomain: string): Promise<{
  exists: boolean;
  target?: string;
  error?: string;
}> {
  try {
    const headers = getAuthHeaders();
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const url = `${GODADDY_API_URL}/v1/domains/${DOMAIN}/records/CNAME/${cleanSubdomain}`;

    const response = await axios.get(url, { headers });
    const records = response.data;

    if (records && records.length > 0) {
      return {
        exists: true,
        target: records[0].data,
      };
    }

    return { exists: false };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { exists: false };
    }
    return {
      exists: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}

/**
 * Verify DNS propagation for a subdomain
 */
export async function verifyDNSPropagation(subdomain: string): Promise<{
  propagated: boolean;
  resolvedTo?: string;
}> {
  try {
    const fullDomain = `${subdomain}.${DOMAIN}`;
    
    // Use a DNS lookup service or direct resolution
    // For now, we'll do a simple HTTP check
    const response = await fetch(`https://${fullDomain}`, {
      method: "HEAD",
      redirect: "follow",
    });

    return {
      propagated: response.ok || response.status < 500,
      resolvedTo: fullDomain,
    };
  } catch {
    // DNS not propagated yet or other network error
    return { propagated: false };
  }
}
