import api from "./api";

export const runCode = async (slug, sourceCode, languageId, stdin = "") => {
  const res = await api.post(`/code/run/${slug}`, {
    sourceCode,
    languageId,
    stdin,
  });
  return res.data;
};

export const submitCode = async (slug, sourceCode, languageId) => {
  const username = localStorage.getItem("username") || "anonymous";
  const res = await api.post(`/code/submit/${slug}`, {
    sourceCode,
    languageId,
    username,
  });
  return res.data;
};
