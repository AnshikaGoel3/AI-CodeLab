package com.aicodelab.ai_codelab_backend.controller;

import com.aicodelab.ai_codelab_backend.dto.RunCodeRequest;
import com.aicodelab.ai_codelab_backend.service.CodeExecutionService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/code")
@CrossOrigin
public class CodeExecutionController {

    private final CodeExecutionService codeExecutionService;

    public CodeExecutionController(CodeExecutionService codeExecutionService) {
        this.codeExecutionService = codeExecutionService;
    }

    /**
     * Run code against first test case (or custom stdin if provided).
     * Preamble is injected by CodeExecutionService based on slug + language.
     */
    @PostMapping("/run/{slug}")
    public Map<String, Object> runCode(
            @PathVariable String slug,
            @RequestBody RunCodeRequest request
    ) {
        return codeExecutionService.runCode(slug, request);
    }

    @PostMapping("/submit/{slug}")
    public Map<String, Object> submitSolution(
            @PathVariable String slug,
            @RequestBody RunCodeRequest request
    ) {
        return codeExecutionService.submitSolution(slug, request);
    }
}