import axios from 'axios';
import { getAuthHeaders } from './auth';
import { API_BASE_URL } from './baseUrl';

const API_URL = `${API_BASE_URL}/api`;

export const sendAssistantMessage = (payload) => {
  return axios.post(`${API_URL}/asistente/chat`, payload, getAuthHeaders());
};
