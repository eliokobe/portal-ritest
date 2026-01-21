import { useState, useEffect, useMemo, useCallback } from 'react';
import { airtableService } from '../../services/airtable';
import { Registro } from '../../types';
import { parseCitaInput } from '../../utils/dateUtils';

interface UseRegistrosOptions {
  userRole?: string;
}

export function useRegistros({ userRole }: UseRegistrosOptions = {}) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingCita, setSavingCita] = useState(false);
  const [savingComentarios, setSavingComentarios] = useState(false);
  const [updatingTramitado, setUpdatingTramitado] = useState<string | null>(null);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const data = await airtableService.getRegistros();
      setRegistros(data);
    } catch (error) {
      console.error('Error fetching registros:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
  }, [fetchRegistros]);

  const handleUpdateStatus = async (registroId: string, newStatus: string) => {
    if (savingStatus) return false;
    setSavingStatus(true);
    try {
      await airtableService.updateRegistro(registroId, { estado: newStatus });
      setRegistros(prev =>
        prev.map(r => r.id === registroId ? { ...r, estado: newStatus } : r)
      );
      return true;
    } catch (error) {
      alert('Error al actualizar el estado');
      return false;
    } finally {
      setSavingStatus(false);
    }
  };

  const handleUpdateCita = async (registroId: string, newCita: string) => {
    if (savingCita) return false;
    setSavingCita(true);
    try {
      const date = parseCitaInput(newCita);
      if (!date) {
        alert('Fecha y hora inválidas');
        return false;
      }
      const citaISO = date.toISOString();
      await airtableService.updateRegistro(registroId, { cita: citaISO });
      setRegistros(prev =>
        prev.map(r => r.id === registroId ? { ...r, cita: citaISO } : r)
      );
      return true;
    } catch (error) {
      alert('Error al actualizar la cita');
      return false;
    } finally {
      setSavingCita(false);
    }
  };

  const handleUpdateComentarios = async (registroId: string, newComentarios: string) => {
    if (savingComentarios) return false;
    setSavingComentarios(true);
    try {
      await airtableService.updateRegistro(registroId, { comentarios: newComentarios });
      setRegistros(prev =>
        prev.map(r => r.id === registroId ? { ...r, comentarios: newComentarios } : r)
      );
      return true;
    } catch (error) {
      alert('Error al actualizar los comentarios');
      return false;
    } finally {
      setSavingComentarios(false);
    }
  };

  const handleMarkTramitado = async (registroId: string) => {
    if (updatingTramitado) return false;
    setUpdatingTramitado(registroId);
    try {
      await airtableService.updateRegistro(registroId, { tramitado: true });
      setRegistros(prev => prev.filter(r => r.id !== registroId));
      return true;
    } catch (error) {
      alert('Error al marcar como tramitado');
      return false;
    } finally {
      setUpdatingTramitado(null);
    }
  };

  const handleUpdateIpartner = async (registroId: string, newValue: string) => {
    try {
      await airtableService.updateRegistro(registroId, { ipartner: newValue });
      setRegistros(prev =>
        prev.map(r => r.id === registroId ? { ...r, ipartner: newValue, tramitado: true } : r)
      );
      return true;
    } catch (error) {
      alert('Error al actualizar ipartner');
      return false;
    }
  };

  const filteredRegistros = useMemo(() => {
    return registros.filter(registro => {
      if (registro.tramitado) return false;

      const matchesSearch = !searchTerm ||
        registro.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registro.telefono?.includes(searchTerm) ||
        registro.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registro.direccion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        registro.contrato?.toString().includes(searchTerm);

      const ipartnerExcluidos = ['No interesado', 'Ilocalizable', 'Facturado', 'Cancelado'];
      const isIpartnerExcluded = registro.ipartner && ipartnerExcluidos.includes(registro.ipartner);

      const isCitadoWithoutPdf = registro.estado === 'Citado' && (!registro.pdf || registro.pdf.length === 0);
      const isInformeWithoutPdf = registro.estado === 'Informe' && (!registro.pdf || registro.pdf.length === 0);

      const isInformeWithRecentCitedIpartnerAndNoPdf =
        registro.estado === 'Informe' &&
        registro.ipartner === 'Citado' &&
        (!registro.pdf || registro.pdf.length === 0) &&
        registro.fechaIpartner &&
        (() => {
          const fechaIpartner = new Date(registro.fechaIpartner);
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return fechaIpartner > sevenDaysAgo;
        })();

      return matchesSearch && !isIpartnerExcluded && !isCitadoWithoutPdf && !isInformeWithoutPdf && !isInformeWithRecentCitedIpartnerAndNoPdf;
    });
  }, [registros, searchTerm]);

  return {
    registros: filteredRegistros,
    allRegistros: registros,
    loading,
    searchTerm,
    setSearchTerm,
    savingStatus,
    savingCita,
    savingComentarios,
    updatingTramitado,
    handleUpdateStatus,
    handleUpdateCita,
    handleUpdateComentarios,
    handleMarkTramitado,
    handleUpdateIpartner,
    refresh: fetchRegistros
  };
}
