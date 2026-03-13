import axios from "axios";

const API = "http://localhost:8080/api/problems";

export const getProblems = async () => {
  const res = await axios.get(API);
  return res.data;
};

export const getProblem = async (slug) => {
  const res = await axios.get(`${API}/${slug}`);
  return res.data;
};
