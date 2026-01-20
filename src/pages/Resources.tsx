import { useEffect, useState, useMemo } from 'react';
import { Download, Play } from 'lucide-react';
import { airtableService } from '../services/airtable';
import { useAuth } from '../contexts/AuthContext';

type Resource = {
  id: string;
  name: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  imageUrl?: string;
  enlace?: string; // Campo para enlace de video
};

const Resources = () => {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await airtableService.getResources(user?.id);
        setResources(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  // Mostrar todos los recursos para todos los usuarios (sin filtro por rol)
  const filteredResources = useMemo(() => {
    return resources;
  }, [resources]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Recursos</h1>
        <p className="text-gray-600 mt-2">Documentación técnica y materiales de apoyo</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">Cargando recursos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.map((res) => (
            <article key={res.id} className="bg-white rounded-lg transition-shadow hover:shadow-md border border-gray-200 p-3">
              <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br from-brand-primary via-brand-green to-green-500 flex items-center justify-center">
                {res.imageUrl ? (
                  <img src={res.imageUrl} alt={res.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-white/80 text-lg">Recurso</span>
                )}
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{res.name}</h3>
              <p className="mt-1 text-xs text-gray-600 line-clamp-2">{res.description || '\u00A0'}</p>
              {res.fileUrl && (
                <a
                  href={res.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center justify-center w-full bg-brand-primary hover:bg-brand-green text-white px-3 py-2 rounded-full text-xs font-medium"
                >
                  <Download className="h-3 w-3 mr-1.5" /> Descargar
                </a>
              )}
              {!res.fileUrl && res.enlace && (
                <a
                  href={res.enlace}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center justify-center w-full bg-brand-primary hover:bg-brand-green text-white px-3 py-2 rounded-full text-xs font-medium"
                >
                  <Play className="h-3 w-3 mr-1.5" /> Ver video
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default Resources;
