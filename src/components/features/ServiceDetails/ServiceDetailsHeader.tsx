import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { Service } from '../../../types';

interface ServiceDetailsHeaderProps {
  detailsView: string;
  setDetailsView: (view: any) => void;
  isTramitacion: boolean;
  isReparacion: boolean;
  isGestoraTecnica: boolean;
  service: Service;
  onLoadHistorial: () => Promise<void>;
}

export const ServiceDetailsHeader: React.FC<ServiceDetailsHeaderProps> = ({
  detailsView,
  setDetailsView,
  isTramitacion,
  isReparacion,
  isGestoraTecnica,
  service,
  onLoadHistorial,
}) => {
  if (isReparacion) return null;

  return (
    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            detailsView === 'detalles' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
          onClick={() => setDetailsView('detalles')}
        >
          Detalles
        </button>
        {!isTramitacion && (
          <>
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                detailsView === 'formulario' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setDetailsView('formulario')}
            >
              Formulario
            </button>
            {!isGestoraTecnica && (
              <button
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  detailsView === 'reparaciones' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setDetailsView('reparaciones')}
              >
                Reparaciones
              </button>
            )}
            <button
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                detailsView === 'historial' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={onLoadHistorial}
            >
              Historial
            </button>
          </>
        )}
        {isTramitacion && (
          <button
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              detailsView === 'fotos' ? 'bg-brand-primary text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
            onClick={() => setDetailsView('fotos')}
          >
            Fotos
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        {service.telefono && (
          <a
            href={`tel:${service.telefono}`}
            className="p-1.5 rounded-full text-green-600 hover:bg-green-100 transition-colors"
            title="Llamar"
          >
            <Phone className="h-5 w-5" />
          </a>
        )}
        {service.conversationId && (
          <a
            href={`https://chat.ritest.es/app/accounts/1/inbox-view/conversation/${service.conversationId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-full text-green-600 hover:bg-green-100 transition-colors"
            title="Abrir chat"
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        )}
      </div>
    </div>
  );
};
