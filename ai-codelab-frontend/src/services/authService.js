import api from "./api";

function syncSolvedSlugs(username, solvedSlugs) {
  if (solvedSlugs && solvedSlugs.length > 0) {
    localStorage.setItem(
      `accepted_problems_${username}`,
      JSON.stringify(solvedSlugs),
    );
  }
}

export const login = async (data) => {
  const res = await api.post("/auth/login", {
    email: data.email,
    password: data.password,
  });

  localStorage.setItem("token", res.data.token);
  localStorage.setItem("username", res.data.username);

  // Restore solved state from backend — survives logout/re-login
  syncSolvedSlugs(res.data.username, res.data.solvedSlugs);

  return res.data;
};

export const register = async (data) => {
  const res = await api.post("/auth/register", data);
  return res.data;
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  // Note: accepted_problems_${username} is intentionally kept
  // so solved state is ready immediately if user logs back in
  // (backend is the source of truth anyway)
  window.location.href = "/login";
};
