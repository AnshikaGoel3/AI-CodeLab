import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Stack,
  Button,
  Avatar,
  CircularProgress,
  ThemeProvider,
  createTheme,
  IconButton,
  Divider,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
} from "@mui/material";
import {
  Lightbulb,
  Bug,
  CheckCircle,
  XCircle,
  BarChart3,
  Code2,
  ChevronLeft,
} from "lucide-react";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import CodeEditor from "../components/CodeEditor";
import { getProblem } from "../services/problemService";
import {
  getHints,
  debugCode,
  getSolution,
  getComplexity,
} from "../services/aiService";
import { getSubmissions } from "../services/submissionService";
import { markAccepted } from "../pages/ProblemsPage";
import { logout } from "../services/authService";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: { default: "#0a0c1a", paper: "#0f111a" },
    primary: { main: "#86efac" },
    error: { main: "#ef4444" },
    text: { primary: "#ffffff", secondary: "#cbd5e1" },
    divider: "rgba(255,255,255,0.05)",
  },
  shape: { borderRadius: 12 },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif' },
});

// ── Example input renderer ────────────────────────────────────────────────────
// Renders each key on its own row with colour-coded values. No raw JSON blobs.

function renderVal(v, depth = 0) {
  if (v === null || v === undefined)
    return <span style={{ color: "#64748b" }}>null</span>;
  if (typeof v === "boolean")
    return <span style={{ color: "#f472b6" }}>{String(v)}</span>;
  if (typeof v === "number")
    return <span style={{ color: "#fb923c", fontWeight: 600 }}>{v}</span>;
  if (typeof v === "string")
    return <span style={{ color: "#86efac" }}>"{v}"</span>;

  // Flat array of primitives → single line
  if (Array.isArray(v) && v.every((x) => x === null || typeof x !== "object")) {
    return (
      <span style={{ color: "#e2e8f0" }}>
        [&thinsp;
        {v.map((x, i) => (
          <span key={i}>
            {renderVal(x)}
            {i < v.length - 1 && <span style={{ color: "#475569" }}>, </span>}
          </span>
        ))}
        &thinsp;]
      </span>
    );
  }

  // Nested array
  if (Array.isArray(v)) {
    return (
      <Box
        component="span"
        sx={{ display: "block", pl: `${(depth + 1) * 14}px` }}
      >
        {v.map((x, i) => (
          <Box key={i} component="span" sx={{ display: "block" }}>
            {renderVal(x, depth + 1)}
            {i < v.length - 1 && <span style={{ color: "#475569" }}>,</span>}
          </Box>
        ))}
      </Box>
    );
  }

  // Tree node: show compact inline summary
  if (typeof v === "object" && "val" in v) {
    const flatVals = [];
    const collect = (n) => {
      if (!n) return;
      flatVals.push(n.val);
      collect(n.left);
      collect(n.right);
    };
    collect(v);
    return (
      <span>
        <span style={{ color: "#7dd3fc" }}>Tree</span>
        <span style={{ color: "#475569" }}> (nodes: </span>
        <span style={{ color: "#fb923c" }}>[{flatVals.join(", ")}]</span>
        <span style={{ color: "#475569" }}>)</span>
      </span>
    );
  }

  // Generic object: key-by-key
  if (typeof v === "object") {
    return (
      <Box component="span" sx={{ display: "block" }}>
        {Object.entries(v).map(([k, val]) => (
          <Box
            key={k}
            component="span"
            sx={{ display: "block", pl: `${(depth + 1) * 14}px` }}
          >
            <span style={{ color: "#7dd3fc" }}>{k}</span>
            <span style={{ color: "#475569" }}>: </span>
            {renderVal(val, depth + 1)}
          </Box>
        ))}
      </Box>
    );
  }
  return <span>{String(v)}</span>;
}

