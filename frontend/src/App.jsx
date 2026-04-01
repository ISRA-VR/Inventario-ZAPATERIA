import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import AdminLayout from "./pages/AdminLayout";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* ADMIN */
import DashboardPage from "./pages/Admin/Dashboard";
import EmpleadosPage from "./pages/Admin/Empleados";
import ProductosPage from "./pages/Admin/Productos";
import CategoriasPage from "./pages/Admin/categorias";
import EntradasPage from "./pages/Admin/tallaVariante";
import BusquedaPage from "./pages/Admin/busquedas";
import ReportesPage from "./pages/Admin/reportes";
import HistorialPage from "./pages/Admin/historial";

/* EMPLEADO */
import EntradasEmpleado from "./pages/Empleado/entrada";
import SalidasEmpleado from "./pages/Empleado/salidas";
import BusquedasEmpleado from "./pages/Empleado/busquedas";
import EmpleadoLayout from "./pages/Empleado";

/* AUTH */
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        theme="colored"
      />

      <BrowserRouter>
        <Routes>

          {/* LOGIN */}
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            {/* 🔥 RUTA PRINCIPAL (AQUÍ ESTÁ LA MAGIA) */}
            <Route index element={<DashboardPage />} />

            {/* Rutas normales */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="empleados" element={<EmpleadosPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="tallaVariante" element={<EntradasPage />} />

            <Route path="entradas" element={<EntradasEmpleado />} />
            <Route path="salidas" element={<SalidasEmpleado />} />

            <Route path="busquedas" element={<BusquedaPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="historial" element={<HistorialPage />} />
          </Route>

          {/* EMPLEADO */}
          <Route
            path="/empleado"
            element={
              <ProtectedRoute role="empleado">
                <EmpleadoLayout />
              </ProtectedRoute>
            }
          >
            <Route path="entradas" element={<EntradasEmpleado />} />
            <Route path="salidas" element={<SalidasEmpleado />} />
            <Route path="busquedas" element={<BusquedasEmpleado />} />

            {/* Opcional: redirigir si entran directo */}
            <Route index element={<Navigate to="entradas" />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}