import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-green-100 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-green-600 rounded-full animate-spin"></div>
      </div>
      <p className="text-gray-600 font-medium">Cargando...</p>
    </div>
  );
};

export default LoadingScreen;