import api from "./api";

export const login = async (data) => {
  const res = await api.post("/auth/login", {
    email: data.email,
    password: data.password,
  });

  localStorage.setItem("token", res.data.token);
  localStorage.setItem("username", res.data.username);

  return res.data;
};

export const register = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  window.location.href = "/login";
};
