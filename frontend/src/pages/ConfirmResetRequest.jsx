import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { confirmResetRequest } from "../api/auth";
import "../styles/login.css";

export default function ConfirmResetRequest() {
  const [params] = useSearchParams();
  const token = String(params.get("token") || "").trim();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const runConfirmation = async () => {
      if (!token) {
        setError("El enlace de confirmación no es válido.");
        setLoading(false);
        return;
      }

      try {
        const response = await confirmResetRequest(token);
        setMessage(
          response?.data?.message ||
            "Solicitud confirmada. Revisa tu correo para continuar con el restablecimiento."
        );
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "No se pudo confirmar la solicitud. Pide un nuevo enlace desde el login."
        );
      } finally {
        setLoading(false);
      }
    };

    runConfirmation();
  }, [token]);

  return (
    <div className="reset-wrapper">
      <div className="reset-card">
        <h1>Confirmar recuperación</h1>
        <p>
          Estamos validando tu solicitud para enviarte el correo final de restablecimiento.
        </p>

        {loading && <div className="recovery-alert recovery-alert-success">Confirmando solicitud...</div>}
        {!loading && message && <div className="recovery-alert recovery-alert-success">{message}</div>}
        {!loading && error && <div className="recovery-alert recovery-alert-error">{error}</div>}

        <Link to="/" className="reset-back-link">
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
