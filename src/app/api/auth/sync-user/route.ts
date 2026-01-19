import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateUser } from "@/lib/supabase/users";

/**
 * API endpoint to sync the current Clerk user with Supabase
 * This is called automatically when a user logs in
 *
 * Error handling:
 * - 401: User not authenticated
 * - 400: Invalid user data (missing email, etc.)
 * - 404: User not found in Clerk
 * - 500: Server/database errors
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify authentication
    const { userId } = await auth();

    if (!userId) {
      console.log("[SyncUser] No userId - user not authenticated");
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    // Step 2: Get full user details from Clerk
    let clerkUser;
    try {
      clerkUser = await currentUser();
    } catch (clerkError: any) {
      console.error("[SyncUser] Error fetching Clerk user:", clerkError);
      return NextResponse.json(
        {
          error: "Error al obtener información de Clerk",
          details: clerkError?.message || "Unknown Clerk error"
        },
        { status: 502 } // Bad Gateway - external service error
      );
    }

    if (!clerkUser) {
      console.error(`[SyncUser] Clerk user not found for userId: ${userId}`);
      return NextResponse.json(
        { error: "Usuario no encontrado en el sistema de autenticación" },
        { status: 404 }
      );
    }

    // Step 3: Validate email exists
    const primaryEmail = clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId
    );

    if (!primaryEmail || !primaryEmail.emailAddress) {
      console.error(`[SyncUser] No primary email found for user: ${userId}`);
      return NextResponse.json(
        { error: "No se encontró email principal del usuario" },
        { status: 400 }
      );
    }

    console.log(`[SyncUser] Syncing user: ${userId} (${primaryEmail.emailAddress})`);

    // Step 4: Create or get user in Supabase
    let user;
    try {
      user = await getOrCreateUser(userId, {
        email: primaryEmail.emailAddress,
        firstName: clerkUser.firstName || "",
        lastName: clerkUser.lastName || "",
        image: clerkUser.imageUrl || undefined,
      });
    } catch (dbError: any) {
      console.error("[SyncUser] Database error:", dbError);
      console.error("[SyncUser] Error details:", {
        message: dbError?.message,
        stack: dbError?.stack,
        code: dbError?.code,
      });

      return NextResponse.json(
        {
          error: "Error al sincronizar usuario en la base de datos",
          details: dbError?.message || "Unknown database error"
        },
        { status: 500 }
      );
    }

    console.log(`[SyncUser] User synced successfully: ${userId}`);

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    // Catch-all for unexpected errors
    console.error("[SyncUser] Unexpected error:", error);
    console.error("[SyncUser] Error details:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      name: error?.name,
    });

    return NextResponse.json(
      {
        error: "Error inesperado al sincronizar usuario",
        details: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}
