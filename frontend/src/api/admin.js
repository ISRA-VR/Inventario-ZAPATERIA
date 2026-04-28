import { API_BASE_URL } from "./baseUrl";

export const checkFirstAdmin = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/check-first-admin`);
    if (!response.ok) {
      throw new Error("Error al verificar administrador");
    }
    return await response.json();
  } catch (error) {
    console.error("Error en checkFirstAdmin:", error);
    throw error;
  }
};

export const setupFirstAdmin = async (nombre, email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/setup-first-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ nombre, email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al crear administrador");
    }

    return await response.json();
  } catch (error) {
    console.error("Error en setupFirstAdmin:", error);
    throw error;
  }
};
