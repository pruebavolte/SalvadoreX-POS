import { supabaseAdmin } from "./server";
import type { Database } from "./client";

type User = Database['public']['Tables']['users']['Row'];

export async function getUserByClerkId(clerkId: string): Promise<User | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerk_id", clerkId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error("Error fetching user:", error);
    return null;
  }

  return data;
}

export async function createUser(userData: {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
  role?: 'ADMIN' | 'USER' | 'CUSTOMER';
}): Promise<User> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    // @ts-expect-error - Type mismatch with Supabase generated types
    .insert({
      clerk_id: userData.clerkId,
      email: userData.email,
      first_name: userData.firstName,
      last_name: userData.lastName,
      image: userData.image,
      role: userData.role || 'USER'
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }

  return data;
}

export async function updateUserRole(email: string, role: 'ADMIN' | 'USER' | 'CUSTOMER'): Promise<User> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from("users")
    // @ts-expect-error - Type mismatch with Supabase generated types
    .update({ role })
    .eq("email", email)
    .select()
    .single();

  if (error) {
    console.error("Error updating user role:", error);
    throw error;
  }

  return data;
}

interface UserWithVertical {
  id: string;
  clerk_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  image: string | null;
  created_at: string;
  vertical_id?: string | null;
  vertical_name?: string | null;
  last_login_date?: string | null;
  location?: string | null;
  created_by_id?: string | null;
  created_by_name?: string | null;
  created_by_email?: string | null;
}

export async function getAllUsers(): Promise<UserWithVertical[]> {
  const supabase = supabaseAdmin;

  try {
    // Try to get all columns including created_by_id
    let data: any[] | null = null;
    let hasCreatedByColumn = true;

    // First try with created_by_id column
    const fullQuery = await supabase
      .from("users")
      .select(`
        id,
        clerk_id,
        email,
        first_name,
        last_name,
        role,
        image,
        created_at,
        vertical_id,
        created_by_id
      `)
      .order("created_at", { ascending: false });

    if (fullQuery.error) {
      // If error mentions created_by_id, fallback to basic query
      if (fullQuery.error.message?.includes("created_by_id")) {
        console.log("created_by_id column not found, using basic query");
        hasCreatedByColumn = false;
        
        const basicQuery = await supabase
          .from("users")
          .select(`
            id,
            clerk_id,
            email,
            first_name,
            last_name,
            role,
            image,
            created_at,
            vertical_id
          `)
          .order("created_at", { ascending: false });

        if (basicQuery.error) {
          console.error("Error fetching users (basic):", basicQuery.error);
          throw basicQuery.error;
        }
        data = basicQuery.data;
      } else {
        console.error("Error fetching users:", fullQuery.error);
        throw fullQuery.error;
      }
    } else {
      data = fullQuery.data;
    }

    if (!data) {
      console.warn("No users data returned");
      return [];
    }

    // Create a map of users by ID for quick lookup of creators
    const usersById = new Map<string, any>();
    for (const user of data) {
      usersById.set(user.id, user);
    }

    // Helper to safely format creator name
    const formatCreatorName = (creator: any): string | null => {
      if (!creator) return null;
      const firstName = creator.first_name?.trim() || '';
      const lastName = creator.last_name?.trim() || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (fullName) return fullName;
      if (creator.email) return creator.email;
      return null;
    };

    // Map users with creator information (manual join)
    const users = data.map((user: any) => {
      const creatorId = hasCreatedByColumn ? user.created_by_id : null;
      const creator = creatorId ? usersById.get(creatorId) : null;
      
      return {
        id: user.id as string,
        clerk_id: user.clerk_id as string,
        email: user.email as string,
        first_name: user.first_name as string,
        last_name: user.last_name as string,
        role: user.role as string,
        image: user.image as string | null,
        created_at: user.created_at as string,
        vertical_id: user.vertical_id as string | null,
        vertical_name: null,
        last_login_date: null,
        location: null,
        created_by_id: creatorId as string | null,
        created_by_name: formatCreatorName(creator),
        created_by_email: creator?.email || null,
      };
    });

    return users;
  } catch (error) {
    console.error("Error in getAllUsers:", error);
    throw error;
  }
}

export async function getOrCreateUser(clerkId: string, userData: {
  email: string;
  firstName: string;
  lastName: string;
  image?: string;
}): Promise<User> {
  const supabase = supabaseAdmin;
  
  // First, try to find by clerk_id
  let user = await getUserByClerkId(clerkId);
  
  if (user) {
    // User exists with this clerk_id, update their info if needed
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      // @ts-expect-error - Type mismatch with Supabase generated types
      .update({
        first_name: userData.firstName,
        last_name: userData.lastName,
        image: userData.image,
      })
      .eq("clerk_id", clerkId)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating user:", updateError);
      // Return existing user even if update fails
      return user;
    }
    
    return updatedUser;
  }
  
  // Check if user exists by email (might have different clerk_id)
  const existingByEmail = await getUserByEmail(userData.email);
  
  if (existingByEmail) {
    // User exists with this email, update their clerk_id and info
    console.log(`[getOrCreateUser] Found existing user by email, updating clerk_id: ${userData.email}`);
    
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      // @ts-expect-error - Type mismatch with Supabase generated types
      .update({
        clerk_id: clerkId,
        first_name: userData.firstName,
        last_name: userData.lastName,
        image: userData.image,
      })
      .eq("email", userData.email)
      .select()
      .single();
    
    if (updateError) {
      console.error("Error updating user clerk_id:", updateError);
      throw updateError;
    }
    
    return updatedUser;
  }
  
  // No user exists, create new one
  user = await createUser({
    clerkId,
    ...userData
  });

  return user;
}
