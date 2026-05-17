import axios from 'axios';

const baseURL = process.env.REACT_APP_API_URL ?? 'http://localhost:3010';

export const apiClient = axios.create({
  baseURL,
  timeout: 30000,
});

export const API_BASE_URL = baseURL;
