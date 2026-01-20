import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import Login from './pages/Login';

// Lazy load de páginas para mejorar el rendimiento inicial
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Settings = lazy(() => import('./pages/Settings'));
const Services = lazy(() => import('./pages/Services'));
const Tramitacion = lazy(() => import('./pages/Tramitacion'));
const Technicians = lazy(() => import('./pages/Technicians'));
const Resources = lazy(() => import('./pages/Resources'));
const Registros = lazy(() => import('./pages/Registros'));
const Envios = lazy(() => import('./pages/Envios'));
const Inventario = lazy(() => import('./pages/Inventario'));
const Agenda = lazy(() => import('./pages/Agenda'));
const Reparaciones = lazy(() => import('./pages/Reparaciones'));
const Buscador = lazy(() => import('./pages/Buscador'));
const Valoraciones = lazy(() => import('./pages/Valoraciones'));
const Chatbot = lazy(() => import('./pages/Chatbot'));

const DefaultRoute = () => {
  const { user } = useAuth();
  
  // Redirigir según el puesto del usuario
  if (user?.role === 'Administrativa') {
    return <Navigate to="/panel-grafico" replace />;
  }
  if (user?.role === 'Asesora energética') {
    return <Navigate to="/chatbot" replace />;
  }
  if (user?.role === 'Técnico') {
    return <Navigate to="/panel-grafico" replace />;
  }
  
  // Por defecto para otros roles
  return <Navigate to="/servicios" replace />;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 3 * 60 * 1000, // 3 minutos - considera los datos frescos durante este tiempo
      gcTime: 10 * 60 * 1000, // 10 minutos - mantiene datos en caché (antes era cacheTime)
      refetchOnMount: true, // Refresca al montar componente si los datos están stale
      refetchOnReconnect: true, // Refresca al reconectar internet
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/panel-grafico"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Dashboard />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tareas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Tasks />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/servicios"
              element={
                <RoleProtectedRoute
                  allowedRoles={["Técnico", "Gestora Operativa", "Gestora Técnica", "Responsable", "Asesora energética"]}
                  redirectTo="/panel-grafico"
                >
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Services />
                    </Suspense>
                  </Layout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/seguimiento-tecnicos"
              element={
                <RoleProtectedRoute
                  allowedRoles={["Administrativa", "Responsable", "Técnico"]}
                  redirectTo="/panel-grafico"
                >
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Reparaciones />
                    </Suspense>
                  </Layout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/tramitacion"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Tramitacion />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tecnicos"
              element={
                <RoleProtectedRoute allowedRoles={["Responsable"]} redirectTo="/panel-grafico">
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Technicians />
                    </Suspense>
                  </Layout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/recursos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Resources />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/asesoramientos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Registros />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/envios"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Envios />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ajustes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Settings />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Inventario />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/agenda"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Agenda />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/buscador"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Buscador />
                    </Suspense>
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/valoraciones"
              element={
                <RoleProtectedRoute
                  allowedRoles={["Administrativa"]}
                  redirectTo="/panel-grafico"
                >
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Valoraciones />
                    </Suspense>
                  </Layout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/chatbot"
              element={
                <RoleProtectedRoute
                  allowedRoles={["Asesora energética"]}
                  redirectTo="/panel-grafico"
                >
                  <Layout>
                    <Suspense fallback={<LoadingScreen />}>
                      <Chatbot />
                    </Suspense>
                  </Layout>
                </RoleProtectedRoute>
              }
            />
            <Route path="/" element={<ProtectedRoute><DefaultRoute /></ProtectedRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;