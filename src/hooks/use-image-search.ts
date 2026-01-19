import { useState, useCallback } from "react";

export interface SearchImage {
  id: string;
  url: string;
  thumbnail: string;
  alt: string;
  photographer?: string;
  photographerUrl?: string;
}

interface UseImageSearchReturn {
  images: SearchImage[];
  loading: boolean;
  error: string | null;
  searchImages: (query: string) => Promise<void>;
  clearImages: () => void;
  currentImageIndex: number;
  nextImage: () => SearchImage | null;
  previousImage: () => SearchImage | null;
  setCurrentImageIndex: (index: number) => void;
}

export function useImageSearch(): UseImageSearchReturn {
  const [images, setImages] = useState<SearchImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const searchImages = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setImages([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/search-images?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error("Error al buscar imágenes");
      }

      const data = await response.json();
      setImages(data.images || []);
      setCurrentImageIndex(0);
    } catch (err) {
      console.error("Error searching images:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearImages = useCallback(() => {
    setImages([]);
    setError(null);
    setCurrentImageIndex(0);
  }, []);

  const nextImage = useCallback(() => {
    if (images.length === 0) return null;

    const nextIndex = (currentImageIndex + 1) % images.length;
    setCurrentImageIndex(nextIndex);
    return images[nextIndex];
  }, [images, currentImageIndex]);

  const previousImage = useCallback(() => {
    if (images.length === 0) return null;

    const prevIndex = currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1;
    setCurrentImageIndex(prevIndex);
    return images[prevIndex];
  }, [images, currentImageIndex]);

  return {
    images,
    loading,
    error,
    searchImages,
    clearImages,
    currentImageIndex,
    nextImage,
    previousImage,
    setCurrentImageIndex,
  };
}
