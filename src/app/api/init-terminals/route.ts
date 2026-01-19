import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "check";

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    if (action === "check") {
      const { error } = await supabase
        .from("terminal_connections")
        .select("id")
        .limit(1);

      if (error?.code === "42P01") {
        return NextResponse.json({
          exists: false,
          message: "La tabla terminal_connections no existe",
          sql: getCreateTableSQL()
        });
      }

      return NextResponse.json({
        exists: true,
        message: "La tabla terminal_connections existe"
      });
    }

    if (action === "sql") {
      return NextResponse.json({
        sql: getCreateTableSQL(),
        instructions: "Ejecuta este SQL en el editor SQL de Supabase"
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error: any) {
    console.error("[Init Terminals Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al verificar tabla" },
      { status: 500 }
    );
  }
}

function getCreateTableSQL(): string {
  return `
-- Tabla para almacenar conexiones OAuth de terminales de pago
CREATE TABLE IF NOT EXISTS terminal_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'mercadopago',
  
  -- Datos de OAuth (almacenados de forma segura en el servidor)
  mp_user_id VARCHAR(100),
  access_token TEXT,
  refresh_token TEXT,
  public_key VARCHAR(255),
  token_expires_at TIMESTAMPTZ,
  live_mode BOOLEAN DEFAULT false,
  
  -- Dispositivo seleccionado
  selected_device_id VARCHAR(255),
  selected_device_name VARCHAR(255),
  
  -- Estado
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: un usuario solo puede tener una conexión por proveedor
  UNIQUE(user_id, provider)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_terminal_connections_user_id ON terminal_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_terminal_connections_provider ON terminal_connections(provider);

-- RLS (Row Level Security) - Opcional pero recomendado
ALTER TABLE terminal_connections ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo vean sus propias conexiones
CREATE POLICY "Users can view own terminal connections" ON terminal_connections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own terminal connections" ON terminal_connections
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own terminal connections" ON terminal_connections
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own terminal connections" ON terminal_connections
  FOR DELETE USING (user_id = auth.uid());

-- Service role puede hacer todo
CREATE POLICY "Service role has full access" ON terminal_connections
  FOR ALL USING (auth.role() = 'service_role');
  `.trim();
}
