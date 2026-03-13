import api from "./api";

export const getProblems = async () => {
  const res = await api.get("/problems");
  return res.data;
};

export const getProblem = async (slug) => {
  const res = await api.get(`/problems/${slug}`);
  return res.data;
};
