import { useEffect, useState, useRef } from "react";
import { getProblems } from "../services/problemService";
import { logout } from "../services/authService";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Avatar,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";

function storageKey() {
  const username = localStorage.getItem("username") || "anonymous";
  return `accepted_problems_${username}`;
}

export function markAccepted(slug) {
  const accepted = getAcceptedSlugs();
  accepted.add(slug);
  localStorage.setItem(storageKey(), JSON.stringify([...accepted]));
}

function getAcceptedSlugs() {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey()) || "[]"));
  } catch {
    return new Set();
  }
}

const DIFF_COLOR = { Easy: "#22c55e", Medium: "#f59e0b", Hard: "#ef4444" };
const DIFF_BG = {
  Easy: "rgba(34,197,94,0.08)",
  Medium: "rgba(245,158,11,0.08)",
  Hard: "rgba(239,68,68,0.08)",
};

export default function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [acceptedSlugs, setAccepted] = useState(new Set());
  const [anchorEl, setAnchorEl] = useState(null);
  const username = localStorage.getItem("username") || "User";
  const navigate = useNavigate();

  useEffect(() => {
    getProblems().then(setProblems).catch(console.error);
    setAccepted(getAcceptedSlugs());
  }, []);
  useEffect(() => {
    const onFocus = () => setAccepted(getAcceptedSlugs());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const filtered = problems.filter((p) => {
    const s = p.title.toLowerCase().includes(search.toLowerCase());
    const d = filter === "All" || p.difficulty === filter;
    return s && d;
  });

  const stats = {
    easy: problems.filter((p) => p.difficulty === "Easy").length,
    medium: problems.filter((p) => p.difficulty === "Medium").length,
    hard: problems.filter((p) => p.difficulty === "Hard").length,
    solved: acceptedSlugs.size,
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#070810",
        color: "white",
        fontFamily: '"DM Sans", "Inter", sans-serif',
        backgroundImage:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 70%)",
      }}
    >
      {/* ── Navbar ── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          bgcolor: "rgba(7,8,16,0.85)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" sx={{ py: 1.5 }}>
            {/* Logo */}
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
                  fontSize: "0.8rem",
                  fontWeight: 900,
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

            {/* Nav links */}
            <Stack
              direction="row"
              spacing={3}
              alignItems="center"
              sx={{ mr: 4 }}
            >
              {[["Problems", "/problems"]].map(([label, href]) => (
                <Typography
                  key={label}
                  component={RouterLink}
                  to={href}
                  sx={{
                    color: "#94a3b8",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    "&:hover": { color: "white" },
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Stack>

            {/* Solved badge */}
            <Box
              sx={{
                mr: 2,
                px: 1.5,
                py: 0.5,
                borderRadius: "20px",
                bgcolor: "rgba(99,102,241,0.12)",
                border: "1px solid rgba(99,102,241,0.25)",
              }}
            >
              <Typography
                sx={{ fontSize: "0.78rem", color: "#a5b4fc", fontWeight: 700 }}
              >
                {stats.solved} solved
              </Typography>
            </Box>

            {/* Avatar + dropdown */}
            <Avatar
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{
                width: 34,
                height: 34,
                cursor: "pointer",
                background: "linear-gradient(135deg, #6366f1, #22c55e)",
                fontWeight: 800,
                fontSize: "0.85rem",
                border: "2px solid rgba(99,102,241,0.4)",
                "&:hover": {
                  border: "2px solid rgba(99,102,241,0.8)",
                  transform: "scale(1.05)",
                },
                transition: "all 0.2s",
              }}
            >
              {username.charAt(0).toUpperCase()}
            </Avatar>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              PaperProps={{
                sx: {
                  bgcolor: "#0f111a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  minWidth: 180,
                  mt: 1,
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                },
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <Typography
                  sx={{ fontWeight: 700, fontSize: "0.9rem", color: "white" }}
                >
                  {username}
                </Typography>
                <Typography sx={{ color: "#475569", fontSize: "0.78rem" }}>
                  Coder
                </Typography>
              </Box>
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  navigate("/profile");
                }}
                sx={{
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.04)",
                    color: "white",
                  },
                }}
              >
                <ListItemIcon>
                  <PersonIcon sx={{ color: "#6366f1", fontSize: "1.1rem" }} />
                </ListItemIcon>
                Profile
              </MenuItem>
              <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  logout();
                }}
                sx={{
                  color: "#ef4444",
                  fontSize: "0.85rem",
                  "&:hover": { bgcolor: "rgba(239,68,68,0.06)" },
                }}
              >
                <ListItemIcon>
                  <LogoutIcon sx={{ color: "#ef4444", fontSize: "1.1rem" }} />
                </ListItemIcon>
                Log out
              </MenuItem>
            </Menu>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* ── Hero ── */}
        <Box sx={{ mb: 6, textAlign: "center" }}>
          <Typography
            sx={{
              fontSize: "0.75rem",
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: "#6366f1",
              textTransform: "uppercase",
              mb: 1.5,
            }}
          >
            Practice · Learn · Master
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "2rem", md: "3rem" },
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              mb: 2,
            }}
          >
            Sharpen your{" "}
            <Box
              component="span"
              sx={{
                background: "linear-gradient(90deg, #6366f1 0%, #22c55e 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              coding skills
            </Box>
          </Typography>
          <Typography
            sx={{
              color: "#475569",
              fontSize: "1rem",
              maxWidth: 480,
              mx: "auto",
            }}
          >
            {problems.length} curated problems with AI-powered hints, debugging
            & solutions
          </Typography>
        </Box>

        {/* ── Stat Cards ── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 2,
            mb: 5,
          }}
        >
          {[
            {
              label: "Total",
              value: problems.length,
              color: "#6366f1",
              bg: "rgba(99,102,241,0.08)",
              border: "rgba(99,102,241,0.2)",
            },
            {
              label: "Easy",
              value: stats.easy,
              color: "#22c55e",
              bg: "rgba(34,197,94,0.08)",
              border: "rgba(34,197,94,0.2)",
            },
            {
              label: "Medium",
              value: stats.medium,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.08)",
              border: "rgba(245,158,11,0.2)",
            },
            {
              label: "Hard",
              value: stats.hard,
              color: "#ef4444",
              bg: "rgba(239,68,68,0.08)",
              border: "rgba(239,68,68,0.2)",
            },
          ].map((s) => (
            <Box
              key={s.label}
              sx={{
                p: 2.5,
                borderRadius: "16px",
                bgcolor: s.bg,
                border: `1px solid ${s.border}`,
                textAlign: "center",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-2px)" },
              }}
            >
              <Typography
                sx={{
                  fontSize: "2rem",
                  fontWeight: 900,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </Typography>
              <Typography
                sx={{
                  color: "#475569",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  mt: 0.5,
                }}
              >
                {s.label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* ── Filters ── */}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <TextField
            placeholder="Search problems…"
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{
              width: 280,
              "& .MuiOutlinedInput-root": {
                color: "white",
                bgcolor: "rgba(255,255,255,0.03)",
                borderRadius: "10px",
                "& fieldset": { borderColor: "rgba(255,255,255,0.08)" },
                "&:hover fieldset": { borderColor: "rgba(99,102,241,0.4)" },
                "&.Mui-focused fieldset": { borderColor: "#6366f1" },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#334155", fontSize: "1.1rem" }} />
                </InputAdornment>
              ),
            }}
          />
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && setFilter(v)}
            sx={{
              bgcolor: "rgba(255,255,255,0.02)",
              borderRadius: "10px",
              p: 0.5,
              border: "1px solid rgba(255,255,255,0.06)",
              "& .MuiToggleButton-root": {
                color: "#475569",
                border: "none",
                px: 2,
                py: 0.5,
                borderRadius: "8px !important",
                textTransform: "none",
                fontSize: "0.83rem",
                fontWeight: 600,
                "&.Mui-selected": {
                  color: "white",
                  bgcolor: "#6366f1",
                  "&:hover": { bgcolor: "#4f46e5" },
                },
                "&:hover": { color: "#94a3b8", bgcolor: "transparent" },
              },
            }}
          >
            {["All", "Easy", "Medium", "Hard"].map((d) => (
              <ToggleButton key={d} value={d}>
                {d}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Typography
            sx={{
              color: "#1e2030",
              fontSize: "0.82rem",
              ml: "auto !important",
            }}
          >
            {filtered.length} problems
          </Typography>
        </Stack>

        {/* ── Problem List ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Header */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "44px 1fr 100px",
              px: 2,
              pb: 1,
              borderBottom: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            {["", "Title", "Difficulty"].map((h, i) => (
              <Typography
                key={i}
                sx={{
                  color: "#1e293b",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          {filtered.map((p, i) => {
            const solved = acceptedSlugs.has(p.slug);
            const dc = DIFF_COLOR[p.difficulty] || "#94a3b8";
            return (
              <Box
                key={p.slug}
                component={RouterLink}
                to={`/problems/${p.slug}`}
                sx={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 100px",
                  px: 2,
                  py: 1.75,
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  textDecoration: "none",
                  borderRadius: 0,
                  transition: "background 0.15s",
                  "&:hover": {
                    bgcolor: "rgba(99,102,241,0.04)",
                    "& .title": { color: "#a5b4fc" },
                  },
                }}
              >
                {/* Status */}
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {solved ? (
                    <CheckCircleIcon
                      sx={{ color: "#22c55e", fontSize: "1.1rem" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    />
                  )}
                </Box>

                {/* Title */}
                <Typography
                  className="title"
                  sx={{
                    color: solved ? "#86efac" : "#cbd5e1",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    transition: "color 0.15s",
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      color: "#1e293b",
                      mr: 1.5,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}.
                  </Box>
                  {p.title}
                </Typography>

                {/* Difficulty */}
                <Box
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: "6px",
                    display: "inline-flex",
                    bgcolor: DIFF_BG[p.difficulty] || "transparent",
                    border: `1px solid ${dc}30`,
                    width: "fit-content",
                  }}
                >
                  <Typography
                    sx={{
                      color: dc,
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {p.difficulty}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {filtered.length === 0 && (
          <Box sx={{ py: 12, textAlign: "center" }}>
            <Typography sx={{ color: "#1e293b", fontSize: "1rem" }}>
              No problems match your search
            </Typography>
          </Box>
        )}
      </Container>
    </Box>
  );
}
