import { NextRequest, NextResponse } from "next/server";
import { getDNSInstructions, getTargetHost } from "@/lib/godaddy";

export async function GET(request: NextRequest) {
  const subdomain = request.nextUrl.searchParams.get("subdomain");
  
  if (subdomain) {
    const instructions = getDNSInstructions(subdomain);
    return NextResponse.json(instructions);
  }
  
  return NextResponse.json({
    cnameTarget: getTargetHost(),
    domain: "negocio.international",
    ttl: 600,
  });
}
