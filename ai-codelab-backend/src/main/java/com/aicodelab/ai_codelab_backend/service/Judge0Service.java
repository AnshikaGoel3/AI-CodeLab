package com.aicodelab.ai_codelab_backend.service;

import com.aicodelab.ai_codelab_backend.dto.RunCodeRequest;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class Judge0Service {

    private final String JUDGE0_URL =
            "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

    public Map runCode(RunCodeRequest request) {

        RestTemplate restTemplate = new RestTemplate();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> body = new HashMap<>();
        body.put("source_code", request.getSourceCode());
        body.put("language_id", request.getLanguageId());
        body.put("stdin", request.getStdin());

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response =
                restTemplate.exchange(JUDGE0_URL, HttpMethod.POST, entity, Map.class);

        return response.getBody();
    }
}