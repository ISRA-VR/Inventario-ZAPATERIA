import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import AdminLayout from "./pages/AdminLayout";

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

/* Rutas para el administrador */
import DashboardPage from "./pages/Admin/Dashboard";
import EmpleadosPage from "./pages/Admin/Empleados";
import ProductosPage from "./pages/Admin/Productos";
import CategoriasPage from "./pages/Admin/categorias";
import EntradasPage from "./pages/Admin/tallaVariante";
import BusquedaPage from "./pages/Admin/busquedas";
import ReportesPage from "./pages/Admin/reportes";
import HistorialPage from "./pages/Admin/historial";

/* Rutas para el empleado */
import EntradasEmpleado from "./pages/Empleado/entrada"; // Capitalizado para seguir buenas prácticas
import SalidasEmpleado from "./pages/Empleado/salidas";
import BusquedasEmpleado from "./pages/Empleado/busquedas";

import EmpleadoLayout from "./pages/Empleado"; // Asumiendo que funciona como Layout
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
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

          {/* Rutas Protegidas: Administrador */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" index element={<DashboardPage />} />
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

          {/* Rutas Protegidas: Empleado */}
          <Route
            path="/empleado"
            element={
              <ProtectedRoute role="empleado">
                <EmpleadoLayout />
              </ProtectedRoute>
            }
          >
            {/* Rutas hijas para el panel de empleado */}
            <Route path="entradas" element={<EntradasEmpleado />} />
            <Route path="salidas" element={<SalidasEmpleado />} />
            <Route path="busquedas" element={<BusquedasEmpleado />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}