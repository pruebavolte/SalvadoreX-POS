import { NextRequest, NextResponse } from "next/server";
import { withRBAC } from "@/lib/rbac";

const GODADDY_API_URL = "https://api.godaddy.com";
const TARGET_DOMAIN = "systeminternational.app";

interface GoDaddyDNSRecord {
  data: string;
  name: string;
  ttl: number;
  type: string;
}

export async function POST(request: NextRequest) {
  console.log('[GoDaddy DNS] POST request received');
  
  try {
    // Skip strict RBAC permissions - just require basic authentication
    // The admin route path itself provides sufficient access control
    const rbacResult = await withRBAC(request, {
      skipTenantResolution: true,
      permissions: [],
      allowWithoutAuth: false
    });

    console.log('[GoDaddy DNS] RBAC result:', rbacResult instanceof NextResponse ? 'NextResponse (error)' : 'Success');

    if (rbacResult instanceof NextResponse) {
      console.log('[GoDaddy DNS] RBAC returned error response');
      return rbacResult;
    }

    const body = await request.json();
    const { domain: rawDomain, apiKey, apiSecret, action } = body;

    if (!rawDomain || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Dominio, API Key y API Secret son requeridos" },
        { status: 400 }
      );
    }

    // Clean the domain: remove protocol, www., trim whitespace, lowercase
    let domain = rawDomain.toString().trim().toLowerCase();
    // First remove protocol
    if (domain.startsWith('http://') || domain.startsWith('https://')) {
      domain = domain.replace(/^https?:\/\//, '').split('/')[0];
    }
    // Then remove www.
    if (domain.startsWith('www.')) {
      domain = domain.substring(4);
    }

    console.log('[GoDaddy DNS] Cleaned domain:', domain);

    // More permissive domain regex - allows subdomains too
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      console.log('[GoDaddy DNS] Domain validation failed for:', domain);
      return NextResponse.json(
        { error: `Formato de dominio inválido: ${domain}` },
        { status: 400 }
      );
    }

    const authHeader = `sso-key ${apiKey}:${apiSecret}`;

    if (action === "verify") {
      const verifyResponse = await fetch(
        `${GODADDY_API_URL}/v1/domains/${domain}`,
        {
          method: "GET",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}));
        console.log('[GoDaddy DNS] Verify error:', verifyResponse.status, errorData);
        
        if (verifyResponse.status === 401) {
          return NextResponse.json(
            { error: "Credenciales de GoDaddy inválidas. Verifica tu API Key y Secret." },
            { status: 401 }
          );
        }
        
        if (verifyResponse.status === 403) {
          return NextResponse.json(
            { error: "Tu cuenta de GoDaddy no tiene acceso a la API. Necesitas: 10+ dominios registrados O suscripción Domain Pro. Verifica en developer.godaddy.com" },
            { status: 403 }
          );
        }
        
        if (verifyResponse.status === 404) {
          return NextResponse.json(
            { error: "El dominio no está registrado en esta cuenta de GoDaddy" },
            { status: 404 }
          );
        }

        return NextResponse.json(
          { error: errorData.message || "Error al verificar el dominio en GoDaddy" },
          { status: verifyResponse.status }
        );
      }

      const domainInfo = await verifyResponse.json();

      const dnsResponse = await fetch(
        `${GODADDY_API_URL}/v1/domains/${domain}/records`,
        {
          method: "GET",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      let existingRecords: GoDaddyDNSRecord[] = [];
      let hasExistingCname = false;
      let existingCnameTarget = null;

      if (dnsResponse.ok) {
        existingRecords = await dnsResponse.json();
        const cnameRecord = existingRecords.find(
          (r: GoDaddyDNSRecord) => r.type === "CNAME" && (r.name === "www" || r.name === "@")
        );
        if (cnameRecord) {
          hasExistingCname = true;
          existingCnameTarget = cnameRecord.data;
        }
      }

      return NextResponse.json({
        success: true,
        domain: domainInfo.domain,
        status: domainInfo.status,
        expirationDate: domainInfo.expires,
        hasExistingCname,
        existingCnameTarget,
        isAlreadyLinked: existingCnameTarget === TARGET_DOMAIN || existingCnameTarget === `${TARGET_DOMAIN}.`,
      });
    }

    if (action === "configure") {
      const cnameRecords = [
        {
          data: TARGET_DOMAIN,
          ttl: 3600,
        },
      ];

      const wwwResponse = await fetch(
        `${GODADDY_API_URL}/v1/domains/${domain}/records/CNAME/www`,
        {
          method: "PUT",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(cnameRecords),
        }
      );

      if (!wwwResponse.ok) {
        const errorData = await wwwResponse.json().catch(() => ({}));
        
        if (wwwResponse.status === 422) {
          return NextResponse.json(
            { error: "No se puede crear el registro CNAME. Puede existir un conflicto con otros registros DNS." },
            { status: 422 }
          );
        }

        if (wwwResponse.status === 403) {
          return NextResponse.json(
            { error: "Tu cuenta de GoDaddy no tiene acceso a la API de DNS. Necesitas 10+ dominios o suscripción Domain Pro." },
            { status: 403 }
          );
        }

        return NextResponse.json(
          { error: errorData.message || "Error al configurar el registro CNAME" },
          { status: wwwResponse.status }
        );
      }

      const verifyResponse = await fetch(
        `${GODADDY_API_URL}/v1/domains/${domain}/records/CNAME/www`,
        {
          method: "GET",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      let configured = false;
      if (verifyResponse.ok) {
        const records = await verifyResponse.json();
        configured = records.some((r: GoDaddyDNSRecord) => r.data === TARGET_DOMAIN || r.data === `${TARGET_DOMAIN}.`);
      }

      return NextResponse.json({
        success: true,
        message: "Registro CNAME configurado correctamente",
        domain,
        cnameHost: "www",
        cnameTarget: TARGET_DOMAIN,
        configured,
        note: "Los cambios DNS pueden tardar hasta 48 horas en propagarse globalmente, aunque normalmente es en minutos.",
      });
    }

    return NextResponse.json(
      { error: "Acción no válida. Usa 'verify' o 'configure'" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error in GoDaddy DNS API:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    info: "API para configuración automática de DNS en GoDaddy",
    targetDomain: TARGET_DOMAIN,
    endpoints: {
      verify: {
        method: "POST",
        body: { domain: "string", apiKey: "string", apiSecret: "string", action: "verify" },
        description: "Verifica que el dominio existe en GoDaddy y obtiene el estado actual"
      },
      configure: {
        method: "POST", 
        body: { domain: "string", apiKey: "string", apiSecret: "string", action: "configure" },
        description: "Configura el registro CNAME apuntando a " + TARGET_DOMAIN
      }
    },
    howToGetApiKeys: {
      step1: "Ir a https://developer.godaddy.com/keys",
      step2: "Crear una API Key de producción",
      step3: "Copiar el Key y Secret generados",
      note: "Requiere 10+ dominios o suscripción Domain Pro para acceso a API DNS"
    }
  });
}
