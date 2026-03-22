import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import "../styles/sidebar.css";

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Sidebar /> 
      <main className="admin-content" style={{ padding: 0 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

