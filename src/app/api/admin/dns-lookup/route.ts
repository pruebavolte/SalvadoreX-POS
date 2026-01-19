import { NextRequest, NextResponse } from "next/server";
import { withRBAC } from "@/lib/rbac";

const DNS_PROVIDERS: Record<string, { name: string; icon: string; instructions: string }> = {
  "domaincontrol.com": {
    name: "GoDaddy",
    icon: "godaddy",
    instructions: "Ve a tu panel de GoDaddy → DNS → Agregar registro CNAME"
  },
  "cloudflare.com": {
    name: "Cloudflare",
    icon: "cloudflare",
    instructions: "Ve a tu panel de Cloudflare → DNS → Agregar registro CNAME"
  },
  "registrar-servers.com": {
    name: "Namecheap",
    icon: "namecheap",
    instructions: "Ve a tu panel de Namecheap → Advanced DNS → Agregar registro CNAME"
  },
  "googledomains.com": {
    name: "Google Domains",
    icon: "google",
    instructions: "Ve a tu panel de Google Domains → DNS → Agregar registro CNAME"
  },
  "google.com": {
    name: "Google Domains",
    icon: "google",
    instructions: "Ve a tu panel de Google Domains → DNS → Agregar registro CNAME"
  },
  "hostgator.com": {
    name: "HostGator",
    icon: "hostgator",
    instructions: "Ve a cPanel de HostGator → Zone Editor → Agregar registro CNAME"
  },
  "bluehost.com": {
    name: "Bluehost",
    icon: "bluehost",
    instructions: "Ve a cPanel de Bluehost → Zone Editor → Agregar registro CNAME"
  },
  "ionos.com": {
    name: "IONOS (1&1)",
    icon: "ionos",
    instructions: "Ve a tu panel de IONOS → Dominios → DNS → Agregar registro CNAME"
  },
  "akam.net": {
    name: "Akamai",
    icon: "akamai",
    instructions: "Contacta a tu administrador de Akamai para configurar el CNAME"
  },
  "awsdns": {
    name: "Amazon Route 53",
    icon: "aws",
    instructions: "Ve a AWS Console → Route 53 → Hosted Zones → Agregar registro CNAME"
  },
  "azure-dns": {
    name: "Azure DNS",
    icon: "azure",
    instructions: "Ve a Azure Portal → DNS Zones → Agregar registro CNAME"
  },
  "wix.com": {
    name: "Wix",
    icon: "wix",
    instructions: "Ve a tu panel de Wix → Dominios → DNS → Agregar registro CNAME"
  },
  "squarespace": {
    name: "Squarespace",
    icon: "squarespace",
    instructions: "Ve a tu panel de Squarespace → Dominios → DNS → Agregar registro CNAME"
  }
};

async function lookupDNS(domain: string): Promise<{
  provider: string | null;
  providerName: string | null;
  instructions: string | null;
  nameservers: string[];
  verified: boolean;
}> {
  try {
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    
    const response = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=NS`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch DNS records");
    }
    
    const data = await response.json();
    const nameservers: string[] = [];
    
    if (data.Answer) {
      for (const record of data.Answer) {
        if (record.type === 2) {
          nameservers.push(record.data.toLowerCase());
        }
      }
    }
    
    let detectedProvider: { name: string; icon: string; instructions: string } | null = null;
    
    for (const ns of nameservers) {
      for (const [pattern, provider] of Object.entries(DNS_PROVIDERS)) {
        if (ns.includes(pattern)) {
          detectedProvider = provider;
          break;
        }
      }
      if (detectedProvider) break;
    }
    
    const cnameResponse = await fetch(`https://dns.google/resolve?name=${cleanDomain}&type=CNAME`);
    const cnameData = await cnameResponse.json();
    
    let verified = false;
    if (cnameData.Answer) {
      for (const record of cnameData.Answer) {
        if (record.data && record.data.includes("salvadorex")) {
          verified = true;
          break;
        }
      }
    }
    
    return {
      provider: detectedProvider?.icon || null,
      providerName: detectedProvider?.name || "Desconocido",
      instructions: detectedProvider?.instructions || "Contacta a tu proveedor de dominio para agregar un registro CNAME",
      nameservers,
      verified
    };
  } catch (error) {
    console.error("DNS lookup error:", error);
    return {
      provider: null,
      providerName: "No detectado",
      instructions: "No se pudo detectar el proveedor DNS. Verifica que el dominio exista.",
      nameservers: [],
      verified: false
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const rbacResult = await withRBAC(request, {
      permissions: ['settings:manage', 'whitelabel:manage'],
      requireAll: false
    });

    if (rbacResult instanceof NextResponse) {
      return rbacResult;
    }

    const body = await request.json();
    const { domain } = body;

    if (!domain) {
      return NextResponse.json(
        { error: "El dominio es requerido" },
        { status: 400 }
      );
    }

    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
    
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json(
        { error: "Formato de dominio inválido" },
        { status: 400 }
      );
    }

    const dnsInfo = await lookupDNS(cleanDomain);

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      ...dnsInfo,
      cnameTarget: "app.salvadorex.com",
      cnameInstructions: `Agrega un registro CNAME con:\n- Nombre: @ o www\n- Valor: app.salvadorex.com\n- TTL: 3600 (1 hora)`
    });
  } catch (error) {
    console.error("Error in POST /api/admin/dns-lookup:", error);
    return NextResponse.json(
      { error: "Error al consultar DNS" },
      { status: 500 }
    );
  }
}
