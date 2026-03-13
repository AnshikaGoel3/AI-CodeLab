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
import { login } from "../services/authService";

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ email: form.identifier, password: form.password });
      navigate("/problems");
    } catch (err) {
      setError(
        err.response?.data?.message || "Invalid credentials. Please try again.",
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
        bgcolor: "#05060b", // Slightly deeper black
        overflow: "hidden",
        position: "relative",
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

      {/* 2. THE CENTRAL GLOW 
          This creates the 'light source' behind the card */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vw",
          height: "80vh",
          maxWidth: "800px",
          maxHeight: "800px",
          background:
            "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(99, 102, 241, 0) 70%)",
          filter: "blur(80px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* 3. Corner Floating Accents */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          left: "-5%",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(79, 70, 229, 0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
          animation: "floatA 15s infinite ease-in-out",
          "@keyframes floatA": {
            "0%, 100%": { transform: "translate(0, 0)" },
            "50%": { transform: "translate(20px, 40px)" },
          },
        }}
      />

      {/* Login Card Container */}
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
            p: { xs: 4, sm: 6 },
            borderRadius: "28px",
            // Dark glass effect
            bgcolor: "rgba(13, 14, 28, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: `
              0 4px 6px rgba(0, 0, 0, 0.3),
              0 20px 50px rgba(0, 0, 0, 0.5),
              inset 0 1px 1px rgba(255, 255, 255, 0.05)
            `,
          }}
        >
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 5 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #6366f1 0%, #22c55e 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                color: "white",
                boxShadow: "0 4px 12px rgba(99, 102, 241, 0.4)",
              }}
            >
              AI
            </Box>
            <Typography
              sx={{ fontWeight: 800, fontSize: "1.1rem", color: "#f8fafc" }}
            >
              AI-CodeLab
            </Typography>
          </Box>

          <Typography
            sx={{ fontWeight: 800, fontSize: "1.75rem", color: "#fff", mb: 1 }}
          >
            Welcome back
          </Typography>
          <Typography sx={{ color: "#94a3b8", fontSize: "0.95rem", mb: 4 }}>
            Please enter your details to sign in.
          </Typography>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: "12px",
                bgcolor: "rgba(211, 47, 47, 0.1)",
                color: "#ff8a80",
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Label>Email Address</Label>
            <TextField
              fullWidth
              placeholder="name@company.com"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              sx={inputSx}
            />

            <Label sx={{ mt: 3 }}>Password</Label>
            <TextField
              fullWidth
              type="password"
              placeholder="••••••••"
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
                py: 1.8,
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                fontSize: "1rem",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: "white",
                boxShadow: "0 4px 15px rgba(99, 102, 241, 0.35)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                  boxShadow: "0 6px 20px rgba(99, 102, 241, 0.45)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={24} sx={{ color: "white" }} />
              ) : (
                "Sign In"
              )}
            </Button>

            <Typography
              sx={{ color: "#64748b", textAlign: "center", fontSize: "0.9rem" }}
            >
              Don&apos;t have an account?{" "}
              <Link
                component={RouterLink}
                to="/register"
                sx={{
                  color: "#818cf8",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Create one
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// Sub-components for cleaner code
const Label = ({ children, sx = {} }) => (
  <Typography
    sx={{
      color: "#cbd5e1",
      fontSize: "0.85rem",
      fontWeight: 600,
      mb: 1,
      ...sx,
    }}
  >
    {children}
  </Typography>
);

const inputSx = {
  "& .MuiOutlinedInput-root": {
    color: "#fff",
    bgcolor: "rgba(255, 255, 255, 0.03)",
    borderRadius: "12px",
    "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
    "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
    "&.Mui-focused fieldset": { borderColor: "#6366f1" },
  },
  "& .MuiInputBase-input::placeholder": { color: "#475569", opacity: 1 },
};
