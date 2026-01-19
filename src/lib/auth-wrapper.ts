import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin, getActiveDatabase } from "@/lib/supabase/factory";
import { getUserByClerkId } from "@/lib/supabase/users";
import type { Database } from "@/lib/supabase/client";

type User = Database['public']['Tables']['users']['Row'];

const DEV_USER_EMAIL = "dev@salvadorex.test";
const DEV_USER_CLERK_ID = "dev_user_local";

function getDevSupabaseClient() {
  // Use the factory to get the correct Supabase client based on active database
  return getSupabaseAdmin();
}

async function getDevUser(): Promise<User | null> {
  const supabase = getDevSupabaseClient();

  try {
    if (process.env.DEV_USER_ID) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", process.env.DEV_USER_ID)
        .single();

      if (!error && data) {
        return data;
      }
    }

    const { data: devUser, error: devError } = await supabase
      .from("users")
      .select("*")
      .eq("email", DEV_USER_EMAIL)
      .single();

    if (!devError && devUser) {
      return devUser;
    }

    const { data: adminUser, error: adminError } = await supabase
      .from("users")
      .select("*")
      .eq("role", "ADMIN")
      .limit(1)
      .single();

    if (!adminError && adminUser) {
      return adminUser;
    }

    const { data: anyUser, error: anyError } = await supabase
      .from("users")
      .select("*")
      .limit(1)
      .single();

    if (!anyError && anyUser) {
      return anyUser;
    }
  } catch (error: any) {
    // If the users table doesn't exist, return a synthetic dev user
    if (error?.code === 'PGRST204' || error?.message?.includes('does not exist')) {
      console.log("[Auth] Users table not found, using synthetic dev user");
      return createSyntheticDevUser();
    }
    console.error("[Auth] Error fetching dev user:", error);
  }

  // If no user found but in dev mode, return a synthetic user
  console.log("[Auth] No users found in database, using synthetic dev user");
  return createSyntheticDevUser();
}

function createSyntheticDevUser(): User {
  // Use a valid UUID format for the synthetic dev user
  // This is a deterministic UUID so it's always the same
  return {
    id: "00000000-0000-0000-0000-000000000001",
    clerk_id: DEV_USER_CLERK_ID,
    email: DEV_USER_EMAIL,
    first_name: "Dev",
    last_name: "User",
    image: null,
    role: "ADMIN",
    restaurant_id: null,
    age: null,
    height: null,
    weight: null,
    gender: null,
    blood_group: null,
    medical_issues: null,
    stripe_customer_id: null,
    stripe_invoice_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getAuthenticatedUser(): Promise<User | null> {
  const isDevelopment = process.env.NODE_ENV === "development";

  if (isDevelopment) {
    console.log("[Auth] Development mode - bypassing Clerk authentication");
    const devUser = await getDevUser();
    if (devUser) {
      console.log(`[Auth] Using dev user: ${devUser.email} (${devUser.role})`);
    } else {
      console.warn("[Auth] No dev user found. Run /api/init-db?step=dev-user to create one.");
    }
    return devUser;
  }

  try {
    const { userId } = await auth();
    
    if (!userId) {
      console.log("[Auth] No Clerk userId found");
      return null;
    }

    const userData = await getUserByClerkId(userId);
    
    if (!userData) {
      console.log(`[Auth] No user found for Clerk ID: ${userId}`);
      return null;
    }

    return userData;
  } catch (error) {
    console.error("[Auth] Error during Clerk authentication:", error);
    return null;
  }
}

export async function createDevUser(): Promise<User | null> {
  const supabase = getDevSupabaseClient();

  const { data: existingUser } = await supabase
    .from("users")
    .select("*")
    .eq("email", DEV_USER_EMAIL)
    .single();

  if (existingUser) {
    console.log("[Auth] Dev user already exists");
    return existingUser;
  }

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      clerk_id: DEV_USER_CLERK_ID,
      email: DEV_USER_EMAIL,
      first_name: "Dev",
      last_name: "User",
      role: "ADMIN"
    } as any)
    .select()
    .single();

  if (error || !newUser) {
    console.error("[Auth] Error creating dev user:", error);
    return null;
  }

  console.log("[Auth] Dev user created:", (newUser as User).email);
  return newUser as User;
}

export function getSupabaseClient() {
  // Always use the factory to get the correct client based on active database
  return getSupabaseAdmin();
}

export { DEV_USER_EMAIL, DEV_USER_CLERK_ID };
