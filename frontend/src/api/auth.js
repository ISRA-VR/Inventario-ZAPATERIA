import axios from "axios";
import { API_BASE_URL } from "./baseUrl";

const API_URL = `${API_BASE_URL}/api/auth`;
export const getAuthHeaders = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user?.token) return {};
  return {
    headers: {
      Authorization: `Bearer ${user.token}`,
    },
  };
};

export const login = (data) => {
  return axios.post(`${API_URL}/login`, data);
};

export const forgotPassword = (email) => {
  return axios.post(`${API_URL}/forgot-password`, { email });
};

export const confirmResetRequest = (token) => {
  return axios.post(`${API_URL}/confirm-reset-request`, { token });
};

export const resetPassword = (token, password) => {
  return axios.post(`${API_URL}/reset-password`, { token, password });
};

export const register = (data) => {
  return axios.post(`${API_URL}/register`, data, getAuthHeaders());
};

export const getEmpleados = () => {
  return axios.get(`${API_URL}/empleados`, getAuthHeaders());
};

export const updateEmpleado = (id, data) => {
  return axios.put(`${API_URL}/empleados/${id}`, data, getAuthHeaders());
};

export const updateEmpleadoEstado = (id, activo) => {
  return axios.patch(`${API_URL}/empleados/${id}/estado`, { activo }, getAuthHeaders());
};

export const deleteEmpleado = (id) => {
  return axios.delete(`${API_URL}/empleados/${id}`, getAuthHeaders());
};

export const pingPresence = () => {
  return axios.post(`${API_URL}/presence/ping`, {}, getAuthHeaders());
};

export const logoutPresence = () => {
  return axios.post(`${API_URL}/presence/logout`, {}, getAuthHeaders());
};