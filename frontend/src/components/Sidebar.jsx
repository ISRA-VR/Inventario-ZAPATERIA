import React, { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useAuth } from "../context/AuthContext";

import {
  LayoutDashboard, Users, Package, Tags,
  ArrowUpRight, ArrowDownLeft, Search,
  FileText, History, LogOut, ChevronLeft, ChevronRight, AlertTriangle,
  Ruler
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false); // 1. Estado para el modal

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const { user } = useAuth();

  // 2. Función que solo ABRE el modal
  const clickCerrarSesion = () => {
    setShowModal(true);
  };

  // 3. Función que SI cierra la sesión (Confirmar)
  const confirmarCierre = () => {
    logout();
    navigate("/");
  };

  // 4. Función para cancelar (Cerrar modal)
  const cancelarCierre = () => {
    setShowModal(false);
  };

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin/dashboard' },
    { icon: <Users size={20} />, label: 'Empleados', path: '/admin/empleados' },
    { icon: <Package size={20} />, label: 'Gestión de Productos', path: '/admin/productos' },
    { icon: <Tags size={20} />, label: 'Gestión de Categorías', path: '/admin/categorias' },
    { icon: <Ruler size={20} />, label: 'Tallas y Variantes', path: '/admin/tallaVariante' },
    { icon: <Search size={20} />, label: 'Búsquedas', path: '/admin/busquedas' },
    { icon: <FileText size={20} />, label: 'Reportes', path: '/admin/reportes' },
    { icon: <History size={20} />, label: 'Historial', path: '/admin/historial' },
  ];

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

        {/* HEADER */}
        <div className="sidebar-header">
          <div className="logo-circle">
            <img src="/favicon.ico" alt="Logo" className="logo-beni-van-img" height={30} />
          </div>
          {!isCollapsed && <span className="brand-name">Beni Van Zapateria</span>}
        </div>

        {/* NAV */}
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              title={isCollapsed ? item.label : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {!isCollapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* FOOTER */}
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">👤</div>
            {!isCollapsed && (
              <div className="user-info">
                {/* Mostramos el nombre real que viene de la BD */}
                <span className="user-name">{user?.nombre || "Cargando..."}</span>
                {/* Mostramos el correo real */}
                <span className="user-email">{user?.email}</span>
              </div>
            )}

            {!isCollapsed && (
              <button
                className="logout-btn"
                style={{ marginLeft: 'auto' }}
                onClick={clickCerrarSesion}
                title="Cerrar sesión"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>

          <button className="collapse-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>
      </aside>

      {/* --- EL MODAL (Fuera del aside para que no se corte) --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon">
              <AlertTriangle size={40} color="#f59e0b" />
            </div>
            <h3>¿Cerrar sesión?</h3>
            <p>Estás a punto de salir del sistema.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={cancelarCierre}>Cancelar</button>
              <button className="btn-confirm" onClick={confirmarCierre}>Sí, salir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;