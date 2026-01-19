import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { getSupabaseAdmin } from "@/lib/supabase/factory";

export interface VerticalCategory {
  id: string;
  name: string;
  display_name: string;
  display_name_en?: string;
  description?: string;
  icon?: string;
  sort_order: number;
  active: boolean;
}

export interface SystemModule {
  id: string;
  key: string;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  icon?: string;
  category: string;
  is_premium: boolean;
  is_ai_feature: boolean;
  sort_order: number;
  active: boolean;
}

export interface VerticalTerminology {
  id: string;
  vertical_id: string;
  customer_singular: string;
  customer_plural: string;
  customer_singular_en: string;
  customer_plural_en: string;
  product_singular: string;
  product_plural: string;
  product_singular_en: string;
  product_plural_en: string;
  order_singular: string;
  order_plural: string;
  order_singular_en: string;
  order_plural_en: string;
  sale_singular: string;
  sale_plural: string;
  inventory_label: string;
  category_singular: string;
  category_plural: string;
  staff_singular: string;
  staff_plural: string;
  appointment_singular: string;
  appointment_plural: string;
  table_singular: string;
  table_plural: string;
  ticket_singular: string;
  ticket_plural: string;
  custom_terms?: Record<string, string>;
}

export interface VerticalModuleConfig {
  id: string;
  vertical_id: string;
  module_id: string;
  module?: SystemModule;
  enabled_by_default: boolean;
  is_required: boolean;
  is_recommended: boolean;
  default_config?: Record<string, unknown>;
  custom_name?: string;
  custom_description?: string;
  sort_order: number;
}

export interface VerticalFeature {
  id: string;
  vertical_id: string;
  feature_key: string;
  feature_name: string;
  feature_name_en?: string;
  description?: string;
  description_en?: string;
  enabled_by_default: boolean;
  is_premium: boolean;
  config?: Record<string, unknown>;
}

