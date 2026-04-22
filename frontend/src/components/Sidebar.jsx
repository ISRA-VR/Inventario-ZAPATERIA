import React, { useState, useContext, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useAuth } from "../context/AuthContext";

import {
  Home, Users, Package, Tags,
  ArrowUpRight, Search,
  FileText, History, LogOut, ChevronLeft, ChevronRight, AlertTriangle, Store,
  ReceiptText, Menu, X, User,
  RotateCcw
} from 'lucide-react';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const clickCerrarSesion = () => {
    setShowModal(true);
  };

  const confirmarCierre = async () => {
    await logout();
    navigate("/");
  };

  const cancelarCierre = () => {
    setShowModal(false);
  };

  const irAPuntoDeVenta = () => {
    const rutaPuntoVenta = user?.role === 'admin' ? '/admin/punto-venta' : '/empleado/punto-venta';
    navigate(rutaPuntoVenta);
  };

  const irAInventario = () => {
    const rutaInventario = user?.role === 'admin' ? '/admin/inventario-detallado' : '/empleado/busquedas';
    navigate(rutaInventario);
  };

  const basePuntoVentaPath = user?.role === 'admin' ? '/admin/punto-venta' : '/empleado/punto-venta';
  const enPuntoVenta = location.pathname.startsWith(basePuntoVentaPath);

  // Definimos todos los items con una propiedad de 'roles' para filtrar
  const allMenuItems = [
    { icon: <Home size={20} />, label: 'Inicio', path: '/admin/dashboard', roles: ['admin'] },
    { icon: <Users size={20} />, label: 'Empleados', path: '/admin/empleados', roles: ['admin'] },
    { icon: <Tags size={20} />, label: 'Gestión de Categorías', path: '/admin/categorias', roles: ['admin'] },
    { icon: <Tags size={20} />, label: 'Gestión de Categorías', path: '/empleado/categorias', roles: ['empleado'] },
    { icon: <Package size={20} />, label: 'Inventario', path: '/admin/inventario-detallado', roles: ['admin'] },
    { icon: <FileText size={20} />, label: 'Liquidaciones', path: '/admin/liquidaciones', roles: ['admin'] },
    {
      icon: <ArrowUpRight size={20} />,
      label: user?.role === 'empleado' ? 'Mis movimientos' : 'Movimientos',
      path: user?.role === 'admin' ? '/admin/movimientos' : '/empleado/movimientos',
      roles: ['admin', 'empleado']
    },
    { 
      icon: <Search size={20} />, 
      label: 'Búsquedas', 
      path: '/empleado/busquedas', 
      roles: ['empleado'] 
    },
    { icon: <FileText size={20} />, label: 'Reportes', path: '/admin/reportes', roles: ['admin'] },
  ];

  const puntoVentaMenuItems = [
    {
      icon: <Store size={20} />,
      label: 'Punto de Venta',
      path: basePuntoVentaPath,
      exact: true,
      roles: ['admin', 'empleado']
    },
    {
      icon: <History size={20} />,
      label: 'Historial de Ventas',
      path: `${basePuntoVentaPath}/historial`,
      roles: ['admin', 'empleado']
    },
    {
      icon: <ReceiptText size={20} />,
      label: 'Ir a Caja',
      path: `${basePuntoVentaPath}/caja`,
      roles: ['admin', 'empleado']
    },
    {
      icon: <RotateCcw size={20} />,
      label: 'Devoluciones',
      path: `${basePuntoVentaPath}/devoluciones`,
      roles: ['admin', 'empleado']
    },
  ];

  // Filtramos los items basándonos en el rol del usuario logueado
  const menuItemsFuente = enPuntoVenta ? puntoVentaMenuItems : allMenuItems;
  const menuItems = menuItemsFuente.filter(item => item.roles.includes(user?.role));

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        className={`sidebar-mobile-toggle ${isMobileOpen ? 'is-open' : ''}`}
        onClick={() => setIsMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>

        {/* HEADER */}
        <div className="sidebar-header">
          <div className="logo-circle">
            <img src="/favicon.ico" alt="Logo" className="logo-beni-van-img" height={30} />
          </div>
          {!isCollapsed && <span className="brand-name">Beni Van Zapatería</span>}
          <button
            className="sidebar-mobile-close"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAV */}
        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              end={Boolean(item.exact)}
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
          {!isCollapsed && (
            <button
              className={`punto-venta-btn ${enPuntoVenta ? 'inventario-btn' : ''}`}
              onClick={enPuntoVenta ? irAInventario : irAPuntoDeVenta}
              title={enPuntoVenta ? 'Ir al inventario' : 'Ir a punto de venta'}
            >
              {enPuntoVenta ? <Package size={16} /> : <Store size={16} />}
              <span>{enPuntoVenta ? 'Ir al inventario' : 'Ir a punto de venta'}</span>
            </button>
          )}

          <div className="user-profile">
            <div className="user-avatar"><User size={18} /></div>
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