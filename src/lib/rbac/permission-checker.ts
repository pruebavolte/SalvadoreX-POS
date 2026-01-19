import { NextRequest } from "next/server";
import { userHasAnyPermission, userHasAllPermissions, userHasPermission } from "./helpers";
import { extractTenantContext, TenantContext } from "./tenant-resolver";

export class PermissionDeniedError extends Error {
  constructor(
    message: string,
    public userId: string,
    public tenantId: string,
    public requiredPermissions: string[],
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'PermissionDeniedError';
  }

  toJSON() {
    return {
      error: this.message,
      userId: this.userId,
      tenantId: this.tenantId,
      requiredPermissions: this.requiredPermissions,
      code: 'PERMISSION_DENIED',
    };
  }
}

export async function assertPermission(
  request: NextRequest | any,
  permissionKeys: string[],
  requireAll: boolean = false
): Promise<void> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    console.log('[RBAC] RBAC is disabled, skipping permission check for:', permissionKeys);
    return;
  }

  const tenantContext: TenantContext | null = extractTenantContext(request);

  if (!tenantContext) {
    console.error('[RBAC] No tenant context found in request');
    throw new PermissionDeniedError(
      'No se pudo determinar el contexto del tenant',
      'unknown',
      'unknown',
      permissionKeys,
      401
    );
  }

  if (!tenantContext.userId) {
    console.error('[RBAC] No user ID found in tenant context');
    throw new PermissionDeniedError(
      'Usuario no autenticado',
      'unknown',
      tenantContext.tenantId,
      permissionKeys,
      401
    );
  }

  const { userId, tenantId } = tenantContext;

  let hasPermission: boolean;

  if (requireAll) {
    hasPermission = await userHasAllPermissions(userId, tenantId, permissionKeys);
  } else {
    hasPermission = await userHasAnyPermission(userId, tenantId, permissionKeys);
  }

  console.log(
    `[RBAC] Permission check: userId=${userId}, tenantId=${tenantId}, permissions=${permissionKeys.join(',')}, requireAll=${requireAll}, result=${hasPermission}`
  );

  if (!hasPermission) {
    const message = requireAll
      ? `Se requieren todos los permisos: ${permissionKeys.join(', ')}`
      : `Se requiere al menos uno de los siguientes permisos: ${permissionKeys.join(', ')}`;

    console.error(
      `[RBAC] Permission denied: userId=${userId}, tenantId=${tenantId}, required=${permissionKeys.join(',')}`
    );

    throw new PermissionDeniedError(
      message,
      userId,
      tenantId,
      permissionKeys
    );
  }
}

export async function checkPermission(
  userId: string,
  tenantId: string,
  permissionKey: string
): Promise<boolean> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    console.log(`[RBAC] RBAC is disabled, granting permission: ${permissionKey}`);
    return true;
  }

  return userHasPermission(userId, tenantId, permissionKey);
}

export async function checkAnyPermission(
  userId: string,
  tenantId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    console.log(`[RBAC] RBAC is disabled, granting permissions: ${permissionKeys.join(',')}`);
    return true;
  }

  return userHasAnyPermission(userId, tenantId, permissionKeys);
}

export async function checkAllPermissions(
  userId: string,
  tenantId: string,
  permissionKeys: string[]
): Promise<boolean> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    console.log(`[RBAC] RBAC is disabled, granting permissions: ${permissionKeys.join(',')}`);
    return true;
  }

  return userHasAllPermissions(userId, tenantId, permissionKeys);
}
