import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import "../styles/admin.css";

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;