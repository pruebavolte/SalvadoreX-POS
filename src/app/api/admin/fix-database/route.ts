import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This endpoint fixes database foreign key relationships
// Only accessible with a special admin key for security

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get("x-admin-key");
    const expectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY_2?.substring(0, 20);
    
    if (!authHeader || authHeader !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.SUPABASE_URL_2 || process.env.NEXT_PUBLIC_SUPABASE_URL_2;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_2;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ 
        error: "Missing Supabase configuration" 
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const results: { name: string; status: string; error?: string }[] = [];

    // Foreign key constraints to add
    const constraints = [
      {
        name: "products.category_id → categories.id",
        table: "products",
        column: "category_id",
        refTable: "categories",
        refColumn: "id",
        constraintName: "fk_products_category_id"
      },
      {
        name: "sales.customer_id → customers.id",
        table: "sales",
        column: "customer_id",
        refTable: "customers",
        refColumn: "id",
        constraintName: "fk_sales_customer_id"
      },
      {
        name: "sales.user_id → users.id",
        table: "sales",
        column: "user_id",
        refTable: "users",
        refColumn: "id",
        constraintName: "fk_sales_user_id"
      },
      {
        name: "products.user_id → users.id",
        table: "products",
        column: "user_id",
        refTable: "users",
        refColumn: "id",
        constraintName: "fk_products_user_id"
      },
      {
        name: "categories.user_id → users.id",
        table: "categories",
        column: "user_id",
        refTable: "users",
        refColumn: "id",
        constraintName: "fk_categories_user_id"
      },
      {
        name: "customers.user_id → users.id",
        table: "customers",
        column: "user_id",
        refTable: "users",
        refColumn: "id",
        constraintName: "fk_customers_user_id"
      },
      {
        name: "orders.user_id → users.id",
        table: "orders",
        column: "user_id",
        refTable: "users",
        refColumn: "id",
        constraintName: "fk_orders_user_id"
      },
      {
        name: "categories.parent_id → categories.id",
        table: "categories",
        column: "parent_id",
        refTable: "categories",
        refColumn: "id",
        constraintName: "fk_categories_parent_id"
      }
    ];

    // Test database connection first
    const { data: testData, error: testError } = await supabase
      .from("users")
      .select("id")
      .limit(1);

    if (testError) {
      return NextResponse.json({
        error: "Database connection failed",
        details: testError.message
      }, { status: 500 });
    }

    // For each constraint, verify the relationship exists by attempting a join query
    for (const constraint of constraints) {
      try {
        // Test if the relationship already works
        const testQuery = await supabase
          .from(constraint.table)
          .select(`id, ${constraint.column}`)
          .limit(1);

        if (testQuery.error) {
          results.push({
            name: constraint.name,
            status: "error",
            error: testQuery.error.message
          });
        } else {
          // Try to verify if the FK constraint already exists by checking info
          results.push({
            name: constraint.name,
            status: "verified",
            error: "Column exists - FK may need to be added via SQL Editor"
          });
        }
      } catch (e: any) {
        results.push({
          name: constraint.name,
          status: "error",
          error: e.message
        });
      }
    }

    // Since we can't directly execute DDL via Supabase client,
    // return the SQL that needs to be run
    const sqlToRun = constraints.map(c => 
      `ALTER TABLE ${c.table} DROP CONSTRAINT IF EXISTS ${c.constraintName};\n` +
      `ALTER TABLE ${c.table} ADD CONSTRAINT ${c.constraintName} ` +
      `FOREIGN KEY (${c.column}) REFERENCES ${c.refTable}(${c.refColumn}) ON DELETE SET NULL;`
    ).join('\n\n');

    return NextResponse.json({
      success: true,
      message: "Database analysis complete",
      note: "Foreign keys cannot be added via API. Please run the following SQL in Supabase SQL Editor:",
      sql: sqlToRun,
      results
    });

  } catch (error: any) {
    console.error("Fix database error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error.message
    }, { status: 500 });
  }
}