function ExampleBlock({ example, idx }) {
  // example.input may be a JSON string from MongoDB — parse it
  let input = example.input;
  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      /* keep as string */
    }
  }
  const output = example.output;

  return (
    <Box
      sx={{
        mb: 3,
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.07)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1,
          bgcolor: "rgba(134,239,172,0.05)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#86efac",
            letterSpacing: "0.08em",
          }}
        >
          EXAMPLE {idx + 1}
        </Typography>
        {example.explanation && (
          <Typography
            sx={{ fontSize: "0.78rem", color: "#475569", fontStyle: "italic" }}
          >
            — {example.explanation}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* Input */}
        <Box sx={{ p: 2.5, borderRight: "1px solid rgba(255,255,255,0.05)" }}>
          <Typography
            sx={{
              color: "#334155",
              fontSize: "0.68rem",
              fontWeight: 700,
              mb: 1.5,
              letterSpacing: "0.1em",
            }}
          >
            INPUT
          </Typography>
          <Box
            sx={{
              fontFamily: "monospace",
              fontSize: "0.875rem",
              lineHeight: 2,
            }}
          >
            {typeof input === "object" &&
            input !== null &&
            !Array.isArray(input) ? (
              Object.entries(input).map(([k, v]) => (
                <Box
                  key={k}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0,
                    flexWrap: "wrap",
                    mb: 0.25,
                  }}
                >
                  <span
                    style={{
                      color: "#7dd3fc",
                      fontWeight: 700,
                      marginRight: 6,
                      flexShrink: 0,
                    }}
                  >
                    {k}
                  </span>
                  <span
                    style={{ color: "#475569", marginRight: 6, flexShrink: 0 }}
                  >
                    =
                  </span>
                  <span>{renderVal(v)}</span>
                </Box>
              ))
            ) : (
              <span style={{ color: "#e2e8f0" }}>{renderVal(input)}</span>
            )}
          </Box>
        </Box>

        {/* Output */}
        <Box sx={{ p: 2.5 }}>
          <Typography
            sx={{
              color: "#334155",
              fontSize: "0.68rem",
              fontWeight: 700,
              mb: 1.5,
              letterSpacing: "0.1em",
            }}
          >
            OUTPUT
          </Typography>
          <Box
            sx={{
              fontFamily: "monospace",
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "#fb923c",
            }}
          >
            {output !== undefined ? String(output) : "—"}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProblemDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [activeTab, setActiveTab] = useState("description");
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [lastFailed, setLastFailed] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [anchorEl, setAnchorEl] = useState(null);
  const [editorCode, setEditorCode] = useState(""); // always mirrors what's in the editor
  const username = localStorage.getItem("username") || "User";

  useEffect(() => {
    getProblem(slug).then(setProblem).catch(console.error);
  }, [slug]);

  useEffect(() => {
    if (activeTab === "submissions") {
      getSubmissions(slug).then(setSubmissions).catch(console.error);
    }
  }, [activeTab, slug]);

  const handleSubmitResult = (result, failedTest) => {
    setTestResults(result.testResults || []);
    setLastFailed(failedTest || null);
    // Persist accepted status so ProblemsPage shows green checkmark
    if (result.status === "Accepted") markAccepted(slug);
  };

  // Extract available variable names from starterCode comment or starterCode keys
  const getAvailableVars = () => {
    const starter = problem?.starterCode?.[currentLanguage] || "";
    const match = starter.match(/Available variables?:\s*([^\n]+)/i);
    return match ? match[1].trim() : "see problem description";
  };

  const hasSubmitted = testResults.length > 0;

  const handleAIAction = async (type) => {
    if (!problem) return;
    // Debug and Complexity require a submission
    if ((type === "debug" || type === "complexity") && !hasSubmitted) return;

    setIsAiLoading(true);
    setAiPanelOpen(true);
    try {
      let response;
      const codeToAnalyze = editorCode || lastFailed?.code || "";

      if (type === "hint") {
        response = await getHints(problem.description);
        setAiResponse(response.join("\n\n"));
      } else if (type === "debug") {
        response = await debugCode(
          problem.description,
          codeToAnalyze,
          lastFailed || {
            input: "",
            expected: "",
            actual: "(run or submit first to see actual output)",
          },
        );
        setAiResponse(response);
      } else if (type === "solution") {
        const ex = problem.examples?.[0];
        const exStr = ex
          ? `\n\nExample — Input: ${JSON.stringify(ex.input)}, Expected: ${ex.output}`
          : "";
        response = await getSolution(
          problem.description + exStr,
          currentLanguage,
          getAvailableVars(),
        );
        setAiResponse(response);
      } else if (type === "complexity") {
        response = await getComplexity(codeToAnalyze, problem.description);
        setAiResponse(response);
      }
    } catch (err) {
      setAiResponse(`AI Error: ${err.message}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!problem) {
    return (
      <ThemeProvider theme={darkTheme}>
        <Box
          sx={{
            height: "100vh",
            bgcolor: "background.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress sx={{ color: "primary.main" }} />
        </Box>
      </ThemeProvider>
    );
  }

  const diffColor =
    problem.difficulty === "Easy"
      ? "#22c55e"
      : problem.difficulty === "Medium"
        ? "#eab308"
        : "#ef4444";

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          bgcolor: "#070810",
          backgroundImage: `
          radial-gradient(ellipse 60% 40% at 50% -8%, rgba(99,102,241,0.18) 0%, transparent 60%),
          radial-gradient(ellipse 30% 25% at 5%  50%, rgba(34,197,94,0.07) 0%, transparent 55%),
          radial-gradient(ellipse 25% 20% at 95% 70%, rgba(139,92,246,0.07) 0%, transparent 55%)
        `,
        }}
      >
        {/* Navbar */}
        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            py: 1.25,
            px: 3,
            display: "flex",
            alignItems: "center",
            bgcolor: "rgba(15,17,26,0.97)",
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ color: "primary.main" }}
          >
            <Code2 size={20} />
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1rem" }}>
              AI-CodeLab
            </Typography>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />

          {/* User avatar + logout dropdown */}
          <Avatar
            onClick={(e) => setAnchorEl(e.currentTarget)}
            sx={{
              width: 32,
              height: 32,
              cursor: "pointer",
              background: "linear-gradient(135deg, #6366f1, #22c55e)",
              fontWeight: 800,
              fontSize: "0.82rem",
              border: "2px solid rgba(99,102,241,0.3)",
              "&:hover": {
                border: "2px solid rgba(99,102,241,0.7)",
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
                boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
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
              <Typography sx={{ color: "#475569", fontSize: "0.75rem" }}>
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
        </Box>

        <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
          {/* ── LEFT PANEL ── */}
          <Box
            sx={{
              width: "50%",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              borderRight: 1,
              borderColor: "divider",
            }}
          >
            {/* Tabs */}
            <Box
              sx={{
                px: 2,
                bgcolor: "rgba(255,255,255,0.02)",
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
              }}
            >
              {["description", "submissions"].map((tab) => (
                <Typography
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  sx={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    py: 1.5,
                    px: 2.5,
                    mr: 0.5,
                    color: activeTab === tab ? "#ffffff" : "text.secondary",
                    borderBottom:
                      activeTab === tab
                        ? "2px solid #86efac"
                        : "2px solid transparent",
                    "&:hover": { color: "#ffffff" },
                    transition: "all 0.15s",
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Typography>
              ))}
            </Box>

            {/* Content */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: 3,
                bgcolor: "background.paper",
              }}
            >
              {activeTab === "description" && (
                <Box>
                  {/* Title + difficulty */}
                  <Stack
                    direction="row"
                    alignItems="flex-start"
                    spacing={2}
                    sx={{ mb: 2.5 }}
                  >
                    <Typography
                      variant="h5"
                      sx={{ fontWeight: 800, lineHeight: 1.3, flex: 1 }}
                    >
                      {problem.title}
                    </Typography>
                    <Chip
                      label={problem.difficulty}
                      size="small"
                      sx={{
                        bgcolor: `${diffColor}1a`,
                        color: diffColor,
                        fontWeight: 700,
                        border: `1px solid ${diffColor}55`,
                        flexShrink: 0,
                        mt: 0.5,
                      }}
                    />
                  </Stack>

                  {/* Description */}
                  <Typography
                    sx={{
                      color: "#94a3b8",
                      lineHeight: 1.85,
                      mb: 4,
                      fontSize: "0.93rem",
                    }}
                  >
                    {problem.description}
                  </Typography>

                  {/* Examples */}
                  {problem.examples?.map((ex, i) => (
                    <ExampleBlock key={i} example={ex} idx={i} />
                  ))}

                  {/* Constraints */}
                  {problem.constraints?.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          mb: 1.5,
                          fontSize: "0.78rem",
                          color: "#334155",
                          letterSpacing: "0.1em",
                        }}
                      >
                        CONSTRAINTS
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.75,
                        }}
                      >
                        {problem.constraints.map((c, i) => (
                          <Box
                            key={i}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              py: 0.75,
                              px: 1.5,
                              borderRadius: 1,
                              bgcolor: "rgba(99,102,241,0.06)",
                              border: "1px solid rgba(99,102,241,0.12)",
                            }}
                          >
                            <Box
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                bgcolor: "#6366f1",
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                fontFamily: "monospace",
                                fontSize: "0.88rem",
                                color: "#c7d2fe",
                                lineHeight: 1.5,
                              }}
                            >
                              {c}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {activeTab === "submissions" && (
                <Box>
                  {submissions.length === 0 ? (
                    <Typography
                      sx={{
                        color: "text.secondary",
                        textAlign: "center",
                        mt: 8,
                        fontSize: "0.9rem",
                      }}
                    >
                      No submissions yet.
                    </Typography>
                  ) : (
                    submissions.map((sub, idx) => {
                      const ok = sub.status === "Accepted";
                      return (
                        <Box
                          key={idx}
                          sx={{
                            p: 2.5,
                            mb: 1.5,
                            borderRadius: 2,
                            bgcolor: ok
                              ? "rgba(34,197,94,0.06)"
                              : "rgba(239,68,68,0.06)",
                            border: `1px solid ${ok ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1.5}
                            >
                              {ok ? (
                                <CheckCircle size={16} color="#22c55e" />
                              ) : (
                                <XCircle size={16} color="#ef4444" />
                              )}
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  fontSize: "0.9rem",
                                  color: ok ? "#22c55e" : "#ef4444",
                                }}
                              >
                                {sub.status}
                              </Typography>
                              <Typography
                                sx={{ color: "#475569", fontSize: "0.82rem" }}
                              >
                                {sub.passed}/{sub.total} tests
                              </Typography>
                            </Stack>
                            <Typography
                              sx={{ color: "#475569", fontSize: "0.78rem" }}
                            >
                              {new Date(sub.createdAt).toLocaleString()}
                            </Typography>
                          </Stack>
                        </Box>
                      );
                    })
                  )}
                </Box>
              )}
            </Box>

            {/* Test results are shown in the RIGHT console panel (inside CodeEditor) */}
          </Box>

          {/* ── RIGHT PANEL ── */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {/* Editor + AI tab bar */}
            <Box
              sx={{
                px: 2,
                py: 0,
                bgcolor: "#0a0b14",
                borderBottom: "1px solid #1a1b2e",
                display: "flex",
                alignItems: "center",
                gap: 0,
              }}
            >
              {/* Editor tab (always selected visually when AI closed) */}
              <Typography
                sx={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  py: 1,
                  px: 1.5,
                  color: !aiPanelOpen ? "#e2e8f0" : "#334155",
                  borderBottom: !aiPanelOpen
                    ? "2px solid #6366f1"
                    : "2px solid transparent",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  "&:hover": { color: "#94a3b8" },
                }}
                onClick={() => setAiPanelOpen(false)}
              >
                Editor
              </Typography>

              {/* AI Agent tab — always visible, glowing when active */}
              <Box
                onClick={() => setAiPanelOpen(!aiPanelOpen)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  py: 0.875,
                  px: 1.5,
                  cursor: "pointer",
                  borderBottom: aiPanelOpen
                    ? "2px solid #a78bfa"
                    : "2px solid transparent",
                  borderRadius: "2px 2px 0 0",
                  ml: 0.5,
                  bgcolor: aiPanelOpen
                    ? "rgba(167,139,250,0.08)"
                    : "transparent",
                  transition: "all 0.2s",
                  "&:hover": { bgcolor: "rgba(167,139,250,0.06)" },
                }}
              >
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "#a78bfa",
                    boxShadow: "0 0 6px #a78bfa",
                    animation: "pulse 2s ease-in-out infinite",
                    "@keyframes pulse": {
                      "0%,100%": { opacity: 1, transform: "scale(1)" },
                      "50%": { opacity: 0.5, transform: "scale(0.85)" },
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: aiPanelOpen ? "#a78bfa" : "#64748b",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    transition: "color 0.2s",
                  }}
                >
                  AI Agent
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
              <Box sx={{ flex: 1, overflow: "hidden" }}>
                <CodeEditor
                  slug={slug}
                  starterCode={problem.starterCode}
                  testResults={testResults}
                  onSubmitResult={handleSubmitResult}
                  onLanguageChange={setCurrentLanguage}
                  onCodeChange={setEditorCode}
                />
              </Box>

              {/* AI Panel */}
              {aiPanelOpen && (
                <Box
                  sx={{
                    width: 340,
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                    borderLeft: "1px solid #1a1b2e",
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 1.75,
                      bgcolor: "rgba(167,139,250,0.06)",
                      borderBottom: "1px solid #1a1b2e",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: "#a78bfa",
                          boxShadow: "0 0 8px #a78bfa",
                        }}
                      />
                      <Typography
                        sx={{
                          color: "#a78bfa",
                          fontWeight: 800,
                          fontSize: "0.88rem",
                          letterSpacing: "-0.01em",
                        }}
                      >
                        AI Agent
                      </Typography>
                      <Typography
                        sx={{
                          color: "#334155",
                          fontSize: "0.7rem",
                          fontWeight: 500,
                        }}
                      >
                        · powered by Groq
                      </Typography>
                    </Stack>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 1,
                    }}
                  >
                    <AIBtn
                      onClick={() => handleAIAction("hint")}
                      icon={<Lightbulb size={15} />}
                      label="Hints"
                    />
                    <AIBtn
                      onClick={() => handleAIAction("solution")}
                      icon={<CheckCircle size={15} />}
                      label="Solution"
                    />
                    <AIBtn
                      onClick={() => handleAIAction("debug")}
                      icon={<Bug size={15} />}
                      label="Debug"
                      disabled={!hasSubmitted}
                    />
                    <AIBtn
                      onClick={() => handleAIAction("complexity")}
                      icon={<BarChart3 size={15} />}
                      label="Complexity"
                      disabled={!hasSubmitted}
                    />
                  </Box>
                  {!hasSubmitted && (
                    <Box
                      sx={{
                        mx: 2,
                        mb: 1,
                        px: 1.5,
                        py: 1,
                        borderRadius: 1.5,
                        bgcolor: "rgba(167,139,250,0.06)",
                        border: "1px solid rgba(167,139,250,0.1)",
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#64748b",
                          fontSize: "0.72rem",
                          lineHeight: 1.5,
                        }}
                      >
                        🔒 <strong style={{ color: "#94a3b8" }}>Debug</strong>{" "}
                        and{" "}
                        <strong style={{ color: "#94a3b8" }}>Complexity</strong>{" "}
                        unlock after you submit your code.
                      </Typography>
                    </Box>
                  )}

                  <Divider />

                  <Box sx={{ flex: 1, p: 2.5, overflowY: "auto" }}>
                    {isAiLoading ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          py: 6,
                        }}
                      >
                        <CircularProgress
                          size={26}
                          sx={{ color: "primary.main", mb: 1.5 }}
                        />
                        <Typography
                          sx={{ color: "text.secondary", fontSize: "0.85rem" }}
                        >
                          AI is thinking...
                        </Typography>
                      </Box>
                    ) : aiResponse ? (
                      <ReactMarkdown
                        components={{
                          code({ inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(
                              className || "",
                            );
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, "")}
                              </SyntaxHighlighter>
                            ) : (
                              <code
                                style={{
                                  background: "rgba(255,255,255,0.08)",
                                  padding: "0.2em 0.4em",
                                  borderRadius: 3,
                                  fontSize: "0.82rem",
                                }}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {aiResponse}
                      </ReactMarkdown>
                    ) : (
                      <Box
                        sx={{
                          textAlign: "center",
                          py: 6,
                          color: "text.secondary",
                        }}
                      >
                        <BarChart3
                          size={36}
                          style={{ opacity: 0.2, marginBottom: 8 }}
                        />
                        <Typography fontSize="0.85rem">
                          Click any button above to get AI help
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AIBtn = ({ icon, label, onClick, disabled = false }) => (
  <Button
    fullWidth
    variant="outlined"
    onClick={onClick}
    disabled={disabled}
    sx={{
      borderColor: disabled
        ? "rgba(255,255,255,0.04)"
        : "rgba(167,139,250,0.15)",
      color: disabled ? "#2a2b3a" : "#64748b",
      textTransform: "none",
      fontSize: "0.8rem",
      fontWeight: 600,
      justifyContent: "flex-start",
      gap: 1,
      py: 1.1,
      borderRadius: 1.5,
      "&:hover": {
        borderColor: "#a78bfa",
        color: "#a78bfa",
        bgcolor: "rgba(167,139,250,0.06)",
      },
      "&.Mui-disabled": {
        borderColor: "rgba(255,255,255,0.04)",
        color: "#2a2b3a",
      },
    }}
  >
    {icon} {label}
    {disabled && (
      <Box
        component="span"
        sx={{ ml: "auto", fontSize: "0.65rem", opacity: 0.4 }}
      >
        🔒
      </Box>
    )}
  </Button>
);
