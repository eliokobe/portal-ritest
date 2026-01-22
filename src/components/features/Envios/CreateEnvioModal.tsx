import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Modal } from '../../common/Modal';
import { Envio } from '../../../types';
import { getStatusColors } from '../../../utils/statusColors';

interface CreateEnvioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (envioData: any) => Promise<boolean>;
  tecnicos: { id: string; nombre: string }[];
  catalogos: { id: string; nombre: string }[];
  serviciosInfo: any[];
}

const normalizeExpediente = (value?: string | number) => (value ?? '').toString().replace(/\s+/g, '').toLowerCase();

export const CreateEnvioModal: React.FC<CreateEnvioModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  tecnicos,
  catalogos,
  serviciosInfo
}) => {
  const [destinatarioType, setDestinatarioType] = useState<'cliente' | 'tecnico' | null>(null);
  const [tecnicoSearch, setTecnicoSearch] = useState('');
  const [selectedTecnico, setSelectedTecnico] = useState<{ id: string; nombre: string } | null>(null);
  const [expedienteQuery, setExpedienteQuery] = useState('');
  const [expedienteError, setExpedienteError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  
  const [newEnvio, setNewEnvio] = useState<Omit<Envio, 'id'>>({
    servicio: '',
    catalogo: '',
    cliente: '',
    direccion: '',
    poblacion: '',
    codigoPostal: '',
    provincia: '',
    telefono: '',
    comentarios: '',
  });

  const handleClose = () => {
    setDestinatarioType(null);
    setSelectedTecnico(null);
    setTecnicoSearch('');
    setExpedienteQuery('');
    setExpedienteError(null);
    setNewEnvio({
      servicio: '',
      catalogo: '',
      cliente: '',
      direccion: '',
      poblacion: '',
      codigoPostal: '',
      provincia: '',
      telefono: '',
      comentarios: '',
    });
    onClose();
  };

  const handleSelectServicioPorExpediente = () => {
    const needle = normalizeExpediente(expedienteQuery);
    const match = serviciosInfo.find((s) => normalizeExpediente(s.numero) === needle);
    
    if (!needle || !match) {
      setExpedienteError('Número no encontrado');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnvio.servicio) return;
    
    setCreating(true);
    const numeroAuto = expedienteQuery?.trim() ? expedienteQuery.trim() : undefined;
    const envioData: any = {
      ...newEnvio,
      numero: numeroAuto,
    };
    
    if (selectedTecnico) {
      envioData.tecnico = [selectedTecnico.id];
    }
    
    const success = await onCreate(envioData);
    if (success) {
      handleClose();
    }
    setCreating(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Añadir Nuevo Envío"
      size="md"
    >
      <div className="space-y-4">
        {/* Paso 1: Seleccionar tipo de destinatario */}
        {!destinatarioType && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">¿El envío es para un cliente o un técnico?</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setDestinatarioType('cliente')}
                className="px-6 py-4 border-2 border-gray-300 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-colors font-medium"
              >
                Cliente
              </button>
              <button
                type="button"
                onClick={() => setDestinatarioType('tecnico')}
                className="px-6 py-4 border-2 border-gray-300 rounded-lg hover:border-brand-primary hover:bg-brand-primary/5 transition-colors font-medium"
              >
                Técnico
              </button>
            </div>
          </div>
        )}

        {/* Paso 2: Si es técnico, mostrar buscador de técnicos */}
        {destinatarioType === 'tecnico' && !selectedTecnico && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setDestinatarioType(null)}
              className="text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Volver
            </button>
            <div>
              <label htmlFor="tecnicoSearch" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar Técnico
              </label>
              <input
                type="text"
                id="tecnicoSearch"
                value={tecnicoSearch}
                onChange={(e) => setTecnicoSearch(e.target.value)}
                placeholder="Escribe el nombre del técnico..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                autoFocus
              />
            </div>
            {tecnicoSearch && (
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {tecnicos
                  .filter(t => t.nombre.toLowerCase().includes(tecnicoSearch.toLowerCase()))
                  .map(tecnico => (
                    <button
                      key={tecnico.id}
                      type="button"
                      onClick={() => {
                        setSelectedTecnico(tecnico);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{tecnico.nombre}</p>
                    </button>
                  ))}
                {tecnicos.filter(t => t.nombre.toLowerCase().includes(tecnicoSearch.toLowerCase())).length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">No se encontraron técnicos</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Paso 3: Formulario principal */}
        {(destinatarioType === 'cliente' || (destinatarioType === 'tecnico' && selectedTecnico)) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedTecnico && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-gray-600">Envío para técnico:</p>
                <p className="font-medium text-gray-900">{selectedTecnico.nombre}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTecnico(null);
                    setTecnicoSearch('');
                  }}
                  className="text-xs text-brand-primary hover:text-brand-primary/80 mt-1"
                >
                  Cambiar técnico
                </button>
              </div>
            )}

            <div>
              <label htmlFor="expediente" className="block text-sm font-medium text-gray-700 mb-1">
                Número *
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
                  placeholder="Introduce el número"
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
                <p className="text-xs text-green-600 mt-1">Número vinculado</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
                  Destinatario
                </label>
                <input
                  type="text"
                  id="cliente"
                  value={newEnvio.cliente || ''}
                  onChange={(e) => setNewEnvio((prev) => ({ ...prev, cliente: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="Nombre del destinatario"
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
                  Ciudad
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
                style={{ appearance: 'none', backgroundImage: 'none', paddingLeft: '0.5rem', paddingRight: '0.5rem', minWidth: '120px' }}
              >
                <option value="">Seleccionar producto</option>
                {catalogos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="comentarios" className="block text-sm font-medium text-gray-700 mb-1">
                Comentarios
              </label>
              <textarea
                id="comentarios"
                rows={3}
                value={newEnvio.comentarios || ''}
                onChange={(e) => setNewEnvio((prev) => ({ ...prev, comentarios: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                placeholder="Añade comentarios del envío"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
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
        )}
      </div>
    </Modal>
  );
};
