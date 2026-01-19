"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from "react";

type ProductSource = "tenant" | "global" | "external" | "not_found";

interface SearchResult {
  found: boolean;
  type?: "barcode" | "name_search";
  source?: ProductSource;
  product?: {
    id?: string;
    name: string;
    price: number;
    image_url?: string;
    barcode?: string;
    category?: string;
    cost?: number;
    brand?: string;
    description?: string;
    confidence?: number;
  };
  searchedBarcode: string;
  message?: string;
}

type CategoryPosition = "hidden" | "left" | "top" | "bottom";

interface SearchContextType {
  searchValue: string;
  setSearchValue: (value: string) => void;
  searchResult: SearchResult | null;
  setSearchResult: (result: SearchResult | null) => void;
  triggerSearch: () => void;
  registerSearchHandler: (handler: (query: string, isNumberSearch: boolean) => void) => void;
  unregisterSearchHandler: () => void;
  showAddProductModal: boolean;
  setShowAddProductModal: (show: boolean) => void;
  newProductName: string;
  setNewProductName: (name: string) => void;
  newProductBarcode: string;
  setNewProductBarcode: (barcode: string) => void;
  searchType: "barcode" | "name" | null;
  setSearchType: (type: "barcode" | "name" | null) => void;
  categoryPosition: CategoryPosition;
  setCategoryPosition: (position: CategoryPosition) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchValue, setSearchValue] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductBarcode, setNewProductBarcode] = useState("");
  const [searchType, setSearchType] = useState<"barcode" | "name" | null>(null);
  const [categoryPosition, setCategoryPositionState] = useState<CategoryPosition>("hidden");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const searchHandlerRef = useRef<((query: string, isNumberSearch: boolean) => void) | null>(null);

  useEffect(() => {
    const savedPosition = localStorage.getItem("categoryPosition") as CategoryPosition | null;
    if (savedPosition && ["hidden", "left", "top", "bottom"].includes(savedPosition)) {
      setCategoryPositionState(savedPosition);
    }
  }, []);

  const setCategoryPosition = useCallback((position: CategoryPosition) => {
    setCategoryPositionState(position);
    if (typeof window !== "undefined") {
      localStorage.setItem("categoryPosition", position);
    }
  }, []);

  const registerSearchHandler = useCallback((handler: (query: string, isNumberSearch: boolean) => void) => {
    searchHandlerRef.current = handler;
  }, []);

  const unregisterSearchHandler = useCallback(() => {
    searchHandlerRef.current = null;
  }, []);

  const triggerSearch = useCallback(() => {
    if (searchValue.trim() && searchHandlerRef.current) {
      const isNumberSearch = /^\d+$/.test(searchValue.trim());
      setSearchType(isNumberSearch ? "barcode" : "name");
      searchHandlerRef.current(searchValue.trim(), isNumberSearch);
    }
  }, [searchValue]);

  return (
    <SearchContext.Provider
      value={{
        searchValue,
        setSearchValue,
        searchResult,
        setSearchResult,
        triggerSearch,
        registerSearchHandler,
        unregisterSearchHandler,
        showAddProductModal,
        setShowAddProductModal,
        newProductName,
        setNewProductName,
        newProductBarcode,
        setNewProductBarcode,
        searchType,
        setSearchType,
        categoryPosition,
        setCategoryPosition,
        selectedCategory,
        setSelectedCategory,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
