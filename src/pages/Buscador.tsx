import React, { useEffect, useState } from 'react';
import { Search, X, XCircle, Phone, MessageCircle } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';
import { getStatusColors, getIpartnerColors } from '../utils/statusColors';

interface Service {
  id: string;
  expediente?: string;
  numero?: string;
  fechaRegistro?: string;
  nombre?: string;
  telefono?: string;
  direccion?: string;
  estado?: string;
  estadoIpas?: string;
  estadoEnvio?: string;
  ultimoCambio?: string;
  descripcion?: string;
  comentarios?: string;
  motivoCancelacion?: string;
  cita?: string;
  tecnico?: string;
  trabajadorId?: string[];
  formularioId?: string[];
  reparacionesId?: string[];
  notaTecnico?: string;
  citaTecnico?: string;
  chatbot?: string;
  fechaInstalacion?: string;
  referencia?: string;
  conversationId?: string;
  poblacion?: string;
  tramitado?: boolean;
  codigoPostal?: string;
  provincia?: string;
  numeroSerie?: string;
  importe?: number;
  accionIpartner?: string;
  ipartner?: string;
  resolucionVisita?: string;
}

const renderDetailValue = (value?: string) => {
  const cleaned = value?.toString().trim();
  return cleaned ? cleaned : 'Sin información';
};

