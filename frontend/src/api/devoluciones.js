import axios from 'axios';
import { getAuthHeaders } from './auth';
import { API_BASE_URL } from './baseUrl';

const API_URL = `${API_BASE_URL}/api/devoluciones`;

/* Stats del día: devolucionesHoy, dineroRetiradoHoy, devolucionesMes, etc. */
export const getStatsDevolucionesHoy = () =>
  axios.get(`${API_URL}/stats/hoy`, getAuthHeaders());

/* Últimas devoluciones del día */
export const getDevolucionesHoy = () =>
  axios.get(`${API_URL}/hoy`, getAuthHeaders());

/* Top motivos del mes */
export const getMotivosFrecuentes = () =>
  axios.get(`${API_URL}/motivos/frecuentes`, getAuthHeaders());

/* Último retiro registrado para la alerta */
export const getUltimoRetiro = () =>
  axios.get(`${API_URL}/ultimo-retiro`, getAuthHeaders());

/* Busca el producto asociado a un número de ticket */
export const getVentaPorTicket = (numero) =>
  axios.get(`${API_URL}/ticket/${encodeURIComponent(numero)}`, getAuthHeaders());

/* Registra una devolución nueva */
export const registrarDevolucion = (data) =>
  axios.post(API_URL, data, getAuthHeaders());