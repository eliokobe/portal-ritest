import React, { useEffect, useState, useMemo } from 'react';
import { Search, Info, Star, X, MessageCircle } from 'lucide-react';
import { airtableService } from '../services/airtable';

interface Codigo {
  id: string;
  codigo?: string;
  estado?: string;
}

interface Valoracion {
  id: string;
  servicios?: string[]; // IDs de los servicios linked
  cliente?: string; // Nombre del cliente obtenido del servicio
  telefono?: string; // Teléfono obtenido del servicio
  conversationId?: string; // ID de conversación de Chatwoot obtenido del servicio
  valoracionCliente?: number;
  estado?: string;
  codigos?: string[]; // IDs de los códigos linked
  codigosData?: Codigo[]; // Datos completos de los códigos
}

const ESTADO_OPTIONS = ['Esperando prueba', 'Validado'];

const Valoraciones: React.FC = () => {
  const [valoraciones, setValoraciones] = useState<Valoracion[]>([]);
  const [codigosDisponibles, setCodigosDisponibles] = useState<Codigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedValoracionForCodigos, setSelectedValoracionForCodigos] = useState<Valoracion | null>(null);
  const [tempSelectedCodigos, setTempSelectedCodigos] = useState<string[]>([]);
  const [showCodigoModal, setShowCodigoModal] = useState(false);
  const [codigoAsignado, setCodigoAsignado] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadValoraciones = async () => {
      setLoading(true);
      try {
        
        const data = await airtableService.getValoraciones();
        
        if (isMounted) {
          setValoraciones(data);
        }
      } catch (error: any) {
        if (isMounted) {
          const errorMessage = error.message || 'Error desconocido al cargar valoraciones';
          alert(`Error al cargar valoraciones: ${errorMessage}`);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const loadCodigos = async () => {
      try {
        const data = await airtableService.getCodigosSinEnviar();
        setCodigosDisponibles(data);
      } catch (error) {
        // Error silencioso al cargar códigos
      }
    };

    loadValoraciones();
    loadCodigos();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredValoraciones = useMemo(() => {
    // Filtrar primero por estado: mostrar solo "Esperando prueba"
    const valoracionesPendientes = valoraciones.filter((v) => {
      const estado = v.estado?.trim() || '';
      return estado.toLowerCase() === 'esperando prueba';
    });
    
    
    if (!searchTerm.trim()) return valoracionesPendientes;
    
    const term = searchTerm.toLowerCase();
    return valoracionesPendientes.filter((v) => {
      const cliente = v.cliente?.toLowerCase() || '';
      const telefono = v.telefono?.toLowerCase() || '';
      const estado = v.estado?.toLowerCase() || '';
      
      return cliente.includes(term) || telefono.includes(term) || estado.includes(term);
    });
  }, [valoraciones, searchTerm]);

  const handleEstadoChange = async (valoracion: Valoracion, newEstado: string) => {
    if (!newEstado || newEstado === valoracion.estado) return;

    setSaving(true);
    try {
      // Si el estado es "Validado", asignar automáticamente el primer código disponible
      if (newEstado === 'Validado') {
        // Buscar el primer código sin enviar que no esté ya asignado a esta valoración
        const codigosYaAsignados = valoracion.codigos || [];
        const primerCodigoDisponible = codigosDisponibles.find(
          (codigo) => !codigosYaAsignados.includes(codigo.id)
        );

        if (primerCodigoDisponible) {
          // Agregar el código a la lista de códigos de la valoración
          const nuevosCodigosIds = [...codigosYaAsignados, primerCodigoDisponible.id];
          
          // Actualizar códigos en Airtable
          await airtableService.updateValoracionCodigos(valoracion.id, nuevosCodigosIds);
          
          // Cambiar el estado del código a "Enviado"
          await airtableService.updateCodigoEstado(primerCodigoDisponible.id, 'Enviado');
          
          // Actualizar estado en Airtable
          await airtableService.updateValoracionEstado(valoracion.id, newEstado);
          
          // Actualizar estado local
          const updatedValoraciones = valoraciones.map((v) =>
            v.id === valoracion.id 
              ? { ...v, estado: newEstado, codigos: nuevosCodigosIds } 
              : v
          );
          setValoraciones(updatedValoraciones);

          // Remover el código de la lista de disponibles
          setCodigosDisponibles((prev) => prev.filter((c) => c.id !== primerCodigoDisponible.id));

          // Mostrar modal con el código asignado
          setCodigoAsignado(primerCodigoDisponible.codigo || primerCodigoDisponible.id);
          setShowCodigoModal(true);
        } else {
          // Si no hay códigos disponibles, solo actualizar el estado
          await airtableService.updateValoracionEstado(valoracion.id, newEstado);
          
          const updatedValoraciones = valoraciones.map((v) =>
            v.id === valoracion.id ? { ...v, estado: newEstado } : v
          );
          setValoraciones(updatedValoraciones);
          
          alert('No hay códigos disponibles con estado "Sin enviar"');
        }
      } else {
        // Para otros estados, solo actualizar el estado
        await airtableService.updateValoracionEstado(valoracion.id, newEstado);
        
        const updatedValoraciones = valoraciones.map((v) =>
          v.id === valoracion.id ? { ...v, estado: newEstado } : v
        );
        setValoraciones(updatedValoraciones);
      }
    } catch (error) {
      alert('Error al actualizar el estado');
    } finally {
      setSaving(false);
    }
  };

  const handleCodigosChange = async (valoracion: Valoracion, newCodigosIds: string[]) => {
    setSaving(true);
    try {
      await airtableService.updateValoracionCodigos(valoracion.id, newCodigosIds);
      
      const updatedValoraciones = valoraciones.map((v) =>
        v.id === valoracion.id ? { ...v, codigos: newCodigosIds } : v
      );
      setValoraciones(updatedValoraciones);
      setSelectedValoracionForCodigos(null);
    } catch (error) {
      alert('Error al actualizar los códigos');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCodigo = (codigoId: string) => {
    setTempSelectedCodigos((prev) => {
      if (prev.includes(codigoId)) {
        return prev.filter((id) => id !== codigoId);
      } else {
        return [...prev, codigoId];
      }
    });
  };

  const handleSaveCodigos = () => {
    if (selectedValoracionForCodigos) {
      handleCodigosChange(selectedValoracionForCodigos, tempSelectedCodigos);
    }
  };

  const handleCopyCodigo = () => {
    navigator.clipboard.writeText(codigoAsignado);
    alert('Código copiado al portapapeles');
  };

  const getEstadoColors = (estado?: string) => {
    switch (estado) {
      case 'Esperando prueba':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
      case 'Validado':
        return { bg: 'bg-green-100', text: 'text-green-800' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800' };
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
        </div>
        <div className="text-gray-500">Cargando valoraciones...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <h1 className="text-3xl font-bold text-gray-900">Valoraciones</h1>
          <p className="text-gray-600 mt-2">Consulta y gestiona las valoraciones de clientes.</p>
        </div>
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, teléfono o estado..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-200 overflow-hidden">
        {filteredValoraciones.length === 0 ? (
          <div className="text-center py-12">
            <Info className="h-10 w-10 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No hay valoraciones para mostrar en este momento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chat
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredValoraciones.map((valoracion) => (
                  <tr key={valoracion.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {valoracion.cliente || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {valoracion.telefono || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={valoracion.estado || ''}
                        onChange={(e) => handleEstadoChange(valoracion, e.target.value)}
                        disabled={saving}
                        className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 ${
                          getEstadoColors(valoracion.estado).bg
                        } ${getEstadoColors(valoracion.estado).text}`}
                        style={{
                          appearance: 'none',
                          backgroundImage: 'none',
                          width: `${(valoracion.estado || 'Seleccionar').length + 4}ch`,
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem',
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {ESTADO_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {valoracion.conversationId ? (
                        <a
                          href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${valoracion.conversationId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                          title="Abrir chat en Chatwoot"
                        >
                          <MessageCircle className="h-5 w-5" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin chat</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal para seleccionar códigos */}
      {selectedValoracionForCodigos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelectedValoracionForCodigos(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-lg border border-gray-200 p-6 transition-shadow hover:shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedValoracionForCodigos(null)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-lg font-semibold text-gray-900 mb-4">Seleccionar Códigos</h2>
            <p className="text-sm text-gray-600 mb-4">
              Selecciona los códigos que deseas asociar a esta valoración (solo códigos "Sin enviar"):
            </p>

            <div className="max-h-96 overflow-y-auto mb-6 border border-gray-200 rounded-lg">
              {codigosDisponibles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay códigos disponibles con estado "Sin enviar"
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {codigosDisponibles.map((codigo) => {
                    const isSelected = tempSelectedCodigos.includes(codigo.id);
                    return (
                      <label
                        key={codigo.id}
                        className={`flex items-center px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? 'bg-green-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleCodigo(codigo.id)}
                          className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm font-medium text-gray-900">
                          {codigo.codigo || codigo.id}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveCodigos}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setSelectedValoracionForCodigos(null)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para mostrar código asignado */}
      {showCodigoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowCodigoModal(false)}
        >
          <div
            className="relative w-full max-w-md bg-white rounded-lg border border-gray-200 p-6 transition-shadow hover:shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowCodigoModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <Star className="h-6 w-6 text-green-600" />
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Código Asignado</h2>
              <p className="text-sm text-gray-600 mb-4">
                Se ha asignado automáticamente el siguiente código:
              </p>

              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4 mb-6">
                <p className="text-2xl font-bold text-gray-900 tracking-wide">{codigoAsignado}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyCodigo}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors text-sm font-medium"
                >
                  Copiar Código
                </button>
                <button
                  onClick={() => setShowCodigoModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
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

export default Valoraciones;
