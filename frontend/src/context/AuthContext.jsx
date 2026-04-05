import { createContext, useState, useEffect, useContext } from "react";

// Validación sencilla de token JWT usando `exp` para proteger rutas cuando ya expiró.
const isTokenValid = (token) => {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  try {
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return payload.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};

// 1. Creamos el contexto
export const AuthContext = createContext();

// 2. Definimos el proveedor
export const AuthProvider = ({ children }) => {
  // Inicializamos el estado con lo que haya en localStorage
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    if (!savedUser) return null;

    try {
      const parsed = JSON.parse(savedUser);
      if (!parsed.token || !isTokenValid(parsed.token)) {
        localStorage.removeItem("user");
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem("user");
      return null;
    }
  });

  // Función para iniciar sesión
  const login = (data) => {
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  // Función para cerrar sesión
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  // Si el usuario persiste en localStorage, revisamos su token cada vez que cambia
  useEffect(() => {
    if (user?.token && !isTokenValid(user.token)) {
      logout();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. ¡EL PILÓN! Custom Hook para usar el contexto más fácil
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};