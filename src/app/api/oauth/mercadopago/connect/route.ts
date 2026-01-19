import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-wrapper";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const MP_CLIENT_ID = process.env.MERCADOPAGO_CLIENT_ID;
const PRODUCTION_URL = "https://www.systeminternational.app";

function getPublicUrl(request: NextRequest): string {
  console.log("[getPublicUrl] MERCADOPAGO_REDIRECT_URI:", process.env.MERCADOPAGO_REDIRECT_URI);
  console.log("[getPublicUrl] NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
  
  if (process.env.MERCADOPAGO_REDIRECT_URI && !process.env.MERCADOPAGO_REDIRECT_URI.includes("localhost")) {
    console.log("[getPublicUrl] Using MERCADOPAGO_REDIRECT_URI");
    return process.env.MERCADOPAGO_REDIRECT_URI;
  }
  
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    console.log("[getPublicUrl] Using NEXT_PUBLIC_APP_URL");
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/mercadopago/callback`;
  }
  
  const host = request.headers.get("host") || request.headers.get("x-forwarded-host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  
  console.log("[getPublicUrl] Headers - host:", host, "protocol:", protocol);
  
  if (host && !host.includes("localhost")) {
    const url = `${protocol}://${host}/api/oauth/mercadopago/callback`;
    console.log("[getPublicUrl] Using headers:", url);
    return url;
  }
  
  console.log("[getPublicUrl] Falling back to PRODUCTION_URL");
  return `${PRODUCTION_URL}/api/oauth/mercadopago/callback`;
}

function generateCodeVerifier(): string {
  const buffer = crypto.randomBytes(32);
  return buffer.toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return hash.toString("base64url");
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!MP_CLIENT_ID) {
      return NextResponse.json(
        { 
          error: "Mercado Pago no está configurado",
          message: "Contacta al administrador para configurar la integración",
          demo_mode: true 
        }, 
        { status: 503 }
      );
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);

    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(7),
      codeVerifier
    })).toString("base64");

    const redirectUri = getPublicUrl(request);

    const authUrl = new URL("https://auth.mercadopago.com/authorization");
    authUrl.searchParams.set("client_id", MP_CLIENT_ID);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("platform_id", "mp");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
      redirectUri
    });
  } catch (error: any) {
    console.error("[OAuth Connect Error]", error);
    return NextResponse.json(
      { error: error.message || "Error al iniciar OAuth" },
      { status: 500 }
    );
  }
}
