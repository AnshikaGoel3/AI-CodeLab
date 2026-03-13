package com.aicodelab.ai_codelab_backend.controller;

import com.aicodelab.ai_codelab_backend.model.Submission;
import com.aicodelab.ai_codelab_backend.repository.SubmissionRepository;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")

public class SubmissionController {

    private final SubmissionRepository submissionRepository;

    public SubmissionController(SubmissionRepository submissionRepository) {
        this.submissionRepository = submissionRepository;
    }

    /**
     * IMPORTANT: /submissions/all MUST be declared before /submissions/{slug}
     * Otherwise Spring treats "all" as a slug value.
     */
    @GetMapping("/submissions/all")
    public List<Submission> getAllSubmissions() {
        return submissionRepository.findAllByOrderByCreatedAtDesc();
    }

    @GetMapping("/submissions/{slug}")
    public List<Submission> getSubmissions(@PathVariable String slug) {
        return submissionRepository.findByProblemSlugOrderByCreatedAtDesc(slug);
    }
}