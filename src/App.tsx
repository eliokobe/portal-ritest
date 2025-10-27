import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Settings from './pages/Settings';
import Services from './pages/Services';
import Technicians from './pages/Technicians';
import Resources from './pages/Resources';
import Informe from './pages/Informe';
import Registros from './pages/Registros';
import Envios from './pages/Envios';
import Inventario from './pages/Inventario';
import Email from './pages/Email';

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
              path="/tecnicos"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Technicians />
                  </Layout>
                </ProtectedRoute>
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
            <Route path="/" element={<Navigate to="/servicios" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;