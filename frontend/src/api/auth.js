import axios from "axios";

export const login = (data) => {
  return axios.post(
    "http://localhost:3001/api/auth/login",
    data
  );
};

export const register = (data) => {
  return axios.post(
    "http://localhost:3001/api/auth/register",
    data
  );
};

export const getEmpleados = () => {
  return axios.get("http://localhost:3001/api/auth/empleados");
};

export const updateEmpleado = (id, data) => {
  return axios.put(`http://localhost:3001/api/auth/empleados/${id}`, data);
};

export const deleteEmpleado = (id) => {
  return axios.delete(`http://localhost:3001/api/auth/empleados/${id}`);
};
