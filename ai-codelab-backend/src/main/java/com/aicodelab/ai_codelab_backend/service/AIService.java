package com.aicodelab.ai_codelab_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.util.Map;

@Service
public class AIService {

    @Value("${groq.api.key}")
    private String apiKey;

    private final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

    public String getHint(String problemDescription) {
        String prompt =
            "Give exactly 3 progressive hints (not the solution) to help solve this coding problem.\n\n"
            + "Format each as:\n1. [hint]\n2. [hint]\n3. [hint]\n\n"
            + "Problem:\n" + problemDescription;
        return callGroq(prompt);
    }

    public String debugCode(String problem, String code, String input, String expected, String actual) {
        String prompt =
            "You are a senior programming mentor. The student is solving a coding problem.\n\n"
            + "Problem:\n" + problem + "\n\n"
            + "Student's solve() function code:\n```\n" + code + "\n```\n\n"
            + "Failed on input: " + input + "\n"
            + "Expected output: " + expected + "\n"
            + "Actual output:   " + actual + "\n\n"
            + "IMPORTANT: The student writes ONLY the solve() function body. "
            + "Input parsing is handled automatically — variables are already available inside solve().\n\n"
            + "Explain:\n"
            + "1. What the bug is in their solve() function\n"
            + "2. Why the logic fails\n"
            + "3. Which specific lines in their solve() are wrong\n"
            + "4. The corrected solve() function (just the function body, no input parsing)\n";
        return callGroq(prompt);
    }

    public String generateSolution(String problem, String language, String availableVars) {
        String prompt =
            "You are a coding interview expert.\n\n"
            + "Problem:\n" + problem + "\n\n"
            + "Write a solution in " + language + ".\n\n"
            + "CRITICAL RULES:\n"
            + "- The student writes ONLY the solve() function body\n"
            + "- These variables are ALREADY available inside solve(): " + availableVars + "\n"
            + "- Do NOT write any input parsing, JSON reading, System.in, stdin, console.log, or print statements\n"
            + "- Do NOT write a main() function or class wrapper\n"
            + "- Just write the logic inside solve() and return the answer\n\n"
            + "Format your response EXACTLY as:\n"
            + "## Solution\n"
            + "```" + language.toLowerCase() + "\n[solve() function code here]\n```\n\n"
            + "## Approach\n"
            + "[2-3 sentence explanation of the algorithm]\n\n"
            + "## Dry Run\n"
            + "Walk through the example test case step by step showing variable values at each step.\n\n"
            + "## Complexity\n"
            + "- Time: O(?)\n"
            + "- Space: O(?)";
        return callGroq(prompt);
    }

    public String analyzeComplexity(String code, String problemDescription) {
        String prompt =
            "Analyze the complexity of this student's solve() function for the following problem.\n\n"
            + "Problem:\n" + problemDescription + "\n\n"
            + "Student's code:\n```\n" + code + "\n```\n\n"
            + "## Time Complexity\n"
            + "State the Big-O (e.g. O(n)) and explain WHY — reference specific lines/loops in their code.\n\n"
            + "## Space Complexity\n"
            + "State the Big-O and explain WHY.\n\n"
            + "## Can it be optimized?\n"
            + "If yes, name a better algorithm (e.g. binary search, two pointers) and its complexity. "
            + "If already optimal, say so clearly.\n";
        return callGroq(prompt);
    }

    private String callGroq(String prompt) {
        RestTemplate restTemplate = new RestTemplate();
        Map<String, Object> body = Map.of(
            "model", "llama-3.3-70b-versatile",
            "messages", new Object[]{ Map.of("role","user","content", prompt) }
        );
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);
        ResponseEntity<Map> response = restTemplate.postForEntity(
            GROQ_URL, new HttpEntity<>(body, headers), Map.class);
        Map choice = (Map)((java.util.List)response.getBody().get("choices")).get(0);
        return ((Map)choice.get("message")).get("content").toString();
    }
}