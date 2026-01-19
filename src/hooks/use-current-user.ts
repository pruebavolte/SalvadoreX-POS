"use client";

import { useState, useEffect } from "react";

export interface CurrentUser {
  id: string;
  clerk_id: string;
  email: string;
  role: string;
  restaurant_id?: string;
}

/**
 * Hook para obtener información del usuario autenticado actual
 * Incluye su user_id de Supabase que es necesario para generar links del menú
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/auth/current-user");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al obtener usuario");
        }

        setUser(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al obtener usuario");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return { user, loading, error };
}
