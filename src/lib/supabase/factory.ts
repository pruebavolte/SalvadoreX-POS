import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export type DatabaseTarget = 'primary' | 'secondary';

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

const configs: Record<DatabaseTarget, SupabaseConfig> = {
  primary: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  secondary: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL_2 || process.env.SUPABASE_URL_2 || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_2 || process.env.SUPABASE_ANON_KEY_2 || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY_2 || '',
  },
};

const ACTIVE_DATABASE: DatabaseTarget = 
  (process.env.NEXT_PUBLIC_ACTIVE_SUPABASE_DATABASE as DatabaseTarget) || 
  (process.env.ACTIVE_SUPABASE_DATABASE as DatabaseTarget) || 
  'primary';

const clientCache: Map<string, SupabaseClient<Database>> = new Map();
const adminCache: Map<string, SupabaseClient<Database>> = new Map();

export function getActiveDatabase(): DatabaseTarget {
  return ACTIVE_DATABASE;
}

export function getDatabaseConfig(target: DatabaseTarget = ACTIVE_DATABASE): SupabaseConfig {
  return configs[target];
}

export function isSecondaryDatabaseConfigured(): boolean {
  const config = configs.secondary;
  return Boolean(config.url && config.anonKey);
}

export function getSupabaseClient(
  target: DatabaseTarget = ACTIVE_DATABASE
): SupabaseClient<Database> {
  const cacheKey = target;
  
  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }
  
  const config = configs[target];
  
  if (!config.url || !config.anonKey) {
    if (target === 'secondary') {
      console.warn('[Supabase Factory] Secondary database not configured, falling back to primary');
      return getSupabaseClient('primary');
    }
    throw new Error(`Missing Supabase configuration for ${target} database`);
  }
  
  const client = createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
  
  clientCache.set(cacheKey, client);
  return client;
}

export function getSupabaseAdmin(
  target: DatabaseTarget = ACTIVE_DATABASE
): SupabaseClient<Database> {
  const cacheKey = target;
  
  if (adminCache.has(cacheKey)) {
    return adminCache.get(cacheKey)!;
  }
  
  const config = configs[target];
  
  if (!config.url || !config.serviceRoleKey) {
    if (target === 'secondary') {
      console.warn('[Supabase Factory] Secondary admin not configured, falling back to primary');
      return getSupabaseAdmin('primary');
    }
    throw new Error(`Missing Supabase admin configuration for ${target} database`);
  }
  
  const client = createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  adminCache.set(cacheKey, client);
  return client;
}

export function getSupabaseClientForBrand(brandDbTarget?: string | null): SupabaseClient<Database> {
  const target = (brandDbTarget as DatabaseTarget) || ACTIVE_DATABASE;
  return getSupabaseClient(target);
}

export function getSupabaseAdminForBrand(brandDbTarget?: string | null): SupabaseClient<Database> {
  const target = (brandDbTarget as DatabaseTarget) || ACTIVE_DATABASE;
  return getSupabaseAdmin(target);
}

export function getSupabaseUrl(target: DatabaseTarget = ACTIVE_DATABASE): string {
  return configs[target].url;
}

export function getSupabaseServiceKey(target: DatabaseTarget = ACTIVE_DATABASE): string {
  return configs[target].serviceRoleKey || '';
}

export { type Database };
