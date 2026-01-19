import { getTenantById, getUserTenantMembership, getTenantAncestors } from "./helpers";
import { SYSTEM_ROLE_IDS, PLATFORM_TENANT_ID } from "./types";
import type { Tenant, TenantType, TenantScope } from "./types";

export class HierarchyValidationError extends Error {
  constructor(
    message: string,
    public actorTenantId: string,
    public targetTenantId: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'HierarchyValidationError';
  }

  toJSON() {
    return {
      error: this.message,
      actorTenantId: this.actorTenantId,
      targetTenantId: this.targetTenantId,
      code: 'HIERARCHY_VIOLATION',
    };
  }
}

export async function assertTenantHierarchy(
  actorUserId: string,
  actorTenantId: string,
  targetTenantId: string
): Promise<void> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    console.log('[RBAC] RBAC is disabled, skipping hierarchy validation');
    return;
  }

  if (actorTenantId === targetTenantId) {
    console.log(`[RBAC] Hierarchy check passed: same tenant (${actorTenantId})`);
    return;
  }

  const actorMembership = await getUserTenantMembership(actorUserId, actorTenantId);
  
  if (!actorMembership) {
    console.error(`[RBAC] User ${actorUserId} is not a member of tenant ${actorTenantId}`);
    throw new HierarchyValidationError(
      'Usuario no pertenece al tenant especificado',
      actorTenantId,
      targetTenantId,
      403
    );
  }

  if (actorMembership.role_id === SYSTEM_ROLE_IDS.PLATFORM_OWNER && actorTenantId === PLATFORM_TENANT_ID) {
    console.log(`[RBAC] Hierarchy check passed: Platform Owner has global access`);
    return;
  }

  const [actorTenant, targetTenant] = await Promise.all([
    getTenantById(actorTenantId),
    getTenantById(targetTenantId),
  ]);

  if (!actorTenant || !targetTenant) {
    console.error(`[RBAC] Could not resolve tenants: actor=${actorTenantId}, target=${targetTenantId}`);
    throw new HierarchyValidationError(
      'No se pudieron resolver los tenants',
      actorTenantId,
      targetTenantId,
      400
    );
  }

  if (!actorTenant.path || !targetTenant.path) {
    console.error(`[RBAC] Tenant paths not set: actor=${actorTenant.path}, target=${targetTenant.path}`);
    throw new HierarchyValidationError(
      'Jerarquía de tenants no está configurada correctamente',
      actorTenantId,
      targetTenantId,
      500
    );
  }

  const isDescendant = targetTenant.path.startsWith(actorTenant.path + '.') || targetTenant.path === actorTenant.path;

  if (!isDescendant) {
    console.error(
      `[RBAC] Hierarchy violation: actor=${actorTenant.path} cannot manage target=${targetTenant.path}`
    );
    throw new HierarchyValidationError(
      'No tiene permisos para gestionar este tenant en la jerarquía',
      actorTenantId,
      targetTenantId,
      403
    );
  }

  console.log(
    `[RBAC] Hierarchy check passed: ${actorTenant.path} can manage ${targetTenant.path}`
  );
}

export async function assertRoleScopeMatchesTenant(
  roleScope: TenantScope,
  tenantType: TenantType,
  tenantId: string
): Promise<void> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    console.log('[RBAC] RBAC is disabled, skipping role scope validation');
    return;
  }

  const validMappings: Record<TenantScope, TenantType[]> = {
    PLATFORM: ['PLATFORM'],
    WHITE_LABEL: ['WHITE_LABEL'],
    BUSINESS: ['BUSINESS', 'LOCATION'],
    EMPLOYEE: ['BUSINESS', 'LOCATION'],
  };

  const allowedTypes = validMappings[roleScope];

  if (!allowedTypes || !allowedTypes.includes(tenantType)) {
    console.error(
      `[RBAC] Role scope mismatch: scope=${roleScope} not compatible with tenant type=${tenantType}`
    );
    throw new HierarchyValidationError(
      `El scope de rol ${roleScope} no es compatible con el tipo de tenant ${tenantType}`,
      tenantId,
      tenantId,
      400
    );
  }

  console.log(`[RBAC] Role scope validation passed: ${roleScope} is compatible with ${tenantType}`);
}

export async function canManageTenant(
  actorUserId: string,
  actorTenantId: string,
  targetTenantId: string
): Promise<boolean> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    return true;
  }

  try {
    await assertTenantHierarchy(actorUserId, actorTenantId, targetTenantId);
    return true;
  } catch (error) {
    if (error instanceof HierarchyValidationError) {
      return false;
    }
    throw error;
  }
}

export async function getTenantManagementScope(
  userId: string,
  tenantId: string
): Promise<Tenant[]> {
  const rbacEnabled = process.env.RBAC_ENABLED === 'true';
  
  if (!rbacEnabled) {
    return [];
  }

  const membership = await getUserTenantMembership(userId, tenantId);
  
  if (!membership) {
    return [];
  }

  if (membership.role_id === SYSTEM_ROLE_IDS.PLATFORM_OWNER && tenantId === PLATFORM_TENANT_ID) {
    const allTenants = await getTenantAncestors(PLATFORM_TENANT_ID);
    return allTenants;
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return [];
  }

  return [tenant];
}
