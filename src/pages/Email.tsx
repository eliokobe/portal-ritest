import { useEffect } from 'react';

export default function Email() {
  useEffect(() => {
    window.location.href = 'https://mail.hostinger.com/?_task=mail&_mbox=INBOX';
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-lg text-gray-700">Redirigiendo a correo...</p>
    </div>
  );
}
