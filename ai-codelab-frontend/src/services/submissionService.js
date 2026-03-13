import api from "./api";

// Per-problem submissions (problem detail page)
export const getSubmissions = async (slug) => {
  const res = await api.get(`/submissions/${slug}`);
  return res.data;
};

// Current user's submissions (profile page)
export const getMySubmissions = async () => {
  const username = localStorage.getItem("username") || "anonymous";
  const res = await api.get(
    `/submissions/mine?username=${encodeURIComponent(username)}`,
  );
  return res.data;
};
