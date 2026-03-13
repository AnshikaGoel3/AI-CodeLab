import axios from "axios";

const API = "http://localhost:8080/api/auth";

export const login = async (data) => {
  const res = await axios.post(`${API}/login`, {
    email: data.email,
    password: data.password,
  });
  localStorage.setItem("token", res.data.token);
  localStorage.setItem("username", res.data.username);
  return res.data;
};

export const register = async (data) => {
  const res = await axios.post(`${API}/register`, data);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/login";
};
