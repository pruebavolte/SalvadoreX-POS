import { supabase } from './client';

const BUCKET_NAME = 'product-images';

/**
 * Sube una imagen al bucket de Supabase Storage
 * @param file - Archivo de imagen a subir
 * @param path - Ruta donde se guardará el archivo (ej: "products/123.jpg")
 * @returns URL pública de la imagen
 */
export async function uploadImage(
  file: File,
  path: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return {
        url: null,
        error: 'Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, WebP, GIF)',
      };
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        url: null,
        error: 'El archivo es demasiado grande. Tamaño máximo: 5MB',
      };
    }

    // Subir archivo
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true, // Sobrescribir si existe
      });

    if (error) {
      console.error('Error uploading image:', error);
      return {
        url: null,
        error: error.message,
      };
    }

    // Obtener URL pública
    const { data: publicData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      url: publicData.publicUrl,
      error: null,
    };
  } catch (error: any) {
    console.error('Error in uploadImage:', error);
    return {
      url: null,
      error: error.message || 'Error al subir la imagen',
    };
  }
}

/**
 * Elimina una imagen del bucket
 * @param path - Ruta del archivo a eliminar
 */
export async function deleteImage(path: string): Promise<{ success: boolean; error: string | null }> {
  try {
    // Extraer solo el path si viene una URL completa
    let filePath = path;
    if (path.includes(BUCKET_NAME)) {
      const parts = path.split(`${BUCKET_NAME}/`);
      filePath = parts[parts.length - 1];
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting image:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (error: any) {
    console.error('Error in deleteImage:', error);
    return {
      success: false,
      error: error.message || 'Error al eliminar la imagen',
    };
  }
}

/**
 * Genera un nombre único para el archivo basado en timestamp y nombre original
 * @param originalName - Nombre original del archivo
 * @param prefix - Prefijo opcional (ej: "product")
 * @returns Nombre único para el archivo
 */
export function generateUniqueFileName(originalName: string, prefix: string = 'product'): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${prefix}-${timestamp}-${randomString}.${extension}`;
}

/**
 * Convierte una imagen a WebP para optimizar el tamaño
 * @param file - Archivo de imagen original
 * @param quality - Calidad de la imagen (0-1)
 * @returns Promise con el archivo convertido
 */
export async function convertToWebP(file: File, quality: number = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), {
                type: 'image/webp',
              });
              resolve(webpFile);
            } else {
              reject(new Error('Error al convertir imagen'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Error al cargar imagen'));
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
  });
}

/**
 * Redimensiona una imagen si es muy grande
 * @param file - Archivo de imagen
 * @param maxWidth - Ancho máximo
 * @param maxHeight - Alto máximo
 * @returns Promise con el archivo redimensionado
 */
export async function resizeImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular nuevas dimensiones manteniendo el aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Error al redimensionar imagen'));
            }
          },
          file.type,
          0.9
        );
      };
      img.onerror = () => reject(new Error('Error al cargar imagen'));
    };
    reader.onerror = () => reject(new Error('Error al leer archivo'));
  });
}

/**
 * Procesa y sube una imagen optimizada
 * @param file - Archivo de imagen original
 * @param productId - ID del producto (opcional, se generará uno si no se proporciona)
 * @returns URL pública de la imagen subida
 */
export async function uploadProductImage(
  file: File,
  productId?: string
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Redimensionar si es necesario
    let processedFile = await resizeImage(file, 1200, 1200);

    // Convertir a WebP para mejor compresión (opcional)
    // Si quieres mantener el formato original, comenta esta línea
    // processedFile = await convertToWebP(processedFile, 0.85);

    // Generar nombre único
    const fileName = generateUniqueFileName(
      processedFile.name,
      productId ? `product-${productId}` : 'product'
    );

    // Subir archivo
    return await uploadImage(processedFile, `products/${fileName}`);
  } catch (error: any) {
    console.error('Error in uploadProductImage:', error);
    return {
      url: null,
      error: error.message || 'Error al procesar y subir la imagen',
    };
  }
}
