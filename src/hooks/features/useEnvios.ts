import { useState, useEffect, useMemo, useCallback } from 'react';
import { airtableService } from '../../services/airtable';
import { supabaseService } from '../../services/supabase';
import { Envio } from '../../types';
import { calculateBusinessHours } from '../../utils/dateUtils';

interface UseEnviosOptions {
  userClinic?: string;
  userRole?: string;
}

interface CatalogoItem {
  id: string;
  nombre: string;
}

interface ServicioInfo {
  id: string;
  nombre?: string;
  expediente?: string;
  numero?: string;
  cliente?: string;
  telefono?: string;
  direccion?: string;
  poblacion?: string;
  codigoPostal?: string;
  provincia?: string;
  conversationId?: string;
}

const GESTORA_OPERATIVA_FILTROS = [
  'Pendiente de asignar',
  'Pendiente de aceptación',
  'Aceptado',
  'Citado',
  'Citado por técnico',
  'Pendiente de material',
  'En curso',
  'Pendiente técnico'
];

export function useEnvios({ userClinic, userRole }: UseEnviosOptions = {}) {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'requiere-accion' | 'en-espera'>('requiere-accion');
  const [saving, setSaving] = useState(false);
  
  const [catalogos, setCatalogos] = useState<CatalogoItem[]>([]);
  const [serviciosInfo, setServiciosInfo] = useState<ServicioInfo[]>([]);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([]);

  const isGestoraOperativa = userRole === 'Gestora Operativa';
  const isGestoraTecnica = userRole === 'Gestora Técnica';

  const fetchEnvios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await airtableService.getEnvios();
      const allEnvios = data as Envio[];
      setEnvios(allEnvios);

      // Solo crear registros en Supabase para envíos que están en "Requiere acción"
      if (allEnvios.length > 0) {
        const now = new Date();
        const estadosExcluidos = ['Entregado', 'Devuelto', 'Recogida hecha'];
        
        const enviosRequierenAccion = allEnvios.filter(envio => {
          if (envio.estado && estadosExcluidos.includes(envio.estado)) return false;
          if (envio.seguimiento === 'Email enviado') return false;
          if (!envio.fechaEnvio) return false;
          
          const fechaEnvio = new Date(envio.fechaEnvio);
          const businessHours = calculateBusinessHours(fechaEnvio, now);
          return businessHours > 48;
        });

        const identificadores = enviosRequierenAccion
          .map(envio => envio.numero)
          .filter(n => n && !isNaN(Number(n))) as string[];

        if (identificadores.length > 0) {
          supabaseService.ensureRecogidas(identificadores);
        }
      }
    } catch (error) {
      console.error('Error fetching envios:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuxiliarData = useCallback(async () => {
    try {
      const [catalogosData, serviciosData, tecnicosData] = await Promise.all([
        airtableService.getCatalogos(),
        airtableService.getServices(userClinic),
        airtableService.getTechnicians()
      ]);

      setCatalogos(catalogosData);
      setTecnicos(tecnicosData.map((t: any) => ({ id: t.id, nombre: t.nombre })));

      // Aplicar filtros de servicios según el rol
      let serviciosFiltrados = serviciosData;
      if (isGestoraTecnica) {
        const allowedEstadosTecnica = ['Sin contactar', 'Formulario enviado', 'Formulario completado', 'Llamado', 'Citado'];
        serviciosFiltrados = serviciosData.filter((s: any) => s.estado && allowedEstadosTecnica.includes(s.estado));
      } else if (isGestoraOperativa) {
        serviciosFiltrados = serviciosData.filter((s: any) => s.estado && GESTORA_OPERATIVA_FILTROS.includes(s.estado));
      }

      setServiciosInfo(serviciosFiltrados.map((s: any) => ({
        id: s.id,
        nombre: s.nombre,
        expediente: s.expediente,
        numero: s.numero,
        cliente: s.cliente ?? s.nombre,
        telefono: s.telefono,
        direccion: s.direccion,
        poblacion: s.poblacion,
        codigoPostal: s.codigoPostal,
        provincia: s.provincia,
        conversationId: s.conversationId,
      })));
    } catch (error) {
      console.error('Error fetching auxiliar data:', error);
    }
  }, [userClinic, isGestoraOperativa, isGestoraTecnica]);

  useEffect(() => {
    fetchEnvios();
    fetchAuxiliarData();
  }, [fetchEnvios, fetchAuxiliarData]);

  const updateEnvio = async (id: string, fields: Partial<Envio>) => {
    setSaving(true);
    try {
      await airtableService.updateEnvio(id, fields);
      
      // Actualizar estado local
      setEnvios(prev =>
        prev.map(envio => (envio.id === id ? { ...envio, ...fields } : envio))
      );

      // Lógica de sincronización con Supabase
      const currentEnvio = envios.find(e => e.id === id);
      const numero = fields.numero || currentEnvio?.numero;
      
      if (numero && !isNaN(Number(numero))) {
        if (fields.estado === 'Recogida enviada' || fields.estado === 'Recogida hecha' || fields.seguimiento) {
          await supabaseService.completeRecogida(numero.toString());
        }
        if (fields.estado === 'Entregado') {
          await supabaseService.completeTracking(numero.toString());
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error updating envio:', error);
      alert('Error al guardar el cambio');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const createEnvio = async (envioData: any) => {
    setSaving(true);
    try {
      await airtableService.createEnvio(envioData);
      await fetchEnvios();
      return true;
    } catch (error) {
      console.error('Error creating envio:', error);
      alert('Error al crear el envío.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const filteredEnvios = useMemo(() => {
    return envios.filter(envio => {
      const estadosExcluidos = ['Entregado', 'Devuelto', 'Recogida hecha'];
      if (envio.estado && estadosExcluidos.includes(envio.estado)) return false;
      
      const now = new Date();
      
      if (activeTab === 'requiere-accion') {
        if (envio.seguimiento === 'Email enviado') return false;
        if (envio.fechaEnvio) {
          const fechaEnvio = new Date(envio.fechaEnvio);
          const businessHours = calculateBusinessHours(fechaEnvio, now);
          return businessHours > 48;
        }
        return false;
      }
      
      if (activeTab === 'en-espera') {
        if (envio.seguimiento === 'Email enviado') return true;
        if (envio.fechaEnvio) {
          const fechaEnvio = new Date(envio.fechaEnvio);
          const businessHours = calculateBusinessHours(fechaEnvio, now);
          return businessHours <= 48;
        }
        return true;
      }
      
      return false;
    }).filter(envio => {
      if (!searchTerm) return true;
      const needle = searchTerm.toLowerCase();
      const normalizeText = (value?: string | number) => (value ?? '').toString().toLowerCase();
      return (
        normalizeText(envio.seguimiento).includes(needle) ||
        normalizeText(envio.numero).includes(needle) ||
        normalizeText(envio.producto).includes(needle)
      );
    });
  }, [envios, activeTab, searchTerm]);

  const sortedEnvios = useMemo(() => {
    return [...filteredEnvios].sort((a, b) => {
      const aNum = (a.numero ?? '').toString().toLowerCase();
      const bNum = (b.numero ?? '').toString().toLowerCase();
      return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredEnvios]);

  return {
    envios: sortedEnvios,
    loading,
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    saving,
    catalogos,
    serviciosInfo,
    tecnicos,
    updateEnvio,
    createEnvio,
    refresh: fetchEnvios
  };
}
