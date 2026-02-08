import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminLayout from "./pages/AdminLayout";
import DashboardPage from "./pages/Admin/Dashboard";
import EmpleadosPage from "./pages/Admin/Empleados";
import ProductosPage from "./pages/Admin/Productos";
import CategoriasPage from "./pages/Admin/categorias";
import EntradasPage from "./pages/Admin/entradas";
import SalidasPage from "./pages/Admin/salidas";
import BusquedaPage from "./pages/Admin/busquedas";
import ReportesPage from "./pages/Admin/reportes";
import HistorialPage from "./pages/Admin/historial";

import Empleado from "./pages/Empleado";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta Pública: Login */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} /> {/* Pantalla por defecto */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="empleados" element={<EmpleadosPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="entradas" element={<EntradasPage />} />
            <Route path="salidas" element={<SalidasPage />} />
            <Route path="busquedas" element={<BusquedaPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="historial" element={<HistorialPage />} />
          </Route>

          {/* Rutas Protegidas: Empleado */}
          <Route
            path="/empleado"
            element={
              <ProtectedRoute role="empleado">
                <Empleado />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}