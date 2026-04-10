import { createContext, useState, useEffect, useContext } from "react";
import { pingPresence as pingPresenceApi, logoutPresence as logoutPresenceApi } from "../api/auth";
import { API_BASE_URL } from "../api/baseUrl";

const LOCAL_LAST_LOGOUT_KEY = "presence_last_logout_local";

const saveLocalLogout = (userId, isoDate) => {
  if (!userId) return;
  try {
    const raw = localStorage.getItem(LOCAL_LAST_LOGOUT_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const next = parsed && typeof parsed === "object" ? parsed : {};
    next[String(userId)] = isoDate;
    localStorage.setItem(LOCAL_LAST_LOGOUT_KEY, JSON.stringify(next));
  } catch {
    // Ignore local persistence issues for presence helper.
  }
};

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

  const notifyLogoutPresenceWithToken = async (token, { keepalive = false } = {}) => {
    if (!token) return;

    const endpoint = `${API_BASE_URL}/api/auth/presence/logout`;

    if (keepalive) {
      try {
        fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: "{}",
          keepalive: true,
        });
        window.dispatchEvent(new Event("presence-updated"));
      } catch {
        // Ignore keepalive failures on page transitions.
      }
      return;
    }

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
      });
      window.dispatchEvent(new Event("presence-updated"));
    } catch {
      // Ignore presence failures to keep auth flow smooth.
    }
  };

  // Función para iniciar sesión
  const login = async (data) => {
    const previousUserId = user?.id;
    const previousToken = user?.token;
    const nextToken = data?.token;

    if (previousToken && previousToken !== nextToken) {
      saveLocalLogout(previousUserId, new Date().toISOString());
      await notifyLogoutPresenceWithToken(previousToken);
    }

    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  // Función para cerrar sesión
  const logout = async () => {
    try {
      if (user?.token) {
        saveLocalLogout(user?.id, new Date().toISOString());
        await logoutPresenceApi();
        window.dispatchEvent(new Event("presence-updated"));
      }
    } catch {
      // Keep logout flow resilient even if presence update fails.
    } finally {
      setUser(null);
      localStorage.removeItem("user");
    }
  };

  // Si el usuario persiste en localStorage, revisamos su token cada vez que cambia
  useEffect(() => {
    if (user?.token && !isTokenValid(user.token)) {
      logout();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.token) return undefined;

    const sendPresencePing = async () => {
      try {
        await pingPresenceApi();
        window.dispatchEvent(new Event("presence-updated"));
      } catch {
        // Keep UI responsive even when ping fails.
      }
    };

    sendPresencePing();
    const intervalId = setInterval(sendPresencePing, 60000);

    const handleFocus = () => sendPresencePing();
    const sendLogoutKeepAlive = () => {
      notifyLogoutPresenceWithToken(user.token, { keepalive: true });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sendPresencePing();
      } else if (document.visibilityState === "hidden") {
        sendLogoutKeepAlive();
      }
    };
    const handleBlur = () => sendLogoutKeepAlive();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user?.token]);

  useEffect(() => {
    if (!user?.token) return undefined;

    const handlePageHide = () => {
      notifyLogoutPresenceWithToken(user.token, { keepalive: true });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [user?.token]);

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