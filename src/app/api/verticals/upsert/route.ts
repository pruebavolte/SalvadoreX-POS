import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { getSupabaseAdmin } from "@/lib/supabase/factory";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required", success: false },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLowerCase();
    const supabase = getSupabaseAdmin();

    const { data: existingVertical, error: searchError } = await supabase
      .from("verticals")
      .select("*")
      .ilike("name", normalizedName)
      .single();

    if (existingVertical && !searchError) {
      return NextResponse.json({
        data: existingVertical,
        created: false,
        success: true,
      });
    }

    if (searchError && searchError.code !== "PGRST116") {
      console.error("Error searching for vertical:", searchError);
    }

    const slug = slugify(trimmedName);

    const { data: newVertical, error: insertError } = await supabase
      .from("verticals")
      .insert({
        name: normalizedName,
        display_name: trimmedName,
        slug: slug,
        active: true,
        popularity_score: 0,
        sort_order: 999,
        default_modules: {},
        default_settings: {},
      } as never)
      .select()
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existingBySlug } = await supabase
          .from("verticals")
          .select("*")
          .eq("slug", slug)
          .single();

        if (existingBySlug) {
          return NextResponse.json({
            data: existingBySlug,
            created: false,
            success: true,
          });
        }
      }
      throw insertError;
    }

    return NextResponse.json(
      { data: newVertical, created: true, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error upserting vertical:", error);
    return NextResponse.json(
      { error: "Failed to upsert vertical", success: false },
      { status: 500 }
    );
  }
}
