import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import { supabaseAdmin } from "@/lib/supabase/server";

export interface ComponentOverride {
  id?: string;
  vertical_id: string;
  module_key: string;
  component_key: string;
  enabled: boolean;
  custom_label?: string;
  custom_label_en?: string;
  custom_props?: Record<string, unknown>;
}

export interface EntityField {
  id?: string;
  vertical_id: string;
  entity_type: string;
  field_key: string;
  field_label: string;
  field_label_en?: string;
  field_type: string;
  required?: boolean;
  default_value?: string;
  validation_rules?: Record<string, unknown>;
  select_options?: Array<{ value: string; label: string }>;
  display_order?: number;
  show_in_list?: boolean;
  show_in_form?: boolean;
  show_in_detail?: boolean;
  enabled?: boolean;
}

export interface VerticalUIConfig {
  vertical_id: string;
  component_overrides: ComponentOverride[];
  entity_fields: EntityField[];
  terminology?: Record<string, string>;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const verticalId = searchParams.get("verticalId");

    if (!verticalId) {
      return NextResponse.json({ error: "verticalId is required" }, { status: 400 });
    }

    const supabase = supabaseAdmin;

    const { data: componentOverrides, error: compError } = await supabase
      .from("vertical_component_overrides" as never)
      .select("*")
      .eq("vertical_id", verticalId)
      .order("module_key")
      .order("component_key");

    const { data: entityFields, error: fieldsError } = await supabase
      .from("vertical_entity_fields" as never)
      .select("*")
      .eq("vertical_id", verticalId)
      .order("entity_type")
      .order("display_order");

    const { data: terminology, error: termError } = await supabase
      .from("vertical_terminology")
      .select("*")
      .eq("vertical_id", verticalId)
      .single();

    if (compError && !compError.message.includes("does not exist")) {
      console.error("Error fetching component overrides:", compError);
    }
    if (fieldsError && !fieldsError.message.includes("does not exist")) {
      console.error("Error fetching entity fields:", fieldsError);
    }

    return NextResponse.json({
      success: true,
      data: {
        vertical_id: verticalId,
        component_overrides: componentOverrides || [],
        entity_fields: entityFields || [],
        terminology: terminology || null,
      }
    });

  } catch (error) {
    console.error("Error fetching UI config:", error);
    return NextResponse.json(
      { error: "Failed to fetch UI configuration", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized", success: false }, { status: 401 });
    }

    const body = await req.json();
    const { vertical_id, component_overrides, entity_fields, terminology } = body as VerticalUIConfig;

    if (!vertical_id) {
      return NextResponse.json({ error: "vertical_id is required", success: false }, { status: 400 });
    }

    const supabase = supabaseAdmin;
    const errors: string[] = [];
    let tablesMissing = false;

    if (component_overrides && Array.isArray(component_overrides)) {
      for (const override of component_overrides) {
        const { error } = await supabase
          .from("vertical_component_overrides" as never)
          .upsert({
            vertical_id,
            module_key: override.module_key,
            component_key: override.component_key,
            enabled: override.enabled,
            custom_label: override.custom_label,
            custom_label_en: override.custom_label_en,
            custom_props: override.custom_props || {},
            updated_by: user.id,
          } as never, {
            onConflict: "vertical_id,module_key,component_key"
          });

        if (error) {
          if (error.message.includes("does not exist") || error.code === "42P01") {
            tablesMissing = true;
            errors.push("Table 'vertical_component_overrides' does not exist");
          } else {
            console.error("Error upserting component override:", error);
            errors.push(`Component override error: ${error.message}`);
          }
        }
      }
    }

    if (entity_fields && Array.isArray(entity_fields)) {
      for (const field of entity_fields) {
        const { error } = await supabase
          .from("vertical_entity_fields" as never)
          .upsert({
            vertical_id,
            entity_type: field.entity_type,
            field_key: field.field_key,
            field_label: field.field_label,
            field_label_en: field.field_label_en,
            field_type: field.field_type,
            required: field.required ?? false,
            default_value: field.default_value,
            validation_rules: field.validation_rules || {},
            select_options: field.select_options,
            display_order: field.display_order ?? 0,
            show_in_list: field.show_in_list ?? false,
            show_in_form: field.show_in_form ?? true,
            show_in_detail: field.show_in_detail ?? true,
            enabled: field.enabled ?? true,
            updated_by: user.id,
          } as never, {
            onConflict: "vertical_id,entity_type,field_key"
          });

        if (error) {
          if (error.message.includes("does not exist") || error.code === "42P01") {
            tablesMissing = true;
            errors.push("Table 'vertical_entity_fields' does not exist");
          } else {
            console.error("Error upserting entity field:", error);
            errors.push(`Entity field error: ${error.message}`);
          }
        }
      }
    }

    if (terminology) {
      const { error } = await supabase
        .from("vertical_terminology")
        .upsert({
          vertical_id,
          ...terminology,
        } as never, {
          onConflict: "vertical_id"
        });

      if (error) {
        if (error.message.includes("does not exist") || error.code === "42P01") {
          tablesMissing = true;
          errors.push("Table 'vertical_terminology' does not exist");
        } else {
          console.error("Error upserting terminology:", error);
          errors.push(`Terminology error: ${error.message}`);
        }
      }
    }

    if (tablesMissing) {
      return NextResponse.json({
        success: false,
        error: "Required database tables are missing. Please run the vertical UI migrations first.",
        details: [...new Set(errors)],
        migrationRequired: true,
      }, { status: 500 });
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: "Some configurations failed to save",
        details: errors,
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "UI configuration saved" });

  } catch (error) {
    console.error("Error saving UI config:", error);
    return NextResponse.json(
      { error: "Failed to save UI configuration", success: false, details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type");

    if (!id || !type) {
      return NextResponse.json({ error: "id and type are required" }, { status: 400 });
    }

    const supabase = supabaseAdmin;

    if (type === "component") {
      const { error } = await supabase
        .from("vertical_component_overrides" as never)
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }
    } else if (type === "field") {
      const { error } = await supabase
        .from("vertical_entity_fields" as never)
        .delete()
        .eq("id", id);

      if (error) {
        throw error;
      }
    } else {
      return NextResponse.json({ error: "Invalid type. Use 'component' or 'field'" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" });

  } catch (error) {
    console.error("Error deleting config:", error);
    return NextResponse.json(
      { error: "Failed to delete", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
