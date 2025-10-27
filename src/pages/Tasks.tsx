import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { airtableService } from '../services/airtable';

interface Task {
  id: string;
  tarea: string;
  estado: string;
  prioridad?: string;
  fechaLimite?: string;
  notas?: string;
  fechaModificacion?: string;
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await airtableService.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'Hecha' ? 'Pendiente' : 'Hecha';
      await airtableService.updateTaskStatus(taskId, newStatus);
      
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, estado: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Error al actualizar la tarea');
    }
  };

  const isCompletedMoreThan24HoursAgo = (task: Task) => {
    if (task.estado !== 'Hecha' || !task.fechaModificacion) return false;
    
    const modificationDate = new Date(task.fechaModificacion);
    const now = new Date();
    const hoursDiff = (now.getTime() - modificationDate.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff > 24;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const isOverdue = (dateString?: string) => {
    if (!dateString) return false;
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const getPriorityColor = (prioridad?: string) => {
    switch (prioridad) {
      case 'Alta':
        return 'bg-green-200 text-green-900 border-green-300';
      case 'Media':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Baja':
        return 'bg-green-50 text-green-700 border-green-100';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark"></div>
      </div>
    );
  }

  const pendingTasks = tasks.filter(t => t.estado !== 'Hecha');
  // Filtrar tareas completadas hace menos de 24 horas
  const completedTasks = tasks.filter(t => t.estado === 'Hecha' && !isCompletedMoreThan24HoursAgo(t));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tareas</h1>
        <p className="text-gray-600 mt-2">Gestiona tus tareas diarias</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Pendientes ({pendingTasks.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {pendingTasks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay tareas pendientes
            </div>
          ) : (
            pendingTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleTask(task.id, task.estado)}
                    className="mt-1 flex-shrink-0 w-6 h-6 border-2 border-gray-300 rounded hover:border-brand-primary transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-gray-900">{task.tarea}</h3>
                      {task.prioridad && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(task.prioridad)}`}>
                          {task.prioridad}
                        </span>
                      )}
                    </div>
                    {task.notas && (
                      <p className="text-sm text-gray-600 mt-1">{task.notas}</p>
                    )}
                    {task.fechaLimite && (
                      <p
                        className={`text-sm mt-1 ${
                          isOverdue(task.fechaLimite)
                            ? 'text-red-600 font-medium'
                            : 'text-gray-500'
                        }`}
                      >
                        Vence: {formatDate(task.fechaLimite)}
                        {isOverdue(task.fechaLimite) && ' (Vencida)'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {completedTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Completadas ({completedTasks.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {completedTasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50 transition-colors opacity-60">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleTask(task.id, task.estado)}
                    className="mt-1 flex-shrink-0 w-6 h-6 bg-brand-primary border-2 border-brand-primary rounded flex items-center justify-center"
                  >
                    <Check className="h-4 w-4 text-white" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-medium text-gray-900 line-through">
                        {task.tarea}
                      </h3>
                      {task.prioridad && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(task.prioridad)}`}>
                          {task.prioridad}
                        </span>
                      )}
                    </div>
                    {task.notas && (
                      <p className="text-sm text-gray-600 mt-1 line-through">{task.notas}</p>
                    )}
                    {task.fechaLimite && (
                      <p className="text-sm text-gray-500 mt-1">
                        Vence: {formatDate(task.fechaLimite)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
