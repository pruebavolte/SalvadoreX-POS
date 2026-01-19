import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = "force-dynamic";

const CREATE_TABLES_SQL = `
-- Queue entries table (people waiting in line)
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID,
  queue_number INTEGER NOT NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  push_subscription JSONB,
  status VARCHAR(50) DEFAULT 'waiting',
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  called_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  estimated_wait_minutes INTEGER,
  actual_wait_minutes INTEGER
);

-- Queue statistics table (for calculating averages)
CREATE TABLE IF NOT EXISTS queue_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID,
  date DATE DEFAULT CURRENT_DATE,
  total_served INTEGER DEFAULT 0,
  total_wait_time_minutes INTEGER DEFAULT 0,
  average_wait_minutes DECIMAL(10,2) DEFAULT 0,
  peak_queue_size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily queue counter
CREATE TABLE IF NOT EXISTS queue_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tenant_id UUID,
  date DATE DEFAULT CURRENT_DATE,
  last_number INTEGER DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_queue_entries_user_status ON queue_entries(user_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_tenant_status ON queue_entries(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_created ON queue_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_stats_user_date ON queue_stats(user_id, date);
`;

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action");

  try {
    if (action === "check") {
      const { data: entries, error: entriesError } = await supabase
        .from("queue_entries")
        .select("id")
        .limit(1);

      const { data: stats, error: statsError } = await supabase
        .from("queue_stats")
        .select("id")
        .limit(1);

      const { data: counters, error: countersError } = await supabase
        .from("queue_counters")
        .select("id")
        .limit(1);

      return NextResponse.json({
        queue_entries: !entriesError,
        queue_stats: !statsError,
        queue_counters: !countersError,
        ready: !entriesError && !statsError && !countersError,
        errors: {
          entries: entriesError?.message,
          stats: statsError?.message,
          counters: countersError?.message,
        }
      });
    }

    if (action === "sql") {
      return NextResponse.json({
        sql: CREATE_TABLES_SQL,
        instructions: "Execute this SQL in Supabase SQL Editor to create queue tables",
      });
    }

    return NextResponse.json({
      message: "Queue initialization endpoint",
      actions: {
        check: "?action=check - Check if tables exist",
        sql: "?action=sql - Get SQL to create tables",
      },
    });
  } catch (error: any) {
    console.error("Queue init error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
