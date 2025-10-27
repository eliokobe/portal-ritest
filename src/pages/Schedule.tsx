import React, { useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { airtableService } from '../services/airtable';

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { minDate, maxDate } = useMemo(() => {
    const now = new Date();
    const min = new Date(now.getTime() + 24 * 60 * 60 * 1000);   // +24h
    const max = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30 días
    const fmt = (d: Date) => {
      const tz = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      return tz.toISOString().split('T')[0]; // YYYY-MM-DD
    };
    return { minDate: fmt(min), maxDate: fmt(max) };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!user) {
      setError('Debes iniciar sesión para agendar.');
      return;
    }
    if (!date) {
      setError('Selecciona una fecha.');
      return;
    }
    if (!time) {
      setError('Selecciona una hora.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Indica brevemente el motivo de la reunión.');
      return;
    }
    // Validación en cliente (24h a 30 días)
    const d = new Date(`${date}T${time}:00`);
    const min = new Date(minDate + 'T00:00:00');
    const max = new Date(maxDate + 'T00:00:00');
    if (d < min || d > max) {
      setError('La fecha debe estar entre 24 horas y 30 días desde hoy.');
      return;
    }
    setSubmitting(true);
    try {
      // Usa la clínica del usuario; si falta, intenta usar el nombre como identificador de clínica
      await airtableService.createMeeting({
        clinic: user.clinic || user.name,
        date,        // YYYY-MM-DD
        time,        // HH:mm
        reason,
      });
      setSuccess('Tu solicitud de reunión ha sido registrada. Te contactaremos con la confirmación.');
      setDate('');
      setTime('');
      setReason('');
    } catch {
      setError('No se pudo agendar la reunión. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-left">
        <h1 className="text-3xl font-bold text-gray-900">Agendar Reunión</h1>
        <p className="text-gray-600 mt-2">Selecciona fecha y cuéntanos el motivo.</p>
      </div>

  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {success && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
              {success}
            </div>
          )}
          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
                max={maxDate}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Entre {new Date(minDate).toLocaleDateString('es-ES')} y {new Date(maxDate).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué quieres tratar en la reunión?</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Escribe brevemente el motivo"
              className="w-full px-4 py-3 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-brand-dark focus:border-transparent"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-brand-dark text-white px-6 py-3 rounded-full font-medium hover:bg-brand-green focus:ring-2 focus:ring-brand-dark focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? 'Agendando...' : 'Agendar reunión'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Calendar className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Información importante
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Recibirás una confirmación por email una vez agendada</li>
                <li>Puedes reprogramar o cancelar hasta 24 horas antes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;