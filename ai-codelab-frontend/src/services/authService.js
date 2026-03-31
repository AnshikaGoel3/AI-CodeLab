import api from "./api";

// Merge backend solved slugs INTO localStorage (union, never overwrite).
// This means: if the user cleared localStorage but has solved problems on the
// backend, they get restored. If localStorage has MORE (e.g. guest session),
// those are kept too.
function syncSolvedSlugs(username, solvedSlugs) {
  if (!username || !solvedSlugs) return;
  const key = `accepted_problems_${username}`;
  try {
    const existing = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    solvedSlugs.forEach((s) => existing.add(s));
    localStorage.setItem(key, JSON.stringify([...existing]));
  } catch {
    // If anything goes wrong, don't crash login
  }
}

export const login = async (data) => {
  const res = await api.post("/auth/login", {
    email: data.email,
    password: data.password,
  });

  localStorage.setItem("token", res.data.token);
  localStorage.setItem("username", res.data.username);

  // Restore solved state from backend — merge with any existing local state
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
  // Note: accepted_problems_${username} is intentionally kept so solved
  // state is restored immediately on next login (backend is source of truth).
  window.location.href = "/login";
};
