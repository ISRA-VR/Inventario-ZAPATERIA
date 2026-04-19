import { useEffect, useState, useContext, useRef } from "react";
import { toast } from "react-toastify";
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
  const MAX_ATTEMPTS = 8;
  const BLOCK_MS = 2 * 60 * 1000; // 2 minutes

  const initializedRef = useRef(false);
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

  // Inicializar estado de intentos y bloqueo desde localStorage
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [blockRemaining, setBlockRemaining] = useState(0);
  const lastToastRef = useRef({ msg: "", time: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("login_attempts_state");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.attemptsLeft != null) setAttemptsLeft(parsed.attemptsLeft);
        if (parsed?.blockedUntil) {
          const until = Number(parsed.blockedUntil) || null;
          setBlockedUntil(until);
          if (until && until > Date.now()) setBlockRemaining(until - Date.now());
        }
      }
    } catch (err) {
      // ignore parse errors
    }
  }, []);

  // Contador del bloqueo en tiempo real
  useEffect(() => {
    if (!blockedUntil) return;
    const tick = () => {
      const now = Date.now();
      if (blockedUntil <= now) {
        setBlockedUntil(null);
        setBlockRemaining(0);
        setAttemptsLeft(MAX_ATTEMPTS);
        localStorage.setItem(
          "login_attempts_state",
          JSON.stringify({ attemptsLeft: MAX_ATTEMPTS, blockedUntil: null })
        );
        return;
      }
      setBlockRemaining(blockedUntil - now);
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [blockedUntil]);

  const persistState = (attempts, until) => {
    try {
      localStorage.setItem(
        "login_attempts_state",
        JSON.stringify({ attemptsLeft: attempts, blockedUntil: until })
      );
    } catch (err) {
      // ignore
    }
  };

  const showToastUnique = (msg) => {
    const now = Date.now();
    if (lastToastRef.current.msg === msg && now - lastToastRef.current.time < 3000) return;
    lastToastRef.current = { msg, time: now };
    toast.error(msg);
  };

  const handleFailedAttempt = (type = "credentials") => {
    const prefix = type === "captcha" ? "Captcha incorrecto." : "Credenciales incorrectas.";
    setAttemptsLeft((prev) => {
      const next = Math.max(0, (prev ?? MAX_ATTEMPTS) - 1);
      if (next <= 0) {
        const until = Date.now() + BLOCK_MS;
        setBlockedUntil(until);
        persistState(0, until);
        showToastUnique(`${prefix} Intentos restantes: 0`);
      } else {
        persistState(next, null);
        showToastUnique(`${prefix} Intentos restantes: ${next}`);
      }
      return next;
    });
  };

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

  const formatMs = (ms) => {
    if (!ms || ms <= 0) return "00:00";
    const s = Math.ceil(ms / 1000);
    const mm = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (blockedUntil && blockedUntil > Date.now()) return;
    if (!captchaOk) {
      // Count captcha failure as an attempt but avoid duplicate toasts
      handleFailedAttempt("captcha");
      return;
    }
    try {
      setError("");
      const res = await loginAPI(form);
      await login(res.data);
      // On success reset attempts
      setAttemptsLeft(MAX_ATTEMPTS);
      setBlockedUntil(null);
      persistState(MAX_ATTEMPTS, null);
      res.data.role === "admin" ? navigate("/admin") : navigate("/empleado");
    } catch (err) {
      const isNetworkError = !err?.response;
      const status = err?.response?.status;
      const errorCode = err?.response?.data?.errorCode;
      const msg =
        err?.response?.data?.message ||
          (isNetworkError
            ? `No hay conexión con el backend (${API_BASE_URL}). Verifica que el servicio esté activo.`
            : "No se pudo iniciar sesión. Intenta nuevamente.");

      // Only count attempts for invalid credentials (401)
      if (status === 401 || errorCode === "INVALID_CREDENTIALS") {
        handleFailedAttempt("credentials");
        // don't duplicate toast: handleFailedAttempt already shows the attempts toast
      } else {
        // show server/client message as toast
        showToastUnique(msg);
      }
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
      const msg =
        err?.response?.data?.message ||
          (isNetworkError
            ? `No hay conexión con el backend (${API_BASE_URL}). Verifica que el servicio esté activo.`
            : "No se pudo enviar el enlace. Intenta nuevamente.");
      setRecoverError(msg);
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
          <h1>Gestión Administrativa</h1>
          <p>Ingresa para gestionar ventas, existencias y operaciones del día.</p>
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

          {/* Los errores ahora se muestran como notificaciones (toast) */}

          <form onSubmit={submit}>
            {blockedUntil && blockedUntil > Date.now() && (
              <div className="block-alert-banner">
                <div className="block-alert-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" strokeWidth={0}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="block-alert-content">
                  <p className="block-alert-title">Acceso bloqueado</p>
                  <p className="block-alert-text">Intenta de nuevo en:</p>
                </div>
                <div className="block-alert-timer">
                  <span className="timer-value">{formatMs(blockRemaining)}</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                pattern=".+@gmail\.com"
                className="input-pro"
                title="Por favor ingresa un correo de Gmail"
                placeholder="ejemplo@empresa.com"
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={blockedUntil && blockedUntil > Date.now()}
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
                  title="Ingresa tu contraseña"
                  required
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  disabled={blockedUntil && blockedUntil > Date.now()}
                />
                <button
                  type="button"
                  className="toggle-password-btn"
                  title="Mostrar u ocultar contraseña"
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
                title="Recuperar contraseña"
                onClick={openRecoveryModal}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <div className="captcha-wrapper">
              <Captcha onChange={setCaptchaOk} />
            </div>

            <button type="submit" className="btn-submit-pro" title="Iniciar sesión" disabled={blockedUntil && blockedUntil > Date.now()}>
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
                <button type="submit" className="btn-submit-pro btn-recovery-submit" title="Enviar enlace" disabled={recoverLoading}>
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
