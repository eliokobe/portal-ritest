import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Save, Edit3 } from 'lucide-react';
import { airtableService } from '../services/airtable';

const Settings: React.FC = () => {
  const { user, updateUserContext } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
  await airtableService.updateUser(user.id, formData);
  // Actualiza el contexto para que otros módulos (p.ej. Schedule) vean la clínica y otros datos
  updateUserContext?.(formData);
      setIsEditing(false);
      // En una implementación real, actualizarías el contexto del usuario
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ajustes</h1>
        <p className="text-gray-600 mt-2">Gestiona tu información personal y preferencias</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Información Personal */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Información Personal</h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 text-sm font-medium text-brand-primary hover:bg-green-50 rounded-full transition-colors"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Editar
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-full transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-[#0059F1] hover:bg-[#003CB8] rounded-full transition-colors disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Nombre Completo
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0059F1] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 py-2">{user?.name || 'No especificado'}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Correo Electrónico
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0059F1] focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 py-2">{user?.email || 'No especificado'}</p>
              )}
            </div>

            {/* Teléfono y Clínica eliminados a petición */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;