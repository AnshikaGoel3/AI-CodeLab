package com.aicodelab.ai_codelab_backend.controller;

import org.springframework.web.bind.annotation.*;

import com.aicodelab.ai_codelab_backend.model.Problem;
import com.aicodelab.ai_codelab_backend.service.ProblemService;

import java.util.List;

@RestController
@RequestMapping("/api/problems")

public class ProblemController {

    private final ProblemService problemService;

    public ProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }

    @GetMapping
    public List<Problem> getProblems() {
        return problemService.getAllProblems();
    }

    @GetMapping("/{slug}")
    public Problem getProblem(@PathVariable String slug) {
        return problemService.getProblemBySlug(slug);
    }

    @GetMapping("/search")
    public List<Problem> searchProblems(@RequestParam String query) {
        return problemService.searchProblems(query);
    }

}