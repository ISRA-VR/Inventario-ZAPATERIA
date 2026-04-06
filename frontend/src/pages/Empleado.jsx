import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AssistantWidget from '../components/AssistantWidget';
/* Reutilizamos el estilo de layout para mantener la coherencia visual */
import "../styles/sidebar.css"; 

const EmpleadoLayout = () => {
  return (
    <div className="admin-layout">
      <Sidebar /> 
      <main className="admin-content">
        <Outlet />
      </main>
      <AssistantWidget />
    </div>
  );
};

export default EmpleadoLayout;