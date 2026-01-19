import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId } from "@/lib/supabase/users";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    const user = await getUserByClerkId(userId);

    return NextResponse.json({
      role: user?.role || "USER",
    });
  } catch (error) {
    console.error("Error getting user role:", error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}
