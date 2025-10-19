import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { airtableService } from '../services/airtable';

type Resource = {
  id: string;
  name: string;
  description?: string;
  fileUrl?: string;
  fileName?: string;
  imageUrl?: string;
};

const Resources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await airtableService.getResources();
        setResources(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Recursos</h1>
        <p className="text-gray-600 mt-2">Documentación técnica y materiales de apoyo</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {resources.map((res) => (
            <article key={res.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br from-brand-primary via-brand-green to-green-500 flex items-center justify-center">
                {res.imageUrl ? (
                  <img src={res.imageUrl} alt={res.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-white/80 text-xl">Recurso</span>
                )}
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{res.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{res.description || '\u00A0'}</p>
              {res.fileUrl && (
                <a
                  href={res.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center justify-center w-full bg-brand-primary hover:bg-brand-green text-white px-4 py-2 rounded-full text-sm font-medium"
                >
                  <Download className="h-4 w-4 mr-2" /> Descargar
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
