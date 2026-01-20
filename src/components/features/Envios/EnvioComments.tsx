import React from 'react';
import { User } from '../../../contexts/AuthContext';

interface EnvioCommentsProps {
  comentarios?: string;
  onAddComment: (newComment: string) => Promise<void>;
  isSaving?: boolean;
  user?: User | null;
}

export const EnvioComments: React.FC<EnvioCommentsProps> = ({
  comentarios,
  onAddComment,
  isSaving = false,
  user
}) => {
  const [newComment, setNewComment] = React.useState('');

  const handleSubmit = async () => {
    const trimmed = newComment.trim();
    if (!trimmed) {
      alert('Por favor escribe un comentario');
      return;
    }

    await onAddComment(trimmed);
    setNewComment('');
  };

  return (
    <div className="sm:col-span-2">
      <p className="text-xs uppercase text-gray-500 mb-1">Comentarios</p>
      {comentarios && (
        <div className="mb-2 p-3 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
          <p className="text-sm text-gray-900 whitespace-pre-line">{comentarios}</p>
        </div>
      )}
      <div className="space-y-2">
        <textarea
          placeholder="Escribe un nuevo comentario..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm resize-none"
          rows={3}
          disabled={isSaving}
        />
        <button
          onClick={handleSubmit}
          disabled={isSaving || !newComment.trim()}
          className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-green transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {isSaving ? 'Guardando...' : 'Agregar Comentario'}
        </button>
      </div>
    </div>
  );
};
