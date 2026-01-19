import { getSupabaseClient, getActiveDatabase, type DatabaseTarget } from './factory';
export type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = getSupabaseClient();

export function getSupabaseForDatabase(target: DatabaseTarget) {
  return getSupabaseClient(target);
}

export { getActiveDatabase, type DatabaseTarget };
