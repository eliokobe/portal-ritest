import React, { useEffect } from 'react';

const Informe: React.FC = () => {
  useEffect(() => {
    // Limpiar cualquier script previo de Fillout
    const existingScript = document.querySelector('script[src*="fillout.com"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Cargar el script de Fillout
    const script = document.createElement('script');
    script.src = 'https://server.fillout.com/embed/v1/';
    script.async = true;
    document.body.appendChild(script);

    // Cleanup cuando el componente se desmonte
    return () => {
      const scriptToRemove = document.querySelector('script[src*="fillout.com"]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  return (
    <>
      {/* Encabezado de la página */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Informe</h1>
        <p className="text-gray-600 mt-2">Complete el formulario de informe técnico</p>
      </div>
      
      {/* Formulario embebido - usando el código original proporcionado */}
      <div 
        style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          right: '0px',
          bottom: '0px',
          zIndex: 1000
        }}
      >
        <div 
          data-fillout-id="5guMpjJHQFus" 
          data-fillout-embed-type="fullscreen" 
          data-fillout-inherit-parameters
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </>
  );
};

export default Informe;
