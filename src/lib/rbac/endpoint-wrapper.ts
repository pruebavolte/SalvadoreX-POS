import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { resolveTenantFromRequest, attachTenantContext } from "./tenant-resolver";
import { assertPermission, PermissionDeniedError } from "./permission-checker";
import { TenantResolutionError } from "./tenant-resolver";

export interface RBACOptions {
  permissions?: string[];
  requireAll?: boolean;
  skipTenantResolution?: boolean;
  allowWithoutAuth?: boolean;
}

export async function withRBAC(
  request: NextRequest,
  options: RBACOptions = {}
): Promise<{ userId: string; tenantId?: string } | NextResponse> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';

  try {
    const currentUser = await getAuthenticatedUser();

    if (!currentUser && !options.allowWithoutAuth) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    if (!rbacEnabled) {
      console.log('[RBAC] RBAC is disabled, allowing access');
      return { userId: currentUser?.id || 'anonymous' };
    }

    if (!options.skipTenantResolution) {
      try {
        const tenantContext = await resolveTenantFromRequest(request, currentUser?.id);
        attachTenantContext(request, tenantContext);

        if (options.permissions && options.permissions.length > 0) {
          await assertPermission(request, options.permissions, options.requireAll);
        }

        return {
          userId: currentUser?.id || '',
          tenantId: tenantContext.tenantId,
        };
      } catch (error) {
        if (error instanceof TenantResolutionError) {
          return NextResponse.json(
            { error: error.message },
            { status: error.statusCode }
          );
        }
        if (error instanceof PermissionDeniedError) {
          return NextResponse.json(
            error.toJSON(),
            { status: error.statusCode }
          );
        }
        throw error;
      }
    } else {
      if (options.permissions && options.permissions.length > 0 && currentUser) {
        console.warn('[RBAC] Permission check requested but tenant resolution skipped');
      }

      return { userId: currentUser?.id || '' };
    }
  } catch (error) {
    console.error('[RBAC] Unexpected error in withRBAC:', error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export function isRBACEnabled(): boolean {
  return process.env.RBAC_ENABLED === 'true';
}

export function logRBACDecision(
  action: string,
  userId: string,
  tenantId: string | undefined,
  permissions: string[],
  allowed: boolean,
  reason?: string
): void {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    userId,
    tenantId: tenantId || 'N/A',
    permissions,
    allowed,
    reason: reason || (allowed ? 'Permission granted' : 'Permission denied'),
  };

  console.log('[RBAC Decision]', JSON.stringify(logEntry));
}
