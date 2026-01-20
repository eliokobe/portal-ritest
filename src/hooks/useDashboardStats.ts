import { useState, useEffect, useCallback } from 'react';
import { airtableService } from '../services/airtable';
import { supabaseService } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DashboardStats } from '../types';

export interface AdminStats {
  unsynchronizedCount: number;
  synchronizedTodayCount: number;
  enviosPendientesCount: number;
  reparacionesPendientesCount: number;
}

export interface TechStats {
  assignedByDay: { date: string; count: number }[];
  resolvedByDay: { date: string; count: number }[];
  clientesPendientes: number;
  clientesResueltosHoy: number;
  promedioResolucionRemotaMes: number;
  promedioVelocidadResolucionMes: number;
}

export interface TechRemoteStats {
  weeklyData: { week: string; remotePercentage: number; totalServices: number }[];
}

export interface Tech24hStats {
  weeklyData: { week: string; percentage24h: number; totalCases: number }[];
}

export interface AsesoramientosStats {
  totalRegistros: number;
  informesToday: number;
}

export interface AsesoramientosEstadosStats {
  estadosData: { name: string; value: number; percentage: number }[];
}

export interface TimeStats {
  dailyData: { date: string; avgHours: number; count: number }[];
}

export interface Trabajador {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export const useDashboardStats = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [techStats, setTechStats] = useState<TechStats | null>(null);
  const [techRemoteStats, setTechRemoteStats] = useState<TechRemoteStats | null>(null);
  const [tech24hStats, setTech24hStats] = useState<Tech24hStats | null>(null);
  const [asesoramientosStats, setAsesoramientosStats] = useState<AsesoramientosStats | null>(null);
  const [asesoramientosEstadosStats, setAsesoramientosEstadosStats] = useState<AsesoramientosEstadosStats | null>(null);
  const [tramitacionTimeStats, setTramitacionTimeStats] = useState<TimeStats | null>(null);
  const [recogidaTimeStats, setRecogidaTimeStats] = useState<TimeStats | null>(null);
  const [asesoramientoTimeStats, setAsesoramientoTimeStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [selectedTrabajador, setSelectedTrabajador] = useState<Trabajador | null>(null);

  const isAdministrativa = user?.role === 'Administrativa';
  const isTecnico = user?.role === 'Técnico';
  const isResponsable = user?.role === 'Responsable';

  const clearStats = useCallback(() => {
    setStats(null);
    setAdminStats(null);
    setTechStats(null);
    setTechRemoteStats(null);
    setTech24hStats(null);
    setAsesoramientosStats(null);
    setAsesoramientosEstadosStats(null);
    setTramitacionTimeStats(null);
    setRecogidaTimeStats(null);
    setAsesoramientoTimeStats(null);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      if (isResponsable) {
        const workers = await airtableService.getWorkers();
        setTrabajadores(workers);
        if (!selectedTrabajador) {
          setLoading(false);
          return;
        }
      }

      if (isAdministrativa || (isResponsable && selectedTrabajador?.rol === 'Administrativa')) {
        const [adminData, asesoData, asesoEstadosData, timeData, recogidaData, asesoramientoData] = await Promise.all([
          airtableService.getAdminDashboardStats(),
          airtableService.getAsesoramientosStats(),
          airtableService.getAsesoramientosEstadosStats(),
          airtableService.getTramitacionTimeStats(),
          airtableService.getRecogidaTimeStats(),
          airtableService.getAsesoramientoTimeStats()
        ]);
        setAdminStats(adminData);
        setAsesoramientosStats(asesoData);
        setAsesoramientosEstadosStats(asesoEstadosData);
        setTramitacionTimeStats(timeData);
        setRecogidaTimeStats(recogidaData);
        setAsesoramientoTimeStats(asesoramientoData);
      } else if (isTecnico || (isResponsable && selectedTrabajador?.rol === 'Técnico')) {
        const targetId = isTecnico ? user?.id : selectedTrabajador?.id;
        const targetEmail = isTecnico ? user?.email : selectedTrabajador?.email;
        
        const [data, remoteData, data24h] = await Promise.all([
          airtableService.getTechnicianDashboardStats(targetId, targetEmail),
          airtableService.getTechnicianRemoteResolutionByWeek(targetId, targetEmail),
          supabaseService.getCasosGestionados24h()
        ]);
        setTechStats(data);
        setTechRemoteStats(remoteData);
        setTech24hStats(data24h);
      } else if (!isResponsable) {
        const data = await airtableService.getDashboardStats();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [isAdministrativa, isTecnico, isResponsable, user?.id, user?.email, selectedTrabajador]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    adminStats,
    techStats,
    techRemoteStats,
    tech24hStats,
    asesoramientosStats,
    asesoramientosEstadosStats,
    tramitacionTimeStats,
    recogidaTimeStats,
    asesoramientoTimeStats,
    loading,
    trabajadores,
    selectedTrabajador,
    setSelectedTrabajador,
    clearStats,
    isAdministrativa,
    isTecnico,
    isResponsable,
    user
  };
};
