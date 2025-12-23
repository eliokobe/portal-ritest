import { useState, useEffect, useMemo } from 'react';
import { Search, Package, Plus, X, ExternalLink, Phone, MessageCircle } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';
import { Envio } from '../types';
import { getStatusColors } from '../utils/statusColors';

// Filtros permitidos para Gestora Operativa (mismos que en Services)
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

const TRACKING_BASE = 'https://app.cttexpress.com/Forms/Destinatarios.aspx?c=00828000964&r=IL88P';
const ESTADO_OPTIONS = ['Envío creado', 'Listo para enviar', 'Enviado', 'Entregado', 'Devuelto', 'Reclamado', 'Recogida hecha', 'Pendiente recogida', 'Recogida enviada'];

const normalizeText = (value?: string | number) => (value ?? '').toString().toLowerCase();
const normalizeExpediente = (value?: string | number) => (value ?? '').toString().replace(/\s+/g, '').toLowerCase();


interface Servicio {
  id: string;
  expediente?: string;
  nombre?: string;
  estado?: string;
  chatbot?: string;
  cliente?: string;
  telefono?: string;
  direccion?: string;
  poblacion?: string;
  codigoPostal?: string;
  provincia?: string;
  conversationId?: string;
}

interface CatalogoItem {
  id: string;
  nombre: string;
}

interface ServicioInfo {
  id: string;
  nombre?: string;
  expediente?: string;
  cliente?: string;
  telefono?: string;
  direccion?: string;
  poblacion?: string;
  codigoPostal?: string;
  provincia?: string;
  conversationId?: string;
}

