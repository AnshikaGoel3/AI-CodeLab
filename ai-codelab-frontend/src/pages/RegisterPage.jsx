import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
} from "@mui/material";
import { register } from "../services/authService";

export default function RegisterPage() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#05060b",
        overflow: "hidden",
        position: "relative",
        py: 4,
      }}
    >
      {/* 1. Background Dot Grid */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* 2. THE CENTRAL GLOW */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vw",
          height: "80vh",
          maxWidth: "800px",
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
          filter: "blur(80px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* 3. Animated Corner Accents */}
      <Box
        sx={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
          filter: "blur(50px)",
          animation: "floatA 10s infinite ease-in-out",
          "@keyframes floatA": {
            "0%, 100%": { transform: "translate(0,0)" },
            "50%": { transform: "translate(-20px, 30px)" },
          },
        }}
      />

      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 420,
          mx: 2,
        }}
      >
        <Box
          sx={{
            p: { xs: 4, sm: 5 },
            borderRadius: "28px",
            bgcolor: "rgba(14, 15, 28, 0.94)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255,255,255,0.05)",
          }}
        >
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 4 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1 0%, #22c55e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "0.8rem",
                color: "white",
                boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
              }}
            >
              AI
            </Box>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: "1.1rem",
                color: "#f1f5f9",
                letterSpacing: "-0.02em",
              }}
            >
              AI-CodeLab
            </Typography>
          </Box>

          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "1.7rem",
              color: "#f1f5f9",
              letterSpacing: "-0.04em",
              mb: 0.5,
            }}
          >
            Create account
          </Typography>
          <Typography sx={{ color: "#64748b", fontSize: "0.92rem", mb: 4 }}>
            Join and start solving today
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: "12px",
                bgcolor: "rgba(239,68,68,0.1)",
                color: "#fca5a5",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Label>Username</Label>
            <TextField
              fullWidth
              placeholder="johndoe"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              sx={inputSx}
            />

            <Label sx={{ mt: 3 }}>Email</Label>
            <TextField
              fullWidth
              type="email"
              placeholder="you@example.com"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              sx={inputSx}
            />

            <Label sx={{ mt: 3 }}>Password</Label>
            <TextField
              fullWidth
              type="password"
              placeholder="••••••••"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              sx={inputSx}
            />

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              sx={{
                mt: 4,
                mb: 3,
                py: 1.7,
                fontWeight: 700,
                borderRadius: "12px",
                textTransform: "none",
                color: "white",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #818cf8 0%, #6366f1 100%)",
                  transform: "translateY(-1px)",
                },
                transition: "all 0.2s",
              }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "white" }} />
              ) : (
                "Create Account →"
              )}
            </Button>

            <Typography
              sx={{ color: "#475569", fontSize: "0.9rem", textAlign: "center" }}
            >
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/login"
                sx={{
                  color: "#818cf8",
                  fontWeight: 700,
                  textDecoration: "none",
                  "&:hover": { color: "#a5b4fc" },
                }}
              >
                Sign in
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const Label = ({ children, sx = {} }) => (
  <Typography
    sx={{
      color: "#94a3b8",
      fontSize: "0.8rem",
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      mb: 1,
      ...sx,
    }}
  >
    {children}
  </Typography>
);

const inputSx = {
  "& .MuiOutlinedInput-root": {
    color: "#f1f5f9",
    bgcolor: "rgba(255,255,255,0.04)",
    borderRadius: "12px",
    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
    "&:hover fieldset": { borderColor: "rgba(99,102,241,0.5)" },
    "&.Mui-focused fieldset": { borderColor: "#6366f1" },
  },
  "& input::placeholder": { color: "#334155", opacity: 1 },
};
