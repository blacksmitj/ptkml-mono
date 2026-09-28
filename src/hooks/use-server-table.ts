import { useState, useEffect } from "react";
import { SortingState } from "@tanstack/react-table";

export interface UseServerTableOptions {
  defaultLimit?: number;
  debounceMs?: number;
}

export function useServerTable(options: UseServerTableOptions = {}) {
  const { defaultLimit = 10, debounceMs = 400 } = options;

  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(defaultLimit);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Debouncing search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(handler);
  }, [search, debounceMs]);

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
    sortBy,
    sortOrder,
  };
}
export type ServerTableState = ReturnType<typeof useServerTable>;
