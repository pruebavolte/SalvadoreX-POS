import { supabaseAdmin } from "@/lib/supabase/server";
import type {
  Tenant,
  Role,
  Permission,
  UserTenant,
  UserTenantWithDetails,
  UserPermissions,
  TenantScope,
} from "./types";
import { SYSTEM_ROLE_IDS, PLATFORM_TENANT_ID } from "./types";

const supabase = supabaseAdmin as any;

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error) {
    console.error("Error fetching tenant:", error);
    return null;
  }

  return data;
}

export async function getTenantByDomain(hostname: string): Promise<Tenant | null> {
  const { data: domain, error: domainError } = await supabase
    .from("domains")
    .select("tenant_id")
    .eq("hostname", hostname)
    .single();

  if (domainError || !domain) {
    return null;
  }

  return getTenantById(domain.tenant_id);
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getUserTenants(userId: string): Promise<UserTenantWithDetails[]> {
  const { data, error } = await supabase
    .from("user_tenants")
    .select(`
      *,
      tenant:tenants(*),
      role:roles(*)
    `)
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching user tenants:", error);
    return [];
  }

  return data || [];
}

export async function getUserTenantMembership(
  userId: string,
  tenantId: string
): Promise<UserTenantWithDetails | null> {
  const { data, error } = await supabase
    .from("user_tenants")
    .select(`
      *,
      tenant:tenants(*),
      role:roles(*)
    `)
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function getUserPermissionsInTenant(
  userId: string,
  tenantId: string
): Promise<UserPermissions | null> {
  const membership = await getUserTenantMembership(userId, tenantId);

  if (!membership || !membership.role) {
    return null;
  }

  const { data: rolePermissions, error } = await supabase
    .from("role_permissions")
    .select(`
      permission:permissions(*)
    `)
    .eq("role_id", membership.role_id);

  if (error) {
    console.error("Error fetching role permissions:", error);
    return null;
  }

  const permissions: string[] = rolePermissions?.map((rp: any) => rp.permission.key as string) || [];
  const modulesSet = new Set<string>(rolePermissions?.map((rp: any) => rp.permission.module as string) || []);
  const modules: string[] = Array.from(modulesSet);

  return {
    userId,
    tenantId,
    role: membership.role,
    permissions,
    modules,
  };
}

export async function userHasPermission(
  userId: string,
  tenantId: string,
  permissionKey: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_has_permission", {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_permission_key: permissionKey,
  });

  if (error) {
    console.error("Error checking permission:", error);
    return false;
  }

  return data === true;
}

export async function userHasAnyPermission(
  userId: string,
  tenantId: string,
  permissionKeys: string[]
): Promise<boolean> {
  for (const key of permissionKeys) {
    if (await userHasPermission(userId, tenantId, key)) {
      return true;
    }
  }
  return false;
}

export async function userHasAllPermissions(
  userId: string,
  tenantId: string,
  permissionKeys: string[]
): Promise<boolean> {
  for (const key of permissionKeys) {
    if (!(await userHasPermission(userId, tenantId, key))) {
      return false;
    }
  }
  return true;
}

export async function getUserModules(
  userId: string,
  tenantId: string
): Promise<string[]> {
  const permissions = await getUserPermissionsInTenant(userId, tenantId);
  return permissions?.modules || [];
}

export async function getAllRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .order("scope", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }

  return data || [];
}

export async function getSystemRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("is_system", true)
    .order("scope", { ascending: true });

  if (error) {
    console.error("Error fetching system roles:", error);
    return [];
  }

  return data || [];
}

export async function getRolesByScope(scope: TenantScope): Promise<Role[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("scope", scope)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching roles by scope:", error);
    return [];
  }

  return data || [];
}

export async function getAllPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .order("module", { ascending: true })
    .order("action", { ascending: true });

  if (error) {
    console.error("Error fetching permissions:", error);
    return [];
  }

  return data || [];
}

