package com.aicodelab.ai_codelab_backend.service;

import com.aicodelab.ai_codelab_backend.dto.RunCodeRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Service
public class Judge0Service {

    // Free ce.judge0.com — use wait=true so we get the result in one round-trip.
    // Flip to false + poll if you move to a self-hosted instance.
    private static final String JUDGE0_URL =
        "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

    // Max retries on 429 (rate-limit) or 5xx from the free tier
    private static final int MAX_RETRIES   = 3;
    private static final int RETRY_DELAY_MS = 1500;   // 1.5 s between retries

    private final RestTemplate restTemplate;

    public Judge0Service(RestTemplateBuilder builder) {
        // Connect timeout: 10 s  |  Read timeout: 30 s
        // Free Judge0 can be slow — 30 s gives it enough runway without hanging forever.
        this.restTemplate = builder
            .connectTimeout(Duration.ofSeconds(10))
            .readTimeout(Duration.ofSeconds(30))
            .build();
    }

    public Map runCode(RunCodeRequest request) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("source_code",             request.getSourceCode());
        body.put("language_id",             request.getLanguageId());
        body.put("stdin",                   request.getStdin() != null ? request.getStdin() : "");
        body.put("redirect_stderr_to_stdout", true);
        // Add reasonable limits so Judge0 doesn't sit for too long
        body.put("cpu_time_limit",          5);      // 5 s CPU
        body.put("wall_time_limit",         10);     // 10 s wall clock
        body.put("memory_limit",            128000); // 128 MB

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        Exception lastException = null;

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                ResponseEntity<Map> response =
                    restTemplate.exchange(JUDGE0_URL, HttpMethod.POST, entity, Map.class);

                Map result = response.getBody();
                if (result == null) result = new HashMap<>();

                // Normalise stdout: trim trailing newline so comparison
                // against expected_output (stored without newline) always works.
                if (result.get("stdout") instanceof String) {
                    result.put("stdout", ((String) result.get("stdout")).stripTrailing());
                }
                return result;

            } catch (HttpClientErrorException e) {
                // 429 Too Many Requests — back off and retry
                if (e.getStatusCode().value() == 429) {
                    lastException = e;
                    sleep(RETRY_DELAY_MS * attempt);   // exponential back-off
                } else {
                    // 4xx other than 429 — no point retrying
                    return errorMap("Judge0 client error: " + e.getStatusCode() + " — " + e.getResponseBodyAsString());
                }
            } catch (HttpServerErrorException e) {
                // 5xx from free tier — retry
                lastException = e;
                sleep(RETRY_DELAY_MS * attempt);
            } catch (ResourceAccessException e) {
                // Timeout or network error — retry
                lastException = e;
                sleep(RETRY_DELAY_MS * attempt);
            } catch (Exception e) {
                return errorMap("Unexpected error calling Judge0: " + e.getMessage());
            }
        }

        // All retries exhausted
        String msg = lastException != null ? lastException.getMessage() : "unknown error";
        return errorMap("Judge0 unavailable after " + MAX_RETRIES + " attempts: " + msg);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private static Map<String, Object> errorMap(String message) {
        Map<String, Object> m = new HashMap<>();
        m.put("stdout",  null);
        m.put("stderr",  message);
        m.put("compile_output", null);
        m.put("status",  Map.of("id", 13, "description", "Internal Error"));
        return m;
    }

    private static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }
}