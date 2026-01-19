import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// Types
export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    customDomain?: string;
  };
  owner_email: string;
  vertical_id?: string;
  vertical?: {
    id: string;
    name: string;
    display_name: string;
    icon?: string;
  };
  plan: "free" | "pro" | "enterprise";
  enabled_modules?: Record<string, boolean>;
  settings?: Record<string, any>;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBrandRequest {
  name: string;
  slug: string;
  description?: string;
  owner_email: string;
  vertical_id?: string;
  plan?: "free" | "pro" | "enterprise";
  branding?: Brand["branding"];
  enabled_modules?: Record<string, boolean>;
  settings?: Record<string, any>;
}

export interface UpdateBrandRequest extends Partial<CreateBrandRequest> {
  active?: boolean;
}

export interface BrandConfig {
  brand: Brand;
  vertical?: {
    id: string;
    name: string;
    display_name: string;
    default_modules?: Record<string, boolean>;
  };
  modules: Record<string, boolean>;
  settings: Record<string, any>;
}

/**
 * Custom hook for managing brands
 * @param brandId - Optional brand ID for single brand queries
 */
export function useBrands(brandId?: string) {
  const queryClient = useQueryClient();

  // Fetch all brands or single brand
  const brandsQuery = useQuery({
    queryKey: ["brands", brandId],
    queryFn: async () => {
      const url = brandId
        ? `/api/brands?id=${brandId}`
        : "/api/brands";

      const response = await fetch(url);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch brands");
      }

      return data.data as Brand | Brand[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch brand configuration
  const configQuery = useQuery({
    queryKey: ["brand-config", brandId],
    queryFn: async () => {
      if (!brandId) throw new Error("Brand ID required");

      const response = await fetch(`/api/brands/${brandId}/config`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch brand config");
      }

      return data.data as BrandConfig;
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000,
  });

  // Create brand mutation
  const createBrand = useMutation({
    mutationFn: async (newBrand: CreateBrandRequest) => {
      const response = await fetch("/api/brands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBrand),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create brand");
      }

      return data.data as Brand;
    },
    onSuccess: (newBrand) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success(`Marca "${newBrand.name}" creada exitosamente`);
    },
    onError: (error: Error) => {
      toast.error(`Error al crear marca: ${error.message}`);
    },
  });

  // Update brand mutation
  const updateBrand = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateBrandRequest;
    }) => {
      const response = await fetch(`/api/brands?id=${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update brand");
      }

      return data.data as Brand;
    },
    onSuccess: (updatedBrand) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands", updatedBrand.id] });
      queryClient.invalidateQueries({ queryKey: ["brand-config", updatedBrand.id] });
      toast.success(`Marca "${updatedBrand.name}" actualizada`);
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar marca: ${error.message}`);
    },
  });

  // Delete brand mutation
  const deleteBrand = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/brands?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to delete brand");
      }

      return data;
    },
    onSuccess: (_, brandId) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.removeQueries({ queryKey: ["brands", brandId] });
      queryClient.removeQueries({ queryKey: ["brand-config", brandId] });
      toast.success("Marca eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar marca: ${error.message}`);
    },
  });

  // Toggle module for brand
  const toggleModule = useMutation({
    mutationFn: async ({
      brandId,
      moduleName,
      enabled,
    }: {
      brandId: string;
      moduleName: string;
      enabled: boolean;
    }) => {
      // First, fetch current enabled_modules
      const currentBrand = queryClient.getQueryData<Brand>(["brands", brandId]);
      const currentModules = currentBrand?.enabled_modules || {};

      const updates = {
        enabled_modules: {
          ...currentModules,
          [moduleName]: enabled,
        },
      };

      return updateBrand.mutateAsync({ id: brandId, updates });
    },
    onSuccess: (_, { moduleName, enabled }) => {
      toast.success(
        `Módulo "${moduleName}" ${enabled ? "activado" : "desactivado"}`
      );
    },
  });

  return {
    // Data
    brands: brandsQuery.data,
    brand: brandId && !Array.isArray(brandsQuery.data) ? brandsQuery.data : null,
    config: configQuery.data,

    // Loading states
    isLoading: brandsQuery.isLoading,
    isLoadingConfig: configQuery.isLoading,

    // Error states
    error: brandsQuery.error,
    configError: configQuery.error,

    // Mutations
    createBrand,
    updateBrand,
    deleteBrand,
    toggleModule,

    // Mutation states
    isCreating: createBrand.isPending,
    isUpdating: updateBrand.isPending,
    isDeleting: deleteBrand.isPending,

    // Refetch
    refetch: brandsQuery.refetch,
    refetchConfig: configQuery.refetch,
  };
}

/**
 * Custom hook for managing verticals
 */
export function useVerticals() {
  const verticalsQuery = useQuery({
    queryKey: ["verticals"],
    queryFn: async () => {
      const response = await fetch("/api/verticals");
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch verticals");
      }

      return data.data as Array<{
        id: string;
        name: string;
        display_name: string;
        description?: string;
        icon?: string;
        default_modules?: Record<string, boolean>;
        default_settings?: Record<string, any>;
        active: boolean;
      }>;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (verticals rarely change)
  });

  return {
    verticals: verticalsQuery.data || [],
    isLoading: verticalsQuery.isLoading,
    error: verticalsQuery.error,
    refetch: verticalsQuery.refetch,
  };
}
