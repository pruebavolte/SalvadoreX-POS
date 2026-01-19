import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

// Get public restaurant information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const { restaurantId } = await params;
    const supabase = supabaseAdmin;

    // Get restaurant/user information
    const { data: restaurant, error } = await supabase
      .from("users")
      .select("id, first_name, last_name, image, email")
      .eq("id", restaurantId)
      .eq("role", "ADMIN")
      .single();

    if (error || !restaurant) {
      return NextResponse.json(
        { error: "Restaurante no encontrado" },
        { status: 404 }
      );
    }

    // Format the response
    const restaurantInfo = {
      id: (restaurant as any).id,
      name: `${(restaurant as any).first_name} ${(restaurant as any).last_name}`,
      firstName: (restaurant as any).first_name,
      lastName: (restaurant as any).last_name,
      image: (restaurant as any).image,
      email: (restaurant as any).email,
    };

    return NextResponse.json({ restaurant: restaurantInfo });
  } catch (error) {
    console.error("Error fetching restaurant info:", error);
    return NextResponse.json(
      { error: "Error al obtener información del restaurante" },
      { status: 500 }
    );
  }
}
