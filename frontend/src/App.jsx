import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ConfirmResetRequest from "./pages/ConfirmResetRequest";
import AdminLayout from "./pages/AdminLayout";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./styles/undoToast.css";

/* ADMIN */
import DashboardPage from "./pages/Admin/Dashboard";
import EmpleadosPage from "./pages/Admin/Empleados";
import CategoriasPage from "./pages/Admin/categorias";
import EntradasPage from "./pages/Admin/tallaVariante";
import BusquedaPage from "./pages/Admin/busquedas";
import ReportesPage from "./pages/Admin/reportes";
import InventarioDetalladoPage from "./pages/Admin/InventarioDetallado";
import LiquidacionesPage from "./pages/Admin/liquidaciones";
import PuntoVentaPage from "./pages/punto-venta/puntoVenta";
import CajaPage from "./pages/punto-venta/caja";
import HistorialVentasPage from "./pages/punto-venta/historialVentas";

/* EMPLEADO */
import MovimientosEmpleado from "./pages/Empleado/entrada";
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

          <Route
            path="/reset-password"
            element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            }
          />

          <Route
            path="/confirm-reset-request"
            element={
              <PublicRoute>
                <ConfirmResetRequest />
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
            <Route path="productos" element={<Navigate to="/admin/inventario-detallado" replace />} />
            <Route path="empleados" element={<EmpleadosPage />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="tallaVariante" element={<EntradasPage />} />

            <Route path="movimientos" element={<MovimientosEmpleado />} />
            <Route path="entradas" element={<Navigate to="/admin/movimientos" replace />} />
            <Route path="salidas" element={<Navigate to="/admin/movimientos" replace />} />

            <Route path="busquedas" element={<BusquedaPage />} />
            <Route path="reportes" element={<ReportesPage />} />
            <Route path="inventario-detallado" element={<InventarioDetalladoPage />} />
            <Route path="liquidaciones" element={<LiquidacionesPage />} />
            <Route path="punto-venta" element={<PuntoVentaPage />} />
            <Route path="punto-venta/caja" element={<CajaPage />} />
            <Route path="punto-venta/historial" element={<HistorialVentasPage />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
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
            <Route path="movimientos" element={<MovimientosEmpleado />} />
            <Route path="entradas" element={<Navigate to="/empleado/movimientos" replace />} />
            <Route path="salidas" element={<Navigate to="/empleado/movimientos" replace />} />
            <Route path="busquedas" element={<BusquedasEmpleado />} />
            <Route path="categorias" element={<CategoriasPage />} />
            <Route path="punto-venta" element={<PuntoVentaPage />} />
            <Route path="punto-venta/caja" element={<CajaPage />} />
            <Route path="punto-venta/historial" element={<HistorialVentasPage />} />

            {/* Opcional: redirigir si entran directo */}
            <Route index element={<Navigate to="movimientos" />} />
            <Route path="*" element={<Navigate to="/empleado/movimientos" replace />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}