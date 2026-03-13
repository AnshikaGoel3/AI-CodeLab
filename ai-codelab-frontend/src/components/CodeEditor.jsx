import Editor from "@monaco-editor/react";
import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { CheckCircle, XCircle } from "lucide-react";
import { runCode, submitCode } from "../services/executionService";

// ── Pretty-printer (returns plain text, no JSX) ───────────────────────────────
function prettyVal(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return String(v);
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  // Tree node
  if (typeof v === "object" && !Array.isArray(v) && "val" in v) {
    const nodes = [];
    const collect = (n) => {
      if (!n) return;
      nodes.push(n.val);
      collect(n.left);
      collect(n.right);
    };
    collect(v);
    return `Tree (nodes: [${nodes.join(", ")}])`;
  }
  // Flat array of primitives
  if (Array.isArray(v)) {
    if (v.every((x) => x === null || typeof x !== "object"))
      return `[${v.map((x) => prettyVal(x)).join(", ")}]`;
    return `[\n${v.map((x) => "  " + prettyVal(x)).join(",\n")}\n]`;
  }
  // Generic object → key = value per line
  if (typeof v === "object")
    return Object.entries(v)
      .map(([k, val]) => `${k} = ${prettyVal(val)}`)
      .join("\n");
  return String(v);
}

export function prettyInput(raw) {
  if (!raw) return "—";
  let obj;
  try {
    obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return String(raw);
  }
  if (typeof obj !== "object" || Array.isArray(obj)) return prettyVal(obj);
  return Object.entries(obj)
    .map(([k, v]) => `${k} = ${prettyVal(v)}`)
    .join("\n");
}
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_STARTER = {
  javascript: `function solve() {\n  // your code here\n}`,
  python: `def solve():\n    pass  # your code here`,
  java: `    static Object solve() {\n        return 0; // your code here\n    }\n}`,
  cpp: `int solve() {\n    return 0; // your code here\n}`,
};

const LANG_KEY = { 63: "javascript", 71: "python", 62: "java", 54: "cpp" };
const DEFAULT_LANGUAGES = [
  { id: 63, name: "JavaScript" },
  { id: 71, name: "Python" },
  { id: 62, name: "Java" },
  { id: 54, name: "C++" },
];

