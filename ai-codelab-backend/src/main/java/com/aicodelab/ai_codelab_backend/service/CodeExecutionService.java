package com.aicodelab.ai_codelab_backend.service;

import com.aicodelab.ai_codelab_backend.dto.RunCodeRequest;
import com.aicodelab.ai_codelab_backend.model.Problem;
import com.aicodelab.ai_codelab_backend.model.Submission;
import com.aicodelab.ai_codelab_backend.model.TestCase;
import com.aicodelab.ai_codelab_backend.repository.ProblemRepository;
import com.aicodelab.ai_codelab_backend.repository.SubmissionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.bson.Document;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CodeExecutionService {

    private final ProblemRepository    problemRepository;
    private final Judge0Service        judge0Service;
    private final SubmissionRepository submissionRepository;
    private final ObjectMapper         objectMapper = new ObjectMapper();

    public CodeExecutionService(ProblemRepository problemRepository,
                                Judge0Service judge0Service,
                                SubmissionRepository submissionRepository) {
        this.problemRepository    = problemRepository;
        this.judge0Service        = judge0Service;
        this.submissionRepository = submissionRepository;
    }

    // ── Safe JSON serialiser ──────────────────────────────────────────────────
    // MongoDB may return input as: org.bson.Document, LinkedHashMap, or String.
    // This ensures we always send a clean JSON object to Judge0 stdin — never
    // double-encoded (which caused "TypeError: string indices must be integers").
    private String toJsonString(Object input) {
        if (input == null) return "{}";

        if (input instanceof Document) {
            return ((Document) input).toJson();
        }

        if (input instanceof String) {
            String s = ((String) input).trim();
            if ((s.startsWith("{") && s.endsWith("}")) ||
                (s.startsWith("[") && s.endsWith("]"))) {
                return s;                     // already valid JSON — return as-is
            }
            try {
                // Unwrap one layer of double-encoding
                return objectMapper.readValue(s, String.class);
            } catch (Exception ignored) {
                return s;
            }
        }

        try {
            return objectMapper.writeValueAsString(input);
        } catch (Exception e) {
            return input.toString();
        }
    }

    private static String langKey(int langId) {
        return switch (langId) {
            case 71 -> "python";
            case 62 -> "java";
            case 54 -> "cpp";
            default -> "javascript";
        };
    }

    private String injectPreamble(Problem problem, String userCode, int langId) {
        Map<String, String> preambleMap = problem.getPreamble();
        if (preambleMap == null) return userCode;

        String key      = langKey(langId);
        String preamble = preambleMap.get(key);
        if (preamble == null || preamble.isBlank()) return userCode;

        // Python / JS: execution is top-to-bottom, so solve() must be defined
        // BEFORE the print/console.log call line.  Split the preamble at the
        // call line and sandwich the user code in between.
        if (key.equals("python")) {
            int idx = preamble.lastIndexOf("\nprint(solve(");
            if (idx >= 0) {
                return preamble.substring(0, idx) + "\n" + userCode + preamble.substring(idx);
            }
        } else if (key.equals("javascript")) {
            int idx = preamble.lastIndexOf("\nconsole.log(solve(");
            if (idx >= 0) {
                return preamble.substring(0, idx) + "\n" + userCode + preamble.substring(idx);
            }
        }

        // Java / C++: compiler resolves calls at compile-time so order is fine.
        return preamble + "\n" + userCode;
    }

    // ── Run (single test case) ────────────────────────────────────────────────
    public Map<String, Object> runCode(String slug, RunCodeRequest request) {
        Problem problem = problemRepository.findBySlug(slug).orElse(null);

        String usedInput   = request.getStdin();
        String expectedOut = "";

        if (problem != null) {
            if ((usedInput == null || usedInput.isBlank()) && !problem.getTestCases().isEmpty()) {
                TestCase tc = problem.getTestCases().get(0);
                usedInput   = toJsonString(tc.getInput());
                expectedOut = tc.getExpected_output();
            }
            String fullCode = injectPreamble(problem, request.getSourceCode(), request.getLanguageId());
            request.setSourceCode(fullCode);
        }

        request.setStdin(usedInput != null ? usedInput : "");

        Map result = judge0Service.runCode(request);

        Map<String, Object> response = new HashMap<>(result);
        response.put("usedInput",      usedInput != null ? usedInput : "");
        response.put("expectedOutput", expectedOut);
        return response;
    }

    // ── Submit (all test cases) ───────────────────────────────────────────────
    public Map<String, Object> submitSolution(String slug, RunCodeRequest request) {
        Problem problem = problemRepository.findBySlug(slug)
            .orElseThrow(() -> new RuntimeException("Problem not found: " + slug));

        String         fullCode    = injectPreamble(problem, request.getSourceCode(), request.getLanguageId());
        List<TestCase> testCases   = problem.getTestCases();
        int            passed      = 0;
        List<Map<String, Object>> testResults = new ArrayList<>();

        for (TestCase test : testCases) {
            RunCodeRequest req = new RunCodeRequest();
            req.setSourceCode(fullCode);
            req.setLanguageId(request.getLanguageId());
            req.setStdin(toJsonString(test.getInput()));   // ← safe serialiser

            Map result = judge0Service.runCode(req);

            String  actual   = (String) result.get("stdout");
            String  expected = test.getExpected_output();
            boolean ok       = actual != null && actual.trim().equals(expected.trim());

            Map<String, Object> tr = new HashMap<>();
            tr.put("input",    test.getInput());
            tr.put("expected", expected);
            tr.put("actual",   actual);
            tr.put("passed",   ok);
            testResults.add(tr);
            if (ok) passed++;
        }

        String status = (passed == testCases.size()) ? "Accepted" : "Wrong Answer";

        // ── FIX: persist username so profile-page submissions count works ──────
        // request.getUsername() is sent by the frontend (executionService.js already
        // sends it).  Fallback to "anonymous" so it never throws.
        String username = request.getUsername();
        if (username == null || username.isBlank()) username = "anonymous";

        Submission sub = new Submission();
        sub.setProblemSlug(slug);
        sub.setUsername(username);                   // ← was MISSING before
        sub.setCode(request.getSourceCode());
        sub.setLanguageId(request.getLanguageId());
        sub.setStatus(status);
        sub.setPassed(passed);
        sub.setTotal(testCases.size());
        sub.setCreatedAt(new Date());
        submissionRepository.save(sub);

        // Also update the user's solved-slug list if Accepted
        // (Optional — only if you have UserRepository wired here)

        Map<String, Object> response = new HashMap<>();
        response.put("status",      status);
        response.put("passed",      passed);
        response.put("total",       testCases.size());
        response.put("testResults", testResults);
        return response;
    }
}