export interface Vertical {
  id: string;
  name: string;
  slug?: string;
  display_name: string;
  display_name_en?: string;
  description?: string;
  description_en?: string;
  icon?: string;
  category_id?: string;
  category?: VerticalCategory;
  suggested_system_name?: string;
  suggested_domain_prefix?: string;
  popularity_score: number;
  sort_order: number;
  default_modules?: Record<string, boolean>;
  default_settings?: Record<string, unknown>;
  terminology?: VerticalTerminology;
  module_configs?: VerticalModuleConfig[];
  features?: VerticalFeature[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

function isMissingTableOrColumnError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code;
  return code === "42P01" || 
         code === "42703" ||
         code?.startsWith("PGRST") ||
         message.includes("does not exist") || 
         message.includes("PGRST") ||
         message.includes("schema cache");
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false";
    const categoryName = searchParams.get("category");
    const includeDetails = searchParams.get("details") === "true";
    const verticalId = searchParams.get("id");
    const slug = searchParams.get("slug");

    if (verticalId || slug) {
      let query = supabase
        .from("verticals")
        .select(`
          *,
          category:vertical_categories(*)
        `);

      if (verticalId) {
        query = query.eq("id", verticalId);
      } else if (slug) {
        query = query.eq("slug", slug);
      }

      const { data: vertical, error: verticalError } = await query.single();

      if (verticalError) {
        if (verticalError.code === "PGRST116") {
          return NextResponse.json(
            { error: "Vertical not found", success: false },
            { status: 404 }
          );
        }
        throw verticalError;
      }

      const verticalData = vertical as unknown as Vertical;

      const { data: terminology } = await supabase
        .from("vertical_terminology")
        .select("*")
        .eq("vertical_id", verticalData.id)
        .single();

      const { data: moduleConfigs } = await supabase
        .from("vertical_module_configs")
        .select(`
          *,
          module:system_modules(*)
        `)
        .eq("vertical_id", verticalData.id)
        .order("sort_order");

      const { data: features } = await supabase
        .from("vertical_features")
        .select("*")
        .eq("vertical_id", verticalData.id);

      return NextResponse.json({
        data: {
          ...verticalData,
          terminology: terminology as unknown as VerticalTerminology,
          module_configs: (moduleConfigs || []) as unknown as VerticalModuleConfig[],
          features: (features || []) as unknown as VerticalFeature[],
        } as Vertical,
        success: true,
      });
    }

    let query = supabase
      .from("verticals")
      .select(includeDetails ? `
        *,
        category:vertical_categories(*)
      ` : "*")
      .order("sort_order")
      .order("display_name");

    if (activeOnly) {
      query = query.eq("active", true);
    }

    if (categoryName) {
      const { data: category } = await supabase
        .from("vertical_categories")
        .select("id")
        .eq("name", categoryName)
        .single();

      const categoryData = category as unknown as { id: string } | null;
      if (categoryData) {
        query = query.eq("category_id", categoryData.id);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      data: data as unknown as Vertical[],
      success: true,
    });
  } catch (error) {
    console.error("Error fetching verticals:", error);
    
    if (isMissingTableOrColumnError(error)) {
      return NextResponse.json({
        data: [],
        success: true,
        migrationPending: true,
        message: "Verticals tables not found. Please run migrations 021, 022, 023 in Supabase SQL Editor.",
      });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch verticals", success: false },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required", success: false },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const {
      name,
      slug,
      display_name,
      display_name_en,
      description,
      description_en,
      icon,
      category_id,
      suggested_system_name,
      suggested_domain_prefix,
      default_modules,
      default_settings,
      terminology,
      module_configs,
      features,
    } = body;

    if (!name || !display_name) {
      return NextResponse.json(
        { error: "Missing required fields: name, display_name", success: false },
        { status: 400 }
      );
    }

    const verticalData = {
      name,
      slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
      display_name,
      display_name_en,
      description,
      description_en,
      icon,
      category_id,
      suggested_system_name,
      suggested_domain_prefix,
      default_modules: default_modules || {},
      default_settings: default_settings || {},
      active: true,
    };

    const { data: vertical, error } = await supabase
      .from("verticals")
      .insert(verticalData as never)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Vertical name already exists", success: false },
          { status: 409 }
        );
      }
      throw error;
    }

    const createdVertical = vertical as unknown as Vertical;

    if (terminology) {
      const termData = {
        vertical_id: createdVertical.id,
        ...terminology,
      };
      await supabase.from("vertical_terminology").insert(termData as never);
    }

    if (module_configs && Array.isArray(module_configs)) {
      for (const config of module_configs) {
        const configData = {
          vertical_id: createdVertical.id,
          module_id: config.module_id,
          enabled_by_default: config.enabled_by_default ?? false,
          is_required: config.is_required ?? false,
          is_recommended: config.is_recommended ?? false,
          default_config: config.default_config || {},
          custom_name: config.custom_name,
          custom_description: config.custom_description,
          sort_order: config.sort_order ?? 0,
        };
        await supabase.from("vertical_module_configs").insert(configData as never);
      }
    }

    if (features && Array.isArray(features)) {
      for (const feature of features) {
        const featureData = {
          vertical_id: createdVertical.id,
          feature_key: feature.feature_key,
          feature_name: feature.feature_name,
          feature_name_en: feature.feature_name_en,
          description: feature.description,
          description_en: feature.description_en,
          enabled_by_default: feature.enabled_by_default ?? true,
          is_premium: feature.is_premium ?? false,
          config: feature.config || {},
        };
        await supabase.from("vertical_features").insert(featureData as never);
      }
    }

    return NextResponse.json(
      { data: createdVertical, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating vertical:", error);
    return NextResponse.json(
      { error: "Failed to create vertical", success: false },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required", success: false },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const body = await req.json();
    const { id, terminology, module_configs, features, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Vertical ID is required", success: false },
        { status: 400 }
      );
    }

    delete updates.created_at;
    delete updates.category;

    const { data: vertical, error } = await supabase
      .from("verticals")
      .update(updates as never)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    const updatedVertical = vertical as unknown as Vertical;

    if (terminology) {
      const termData = {
        vertical_id: id,
        ...terminology,
      };
      await supabase
        .from("vertical_terminology")
        .upsert(termData as never, { onConflict: "vertical_id" });
    }

    if (module_configs && Array.isArray(module_configs)) {
      await supabase
        .from("vertical_module_configs")
        .delete()
        .eq("vertical_id", id);

      for (const config of module_configs) {
        const configData = {
          vertical_id: id,
          module_id: config.module_id,
          enabled_by_default: config.enabled_by_default ?? false,
          is_required: config.is_required ?? false,
          is_recommended: config.is_recommended ?? false,
          default_config: config.default_config || {},
          custom_name: config.custom_name,
          custom_description: config.custom_description,
          sort_order: config.sort_order ?? 0,
        };
        await supabase.from("vertical_module_configs").insert(configData as never);
      }
    }

    if (features && Array.isArray(features)) {
      await supabase
        .from("vertical_features")
        .delete()
        .eq("vertical_id", id);

      for (const feature of features) {
        const featureData = {
          vertical_id: id,
          feature_key: feature.feature_key,
          feature_name: feature.feature_name,
          feature_name_en: feature.feature_name_en,
          description: feature.description,
          description_en: feature.description_en,
          enabled_by_default: feature.enabled_by_default ?? true,
          is_premium: feature.is_premium ?? false,
          config: feature.config || {},
        };
        await supabase.from("vertical_features").insert(featureData as never);
      }
    }

    return NextResponse.json({ data: updatedVertical, success: true });
  } catch (error) {
    console.error("Error updating vertical:", error);
    return NextResponse.json(
      { error: "Failed to update vertical", success: false },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Admin access required", success: false },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Vertical ID is required", success: false },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("verticals")
      .update({ active: false } as never)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vertical:", error);
    return NextResponse.json(
      { error: "Failed to delete vertical", success: false },
      { status: 500 }
    );
  }
}
