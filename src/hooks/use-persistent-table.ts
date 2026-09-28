import { useState, useEffect, useCallback, useRef } from "react";
import { SortingState } from "@tanstack/react-table";

export interface UsePersistentTableOptions<TFilters extends Record<string, any>> {
  storageKey: string;
  workspaceId?: string | null;
  defaultFilters?: TFilters;
  initialFilters?: Partial<TFilters>;
  defaultLimit?: number;
  debounceMs?: number;
}

export function usePersistentTable<TFilters extends Record<string, any> = Record<string, any>>(
  options: UsePersistentTableOptions<TFilters>
) {
  const {
    storageKey,
    workspaceId,
    defaultFilters = {} as TFilters,
    initialFilters,
    defaultLimit = 10,
    debounceMs = 400,
  } = options;

  const fullStorageKey = workspaceId ? `${storageKey}_${workspaceId}` : storageKey;
  const isInitialMount = useRef(true);

  // Initialize state from sessionStorage or defaults
  const getInitialState = () => {
    if (typeof window === "undefined") {
      return {
        page: 1,
        limit: defaultLimit,
        search: "",
        sorting: [] as SortingState,
        filters: { ...defaultFilters, ...initialFilters },
      };
    }

    try {
      const saved = sessionStorage.getItem(fullStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          page: parsed.page ?? 1,
          limit: parsed.limit ?? defaultLimit,
          search: parsed.search ?? "",
          sorting: parsed.sorting ?? [],
          filters: { ...defaultFilters, ...parsed.filters, ...initialFilters },
        };
      }
    } catch (e) {
      console.error("Error loading table state from sessionStorage:", e);
    }

    return {
      page: 1,
      limit: defaultLimit,
      search: "",
      sorting: [] as SortingState,
      filters: { ...defaultFilters, ...initialFilters },
    };
  };

  const initialState = getInitialState();

  const [page, setPage] = useState<number>(initialState.page);
  const [limit, setLimit] = useState<number>(initialState.limit);
  const [search, setSearch] = useState<string>(initialState.search);
  const [debouncedSearch, setDebouncedSearch] = useState<string>(initialState.search);
  const [sorting, setSorting] = useState<SortingState>(initialState.sorting);
  const [filters, setFilters] = useState<TFilters>(initialState.filters);

  // Reset state when workspaceId changes
  const prevWorkspaceIdRef = useRef(workspaceId);
  useEffect(() => {
    if (prevWorkspaceIdRef.current !== undefined && prevWorkspaceIdRef.current !== workspaceId) {
      setPage(1);
      setLimit(defaultLimit);
      setSearch("");
      setDebouncedSearch("");
      setSorting([]);
      setFilters(defaultFilters);
    }
    prevWorkspaceIdRef.current = workspaceId;
  }, [workspaceId, defaultLimit, defaultFilters]);

  // Debounce search update & reset page when searching
  useEffect(() => {
    if (isInitialMount.current) {
      return;
    }
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [search, debounceMs]);

  // Mark initial mount done
  useEffect(() => {
    isInitialMount.current = false;
  }, []);

  // Save state to sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stateToSave = {
        page,
        limit,
        search,
        sorting,
        filters,
      };
      sessionStorage.setItem(fullStorageKey, JSON.stringify(stateToSave));
    } catch (e) {
      console.error("Error saving table state to sessionStorage:", e);
    }
  }, [fullStorageKey, page, limit, search, sorting, filters]);

  // Set single filter helper
  const setFilter = useCallback((key: keyof TFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(1);
  }, []);

  // Reset all filters & search to defaults
  const resetFilters = useCallback(() => {
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    setSorting([]);
    setFilters(defaultFilters);
    if (typeof window !== "undefined" && window.location.search) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [defaultFilters]);

  const sortBy = sorting[0]?.id;
  const sortOrder = sorting[0] ? (sorting[0].desc ? "desc" : "asc") : undefined;

  return {
    page,
    setPage,
    limit,
    setLimit,
    search,
    setSearch,
    debouncedSearch,
    sorting,
    setSorting,
    filters,
    setFilters,
    setFilter,
    resetFilters,
    sortBy,
    sortOrder,
  };
}
