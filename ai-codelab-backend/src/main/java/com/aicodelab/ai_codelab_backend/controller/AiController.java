package com.aicodelab.ai_codelab_backend.controller;

import com.aicodelab.ai_codelab_backend.service.AIService;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin
public class AiController {

    private final AIService aiService;
    public AiController(AIService aiService) { this.aiService = aiService; }

    @PostMapping("/hint")
    public Map<String, Object> getHint(@RequestBody Map<String, String> body) {
        String hintText = aiService.getHint(body.get("problem"));
        String[] hints = hintText.split("\\d+\\. ");
        List<String> cleanHints = new ArrayList<>();
        for (String h : hints) if (!h.trim().isEmpty()) cleanHints.add(h.trim());
        return Map.of("hints", cleanHints);
    }

    @PostMapping("/debug")
    public Map<String, String> debug(@RequestBody Map<String, String> body) {
        String explanation = aiService.debugCode(
            body.get("problem"), body.get("code"),
            body.get("input"), body.get("expected"), body.get("actual")
        );
        return Map.of("explanation", explanation);
    }

    @PostMapping("/solution")
    public String solution(@RequestBody Map<String, String> body) {
        // availableVars tells AI exactly what's already in scope inside solve()
        String availableVars = body.getOrDefault("availableVars", "see problem description");
        return aiService.generateSolution(body.get("problem"), body.get("language"), availableVars);
    }

    @PostMapping("/complexity")
    public String complexity(@RequestBody Map<String, String> body) {
        return aiService.analyzeComplexity(body.get("code"), body.getOrDefault("problem", ""));
    }
}