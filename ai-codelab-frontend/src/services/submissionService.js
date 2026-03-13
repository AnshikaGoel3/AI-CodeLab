import api from "./api";

export const getSubmissions = async (slug) => {
  const res = await api.get(`/submissions/${slug}`);
  return res.data;
};
