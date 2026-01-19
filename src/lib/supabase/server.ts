import { createClient } from '@supabase/supabase-js';
import type { Database } from './client';
import { 
  getSupabaseAdmin as getSupabaseAdminFromFactory, 
  getActiveDatabase, 
  getSupabaseUrl,
  getSupabaseServiceKey,
  type DatabaseTarget 
} from './factory';

function checkEnvVarsForActiveDb() {
  const activeDb = getActiveDatabase();
  const url = getSupabaseUrl(activeDb);
  const serviceKey = getSupabaseServiceKey(activeDb);
  
  if (!url || !serviceKey) {
    const dbLabel = activeDb === 'primary' ? 'primary' : 'secondary';
    const missingVars = [];
    
    if (!url) {
      missingVars.push(activeDb === 'primary' ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_URL_2');
    }
    if (!serviceKey) {
      missingVars.push(activeDb === 'primary' ? 'SUPABASE_SERVICE_ROLE_KEY' : 'SUPABASE_SERVICE_ROLE_KEY_2');
    }

    throw new Error(
      `Missing Supabase environment variables for ${dbLabel} database: ${missingVars.join(', ')}\n` +
      'Please check your .env file and restart the development server.'
    );
  }
}

let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop) {
    if (!_supabaseAdmin) {
      checkEnvVarsForActiveDb();
      _supabaseAdmin = getSupabaseAdminFromFactory();
    }
    return (_supabaseAdmin as any)[prop];
  }
});

export function getSupabaseAdminForDatabase(target: DatabaseTarget) {
  return getSupabaseAdminFromFactory(target);
}

export function getSupabaseCredentials(target: DatabaseTarget = getActiveDatabase()) {
  return {
    url: getSupabaseUrl(target),
    serviceKey: getSupabaseServiceKey(target),
  };
}

export { getActiveDatabase, type DatabaseTarget };
