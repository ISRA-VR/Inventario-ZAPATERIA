import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
/* Reutilizamos el estilo de layout para mantener la coherencia visual */
import "../styles/admin.css"; 

const EmpleadoLayout = () => {
  return (
    <div className="admin-layout">
      {/* El Sidebar detectará automáticamente al usuario para mostrar las opciones */}
      <Sidebar /> 
      <main className="admin-content">
        {/* Aquí se renderizarán entradas, salidas y búsquedas */}
        <Outlet />
      </main>
    </div>
  );
};

export default EmpleadoLayout;