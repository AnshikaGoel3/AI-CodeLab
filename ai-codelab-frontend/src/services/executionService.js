import api from "./api";

/**
 * Run code against TC1 (or custom stdin).
 * The backend injects the parsing preamble — user code is ONLY the solve() function.
 */
export const runCode = async (slug, sourceCode, languageId, stdin = "") => {
  const res = await api.post(`/code/run/${slug}`, {
    sourceCode,
    languageId,
    stdin,
  });
  return res.data;
};

/**
 * Submit code against all test cases.
 * Backend injects the parsing preamble automatically.
 */
export const submitCode = async (slug, sourceCode, languageId) => {
  const res = await api.post(`/code/submit/${slug}`, {
    sourceCode,
    languageId,
  });
  return res.data;
};
