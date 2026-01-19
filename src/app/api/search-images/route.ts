import { NextRequest, NextResponse } from "next/server";

// Pexels API - Free tier: 200 requests per hour
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  liked: boolean;
  alt: string;
}

interface PexelsResponse {
  page: number;
  per_page: number;
  photos: PexelsPhoto[];
  total_results: number;
  next_page?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // If no API key is set, use a fallback with stock food images
    if (!PEXELS_API_KEY) {
      console.warn("PEXELS_API_KEY not set, using fallback images");

      // Return a list of generic food placeholder images
      const fallbackImages = [
        {
          id: `fallback-${Date.now()}`,
          url: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&h=600&fit=crop`, // Salad
          thumbnail: `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop`,
          alt: query,
          photographer: "Unsplash",
        },
      ];

      return NextResponse.json({ images: fallbackImages });
    }

    // Search for images on Pexels using the product name directly
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data: PexelsResponse = await response.json();

    // Transform Pexels response to our format
    const images = data.photos.map((photo) => ({
      id: photo.id.toString(),
      url: photo.src.large,
      thumbnail: photo.src.medium,
      alt: photo.alt || query,
      photographer: photo.photographer,
      photographerUrl: photo.photographer_url,
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Error searching images:", error);
    return NextResponse.json(
      { error: "Failed to search images" },
      { status: 500 }
    );
  }
}
