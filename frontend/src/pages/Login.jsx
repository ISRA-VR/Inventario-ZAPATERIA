import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword, login as loginAPI } from "../api/auth";
import { API_BASE_URL } from "../api/baseUrl";
import { AuthContext } from "../context/AuthContext";
import Captcha from "../components/Captcha";
import "../styles/login.css";

export default function Login() {
  const navigate = useNavigate();
  const { user, login } = useContext(AuthContext);

  const [captchaOk, setCaptchaOk] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverMessage, setRecoverMessage] = useState("");
  const [recoverError, setRecoverError] = useState("");
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 640px)").matches;
  });

  useEffect(() => {
    if (user) {
      user.role === "admin" ? navigate("/admin") : navigate("/empleado");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 640px)");
    const onChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  const legalText = (
    <>
      © 2026 Beni Van Zapatería.
      <br />
      Todos los derechos son reservados.
    </>
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!captchaOk) return setError("Captcha inválido");

    try {
      setError("");
      const res = await loginAPI(form);
      await login(res.data);
      res.data.role === "admin" ? navigate("/admin") : navigate("/empleado");
    } catch (err) {
      const isNetworkError = !err?.response;
      setError(
        err?.response?.data?.message ||
          (isNetworkError
            ? `No hay conexión con el backend (${API_BASE_URL}). Verifica que el servicio esté activo.`
            : "No se pudo iniciar sesión. Intenta nuevamente.")
      );
    }
  };

  const openRecoveryModal = () => {
    setRecoverEmail(form.email || "");
    setRecoverMessage("");
    setRecoverError("");
    setShowRecoveryModal(true);
  };

  const closeRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoverMessage("");
    setRecoverError("");
  };

  const submitRecovery = async (e) => {
    e.preventDefault();
    const email = String(recoverEmail || "").trim();
    const esEmailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!esEmailValido) {
      setRecoverError("Ingresa un correo válido para continuar.");
      setRecoverMessage("");
      return;
    }

    try {
      setRecoverLoading(true);
      setRecoverError("");
      const response = await forgotPassword(email);
      setRecoverMessage(
        response?.data?.message ||
          "Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña."
      );
    } catch (err) {
      setRecoverMessage("");
      const isNetworkError = !err?.response;
      setRecoverError(
        err?.response?.data?.message ||
          (isNetworkError
            ? `No hay conexión con el backend (${API_BASE_URL}). Verifica que el servicio esté activo.`
            : "No se pudo enviar el enlace. Intenta nuevamente.")
      );
    } finally {
      setRecoverLoading(false);
    }
  };

  return (
    <div className="login-split-screen">

      {/* ── BRAND SIDE ── */}
      <div className="login-brand-side">
        <div className="brand-overlay">
          <img src="/logo-Beni_Van-sin-fondo.png" alt="Logo" className="brand-logo" />
          <h1>Control de<br />Inventario</h1>
          <p>Accede a tu panel de control para administrar tus recursos de forma eficiente.</p>
          {!isMobile && <p className="brand-footer">{legalText}</p>}
        </div>
      </div>

      {/* ── FORM SIDE ── */}
      <div className="login-form-side">
        <div className="form-container-pro">

          <div className="form-header">
            <h2>¡Bienvenido!</h2>
            <p className="text-muted">Ingresa tus credenciales para continuar.</p>
          </div>

          {error && <div className="error-alert">{error}</div>}

          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className="input-pro"
                placeholder="ejemplo@empresa.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Contraseña</label>
              <div className="input-group-pro">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="input-pro"
                  placeholder="••••••••"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Ocultar" : "Mostrar"}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                type="button"
                className="forgot-password-link"
                onClick={openRecoveryModal}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="captcha-wrapper">
              <Captcha onChange={setCaptchaOk} />
            </div>

            <button type="submit" className="btn-submit-pro">
              Iniciar Sesión
            </button>
          </form>

          <div className="form-footer">
            <a href="/privacidad.html" target="_blank" rel="noopener noreferrer">Privacidad</a>
            <a href="/terminos.html" target="_blank" rel="noopener noreferrer">Términos</a>
            <a href="/soporte.html" target="_blank" rel="noopener noreferrer">Soporte</a>
          </div>

          {isMobile && <p className="form-mobile-legal">{legalText}</p>}

        </div>
      </div>

      {showRecoveryModal && (
        <div className="recovery-modal-overlay" onClick={closeRecoveryModal}>
          <div className="recovery-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="recovery-modal-header">
              <h3>Recuperar contraseña</h3>
              <button type="button" className="recovery-modal-close" onClick={closeRecoveryModal}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="recovery-modal-subtitle">
              Ingresa tu correo y te enviaremos instrucciones para restablecer tu acceso.
            </p>

            <form onSubmit={submitRecovery} className="recovery-form">
              <label htmlFor="recovery-email">Correo electrónico</label>
              <input
                id="recovery-email"
                type="email"
                className="input-pro"
                placeholder="ejemplo@empresa.com"
                value={recoverEmail}
                onChange={(e) => setRecoverEmail(e.target.value)}
                autoFocus
              />

              {recoverError && <div className="recovery-alert recovery-alert-error">{recoverError}</div>}
              {recoverMessage && <div className="recovery-alert recovery-alert-success">{recoverMessage}</div>}

              <div className="recovery-modal-actions">
                <button type="button" className="btn-cancel-recovery" onClick={closeRecoveryModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-submit-pro btn-recovery-submit" disabled={recoverLoading}>
                  {recoverLoading ? "Enviando..." : "Enviar enlace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
