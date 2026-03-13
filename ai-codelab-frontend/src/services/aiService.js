import api from "./api";

const AI = "/ai";

export const getHints = async (problem) => {
  const res = await api.post(`${AI}/hint`, { problem });
  return res.data.hints;
};

export const debugCode = async (problem, code, failedTest) => {
  const res = await api.post(`${AI}/debug`, {
    problem,
    code,
    input: failedTest?.input || "",
    expected: failedTest?.expected || "",
    actual: failedTest?.actual || "",
  });
  return res.data.explanation;
};

export const getSolution = async (problem, language, availableVars = "") => {
  const res = await api.post(`${AI}/solution`, {
    problem,
    language,
    availableVars,
  });
  return res.data;
};

export const getComplexity = async (code, problem = "") => {
  const res = await api.post(`${AI}/complexity`, { code, problem });
  return res.data;
};
