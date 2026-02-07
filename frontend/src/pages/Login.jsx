import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginAPI } from "../api/auth";
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

  useEffect(() => {
    if (user) {
      user.role === "admin" ? navigate("/admin") : navigate("/empleado");
    }
  }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (!captchaOk) return setError("Captcha inválido");

    try {
      const res = await loginAPI(form);
      login(res.data);
      res.data.role === "admin" ? navigate("/admin") : navigate("/empleado");
    } catch (err) {
      setError("Correo o contraseña incorrectos");
    }
  };

  return (
    <div className="login-split-screen">
      
      <div className="login-brand-side">
        <div className="brand-overlay">
          {/* Aquí se va a poner el logo: <img src="/logo-white.svg" alt="Logo" className="brand-logo" /> */}
          <h1>Sistema de Gestión de Inventario</h1>
          <p>Accede a tu panel de control para administrar tus recursos de forma eficiente.</p>
        </div>
      </div>

      <div className="login-form-side">
        <div className="form-container-pro">
          <div className="form-header">
            <h2>Hola de nuevo</h2>
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
                  {showPassword ? 
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" /></svg> 
                   : 
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                  }
                </button>
              </div>
            </div>

            <div className="captcha-wrapper">
                 <Captcha onChange={setCaptchaOk} />
            </div>

            <button type="submit" className="btn-submit-pro">
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}