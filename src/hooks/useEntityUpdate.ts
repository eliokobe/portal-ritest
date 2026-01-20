import { useState, useCallback } from 'react';

interface UseEntityUpdateOptions<T> {
  updateFn: (id: string, fields: Partial<T>) => Promise<void>;
  onSuccess?: (id: string, updatedFields: Partial<T>) => void;
  onError?: (error: any) => void;
}

export function useEntityUpdate<T>({
  updateFn,
  onSuccess,
  onError,
}: UseEntityUpdateOptions<T>) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateEntity = useCallback(async (id: string, fields: Partial<T>) => {
    setSaving(true);
    setError(null);
    try {
      await updateFn(id, fields);
      if (onSuccess) onSuccess(id, fields);
      return true;
    } catch (err: any) {
      const errorMessage = err.message || 'Error al actualizar el registro';
      setError(errorMessage);
      if (onError) onError(err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [updateFn, onSuccess, onError]);

  return {
    updateEntity,
    saving,
    error,
    setError,
  };
}
