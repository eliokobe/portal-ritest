import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import Services from './pages/Services';
import Tramitacion from './pages/Tramitacion';
import Technicians from './pages/Technicians';
import Resources from './pages/Resources';
import Informe from './pages/Informe';
import Registros from './pages/Registros';
import Envios from './pages/Envios';
import Inventario from './pages/Inventario';
import Email from './pages/Email';

const DefaultRoute = () => {
  const { user } = useAuth();
  
  // Redirigir según el puesto del usuario
  if (user?.role === 'Administrativa') {
    return <Navigate to="/panel-grafico" replace />;
  }
  if (user?.role === 'Asesora energética') {
    return <Navigate to="/asesoramientos" replace />;
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
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tareas"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Tasks />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/servicios"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Services />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tramitacion"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Tramitacion />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tecnicos"
              element={
                <RoleProtectedRoute allowedRoles={["Responsable"]}>
                  <Layout>
                    <Technicians />
                  </Layout>
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/email"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Email />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/recursos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Resources />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/informe"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Informe />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/asesoramientos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Registros />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/envios"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Envios />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ajustes"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventario"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Inventario />
                  </Layout>
                </ProtectedRoute>
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