import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resetPassword } from "../api/auth";
import "../styles/login.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = String(params.get("token") || "").trim();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      setError("El enlace no es válido. Solicita uno nuevo desde el login.");
      setMessage("");
      return;
    }

    if (password.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      setMessage("");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await resetPassword(token, password);
      setMessage(response?.data?.message || "Contraseña actualizada correctamente.");
      setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      setMessage("");
      setError(err?.response?.data?.message || "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-wrapper">
      <div className="reset-card">
        <h1>Restablecer contraseña</h1>
        <p>
          Escribe tu nueva contraseña para recuperar acceso a tu cuenta.
        </p>

        <form onSubmit={handleSubmit} className="reset-form">
          <label htmlFor="new-password">Nueva contraseña</label>
          <input
            id="new-password"
            type="password"
            className="input-pro"
            placeholder="Minimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label htmlFor="confirm-password">Confirmar contraseña</label>
          <input
            id="confirm-password"
            type="password"
            className="input-pro"
            placeholder="Repite tu contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          {error && <div className="recovery-alert recovery-alert-error">{error}</div>}
          {message && <div className="recovery-alert recovery-alert-success">{message}</div>}

          <button type="submit" className="btn-submit-pro" disabled={loading}>
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>

        <Link to="/" className="reset-back-link">
          Volver al inicio de sesion
        </Link>
      </div>
    </div>
  );
}
