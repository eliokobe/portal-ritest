import React, { useState } from 'react';
import { LifeBuoy, Mail, Phone, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { airtableService } from '../services/airtable';

const Support: React.FC = () => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!subject.trim() || !message.trim()) {
      setError('Por favor, completa Asunto y Mensaje.');
      return;
    }
    if (!user?.email) {
      setError('No se ha encontrado tu email. Inicia sesión nuevamente.');
      return;
    }
    setLoading(true);
    try {
      await airtableService.createTicket({
        email: user.email,
        subject: subject.trim(),
        message: message.trim(),
      });
      setSuccess('Ticket enviado correctamente. Te contactaremos pronto.');
      setSubject('');
      setMessage('');
    } catch {
      setError('No fue posible enviar el ticket. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Soporte</h1>
        <p className="text-gray-600 mt-2">Obtén ayuda técnica y contacta con nuestro equipo de soporte</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enviar Ticket */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <MessageSquare className="h-5 w-5 text-gray-700 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Enviar Ticket de Soporte</h2>
                <p className="text-sm text-gray-600">Describe tu consulta o problema y te responderemos lo antes posible</p>
              </div>
            </div>

            {success && (
              <div className="mb-4 flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                {success}
              </div>
            )}
            {error && (
              <div className="mb-4 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm">{error}</div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Describe brevemente tu consulta"
                  className="w-full border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-brand-dark focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Explica detalladamente tu consulta o problema"
                  rows={6}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-dark focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center bg-[#0059F1] hover:bg-[#003CB8] text-white px-5 py-3 rounded-full font-medium disabled:opacity-50"
              >
                {loading ? 'Enviando…' : 'Enviar Ticket'}
              </button>
            </form>
          </div>
        </div>

        {/* Contacto y Estado */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Contacto Directo</h3>
            <p className="text-sm text-gray-600 mb-4">Múltiples formas de contactar con nuestro equipo</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                <Mail className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-700">soporte@sonrisia.com</p>
                  <p className="text-xs text-gray-500">Respuesta en 24 horas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                <Phone className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Teléfono</p>
                  <p className="text-sm text-gray-700">+34 600 997 778</p>
                  <p className="text-xs text-gray-500">Lunes a Viernes 9:00-18:00</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                <LifeBuoy className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                  <p className="text-sm text-gray-700">Chat directo</p>
                  <p className="text-xs text-gray-500">Respuesta inmediata</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Estado del Sistema</h3>
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              <span>Todos los sistemas operativos</span>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Uptime:</span>
                <span className="text-green-600 font-medium">99.99%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