const Buscador: React.FC = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [tecnicos, setTecnicos] = useState<{ id: string; nombre: string }[]>([]);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [tecnicoNombre, setTecnicoNombre] = useState<string>('');

  // Cargar técnicos
  useEffect(() => {
    const loadTecnicos = async () => {
      try {
        const data = await airtableService.getTechnicians();
        setTecnicos(data.filter(t => t.nombre !== undefined) as { id: string; nombre: string; }[]);
      } catch (error) {
      }
    };
    loadTecnicos();
  }, []);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (selectedService) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedService]);

  // Cargar formularios cuando se selecciona un servicio
  useEffect(() => {
    if (selectedService) {
      loadFormulariosForService(selectedService);
      loadTecnicoNombre(selectedService);
    } else {
      setFormularios([]);
      setTecnicoNombre('');
    }
  }, [selectedService, tecnicos]);

  const loadTecnicoNombre = (service: Service) => {
    
    // Primero intentar con trabajadorId
    if (service.trabajadorId && service.trabajadorId.length > 0) {
      const tecnicoId = service.trabajadorId[0];
      const tecnicoEncontrado = tecnicos.find(t => t.id === tecnicoId);
      
      if (tecnicoEncontrado) {
        setTecnicoNombre(tecnicoEncontrado.nombre);
        return;
      }
    }
    
    // Si no, intentar con el campo tecnico (que puede ser un array de IDs)
    if (service.tecnico) {
      let tecnicoId: string | undefined;
      
      // Si es un array, tomar el primer elemento
      if (Array.isArray(service.tecnico)) {
        tecnicoId = service.tecnico[0];
      } else if (typeof service.tecnico === 'string') {
        // Si es string y parece un record ID, usarlo directamente
        if (service.tecnico.startsWith('rec')) {
          tecnicoId = service.tecnico;
        }
      }
      
      if (tecnicoId) {
        const tecnicoEncontrado = tecnicos.find(t => t.id === tecnicoId);
        
        if (tecnicoEncontrado) {
          setTecnicoNombre(tecnicoEncontrado.nombre);
          return;
        }
      }
      
      // Si tecnico es un string normal (nombre), usarlo directamente
      if (typeof service.tecnico === 'string' && !service.tecnico.startsWith('rec')) {
        setTecnicoNombre(service.tecnico);
        return;
      }
    }
    
    setTecnicoNombre('Sin información');
  };

  const loadFormulariosForService = async (service: Service | null) => {
    const formularioIds = service?.formularioId;
    const numero = service?.numero ? String(service.numero).trim() : undefined;
    const expedienteLegacy = service?.expediente ? String(service.expediente).trim() : undefined;
    const identifier = numero || expedienteLegacy;

    setFormularios([]);

    let data: any[] = [];

    // Primero: intentar obtener por IDs de linked records
    try {
      if (formularioIds && formularioIds.length > 0) {
        data = await airtableService.getFormulariosByIds(formularioIds);
      }
    } catch (error) {
      data = [];
    }

    // Segundo: buscar por identifier (número o expediente)
    if (data.length === 0 && identifier) {
      try {
        data = await airtableService.getFormularioByExpediente(identifier);
      } catch (error) {
        data = [];
      }
    }

    setFormularios(data);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    setSearchResults([]);

    try {
      // Buscar en servicios por número, expediente, nombre o teléfono
      const services = await airtableService.getServices(user?.clinic);
      const filteredResults = services.filter((service) => {
        const term = searchTerm.trim().toLowerCase();
        return (service.numero && String(service.numero).toLowerCase().includes(term)) ||
               (service.expediente && String(service.expediente).toLowerCase().includes(term)) ||
               (service.nombre && String(service.nombre).toLowerCase().includes(term)) ||
               (service.telefono && String(service.telefono).toLowerCase().includes(term));
      });

      setSearchResults(filteredResults);
    } catch (error: any) {
      setError(error.message || 'Error al buscar expedientes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Madrid'
      });
    } catch {
      return '-';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Madrid'
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Buscador de expedientes</h1>
        <p className="text-gray-600 mt-2">Busca expedientes por número, nombre o teléfono.</p>
      </div>

      <div className="bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-100 p-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por expediente, nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
              />
            </div>
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchTerm.trim()}
            className="px-6 py-3 bg-brand-primary text-white rounded-full hover:bg-brand-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {searched && !loading && searchResults.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center transition-shadow hover:shadow-md">
          <p className="text-gray-600">No se encontraron resultados para "{searchTerm}"</p>
        </div>
      )}

      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-shadow hover:shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha registro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map((service) => (
                  <tr
                    key={service.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {service.numero || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.nombre || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {service.telefono || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`py-1 px-2 text-xs font-semibold rounded-full ${getStatusColors(service.estado).bg} ${getStatusColors(service.estado).text}`}
                      >
                        {service.estado || 'Sin estado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(service.fechaRegistro)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        type="button"
                        onClick={() => setSelectedService(service)}
                        className="text-brand-primary hover:text-brand-primary/80 font-medium"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
          onClick={() => setSelectedService(null)}
        >
          <div className="min-h-screen flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-4xl bg-white rounded-lg border border-gray-200 my-8 transition-shadow hover:shadow-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              {selectedService.telefono && (
                <a
                  href={`tel:${selectedService.telefono}`}
                  className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                  title="Llamar cliente"
                >
                  <Phone className="h-5 w-5" />
                </a>
              )}
              {selectedService.conversationId && (
                <a
                  href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${selectedService.conversationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                  title="Abrir chat"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

              <div className="p-6 space-y-6">
                <div>
                <h2 className="text-xl font-semibold text-gray-900">Detalle del expediente</h2>
                {selectedService.numero && (
                  <p className="text-sm text-gray-500 mt-1">
                    Número {selectedService.numero}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase text-gray-500">Expediente</p>
                  <p className="text-sm text-gray-900 mt-1 font-medium">{renderDetailValue(selectedService.expediente)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Cliente</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.nombre)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Teléfono</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.telefono)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Dirección</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.direccion)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Código postal</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.codigoPostal)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Provincia</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.provincia)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Población</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.poblacion)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Estado</p>
                  <span
                    className={`inline-block py-1 px-2 text-xs font-semibold rounded-full mt-1 ${getStatusColors(selectedService.estado).bg} ${getStatusColors(selectedService.estado).text}`}
                  >
                    {selectedService.estado || 'Sin estado'}
                  </span>
                </div>
                {selectedService.ipartner && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Ipartner</p>
                    <span
                      className={`inline-block py-1 px-2 text-xs font-semibold rounded-full mt-1 ${getIpartnerColors(selectedService.ipartner).bg} ${getIpartnerColors(selectedService.ipartner).text}`}
                    >
                      {selectedService.ipartner}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase text-gray-500">Último cambio</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedService.ultimoCambio)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Estado envío</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.estadoEnvio)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Referencia</p>
                  <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.referencia)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha instalación</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedService.fechaInstalacion)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500">Fecha de registro</p>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedService.fechaRegistro)}</p>
                </div>
                {selectedService.cita && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Cita</p>
                    <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedService.cita)}</p>
                  </div>
                )}
                {selectedService.citaTecnico && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Cita técnico</p>
                    <p className="text-sm text-gray-900 mt-1">{formatDateTime(selectedService.citaTecnico)}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase text-gray-500">Técnico</p>
                  <p className="text-sm text-gray-900 mt-1">{tecnicoNombre || 'Sin información'}</p>
                </div>
                {selectedService.numeroSerie && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Número de serie</p>
                    <p className="text-sm text-gray-900 mt-1">{renderDetailValue(selectedService.numeroSerie)}</p>
                  </div>
                )}
                {selectedService.importe !== undefined && selectedService.importe !== null && (
                  <div>
                    <p className="text-xs uppercase text-gray-500">Importe</p>
                    <p className="text-sm text-gray-900 mt-1">{selectedService.importe}€</p>
                  </div>
                )}
              </div>

              {selectedService.descripcion && (
                <div className="border-t pt-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Descripción</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedService.descripcion}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-xs uppercase text-gray-500 mb-1">Comentarios</p>
                <p className="text-sm text-gray-900 whitespace-pre-line">
                  {renderDetailValue(selectedService.comentarios)}
                </p>
              </div>

              {selectedService.accionIpartner && (
                <div className="border-t pt-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Acción Ipartner</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedService.accionIpartner}</p>
                </div>
              )}

              {selectedService.resolucionVisita && (
                <div className="border-t pt-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Resolución visita</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedService.resolucionVisita}</p>
                </div>
              )}

              {selectedService.motivoCancelacion && (
                <div className="border-t pt-4">
                  <p className="text-xs uppercase text-gray-500 mb-1">Motivo cancelación</p>
                  <p className="text-sm text-gray-900 whitespace-pre-line">{selectedService.motivoCancelacion}</p>
                </div>
              )}

              {/* Fotos del formulario */}
              {formularios.length > 0 && (() => {
                const formulario = formularios[0];
                const fotoGeneral = formulario?.['Foto general'];
                const fotoEtiqueta = formulario?.['Foto etiqueta'];
                const hasPhotos = (Array.isArray(fotoGeneral) && fotoGeneral.length > 0) ||
                                 (Array.isArray(fotoEtiqueta) && fotoEtiqueta.length > 0);

                if (hasPhotos) {
                  return (
                    <div className="border-t pt-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Fotos del servicio</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Array.isArray(fotoGeneral) && fotoGeneral.map((file: any, idx: number) => (
                          <div key={`general-${idx}`} className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Foto general</p>
                            {file.thumbnails?.large?.url && (
                              <img
                                src={file.thumbnails.large.url}
                                alt="Foto general"
                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(file.url, '_blank')}
                              />
                            )}
                          </div>
                        ))}
                        {Array.isArray(fotoEtiqueta) && fotoEtiqueta.map((file: any, idx: number) => (
                          <div key={`etiqueta-${idx}`} className="space-y-2">
                            <p className="text-xs font-medium text-gray-600">Foto etiqueta</p>
                            {file.thumbnails?.large?.url && (
                              <img
                                src={file.thumbnails.large.url}
                                alt="Foto etiqueta"
                                className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => window.open(file.url, '_blank')}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Buscador;