export default function Envios() {
  const { user } = useAuth();
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editing, setEditing] = useState<{ id: string; field: keyof Envio; value: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState<Envio | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [transporteDraft, setTransporteDraft] = useState('');
  const [savingTransporte, setSavingTransporte] = useState(false);
  const [catalogoDraft, setCatalogoDraft] = useState('');
  const [savingCatalogo, setSavingCatalogo] = useState(false);
  const [numeroRecogidaDraft, setNumeroRecogidaDraft] = useState<string>('');
  const [savingNumeroRecogida, setSavingNumeroRecogida] = useState(false);
  const [newEnvio, setNewEnvio] = useState<Omit<Envio, 'id'>>({
    servicio: '',
    catalogo: '',
    cliente: '',
    direccion: '',
    poblacion: '',
    codigoPostal: '',
    provincia: '',
    telefono: '',
  });
  const [expedienteQuery, setExpedienteQuery] = useState('');
  const [expedienteError, setExpedienteError] = useState<string | null>(null);
  const [servicios, setServicios] = useState<{ id: string; nombre: string; expediente?: string }[]>([]);
  const [serviciosInfo, setServiciosInfo] = useState<ServicioInfo[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogoItem[]>([]);

  // Determinar si el usuario es Gestora Operativa
  const isGestoraOperativa = user?.role === 'Gestora Operativa';
  const isGestoraTecnica = user?.role === 'Gestora Técnica';


  useEffect(() => {
    fetchEnvios();
    fetchServicios();
    fetchCatalogos();
  }, []);

  const fetchEnvios = async () => {
    try {
      const data = await airtableService.getEnvios();
      setEnvios(data as Envio[]);
    } catch (error) {
      console.error('Error fetching envíos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Sync draft when modal opens
    setCommentDraft(selectedEnvio?.comentarios || '');
    setTransporteDraft(selectedEnvio?.transporte || '');
    setCatalogoDraft(selectedEnvio?.catalogo || '');
    setNumeroRecogidaDraft(selectedEnvio?.numeroRecogida?.toString() || '');
  }, [selectedEnvio?.id]);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (selectedEnvio) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedEnvio]);

  const fetchServicios = async () => {
    try {
      const data = await airtableService.getServices(user?.clinic);
      
      // Aplicar los mismos filtros que en la página de Servicios
      let serviciosFiltrados = data;
      
      if (isGestoraTecnica) {
        // Para Gestora Técnica: filtrar por estados específicos
        const allowedEstadosTecnica = ['Sin contactar', 'Formulario enviado', 'Formulario completado', 'Llamado', 'Citado'];
        serviciosFiltrados = data.filter((s: Servicio) =>
          s.estado && 
          allowedEstadosTecnica.includes(s.estado)
        );
      } else if (isGestoraOperativa) {
        // Para Gestora Operativa: filtrar por estados permitidos
        serviciosFiltrados = data.filter((s: Servicio) =>
          s.estado && GESTORA_OPERATIVA_FILTROS.includes(s.estado)
        );
      }
      
      setServicios(serviciosFiltrados.map((s: Servicio) => ({ 
        id: s.id, 
        nombre: s.nombre || s.expediente || 'Servicio',
        expediente: s.expediente,
      })));
      setServiciosInfo(serviciosFiltrados.map((s: Servicio) => ({
        id: s.id,
        nombre: s.nombre,
        expediente: s.expediente,
        cliente: s.cliente ?? s.nombre,
        telefono: s.telefono,
        direccion: s.direccion,
        poblacion: s.poblacion,
        codigoPostal: s.codigoPostal,
        provincia: s.provincia,
        conversationId: s.conversationId,
      })));
    } catch (error) {
      setServicios([]);
      setServiciosInfo([]);
    }
  };

  const fetchCatalogos = async () => {
    try {
      const data = await airtableService.getCatalogos();
      setCatalogos(data);
    } catch {
      setCatalogos([]);
    }
  };

  const getCatalogoNombre = (catalogoId?: string) => catalogos.find((c) => c.id === catalogoId)?.nombre;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredEnvios = envios.filter(envio => {
    // Excluir envíos con estado "Entregado"
    if (envio.estado === 'Entregado') return false;
    
    if (!searchTerm) return true;
    const needle = searchTerm.toLowerCase();
    return (
      normalizeText(envio.seguimiento).includes(needle) ||
      normalizeText(envio.numero).includes(needle) ||
      normalizeText(envio.producto).includes(needle)
    );
  });

  const sortedEnvios = useMemo(() => {
    return [...filteredEnvios].sort((a, b) => {
      const aNum = normalizeText(a.numero);
      const bNum = normalizeText(b.numero);
      return aNum.localeCompare(bNum, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [filteredEnvios]);

  const handleSelectServicioPorExpediente = () => {
    const needle = normalizeExpediente(expedienteQuery);
    const match = serviciosInfo.find((s) => normalizeExpediente(s.expediente) === needle);
    if (!needle || !match) {
      setExpedienteError('Expediente no encontrado');
      setNewEnvio((prev) => ({ ...prev, servicio: '' }));
      return;
    }
    setExpedienteError(null);
    setNewEnvio((prev) => ({
      ...prev,
      servicio: match.id,
      cliente: match.cliente || prev.cliente,
      telefono: match.telefono || prev.telefono,
      direccion: match.direccion || prev.direccion,
      poblacion: match.poblacion || prev.poblacion,
      codigoPostal: match.codigoPostal || prev.codigoPostal,
      provincia: match.provincia || prev.provincia,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  const handleEdit = (id: string, field: keyof Envio, value: string) => {
    setEditing({ id, field, value });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editing) {
      setEditing({ ...editing, value: e.target.value });
    }
  };

  const handleBlur = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await airtableService.updateEnvio(editing.id, { [editing.field]: editing.value });
      setEnvios((prev) =>
        prev.map((envio) =>
          envio.id === editing.id ? { ...envio, [editing.field]: editing.value } : envio
        )
      );
    } catch (error) {
      alert('Error al guardar el cambio');
    } finally {
      setEditing(null);
      setSaving(false);
    }
  };

  const handleSave = async (id: string, field: keyof Envio, value: string) => {
    setSaving(true);
    try {
      await airtableService.updateEnvio(id, { [field]: value });
      setEnvios((prev) =>
        prev.map((envio) =>
          envio.id === id ? { ...envio, [field]: value } : envio
        )
      );
    } catch (error) {
      alert('Error al guardar el cambio');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveComment = async () => {
    if (!selectedEnvio) return;
    setSavingComment(true);
    try {
      await airtableService.updateEnvio(selectedEnvio.id, { comentarios: commentDraft });
      setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, comentarios: commentDraft } : e)));
      setSelectedEnvio((prev) => (prev ? { ...prev, comentarios: commentDraft } : prev));
    } catch (error) {
      alert('Error al guardar los comentarios');
    } finally {
      setSavingComment(false);
    }
  };

  const handleSaveTransporte = async () => {
    if (!selectedEnvio) return;
    setSavingTransporte(true);
    try {
      await airtableService.updateEnvio(selectedEnvio.id, { transporte: transporteDraft });
      setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, transporte: transporteDraft } : e)));
      setSelectedEnvio((prev) => (prev ? { ...prev, transporte: transporteDraft } : prev));
    } catch (error) {
      alert('Error al guardar el transporte');
    } finally {
      setSavingTransporte(false);
    }
  };

  const handleSaveCatalogo = async () => {
    if (!selectedEnvio) return;
    setSavingCatalogo(true);
    try {
      await airtableService.updateEnvio(selectedEnvio.id, { catalogo: catalogoDraft });
      setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, catalogo: catalogoDraft } : e)));
      setSelectedEnvio((prev) => (prev ? { ...prev, catalogo: catalogoDraft } : prev));
    } catch (error) {
      alert('Error al guardar el producto');
    } finally {
      setSavingCatalogo(false);
    }
  };

  const handleSaveNumeroRecogida = async () => {
    if (!selectedEnvio) return;
    setSavingNumeroRecogida(true);
    try {
      const numeroRecogida = numeroRecogidaDraft.trim() === '' ? undefined : Number(numeroRecogidaDraft);
      await airtableService.updateEnvio(selectedEnvio.id, { numeroRecogida });
      setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, numeroRecogida } : e)));
      setSelectedEnvio((prev) => (prev ? { ...prev, numeroRecogida } : prev));
    } catch (error) {
      alert('Error al guardar el número de recogida');
    } finally {
      setSavingNumeroRecogida(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Envíos</h1>
          <p className="text-gray-600 mt-2">Consulta el estado de los envíos de material</p>
        </div>
        <div className="flex items-center gap-4 flex-1 max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, seguimiento o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex-shrink-0 flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir
          </button>
        </div>
      </div>

      {/* Tabla de envíos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seguimiento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Envío
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Cambio
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detalles
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedEnvios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      {searchTerm ? 'No se encontraron envíos' : 'No hay envíos registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                sortedEnvios.map((envio) => (
                  <tr key={envio.id} className="hover:bg-gray-50">
                    {/* Seguimiento */}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {(() => {
                        // Estados que redirigen a CTT Express
                        const estadosRecogida = ['Pendiente recogida', 'Recogida enviada', 'Recogida hecha'];
                        const usarCttExpress = estadosRecogida.includes(envio.estado || '');
                        
                        const trackingUrl = usarCttExpress 
                          ? 'https://www.cttexpress.com/localizador-de-envios/'
                          : (envio.seguimiento || (envio.numero ? `${TRACKING_BASE}${envio.numero}` : undefined));
                        
                        if (!trackingUrl) return '-';
                        return (
                          <a
                            href={trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-primary hover:text-brand-primary/80"
                            title="Abrir seguimiento"
                          >
                            Ver seguimiento
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        );
                      })()}
                      {envio.numero && (
                        <div className="text-xs text-gray-500">Nº {envio.numero}</div>
                      )}
                    </td>
                    {/* Servicio */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <span>
                        {servicios.find(s => s.id === envio.servicio)?.nombre || '-'}
                      </span>
                    </td>
                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <select
                        value={envio.estado || ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (!newValue || newValue === envio.estado) return;
                          setSaving(true);
                          airtableService.updateEnvio(envio.id, { estado: newValue })
                            .then(() => {
                              setEnvios((prev) =>
                                prev.map((e) =>
                                  e.id === envio.id ? { ...e, estado: newValue } : e
                                )
                              );
                            })
                            .catch((error) => {
                              console.error('Error updating estado:', error);
                              alert('Error al actualizar el estado');
                            })
                            .finally(() => {
                              setSaving(false);
                            });
                        }}
                        disabled={saving}
                        className={`py-1 px-3 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center ${getStatusColors(envio.estado).bg} ${getStatusColors(envio.estado).text}`}
                        style={{ 
                          appearance: 'none', 
                          backgroundImage: 'none',
                          width: `${(envio.estado || 'Sin estado').length + 4}ch`,
                          paddingLeft: '0.75rem',
                          paddingRight: '0.75rem'
                        }}
                      >
                        <option value="">Seleccionar...</option>
                        {ESTADO_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                    {/* Fecha de Envío */}
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {editing && editing.id === envio.id && editing.field === 'fechaEnvio' ? (
                        <input
                          type="date"
                          value={editing.value}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={saving}
                          autoFocus
                          className="border rounded px-2 py-1 text-sm"
                        />
                      ) : (
                        <span
                          onClick={() => handleEdit(envio.id, 'fechaEnvio', envio.fechaEnvio || '')}
                          className="cursor-pointer hover:underline"
                        >
                          {formatDate(envio.fechaEnvio)}
                        </span>
                      )}
                    </td>
                    {/* Producto (solo lectura) */}
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {envio.producto || '-'}
                    </td>
                    {/* Fecha Cambio (solo lectura) */}
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(envio.fechaCambio)}
                    </td>
                    {/* Detalles */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedEnvio(envio)}
                        className="text-brand-primary hover:text-brand-primary/80 font-medium"
                      >
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para crear envío */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Añadir Nuevo Envío</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newEnvio.servicio) return;
                setCreating(true);
                try {
                  // Crear el envío en Airtable
                  const numeroAuto = expedienteQuery?.trim() ? expedienteQuery.trim() : undefined;
                  await airtableService.createEnvio({
                    numero: numeroAuto,
                    servicio: newEnvio.servicio || '',
                    catalogo: newEnvio.catalogo,
                    cliente: newEnvio.cliente,
                    direccion: newEnvio.direccion,
                    poblacion: newEnvio.poblacion,
                    codigoPostal: newEnvio.codigoPostal,
                    provincia: newEnvio.provincia,
                    telefono: newEnvio.telefono,
                  });
                  await fetchEnvios();
                  setNewEnvio({
                    servicio: '',
                    catalogo: '',
                    cliente: '',
                    direccion: '',
                    poblacion: '',
                    codigoPostal: '',
                    provincia: '',
                    telefono: '',
                  });
                  setExpedienteQuery('');
                  setExpedienteError(null);
                  setShowModal(false);
                } catch (error) {
                  alert('Error al crear el envío.');
                } finally {
                  setCreating(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="expediente" className="block text-sm font-medium text-gray-700 mb-1">
                  Expediente *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="expediente"
                    value={expedienteQuery}
                    onChange={(e) => {
                      setExpedienteQuery(e.target.value);
                      setExpedienteError(null);
                    }}
                    onBlur={handleSelectServicioPorExpediente}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Introduce el expediente"
                  />
                  <button
                    type="button"
                    onClick={handleSelectServicioPorExpediente}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-200"
                  >
                    Buscar
                  </button>
                </div>
                {expedienteError && <p className="text-xs text-red-600 mt-1">{expedienteError}</p>}
                {newEnvio.servicio && !expedienteError && (
                  <p className="text-xs text-green-600 mt-1">Expediente vinculado</p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente
                  </label>
                  <input
                    type="text"
                    id="cliente"
                    value={newEnvio.cliente || ''}
                    onChange={(e) => setNewEnvio((prev) => ({ ...prev, cliente: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="telefono"
                    value={newEnvio.telefono || ''}
                    onChange={(e) => setNewEnvio((prev) => ({ ...prev, telefono: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Teléfono de contacto"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  id="direccion"
                  value={newEnvio.direccion || ''}
                  onChange={(e) => setNewEnvio((prev) => ({ ...prev, direccion: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Dirección completa"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="poblacion" className="block text-sm font-medium text-gray-700 mb-1">
                    Población
                  </label>
                  <input
                    type="text"
                    id="poblacion"
                    value={newEnvio.poblacion || ''}
                    onChange={(e) => setNewEnvio((prev) => ({ ...prev, poblacion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Ciudad"
                  />
                </div>
                <div>
                  <label htmlFor="codigoPostal" className="block text-sm font-medium text-gray-700 mb-1">
                    Código postal
                  </label>
                  <input
                    type="text"
                    id="codigoPostal"
                    value={newEnvio.codigoPostal || ''}
                    onChange={(e) => setNewEnvio((prev) => ({ ...prev, codigoPostal: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="CP"
                  />
                </div>
                <div>
                  <label htmlFor="provincia" className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    id="provincia"
                    value={newEnvio.provincia || ''}
                    onChange={(e) => setNewEnvio((prev) => ({ ...prev, provincia: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    placeholder="Provincia"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="catalogo" className="block text-sm font-medium text-gray-700 mb-1">
                  Catálogo
                </label>
                <select
                  id="catalogo"
                  value={newEnvio.catalogo || ''}
                  onChange={(e) => setNewEnvio((prev) => ({ ...prev, catalogo: e.target.value }))}
                  className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center inline-block ${getStatusColors('Producto').bg} ${getStatusColors('Producto').text}`}
                  style={{
                    appearance: 'none',
                    backgroundImage: 'none',
                    paddingLeft: '0.5rem',
                    paddingRight: '0.5rem',
                    minWidth: '120px'
                  }}
                >
                  <option value="">Seleccionar producto</option>
                  {catalogos.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newEnvio.servicio}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creando...' : 'Crear Envío'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de detalles */}
      {selectedEnvio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => setSelectedEnvio(null)}>
          <div
            className="bg-white rounded-xl max-w-xl w-full p-6 relative shadow-lg my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {selectedEnvio.telefono && (
                <a
                  href={`tel:${selectedEnvio.telefono}`}
                  className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                  title="Llamar"
                >
                  <Phone className="h-5 w-5" />
                </a>
              )}
              {(() => {
                const servicioRelacionado = serviciosInfo.find(s => s.id === selectedEnvio.servicio);
                return servicioRelacionado?.conversationId ? (
                  <a
                    href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${servicioRelacionado.conversationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full text-green-600 hover:bg-green-100 transition-colors"
                    title="Abrir chat"
                  >
                    <MessageCircle className="h-5 w-5" />
                  </a>
                ) : null;
              })()}
              <button
                onClick={() => setSelectedEnvio(null)}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Detalles del envío</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase text-gray-500">Número</p>
                <p className="text-sm text-gray-900">{selectedEnvio.numero || '-'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-gray-500 mb-1">Número de recogida</p>
                <input
                  type="number"
                  value={selectedEnvio.numeroRecogida || ''}
                  onChange={(e) => {
                    setSelectedEnvio((prev) => (prev ? { ...prev, numeroRecogida: e.target.value === '' ? undefined : Number(e.target.value) } : prev));
                  }}
                  onBlur={(e) => {
                    const newValue = e.target.value === '' ? undefined : Number(e.target.value);
                    if (newValue === selectedEnvio.numeroRecogida) return;
                    setSavingNumeroRecogida(true);
                    airtableService.updateEnvio(selectedEnvio.id, { numeroRecogida: newValue })
                      .then(() => {
                        setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, numeroRecogida: newValue } : e)));
                        setSelectedEnvio((prev) => (prev ? { ...prev, numeroRecogida: newValue } : prev));
                        setNumeroRecogidaDraft(newValue ? String(newValue) : '');
                      })
                      .catch((error) => {
                        console.error('Error updating numeroRecogida:', error);
                        alert('Error al actualizar el número de recogida');
                      })
                      .finally(() => {
                        setSavingNumeroRecogida(false);
                      });
                  }}
                  disabled={savingNumeroRecogida}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm"
                  placeholder="Introduce el número de recogida"
                />
              </div>
              <div className="flex flex-col sm:col-span-2">
                <p className="text-xs uppercase text-gray-500 mb-1">Estado</p>
                <div>
                  <select
                    value={selectedEnvio.estado || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (!newValue || newValue === selectedEnvio.estado) return;
                      setSaving(true);
                      airtableService.updateEnvio(selectedEnvio.id, { estado: newValue })
                        .then(() => {
                          setEnvios((prev) =>
                            prev.map((envioItem) =>
                              envioItem.id === selectedEnvio.id ? { ...envioItem, estado: newValue } : envioItem
                            )
                          );
                          setSelectedEnvio({...selectedEnvio, estado: newValue});
                        })
                        .catch((error) => {
                          console.error('Error updating estado:', error);
                          alert('Error al actualizar el estado');
                        })
                        .finally(() => {
                          setSaving(false);
                        });
                    }}
                    className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 inline-block text-center ${getStatusColors(selectedEnvio.estado).bg} ${getStatusColors(selectedEnvio.estado).text}`}
                    style={{ 
                      appearance: 'none', 
                      backgroundImage: 'none',
                      paddingLeft: '0.5rem',
                      paddingRight: '0.5rem',
                      minWidth: '120px'
                    }}
                  >
                    <option value="">Seleccionar...</option>
                    {ESTADO_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Cliente</p>
                <p className="text-sm text-gray-900">{selectedEnvio.cliente || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Teléfono</p>
                <p className="text-sm text-gray-900">{selectedEnvio.telefono || '-'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-gray-500">Dirección</p>
                <p className="text-sm text-gray-900">{selectedEnvio.direccion || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Población</p>
                <p className="text-sm text-gray-900">{selectedEnvio.poblacion || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Código postal</p>
                <p className="text-sm text-gray-900">{selectedEnvio.codigoPostal || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Provincia</p>
                <p className="text-sm text-gray-900">{selectedEnvio.provincia || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500">Referencia</p>
                <p className="text-sm text-gray-900">{selectedEnvio.referencia || '-'}</p>
              </div>
              <div className="flex flex-col sm:col-span-2">
                <p className="text-xs uppercase text-gray-500 mb-1">Producto / Catálogo</p>
                <div>
                  <select
                    value={selectedEnvio.catalogo || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue === selectedEnvio.catalogo) return;
                      setSavingCatalogo(true);
                      airtableService.updateEnvio(selectedEnvio.id, { catalogo: newValue })
                        .then(() => {
                          setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, catalogo: newValue } : e)));
                          setSelectedEnvio((prev) => (prev ? { ...prev, catalogo: newValue } : prev));
                          setCatalogoDraft(newValue);
                        })
                        .catch((error) => {
                          console.error('Error updating catalogo:', error);
                          alert('Error al actualizar el producto');
                        })
                        .finally(() => {
                          setSavingCatalogo(false);
                        });
                    }}
                    disabled={savingCatalogo}
                    className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center inline-block ${getStatusColors('Producto').bg} ${getStatusColors('Producto').text}`}
                    style={{ 
                      appearance: 'none', 
                      backgroundImage: 'none',
                      paddingLeft: '0.5rem',
                      paddingRight: '0.5rem',
                      minWidth: '120px'
                    }}
                  >
                    <option value="">Seleccionar producto</option>
                    {catalogos.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:col-span-2">
                <p className="text-xs uppercase text-gray-500 mb-1">Transporte</p>
                <div>
                  <select
                    value={selectedEnvio.transporte || ''}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      if (newValue === selectedEnvio.transporte) return;
                      setSavingTransporte(true);
                      airtableService.updateEnvio(selectedEnvio.id, { transporte: newValue })
                        .then(() => {
                          setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, transporte: newValue } : e)));
                          setSelectedEnvio((prev) => (prev ? { ...prev, transporte: newValue } : prev));
                          setTransporteDraft(newValue);
                        })
                        .catch((error) => {
                          console.error('Error updating transporte:', error);
                          alert('Error al actualizar el transporte');
                        })
                        .finally(() => {
                          setSavingTransporte(false);
                        });
                    }}
                    disabled={savingTransporte}
                    className={`py-1 px-2 text-xs font-semibold rounded-full cursor-pointer hover:opacity-80 transition-opacity border-0 text-center inline-block ${getStatusColors('Transporte').bg} ${getStatusColors('Transporte').text}`}
                    style={{ 
                      appearance: 'none', 
                      backgroundImage: 'none',
                      paddingLeft: '0.5rem',
                      paddingRight: '0.5rem',
                      minWidth: '120px'
                    }}
                  >
                    <option value="">Seleccionar transporte</option>
                    <option value="Inbound Logística">Inbound Logística</option>
                    <option value="Revalco">Revalco</option>
                    <option value="Saltoki">Saltoki</option>
                    <option value="Packlink">Packlink</option>
                  </select>
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-gray-500 mb-1">Comentarios</p>
                <textarea
                  value={selectedEnvio.comentarios || ''}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSelectedEnvio((prev) => (prev ? { ...prev, comentarios: newValue } : prev));
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.max(e.target.scrollHeight, 100) + 'px';
                  }}
                  onBlur={(e) => {
                    const newValue = e.target.value;
                    if (newValue === selectedEnvio.comentarios) return;
                    setSavingComment(true);
                    airtableService.updateEnvio(selectedEnvio.id, { comentarios: newValue })
                      .then(() => {
                        setEnvios((prev) => prev.map((e) => (e.id === selectedEnvio.id ? { ...e, comentarios: newValue } : e)));
                        setSelectedEnvio((prev) => (prev ? { ...prev, comentarios: newValue } : prev));
                      })
                      .catch((error) => {
                        console.error('Error updating comentarios:', error);
                        alert('Error al actualizar los comentarios');
                      })
                      .finally(() => {
                        setSavingComment(false);
                      });
                  }}
                  disabled={savingComment}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none overflow-hidden"
                  placeholder="Añade comentarios"
                  style={{ minHeight: '100px' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
