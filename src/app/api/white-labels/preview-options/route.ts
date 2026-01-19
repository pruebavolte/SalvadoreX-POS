import { NextRequest, NextResponse } from "next/server";
import { generateAllStylePreviews } from "@/lib/landing-generator";

export async function POST(request: NextRequest) {
  try {
    const { businessType } = await request.json();

    if (!businessType || typeof businessType !== "string") {
      return NextResponse.json(
        { error: "businessType is required" },
        { status: 400 }
      );
    }

    const trimmedType = businessType.trim();
    if (!trimmedType) {
      return NextResponse.json(
        { error: "businessType cannot be empty" },
        { status: 400 }
      );
    }

    console.log(`[PreviewOptions] Generating style previews for: ${trimmedType}`);
    
    const previews = await generateAllStylePreviews(trimmedType);
    
    console.log(`[PreviewOptions] Generated ${previews.length} previews`);

    return NextResponse.json({
      success: true,
      previews,
    });
  } catch (error) {
    console.error("[PreviewOptions] Error generating previews:", error);
    return NextResponse.json(
      { error: "Failed to generate style previews" },
      { status: 500 }
    );
  }
}
