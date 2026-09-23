import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api",
  // Avoid leaving the interface in a perpetual loading state if a deployment
  // is unavailable or an upstream AI request never completes.
  timeout: 120_000,
});

export default api;
