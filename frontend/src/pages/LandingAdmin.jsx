import { useState } from "react";
import { toast } from "react-toastify";
import { setupFirstAdmin } from "../api/admin";
import "../styles/landingAdmin.css";

export default function LandingAdmin() {
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre es requerido");
      return false;
    }
    if (form.nombre.trim().length < 3) {
      toast.error("El nombre debe tener al menos 3 caracteres");
      return false;
    }
    if (!form.email.trim()) {
      toast.error("El correo es requerido");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Correo inválido");
      return false;
    }
    if (!form.password) {
      toast.error("La contraseña es requerida");
      return false;
    }
    if (form.password.length < 6) {
      toast.error("La contraseña debe tener al menos 6 caracteres");
      return false;
    }
    if (!form.confirmPassword) {
      toast.error("Debes confirmar la contraseña");
      return false;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await setupFirstAdmin(
        form.nombre,
        form.email,
        form.password
      );

      toast.success("¡Administrador creado exitosamente! Ahora inicia sesión con tus credenciales.");
      setTimeout(() => {
        // Recargar la página para que App.jsx verifique nuevamente si existe admin
        window.location.href = "/";
      }, 800);
    } catch (error) {
      toast.error(error.message || "Error al crear administrador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-admin-container">
      <div className="landing-admin-content">
        <div className="landing-admin-header">
          <h1>Bienvenido</h1>
          <p>Configura tu cuenta de administrador del sistema</p>
        </div>

        <form className="landing-admin-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Juan Pérez"
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@ejemplo.com"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <div className="password-input-wrapper">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu contraseña"
                disabled={loading}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
                aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-create-admin"
            disabled={loading}
          >
            {loading ? "Creando administrador..." : "Crear Administrador"}
          </button>
        </form>

        <div className="landing-admin-info">
          <p>
            Esta es la configuración inicial de tu sistema. Una vez creada tu
            cuenta de administrador, podrás gestionar empleados, inventario y
            todas las operaciones del negocio.
          </p>
        </div>
      </div>
    </div>
  );
}
