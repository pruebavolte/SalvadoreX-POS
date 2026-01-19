import { NextRequest } from "next/server";
import { getTenantByDomain, getTenantById, getTenantBySlug } from "./helpers";
import type { Tenant } from "./types";

export interface TenantContext {
  tenantId: string;
  tenant: Tenant;
  userId: string | null;
  resolvedFrom: 'domain' | 'header' | 'query_id' | 'query_slug';
}

export class TenantResolutionError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
    this.name = 'TenantResolutionError';
  }
}

export async function resolveTenantFromRequest(
  request: NextRequest,
  userId?: string | null
): Promise<TenantContext> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    console.log('[RBAC] RBAC is disabled, skipping tenant resolution');
    throw new TenantResolutionError('RBAC is disabled', 501);
  }

  let tenant: Tenant | null = null;
  let resolvedFrom: TenantContext['resolvedFrom'] = 'header';

  const hostname = request.headers.get('host') || '';
  if (hostname && !hostname.includes('localhost') && !hostname.includes('127.0.0.1')) {
    tenant = await getTenantByDomain(hostname);
    if (tenant) {
      resolvedFrom = 'domain';
      console.log(`[RBAC] Tenant resolved from domain: ${hostname} -> ${tenant.slug}`);
    }
  }

  if (!tenant) {
    const tenantIdHeader = request.headers.get('x-tenant-id');
    if (tenantIdHeader) {
      tenant = await getTenantById(tenantIdHeader);
      if (tenant) {
        resolvedFrom = 'header';
        console.log(`[RBAC] Tenant resolved from header: ${tenantIdHeader} -> ${tenant.slug}`);
      }
    }
  }

  if (!tenant) {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (tenantId) {
      tenant = await getTenantById(tenantId);
      if (tenant) {
        resolvedFrom = 'query_id';
        console.log(`[RBAC] Tenant resolved from query param tenantId: ${tenantId} -> ${tenant.slug}`);
      }
    }
  }

  if (!tenant) {
    const { searchParams } = new URL(request.url);
    const tenantSlug = searchParams.get('tenantSlug');
    if (tenantSlug) {
      tenant = await getTenantBySlug(tenantSlug);
      if (tenant) {
        resolvedFrom = 'query_slug';
        console.log(`[RBAC] Tenant resolved from query param tenantSlug: ${tenantSlug} -> ${tenant.slug}`);
      }
    }
  }

  if (!tenant) {
    console.error('[RBAC] Failed to resolve tenant from request');
    throw new TenantResolutionError(
      'No se pudo determinar el tenant. Proporcione un dominio válido, header x-tenant-id, o parámetros tenantId/tenantSlug.',
      400
    );
  }

  if (!tenant.active) {
    console.error(`[RBAC] Tenant ${tenant.slug} is inactive`);
    throw new TenantResolutionError(
      'El tenant no está activo',
      403
    );
  }

  return {
    tenantId: tenant.id,
    tenant,
    userId: userId || null,
    resolvedFrom,
  };
}

export function extractTenantContext(request: any): TenantContext | null {
  return (request as any).tenantContext || null;
}

export function attachTenantContext(request: any, context: TenantContext): void {
  (request as any).tenantContext = context;
}