export default function CodeEditor({
  slug,
  starterCode,
  testResults = [],
  onSubmitResult,
  onLanguageChange,
  onCodeChange,
}) {
  const [languageId, setLanguageId] = useState(63);
  const [code, setCode] = useState("");
  const [runResult, setRunResult] = useState(null);
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);
  const [consoleTab, setConsoleTab] = useState("run"); // "run" | "tests"

  useEffect(() => {
    const key = LANG_KEY[languageId] || "javascript";
    const newCode = starterCode?.[key] || FALLBACK_STARTER[key];
    setCode(newCode);
    setRunResult(null);
    setStatus("");
    if (onCodeChange) onCodeChange(newCode);
  }, [languageId, starterCode]);

  // Auto-switch to tests tab when submit completes with failures
  useEffect(() => {
    if (testResults.length > 0) setConsoleTab("tests");
  }, [testResults]);

  const handleLanguageChange = (e) => {
    const id = e.target.value;
    setLanguageId(id);
    const lang = DEFAULT_LANGUAGES.find((l) => l.id === id);
    if (lang && onLanguageChange) onLanguageChange(lang.name.toLowerCase());
  };

  const handleRun = async () => {
    setRunning(true);
    setRunResult({ output: "Running…", input: "", expected: "" });
    setStatus("");
    setConsoleTab("run");
    try {
      const result = await runCode(slug, code, languageId);
      setRunResult({
        output:
          result.stdout ||
          result.stderr ||
          result.compile_output ||
          "(no output)",
        input: result.usedInput || "",
        expected: result.expectedOutput || "",
      });
    } catch (err) {
      setRunResult({
        output: `Error: ${err.message}`,
        input: "",
        expected: "",
      });
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!slug) {
      setStatus("Error: missing problem slug");
      return;
    }
    setRunning(true);
    setStatus("Submitting…");
    setRunResult(null);
    try {
      const result = await submitCode(slug, code, languageId);
      setStatus(`${result.status}  (${result.passed}/${result.total})`);
      const firstFailed = (result.testResults || []).find((t) => !t.passed);
      if (onSubmitResult)
        onSubmitResult(result, firstFailed ? { ...firstFailed, code } : null);
    } catch (err) {
      setStatus("Submission Error");
    } finally {
      setRunning(false);
    }
  };

  const monacoLang = () => {
    const key = LANG_KEY[languageId] || "javascript";
    return key === "cpp" ? "cpp" : key;
  };

  const isAccepted = status.includes("Accepted");
  const isWrong =
    status.toLowerCase().includes("error") || status.includes("Wrong");
  const passedCount = testResults.filter((t) => t.passed).length;
  const allPassed =
    testResults.length > 0 && passedCount === testResults.length;
  const failedTests = testResults.filter((t) => !t.passed);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "#0d0e1a",
        overflow: "hidden",
      }}
    >
      {/* ── Toolbar ── */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: "#11121e",
          borderBottom: "1px solid #1e2030",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Select
          size="small"
          value={languageId}
          onChange={handleLanguageChange}
          MenuProps={{
            PaperProps: { sx: { bgcolor: "#11121e", color: "white" } },
          }}
          sx={{
            color: "white",
            bgcolor: "#0a0b14",
            height: 30,
            fontSize: "0.8rem",
            width: 130,
            ".MuiOutlinedInput-notchedOutline": { borderColor: "#2d2e3e" },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: "#4f46e5",
            },
          }}
        >
          {DEFAULT_LANGUAGES.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.name}
            </MenuItem>
          ))}
        </Select>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleRun}
            disabled={running}
            sx={{
              color: "#94a3b8",
              borderColor: "#2d2e3e",
              textTransform: "none",
              fontSize: "0.8rem",
              "&:hover": { borderColor: "#86efac", color: "#86efac" },
            }}
          >
            ▶ Run
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSubmit}
            disabled={running}
            sx={{
              bgcolor: "#6366f1",
              fontWeight: 700,
              textTransform: "none",
              fontSize: "0.8rem",
              px: 2.5,
              "&:hover": { bgcolor: "#4f46e5" },
            }}
          >
            Submit
          </Button>
        </Stack>
      </Box>

      {/* ── Monaco Editor ── */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <Editor
          height="100%"
          theme="vs-dark"
          language={monacoLang()}
          value={code}
          onChange={(v) => {
            setCode(v || "");
            if (onCodeChange) onCodeChange(v || "");
          }}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 12 },
            automaticLayout: true,
            scrollBeyondLastLine: false,
          }}
        />
      </Box>

      {/* ── Console Panel ── */}
      <Box
        sx={{
          height: "36%",
          bgcolor: "#06070f",
          borderTop: "2px solid #1a1b2e",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        {/* Console tab bar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 2,
            bgcolor: "#0a0b14",
            borderBottom: "1px solid #1a1b2e",
            flexShrink: 0,
          }}
        >
          {[
            { key: "run", label: "Run Output" },
            {
              key: "tests",
              label:
                testResults.length > 0
                  ? `Tests  ${allPassed ? "✓" : `${passedCount}/${testResults.length}`}`
                  : "Tests",
            },
          ].map((tab) => (
            <Typography
              key={tab.key}
              onClick={() => setConsoleTab(tab.key)}
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                cursor: "pointer",
                py: 0.875,
                px: 1.5,
                mr: 0.5,
                color:
                  consoleTab === tab.key
                    ? tab.key === "tests" && testResults.length > 0
                      ? allPassed
                        ? "#22c55e"
                        : "#ef4444"
                      : "#e2e8f0"
                    : "#334155",
                borderBottom:
                  consoleTab === tab.key
                    ? "2px solid #6366f1"
                    : "2px solid transparent",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                "&:hover": { color: "#94a3b8" },
              }}
            >
              {tab.label}
            </Typography>
          ))}

          {/* Status badge */}
          {status && (
            <Typography
              sx={{
                ml: "auto",
                fontWeight: 800,
                fontSize: "0.82rem",
                color: isAccepted ? "#22c55e" : isWrong ? "#ef4444" : "#94a3b8",
              }}
            >
              {status}
            </Typography>
          )}
        </Box>

        {/* Console body */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
          {/* ── Run tab ── */}
          {consoleTab === "run" &&
            (runResult ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 1.5,
                }}
              >
                <ConsoleCell
                  label="Input"
                  value={prettyInput(runResult.input)}
                  color="#7dd3fc"
                />
                <ConsoleCell
                  label="Expected"
                  value={runResult.expected || "—"}
                  color="#86efac"
                />
                <ConsoleCell
                  label="Output"
                  value={runResult.output || "(none)"}
                  color={
                    runResult.expected &&
                    runResult.output?.trim() === runResult.expected?.trim()
                      ? "#22c55e"
                      : "#f87171"
                  }
                />
              </Box>
            ) : (
              <Typography
                sx={{ color: "#1e2030", fontSize: "0.78rem", mt: 0.5 }}
              >
                Click Run to test · Submit to run all test cases
              </Typography>
            ))}

          {/* ── Tests tab ── */}
          {consoleTab === "tests" &&
            (testResults.length === 0 ? (
              <Typography
                sx={{ color: "#1e2030", fontSize: "0.78rem", mt: 0.5 }}
              >
                No submissions yet — click Submit to run all test cases
              </Typography>
            ) : (
              <Box>
                {/* Summary row */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 1.5, pb: 1, borderBottom: "1px solid #1a1b2e" }}
                >
                  {allPassed ? (
                    <>
                      <CheckCircle size={14} color="#22c55e" />
                      <Typography
                        sx={{
                          color: "#22c55e",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                        }}
                      >
                        All {testResults.length} Tests Passed ✓
                      </Typography>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} color="#ef4444" />
                      <Typography
                        sx={{
                          color: "#ef4444",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                        }}
                      >
                        {passedCount} / {testResults.length} Tests Passed
                      </Typography>
                    </>
                  )}
                </Stack>

                {/* Passed tests: just a row */}
                {testResults.map(
                  (t, i) =>
                    t.passed && (
                      <Stack
                        key={i}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{
                          py: 0.5,
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                        }}
                      >
                        <CheckCircle size={12} color="#22c55e" />
                        <Typography
                          sx={{
                            color: "#22c55e",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          Test {i + 1}
                        </Typography>
                      </Stack>
                    ),
                )}

                {/* Failed tests: full detail */}
                {failedTests.map((t, fi) => {
                  const globalIdx = testResults.indexOf(t);
                  return (
                    <Box
                      key={fi}
                      sx={{
                        mt: 1.5,
                        p: 1.5,
                        borderRadius: 1.5,
                        bgcolor: "rgba(239,68,68,0.05)",
                        border: "1px solid rgba(239,68,68,0.18)",
                      }}
                    >
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={{ mb: 1 }}
                      >
                        <XCircle size={13} color="#ef4444" />
                        <Typography
                          sx={{
                            color: "#ef4444",
                            fontWeight: 700,
                            fontSize: "0.78rem",
                          }}
                        >
                          Test {globalIdx + 1} — Wrong Answer
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 1,
                        }}
                      >
                        <ConsoleCell
                          label="Input"
                          value={prettyInput(t.input)}
                          color="#7dd3fc"
                        />
                        <ConsoleCell
                          label="Expected"
                          value={t.expected || "—"}
                          color="#86efac"
                        />
                        <ConsoleCell
                          label="Got"
                          value={t.actual ?? "(none)"}
                          color="#f87171"
                        />
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ))}
        </Box>
      </Box>
    </Box>
  );
}

function ConsoleCell({ label, value, color }) {
  return (
    <Box>
      <Typography
        sx={{
          fontSize: "0.62rem",
          fontWeight: 700,
          color: "#334155",
          mb: 0.4,
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1,
          bgcolor: "#0d0e1a",
          borderRadius: 1,
          border: "1px solid #1e2030",
          color,
          fontFamily: "'JetBrains Mono','Fira Mono',monospace",
          fontSize: "0.76rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          lineHeight: 1.6,
          minHeight: 32,
        }}
      >
        {value ?? "—"}
      </Box>
    </Box>
  );
}
