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

    // Profile page — only this user's submissions
    // MUST be declared before /{slug} to avoid "mine" being treated as a slug
    @GetMapping("/submissions/mine")
    public List<Submission> getMySubmissions(@RequestParam String username) {
        return submissionRepository.findByUsernameOrderByCreatedAtDesc(username);
    }

    // Problem detail page — submissions for a specific problem (all users)
    @GetMapping("/submissions/{slug}")
    public List<Submission> getSubmissions(@PathVariable String slug) {
        return submissionRepository.findByProblemSlugOrderByCreatedAtDesc(slug);
    }
}