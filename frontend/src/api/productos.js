import axios from "axios";
import { getAuthHeaders } from "./auth";
import { API_BASE_URL } from "./baseUrl";

const API_URL = `${API_BASE_URL}/api`;

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

export const updateTalla = (id, data) => {
  return axios.put(`${API_URL}/tallas/${id}`, data, getAuthHeaders());
};