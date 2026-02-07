import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Empleado() {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const cerrarSesion = () => {
    logout();
    navigate("/");
  };

  return (
    <div>
      <h1>Bienvenido Empleado</h1>

      <button onClick={cerrarSesion}>
        Cerrar sesión
      </button>
    </div>
  );
}
