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
  const [showModal, setShowModal] = useState(false);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const { user } = useAuth();

  const clickCerrarSesion = () => {
    setShowModal(true);
  };

  const confirmarCierre = () => {
    logout();
    navigate("/");
  };

  const cancelarCierre = () => {
    setShowModal(false);
  };

  // Definimos todos los items con una propiedad de 'roles' para filtrar
const allMenuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin/dashboard', roles: ['admin'] },
    { icon: <Users size={20} />, label: 'Empleados', path: '/admin/empleados', roles: ['admin'] },
    { icon: <Package size={20} />, label: 'Gestión de Productos', path: '/admin/productos', roles: ['admin'] },
    { icon: <Tags size={20} />, label: 'Gestión de Categorías', path: '/admin/categorias', roles: ['admin'] },
    { icon: <Ruler size={20} />, label: 'Tallas y Variantes', path: '/admin/tallaVariante', roles: ['admin'] },
    {
      icon: <ArrowUpRight size={20} />,
      label: 'Entradas',
      path: user?.role === 'admin' ? '/admin/entradas' : '/empleado/entradas',
      roles: ['admin', 'empleado']
    },
    {
      icon: <ArrowDownLeft size={20} />,
      label: 'Salidas',
      path: user?.role === 'admin' ? '/admin/salidas' : '/empleado/salidas',
      roles: ['admin', 'empleado']
    },
    { 
      icon: <Search size={20} />, 
      label: 'Búsquedas', 
      path: '/empleado/busquedas', 
      roles: ['empleado'] 
    },
    { icon: <FileText size={20} />, label: 'Reportes', path: '/admin/reportes', roles: ['admin'] },
    { icon: <History size={20} />, label: 'Historial', path: '/admin/historial', roles: ['admin'] },
  ];

  // Filtramos los items basándonos en el rol del usuario logueado
  const menuItems = allMenuItems.filter(item => item.roles.includes(user?.role));

  return (
    <>
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>

        {/* HEADER */}
        <div className="sidebar-header">
          <div className="logo-circle">
            <img src="/favicon.ico" alt="Logo" className="logo-beni-van-img" height={30} />
          </div>
          {!isCollapsed && <span className="brand-name">Beni Van Zapatería</span>}
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
                <span className="user-name">{user?.nombre || "Cargando..."}</span>
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

      {/* --- MODAL DE CONFIRMACIÓN --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon">
              <AlertTriangle size={40} color="#f59e0b" />
            </div>
            <h3>¿Cerrar sesión?</h3>
            <p>Estás a punto de salir del sistema de inventario.</p>
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