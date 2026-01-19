import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const MP_CLIENT_SECRET = process.env.MERCADOPAGO_CLIENT_SECRET;
const MP_REDIRECT_URI = process.env.MERCADOPAGO_REDIRECT_URI;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const DATABASE_URL = process.env.DATABASE_URL;

const PRODUCTION_URL = "https://www.systeminternational.app";

function getBaseUrl(request: NextRequest): string {
  console.log("[getBaseUrl] APP_URL:", APP_URL);
  console.log("[getBaseUrl] MP_REDIRECT_URI:", MP_REDIRECT_URI);
  
  if (APP_URL && !APP_URL.includes("localhost")) {
    console.log("[getBaseUrl] Using APP_URL:", APP_URL);
    return APP_URL;
  }
  
  if (MP_REDIRECT_URI) {
    try {
      const redirectUrl = new URL(MP_REDIRECT_URI);
      const baseFromRedirect = redirectUrl.origin;
      if (!baseFromRedirect.includes("localhost")) {
        console.log("[getBaseUrl] Using MP_REDIRECT_URI origin:", baseFromRedirect);
        return baseFromRedirect;
      }
    } catch (e) {
      console.error("[getBaseUrl] Error parsing MP_REDIRECT_URI:", e);
    }
  }
  
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  
  console.log("[getBaseUrl] Headers - host:", host, "protocol:", protocol);
  
  if (host && !host.includes("localhost")) {
    const headerUrl = `${protocol}://${host}`;
    console.log("[getBaseUrl] Using headers:", headerUrl);
    return headerUrl;
  }
  
  console.log("[getBaseUrl] Falling back to PRODUCTION_URL:", PRODUCTION_URL);
  return PRODUCTION_URL;
}

async function saveConnectionToPg(data: {
  user_id: string;
  provider: string;
  mp_user_id: string | null;
  access_token: string;
  refresh_token: string;
  public_key: string | null;
  token_expires_at: string;
  live_mode: boolean;
  status: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!DATABASE_URL) {
    console.error("[Save Connection] DATABASE_URL not configured");
    return { success: false, error: "Database not configured" };
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log("[Save Connection] Using Replit PostgreSQL");
  
  try {
    const checkResult = await pool.query(
      `SELECT id FROM terminal_connections WHERE user_id = $1 AND provider = $2`,
      [data.user_id, data.provider]
    );

    if (checkResult.rows.length > 0) {
      console.log("[Save Connection] Updating existing connection for user:", data.user_id);
      await pool.query(
        `UPDATE terminal_connections SET 
          mp_user_id = $1,
          access_token = $2,
          refresh_token = $3,
          public_key = $4,
          token_expires_at = $5,
          live_mode = $6,
          status = $7,
          updated_at = NOW()
        WHERE user_id = $8 AND provider = $9`,
        [
          data.mp_user_id,
          data.access_token,
          data.refresh_token,
          data.public_key,
          data.token_expires_at,
          data.live_mode,
          data.status,
          data.user_id,
          data.provider
        ]
      );
      console.log("[Save Connection] Update successful");
    } else {
      console.log("[Save Connection] Inserting new connection for user:", data.user_id);
      await pool.query(
        `INSERT INTO terminal_connections 
          (user_id, provider, mp_user_id, access_token, refresh_token, public_key, token_expires_at, live_mode, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          data.user_id,
          data.provider,
          data.mp_user_id,
          data.access_token,
          data.refresh_token,
          data.public_key,
          data.token_expires_at,
          data.live_mode,
          data.status
        ]
      );
      console.log("[Save Connection] Insert successful");
    }
    
    return { success: true };
  } catch (error: any) {
    console.error("[Save Connection Error]", error);
    return { success: false, error: error.message };
  } finally {
    await pool.end();
  }
}

export async function GET(request: NextRequest) {
  const baseUrl = getBaseUrl(request);
  
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    console.log("[OAuth Callback] Processing callback from Mercado Pago");
    console.log("[OAuth Callback] Base URL:", baseUrl);

    if (error) {
      console.error("[OAuth Callback Error]", error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=${encodeURIComponent(error)}`, baseUrl)
      );
    }

    if (!code || !state) {
      console.error("[OAuth Callback] Missing code or state");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=missing_params", baseUrl)
      );
    }

    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      console.error("[OAuth Callback] Invalid state format");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=invalid_state", baseUrl)
      );
    }

    const stateAgeMs = Date.now() - stateData.timestamp;
    const maxAgeMs = 30 * 60 * 1000;
    console.log("[OAuth Callback] State age:", Math.round(stateAgeMs / 1000), "seconds, max:", Math.round(maxAgeMs / 1000), "seconds");
    
    if (stateAgeMs > maxAgeMs) {
      console.error("[OAuth Callback] State expired - age:", stateAgeMs, "ms");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=expired", baseUrl)
      );
    }

    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) {
      console.error("[OAuth Callback] Missing MP credentials");
      return NextResponse.redirect(
        new URL("/dashboard/settings/terminals?error=not_configured", baseUrl)
      );
    }

    const redirectUri = MP_REDIRECT_URI || `${baseUrl}/api/oauth/mercadopago/callback`;

    const tokenRequestBody: Record<string, string> = {
      client_id: MP_CLIENT_ID,
      client_secret: MP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    };

    if (stateData.codeVerifier) {
      tokenRequestBody.code_verifier = stateData.codeVerifier;
    }

    console.log("[OAuth Callback] Exchanging code for token...");

    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tokenRequestBody),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("[Token Exchange Error]", JSON.stringify(errorData));
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=token_exchange_failed&details=${encodeURIComponent(errorData.message || errorData.error || '')}`, baseUrl)
      );
    }

    const tokens = await tokenResponse.json();
    console.log("[OAuth Callback] Token exchange successful, saving to database...");

    const saveResult = await saveConnectionToPg({
      user_id: stateData.userId,
      provider: 'mercadopago',
      mp_user_id: tokens.user_id?.toString() || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      public_key: tokens.public_key || null,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      live_mode: tokens.live_mode || false,
      status: 'connected'
    });

    if (!saveResult.success) {
      console.error("[DB Save Error]", saveResult.error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings/terminals?error=save_failed&details=${encodeURIComponent(saveResult.error || '')}`, baseUrl)
      );
    }

    console.log("[OAuth Callback] Connection saved successfully!");
    return NextResponse.redirect(
      new URL("/dashboard/settings/terminals?connected=mercadopago", baseUrl)
    );
  } catch (error: any) {
    console.error("[OAuth Callback Error]", error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings/terminals?error=${encodeURIComponent(error.message)}`, baseUrl)
    );
  }
}
