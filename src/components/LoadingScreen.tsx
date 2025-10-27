import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#0059F1] flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto bg-white rounded-full flex items-center justify-center">
            <span className="text-[#0059F1] text-2xl font-bold">S</span>
          </div>
          <h1 className="text-white text-3xl font-bold mt-4">Sonrisia</h1>
        </div>
        <div className="flex items-center justify-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <p className="text-white text-lg mt-4">Cargando…</p>
      </div>
    </div>
  );
};

export default LoadingScreen;