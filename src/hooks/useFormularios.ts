import { useState, useCallback } from 'react';
import { airtableService } from '../services/airtable';

export const useFormularios = () => {
  const [formularios, setFormularios] = useState<any[]>([]);
  const [fallbackFormulario, setFallbackFormulario] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const hasFormularioPhotos = (form: any) => {
    if (!form) return false;
    const photoFields = ['Foto general', 'Foto etiqueta', 'Foto roto', 'Foto cuadro'];
    return photoFields.some((field) => Array.isArray(form[field]) && form[field].length > 0);
  };

  const ensureFallbackFormulario = useCallback(async (forms: any[], fallbackKey: string) => {
    if (forms.length > 0) {
      if (hasFormularioPhotos(forms[0])) {
        setFallbackFormulario(null);
        return;
      }
      const formWithPhotos = forms.find((f) => hasFormularioPhotos(f));
      if (formWithPhotos) {
        setFallbackFormulario(formWithPhotos);
        return;
      }
    }

    try {
      const storageKey = 'fallbackFormularios';
      const stored = localStorage.getItem(storageKey);
      const fallbackMap = stored ? JSON.parse(stored) : {};

      let randomForm = fallbackMap[fallbackKey]
        ? await airtableService.getFormularioById(fallbackMap[fallbackKey])
        : null;

      if (!randomForm) {
        randomForm = await airtableService.getRandomFormularioWithPhotos();
        if (randomForm?.id) {
          fallbackMap[fallbackKey] = randomForm.id;
          localStorage.setItem(storageKey, JSON.stringify(fallbackMap));
        }
      }

      setFallbackFormulario(randomForm);
    } catch (err) {
      setFallbackFormulario(null);
    }
  }, []);

  const loadFormularios = useCallback(async (options: {
    formularioIds?: string[];
    expediente?: string;
    direccion?: string;
    nombre?: string;
    isTramitacion?: boolean;
  }) => {
    const { formularioIds, expediente, direccion, nombre, isTramitacion } = options;
    const fallbackKey = expediente || direccion || nombre || 'sin-clave';

    setLoading(true);
    setFormularios([]);

    let data: any[] = [];

    try {
      // 1. Por IDs de linked records
      if (formularioIds && formularioIds.length > 0) {
        data = await airtableService.getFormulariosByIds(formularioIds);
      }

      // 2. Por expediente/número
      if (data.length === 0 && expediente) {
        data = await airtableService.getFormularioByExpediente(expediente);
      }

      // 3. Por datos del cliente
      if (data.length === 0 && (expediente || direccion || nombre)) {
        data = await airtableService.getFormularioByClientInfo({ expediente, direccion, nombre });
      }

      setFormularios(data);

      if (isTramitacion) {
        await ensureFallbackFormulario(data, fallbackKey);
      } else {
        setFallbackFormulario(null);
      }
    } catch (error) {
      console.error('Error loading formularios:', error);
    } finally {
      setLoading(false);
    }
  }, [ensureFallbackFormulario]);

  return {
    formularios,
    fallbackFormulario,
    loading,
    loadFormularios,
    setFormularios,
  };
};
