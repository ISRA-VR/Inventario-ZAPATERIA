import axios from 'axios';
import { getAuthHeaders } from './auth';
import { API_BASE_URL } from './baseUrl';

const API_URL = `${API_BASE_URL}/api`;

export const registrarMovimientoEntrada = (entrada) =>
  axios.post(`${API_URL}/movimientos/entrada`, entrada, getAuthHeaders());

export const registrarMovimientoVenta = (venta) =>
  axios.post(`${API_URL}/movimientos/venta`, { venta }, getAuthHeaders());

export const getResumenMovimientos = (params = {}) =>
  axios.get(`${API_URL}/movimientos/resumen`, {
    ...getAuthHeaders(),
    params,
  });
