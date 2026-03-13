package com.aicodelab.ai_codelab_backend.service;

import com.aicodelab.ai_codelab_backend.dto.RunCodeRequest;
import com.aicodelab.ai_codelab_backend.model.Problem;
import com.aicodelab.ai_codelab_backend.model.Submission;
import com.aicodelab.ai_codelab_backend.model.TestCase;
import com.aicodelab.ai_codelab_backend.repository.ProblemRepository;
import com.aicodelab.ai_codelab_backend.repository.SubmissionRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class CodeExecutionService {

    private final ProblemRepository problemRepository;
    private final Judge0Service judge0Service;
    private final SubmissionRepository submissionRepository;

    public CodeExecutionService(ProblemRepository problemRepository,
                                Judge0Service judge0Service,
                                SubmissionRepository submissionRepository) {
        this.problemRepository = problemRepository;
        this.judge0Service = judge0Service;
        this.submissionRepository = submissionRepository;
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
        String preamble = preambleMap.get(langKey(langId));
        if (preamble == null || preamble.isBlank()) return userCode;
        return preamble + "\n" + userCode;
    }


    public Map<String, Object> runCode(String slug, RunCodeRequest request) {
        Problem problem = problemRepository.findBySlug(slug).orElse(null);

        String usedInput    = request.getStdin();
        String expectedOut  = "";

        if (problem != null) {
            // Use TC1 input if no custom stdin provided
            if ((usedInput == null || usedInput.isBlank()) && !problem.getTestCases().isEmpty()) {
                usedInput   = problem.getTestCases().get(0).getInput();
                expectedOut = problem.getTestCases().get(0).getExpected_output();
            }
            String fullCode = injectPreamble(problem, request.getSourceCode(), request.getLanguageId());
            request.setSourceCode(fullCode);
        }

        request.setStdin(usedInput != null ? usedInput : "");
        Map result = judge0Service.runCode(request);

        // Add input + expected to the response so the frontend can display them
        Map<String, Object> response = new HashMap<>(result);
        response.put("usedInput",    usedInput != null ? usedInput : "");
        response.put("expectedOutput", expectedOut);
        return response;
    }

    public Map<String, Object> submitSolution(String slug, RunCodeRequest request) {
        Problem problem = problemRepository.findBySlug(slug)
            .orElseThrow(() -> new RuntimeException("Problem not found: " + slug));

        String fullCode = injectPreamble(problem, request.getSourceCode(), request.getLanguageId());
        List<TestCase> testCases = problem.getTestCases();
        int passed = 0;
        List<Map<String, Object>> testResults = new ArrayList<>();

        for (TestCase test : testCases) {
            RunCodeRequest req = new RunCodeRequest();
            req.setSourceCode(fullCode);
            req.setLanguageId(request.getLanguageId());
            req.setStdin(test.getInput());

            Map result = judge0Service.runCode(req);

            String actual   = (String) result.get("stdout");
            String expected = test.getExpected_output();
            boolean ok      = actual != null && actual.trim().equals(expected.trim());

            Map<String, Object> tr = new HashMap<>();
            tr.put("input",    test.getInput());
            tr.put("expected", expected);
            tr.put("actual",   actual);
            tr.put("passed",   ok);
            testResults.add(tr);
            if (ok) passed++;
        }

        String status = passed == testCases.size() ? "Accepted" : "Wrong Answer";

        Submission sub = new Submission();
        sub.setProblemSlug(slug);
        sub.setCode(request.getSourceCode()); 
        sub.setLanguageId(request.getLanguageId());
        sub.setStatus(status);
        sub.setPassed(passed);
        sub.setTotal(testCases.size());
        sub.setCreatedAt(new Date());
        submissionRepository.save(sub);

        Map<String, Object> response = new HashMap<>();
        response.put("status",      status);
        response.put("passed",      passed);
        response.put("total",       testCases.size());
        response.put("testResults", testResults);
        return response;
    }
}