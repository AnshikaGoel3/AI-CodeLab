import { useEffect, useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Stack,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
} from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CodeIcon from "@mui/icons-material/Code";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { logout } from "../services/authService";
import { getProblems } from "../services/problemService";
import { getMySubmissions } from "../services/submissionService";

function getAcceptedSlugs() {
  try {
    const username = localStorage.getItem("username") || "anonymous";
    return new Set(
      JSON.parse(localStorage.getItem(`accepted_problems_${username}`) || "[]"),
    );
  } catch {
    return new Set();
  }
}

const DIFF_COLOR = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444" };
const DIFF_BG = {
  Easy: "rgba(34,197,94,0.1)",
  Medium: "rgba(245,158,11,0.1)",
  Hard: "rgba(239,68,68,0.1)",
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "User";
  const [problems, setProblems] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const acceptedSlugs = getAcceptedSlugs();

  useEffect(() => {
    Promise.all([getProblems(), getMySubmissions().catch(() => [])]).then(
      ([probs, subs]) => {
        setProblems(probs);
        setSubmissions(subs);
        setLoading(false);
      },
    );
  }, []);

  const solved = problems.filter((p) => acceptedSlugs.has(p.slug));
  const easy = solved.filter((p) => p.difficulty === "Easy").length;
  const medium = solved.filter((p) => p.difficulty === "Medium").length;
  const hard = solved.filter((p) => p.difficulty === "Hard").length;
  const total = problems.length || 1;
  const pct = Math.round((solved.length / total) * 100);

  // Recent: last 8 unique problem slugs from submissions (most recent first)
  const recentSlugs = [
    ...new Map(submissions.map((s) => [s.problemSlug, s])).values(),
  ].slice(0, 8);

  const recentProblems = recentSlugs
    .map((s) => ({
      ...s,
      problem: problems.find((p) => p.slug === s.problemSlug),
    }))
    .filter((s) => s.problem);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#050609",
        color: "white",
        backgroundImage: `
        radial-gradient(ellipse 60% 40% at 50% -8%, rgba(99,102,241,0.18) 0%, transparent 60%),
        radial-gradient(ellipse 30% 25% at 5% 50%,  rgba(34,197,94,0.07) 0%, transparent 55%),
        radial-gradient(ellipse 25% 20% at 95% 70%, rgba(139,92,246,0.07) 0%, transparent 55%)
      `,
      }}
    >
      {/* Navbar */}
      <Box
        sx={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          bgcolor: "rgba(5,6,9,0.92)",
          backdropFilter: "blur(16px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" sx={{ py: 1.5 }}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  borderRadius: "8px",
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #22c55e 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "0.78rem",
                  color: "white",
                }}
              >
                AI
              </Box>
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: "1.05rem",
                  letterSpacing: "-0.02em",
                }}
              >
                AI-CodeLab
              </Typography>
            </Stack>
            <Box sx={{ flexGrow: 1 }} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack
                direction="row"
                spacing={0.75}
                alignItems="center"
                component={RouterLink}
                to="/problems"
                sx={{
                  color: "#94a3b8",
                  textDecoration: "none",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  "&:hover": { color: "#94a3b8" },
                  cursor: "pointer",
                }}
              >
                <ArrowBackIcon sx={{ fontSize: "1rem" }} />
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Problems
                </Typography>
              </Stack>
              <Box
                onClick={() => logout()}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  color: "#94a3b8",
                  "&:hover": { color: "#ef4444" },
                  transition: "color 0.2s",
                }}
              >
                <LogoutIcon sx={{ fontSize: "1rem" }} />
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Log out
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 5 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
            <CircularProgress sx={{ color: "#6366f1" }} />
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { md: "300px 1fr" },
              gap: 3,
              alignItems: "start",
            }}
          >
            {/* ── LEFT: User Card ── */}
            <Box>
              {/* Avatar card */}
              <Box
                sx={{
                  p: 3,
                  borderRadius: "20px",
                  bgcolor: "#0e0f1c",
                  border: "1px solid rgba(99,102,241,0.15)",
                  backdropFilter: "blur(12px)",
                  mb: 2.5,
                  textAlign: "center",
                }}
              >
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    mx: "auto",
                    mb: 2,
                    background:
                      "linear-gradient(135deg, #6366f1 0%, #22c55e 100%)",
                    fontWeight: 900,
                    fontSize: "2rem",
                    boxShadow:
                      "0 0 0 4px rgba(99,102,241,0.2), 0 8px 32px rgba(99,102,241,0.3)",
                  }}
                >
                  {username.charAt(0).toUpperCase()}
                </Avatar>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: "1.3rem",
                    mb: 0.5,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {username}
                </Typography>
                <Typography sx={{ color: "#94a3b8", fontSize: "0.82rem" }}>
                  Coder · AI-CodeLab
                </Typography>

                <Divider
                  sx={{ my: 2.5, borderColor: "rgba(255,255,255,0.05)" }}
                />

                {/* Progress ring area */}
                <Box
                  sx={{ position: "relative", display: "inline-flex", mb: 1.5 }}
                >
                  <CircularProgress
                    variant="determinate"
                    value={pct}
                    size={80}
                    thickness={4}
                    sx={{
                      color: "#6366f1",
                      "& .MuiCircularProgress-circle": {
                        strokeLinecap: "round",
                      },
                    }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={80}
                    thickness={4}
                    sx={{
                      color: "rgba(255,255,255,0.04)",
                      position: "absolute",
                      left: 0,
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      sx={{ fontWeight: 900, fontSize: "1rem", color: "white" }}
                    >
                      {pct}%
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ color: "#94a3b8", fontSize: "0.78rem" }}>
                  {solved.length} / {problems.length} solved
                </Typography>
              </Box>

              {/* Difficulty breakdown */}
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: "16px",
                  bgcolor: "#0e0f1c",
                  border: "1px solid rgba(255,255,255,0.06)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <Typography
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    mb: 2,
                  }}
                >
                  Breakdown
                </Typography>
                {[
                  [
                    "Easy",
                    easy,
                    problems.filter((p) => p.difficulty === "Easy").length,
                  ],
                  [
                    "Medium",
                    medium,
                    problems.filter((p) => p.difficulty === "Medium").length,
                  ],
                  [
                    "Hard",
                    hard,
                    problems.filter((p) => p.difficulty === "Hard").length,
                  ],
                ].map(([d, count, tot]) => (
                  <Box key={d} sx={{ mb: 1.5 }}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ mb: 0.5 }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.78rem",
                          color: DIFF_COLOR[d],
                          fontWeight: 700,
                        }}
                      >
                        {d}
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.78rem", color: "#64748b" }}
                      >
                        {count}/{tot}
                      </Typography>
                    </Stack>
                    <Box
                      sx={{
                        height: 5,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.04)",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          borderRadius: 3,
                          width: `${tot > 0 ? Math.round((count / tot) * 100) : 0}%`,
                          bgcolor: DIFF_COLOR[d],
                          boxShadow: `0 0 8px ${DIFF_COLOR[d]}`,
                          transition: "width 0.8s ease",
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* ── RIGHT: Stats + Solved + Recent ── */}
            <Box>
              {/* Stat cards */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                  mb: 3,
                }}
              >
                {[
                  {
                    icon: (
                      <CheckCircleIcon
                        sx={{ color: "#22c55e", fontSize: "1.3rem" }}
                      />
                    ),
                    label: "Solved",
                    value: solved.length,
                    color: "#22c55e",
                    bg: "rgba(34,197,94,0.06)",
                  },
                  {
                    icon: (
                      <EmojiEventsIcon
                        sx={{ color: "#f59e0b", fontSize: "1.3rem" }}
                      />
                    ),
                    label: "Hard Solved",
                    value: hard,
                    color: "#f59e0b",
                    bg: "rgba(245,158,11,0.06)",
                  },
                  {
                    icon: (
                      <CodeIcon sx={{ color: "#6366f1", fontSize: "1.3rem" }} />
                    ),
                    label: "Submissions",
                    value: submissions.length,
                    color: "#a5b4fc",
                    bg: "rgba(99,102,241,0.06)",
                  },
                ].map((s) => (
                  <Box
                    key={s.label}
                    sx={{
                      p: 2.5,
                      borderRadius: "16px",
                      bgcolor: s.bg,
                      border: `1px solid ${s.color}22`,
                      backdropFilter: "blur(8px)",
                      transition: "transform 0.2s",
                      "&:hover": { transform: "translateY(-2px)" },
                    }}
                  >
                    {s.icon}
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: "1.8rem",
                        color: "white",
                        lineHeight: 1.1,
                        mt: 0.75,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {s.value}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#64748b",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {s.label}
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Recent activity */}
              {recentProblems.length > 0 && (
                <Box
                  sx={{
                    p: 3,
                    borderRadius: "20px",
                    bgcolor: "#0e0f1c",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                    mb: 3,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      mb: 2,
                    }}
                  >
                    Recent Activity
                  </Typography>
                  {recentProblems.map((s, i) => (
                    <Box
                      key={i}
                      component={RouterLink}
                      to={`/problems/${s.problemSlug}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1.25,
                        borderBottom:
                          i < recentProblems.length - 1
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "none",
                        textDecoration: "none",
                        "&:hover .title": { color: "#a5b4fc" },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box
                          sx={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            flexShrink: 0,
                            bgcolor:
                              s.status === "Accepted" ? "#22c55e" : "#ef4444",
                            boxShadow: `0 0 6px ${s.status === "Accepted" ? "#22c55e" : "#ef4444"}`,
                          }}
                        />
                        <Typography
                          className="title"
                          sx={{
                            color: "#94a3b8",
                            fontSize: "0.88rem",
                            fontWeight: 500,
                            transition: "color 0.15s",
                          }}
                        >
                          {s.problem?.title}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Typography
                          sx={{
                            color:
                              s.status === "Accepted" ? "#22c55e" : "#ef4444",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                          }}
                        >
                          {s.status === "Accepted" ? "✓ Accepted" : "✗ Wrong"}
                        </Typography>
                        <Box
                          sx={{
                            px: 1,
                            py: 0.2,
                            borderRadius: "5px",
                            bgcolor: DIFF_BG[s.problem?.difficulty],
                            border: `1px solid ${DIFF_COLOR[s.problem?.difficulty]}30`,
                          }}
                        >
                          <Typography
                            sx={{
                              color: DIFF_COLOR[s.problem?.difficulty],
                              fontSize: "0.68rem",
                              fontWeight: 800,
                            }}
                          >
                            {s.problem?.difficulty}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Solved problems grid */}
              {solved.length > 0 && (
                <Box
                  sx={{
                    p: 3,
                    borderRadius: "20px",
                    bgcolor: "#0e0f1c",
                    border: "1px solid rgba(255,255,255,0.06)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.78rem",
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      mb: 2,
                    }}
                  >
                    Solved Problems
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {solved.map((p) => (
                      <Chip
                        key={p.slug}
                        label={p.title}
                        component={RouterLink}
                        to={`/problems/${p.slug}`}
                        clickable
                        size="small"
                        sx={{
                          bgcolor: "rgba(34,197,94,0.08)",
                          color: "#86efac",
                          border: "1px solid rgba(34,197,94,0.2)",
                          fontSize: "0.75rem",
                          "&:hover": { bgcolor: "rgba(34,197,94,0.15)" },
                          textDecoration: "none",
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {solved.length === 0 && !loading && (
                <Box
                  sx={{
                    p: 5,
                    borderRadius: "20px",
                    bgcolor: "#0e0f1c",
                    border: "1px solid rgba(255,255,255,0.06)",
                    textAlign: "center",
                  }}
                >
                  <Typography sx={{ fontSize: "2rem", mb: 1 }}>🚀</Typography>
                  <Typography sx={{ color: "#64748b", fontSize: "0.9rem" }}>
                    No problems solved yet — start solving!
                  </Typography>
                  <Typography
                    component={RouterLink}
                    to="/problems"
                    sx={{
                      color: "#a5b4fc",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      "&:hover": { color: "#818cf8" },
                    }}
                  >
                    Browse problems →
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
