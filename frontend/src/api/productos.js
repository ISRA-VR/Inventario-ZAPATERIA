import axios from "axios";
import { getAuthHeaders } from "./auth";

const API_URL = "http://localhost:3001/api";

export const getProductos = () => {
  return axios.get(`${API_URL}/productos`, getAuthHeaders());
};

export const createProducto = (data) => {
  return axios.post(`${API_URL}/productos`, data, getAuthHeaders());
};

export const updateProducto = (id, data) => {
  return axios.put(`${API_URL}/productos/${id}`, data, getAuthHeaders());
};

export const deleteProducto = (id) => {
  return axios.delete(`${API_URL}/productos/${id}`, getAuthHeaders());
};

export const getCategorias = () => {
    return axios.get(`${API_URL}/categorias/`, getAuthHeaders());
};

export const getTallas = () => {
    return axios.get(`${API_URL}/tallas`, getAuthHeaders());
};

// Nueva función agregada para actualizar las tallas
export const updateTalla = (id, data) => {
    return axios.put(`${API_URL}/tallas/${id}`, data, getAuthHeaders());
};