"use client";

import { useState, useEffect, useCallback } from "react";
import { Customer } from "@/types/database";
import { CustomerFilter } from "@/types/api";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "@/lib/services/supabase";

export function useCustomers(initialFilter?: CustomerFilter, initialPage: number = 1) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<CustomerFilter | undefined>(initialFilter);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCustomers(filter, page, 50);
      setCustomers(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const refresh = useCallback(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const updateFilter = useCallback((newFilter: CustomerFilter) => {
    setFilter(newFilter);
    setPage(1);
  }, []);

  return {
    customers,
    loading,
    error,
    page,
    totalPages,
    total,
    setPage,
    filter,
    updateFilter,
    refresh,
  };
}

export function useCustomer(id: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setCustomer(null);
      setLoading(false);
      return;
    }

    const fetchCustomer = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCustomerById(id);
        if (response.success && response.data) {
          setCustomer(response.data);
        } else {
          setError(response.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar cliente");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  return { customer, loading, error };
}

export function useCustomerMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (customerData: Omit<Customer, "id" | "created_at">) => {
    try {
      setLoading(true);
      setError(null);
      const response = await createCustomer(customerData);
      if (!response.success) {
        throw new Error(response.error || "Error al crear cliente");
      }
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear cliente";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, updates: Partial<Customer>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await updateCustomer(id, updates);
      if (!response.success) {
        throw new Error(response.error || "Error al actualizar cliente");
      }
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar cliente";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await deleteCustomer(id);
      if (!response.success) {
        throw new Error(response.error || "Error al eliminar cliente");
      }
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar cliente";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    create,
    update,
    remove,
    loading,
    error,
  };
}