export async function getPermissionsByModule(module: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from("permissions")
    .select("*")
    .eq("module", module)
    .order("action", { ascending: true });

  if (error) {
    console.error("Error fetching permissions by module:", error);
    return [];
  }

  return data || [];
}

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from("role_permissions")
    .select(`
      permission:permissions(*)
    `)
    .eq("role_id", roleId);

  if (error) {
    console.error("Error fetching role permissions:", error);
    return [];
  }

  return data?.map((rp: any) => rp.permission) || [];
}

export async function assignUserToTenant(
  userId: string,
  tenantId: string,
  roleId: string,
  invitedBy?: string
): Promise<UserTenant | null> {
  const { data, error } = await supabase
    .from("user_tenants")
    .upsert({
      user_id: userId,
      tenant_id: tenantId,
      role_id: roleId,
      status: "active",
      invited_by: invitedBy || null,
      invited_at: new Date().toISOString(),
      accepted_at: new Date().toISOString(),
    }, {
      onConflict: "user_id,tenant_id",
    })
    .select()
    .single();

  if (error) {
    console.error("Error assigning user to tenant:", error);
    return null;
  }

  return data;
}

export async function updateUserTenantRole(
  userId: string,
  tenantId: string,
  newRoleId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_tenants")
    .update({
      role_id: newRoleId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error updating user tenant role:", error);
    return false;
  }

  return true;
}

export async function removeUserFromTenant(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_tenants")
    .delete()
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error removing user from tenant:", error);
    return false;
  }

  return true;
}

export async function suspendUserInTenant(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("user_tenants")
    .update({
      status: "suspended",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("tenant_id", tenantId);

  if (error) {
    console.error("Error suspending user in tenant:", error);
    return false;
  }

  return true;
}

export async function createTenant(
  data: Partial<Tenant> & { name: string; slug: string; type: Tenant["type"] }
): Promise<Tenant | null> {
  const { data: tenant, error } = await supabase
    .from("tenants")
    .insert({
      ...data,
      active: data.active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating tenant:", error);
    return null;
  }

  return tenant;
}

export async function getTenantDescendants(tenantId: string): Promise<Tenant[]> {
  const { data, error } = await supabase.rpc("get_tenant_descendants", {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error("Error fetching tenant descendants:", error);
    return [];
  }

  return data || [];
}

export async function getTenantAncestors(tenantId: string): Promise<Tenant[]> {
  const { data, error } = await supabase.rpc("get_tenant_ancestors", {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error("Error fetching tenant ancestors:", error);
    return [];
  }

  return data || [];
}

export async function isPlatformOwner(userId: string): Promise<boolean> {
  const membership = await getUserTenantMembership(userId, PLATFORM_TENANT_ID);
  return membership?.role_id === SYSTEM_ROLE_IDS.PLATFORM_OWNER;
}

export async function isWhiteLabelOwner(userId: string, tenantId: string): Promise<boolean> {
  const membership = await getUserTenantMembership(userId, tenantId);
  return membership?.role_id === SYSTEM_ROLE_IDS.WHITELABEL_OWNER;
}

export async function isBusinessOwner(userId: string, tenantId: string): Promise<boolean> {
  const membership = await getUserTenantMembership(userId, tenantId);
  return membership?.role_id === SYSTEM_ROLE_IDS.BUSINESS_OWNER;
}

export function mapLegacyRoleToSystemRole(legacyRole: string): string {
  switch (legacyRole) {
    case "SUPER_ADMIN":
      return SYSTEM_ROLE_IDS.PLATFORM_OWNER;
    case "ADMIN":
      return SYSTEM_ROLE_IDS.BUSINESS_OWNER;
    case "USER":
      return SYSTEM_ROLE_IDS.EMPLOYEE;
    case "CUSTOMER":
      return SYSTEM_ROLE_IDS.EMPLOYEE;
    default:
      return SYSTEM_ROLE_IDS.EMPLOYEE;
  }
}

export async function getUserIdsInTenant(tenantId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_tenants")
    .select("user_id")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching users in tenant:", error);
    return [];
  }

  return data?.map((ut: any) => ut.user_id) || [];
}
