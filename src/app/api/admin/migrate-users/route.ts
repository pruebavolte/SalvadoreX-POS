import { NextRequest, NextResponse } from "next/server";
import { getSupabaseCredentials, supabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { url, serviceKey } = getSupabaseCredentials();
    
    if (!url || !serviceKey) {
      return NextResponse.json({ 
        success: false, 
        error: "Missing Supabase credentials" 
      }, { status: 500 });
    }

    const sql = `
      ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS location TEXT;
    `;

    const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("RPC not available, providing manual instructions");
      
      return NextResponse.json({ 
        success: false, 
        requiresManualMigration: true,
        sql: sql.trim(),
        instructions: "Please run this SQL in your Supabase SQL Editor"
      }, { status: 200 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Columns added successfully" 
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin as any;

    const { data, error } = await supabase
      .from("users")
      .select("id, created_by_id")
      .limit(1);

    if (error) {
      if (error.message?.includes("created_by_id")) {
        return NextResponse.json({ 
          columnExists: false,
          message: "Column created_by_id does not exist"
        });
      }
      throw error;
    }

    return NextResponse.json({ 
      columnExists: true,
      message: "Column created_by_id exists"
    });
  } catch (error) {
    console.error("Check failed:", error);
    return NextResponse.json({ 
      columnExists: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
