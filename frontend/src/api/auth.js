import axios from "axios";

const API_URL = "http://localhost:3001/api/auth";

// Función auxiliar para obtener el token del localStorage
const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return {
    headers: {
      Authorization: `Bearer ${user?.token}`, // Mandamos el token de seguridad
    },
  };
};

export const login = (data) => {
  return axios.post(`${API_URL}/login`, data);
};

// --- RUTAS PROTEGIDAS (Necesitan el token del admin) ---

export const register = (data) => {
  return axios.post(`${API_URL}/register`, data, getAuthHeaders());
};

export const getEmpleados = () => {
  return axios.get(`${API_URL}/empleados`, getAuthHeaders());
};

export const updateEmpleado = (id, data) => {
  return axios.put(`${API_URL}/empleados/${id}`, data, getAuthHeaders());
};

export const deleteEmpleado = (id) => {
  return axios.delete(`${API_URL}/empleados/${id}`, getAuthHeaders());
};