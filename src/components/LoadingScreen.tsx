import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8 relative">
          {/* Círculo exterior giratorio */}
          <div className="w-32 h-32 mx-auto relative">
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-2xl">
              <span className="text-green-600 text-3xl font-bold">R</span>
            </div>
          </div>
          <h1 className="text-white text-4xl font-bold mt-6 tracking-tight">Ritest</h1>
        </div>
        {/* Barra de progreso animada */}
        <div className="w-64 mx-auto h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full animate-pulse" style={{ 
            animation: 'loading 1.5s ease-in-out infinite',
            width: '40%'
          }}></div>
        </div>
        <p className="text-white/90 text-base mt-6 font-medium">Cargando portal…</p>
      </div>
      <style>{`
        @keyframes loading {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;