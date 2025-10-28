import { useState, useEffect } from 'react';
import { Search, Package, Plus, X } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

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


interface Servicio {
  id: string;
  expediente?: string;
  nombre?: string;
  estado?: string;
  chatbot?: string;
}

interface Material {
  id: string;
  numeroSerie?: string;
  modelo?: string;
}

interface Envio {
  id: string;
  seguimiento?: string;
  servicio?: string;
  estado?: 'Envío creado' | 'Paquete recogido' | 'Paquete entregado';
  fechaEnvio?: string;
  material?: string;
  producto?: string;
  fechaCambio?: string;
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
  const [newEnvio, setNewEnvio] = useState<Omit<Envio, 'id'>>({
    seguimiento: '',
    servicio: '',
    estado: 'Envío creado',
    fechaEnvio: '',
    material: '',
  });
  const [materialSN, setMaterialSN] = useState(''); // S/N que escribe el usuario
  const [servicios, setServicios] = useState<{ id: string; nombre: string }[]>([]);
  const [materiales, setMateriales] = useState<{ id: string; numeroSerie: string; producto: string }[]>([]);

  // Determinar si el usuario es Gestora Operativa
  const isGestoraOperativa = user?.role === 'Gestora Operativa';
  const isGestoraTecnica = user?.role === 'Gestora Técnica';


  useEffect(() => {
    fetchEnvios();
    fetchServicios();
    fetchMateriales();
  }, []);

