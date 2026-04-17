import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import AssistantWidget from '../components/AssistantWidget';
import "../styles/sidebar.css";

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Sidebar /> 
      <main className="admin-content" style={{ padding: 0 }}>
        <Outlet />
      </main>
      <AssistantWidget />
    </div>
  );
};

export default AdminLayout;

