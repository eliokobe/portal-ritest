import { useState, useEffect, useMemo, useCallback } from 'react';

interface UseEntityListOptions<T> {
  fetchFn: () => Promise<T[]>;
  searchFields: (keyof T)[];
  initialSearchTerm?: string;
  filterFn?: (item: T) => boolean;
  sortFn?: (a: T, b: T) => number;
  dependencies?: any[];
}

export function useEntityList<T>({
  fetchFn,
  searchFields,
  initialSearchTerm = '',
  filterFn,
  sortFn,
  dependencies = [],
}: UseEntityListOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    fetchData();
  }, dependencies);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply custom filter if provided
    if (filterFn) {
      result = result.filter(filterFn);
    }

    // Apply search filter
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((item) => {
        return searchFields.some((field) => {
          const value = item[field];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(term);
        });
      });
    }

    // Apply sort if provided
    if (sortFn) {
      result.sort(sortFn);
    }

    return result;
  }, [data, searchTerm, filterFn, searchFields, sortFn]);

  return {
    data: filteredData,
    rawData: data,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    refresh: fetchData,
    setData,
  };
}
