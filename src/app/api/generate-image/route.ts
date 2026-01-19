import { NextRequest, NextResponse } from "next/server";

// OpenRouter API configuration for image generation
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const IMAGE_GENERATION_MODEL = process.env.IMAGE_GENERATION_MODEL || "google/gemini-2.5-flash-image-preview";

export async function POST(request: NextRequest) {
  try {
    const { prompt, productName } = await request.json();

    if (!prompt && !productName) {
      return NextResponse.json(
        { error: "Either 'prompt' or 'productName' is required" },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY not configured");
      return NextResponse.json(
        { error: "Image generation service not configured" },
        { status: 500 }
      );
    }

    // Create a detailed prompt for product image generation
    const imagePrompt = prompt || `Create a professional, high-quality photo of ${productName}. The image should show restaurant/cafe quality presentation, natural lighting, high resolution, professional photography style. Make it look appealing and appetizing.`;

    console.log(`🎨 Generating image with prompt: "${imagePrompt}"`);

    // Call OpenRouter API for image generation using Gemini
    // Gemini uses the chat completions endpoint with modalities parameter
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://www.systeminternational.app",
        "X-Title": "MultiPOS - Menu Digital",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_GENERATION_MODEL,
        messages: [
          {
            role: "user",
            content: imagePrompt,
          },
        ],
        // Enable image generation modality
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("OpenRouter API error:", response.status, errorData);

      // Fallback: return a placeholder image if generation fails
      return NextResponse.json({
        success: false,
        error: `Image generation failed: ${response.status}`,
        fallback: true,
        imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1024&h=1024&fit=crop",
      });
    }

    const data = await response.json();

    // Gemini returns images in the message content
    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message;

      // Images are returned as base64-encoded data URLs in the images array
      if (message.images && message.images.length > 0) {
        const imageData = message.images[0];

        // Handle Gemini's response format
        let imageDataUrl: string;
        if (typeof imageData === 'string') {
          imageDataUrl = imageData;
        } else if (imageData && typeof imageData === 'object') {
          // Handle format: {type: "image_url", image_url: {url: "..."}}
          if ('image_url' in imageData && imageData.image_url && typeof imageData.image_url === 'object' && 'url' in imageData.image_url) {
            imageDataUrl = (imageData.image_url as any).url;
          } else if ('url' in imageData) {
            imageDataUrl = (imageData as any).url;
          } else if ('data' in imageData) {
            imageDataUrl = (imageData as any).data;
          } else {
            console.error('Unexpected image format:', JSON.stringify(imageData).substring(0, 200));
            return NextResponse.json({
              success: false,
              error: "Unexpected image format in response",
              fallback: true,
              imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1024&h=1024&fit=crop",
            });
          }
        } else {
          console.error('Invalid image data type:', typeof imageData);
          return NextResponse.json({
            success: false,
            error: "Invalid image data type",
            fallback: true,
            imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1024&h=1024&fit=crop",
          });
        }

        console.log(`✓ Image generated successfully`);

        return NextResponse.json({
          success: true,
          imageUrl: imageDataUrl,
          model: IMAGE_GENERATION_MODEL,
          isBase64: true,
        });
      }
    }

    console.error("No images in response:", data);
    return NextResponse.json({
      success: false,
      error: "No image was generated in the response",
      fallback: true,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1024&h=1024&fit=crop",
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
