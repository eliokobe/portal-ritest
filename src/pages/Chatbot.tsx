import React, { useEffect, useState, useMemo } from 'react';
import { Search, X, XCircle, FileText, AlertCircle, ChevronUp, ChevronDown, Paperclip } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

interface Contract {
  id: string;
  Contrato: string;
  'Expediente Ipas'?: string;
  Created?: string;
  'Fecha chatbot'?: string;
  'Fecha PDF'?: string;
  Email?: string;
  'Tipo de vivienda'?: string;
  'Nº de habitantes'?: string;
  Superficie?: string;
  'Nº de dormitorios'?: string;
  'Nº de baños'?: string;
  'Nº de meses de uso al año de la vivienda'?: string;
  'Nº de meses de uso de refrigeración al año'?: string;
  'Nº de meses de uso de calefacción al año'?: string;
  'Tipo de generador'?: string;
  'Año de instalación'?: string;
  'Nº de estancias climatizadas'?: string;
  'Tipo de generador 2'?: string;
  'Año de instalación 2'?: string;
  'Nº de estancias climatizadas 2'?: string;
  'Tipo de generador 3'?: string;
  'Año de instalación 3'?: string;
  'Litros termo'?: string;
  Led?: string;
  'Bajo consumo'?: string;
  Halógenas?: string;
  '¿Tienes placas solares?'?: string;
  '¿Tienes punto de recarga?'?: string;
  Lavavajillas?: string;
  'Usos lavavajillas'?: string;
  Lavadora?: string;
  'Usos lavadora'?: string;
  Horno?: string;
  'Usos horno'?: string;
  Microondas?: string;
  'Usos microondas'?: string;
  'Placa de cocina'?: string;
  'Tipo de placa'?: string;
  'Usos placa'?: string;
  Frigorífico?: string;
  'Unidades frigorífico'?: string;
  Congelador?: string;
  'Unidades congelador'?: string;
  'Unidades ordenador'?: string;
  'Unidades tv'?: string;
  'Robot de cocina'?: string;
  Ventilador?: string;
  Chatbot?: string;
  PDF?: any;
  Comentarios?: string;
}

const STATUS_OPTIONS = [
  '-',
  'Realizado',
  'No disponible',
  'Anulado',
];

const getChatbotStatusColors = (status?: string): { bg: string; text: string } => {
  if (!status || status === '-') return { bg: 'bg-gray-100', text: 'text-gray-800' };
  
  const statusLower = status.toLowerCase();
  
  if (statusLower === 'realizado') {
    return { bg: 'bg-green-100', text: 'text-green-800' };
  }
  
  if (statusLower === 'no disponible') {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
  }
  
  if (statusLower === 'anulado') {
    return { bg: 'bg-red-100', text: 'text-red-800' };
  }
  
  return { bg: 'bg-gray-100', text: 'text-gray-800' };
};

const renderValue = (value: any) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? '✅ SÍ' : '❌ NO';
  if (value === '✅') return '✅ SÍ';
  if (value === '❌') return '❌ NO';
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '—';
    if (value[0] && value[0].url) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((file: any, index: number) => (
            <a
              key={index}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              {file.filename || 'PDF'}
            </a>
          ))}
        </div>
      );
    }
    return value.join(', ');
  }
  
  return String(value);
};