  const fetchEnvios = async () => {
    try {
      const data = await airtableService.getEnvios();
      setEnvios(data);
    } catch (error) {
      console.error('Error fetching envíos:', error);
    } finally {
      setLoading(false);
    }
  };

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
        nombre: s.nombre || s.expediente || 'Servicio' 
      })));
    } catch (error) {
      setServicios([]);
    }
  };

  const fetchMateriales = async () => {
    try {
      const data = await airtableService.getInventario();
      console.log('Materiales recibidos:', data);
      setMateriales(data.map((m: Material) => ({
        id: m.id,
        numeroSerie: String(m.numeroSerie || ''),
        producto: m.modelo || '',
      })));
    } catch {
      setMateriales([]);
    }
  };

  // Auxiliar para mostrar material (S/N y producto)
  const getMaterialLabel = (materialId: string): string => {
    const mat = materiales.find((m) => m.id === materialId);
    return mat ? `${mat.numeroSerie}${mat.producto ? ` - ${mat.producto}` : ''}` : '-';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getEstadoColor = (estado?: string) => {
    switch (estado) {
      case 'Envío creado':
        return 'bg-yellow-100 text-yellow-800';
      case 'Paquete recogido':
        return 'bg-blue-100 text-blue-800';
      case 'Paquete entregado':
        return 'bg-green-200 text-green-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEnvios = envios.filter(envio => {
    const matchesSearch = !searchTerm || 
      envio.seguimiento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      envio.material?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      envio.producto?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

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
              placeholder="Buscar por seguimiento, material o producto..."
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
                  Material
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Cambio
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEnvios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">
                      {searchTerm ? 'No se encontraron envíos' : 'No hay envíos registrados'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEnvios.map((envio) => (
                  <tr key={envio.id} className="hover:bg-gray-50">
                    {/* Seguimiento */}
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {editing && editing.id === envio.id && editing.field === 'seguimiento' ? (
                        <input
                          type="text"
                          value={editing.value}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={saving}
                          autoFocus
                          className="border rounded px-2 py-1 text-sm w-32"
                        />
                      ) : (
                        <span
                          onClick={() => handleEdit(envio.id, 'seguimiento', envio.seguimiento || '')}
                          className="cursor-pointer hover:underline"
                        >
                          {envio.seguimiento || '-'}
                        </span>
                      )}
                    </td>
                    {/* Servicio */}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {editing && editing.id === envio.id && editing.field === 'servicio' ? (
                        <select
                          value={editing.value}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={saving}
                          autoFocus
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Seleccionar servicio</option>
                          {servicios.map((s) => (
                            <option key={s.id} value={s.id}>{s.nombre}</option>
                          ))}
                        </select>
                      ) : (
                        <span
                          onClick={() => handleEdit(envio.id, 'servicio', envio.servicio || '')}
                          className="cursor-pointer hover:underline"
                        >
                          {servicios.find(s => s.id === envio.servicio)?.nombre || '-'}
                        </span>
                      )}
                    </td>
                    {/* Estado */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {editing && editing.id === envio.id && editing.field === 'estado' ? (
                        <select
                          value={editing.value}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          disabled={saving}
                          autoFocus
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Seleccionar</option>
                          <option value="Envío creado">Envío creado</option>
                          <option value="Paquete recogido">Paquete recogido</option>
                          <option value="Paquete entregado">Paquete entregado</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => handleEdit(envio.id, 'estado', envio.estado || '')}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full cursor-pointer hover:underline ${getEstadoColor(envio.estado)}`}
                        >
                          {envio.estado || 'Sin estado'}
                        </span>
                      )}
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
                    {/* Material */}
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {editing && editing.id === envio.id && editing.field === 'material' ? (
                          <select
                            value={editing.value}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            disabled={saving}
                            autoFocus
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="">Seleccionar material</option>
                            {materiales.map((m) => (
                              <option key={m.id} value={m.id}>{m.numeroSerie}{m.producto ? ` - ${m.producto}` : ''}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            onClick={() => handleEdit(envio.id, 'material', envio.material || '')}
                            className="cursor-pointer hover:underline"
                          >
                            {getMaterialLabel(envio.material || '')}
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
                if (!newEnvio.seguimiento?.trim() || !newEnvio.servicio || !newEnvio.material) return;
                setCreating(true);
                try {
                  // Crear el envío en Airtable
                  await airtableService.createEnvio({ ...newEnvio });
                  await fetchEnvios();
                  setNewEnvio({ seguimiento: '', servicio: '', estado: 'Envío creado', fechaEnvio: '', material: '' });
                  setMaterialSN('');
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
                <label htmlFor="seguimiento" className="block text-sm font-medium text-gray-700 mb-1">
                  Seguimiento *
                </label>
                <input
                  type="text"
                  id="seguimiento"
                  required
                  value={newEnvio.seguimiento}
                  onChange={(e) => setNewEnvio((prev) => ({ ...prev, seguimiento: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Código de seguimiento"
                />
              </div>
              <div>
                <label htmlFor="servicio" className="block text-sm font-medium text-gray-700 mb-1">
                  Servicio *
                </label>
                <select
                  id="servicio"
                  required
                  value={newEnvio.servicio}
                  onChange={(e) => setNewEnvio((prev) => ({ ...prev, servicio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                >
                  <option value="">Seleccionar servicio</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="material" className="block text-sm font-medium text-gray-700 mb-1">
                  Material (S/N) *
                </label>
                <input
                  type="text"
                  id="material"
                  required
                  list="materiales-list"
                  value={materialSN}
                  onChange={(e) => {
                    const sn = e.target.value.trim();
                    setMaterialSN(sn);
                    // Buscar el material que coincida con el S/N (ignorando espacios y mayúsculas)
                    const material = materiales.find(m => 
                      String(m.numeroSerie || '').trim().toLowerCase() === sn.toLowerCase()
                    );
                    setNewEnvio((prev) => ({ ...prev, material: material?.id || '' }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Escribir número de serie"
                />
                <datalist id="materiales-list">
                  {materiales.map((m) => (
                    <option key={m.id} value={m.numeroSerie}>{m.producto}</option>
                  ))}
                </datalist>
                {materialSN && !materiales.find(m => String(m.numeroSerie || '').trim().toLowerCase() === materialSN.trim().toLowerCase()) && (
                  <p className="text-xs text-red-600 mt-1">S/N no encontrado en inventario</p>
                )}
                {materialSN && materiales.find(m => String(m.numeroSerie || '').trim().toLowerCase() === materialSN.trim().toLowerCase()) && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ {materiales.find(m => String(m.numeroSerie || '').trim().toLowerCase() === materialSN.trim().toLowerCase())?.producto || 'Material encontrado'}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="fechaEnvio" className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Envío
                </label>
                <input
                  type="date"
                  id="fechaEnvio"
                  value={newEnvio.fechaEnvio}
                  onChange={(e) => setNewEnvio((prev) => ({ ...prev, fechaEnvio: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                />
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
                  disabled={creating || !newEnvio.seguimiento?.trim() || !newEnvio.servicio || !newEnvio.material}
                  className="flex-1 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creando...' : 'Crear Envío'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