const Chatbot: React.FC = () => {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingComments, setEditingComments] = useState('');
  const [commentingContractId, setCommentingContractId] = useState<string | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [sortByChatbot, setSortByChatbot] = useState(false);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await airtableService.getContracts();
      setContracts(data);
    } catch (error: any) {
      console.error('Error loading contracts:', error);
      setError(error.message || 'Error al cargar contratos');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChatbot = async (contractId: string, value: string) => {
    setSaving(true);
    try {
      await airtableService.updateContractField(contractId, 'Chatbot', value);
      setContracts(prev => prev.map(c => 
        c.id === contractId ? { ...c, Chatbot: value } : c
      ));
    } catch (error) {
      console.error('Error updating chatbot:', error);
      alert('Error al actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  };

  const filteredContracts = useMemo(() => {
    const now = new Date();
    
    // Filtrar contratos:
    // 1. Que hayan pasado más de 7 días desde la fecha de creación
    // 2. Sin PDF y no anulados
    // 3. Con estado "Realizado", con PDF y Fecha PDF de menos de 30 días
    let filtered = contracts.filter(c => {
      // Debug específico para el contrato 945099198
      if (c.Contrato === '945099198') {
        console.log('=== Contrato 945099198 ===');
        console.log('Created:', c.Created);
        console.log('Fecha chatbot:', c['Fecha chatbot']);
        console.log('Estado:', c.Chatbot);
        console.log('PDF:', c.PDF);
        console.log('Fecha PDF:', c['Fecha PDF']);
      }
      
      // Verificar que hayan pasado más de 7 días desde la creación
      const fechaCreacion = c.Created || c['Fecha chatbot'];
      if (fechaCreacion) {
        try {
          const fecha = new Date(fechaCreacion);
          const diffInDays = (now.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24);
          
          if (c.Contrato === '945099198') {
            console.log('Días desde creación:', diffInDays);
          }
          
          if (diffInDays <= 7) {
            if (c.Contrato === '945099198') {
              console.log('Rechazado: menos de 7 días');
            }
            return false; // No mostrar si han pasado 7 días o menos
          }
        } catch {
          if (c.Contrato === '945099198') {
            console.log('Rechazado: error parsing fecha');
          }
          return false;
        }
      } else {
        if (c.Contrato === '945099198') {
          console.log('Rechazado: no tiene fecha de creación');
        }
        return false; // No mostrar si no tiene fecha de creación
      }
      
      const hasPDF = c.PDF && Array.isArray(c.PDF) && c.PDF.length > 0;
      const isAnulado = c.Chatbot === 'Anulado';
      const isRealizado = c.Chatbot === 'Realizado';
      
      if (c.Contrato === '945099198') {
        console.log('hasPDF:', hasPDF);
        console.log('isAnulado:', isAnulado);
        console.log('isRealizado:', isRealizado);
      }
      
      // Excluir anulados siempre
      if (isAnulado) {
        if (c.Contrato === '945099198') {
          console.log('Rechazado: está anulado');
        }
        return false;
      }
      
      // Caso 1: Sin PDF (mostrar cualquier estado excepto Anulado)
      if (!hasPDF) {
        if (c.Contrato === '945099198') {
          console.log('Aceptado: sin PDF y no anulado');
        }
        return true;
      }
      
      // Caso 2: Con PDF
      if (hasPDF) {
        // Si está en estado Realizado, solo mostrar si es reciente (menos de 30 días)
        if (isRealizado && c['Fecha PDF']) {
          try {
            const fechaPDF = new Date(c['Fecha PDF']);
            const diffInDays = (now.getTime() - fechaPDF.getTime()) / (1000 * 60 * 60 * 24);
            return diffInDays <= 30;
          } catch {
            return false;
          }
        }
        // Si tiene PDF pero NO está Realizado, lo mostramos para que el usuario pueda gestionarlo
        return true;
      }
      
      return false;
    });

    // Filtro de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.Contrato?.toLowerCase().includes(term) ||
        c.Email?.toLowerCase().includes(term) ||
        c['Expediente Ipas']?.toLowerCase().includes(term)
      );
    }

    // Ordenamiento
    if (sortByChatbot) {
      filtered = [...filtered].sort((a, b) => {
        const statusA = a.Chatbot || '';
        const statusB = b.Chatbot || '';
        return statusA.localeCompare(statusB);
      });
    }

    return filtered;
  }, [contracts, searchTerm, sortByChatbot]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-600 font-medium">Cargando contratos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <XCircle className="h-12 w-12 text-red-500" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">Error al cargar contratos</h3>
          <p className="text-gray-600 mt-2">{error}</p>
          <button
            onClick={loadContracts}
            className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-hover transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Chatbot</h1>
          <p className="text-gray-600 mt-2">Gestión de contratos y asesoramiento energético.</p>
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por contrato, email o expediente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contrato
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={() => setSortByChatbot(!sortByChatbot)}
                    className="flex items-center gap-1 hover:text-gray-700"
                  >
                    Estado
                    {sortByChatbot ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PDF
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comentarios
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No se encontraron contratos.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="text-brand-primary hover:text-brand-hover font-medium text-sm"
                      >
                        {contract.Contrato}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={contract.Chatbot || '-'}
                        onChange={(e) => handleUpdateChatbot(contract.id, e.target.value)}
                        disabled={saving}
                        className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getChatbotStatusColors(contract.Chatbot).bg} ${getChatbotStatusColors(contract.Chatbot).text}`}
                        style={{ 
                          appearance: 'none', 
                          backgroundImage: 'none',
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem',
                          minWidth: '140px'
                        }}
                      >
                        {STATUS_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {contract.PDF && Array.isArray(contract.PDF) && contract.PDF.length > 0 && (
                          renderValue(contract.PDF)
                        )}
                        <label className={`cursor-pointer transition-colors ${
                          contract.PDF && Array.isArray(contract.PDF) && contract.PDF.length > 0 
                            ? 'text-blue-600 hover:text-blue-800' 
                            : 'text-gray-400 hover:text-brand-primary'
                        }`}>
                          <Paperclip className="h-5 w-5" />
                          <input
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              
                              if (file.type !== 'application/pdf') {
                                alert('Por favor selecciona un archivo PDF');
                                e.target.value = '';
                                return;
                              }
                              
                              setSaving(true);
                              try {
                                const result = await airtableService.uploadContractPDF(contract.id, file);
                                
                                // Actualizar el estado local inmediatamente
                                if (result && result.id) {
                                  setContracts(prev => prev.map(c => 
                                    c.id === contract.id ? { ...c, PDF: result.fields?.PDF || result.PDF || [{ url: '#', filename: file.name }] } : c
                                  ));
                                }

                                // Recargar contratos para asegurar sincronización total
                                await loadContracts();
                                alert('PDF subido correctamente');
                              } catch (err: any) {
                                console.error('Error uploading PDF:', err);
                                alert('Error al subir el PDF: ' + (err.response?.data?.error || err.message));
                              } finally {
                                setSaving(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(contract['Fecha chatbot'])}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setCommentingContractId(contract.id);
                          setEditingComments(contract.Comentarios || '');
                          setShowCommentsModal(true);
                        }}
                        className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 max-w-xs truncate"
                      >
                        <span className="truncate">{contract.Comentarios || '—'}</span>
                        <AlertCircle className="h-4 w-4 flex-shrink-0 opacity-50" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de detalles del contrato */}
      {selectedContract && (
        <div
          className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
          onClick={() => setSelectedContract(null)}
        >
          <div className="min-h-screen flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-6xl bg-white rounded-2xl shadow-lg border border-gray-200 my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setSelectedContract(null)}
                  className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Ficha Contrato {selectedContract.Contrato}</h2>
                </div>

                {/* Información básica de vivienda */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Información de la vivienda</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Email</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract.Email)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Tipo Vivienda</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Tipo de vivienda'])}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Habitantes</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Nº de habitantes'])}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Superficie</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract.Superficie)} m²</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Dormitorios</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Nº de dormitorios'])}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Baños</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Nº de baños'])}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Meses Uso/Año</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Nº de meses de uso al año de la vivienda'])}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Uso Refrigeración</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Nº de meses de uso de refrigeración al año'])}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Uso Calefacción</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Nº de meses de uso de calefacción al año'])}</p>
                    </div>
                  </div>
                </div>

                {/* Climatización y Energía */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-3">Climatización y Energía</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-2">Aire Acondicionado</p>
                      <p className="text-sm font-semibold text-gray-900">{renderValue(selectedContract['Tipo de generador'])}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Año: {renderValue(selectedContract['Año de instalación'])} | Estancias: {renderValue(selectedContract['Nº de estancias climatizadas'])}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-2">Calefacción</p>
                      <p className="text-sm font-semibold text-gray-900">{renderValue(selectedContract['Tipo de generador 2'])}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Año: {renderValue(selectedContract['Año de instalación 2'])} | Estancias: {renderValue(selectedContract['Nº de estancias climatizadas 2'])}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-2">Agua Caliente</p>
                      <p className="text-sm font-semibold text-gray-900">{renderValue(selectedContract['Tipo de generador 3'])}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Año: {renderValue(selectedContract['Año de instalación 3'])} | Capacidad: {renderValue(selectedContract['Litros termo'])}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Iluminación y Mejoras */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-3">Iluminación y Mejoras</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase">LED</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract.Led)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase">Fluorescentes</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['Bajo consumo'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase">Halógenas</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract.Halógenas)}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase">Placas Solares</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['¿Tienes placas solares?'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase">Punto Carga EV</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{renderValue(selectedContract['¿Tienes punto de recarga?'])}</p>
                    </div>
                  </div>
                </div>

                {/* Electrodomésticos */}
                <div>
                  <h3 className="text-lg font-semibold text-blue-600 mb-3">Electrodomésticos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Lavavajillas</p>
                      <p className="text-sm font-medium text-gray-900">{renderValue(selectedContract.Lavavajillas)}</p>
                      <p className="text-xs text-gray-600 mt-1">Usos/Semana: {renderValue(selectedContract['Usos lavavajillas'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Lavadora</p>
                      <p className="text-sm font-medium text-gray-900">{renderValue(selectedContract.Lavadora)}</p>
                      <p className="text-xs text-gray-600 mt-1">Usos/Semana: {renderValue(selectedContract['Usos lavadora'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Horno</p>
                      <p className="text-sm font-medium text-gray-900">{renderValue(selectedContract.Horno)}</p>
                      <p className="text-xs text-gray-600 mt-1">Usos: {renderValue(selectedContract['Usos horno'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Microondas</p>
                      <p className="text-sm font-medium text-gray-900">{renderValue(selectedContract.Microondas)}</p>
                      <p className="text-xs text-gray-600 mt-1">Usos/Semana: {renderValue(selectedContract['Usos microondas'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Placa Cocina</p>
                      <p className="text-sm font-medium text-gray-900">{renderValue(selectedContract['Placa de cocina'])}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tipo: {renderValue(selectedContract['Tipo de placa'])} | Usos: {renderValue(selectedContract['Usos placa'])}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Frigorífico</p>
                      <p className="text-sm font-medium text-gray-900">{renderValue(selectedContract.Frigorífico)}</p>
                      <p className="text-xs text-gray-600 mt-1">Unidades: {renderValue(selectedContract['Unidades frigorífico'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Congelador</p>
                      <p className="text-sm font-medium text-gray-900">{renderValue(selectedContract.Congelador)}</p>
                      <p className="text-xs text-gray-600 mt-1">Unidades: {renderValue(selectedContract['Unidades congelador'])}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 uppercase mb-1">Otros equipos</p>
                      <div className="text-sm text-gray-900 space-y-1">
                        <p>Ordenador: {renderValue(selectedContract['Unidades ordenador'])}</p>
                        <p>TV: {renderValue(selectedContract['Unidades tv'])}</p>
                        <p>Robot: {renderValue(selectedContract['Robot de cocina'])}</p>
                        <p>Ventilador: {renderValue(selectedContract.Ventilador)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => setSelectedContract(null)}
                    className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-hover transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de comentarios */}
      {showCommentsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowCommentsModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Comentarios</h2>
            {editingComments && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                <p className="text-sm text-gray-900 whitespace-pre-line">{editingComments}</p>
              </div>
            )}
            <div className="space-y-3">
              <textarea
                id="new-comment-chatbot"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none"
                placeholder="Escribe un nuevo comentario..."
                disabled={saving}
              />
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const textarea = document.getElementById('new-comment-chatbot') as HTMLTextAreaElement;
                    const newComment = textarea?.value?.trim();
                    
                    if (!newComment) {
                      alert('Por favor escribe un comentario');
                      return;
                    }

                    setSaving(true);
                    try {
                      const now = new Date();
                      const day = String(now.getDate()).padStart(2, '0');
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const year = now.getFullYear();
                      const hours = String(now.getHours()).padStart(2, '0');
                      const minutes = String(now.getMinutes()).padStart(2, '0');
                      const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}`;
                      
                      const userName = user?.name || 'Usuario';
                      const formattedComment = `${formattedDate} - ${userName}: ${newComment}`;
                      
                      const updatedComments = editingComments 
                        ? `${formattedComment}\n\n${editingComments}`
                        : formattedComment;
                      
                      await airtableService.updateContractField(commentingContractId!, 'Comentarios', updatedComments);
                      
                      setContracts((prev) => prev.map((c) =>
                        c.id === commentingContractId ? { ...c, Comentarios: updatedComments } : c
                      ));
                      
                      setEditingComments(updatedComments);
                      textarea.value = '';
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Error al guardar el comentario');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-hover transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Agregar Comentario'}
                </button>
                <button
                  onClick={() => setShowCommentsModal(false)}
                  disabled={saving}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatbot;
